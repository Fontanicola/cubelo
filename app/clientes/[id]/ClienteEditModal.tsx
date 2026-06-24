"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ClienteEditable = {
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
};

type ClienteEditModalProps = {
  cliente: ClienteEditable;
  onClose: () => void;
  onSaved: () => void;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
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

export function ClienteEditModal({ cliente, onClose, onSaved }: ClienteEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [nombre, setNombre] = useState(cliente.nombre);
  const [nombreComercial, setNombreComercial] = useState(cliente.nombre_comercial ?? "");
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [direccion, setDireccion] = useState(cliente.direccion ?? "");
  const [cuit, setCuit] = useState(cliente.cuit ?? "");
  const [tipoComprobante, setTipoComprobante] = useState(cliente.tipo_comprobante ?? "Factura A");
  const [fechaInicio, setFechaInicio] = useState(cliente.fecha_inicio ?? "");
  const [notas, setNotas] = useState(cliente.notas ?? "");

  async function handleSave() {
    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("clientes")
        .update({
          nombre,
          nombre_comercial: nombreComercial || null,
          email: email || null,
          telefono: telefono || null,
          direccion: direccion || null,
          cuit: cuit || null,
          tipo_comprobante: tipoComprobante,
          notas: notas || null,
          fecha_inicio: fechaInicio || null
        })
        .eq("id", cliente.id);

      if (error) {
        console.error("No se pudo actualizar el cliente", error);
        setErrorMessage("No se pudo actualizar el cliente.");
        return;
      }

      onSaved();
      window.location.reload();
    } catch (error) {
      console.error("No se pudo actualizar el cliente", error);
      setErrorMessage("No se pudo actualizar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">Editar cliente</h2>
            <p className="mt-1 text-sm italic text-gray-400">Actualizá los datos maestros del cliente.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Empresa" value={nombre} onChange={setNombre} required />
          <Field label="Nombre comercial" value={nombreComercial} onChange={setNombreComercial} />
          <Field label="Correo" value={email} onChange={setEmail} type="email" />
          <Field label="Teléfono" value={telefono} onChange={setTelefono} />
          <Field label="Dirección" value={direccion} onChange={setDireccion} />
          <Field label="CUIT" value={cuit} onChange={setCuit} />
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Tipo comprobante</span>
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
          <Field label="Fecha de inicio" value={fechaInicio} onChange={setFechaInicio} type="date" />
          <label className="block lg:col-span-3">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Notas</span>
            <textarea
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8] disabled:bg-gray-300"
          >
            {saving ? "Guardando" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
