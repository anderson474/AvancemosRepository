// src/app/(dashboard)/dashboard/page.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"; // Usamos el cliente de la plantilla
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentPlusIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// --- Sub-componente: Tarjetas de KPI ---
function KpiCards({ stats }) {
  const kpis = [
    {
      title: "Productos en Stock",
      value: stats.totalProducts,
      icon: ArchiveBoxIcon,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Entradas Hoy",
      value: stats.entriesToday,
      icon: ArrowDownTrayIcon,
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Salidas Hoy",
      value: stats.exitsToday,
      icon: ArrowUpTrayIcon,
      color: "bg-red-100 text-red-600",
    },
    {
      title: "Remisiones Hoy",
      value: stats.dispatchesToday,
      icon: ClipboardDocumentListIcon,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi) => (
        <div key={kpi.title} className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">{kpi.title}</p>
              <h3 className="text-2xl font-bold">{kpi.value}</h3>
            </div>
            <div className={`p-3 rounded-full ${kpi.color}`}>
              <kpi.icon className="h-7 w-7" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Sub-componente: Acciones Rápidas ---
function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Link
        href="/inventory/entry"
        className="group block p-6 bg-white rounded-xl shadow-md border hover:border-blue-500 hover:shadow-lg transition-all"
      >
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <DocumentPlusIcon className="h-8 w-8" />
          </div>
          <div className="ml-4">
            <h3 className="text-xl font-bold text-slate-800">
              Registrar Entrada
            </h3>
            <p className="text-slate-500">
              Añadir nuevos productos al inventario.
            </p>
          </div>
        </div>
      </Link>
      <Link
        href="/inventory/dispatch"
        className="group block p-6 bg-white rounded-xl shadow-md border hover:border-blue-500 hover:shadow-lg transition-all"
      >
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <TruckIcon className="h-8 w-8" />
          </div>
          <div className="ml-4">
            <h3 className="text-xl font-bold text-slate-800">Crear Salida</h3>
            <p className="text-slate-500">Generar una remisión de despacho.</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

// --- Componente Principal: Dashboard ---
export default function DashboardPage() {
  const supabase = createClient();
  const [stock, setStock] = useState([]);
  const [filteredStock, setFilteredStock] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    entriesToday: 0,
    exitsToday: 0,
    dispatchesToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Creamos un array de promesas para ejecutar todas las consultas en paralelo
      const [
        stockResponse,
        entriesTodayResponse,
        exitsTodayResponse,
        dispatchesTodayResponse,
      ] = await Promise.all([
        supabase
          .from("current_stock")
          .select("*")
          .order("name", { ascending: true }),
        supabase.rpc("count_entries_today"),
        supabase.rpc("count_exits_today"),
        supabase.rpc("count_dispatches_today"),
      ]);

      // Procesamos la respuesta del stock
      if (stockResponse.data) {
        setStock(stockResponse.data);
        setFilteredStock(stockResponse.data);
      }
      if (stockResponse.error)
        console.error("Error fetching stock:", stockResponse.error);

      // Procesamos las respuestas de las RPC
      const newStats = {
        totalProducts:
          stockResponse.data?.reduce(
            (sum, item) => sum + item.stock_actual,
            0
          ) || 0,
        entriesToday: entriesTodayResponse.data || 0,
        exitsToday: exitsTodayResponse.data || 0,
        dispatchesToday: dispatchesTodayResponse.data || 0,
      };

      if (entriesTodayResponse.error)
        console.error(
          "Error fetching entries count:",
          entriesTodayResponse.error
        );
      if (exitsTodayResponse.error)
        console.error("Error fetching exits count:", exitsTodayResponse.error);
      if (dispatchesTodayResponse.error)
        console.error(
          "Error fetching dispatches count:",
          dispatchesTodayResponse.error
        );

      setStats(newStats);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // Filtrar el stock cuando el término de búsqueda cambia
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredStock(stock);
    } else {
      setFilteredStock(
        stock.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.grade &&
              item.grade.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [searchTerm, stock]);

  if (loading) {
    return (
      <div className="text-center p-10">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-slate-500">Cargando datos del dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de tu inventario.</p>
      </header>

      <KpiCards stats={stats} />
      <QuickActions />

      {/* Tabla de Inventario Actual */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">
          Inventario Actual
        </h2>

        {/* Barra de Búsqueda */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 text-slate-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o grado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Producto
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Grado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Periodo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Stock Actual
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredStock.length > 0 ? (
                filteredStock.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.grade || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.period || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.stock_actual > 10
                            ? "bg-green-100 text-green-800"
                            : item.stock_actual > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.stock_actual}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-500">
                    {searchTerm
                      ? "No se encontraron productos."
                      : "No hay productos en el inventario."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
