"use client";

import { Bookmark, CircleUserRound, FileUp, Pencil, Search, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ModalComprobante } from "@/components/clientes/ModalComprobante";
import { SelectorRoles } from "@/components/colaboradores/SelectorRoles";
import { createClient } from "@/lib/supabase/client";

export type ColaboradorRow = {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  metodoPago: string | null;
  puesto: string | null;
  direccion: string | null;
  fechaInicio: string | null;
  fechaCumpleanos: string | null;
  banco: string | null;
  numeroCuenta: string | null;
  cuit: string | null;
  cbu: string | null;
  roleIds: string[];
  roleNames: string[];
  activo: boolean;
  total: number;
  hasMonthlyAssignments: boolean;
  envio: boolean;
  pago: boolean;
  factura: boolean;
  datosBancarios: boolean;
  hasComprobante: boolean;
  comprobanteUrl: string | null;
  currentMonth: number;
  currentYear: number;
};

type ColaboradoresTableProps = {
  rows: ColaboradorRow[];
  month: number;
  year: number;
};

type DialogForm = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  fechaInicio: string;
  fechaCumpleanos: string;
  puesto: string;
  banco: string;
  numeroCuenta: string;
  cuit: string;
  cbu: string;
  metodoPago: string;
  roleIds: string[];
  roleNames: string[];
};

function formatMoney(value: number) {
  if (!value) {
    return <span className="text-gray-400">$0</span>;
  }

  return `$${value.toLocaleString("es-AR")}.-`;
}

function ReadonlyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="text-[11px] font-bold uppercase text-gray-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-gray-800">{value || "-"}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase text-cubelo-blue">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
      />
    </label>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="bg-[#1E2A6E] px-4 py-3 text-sm font-bold uppercase text-white">{title}</div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function CollaboratorDialog({
  form,
  open,
  editing,
  saving,
  onClose,
  onEdit,
  onCancel,
  onSave,
  onChange,
  onRolesChange
}: {
  form: DialogForm | null;
  open: boolean;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onChange: (key: keyof DialogForm, value: string) => void;
  onRolesChange: (roleIds: string[]) => void;
}) {
  if (!open || !form) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl xl:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">{form.nombre}</h2>
            <p className="mt-1 text-sm italic text-gray-400">Ficha del colaborador</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-cubelo-blue px-4 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                  {saving ? "Guardando" : "Guardar"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-cubelo-blue px-4 text-sm font-bold text-white hover:bg-[#2929a8]"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Column title="Datos del Colaborador">
            {editing ? (
              <>
                <Field label="Nombre" value={form.nombre} onChange={(value) => onChange("nombre", value)} />
                <Field label="Correo" value={form.correo} onChange={(value) => onChange("correo", value)} type="email" />
                <Field label="Teléfono" value={form.telefono} onChange={(value) => onChange("telefono", value)} />
                <Field label="Dirección" value={form.direccion} onChange={(value) => onChange("direccion", value)} />
                <Field label="Fecha de Inicio" value={form.fechaInicio} onChange={(value) => onChange("fechaInicio", value)} type="date" />
              </>
            ) : (
              <>
                <ReadonlyCard label="Nombre" value={form.nombre || "-"} />
                <ReadonlyCard label="Correo" value={form.correo || "-"} />
                <ReadonlyCard label="Teléfono" value={form.telefono || "-"} />
                <ReadonlyCard label="Dirección" value={form.direccion || "-"} />
                <ReadonlyCard label="Fecha de Inicio" value={form.fechaInicio || "-"} />
              </>
            )}
          </Column>

          <Column title="Información Adicional">
            {editing ? (
              <>
                <Field
                  label="Fecha de Cumpleaños"
                  value={form.fechaCumpleanos}
                  onChange={(value) => onChange("fechaCumpleanos", value)}
                  type="date"
                />
                <Field label="Puesto" value={form.puesto} onChange={(value) => onChange("puesto", value)} />
                <SelectorRoles value={form.roleIds} onChange={onRolesChange} label="Roles" />
              </>
            ) : (
              <>
                <ReadonlyCard label="Fecha de Cumpleaños" value={form.fechaCumpleanos || "-"} />
                <ReadonlyCard label="Puesto" value={form.puesto || "-"} />
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-[11px] font-bold uppercase text-gray-400">Roles</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.roleNames.length ? (
                      form.roleNames.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-full bg-[#EEF2FF] px-3 py-1.5 text-sm font-semibold text-cubelo-blue"
                        >
                          {role}
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
                <Field label="Banco" value={form.banco} onChange={(value) => onChange("banco", value)} />
                <Field label="Número de Cuenta" value={form.numeroCuenta} onChange={(value) => onChange("numeroCuenta", value)} />
                <Field label="CUIT" value={form.cuit} onChange={(value) => onChange("cuit", value)} />
                <Field label="CBU" value={form.cbu} onChange={(value) => onChange("cbu", value)} />
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-cubelo-blue">Método de Pago</span>
                  <select
                    value={form.metodoPago || "Transferencia"}
                    onChange={(event) => onChange("metodoPago", event.target.value)}
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
      </div>
    </div>
  );
}

export function ColaboradoresTable({ rows, month, year }: ColaboradoresTableProps) {
  const [tableRows, setTableRows] = useState(rows);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [dialogForm, setDialogForm] = useState<DialogForm | null>(null);
  const [dialogInitial, setDialogInitial] = useState<DialogForm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEditing, setDialogEditing] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setTableRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return tableRows;
    }

    return tableRows.filter((row) => {
      const haystack = [row.nombre, row.puesto, row.correo, row.telefono, row.metodoPago]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [tableRows, search]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function applyOptimisticRowUpdate(colaboradorId: string, patch: Partial<ColaboradorRow>) {
    setTableRows((current) => current.map((row) => (row.id === colaboradorId ? { ...row, ...patch } : row)));
  }

  function openDialog(row: ColaboradorRow) {
    const form: DialogForm = {
      id: row.id,
      nombre: row.nombre,
      correo: row.correo || "",
      telefono: row.telefono || "",
      direccion: row.direccion || "",
      fechaInicio: row.fechaInicio || "",
      fechaCumpleanos: row.fechaCumpleanos || "",
      puesto: row.puesto || "",
      banco: row.banco || "",
      numeroCuenta: row.numeroCuenta || "",
      cuit: row.cuit || "",
      cbu: row.cbu || "",
      metodoPago: row.metodoPago || "Transferencia",
      roleIds: row.roleIds,
      roleNames: row.roleNames
    };

    setDialogForm(form);
    setDialogInitial(form);
    setDialogEditing(false);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setDialogEditing(false);
    setDialogForm(null);
    setDialogInitial(null);
  }

  async function saveDialog() {
    if (!dialogForm) {
      return;
    }

    setDialogSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("colaboradores")
        .update({
          nombre: dialogForm.nombre,
          correo: dialogForm.correo || null,
          telefono: dialogForm.telefono || null,
          direccion: dialogForm.direccion || null,
          fecha_inicio: dialogForm.fechaInicio || null,
          fecha_cumpleanos: dialogForm.fechaCumpleanos || null,
          puesto: dialogForm.puesto || null,
          banco: dialogForm.banco || null,
          numero_cuenta: dialogForm.numeroCuenta || null,
          cuit: dialogForm.cuit || null,
          cbu: dialogForm.cbu || null,
          metodo_pago: dialogForm.metodoPago || null
        })
        .eq("id", dialogForm.id);

      if (error) {
        console.error("No se pudo actualizar el colaborador", error);
        showToast("Error al guardar");
        return;
      }

      const { error: deleteRolesError } = await supabase
        .from("colaborador_roles")
        .delete()
        .eq("colaborador_id", dialogForm.id);

      if (deleteRolesError) {
        console.error("No se pudieron resetear los roles del colaborador", deleteRolesError);
        showToast("Error al guardar");
        return;
      }

      if (dialogForm.roleIds.length) {
        const { error: insertRolesError } = await supabase.from("colaborador_roles").insert(
          dialogForm.roleIds.map((roleId) => ({
            colaborador_id: dialogForm.id,
            rol_id: roleId
          }))
        );

        if (insertRolesError) {
          console.error("No se pudieron guardar los roles del colaborador", insertRolesError);
          showToast("Error al guardar");
          return;
        }
      }

      showToast("Colaborador actualizado");
      closeDialog();
      window.location.reload();
    } finally {
      setDialogSaving(false);
    }
  }

  async function updateCheckboxValue(
    row: ColaboradorRow,
    field: "envio" | "pago" | "factura" | "datosBancarios",
    checked: boolean
  ) {
    const previous = {
      envio: row.envio,
      pago: row.pago,
      factura: row.factura,
      datosBancarios: row.datosBancarios
    };

    applyOptimisticRowUpdate(row.id, { [field]: checked } as Partial<ColaboradorRow>);

    const supabase = createClient();
    const dbField = field === "datosBancarios" ? "datos_bancarios" : field;
    const collaboratorField = field === "datosBancarios" ? "datos_bancarios_mes" : `${field}_mes`;

    const request = row.hasMonthlyAssignments
      ? supabase
          .from("asignaciones")
          .update({ [dbField]: checked })
          .eq("colaborador_id", row.id)
          .eq("mes_operacion", month)
          .eq("anio_operacion", year)
      : supabase.from("colaboradores").update({ [collaboratorField]: checked }).eq("id", row.id);

    const { error } = await request;

    if (error) {
      console.error("No se pudo guardar el checkbox del colaborador", error);
      applyOptimisticRowUpdate(row.id, previous);
      showToast("Error al guardar");
    }
  }

  async function updateMetodoPago(row: ColaboradorRow, metodoPago: string) {
    const previous = row.metodoPago;
    applyOptimisticRowUpdate(row.id, { metodoPago });

    const supabase = createClient();
    const { error } = await supabase.from("colaboradores").update({ metodo_pago: metodoPago }).eq("id", row.id);

    if (error) {
      console.error("No se pudo actualizar el método de pago", error);
      applyOptimisticRowUpdate(row.id, { metodoPago: previous });
      showToast("Error al guardar");
    }
  }

  async function uploadCollaboratorComprobante(colaboradorId: string, file: File) {
    const supabase = createClient();

    await fetch("/api/comprobantes/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucketName: "comprobantes-colaboradores" })
    });

    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "-");
    const path = `colaboradores/${colaboradorId}/${month}-${year}-${timestamp}-${safeName}`;

    const uploadResult = await supabase.storage.from("comprobantes-colaboradores").upload(path, file, {
      upsert: false
    });

    if (uploadResult.error) {
      console.error("No se pudo subir el comprobante del colaborador", uploadResult.error);
      showToast("Error al guardar");
      return;
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("comprobantes-colaboradores").getPublicUrl(path);

    const { error } = await supabase
      .from("asignaciones")
      .update({ comprobante_url: publicUrl })
      .eq("colaborador_id", colaboradorId)
      .eq("mes_operacion", month)
      .eq("anio_operacion", year);

    if (error) {
      console.error("No se pudo guardar el comprobante del colaborador", error);
      showToast("Error al guardar");
      return;
    }

    applyOptimisticRowUpdate(colaboradorId, {
      hasComprobante: true,
      comprobanteUrl: publicUrl
    });
    showToast("Comprobante subido con éxito");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(draft);
              }
            }}
            placeholder="Buscar colaborador"
            className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>
        <button
          type="button"
          onClick={() => setSearch(draft)}
          className="h-10 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          Buscar
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[1550px] w-full border-collapse">
          <thead className="bg-[#1E2A6E] text-white">
            <tr>
              {[
                "COLABORADOR",
                "TOTAL",
                "MAIL",
                "ENVIO",
                "PAGO",
                "MÉTODO DE PAGO",
                "FACTURA",
                "DATOS BANC.",
                "SUBIR COMP.",
                "SERVICIOS"
              ].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openDialog(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-cubelo-blue hover:bg-blue-100"
                        aria-label="Ver datos del colaborador"
                      >
                        <UserCircle className="h-6 w-6" aria-hidden="true" />
                      </button>
                      <span className="text-sm font-bold text-gray-900">{row.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900">{formatMoney(row.total)}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.correo || "-"}</td>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={row.envio}
                      onChange={(event) => void updateCheckboxValue(row, "envio", event.target.checked)}
                      className="h-4 w-4 accent-cubelo-blue"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={row.pago}
                      onChange={(event) => void updateCheckboxValue(row, "pago", event.target.checked)}
                      className="h-4 w-4 accent-cubelo-blue"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={row.metodoPago ?? "Transferencia"}
                      onChange={(event) => void updateMetodoPago(row, event.target.value)}
                      className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                    >
                      <option>Transferencia</option>
                      <option>Efectivo</option>
                      <option>Mercado Pago</option>
                      <option>Cheque</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={row.factura}
                      onChange={(event) => void updateCheckboxValue(row, "factura", event.target.checked)}
                      className="h-4 w-4 accent-cubelo-blue"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={row.datosBancarios}
                      onChange={(event) => void updateCheckboxValue(row, "datosBancarios", event.target.checked)}
                      className="h-4 w-4 accent-cubelo-blue"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <ModalComprobante onSelectFile={(file) => uploadCollaboratorComprobante(row.id, file)} />
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          row.hasComprobante ? "bg-cubelo-blue" : "bg-gray-200"
                        }`}
                        aria-hidden="true"
                      />
                      {row.comprobanteUrl ? (
                        <a
                          href={row.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cubelo-blue"
                          aria-label="Abrir comprobante"
                        >
                          <CircleUserRound className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/colaboradores/${row.id}/servicios`}
                      className="text-sm font-bold text-cubelo-blue hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay colaboradores para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CollaboratorDialog
        form={dialogForm}
        open={dialogOpen}
        editing={dialogEditing}
        saving={dialogSaving}
        onClose={closeDialog}
        onEdit={() => setDialogEditing(true)}
        onCancel={() => {
          setDialogEditing(false);
          setDialogForm(dialogInitial);
        }}
        onSave={saveDialog}
        onChange={(key, value) => {
          setDialogForm((current) => (current ? { ...current, [key]: value } : current));
        }}
        onRolesChange={(roleIds) => {
          setDialogForm((current) => (current ? { ...current, roleIds } : current));
        }}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
