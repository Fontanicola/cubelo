"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { ModalCompartir } from "@/components/presupuestos/ModalCompartir";
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

type VistaPresupuestoProps = {
  presupuesto: BudgetRecord;
  cliente: ClientePresupuesto;
  items: PresupuestoItem[];
};

export function VistaPresupuesto({ presupuesto, cliente, items }: VistaPresupuestoProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const groups = useMemo(() => groupItemsByServicio(items), [items]);
  const totalBruto = Number(presupuesto.total_bruto ?? getPresupuestoTotal(items));
  const descuento = Number(presupuesto.descuento_porcentaje ?? 0);
  const totalNeto = Number(presupuesto.total_neto ?? getNetTotal(totalBruto, descuento));
  const date = formatDate(String(presupuesto.fecha ?? presupuesto.created_at ?? null));

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Presupuesto</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">{cliente.nombre}</p>
        </div>

        <span className="inline-flex self-start rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600">
          01 de 02 pag.
        </span>
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

        <div className="p-5">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="pb-3 text-left text-[11px] font-bold uppercase text-gray-500">Servicios</th>
                <th className="pb-3 text-right text-[11px] font-bold uppercase text-gray-500">Valor</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <tr className="bg-[#EEF2FF]">
                    <td className="px-3 py-3 text-sm font-bold text-cubelo-blue">{group.servicioNombre}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-cubelo-blue">
                      {formatMoney(group.total)}
                    </td>
                  </tr>
                  {group.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 bg-white">
                      <td className="px-3 py-3">
                        <div
                          className={`flex gap-2 text-sm text-gray-800 ${
                            item.cantidad > 1 ? "ml-6 border-l-2 border-cubelo-blue pl-3 text-xs text-gray-600" : ""
                          }`}
                        >
                          <span>•</span>
                          <span>{item.productoNombre}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatMoney(item.subtotal || item.precioUnitario)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}

              {descuento ? (
                <tr className="border-t border-gray-200">
                  <td className="px-3 py-3 text-sm text-gray-500">Descuento -{descuento}%</td>
                  <td className="px-3 py-3 text-right text-sm text-gray-500">
                    -{formatMoney(totalBruto - totalNeto)}
                  </td>
                </tr>
              ) : null}

              <tr className="bg-gray-100">
                <td className="px-3 py-4 text-base font-bold text-gray-900">TOTAL:</td>
                <td className="px-3 py-4 text-right text-base font-bold text-gray-900">
                  {formatMoney(totalNeto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <div className="flex justify-center gap-3 no-print">
        <Link
          href={`/clientes/${cliente.id}`}
          className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-5 py-2.5 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Editar
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="rounded-md bg-[#1E2A6E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#172154]"
        >
          Finalizar y compartir
        </button>
      </div>

      <ModalCompartir open={shareOpen} onClose={() => setShareOpen(false)} />
    </section>
  );
}
