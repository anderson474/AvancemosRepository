// src/app/(dashboard)/inventory/dispatch/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import ProductSearch from "./productSearch";
//import { createClient } from "@/lib/supabase/client";
import {
  TruckIcon,
  UserCircleIcon,
  PlusCircleIcon,
  TrashIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
//import { Session } from "inspector/promises";
//import debounce from "lodash.debounce";

// --- Sub-componente: Búsqueda de Productos ---
// function ProductSearch({ onAddProduct }) {
//   // ... (El código de ProductSearch no cambia, puedes usar el que te pasé en la respuesta anterior)
// }

// --- Componente Principal ---
export default function DispatchPage() {
  const [formData, setFormData] = useState({
    client_name: "",
    funcionario: "",
    direccion: "",
    ciudad: "",
    telefono: "",
    celular: "",
    barrio: "",
    asesor: "",
  });
  const [dispatchItems, setDispatchItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  const addProductToDispatch = (product, quantity) => {
    const existingItem = dispatchItems.find(
      (item) => item.product_id === product.product_id
    );
    if (existingItem) {
      alert(
        `El producto "${product.name}" ya está en la lista. Puedes modificar su cantidad o cantidad extra directamente.`
      );
    } else {
      setDispatchItems([
        ...dispatchItems,
        { ...product, quantity, extra_quantity: "" },
      ]);
    }
  };

  const handleExtraQuantityChange = (productId, value) => {
    const numericValue = value === "" ? "" : Number(value);
    setDispatchItems((currentItems) =>
      currentItems.map((item) => {
        if (item.product_id === productId) {
          const newExtra = numericValue === "" ? 0 : numericValue;
          if (item.quantity + newExtra > item.stock_actual) {
            alert(
              `La cantidad total (normal + extra) no puede superar el stock de ${item.stock_actual}`
            );
            return { ...item, extra_quantity: item.extra_quantity }; // No hacer el cambio
          }
          return { ...item, extra_quantity: numericValue };
        }
        return item;
      })
    );
  };

  const removeProductFromDispatch = (productId) => {
    setDispatchItems(
      dispatchItems.filter((item) => item.product_id !== productId)
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "" }),
      5000
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.client_name || dispatchItems.length === 0) {
      showNotification(
        "Debes rellenar el nombre del cliente y añadir al menos un producto.",
        "error"
      );
      setIsLoading(false);
      return;
    }

    const payload = {
      ...formData,
      items: dispatchItems.map(
        // Desestructuramos las propiedades que necesitamos del objeto 'item'
        ({
          product_id,
          name,
          quantity,
          extra_quantity,
          product_type,
          session,
          period,
          grade,
        }) => ({
          product_id,
          name,
          quantity,
          extra_quantity: Number(extra_quantity) || 0,
          product_type,
          session,
          period,
          grade,
        })
      ),
    };

    try {
      const response = await fetch("/api/inventory/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al generar la remisión.");
      }

      const blob = await response.blob();
      const dispatchNumber =
        response.headers.get("X-Dispatch-Number") || "REMISION";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `REMISION_${dispatchNumber}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showNotification("Remisión generada y descargada con éxito.", "success");
      setFormData({
        client_name: "",
        funcionario: "",
        direccion: "",
        ciudad: "",
        telefono: "",
        celular: "",
        barrio: "",
        asesor: "",
      });
      setDispatchItems([]);
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Crear Salida / Remisión
        </h1>
      </header>

      {notification.show && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white animate-fade-in-down ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircleIcon className="h-6 w-6 mr-2" />
          ) : (
            <XCircleIcon className="h-6 w-6 mr-2" />
          )}
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-md border">
          <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <PlusCircleIcon className="h-6 w-6 text-blue-500" />
            Paso 1: Añadir productos
          </h2>
          <ProductSearch onAddProduct={addProductToDispatch} />
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md border">
          <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <UserCircleIcon className="h-6 w-6 text-blue-500" />
            Paso 2: Revisar despacho y datos de entrega
          </h2>
          <div className="mb-8">
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              Productos a despachar:
            </h3>
            {dispatchItems.length === 0 ? (
              <p className="text-slate-400 text-center py-4 border-2 border-dashed rounded-md">
                Aún no has añadido productos.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 border rounded-md">
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-slate-600 mb-2">
                    Productos a despachar:
                  </h3>

                  {/* Condición: Si no hay productos, muestra un placeholder */}
                  {dispatchItems.length === 0 ? (
                    <div className="text-center py-8 px-4 border-2 border-dashed rounded-md">
                      <p className="text-slate-500">
                        Aún no has añadido productos a la lista.
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Usa el buscador de arriba para empezar.
                      </p>
                    </div>
                  ) : (
                    // Si hay productos, renderiza la lista
                    <ul className="divide-y divide-slate-200 border rounded-md shadow-sm">
                      {dispatchItems.map((item) => {
                        // Calculamos el total de salida para este ítem
                        const totalQuantity =
                          item.quantity + (Number(item.extra_quantity) || 0);
                        // Calculamos el stock restante para limitar la cantidad extra
                        const remainingStockForExtras =
                          item.stock_actual - item.quantity;

                        return (
                          <li
                            key={item.product_id}
                            className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center transition-colors hover:bg-slate-50"
                          >
                            {/* --- Columna de Información del Producto --- */}
                            <div className="md:col-span-2">
                              <p className="font-semibold text-slate-800 break-words">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-2">
                                <span>
                                  Cantidad:{" "}
                                  <strong className="text-slate-700">
                                    {item.quantity}
                                  </strong>
                                </span>
                                <span>
                                  Stock Disp.:{" "}
                                  <strong className="text-slate-700">
                                    {item.stock_actual}
                                  </strong>
                                </span>
                                <span>
                                  Total Salida:{" "}
                                  <strong className="text-blue-600">
                                    {totalQuantity}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* --- Columna de Cantidad Extra y Botón de Eliminar --- */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label
                                  htmlFor={`extra-${item.product_id}`}
                                  className="flex items-center text-sm font-medium text-gray-700 mb-1"
                                >
                                  <GiftIcon className="h-4 w-4 mr-1 text-green-600" />
                                  Cantidad Extra
                                </label>
                                <input
                                  type="number"
                                  id={`extra-${item.product_id}`}
                                  value={item.extra_quantity}
                                  onChange={(e) =>
                                    handleExtraQuantityChange(
                                      item.product_id,
                                      e.target.value
                                    )
                                  }
                                  className="w-full input-style"
                                  min="0"
                                  max={remainingStockForExtras} // El máximo extra es el stock que queda
                                  placeholder="0"
                                />
                              </div>

                              {/* Botón para eliminar el ítem de la lista */}
                              <button
                                type="button"
                                onClick={() =>
                                  removeProductFromDispatch(item.product_id)
                                }
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full self-end mt-5"
                                title="Eliminar producto"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <label htmlFor="client_name" className="label-style">
                Institución / Cliente
              </label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                className="input-style"
                required
              />
            </div>
            <div>
              <label htmlFor="funcionario" className="label-style">
                Funcionario que Recibe
              </label>
              <input
                type="text"
                name="funcionario"
                value={formData.funcionario}
                onChange={handleChange}
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="direccion" className="label-style">
                Dirección
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="ciudad" className="label-style">
                Ciudad
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="barrio" className="label-style">
                Barrio
              </label>
              <input
                type="text"
                name="barrio"
                value={formData.barrio}
                onChange={handleChange}
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="label-style">
                Teléfono
              </label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="celular" className="label-style">
                Celular
              </label>
              <input
                type="text"
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                className="input-style"
              />
            </div>
            <div>
              <label htmlFor="asesor" className="label-style">
                Asesor Comercial
              </label>
              <input
                type="text"
                name="asesor"
                value={formData.asesor}
                onChange={handleChange}
                className="input-style"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || dispatchItems.length === 0}
            className="btn-primary bg-green-600 hover:bg-green-700"
          >
            <TruckIcon
              className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Generando..." : "Generar y Descargar Remisión"}
          </button>
        </div>
      </form>
    </div>
  );
}
