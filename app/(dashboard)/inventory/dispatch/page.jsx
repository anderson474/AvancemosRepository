"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TruckIcon,
  UserCircleIcon,
  PlusCircleIcon,
  TrashIcon,
  GiftIcon, // Icono para la cantidad extra
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import debounce from "lodash.debounce";

// --- Sub-componente: Búsqueda de Productos (Con mejoras) ---
function ProductSearch({ onAddProduct }) {
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("1"); // Manejar como string para permitir el borrado

  const searchProducts = useCallback(
    debounce(async (term) => {
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      // Hacemos un JOIN con la tabla 'products' para obtener los detalles
      const { data, error } = await supabase
        .from("current_stock")
        .select("*") // ¡Aquí está la magia!
        .ilike("name", `%${term}%`)
        .gt("stock_actual", 0)
        .limit(5);

      if (error) {
        console.error("Error searching products:", error);
      } else if (data) {
        //console.log("Productos encontrados:", data);
        setResults(data);
      }
      setLoading(false);
    }, 300),
    []
  );

  useEffect(() => {
    searchProducts(searchTerm);
  }, [searchTerm, searchProducts]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setResults([]);
    document.getElementById("quantity")?.focus();
  };

  const handleAdd = () => {
    if (selectedProduct && Number(quantity) > 0) {
      if (Number(quantity) > selectedProduct.stock_actual) {
        alert(
          `La cantidad no puede superar el stock disponible (${selectedProduct.stock_actual})`
        );
        return;
      }
      onAddProduct(selectedProduct, parseInt(quantity, 10));
      setSearchTerm("");
      setSelectedProduct(null);
      setQuantity("1");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div className="md:col-span-2 relative">
        <label
          htmlFor="search"
          className="block text-sm font-medium text-gray-700"
        >
          Buscar Producto
        </label>
        <div className="relative mt-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 text-slate-400 transform -translate-y-1/2" />
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 input-style"
            placeholder="Escribe para buscar..."
            autoComplete="off"
          />
        </div>
        {(loading || results.length > 0) && (
          <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {loading && <li className="p-3 text-slate-500">Buscando...</li>}
            {results.map((product) => {
              // const details = [
              //   product.products?.grade,
              //   product.products?.period,
              //   product.products?.session,
              // ]
              //   .filter(Boolean)
              //   .join(" - ");

              return (
                <li
                  key={product.product_id}
                  onClick={() => handleSelectProduct(product)}
                  className="p-3 hover:bg-blue-50 cursor-pointer"
                >
                  <p className="font-semibold">{product.name}</p>

                  <>
                    <p className="text-xs text-slate-500">
                      <strong>Grado: </strong>
                      {product?.grade}
                    </p>
                    <p className="text-xs text-slate-500">
                      <strong>Periodo: </strong>
                      {product?.period}
                    </p>
                    <p className="text-xs text-slate-500">
                      <strong>Sesión: </strong>
                      {product?.session}
                    </p>
                  </>

                  <p className="text-sm text-slate-500 mt-1">
                    Stock: {product.stock_actual}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
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
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mt-1 w-full input-style"
          min="1"
          max={selectedProduct?.stock_actual || undefined}
        />
      </div>
      <div className="md:col-start-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedProduct || Number(quantity) <= 0}
          className="w-full btn-primary bg-blue-500 hover:bg-blue-600"
        >
          Añadir a la lista
        </button>
      </div>
    </div>
  );
}

// --- Componente Principal ---
export default function DispatchPage() {
  const [formData, setFormData] = useState({ client_name: "" });
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
      const newQuantity = Math.min(
        product.stock_actual - (existingItem.extra_quantity || 0),
        existingItem.quantity + quantity
      );
      setDispatchItems(
        dispatchItems.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: newQuantity }
            : item
        )
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
            return { ...item, extra_quantity: item.extra_quantity }; // No hacer el cambio si es inválido
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
      4000
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.client_name || dispatchItems.length === 0) {
      showNotification(
        "Nombre del cliente y al menos un producto son requeridos.",
        "error"
      );
      setIsLoading(false);
      return;
    }

    const payload = {
      client_name: formData.client_name,
      items: dispatchItems.map(
        ({ product_id, name, quantity, extra_quantity }) => ({
          product_id,
          name,
          quantity,
          extra_quantity: Number(extra_quantity) || 0,
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

      showNotification("Remisión generada con éxito.", "success");
      setFormData({ client_name: "" });
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
          className={`p-4 mb-4 text-sm rounded-lg ${
            notification.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
          role="alert"
        >
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
            Paso 2: Revisar y añadir detalles
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
                {dispatchItems.map((item) => {
                  const totalQuantity =
                    item.quantity + (Number(item.extra_quantity) || 0);
                  const remainingStockForExtras =
                    item.stock_actual - item.quantity;

                  return (
                    <li
                      key={item.product_id}
                      className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
                    >
                      <div className="md:col-span-2">
                        <p className="font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Cantidad: {item.quantity} | Stock Disp:{" "}
                          {item.stock_actual} | Total Salida: {totalQuantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label
                            htmlFor={`extra-${item.product_id}`}
                            className="flex items-center text-sm font-medium text-gray-700 mb-1"
                          >
                            <GiftIcon className="h-4 w-4 mr-1 text-green-600" />
                            Extra
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
                            max={remainingStockForExtras}
                            placeholder="0"
                          />
                        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="client_name"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre del Cliente
              </label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                className="mt-1 input-style"
                required
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
