"use client";

import { Bookmark, ChevronDown, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";

import { ModalNuevoItem } from "@/components/presupuestos/ModalNuevoItem";
import {
  formatDate,
  formatMoney,
  getNetTotal,
  getPresupuestoTotal,
  groupItemsByServicio,
  type BudgetRecord,
  type ClientePresupuesto,
  type PresupuestoItem
} from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/client";

type EditorPresupuestoProps = {
  presupuesto: BudgetRecord;
  cliente: ClientePresupuesto;
  initialItems: PresupuestoItem[];
};

type EditingItem = {
  id: string;
  productoNombre: string;
  precioUnitario: string;
} | null;

function ItemEditDialog({
  editingItem,
  onClose,
  onSave
}: {
  editingItem: EditingItem;
  onClose: () => void;
  onSave: (next: { id: string; productoNombre: string; precioUnitario: number }) => void;
}) {
  const [descripcion, setDescripcion] = useState(editingItem?.productoNombre ?? "");
  const [importe, setImporte] = useState(editingItem?.precioUnitario ?? "0");

  if (!editingItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Editar item</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-gray-500">Descripción</span>
            <input
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-gray-500">Importe</span>
            <input
              type="number"
              value={importe}
              onChange={(event) => setImporte(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave({ id: editingItem.id, productoNombre: descripcion, precioUnitario: Number(importe || 0) })}
            className="rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditorPresupuesto({ presupuesto, cliente, initialItems }: EditorPresupuestoProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem>(null);
  const groups = useMemo(() => groupItemsByServicio(items), [items]);
  const totalBruto = useMemo(() => getPresupuestoTotal(items), [items]);
  const totalNeto = useMemo(
    () => getNetTotal(totalBruto, Number(presupuesto.descuento_porcentaje ?? 0)),
    [presupuesto.descuento_porcentaje, totalBruto]
  );
  const date = formatDate(String(presupuesto.fecha ?? presupuesto.created_at ?? null));

  async function deleteCategory(key: string) {
    const categoryItems = groups.find((group) => group.key === key)?.items ?? [];
    setItems((current) => current.filter((item) => !categoryItems.some((target) => target.id === item.id)));

    const supabase = createClient();
    const { error } = await supabase
      .from("presupuesto_items")
      .delete()
      .in(
        "id",
        categoryItems.map((item) => item.id)
      );

    if (error) {
      console.error("No se pudo eliminar la categoria", error);
    }
  }

  async function saveItem(next: { id: string; productoNombre: string; precioUnitario: number }) {
    setItems((current) =>
      current.map((item) =>
        item.id === next.id ? { ...item, productoNombre: next.productoNombre, precioUnitario: next.precioUnitario, subtotal: next.precioUnitario } : item
      )
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("presupuesto_items")
      .update({
        nombre: next.productoNombre,
        precio_unitario: next.precioUnitario,
        subtotal: next.precioUnitario
      })
      .eq("id", next.id);

    if (error) {
      console.error("No se pudo editar el item", error);
    }

    setEditingItem(null);
  }

  async function finishBudget() {
    const supabase = createClient();
    const { error } = await supabase
      .from("presupuestos")
      .update({ estado: "esperando_aprobacion", total_bruto: totalBruto, total_neto: totalNeto })
      .eq("id", String(presupuesto.id));

    if (error) {
      console.error("No se pudo finalizar el presupuesto", error);
    }

    router.push(`/presupuestos/${presupuesto.id}`);
  }

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Editar Presupuesto</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">{cliente.nombre}</p>
        </div>
      </div>

      <article className="mx-auto w-full max-w-[500px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200 print:shadow-none">
        <header className="flex items-center justify-between gap-4 bg-cubelo-blue px-5 py-4 text-white">
          <div className="text-lg font-bold">Cubelo. ■³</div>
          <div className="text-right text-xs font-semibold leading-relaxed">
            Presupuesto {date}
            <br />
            Cliente: {cliente.nombre}
          </div>
        </header>

        <section className="border-t border-gray-200">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex w-full items-center justify-between bg-[#1E2A6E] px-4 py-3 text-left text-sm font-bold uppercase text-white"
          >
            PRESUPUESTO
            <ChevronDown className={`h-5 w-5 transition ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
          </button>

          {open ? (
            <div className="p-5">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left text-[11px] font-bold uppercase text-gray-500">Servicios</th>
                    <th className="pb-3 text-right text-[11px] font-bold uppercase text-gray-500">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="bg-[#EEF2FF]">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => deleteCategory(group.key)}
                              className="text-red-600 hover:text-red-700"
                              aria-label="Eliminar categoría"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <span className="text-xs font-bold uppercase text-cubelo-blue">{group.servicioNombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-cubelo-blue">
                          {formatMoney(group.total)}
                        </td>
                      </tr>

                      {group.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 bg-white">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-800">
                              <FileText className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
                              <span className="flex-1">{item.productoNombre}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingItem({
                                    id: item.id,
                                    productoNombre: item.productoNombre,
                                    precioUnitario: String(item.precioUnitario)
                                  })
                                }
                                className="text-xs font-bold text-cubelo-blue hover:underline"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatMoney(item.subtotal || item.precioUnitario)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingItem({
                                    id: item.id,
                                    productoNombre: item.productoNombre,
                                    precioUnitario: String(item.precioUnitario)
                                  })
                                }
                                className="text-cubelo-blue hover:text-[#2929a8]"
                                aria-label="Editar item"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}

                  <tr>
                    <td colSpan={2} className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-3 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-cubelo-blue text-white">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        Agregar Servicio
                      </button>
                    </td>
                  </tr>

                  <tr className="bg-gray-100">
                    <td className="px-3 py-4 text-base font-bold text-gray-900">TOTAL:</td>
                    <td className="px-3 py-4 text-right text-base font-bold text-gray-900">
                      {formatMoney(totalNeto)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </article>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-5 py-2.5 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar Servicio
        </button>
        <Link
          href={`/presupuestos/${presupuesto.id}`}
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={finishBudget}
          className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          Finalizar
        </button>
      </div>

      <ModalNuevoItem
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        presupuestoId={String(presupuesto.id)}
        onCreated={(item) => setItems((current) => [...current, item])}
      />

      <ItemEditDialog
        editingItem={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={saveItem}
      />
    </section>
  );
}
