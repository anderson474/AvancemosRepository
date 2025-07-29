// src/app/(dashboard)/inventory/entry/page.jsx
"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const initialState = {
  name: "",
  product_type: "",
  quantity: "",
  grade: "",
  period: "",
  session: "",
  observations: "",
};

export default function EntryPage() {
  const [formData, setFormData] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "" }),
      4000
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.product_type === "") {
      showNotification("Debes seleccionar un tipo de producto.", "error");
      setIsLoading(false);
      return;
    }

    try {
      // La fecha se añade en el backend (API Route), no se envía desde aquí.
      const response = await fetch("/api/inventory/entry", {
        // Necesitarás crear esta API Route
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity, 10),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Ocurrió un error desconocido.");

      showNotification("Entrada registrada con éxito.", "success");
      setFormData(initialState);
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
          Registrar Entrada de Inventario
        </h1>
        <p className="text-slate-500 mt-1">
          Añade nuevos productos o stock al sistema.
        </p>
      </header>

      {/* Notificación */}
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

      <div className="bg-white p-8 rounded-xl shadow-md border">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre del Producto
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="input-style"
              required
            />
          </div>

          <div>
            <label
              htmlFor="product_type"
              className="block text-sm font-medium text-gray-700"
            >
              Tipo de Producto
            </label>
            <select
              name="product_type"
              id="product_type"
              value={formData.product_type}
              onChange={handleChange}
              className="input-style"
              required
            >
              <option value="" disabled>
                Seleccione un tipo...
              </option>
              <option value="libro">Libro</option>
              <option value="cartilla">Cartilla</option>
              <option value="prueba_periodo">Prueba de Periodo</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700"
            >
              Cantidad
            </label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="input-style"
              required
            />
          </div>

          <div>
            <label
              htmlFor="grade"
              className="block text-sm font-medium text-gray-700"
            >
              Grado
            </label>
            <select
              name="grade"
              id="grade"
              value={formData.grade}
              onChange={handleChange}
              className="input-style"
            >
              <option value="">N/A</option>
              {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={`${g}`}>{`${g}°`}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="period"
              className="block text-sm font-medium text-gray-700"
            >
              Periodo
            </label>
            <select
              name="period"
              id="period"
              value={formData.period}
              onChange={handleChange}
              className="input-style"
            >
              <option value="">N/A</option>
              {Array.from({ length: 4 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={`${p}`}>{`${p}° Periodo`}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="session"
              className="block text-sm font-medium text-gray-700"
            >
              Sesión
            </label>
            <select
              name="session"
              id="session"
              value={formData.session}
              onChange={handleChange}
              className="input-style"
            >
              <option value="">N/A</option>
              <option value="primera">Primera Sesión</option>
              <option value="segunda">Segunda Sesión</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="observations"
              className="block text-sm font-medium text-gray-700"
            >
              Observaciones
            </label>
            <textarea
              name="observations"
              id="observations"
              value={formData.observations}
              onChange={handleChange}
              rows={4}
              className="input-style"
            ></textarea>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={isLoading} className="btn-primary">
              <ArrowDownTrayIcon
                className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Registrando..." : "Registrar Entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
