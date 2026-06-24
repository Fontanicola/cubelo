"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { type BudgetRecord, type PresupuestoItem } from "@/lib/presupuestos/document";
import { BudgetCard } from "@/app/clientes/[id]/AccordionPresupuesto";

type AccordionRechazadosProps = {
  clienteId: string;
  presupuestos: Array<BudgetRecord & { items: PresupuestoItem[] }>;
};

export function AccordionRechazados({ clienteId, presupuestos }: AccordionRechazadosProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between bg-[#1E2A6E] px-4 py-3 text-left text-sm font-bold uppercase text-white"
      >
        Presupuestos Rechazados
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="space-y-4 p-4">
          {presupuestos.length ? (
            presupuestos.map((presupuesto) => (
              <BudgetCard key={String(presupuesto.id)} presupuesto={presupuesto} clienteId={clienteId} rejected />
            ))
          ) : (
            <p className="text-sm text-gray-500">Sin presupuestos rechazados</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
