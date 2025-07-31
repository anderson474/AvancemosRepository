// src/app/api/inventory/reprint-dispatch/route.js

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";

// Esta función manejará peticiones GET
export async function GET(request) {
  console.log("\n--- [API /reprint-dispatch] INICIANDO PETICIÓN GET ---");
  const supabase = createClient(); // RECUERDA: Sin 'await' aquí.

  try {
    // 1. Verificar autenticación
    console.log("[LOG] 1. Verificando autenticación de usuario...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "[ERROR] Error de autenticación en Supabase:",
        authError.message
      );
      throw new Error("Fallo en la autenticación.");
    }

    if (!user) {
      console.warn("[WARN] Usuario no autenticado. Denegando acceso.");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    console.log(`[LOG] Usuario autenticado: ${user.email}`);

    // 2. Obtener el ID de la remisión
    const { searchParams } = new URL(request.url);
    const dispatchId = searchParams.get("id");
    console.log(`[LOG] 2. ID de remisión recibido de la URL: ${dispatchId}`);

    if (!dispatchId) {
      console.warn("[WARN] No se proporcionó un ID de remisión en la URL.");
      return NextResponse.json(
        { error: "Falta el ID de la remisión" },
        { status: 400 }
      );
    }

    // 3. Obtener los datos generales del despacho
    console.log(
      `[LOG] 3. Buscando datos para la remisión con ID: ${dispatchId}`
    );
    const { data: dispatchData, error: dispatchError } = await supabase
      .from("dispatches")
      .select("*")
      .eq("id", dispatchId)
      .single();

    if (dispatchError) {
      console.error(
        "[ERROR] Error al buscar en la tabla 'dispatches':",
        dispatchError.message
      );
      throw new Error("Error de base de datos al buscar la remisión.");
    }

    if (!dispatchData) {
      console.error(
        `[ERROR] No se encontró ninguna remisión con el ID: ${dispatchId}`
      );
      throw new Error("No se encontró la remisión especificada.");
    }
    console.log("[LOG] Datos de la remisión encontrados:", dispatchData);

    // 4. Obtener los items asociados
    console.log(
      `[LOG] 4. Buscando items para la remisión con ID: ${dispatchId}`
    );
    const { data: items, error: itemsError } = await supabase
      .from("inventory_movements")
      .select(
        `quantity, extra_quantity, products(name, product_type, session, period, grade)`
      )
      .eq("dispatch_id", dispatchId);

    if (itemsError) {
      console.error(
        "[ERROR] Error al buscar en la tabla 'inventory_movements':",
        itemsError.message
      );
      throw new Error("Error al obtener los productos de la remisión.");
    }
    console.log(`[LOG] Encontrados ${items.length} items asociados:`, items);

    // 5. Generación del Excel
    console.log("[LOG] 5. Iniciando generación del archivo Excel...");
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(
      process.cwd(),
      "templates",
      "remision_template.xlsx"
    );

    try {
      await workbook.xlsx.readFile(templatePath);
      console.log(
        "[LOG] Plantilla de Excel cargada correctamente desde:",
        templatePath
      );
    } catch (templateError) {
      console.error(
        "[ERROR CRÍTICO] No se pudo encontrar o leer la plantilla de Excel:",
        templateError.message
      );
      throw new Error(
        "Falta el archivo de plantilla 'remision_template.xlsx'."
      );
    }

    const worksheet = workbook.getWorksheet("Plantilla");
    if (!worksheet) {
      console.error(
        "[ERROR CRÍTICO] La hoja de trabajo 'Plantilla' no existe en el archivo Excel."
      );
      throw new Error("La plantilla no contiene una hoja llamada 'Plantilla'.");
    }

    const createdAt = new Date(dispatchData.created_at);

    // Llenar datos de cabecera
    worksheet.getCell("B4").value = `Nº ${dispatchData.dispatch_number}`;
    worksheet.getCell("D6").value = `D ${createdAt.getDate()}`;
    worksheet.getCell("E6").value = `M ${createdAt
      .toLocaleString("es-CO", { month: "short" })
      .toUpperCase()
      .replace(".", "")}`;
    worksheet.getCell("F6").value = `AA ${createdAt.getFullYear()}`;
    worksheet.getCell("C8").value = dispatchData.client_name;
    worksheet.getCell("D10").value = dispatchData.funcionario || "";
    worksheet.getCell("C12").value = dispatchData.direccion || "";
    worksheet.getCell("D14").value = dispatchData.ciudad || "";
    worksheet.getCell("I8").value = dispatchData.telefono || "";
    worksheet.getCell("I10").value = dispatchData.celular || "";
    worksheet.getCell("I12").value = dispatchData.barrio || "";
    worksheet.getCell("H14").value = dispatchData.asesor || "";
    console.log("[LOG] Datos de cabecera escritos en el Excel.");

    // Llenar la tabla de productos
    let currentRow = 18;
    let totalGeneral = 0;
    items.forEach((item, index) => {
      const row = worksheet.getRow(currentRow);
      const totalItem = (item.quantity || 0) + (item.extra_quantity || 0);
      totalGeneral += totalItem;

      const productDetails = item.products;
      if (!productDetails) {
        console.warn(
          `[WARN] El item ${index} no tiene detalles de producto (products es null). Saltando este item.`
        );
        return; // Saltar al siguiente item si no hay datos de producto
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

    // Escribir el total general
    worksheet.getCell("K32").value = totalGeneral;
    console.log(`[LOG] Total general (${totalGeneral}) escrito en el Excel.`);

    // 6. Generar y enviar la respuesta
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
    // Para ver más detalles del error, puedes imprimir el objeto de error completo
    // console.error("Objeto de error completo:", error);
    console.error("--- FIN DEL REPORTE DE ERROR ---\n");
    return NextResponse.json(
      { error: error.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
