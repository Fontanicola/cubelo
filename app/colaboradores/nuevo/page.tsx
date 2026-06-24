"use client";

import { Bookmark, ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { SelectorRoles } from "@/components/colaboradores/SelectorRoles";
import { createClient } from "@/lib/supabase/client";

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase text-cubelo-blue">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
      />
    </label>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="bg-[#1E2A6E] px-4 py-3 text-sm font-bold uppercase text-white">{title}</div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export default function NuevoColaboradorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaCumpleanos, setFechaCumpleanos] = useState("");
  const [puesto, setPuesto] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [banco, setBanco] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [cuit, setCuit] = useState("");
  const [cbu, setCbu] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("colaboradores")
        .insert({
          nombre,
          correo: correo || null,
          telefono: telefono || null,
          direccion: direccion || null,
          fecha_inicio: fechaInicio || null,
          fecha_cumpleanos: fechaCumpleanos || null,
          puesto: puesto || null,
          banco: banco || null,
          numero_cuenta: numeroCuenta || null,
          cuit: cuit || null,
          cbu: cbu || null,
          metodo_pago: metodoPago,
          activo: true
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        console.error("No se pudo crear el colaborador", error);
        setErrorMessage("No se pudo crear el colaborador.");
        return;
      }

      if (selectedRoles.length) {
        const { error: rolesError } = await supabase.from("colaborador_roles").insert(
          selectedRoles.map((rolId) => ({ colaborador_id: data.id, rol_id: rolId }))
        );

        if (rolesError) {
          console.error("No se pudieron guardar los roles del colaborador", rolesError);
          setErrorMessage("El colaborador se creó, pero no se pudieron guardar sus roles.");
          return;
        }
      }

      router.push(`/colaboradores/${data.id}`);
    } catch (error) {
      console.error("No se pudo crear el colaborador", error);
      setErrorMessage("No se pudo crear el colaborador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/colaboradores"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">Crear Colaborador</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">
              Alta de datos personales, roles y facturación.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/colaboradores"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            {saving ? "Guardando" : "Finalizar"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Column title="Datos del Colaborador">
          <Field label="Nombre del Colaborador" value={nombre} onChange={setNombre} required />
          <Field label="Correo" value={correo} onChange={setCorreo} type="email" />
          <Field label="Teléfono" value={telefono} onChange={setTelefono} />
          <Field label="Dirección 1" value={direccion} onChange={setDireccion} />
          <Field label="Fecha de Inicio" value={fechaInicio} onChange={setFechaInicio} type="date" />
        </Column>

        <Column title="Información Adicional">
          <Field label="Fecha de Cumpleaños" value={fechaCumpleanos} onChange={setFechaCumpleanos} type="date" />
          <Field label="Puesto" value={puesto} onChange={setPuesto} />
          <SelectorRoles value={selectedRoles} onChange={setSelectedRoles} label="Roles" />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar puesto
          </button>
        </Column>

        <Column title="Datos de Facturación">
          <Field label="Banco" value={banco} onChange={setBanco} />
          <Field label="Número de Cuenta" value={numeroCuenta} onChange={setNumeroCuenta} />
          <Field label="CUIT" value={cuit} onChange={setCuit} />
          <Field label="CBU" value={cbu} onChange={setCbu} />
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Método de Pago</span>
            <select
              value={metodoPago}
              onChange={(event) => setMetodoPago(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            >
              <option>Transferencia</option>
              <option>Efectivo</option>
              <option>Mercado Pago</option>
              <option>Cheque</option>
            </select>
          </label>
        </Column>
      </div>
    </form>
  );
}
