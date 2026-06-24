import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ClientesTable, type ClienteRow } from "@/app/clientes/ClientesTable";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const dynamic = "force-dynamic";

type ClienteRecord = Record<string, unknown> & {
  id: string | number;
  nombre?: string | null;
  nombre_comercial?: string | null;
  email?: string | null;
  telefono?: string | null;
  fecha_inicio?: string | null;
  activo?: boolean | null;
};

async function getClientesData() {
  const supabase = createClient();
  const { data, error } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });

  if (error) {
    console.error("No se pudieron cargar los clientes", error);
  }

  const clientes = ((data ?? []) as ClienteRecord[]).map((cliente) => ({
    id: String(cliente.id),
    nombre: String(cliente.nombre ?? "Sin nombre"),
    nombreComercial: cliente.nombre_comercial ? String(cliente.nombre_comercial) : null,
    email: cliente.email ? String(cliente.email) : null,
    telefono: cliente.telefono ? String(cliente.telefono) : null,
    fechaInicio: cliente.fecha_inicio ? String(cliente.fecha_inicio) : null,
    activo: Boolean(cliente.activo ?? true)
  }))
    .sort((a, b) => {
      if (a.activo !== b.activo) {
        return Number(b.activo) - Number(a.activo);
      }

      return a.nombre.localeCompare(b.nombre, "es");
    });

  return { clientes };
}

export default async function ClientesPage() {
  const { clientes } = await getClientesData();

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex items-start gap-3">
        <Link
          href="/"
          className="mt-1 inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Mis Clientes</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">
            Administrá contactos, servicios y facturación.
          </p>
        </div>
      </div>

      <ClientesTable clientes={clientes} />
    </section>
  );
}
