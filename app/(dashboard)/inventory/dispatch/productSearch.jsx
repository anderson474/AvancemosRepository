// src/app/(dashboard)/inventory/dispatch/ProductSearch.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import debounce from "lodash.debounce";

export default function ProductSearch({ onAddProduct }) {
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("1");

  // Función con debounce para buscar productos en la base de datos
  const searchProducts = useCallback(
    debounce(async (term) => {
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("current_stock") // Buscamos en la vista de stock actual
        .select("*")
        .ilike("name", `%${term}%`) // Búsqueda flexible por nombre
        .gt("stock_actual", 0) // Solo productos con stock > 0
        .limit(5); // Limitamos a 5 resultados para no sobrecargar

      if (error) {
        console.error("Error searching products:", error);
      } else if (data) {
        setResults(data);
      }
      setLoading(false);
    }, 300), // 300ms de espera antes de ejecutar la búsqueda
    []
  );

  useEffect(() => {
    searchProducts(searchTerm);
  }, [searchTerm, searchProducts]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name); // Autocompleta el campo de búsqueda
    setResults([]); // Oculta la lista de resultados
    document.getElementById("quantity")?.focus(); // Pone el foco en el campo de cantidad
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
      // Resetea los campos para la siguiente búsqueda
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
        {/* Lista de resultados que aparece debajo del input */}
        {(loading || results.length > 0) && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <li className="p-3 text-slate-500">Buscando...</li>
            ) : (
              results.map((product) => (
                <li
                  key={product.product_id}
                  onClick={() => handleSelectProduct(product)}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                >
                  <p className="font-semibold text-slate-800">{product.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Stock Disponible:{" "}
                    <span className="font-bold">{product.stock_actual}</span>
                  </p>
                  <p className="text-slate-500">
                    sesión: <span className="font-bold">{product.session}</span>
                  </p>
                </li>
              ))
            )}
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
