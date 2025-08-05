// src/app/api/inventory/reprint-dispatch/route.js

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";

export async function GET(request) {
  console.log("\n--- [API /reprint-dispatch] INICIANDO PETICIÓN GET ---");
  const supabase = await createClient();

  try {
    // 1. Verificar autenticación (Sin cambios aquí)
    console.log("[LOG] 1. Verificando autenticación de usuario...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[ERROR] Autenticación fallida:", authError?.message);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    console.log(`[LOG] Usuario autenticado: ${user.email}`);

    // 2. Obtener el ID de la remisión (Sin cambios aquí)
    const { searchParams } = new URL(request.url);
    const dispatchId = searchParams.get("id");
    console.log(`[LOG] 2. ID de remisión recibido de la URL: ${dispatchId}`);

    if (!dispatchId) {
      return NextResponse.json(
        { error: "Falta el ID de la remisión" },
        { status: 400 }
      );
    }

    // 3. Obtener los datos generales del despacho
    // --- CAMBIO 1: Ser más específico en la selección para mayor claridad ---
    // Solo necesitamos el número y la fecha de la tabla 'dispatches'.
    console.log(
      `[LOG] 3. Buscando datos para la remisión con ID: ${dispatchId}`
    );
    const { data: dispatchData, error: dispatchError } = await supabase
      .from("dispatches")
      .select("dispatch_number, created_at") // Solo pedimos lo que necesitamos de aquí
      .eq("id", dispatchId)
      .single();

    if (dispatchError || !dispatchData) {
      console.error(
        `[ERROR] No se encontró la remisión con ID: ${dispatchId}`,
        dispatchError?.message
      );
      throw new Error("No se encontró la remisión especificada.");
    }
    console.log("[LOG] Datos de la remisión encontrados:", dispatchData);

    // 4. Obtener los items asociados Y LOS DATOS DE CABECERA
    console.log(
      `[LOG] 4. Buscando items para la remisión con ID: ${dispatchId}`
    );
    // --- CAMBIO 2: Modificar la consulta a 'inventory_movements' ---
    // Ahora también pedimos los campos que necesitamos para la cabecera del Excel.
    const { data: items, error: itemsError } = await supabase
      .from("inventory_movements")
      .select(
        `
        quantity, extra_quantity, client_name, funcionario, direccion, ciudad, telefono, celular, barrio, asesor,
        products(name, product_type, session, period, grade)
      `
      )
      .eq("dispatch_id", dispatchId);

    if (itemsError) {
      throw new Error("Error al obtener los productos de la remisión.");
    }

    // --- CAMBIO 3: Añadir una validación ---
    // Nos aseguramos de que la remisión tenga al menos un item.
    if (!items || items.length === 0) {
      throw new Error(
        "No se encontraron items asociados a esta remisión."
      );
    }
    console.log(`[LOG] Encontrados ${items.length} items asociados.`, items);

    // 5. Generación del Excel
    console.log("[LOG] 5. Iniciando generación del archivo Excel...");
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(
      process.cwd(),
      "templates",
      "remision_template.xlsx"
    );

    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet("Plantilla");

    // --- CAMBIO 4: Usar los datos correctos para la cabecera ---
    // La información de la cabecera se toma del primer item, ya que es la misma para todos.
    const headerData = items[0];
    const createdAt = new Date(dispatchData.created_at);

    // Llenar datos de cabecera usando 'dispatchData' y 'headerData'
    worksheet.getCell("B4").value = `Nº ${dispatchData.dispatch_number}`;
    worksheet.getCell("D6").value = `D ${createdAt.getDate()}`;
    worksheet.getCell("E6").value = `M ${createdAt
      .toLocaleString("es-CO", { month: "short" })
      .toUpperCase()
      .replace(".", "")}`;
    worksheet.getCell("F6").value = `AA ${createdAt.getFullYear()}`;
    worksheet.getCell("C8").value = headerData.client_name;
    worksheet.getCell("D10").value = headerData.funcionario || "";
    worksheet.getCell("C12").value = headerData.direccion || "";
    worksheet.getCell("D14").value = headerData.ciudad || "";
    worksheet.getCell("I8").value = headerData.telefono || "";
    worksheet.getCell("I10").value = headerData.celular || "";
    worksheet.getCell("I12").value = headerData.barrio || "";
    worksheet.getCell("H14").value = headerData.asesor || "";
    console.log("[LOG] Datos de cabecera escritos en el Excel.");

    // Llenar la tabla de productos (sin cambios en este bucle)
    let currentRow = 18;
    let totalGeneral = 0;
    items.forEach((item, index) => {
      const row = worksheet.getRow(currentRow);
      const totalItem = (item.quantity || 0) + (item.extra_quantity || 0);
      totalGeneral += totalItem;

      const productDetails = item.products;
      if (!productDetails) {
        console.warn(`[WARN] Item ${index} sin detalles de producto.`);
        return;
      }

      row.getCell(2).value = productDetails.name;
      row.getCell(5).value = item.quantity;
      row.getCell(7).value = item.extra_quantity || 0;
      row.getCell(9).value = productDetails.product_type;
      row.getCell(6).value = productDetails.session;
      row.getCell(10).value = productDetails.period;
      row.getCell(8).value = productDetails.grade;
      row.getCell(11).value = totalItem;
      currentRow++;
    });
    console.log("[LOG] Datos de productos escritos en el Excel.");

    // Escribir el total general (sin cambios aquí)
    worksheet.getCell("K32").value = totalGeneral;
    console.log(`[LOG] Total general (${totalGeneral}) escrito en el Excel.`);

    // 6. Generar y enviar la respuesta (sin cambios aquí)
    console.log("[LOG] 6. Generando buffer y preparando la respuesta final...");
    const buffer = await workbook.xlsx.writeBuffer();
    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.append(
      "Content-Disposition",
      `attachment; filename="REMISION_${dispatchData.dispatch_number}.xlsx"`
    );

    console.log(
      "[LOG] --- Petición completada con éxito. Enviando archivo. ---"
    );
    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("\n--- [ERROR EN API /reprint-dispatch] ---");
    console.error("Mensaje de error:", error.message);
    console.error("--- FIN DEL REPORTE DE ERROR ---\n");
    return NextResponse.json(
      { error: error.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}