"use client";

import { ArrowLeft, Bookmark, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SelectorRoles } from "@/components/colaboradores/SelectorRoles";
import { formatDate } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/client";

type Collaborator = {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaInicio: string | null;
  fechaCumpleanos: string | null;
  puesto: string | null;
  banco: string | null;
  numeroCuenta: string | null;
  cuit: string | null;
  cbu: string | null;
  metodoPago: string | null;
};

type RoleOption = {
  id: string;
  nombre: string;
};

type FichaColaboradorProps = {
  colaborador: Collaborator;
  roles: RoleOption[];
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

function ReadonlyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="text-[11px] font-bold uppercase text-gray-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-gray-800">{value || "-"}</div>
    </div>
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

export function FichaColaborador({ colaborador, roles }: FichaColaboradorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState(colaborador);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(roles.map((rol) => rol.id));

  useEffect(() => {
    setForm(colaborador);
    setSelectedRoles(roles.map((rol) => rol.id));
  }, [colaborador, roles]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function updateForm(key: keyof Collaborator, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("colaboradores")
        .update({
          nombre: form.nombre,
          correo: form.correo || null,
          telefono: form.telefono || null,
          direccion: form.direccion || null,
          fecha_inicio: form.fechaInicio || null,
          fecha_cumpleanos: form.fechaCumpleanos || null,
          puesto: form.puesto || null,
          banco: form.banco || null,
          numero_cuenta: form.numeroCuenta || null,
          cuit: form.cuit || null,
          cbu: form.cbu || null,
          metodo_pago: form.metodoPago || null
        })
        .eq("id", form.id);

      if (error) {
        console.error("No se pudo actualizar el colaborador", error);
        return;
      }

      const { error: deleteRolesError } = await supabase
        .from("colaborador_roles")
        .delete()
        .eq("colaborador_id", form.id);

      if (deleteRolesError) {
        console.error("No se pudieron resetear los roles del colaborador", deleteRolesError);
        return;
      }

      if (selectedRoles.length) {
        const { error: insertRolesError } = await supabase.from("colaborador_roles").insert(
          selectedRoles.map((rolId) => ({
            colaborador_id: form.id,
            rol_id: rolId
          }))
        );

        if (insertRolesError) {
          console.error("No se pudieron guardar los roles del colaborador", insertRolesError);
          return;
        }
      }

      setEditing(false);
      showToast("Colaborador actualizado");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteColaborador() {
    const supabase = createClient();
    const { error } = await supabase.from("colaboradores").delete().eq("id", form.id);

    if (error) {
      console.error("No se pudo eliminar el colaborador", error);
      return;
    }

    router.push("/colaboradores");
  }

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/colaboradores"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver a colaboradores"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">{form.nombre}</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">Colaborador/ar</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm(colaborador);
                  setSelectedRoles(roles.map((rol) => rol.id));
                }}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-cubelo-blue px-4 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {saving ? "Guardando" : "Guardar"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-red-600 px-4 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar colaborador
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-cubelo-blue px-4 text-sm font-bold text-white hover:bg-[#2929a8]"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Column title="Datos del Colaborador">
          {editing ? (
            <>
              <Field label="Correo" value={form.correo ?? ""} onChange={(value) => updateForm("correo", value)} type="email" />
              <Field label="Teléfono" value={form.telefono ?? ""} onChange={(value) => updateForm("telefono", value)} />
              <Field label="Dirección" value={form.direccion ?? ""} onChange={(value) => updateForm("direccion", value)} />
              <Field label="Fecha de Inicio" value={form.fechaInicio ?? ""} onChange={(value) => updateForm("fechaInicio", value)} type="date" />
            </>
          ) : (
            <>
              <ReadonlyCard label="Correo" value={form.correo || "-"} />
              <ReadonlyCard label="Teléfono" value={form.telefono || "-"} />
              <ReadonlyCard label="Dirección" value={form.direccion || "-"} />
              <ReadonlyCard label="Fecha de Inicio" value={formatDate(form.fechaInicio)} />
            </>
          )}
        </Column>

        <Column title="Información Adicional">
          {editing ? (
            <>
              <Field
                label="Fecha de Cumpleaños"
                value={form.fechaCumpleanos ?? ""}
                onChange={(value) => updateForm("fechaCumpleanos", value)}
                type="date"
              />
              <Field label="Puesto" value={form.puesto ?? ""} onChange={(value) => updateForm("puesto", value)} />
              <SelectorRoles value={selectedRoles} onChange={setSelectedRoles} label="Roles" />
            </>
          ) : (
            <>
              <ReadonlyCard label="Fecha de Cumpleaños" value={formatDate(form.fechaCumpleanos)} />
              <ReadonlyCard label="Puesto" value={form.puesto || "-"} />
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-[11px] font-bold uppercase text-gray-400">Roles</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roles.length ? (
                    roles.map((role) => (
                      <span
                        key={role.id}
                        className="inline-flex items-center rounded-full bg-[#EEF2FF] px-3 py-1.5 text-sm font-semibold text-cubelo-blue"
                      >
                        {role.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">Sin roles</span>
                  )}
                </div>
              </div>
            </>
          )}
        </Column>

        <Column title="Datos de Facturación">
          {editing ? (
            <>
              <Field label="Banco" value={form.banco ?? ""} onChange={(value) => updateForm("banco", value)} />
              <Field label="Número de Cuenta" value={form.numeroCuenta ?? ""} onChange={(value) => updateForm("numeroCuenta", value)} />
              <Field label="CUIT" value={form.cuit ?? ""} onChange={(value) => updateForm("cuit", value)} />
              <Field label="CBU" value={form.cbu ?? ""} onChange={(value) => updateForm("cbu", value)} />
              <label className="block">
                <span className="text-[11px] font-bold uppercase text-cubelo-blue">Método de Pago</span>
                <select
                  value={form.metodoPago ?? "Transferencia"}
                  onChange={(event) => updateForm("metodoPago", event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                >
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>Mercado Pago</option>
                  <option>Cheque</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <ReadonlyCard label="Banco" value={form.banco || "-"} />
              <ReadonlyCard label="Número de Cuenta" value={form.numeroCuenta || "-"} />
              <ReadonlyCard label="CUIT" value={form.cuit || "-"} />
              <ReadonlyCard label="CBU" value={form.cbu || "-"} />
              <ReadonlyCard label="Método de Pago" value={form.metodoPago || "-"} />
            </>
          )}
        </Column>
      </div>

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-black">¿Eliminar colaborador?</h2>
            <p className="mt-2 text-sm text-gray-500">Esta acción no se puede deshacer.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteColaborador}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
