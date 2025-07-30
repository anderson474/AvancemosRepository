// src/app/api/reports/generate/route.js
import { createClient } from "@/lib/supabase/server";
//import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(request) {
  console.log("\n--- [INFO] Petición a /api/reports/generate recibida ---");

  // NOTA: Si createClient() no recibe las cookies, getUser() probablemente devolverá null.
  // Tu createClient podría ser diferente, pero es el punto más común de fallo.
  const supabase = await createClient();

  try {
    console.log("[DEBUG] 1. Verificando autenticación de usuario...");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Este es el primer punto de control crítico.
    console.log(
      "[DEBUG] Usuario obtenido:",
      user ? `ID: ${user.id}` : "¡Usuario es NULL!"
    );

    if (!user) {
      console.error(
        "[ERROR] Autenticación fallida. El usuario no está logueado en el servidor. Devolviendo 401."
      );
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("[INFO] Autenticación exitosa.");

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("report_type") || "inventory";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const productType = searchParams.get("product_type");

    console.log("[DEBUG] 2. Parámetros de la solicitud:", {
      reportType,
      startDate,
      endDate,
      productType,
    });

    let query;
    let data;
    let error;
    let headersExcel = [];
    let title = "";

    console.log(
      `[INFO] Construyendo consulta para el tipo de informe: "${reportType}"`
    );
    // Construir la consulta dinámicamente
    switch (reportType) {
      case "inventory":
        title = "Informe de Inventario Actual";
        headersExcel = ["Producto", "Grado", "Periodo", "Stock Actual"];
        query = supabase
          .from("current_stock")
          .select("name, grade, period, stock_actual");
        // ... (lógica de filtro omitida como en el original)
        console.log("[DEBUG] Ejecutando consulta de inventario...");
        ({ data, error } = await query.order("name"));
        break;

      case "entries":
        title = "Informe de Entradas";
        headersExcel = [
          "Fecha",
          "Producto",
          "Tipo",
          "Cantidad",
          "Grado",
          "Periodo",
          //"Usuario",
        ];
        query = supabase
          .from("inventory_movements")
          .select(
            "entry_date, quantity, products(name, grade, period, product_type), user_id"
          )
          .eq("type", "entrada");
        if (startDate) query = query.gte("entry_date", startDate);
        if (endDate) query = query.lte("entry_date", endDate);
        if (productType) query = query.eq("products.product_type", productType); // <-- Posible punto de error de sintaxis de consulta
        console.log("[DEBUG] Ejecutando consulta de entradas...");
        ({ data, error } = await query.order("entry_date", {
          ascending: false,
        }));
        break;

      case "exits":
        title = "Informe de Salidas";
        headersExcel = [
          "Fecha",
          "Producto",
          "Cantidad",
          "Cliente",
          "N° Remisión",
          //"Usuario",
        ];
        query = supabase
          .from("inventory_movements")
          .select(
            "entry_date, quantity, client_name, products(name), dispatches(dispatch_number), user_id"
          )
          .eq("type", "salida");
        if (startDate) query = query.gte("entry_date", startDate);
        if (endDate) query = query.lte("entry_date", endDate);
        if (productType) query = query.eq("products.product_type", productType); // <-- Posible punto de error de sintaxis de consulta
        console.log("[DEBUG] Ejecutando consulta de salidas...");
        ({ data, error } = await query.order("entry_date", {
          ascending: false,
        }));
        break;

      default:
        console.error(`[ERROR] Tipo de informe no válido: "${reportType}"`);
        return NextResponse.json(
          { error: "Tipo de informe no válido" },
          { status: 400 }
        );
    }

    console.log("[DEBUG] 3. Resultado de la consulta a Supabase:");
    console.log("   - Error de Supabase:", error);
    console.log(
      "   - Datos obtenidos:",
      data ? `${data.length} filas.` : "¡Datos es NULL o undefined!"
    );
    if (data && data.length > 0) {
      console.log(
        "   - Estructura de la primera fila:",
        JSON.stringify(data[0], null, 2)
      );
    }

    if (error) {
      console.error(
        "[ERROR] La consulta a Supabase devolvió un error. Lanzando excepción..."
      );
      throw new Error(`Error al obtener datos del informe: ${error.message}`);
    }

    // Otro punto crítico de fallo: si la consulta no devuelve datos.
    if (!data) {
      console.error(
        "[ERROR] La variable 'data' es null o undefined después de la consulta. Esto causará un error en .forEach. Lanzando excepción..."
      );
      throw new Error(
        "No se encontraron datos para los criterios seleccionados."
      );
    }

    console.log(
      "[INFO] 4. Iniciando generación del archivo Excel con estilos..."
    );
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title, {
      views: [{ state: "frozen", ySplit: 3 }], // Congela las primeras 3 filas (título y cabeceras)
    });

    // --- ESTILOS DEL TÍTULO ---
    // Nota: Aumenté el merge a 'G1' porque el informe de Entradas tiene 7 columnas.
    worksheet.mergeCells("A1:G1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = {
      name: "Calibri",
      size: 18,
      bold: true,
      color: { argb: "FFFFFFFF" }, // Texto blanco
    };
    titleCell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }, // Color Indigo-600 (el de tu botón)
    };
    worksheet.getRow(1).height = 40; // Aumentar altura de la fila del título

    // --- ESTILOS DE LAS CABECERAS (HEADERS) ---
    const headerRow = worksheet.getRow(3);
    headerRow.values = headersExcel;
    headerRow.font = {
      name: "Calibri",
      size: 12,
      bold: true,
      color: { argb: "FF374151" }, // Texto gris oscuro
    };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" }, // Fondo gris claro
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 30; // Aumentar altura de la fila de cabeceras

    console.log(`[DEBUG] Mapeando ${data.length} filas a Excel...`);
    data.forEach((row, index) => {
      // Si algo falla aquí, será por la estructura de `row` (ej. `row.products` es null)
      if (index === 0)
        console.log(
          "[DEBUG] Procesando primera fila en el bucle de Excel:",
          row
        );
      const rowIndex = 4 + index;
      if (reportType === "inventory") {
        worksheet.getRow(rowIndex).values = [
          row.name,
          row.grade,
          row.period,
          row.stock_actual,
        ];
      } else if (reportType === "entries") {
        worksheet.getRow(rowIndex).values = [
          new Date(row.entry_date).toLocaleDateString("es-CO"),
          row.products.name,
          row.products.product_type,
          row.quantity,
          row.products.grade,
          row.products.period,
          //row.profiles?.full_name || "N/A",
        ];
      } else if (reportType === "exits") {
        worksheet.getRow(rowIndex).values = [
          new Date(row.entry_date).toLocaleDateString("es-CO"),
          row.products.name,
          row.quantity,
          row.client_name,
          row.dispatches?.dispatch_number || "N/A",
          //row.profiles?.full_name || "N/A",
        ];
      }
    });

    console.log("[INFO] 5. Generación del buffer del archivo Excel...");
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Informe_${reportType}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    console.log(
      `[SUCCESS] Buffer creado. Tamaño: ${buffer.byteLength} bytes. Enviando archivo: ${filename}`
    );

    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.append("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    // Este bloque captura cualquier error lanzado dentro del `try`.
    console.error(
      "\n--- [CRITICAL] Error capturado en el bloque CATCH principal ---"
    );
    console.error("Mensaje de error:", error.message);
    console.error("Stack de error:", error.stack);
    console.error(
      "----------------------------------------------------------\n"
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
