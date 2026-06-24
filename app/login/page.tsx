"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos."
        : authError.message);
      return;
    }

    router.push("/");
  }

  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.cubelo.svg" alt="Cubelo" className="mx-auto h-12 w-auto" />
        </div>

        <div className="rounded-xl bg-white p-8 shadow-[0_5px_24px_rgba(0,0,0,0.12)] ring-1 ring-gray-100">
          <h1 className="mb-6 text-center text-2xl font-bold text-black">Iniciar sesión</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-gray-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-cubelo-blue"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase text-gray-500">Contraseña</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm outline-none transition focus:border-cubelo-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-cubelo-blue text-sm font-bold text-white transition hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
