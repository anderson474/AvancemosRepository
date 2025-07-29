// src/app/(dashboard)/reports/page.jsx
"use client";

import { useState } from "react";
import { DocumentChartBarIcon } from "@heroicons/react/24/outline";

export default function ReportsPage() {
  const [formData, setFormData] = useState({
    report_type: "inventory",
    start_date: "",
    end_date: "",
    product_type: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Construir los parámetros de la URL
    const params = new URLSearchParams();
    for (const key in formData) {
      if (formData[key]) {
        params.append(key, formData[key]);
      }
    }

    // Llamar a una API que generará y devolverá el archivo
    try {
      const response = await fetch(
        `/api/reports/generate?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("No se pudo generar el informe.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "informe.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Generador de Informes
        </h1>
        <p className="text-slate-500 mt-1">
          Crea y descarga informes personalizados de tu inventario.
        </p>
      </header>

      <div className="bg-white p-8 rounded-xl shadow-md border">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="md:col-span-2">
            <label
              htmlFor="report_type"
              className="block text-sm font-medium text-gray-700"
            >
              Tipo de Informe
            </label>
            <select
              name="report_type"
              id="report_type"
              value={formData.report_type}
              onChange={handleChange}
              className="input-style"
              required
            >
              <option value="inventory">Inventario Actual</option>
              <option value="entries">Historial de Entradas</option>
              <option value="exits">Historial de Salidas</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700"
            >
              Fecha de Inicio
            </label>
            <input
              type="date"
              name="start_date"
              id="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="input-style"
            />
          </div>

          <div>
            <label
              htmlFor="end_date"
              className="block text-sm font-medium text-gray-700"
            >
              Fecha de Fin
            </label>
            <input
              type="date"
              name="end_date"
              id="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="input-style"
            />
          </div>

          <div>
            <label
              htmlFor="product_type"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por Tipo de Producto
            </label>
            <select
              name="product_type"
              id="product_type"
              value={formData.product_type}
              onChange={handleChange}
              className="input-style"
            >
              <option value="">Todos</option>
              <option value="libro">Libro</option>
              <option value="cartilla">Cartilla</option>
              <option value="prueba_periodo">Prueba de Periodo</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary bg-indigo-600 hover:bg-indigo-700"
            >
              <DocumentChartBarIcon
                className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Generando..." : "Generar y Descargar Informe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
