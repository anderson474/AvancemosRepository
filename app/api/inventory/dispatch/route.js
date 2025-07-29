// src/app/api/inventory/dispatch/route.js
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";

export async function POST(request) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const {
      client_name,
      items,
      funcionario,
      direccion,
      ciudad,
      telefono,
      celular,
      barrio,
      asesor,
    } = body;

    if (!client_name || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Cliente y al menos un producto son requeridos." },
        { status: 400 }
      );
    }

    const { data: dispatchNumber, error: rpcError } = await supabase.rpc(
      "handle_dispatch_with_extras",
      {
        p_client_name: client_name,
        p_items: items.map(({ product_id, quantity, extra_quantity }) => ({
          product_id,
          quantity,
          extra_quantity,
        })),
        p_user_id: user.id,
        // Nuevos parámetros para la RPC
        p_funcionario: funcionario,
        p_direccion: direccion,
        p_ciudad: ciudad,
        p_telefono: telefono,
        p_celular: celular,
        p_barrio: barrio,
        p_asesor: asesor,
      }
    );

    if (rpcError) {
      console.error("Error en RPC:", rpcError);
      if (rpcError.message.includes("Stock insuficiente")) {
        return NextResponse.json({ error: rpcError.message }, { status: 409 });
      }
      throw new Error("Error al procesar el despacho en la base de datos.");
    }

    // ... (dentro de la función POST, después de la llamada RPC exitosa)

    // --- GENERACIÓN DEL EXCEL USANDO UNA PLANTILLA ---
    const workbook = new ExcelJS.Workbook();

    // 1. Cargar la plantilla
    const templatePath = path.join(
      process.cwd(),
      "templates",
      "remision_template.xlsx"
    );
    await workbook.xlsx.readFile(templatePath);

    // 2. Obtener la hoja de trabajo (worksheet) que vamos a editar.
    // Asumimos que se llama 'Remisión' o es la primera hoja.
    const worksheet = workbook.getWorksheet("Plantilla"); // O workbook.getWorksheet('NombreDeLaHoja');

    // 3. Escribir los datos en las celdas específicas.
    // ¡Aquí solo necesitas saber las coordenadas de las celdas!
    const today = new Date();

    worksheet.getCell("B4").value = `Nº ${dispatchNumber}`; // Celda para el número de remisión
    worksheet.getCell("D6").value = `D ${today.getDate()}`; // Celda para el día
    worksheet.getCell("E6").value = `M ${today
      .toLocaleString("es-CO", { month: "short" })
      .toUpperCase()
      .replace(".", "")}`; // Mes
    worksheet.getCell("F6").value = `AA ${today.getFullYear()}`; // Año

    worksheet.getCell("C8").value = client_name; // Institución
    worksheet.getCell("D10").value = funcionario || "";
    worksheet.getCell("C12").value = direccion || "";
    worksheet.getCell("D14").value = ciudad || "";
    worksheet.getCell("I8").value = telefono || "";
    worksheet.getCell("I10").value = celular || "";
    worksheet.getCell("I12").value = barrio || "";
    worksheet.getCell("H14").value = asesor || "";

    // // client_name,
    //   items,
    //   funcionario,
    //   direccion,
    //   ciudad,
    //   telefono,
    //   celular,
    //   barrio,
    //   asesor,

    // 4. Escribir los datos de los productos en la tabla.
    // Empezamos a escribir en la fila 19 (ajusta si tu plantilla es diferente).
    let currentRow = 18;
    let totalGeneral = 0;

    items.forEach((item) => {
      const row = worksheet.getRow(currentRow);
      const totalItem = item.quantity + item.extra_quantity;
      totalGeneral += totalItem;
      // //name,
      //   quantity,
      //   extra_quantity: Number(extra_quantity) || 0,
      //   product_type, // Enviamos el tipo para el Excel
      //   session,
      //   period,
      //   grade,
      // Escribimos en las celdas por su número de columna
      row.getCell(2).value = item.name; // Columna B: PRODUCTO SOLICITADO
      row.getCell(5).value = item.quantity; // Columna D: CANTIDAD ENTREGADA
      row.getCell(7).value = item.extra_quantity;
      row.getCell(9).value = item.product_type;
      row.getCell(6).value = item.session; // Columna F: SESIÓN
      row.getCell(10).value = item.period; // Columna G: PER
      row.getCell(8).value = item.grade; // Columna H: GRADO
      row.getCell(11).value = totalItem; // Columna H: TOTAL SALIDA

      // Si necesitas que la fila herede los estilos de una fila de plantilla, puedes hacerlo.
      // Por ahora, asumimos que las filas ya tienen el formato correcto.

      currentRow++;
    });

    // 5. Escribir el total general
    // Encuentra la celda del total y escribe el valor (ej. H30)
    worksheet.getCell("K32").value = totalGeneral;

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

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("Error en API /inventory/dispatch:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
