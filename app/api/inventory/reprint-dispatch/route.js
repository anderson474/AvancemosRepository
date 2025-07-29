// src/app/api/inventory/reprint-dispatch/route.js
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener el ID del despacho de los parámetros de la URL
    const { searchParams } = new URL(request.url);
    const dispatchId = searchParams.get("id");

    if (!dispatchId) {
      return NextResponse.json(
        { error: "ID de despacho requerido." },
        { status: 400 }
      );
    }

    // 1. Obtener la información del despacho y sus movimientos
    const { data: dispatchData, error: dispatchError } = await supabase
      .from("dispatches")
      .select("dispatch_number, created_at")
      .eq("id", dispatchId)
      .single();

    if (dispatchError || !dispatchData) {
      throw new Error("No se encontró la remisión.");
    }

    const { data: movementsData, error: movementsError } = await supabase
      .from("inventory_movements")
      .select("client_name, extra_quantity, quantity, products(name)")
      .eq("dispatch_id", dispatchId)
      .eq("type", "salida");

    if (movementsError || !movementsData || movementsData.length === 0) {
      throw new Error("No se encontraron los productos de la remisión.");
    }

    // Extraer datos para el Excel
    const { dispatch_number, created_at } = dispatchData;
    const { client_name, extra_quantity } = movementsData[0]; // Todos los movimientos tienen los mismos datos de cliente
    const items = movementsData.map((m) => ({
      name: m.products.name,
      quantity: m.quantity,
    }));

    // --- 2. GENERACIÓN DEL ARCHIVO EXCEL ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Remisión ${dispatch_number}`);

    // Añadir Título y Encabezados
    worksheet.mergeCells("A1:C1");
    worksheet.getCell(
      "A1"
    ).value = `REIMPRESIÓN - REMISIÓN N° ${dispatch_number}`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.getCell("A3").value = "Fecha de Emisión:";
    worksheet.getCell("B3").value = new Date(created_at).toLocaleDateString(
      "es-CO"
    );
    worksheet.getCell("A4").value = "Cliente:";
    worksheet.getCell("B4").value = client_name;

    worksheet.getRow(6).values = ["Nombre Producto", "Cantidad Despachada"];
    worksheet.getRow(6).font = { bold: true };

    items.forEach((item, index) => {
      worksheet.getRow(7 + index).getCell("A").value = item.name;
      worksheet.getRow(7 + index).getCell("B").value = item.quantity;
    });

    const lastRow = 7 + items.length + 1;
    worksheet.getCell(`A${lastRow}`).value = "Cantidad Extra:";
    worksheet.getCell(`B${lastRow}`).value = extra_quantity;

    // Escribir el buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.append(
      "Content-Disposition",
      `attachment; filename="REIMPRESION_REMISION_${dispatch_number}.xlsx"`
    );

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("Error en API /reprint-dispatch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
