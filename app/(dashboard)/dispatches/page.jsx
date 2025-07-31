// src/app/(dashboard)/dispatches/page.jsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MagnifyingGlassIcon, PrinterIcon } from "@heroicons/react/24/outline";

// Función para formatear la fecha a un formato legible
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("es-CO", options);
};

export default function DispatchesPage() {
  const supabase = createClient();
  const [dispatches, setDispatches] = useState([]);
  const [filteredDispatches, setFilteredDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Estado para controlar qué remisión se está reimprimiendo
  const [reprintingId, setReprintingId] = useState(null);

  // Efecto para obtener las remisiones desde la base de datos
  useEffect(() => {
    const fetchDispatches = async () => {
      setLoading(true);

      // Usamos la vista 'dispatch_details' que creaste en Supabase.
      // Es la forma más eficiente de obtener los datos agregados.
      const { data, error } = await supabase
        .from("dispatch_details")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setDispatches(data);
        setFilteredDispatches(data);
      } else {
        console.error("Error al obtener las remisiones:", error);
      }
      setLoading(false);
    };

    fetchDispatches();
  }, [supabase]);

  // Efecto para filtrar las remisiones según el término de búsqueda
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredDispatches(dispatches);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      setFilteredDispatches(
        dispatches.filter(
          (d) =>
            d.dispatch_number.toString().includes(lowercasedFilter) ||
            d.client_name.toLowerCase().includes(lowercasedFilter)
        )
      );
    }
  }, [searchTerm, dispatches]);

  // Función para manejar la reimpresión de una remisión
  const handleReprint = async (dispatch) => {
    if (!dispatch || !dispatch.dispatch_id) {
      alert("Error: No se puede reimprimir una remisión sin ID.");
      return;
    }
    console.log("Reimprimiendo remisión:", dispatch);
    setReprintingId(dispatch.dispatch_id);

    try {
      const response = await fetch(
        `/api/inventory/reprint-dispatch?id=${dispatch.dispatch_id}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo generar el informe.");
      }

      // Lógica para descargar el archivo Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `REMISION_${dispatch.dispatch_number}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al reimprimir:", error);
      alert(`Error al generar el informe: ${error.message}`);
    } finally {
      setReprintingId(null); // Detiene el estado de carga, tanto si tuvo éxito como si falló
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Historial de Remisiones
        </h1>
        <p className="text-slate-500 mt-1">
          Consulta y gestiona todos los despachos realizados.
        </p>
      </header>

      <div className="bg-white p-6 rounded-lg shadow-md border">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-slate-700">
            Remisiones Generadas
          </h2>
          <div className="relative w-full md:w-auto">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 text-slate-400 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° o Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center py-10 text-slate-500">
              Cargando remisiones...
            </p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    N° Remisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredDispatches.length > 0 ? (
                  filteredDispatches.map((dispatch) => {
                    const isReprinting = reprintingId === dispatch.dispatch_id;
                    return (
                      <tr
                        key={dispatch.dispatch_id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                          #{dispatch.dispatch_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                          {formatDate(dispatch.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                          {dispatch.client_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                          {dispatch.total_quantity} ({dispatch.item_count}{" "}
                          tipos)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleReprint(dispatch)}
                            disabled={isReprinting}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            <PrinterIcon
                              className={`h-5 w-5 ${
                                isReprinting ? "animate-spin" : ""
                              }`}
                            />
                            <span>
                              {isReprinting ? "Generando..." : "Reimprimir"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // CORRECCIÓN: Se añade una 'key' única al tr del estado vacío.
                  <tr key="no-results-row">
                    <td
                      colSpan="5"
                      className="text-center py-10 text-slate-500"
                    >
                      No se encontraron remisiones que coincidan con la
                      búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
