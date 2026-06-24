"use client";

import { ArrowLeft, Bookmark, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Contacto = {
  nombre: string;
  telefono: string;
  email: string;
};

const emptyContacto: Contacto = {
  nombre: "",
  telefono: "",
  email: ""
};

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

export default function NuevoClientePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cuit, setCuit] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("Factura A");
  const [fechaInicio, setFechaInicio] = useState("");
  const [notas, setNotas] = useState("");
  const [contactos, setContactos] = useState<Contacto[]>([{ ...emptyContacto }, { ...emptyContacto }]);
  const [errorMessage, setErrorMessage] = useState("");

  function updateContacto(index: number, key: keyof Contacto, value: string) {
    setContactos((current) =>
      current.map((contacto, contactoIndex) =>
        contactoIndex === index ? { ...contacto, [key]: value } : contacto
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nombre,
          nombre_comercial: nombreComercial || null,
          email: email || null,
          telefono: telefono || null,
          direccion: direccion || null,
          cuit: cuit || null,
          tipo_comprobante: tipoComprobante,
          notas: notas || null,
          fecha_inicio: fechaInicio || null,
          activo: true
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        console.error("No se pudo crear el cliente", error);
        setErrorMessage("No se pudo crear el cliente.");
        return;
      }

      router.push(`/clientes/${data.id}`);
    } catch (error) {
      console.error("No se pudo crear el cliente", error);
      setErrorMessage("No se pudo crear el cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/clientes"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">Crear Cliente</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">
              Alta de datos comerciales y facturación.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/clientes"
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
        <Column title="Datos del Cliente">
          <Field label="Empresa" value={nombre} onChange={setNombre} required />
          <Field label="Nombre Comercial" value={nombreComercial} onChange={setNombreComercial} />
          <Field label="Correo" value={email} onChange={setEmail} type="email" />
          <Field label="Teléfono" value={telefono} onChange={setTelefono} />
          <Field label="Dirección" value={direccion} onChange={setDireccion} />
        </Column>

        <Column title="Información Adicional">
          <Field label="Fecha de Inicio" value={fechaInicio} onChange={setFechaInicio} type="date" />
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Tipo Comprobante</span>
            <select
              value={tipoComprobante}
              onChange={(event) => setTipoComprobante(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            >
              <option>Factura A</option>
              <option>Factura B</option>
              <option>Factura C</option>
              <option>Recibo</option>
            </select>
          </label>
          <Field label="CUIT" value={cuit} onChange={setCuit} />
          <Field label="Notas" value={notas} onChange={setNotas} />
          {contactos.map((contacto, index) => (
            <div key={index} className="rounded-md border border-gray-200 p-3">
              <div className="mb-3 text-xs font-bold uppercase text-cubelo-blue">Contacto {index + 1}</div>
              <div className="space-y-3">
                <Field
                  label="Nombre"
                  value={contacto.nombre}
                  onChange={(value) => updateContacto(index, "nombre", value)}
                />
                <Field
                  label="Teléfono"
                  value={contacto.telefono}
                  onChange={(value) => updateContacto(index, "telefono", value)}
                />
                <Field
                  label="Correo"
                  value={contacto.email}
                  onChange={(value) => updateContacto(index, "email", value)}
                  type="email"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setContactos((current) => [...current, { ...emptyContacto }])}
            disabled={contactos.length >= 3}
            className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo Contacto
          </button>
        </Column>

        <Column title="Datos Administrativos">
          <p className="text-sm text-gray-500">
            Este cliente se crea con estado activo y queda listo para presupuestos.
          </p>
        </Column>
      </div>
    </form>
  );
}
