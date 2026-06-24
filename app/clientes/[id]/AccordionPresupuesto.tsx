"use client";

import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ModalNuevoPresupuesto } from "@/components/presupuestos/ModalNuevoPresupuesto";
import {
  formatDate,
  formatMoney,
  getNetTotal,
  getPresupuestoEstadoMeta,
  groupItemsByServicio,
  normalizePresupuestoEstado,
  PRESUPUESTO_ESTADOS,
  type BudgetRecord,
  type PresupuestoItem
} from "@/lib/presupuestos/document";
import { approvePresupuesto } from "@/lib/presupuestos/approveBudget";
import { createClient } from "@/lib/supabase/client";

type PresupuestoCardProps = {
  presupuesto: BudgetRecord & { items: PresupuestoItem[] };
  clienteId: string;
  rejected?: boolean;
};

function BudgetStateDropdown({
  presupuesto,
  rejected = false
}: {
  presupuesto: BudgetRecord & { items: PresupuestoItem[] };
  rejected?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(normalizePresupuestoEstado(presupuesto.estado));
  const meta = getPresupuestoEstadoMeta(state);

  async function updateEstado(nextState: (typeof PRESUPUESTO_ESTADOS)[number]["value"]) {
    setState(nextState);
    setOpen(false);

    const supabase = createClient();
    const { error } = await supabase.from("presupuestos").update({ estado: nextState }).eq("id", presupuesto.id);

    if (error) {
      console.error("No se pudo actualizar el presupuesto", error);
      return;
    }

    if (nextState === "aprobado" && !rejected) {
      await approvePresupuesto(String(presupuesto.id), router);
      return;
    }

    router.refresh();
  }

  if (rejected) {
    return (
      <span className="inline-flex rounded-full bg-[#DC2626] px-3 py-1 text-xs font-bold text-white">
        RECHAZADO
      </span>
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-10 z-30 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {PRESUPUESTO_ESTADOS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => updateEstado(item.value)}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BudgetCard({ presupuesto, clienteId, rejected = false }: PresupuestoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(() => groupItemsByServicio(presupuesto.items ?? []), [presupuesto.items]);
  const totalBruto = Number(presupuesto.total_bruto ?? 0);
  const descuento = Number(presupuesto.descuento_porcentaje ?? 0);
  const totalNeto = Number(presupuesto.total_neto ?? getNetTotal(totalBruto, descuento));
  const servicesSummary = groups.map((group) => group.servicioNombre).join(" - ");

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[150px_200px_1fr_160px_40px] lg:items-start">
        <div>
          <div className="text-[11px] font-bold uppercase text-gray-400">Fecha</div>
          <div className="text-sm font-bold text-cubelo-blue">{formatDate(String(presupuesto.fecha ?? presupuesto.created_at ?? null))}</div>
        </div>

        <div className="relative">
          <BudgetStateDropdown presupuesto={presupuesto} rejected={rejected} />
        </div>

        <div className="text-sm text-gray-700">Detalle: {servicesSummary || "Sin servicios"}</div>

        <div className="text-sm font-bold text-cubelo-blue">TOTAL: {formatMoney(totalNeto)}</div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-cubelo-blue hover:bg-blue-50"
          aria-label="Ver detalle"
        >
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          {groups.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <div className="flex items-center justify-between bg-[#EEF2FF] px-3 py-2 text-sm font-bold text-cubelo-blue">
                <span>{group.servicioNombre}</span>
                <span>{formatMoney(group.total)}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 px-3 py-2 text-sm text-gray-700">
                    <Folder className="mt-0.5 h-4 w-4 text-cubelo-blue" aria-hidden="true" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.productoNombre}</div>
                      <div className="text-xs text-gray-500">
                        {item.cantidad} x {formatMoney(item.precioUnitario)}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">{formatMoney(item.subtotal || item.precioUnitario)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-3">
            <span className="font-bold text-gray-900">TOTAL</span>
            <span className="font-bold text-gray-900">{formatMoney(totalNeto)}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}

type AccordionPresupuestoProps = {
  clienteId: string;
  presupuestos: Array<BudgetRecord & { items: PresupuestoItem[] }>;
  rejected?: boolean;
};

export function AccordionPresupuesto({ clienteId, presupuestos, rejected = false }: AccordionPresupuestoProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-t-lg bg-[#1E2A6E] px-4 py-3 text-left text-sm font-bold uppercase text-white"
      >
        {rejected ? "Presupuestos Rechazados" : "Presupuesto"}
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="space-y-4 p-4">
          {presupuestos.length ? (
            presupuestos.map((presupuesto) => (
              <BudgetCard
                key={String(presupuesto.id)}
                presupuesto={presupuesto}
                clienteId={clienteId}
                rejected={rejected}
              />
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {rejected ? "Sin presupuestos rechazados" : "Sin presupuestos cargados"}
            </p>
          )}

          {!rejected ? (
            <ModalNuevoPresupuesto clienteId={clienteId} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
