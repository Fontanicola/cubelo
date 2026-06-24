"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MONTH_NAMES } from "@/lib/presupuestos/document";

type SelectorMesProps = {
  month: number;
  year: number;
};

export function SelectorMes({ month, year }: SelectorMesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(month);
  const [draftYear, setDraftYear] = useState(year);

  const label = useMemo(() => `${MONTH_NAMES[month - 1]} ${year}`, [month, year]);

  function save() {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(draftMonth));
    next.set("year", String(draftYear));
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-cubelo-blue"
      >
        <CalendarDays className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
        {label}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[320px] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDraftYear((current) => current - 1)}
              className="rounded-md p-2 text-cubelo-blue hover:bg-blue-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="text-sm font-bold text-gray-900">{draftYear}</div>
            <button
              type="button"
              onClick={() => setDraftYear((current) => current + 1)}
              className="rounded-md p-2 text-cubelo-blue hover:bg-blue-50"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((monthName, index) => {
              const monthValue = index + 1;
              const selected = draftMonth === monthValue;

              return (
                <button
                  key={monthName}
                  type="button"
                  onClick={() => setDraftMonth(monthValue)}
                  className={`rounded-md px-3 py-2 text-xs font-bold transition ${
                    selected ? "bg-cubelo-blue text-white" : "bg-gray-100 text-gray-700 hover:bg-blue-50"
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={save}
            className="mt-4 w-full rounded-md bg-cubelo-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8]"
          >
            Guardar
          </button>
        </div>
      ) : null}
    </div>
  );
}
