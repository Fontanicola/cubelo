"use client";

import { ArrowLeft, Edit2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ClienteEditModal } from "./ClienteEditModal";

type ClienteFicha = {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  cuit: string | null;
  tipo_comprobante: string | null;
  notas: string | null;
  fecha_inicio: string | null;
  activo: boolean;
};

type FichaClienteProps = {
  cliente: ClienteFicha;
};

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="bg-[#1E2A6E] px-4 py-3 text-sm font-bold uppercase text-white">{title}</div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="block">
      <div className="text-[11px] font-bold uppercase text-cubelo-blue">{label}</div>
      <div className="mt-1 min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
        {value || "-"}
      </div>
    </div>
  );
}

export function FichaCliente({ cliente }: FichaClienteProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/clientes"
            className="mt-1 inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver a clientes"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">{cliente.nombre}</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">Cliente</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cubelo-blue bg-blue-50 px-5 text-sm font-bold text-cubelo-blue hover:bg-blue-100"
        >
          <Edit2 className="h-4 w-4" aria-hidden="true" />
          Editar cliente
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Column title="Datos del Cliente">
          <ReadonlyField label="Empresa" value={cliente.nombre} />
          <ReadonlyField label="Nombre comercial" value={cliente.nombre_comercial} />
          <ReadonlyField label="Correo" value={cliente.email} />
          <ReadonlyField label="Teléfono" value={cliente.telefono} />
          <ReadonlyField label="Dirección" value={cliente.direccion} />
        </Column>

        <Column title="Información Adicional">
          <ReadonlyField label="Fecha de inicio" value={cliente.fecha_inicio} />
          <ReadonlyField label="Tipo comprobante" value={cliente.tipo_comprobante} />
          <ReadonlyField label="CUIT" value={cliente.cuit} />
          <ReadonlyField label="Notas" value={cliente.notas} />
        </Column>

        <Column title="Datos Administrativos">
          <ReadonlyField label="Estado" value={cliente.activo ? "Activo" : "Inactivo"} />
          <ReadonlyField label="ID cliente" value={cliente.id} />
          <p className="text-sm text-gray-500">
            Esta vista muestra los datos maestros del cliente. La gestión de presupuestos y acuerdos está en la vista de servicios.
          </p>
        </Column>
      </div>

      {editing ? <ClienteEditModal cliente={cliente} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} /> : null}
    </section>
  );
}
