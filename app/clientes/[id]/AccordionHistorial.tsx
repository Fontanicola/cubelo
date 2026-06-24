"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { MONTH_NAMES, type PresupuestoItem } from "@/lib/presupuestos/document";
import { MonthTable } from "@/app/clientes/[id]/AccordionMesEnCurso";

type AgreementRow = Record<string, unknown> & {
  id: string | number;
  mes_operacion?: number | null;
  anio_operacion?: number | null;
  presupuestoItems: PresupuestoItem[];
};

type AccordionHistorialProps = {
  acuerdos: AgreementRow[];
};

export function AccordionHistorial({ acuerdos }: AccordionHistorialProps) {
  const [open, setOpen] = useState(false);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, AgreementRow[]>();

    acuerdos.forEach((acuerdo) => {
      const month = Number(acuerdo.mes_operacion ?? 1);
      const year = Number(acuerdo.anio_operacion ?? new Date().getFullYear());
      const key = `${year}-${String(month).padStart(2, "0")}`;
      groups.set(key, [...(groups.get(key) ?? []), acuerdo]);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [acuerdos]);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between bg-[#1E2A6E] px-4 py-3 text-left text-sm font-bold uppercase text-white"
      >
        Historial
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="space-y-3 p-4">
          {grouped.length ? (
            grouped.map(([key, monthAgreements]) => {
              const [year, month] = key.split("-");
              const label = `${MONTH_NAMES[Number(month) - 1]} ${year}`;
              const monthOpen = openMonth === key;

              return (
                <div key={key} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenMonth((current) => (current === key ? null : key))}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold uppercase text-cubelo-blue"
                  >
                    {label}
                    {monthOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                  {monthOpen ? (
                    <div className="border-t border-gray-200 p-4">
                      <MonthTable acuerdos={monthAgreements} />
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">Sin historial para mostrar.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
