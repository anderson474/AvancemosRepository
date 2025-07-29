// src/app/(dashboard)/dispatches/page.jsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MagnifyingGlassIcon, PrinterIcon } from "@heroicons/react/24/outline";

// Función para formatear la fecha
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

  useEffect(() => {
    const fetchDispatches = async () => {
      setLoading(true);

      // Necesitamos una consulta que una las remisiones con sus movimientos
      // La mejor forma es crear una VISTA en Supabase.
      /*
        -- Ejecuta esto en tu editor SQL de Supabase --
        CREATE OR REPLACE VIEW dispatch_details AS
        SELECT 
            d.id,
            d.dispatch_number,
            d.created_at,
            mv.client_name,
            COUNT(mv.id) as item_count,
            SUM(mv.quantity) as total_quantity
        FROM 
            dispatches d
        JOIN 
            inventory_movements mv ON d.id = mv.dispatch_id
        WHERE
            mv.type = 'salida'
        GROUP BY
            d.id, d.dispatch_number, d.created_at, mv.client_name;
      */

      const { data, error } = await supabase
        .from("dispatch_details")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setDispatches(data);
        setFilteredDispatches(data);
      } else {
        console.error("Error fetching dispatches:", error);
      }
      setLoading(false);
    };

    fetchDispatches();
  }, [supabase]);

  // Filtrar remisiones
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredDispatches(dispatches);
    } else {
      setFilteredDispatches(
        dispatches.filter(
          (d) =>
            d.dispatch_number.toString().includes(searchTerm) ||
            d.client_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, dispatches]);

  const handleReprint = (dispatch) => {
    // Aquí podríamos llamar a una API que regenere el Excel.
    // Por ahora, mostraremos un alert.
    alert(
      `Reimprimiendo remisión N° ${dispatch.dispatch_number} para ${dispatch.client_name}`
    );
    // En una implementación real:
    // window.open(`/api/inventory/reprint-dispatch?id=${dispatch.id}`, '_blank');
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

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-slate-700">
            Remisiones Generadas
          </h2>
          <div className="relative">
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
            <p className="text-center py-10">Cargando remisiones...</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    N° Remisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Total Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredDispatches.length > 0 ? (
                  filteredDispatches.map((dispatch) => (
                    <tr key={dispatch.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                        #{dispatch.dispatch_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(dispatch.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dispatch.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dispatch.total_quantity} ({dispatch.item_count} tipos)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleReprint(dispatch)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <PrinterIcon className="h-5 w-5" />
                          <span>Reimprimir</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-10 text-slate-500"
                    >
                      No se encontraron remisiones.
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
