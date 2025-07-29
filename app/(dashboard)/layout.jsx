// src/app/(dashboard)/layout.jsx
import Sidebar from "@/components/sideBar"; // Asegúrate de que la ruta sea correcta

// Este es un Server Component por defecto. No necesita la directiva 'use client'.
// Asumimos que tu `middleware.ts` ya está protegiendo estas rutas,
// por lo que no es necesario añadir lógica de verificación de sesión aquí.
// Si alguien llega a este layout, es porque ya está autenticado.

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Columna 1: El Sidebar */}
      <Sidebar />

      {/* Columna 2: El Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 'children' representa el contenido de la página actual 
            (ej: el page.jsx de /dashboard o /inventory/entry) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
