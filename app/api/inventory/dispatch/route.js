import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(request) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { client_name, items } = body;

    if (!client_name || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Cliente y al menos un producto son requeridos." },
        { status: 400 }
      );
    }

    // --- SQL para la nueva función de transacción en Supabase ---
    /*
    CREATE OR REPLACE FUNCTION handle_inventory_dispatch(
      p_client_name TEXT,
      p_items JSONB, -- Cambiado a JSONB para mejor manejo
      p_user_id UUID
    )
    RETURNS INT -- Devuelve el nuevo número de remisión
    LANGUAGE plpgsql
    AS $$
    DECLARE
      new_dispatch_number INT;
      new_dispatch_id UUID;
      item RECORD;
      current_stock_val INT;
      total_quantity_to_dispatch INT;
    BEGIN
      -- 1. Validar stock para todos los productos ANTES de hacer cualquier cambio
      -- El JSON ahora debe tener product_id, quantity, y extra_quantity
      FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID, 
        quantity INT,
        extra_quantity INT
      )
      LOOP
        -- Calculamos la cantidad total a descontar del stock
        total_quantity_to_dispatch := item.quantity + item.extra_quantity;

        -- Validamos contra el stock actual
        SELECT stock_actual INTO current_stock_val FROM current_stock WHERE product_id = item.product_id;
        
        IF current_stock_val IS NULL OR current_stock_val < total_quantity_to_dispatch THEN
          RAISE EXCEPTION 'Stock insuficiente para el producto ID %. Requerido: %, Disponible: %', 
            item.product_id, total_quantity_to_dispatch, current_stock_val;
        END IF;
      END LOOP;

      -- 2. Obtener y bloquear el contador de remisiones
      UPDATE app_settings SET value = (value::INT + 1)::TEXT
      WHERE key = 'next_dispatch_number'
      RETURNING value::INT - 1 INTO new_dispatch_number;

      -- 3. Crear el registro de despacho
      INSERT INTO dispatches (dispatch_number) VALUES (new_dispatch_number)
      RETURNING id INTO new_dispatch_id;

      -- 4. Registrar los movimientos de salida, ahora con la cantidad extra por item
      FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID, 
        quantity INT,
        extra_quantity INT
      )
      LOOP
        INSERT INTO inventory_movements (
          product_id, type, quantity, client_name, 
          extra_quantity, dispatch_id, user_id
        )
        VALUES (
          item.product_id, 
          'salida', 
          item.quantity, -- La cantidad normal
          p_client_name, 
          item.extra_quantity, -- La cantidad extra específica de este item
          new_dispatch_id, 
          p_user_id
        );
      END LOOP;
      
      RETURN new_dispatch_number;
    END;
    $$;
    */

    const { data: dispatchNumber, error: rpcError } = await supabase.rpc(
      "handle_inventory_dispatch",
      {
        p_client_name: client_name,
        p_items: items,
        p_user_id: user.id,
      }
    );

    if (rpcError) {
      console.error("Error en RPC handle_inventory_dispatch:", rpcError);
      if (rpcError.message.includes("Stock insuficiente")) {
        return NextResponse.json(
          { error: "Stock insuficiente para uno de los productos." },
          { status: 409 }
        );
      }
      throw new Error("Error al procesar el despacho en la base de datos.");
    }

    // --- GENERACIÓN DEL ARCHIVO EXCEL (MEJORADO) ---
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Inventarios";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(`Remisión ${dispatchNumber}`);

    worksheet.mergeCells("A1:E1");
    worksheet.getCell("A1").value = `REMISIÓN DE PEDIDOS N° ${dispatchNumber}`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.getCell("A3").value = "Fecha de Entrega:";
    worksheet.getCell("B3").value = new Date().toLocaleDateString("es-CO");
    worksheet.getCell("A4").value = "Cliente:";
    worksheet.getCell("B4").value = client_name;
    worksheet.mergeCells("B4:E4");

    worksheet.getRow(6).values = [
      "ID Producto",
      "Nombre Producto",
      "Cantidad",
      "Cantidad Extra",
      "Total Salida",
    ];
    worksheet.getRow(6).font = { bold: true };
    worksheet.getRow(6).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
      cell.border = {
        bottom: { style: "thin" },
      };
    });

    let totalGeneral = 0;
    items.forEach((item, index) => {
      const row = worksheet.getRow(7 + index);
      const totalItem = item.quantity + item.extra_quantity;
      totalGeneral += totalItem;
      row.values = [
        item.product_id,
        item.name,
        item.quantity,
        item.extra_quantity,
        totalItem,
      ];
    });

    const lastDataRow = 7 + items.length;
    worksheet.getCell(`D${lastDataRow + 1}`).value = "Total General:";
    worksheet.getCell(`D${lastDataRow + 1}`).font = { bold: true };
    worksheet.getCell(`E${lastDataRow + 1}`).value = totalGeneral;
    worksheet.getCell(`E${lastDataRow + 1}`).font = { bold: true };

    worksheet.columns.forEach((column) => {
      column.width = column.header === "ID Producto" ? 40 : 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.append(
      "Content-Disposition",
      `attachment; filename="REMISION_${dispatchNumber}.xlsx"`
    );
    headers.append("X-Dispatch-Number", dispatchNumber);
    headers.append("Access-Control-Expose-Headers", "X-Dispatch-Number");

    return new NextResponse(buffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Error en API /inventory/dispatch:", error);
    return NextResponse.json(
      { error: error.message || "Ocurrió un error inesperado en el servidor." },
      { status: 500 }
    );
  }
}
