"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  ChartBarIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ChevronDownIcon, // 1. Importamos el icono para el desplegable
} from "@heroicons/react/24/outline";
import Image from "next/image";

// 2. Modificamos la estructura de los links para anidar las sub-opciones
const navLinks = [
  { name: "Dashboard", href: "/dashboard", icon: ChartBarIcon },
  {
    name: "Inventario",
    icon: ArchiveBoxIcon,
    // Eliminamos el href y añadimos sub-links
    subLinks: [
      {
        name: "Registrar Entrada",
        href: "/inventory/entry",
        icon: ArrowDownTrayIcon,
      },
      {
        name: "Crear Salida",
        href: "/inventory/dispatch",
        icon: ArrowUpTrayIcon,
      },
    ],
  },
  { name: "Informes", href: "/reports", icon: DocumentTextIcon },
  { name: "Remisiones", href: "/dispatches", icon: ClipboardDocumentListIcon },
];

export default function Sidebar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  // 3. Estado para controlar si el desplegable de inventario está abierto
  // Lo inicializamos como abierto si la URL actual es una de sus sub-rutas
  const [isInventoryOpen, setIsInventoryOpen] = useState(
    pathname.startsWith("/inventory")
  );

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = () => {
    const form = document.getElementById("logout-form") as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  if (loading) {
    // El esqueleto de carga no necesita cambios
    return (
      <aside className="bg-white text-gray-800 w-64 flex-col h-screen hidden md:flex shadow-lg animate-pulse">
        <div className="p-4 border-b h-16 bg-gray-200 rounded"></div>
        <div className="flex-1 pt-4 px-2 space-y-2">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
        </div>
        <div className="p-4 border-t h-20 bg-gray-200 rounded"></div>
      </aside>
    );
  }

  return (
    <aside className="bg-white text-gray-800 w-64 flex-col h-screen hidden md:flex shadow-lg">
      <div className="p-4 flex items-center justify-center border-b">
        <Image src="/logo.jpg" alt="Logo" width={120} height={40} />
      </div>

      <nav className="flex-1 overflow-y-auto pt-4">
        {user && (
          <ul className="px-2">
            {/* 4. Lógica de renderizado modificada */}
            {navLinks.map((link) => {
              // Si el link tiene sub-links, es un desplegable
              if (link.subLinks) {
                const isParentActive = pathname.startsWith("/inventory");
                return (
                  <li key={link.name}>
                    <button
                      onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                      className={`flex items-center w-full px-3 py-3 my-1 rounded-lg transition-colors ${
                        isParentActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <link.icon className="h-6 w-6 mr-3" />
                      <span className="flex-1 text-left">{link.name}</span>
                      <ChevronDownIcon
                        className={`h-5 w-5 transition-transform ${
                          isInventoryOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {/* Contenedor del submenú con animación */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isInventoryOpen ? "max-h-40" : "max-h-0"
                      }`}
                    >
                      <ul className="pl-6 mt-1">
                        {link.subLinks.map((subLink) => {
                          const isSubActive = pathname === subLink.href;
                          return (
                            <li key={subLink.name}>
                              <Link
                                href={subLink.href}
                                className={`flex items-center px-3 py-3 my-1 rounded-lg transition-colors text-sm ${
                                  isSubActive
                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                    : "text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                <subLink.icon className="h-5 w-5 mr-3" />
                                <span>{subLink.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              }

              // Si no, es un link normal
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`flex items-center px-3 py-3 my-1 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <link.icon className="h-6 w-6 mr-3" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* La sección del usuario no necesita cambios */}
      <div className="p-4 border-t">
        {user && (
          <div className="flex items-center">
            <UserCircleIcon className="h-10 w-10 text-gray-400 mr-3" />
            <div className="flex-1">
              <p className="font-semibold text-sm truncate">{user.email}</p>
              <p className="text-xs text-gray-500">
                {user.user_metadata?.rol || "Usuario"}
              </p>
            </div>
            <form
              action="/auth/sign-out"
              method="post"
              id="logout-form"
              className="hidden"
            />
            <button
              onClick={handleSignOut}
              title="Cerrar Sesión"
              className="p-2 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
