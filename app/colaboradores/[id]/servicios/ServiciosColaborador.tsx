"use client";

import { ArrowLeft, MessageCircle, Megaphone, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SelectorMes } from "@/app/colaboradores/[id]/servicios/SelectorMes";
import { ModalComprobante } from "@/components/clientes/ModalComprobante";
import { ModalVerComprobantes } from "@/components/clientes/ModalVerComprobantes";
import { createClient } from "@/lib/supabase/client";

type RoleOption = {
  id: string;
  nombre: string;
};

type CategoryOption = {
  id: string;
  nombre: string;
  servicioId: string;
};

export type AssignmentServiceRow = {
  id: string;
  acuerdoId: string;
  clienteNombre: string;
  rolId: string;
  rolNombre: string;
  servicioId: string;
  servicioNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  productoNombre: string;
  precioVenta: number;
  fee: number;
  notas: string | null;
  comprobanteUrl: string | null;
};

type ServiciosColaboradorProps = {
  colaborador: {
    id: string;
    nombre: string;
  };
  month: number;
  year: number;
  rows: AssignmentServiceRow[];
  roles: RoleOption[];
  categories: CategoryOption[];
};

type CommentDialogState = {
  assignmentId: string;
  notes: string;
} | null;

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR")}.-`;
}

export function ServiciosColaborador({
  colaborador,
  month,
  year,
  rows,
  roles,
  categories
}: ServiciosColaboradorProps) {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [feeDraft, setFeeDraft] = useState("");
  const [commentDialog, setCommentDialog] = useState<CommentDialogState>(null);
  const [viewingComprobantes, setViewingComprobantes] = useState(false);
  const [visualCategories, setVisualCategories] = useState<Record<string, string>>({});
  const supabase = createClient();

  const groupedRows = useMemo(() => {
    return rows.reduce<Record<string, AssignmentServiceRow[]>>((acc, row) => {
      acc[row.servicioNombre] = [...(acc[row.servicioNombre] ?? []), row];
      return acc;
    }, {});
  }, [rows]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.monto += row.fee;
        acc.utilidad += row.precioVenta - row.fee;
        acc.total += row.precioVenta;
        return acc;
      },
      { monto: 0, utilidad: 0, total: 0 }
    );
  }, [rows]);

  const comprobantes = useMemo(
    () =>
      rows
        .filter((row) => row.comprobanteUrl)
        .map((row) => ({
          id: row.id,
          acuerdoId: row.acuerdoId,
          fecha: `${year}-${String(month).padStart(2, "0")}-01`,
          comprobanteUrl: row.comprobanteUrl || ""
        })),
    [month, rows, year]
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function uploadComprobante(file: File) {
    await fetch("/api/comprobantes/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucketName: "comprobantes-colaboradores" })
    });

    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "-");
    const path = `colaboradores/${colaborador.id}/${month}-${year}-${timestamp}-${safeName}`;

    const uploadResult = await supabase.storage.from("comprobantes-colaboradores").upload(path, file, {
      upsert: false
    });

    if (uploadResult.error) {
      console.error("No se pudo subir el comprobante del colaborador", uploadResult.error);
      return;
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("comprobantes-colaboradores").getPublicUrl(path);

    const { error } = await supabase
      .from("asignaciones")
      .update({ comprobante_url: publicUrl })
      .eq("colaborador_id", colaborador.id)
      .eq("mes_operacion", month)
      .eq("anio_operacion", year);

    if (error) {
      console.error("No se pudo guardar el comprobante del colaborador", error);
      return;
    }

    showToast("Comprobante subido con éxito");
    router.refresh();
  }

  async function deleteAssignment(assignmentId: string) {
    const { error } = await supabase.from("asignaciones").delete().eq("id", assignmentId);

    if (error) {
      console.error("No se pudo eliminar la asignación", error);
      return;
    }

    router.refresh();
  }

  async function updateRole(assignmentId: string, roleId: string) {
    const { error } = await supabase.from("asignaciones").update({ rol_id: roleId }).eq("id", assignmentId);

    if (error) {
      console.error("No se pudo actualizar el rol de la asignación", error);
      return;
    }

    router.refresh();
  }

  async function saveComment() {
    if (!commentDialog) {
      return;
    }

    const { error } = await supabase
      .from("asignaciones")
      .update({ notas: commentDialog.notes || null })
      .eq("id", commentDialog.assignmentId);

    if (error) {
      console.error("No se pudo actualizar la nota de la asignación", error);
      return;
    }

    setCommentDialog(null);
    router.refresh();
  }

  async function saveFee(assignmentId: string) {
    const { error } = await supabase.from("asignaciones").update({ fee: Number(feeDraft || 0) }).eq("id", assignmentId);

    if (error) {
      console.error("No se pudo actualizar el fee de la asignación", error);
      return;
    }

    setEditingFeeId(null);
    setFeeDraft("");
    router.refresh();
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
            <h1 className="text-3xl font-bold text-black">{colaborador.nombre}</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">Colaborador/ar</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-right">
          <div>
            <div className="text-[11px] font-bold uppercase text-gray-400">Monto</div>
            <div className="text-xl font-bold text-cubelo-blue">{formatMoney(totals.monto)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-gray-400">Utilidad</div>
            <div className="text-xl font-bold text-cubelo-blue">{formatMoney(totals.utilidad)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-gray-400">Total</div>
            <div className="text-xl font-bold text-cubelo-blue">{formatMoney(totals.total)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <SelectorMes month={month} year={year} />
          <ModalComprobante onSelectFile={uploadComprobante} />
          <button
            type="button"
            onClick={() => setViewingComprobantes(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Ver comprobantes
          </button>
          <button
            type="button"
            onClick={() => showToast("Próximamente")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Enviar detalle
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedRows).length ? (
          Object.entries(groupedRows).map(([serviceName, serviceRows]) => {
            const serviceTotals = serviceRows.reduce(
              (acc, row) => {
                acc.monto += row.fee;
                acc.utilidad += row.precioVenta - row.fee;
                acc.total += row.precioVenta;
                return acc;
              },
              { monto: 0, utilidad: 0, total: 0 }
            );

            return (
              <section key={serviceName} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="bg-[#1E2A6E] px-4 py-3 text-sm font-bold uppercase text-white">{serviceName}</div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] w-full border-collapse">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        {["", "CLIENTE", "ROL", "CATEGORÍA", "COM.", "MONTO", "UTILIDAD", "TOTAL", ""].map((header) => (
                          <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {serviceRows.map((row) => {
                        const utilidad = row.precioVenta - row.fee;
                        const total = row.precioVenta;
                        const serviceCategories = categories.filter((category) => category.servicioId === row.servicioId);
                        const currentCategoryId = visualCategories[row.id] ?? row.categoriaId;

                        return (
                          <tr key={row.id} className="border-t border-gray-200 bg-white hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => void deleteAssignment(row.id)}
                                className="text-red-600 hover:text-red-700"
                                aria-label="Eliminar asignación"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-sm font-bold text-cubelo-blue">
                                <Megaphone className="h-4 w-4" aria-hidden="true" />
                                {row.clienteNombre}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={row.rolId}
                                onChange={(event) => void updateRole(row.id, event.target.value)}
                                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                              >
                                {roles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.nombre}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={currentCategoryId}
                                onChange={(event) =>
                                  setVisualCategories((current) => ({ ...current, [row.id]: event.target.value }))
                                }
                                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                              >
                                {serviceCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.nombre}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setCommentDialog({ assignmentId: row.id, notes: row.notas || "" })}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${
                                  row.notas
                                    ? "border-cubelo-blue bg-blue-50 text-cubelo-blue"
                                    : "border-gray-300 text-gray-600"
                                }`}
                              >
                                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              {editingFeeId === row.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={feeDraft}
                                    onChange={(event) => setFeeDraft(event.target.value)}
                                    className="h-10 w-28 rounded-md border border-gray-300 px-3 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void saveFee(row.id)}
                                    className="text-sm font-bold text-cubelo-blue"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold text-gray-900">{formatMoney(row.fee)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatMoney(utilidad)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatMoney(total)}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFeeId(row.id);
                                  setFeeDraft(String(row.fee));
                                }}
                                className="text-cubelo-blue hover:text-[#2929a8]"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#EEF2FF]">
                        <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-cubelo-blue">
                          Totales
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-cubelo-blue">{formatMoney(serviceTotals.monto)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-cubelo-blue">{formatMoney(serviceTotals.utilidad)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-cubelo-blue">{formatMoney(serviceTotals.total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-gray-200 p-4">
                  <ModalComprobante onSelectFile={uploadComprobante} />
                  <button
                    type="button"
                    onClick={() => setViewingComprobantes(true)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Ver comprobantes
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast("Próximamente")}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Enviar detalle
                  </button>
                </div>
              </section>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500 shadow-sm">
            Sin servicios activos para el período seleccionado.
          </div>
        )}
      </div>

      <ModalVerComprobantes open={viewingComprobantes} onClose={() => setViewingComprobantes(false)} comprobantes={comprobantes} />

      {commentDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setCommentDialog(null)}>
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-l-4 border-cubelo-blue pl-4">
              <h2 className="text-2xl font-bold text-black">Comentario</h2>
              <p className="mt-1 text-sm italic text-gray-400">Editá la nota de la asignación.</p>
            </div>
            <textarea
              value={commentDialog.notes}
              onChange={(event) => setCommentDialog({ ...commentDialog, notes: event.target.value })}
              className="mt-4 min-h-[140px] w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cubelo-blue"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCommentDialog(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveComment()}
                className="rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
              >
                Guardar
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
