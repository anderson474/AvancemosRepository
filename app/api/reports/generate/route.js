// src/app/api/reports/generate/route.js
import { createClient } from "@/lib/supabase/server";
//import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(request) {
  //const cookieStore = cookies();
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("report_type") || "inventory";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const productType = searchParams.get("product_type");

    let query;
    let data;
    let error;
    let headersExcel = [];
    let title = "";

    // Construir la consulta dinámicamente
    switch (reportType) {
      case "inventory":
        title = "Informe de Inventario Actual";
        headersExcel = ["Producto", "Grado", "Periodo", "Stock Actual"];
        query = supabase
          .from("current_stock")
          .select("name, grade, period, stock_actual");
        if (productType) {
          // Necesitaríamos unir con la tabla de productos para filtrar por tipo
          // Por simplicidad, este filtro se omite para inventario, pero se podría añadir.
        }
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
          "Usuario",
        ];
        query = supabase
          .from("inventory_movements")
          .select(
            "entry_date, quantity, products(name, grade, period, product_type), profiles(full_name)"
          )
          .eq("type", "entrada");
        if (startDate) query = query.gte("entry_date", startDate);
        if (endDate) query = query.lte("entry_date", endDate);
        if (productType) query = query.eq("products.product_type", productType);
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
          "Usuario",
        ];
        query = supabase
          .from("inventory_movements")
          .select(
            "entry_date, quantity, client_name, products(name), dispatches(dispatch_number), profiles(full_name)"
          )
          .eq("type", "salida");
        if (startDate) query = query.gte("entry_date", startDate);
        if (endDate) query = query.lte("entry_date", endDate);
        if (productType) query = query.eq("products.product_type", productType);
        ({ data, error } = await query.order("entry_date", {
          ascending: false,
        }));
        break;

      default:
        return NextResponse.json(
          { error: "Tipo de informe no válido" },
          { status: 400 }
        );
    }

    if (error) {
      throw new Error(`Error al obtener datos del informe: ${error.message}`);
    }

    // --- GENERACIÓN DEL EXCEL ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // Título
    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = title;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Cabeceras
    worksheet.getRow(3).values = headersExcel;
    worksheet.getRow(3).font = { bold: true };

    // Mapeo de datos (depende de la consulta)
    data.forEach((row, index) => {
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
          row.profiles?.full_name || "N/A",
        ];
      } else if (reportType === "exits") {
        worksheet.getRow(rowIndex).values = [
          new Date(row.entry_date).toLocaleDateString("es-CO"),
          row.products.name,
          row.quantity,
          row.client_name,
          row.dispatches?.dispatch_number || "N/A",
          row.profiles?.full_name || "N/A",
        ];
      }
    });

    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Informe_${reportType}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.append("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("Error en API /reports/generate:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
