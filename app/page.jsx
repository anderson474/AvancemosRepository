// components/AuthForm.jsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Lo siento, ocurrió un error inesperado."
      );
    } finally {
      router.push("/dashboard");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="bg-fixed bg-center bg-cover min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url('/FotoCoorporativa.jpeg')" }}
    >
      <div className="absolute top-0 right-0 min-h-screen bg-white p-8 rounded-2xl shadow-2xl w-96">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.jpg"
            width={150}
            height={50}
            alt="Logo de la empresa"
            style={{ objectFit: "contain" }}
          />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Iniciar Sesión
        </h2>

        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <input
            className="border p-3 rounded-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            type="email"
            name="email"
            placeholder="ejemplo@avancemos.edu.co"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <input
            className="border p-3 rounded-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            type="password"
            name="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          {error && (
            <div className="bg-red-100 text-red-700 border border-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`relative top-52 w-64 py-3 mx-auto rounded-md text-white font-semibold transition ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-verde hover:bg-white hover:text-verde border border-verde hover:shadow-3xl"
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
