"use client";

import { Check, ChevronDown, Filter } from "lucide-react";
import { useMemo, useState } from "react";

import { type CuentaMovimientoOption } from "@/components/movimientos/PopoverMetodoPago";

type FiltrarMovimientoProps = {
  cuentas: CuentaMovimientoOption[];
  tipoFilter: string[];
  metodoFilter: string[];
  onTipoChange: (tipos: string[]) => void;
  onMetodoChange: (metodos: string[]) => void;
};

export function FiltrarMovimiento({
  cuentas,
  tipoFilter,
  metodoFilter,
  onTipoChange,
  onMetodoChange
}: FiltrarMovimientoProps) {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"tipo" | "metodo">("tipo");

  const metodoOptions = useMemo(() => {
    const names = new Set<string>();
    cuentas.forEach((cuenta) => {
      if (cuenta.nombre) names.add(cuenta.nombre.toUpperCase());
    });
    return Array.from(names).sort();
  }, [cuentas]);

  const hasFilters = tipoFilter.length > 0 || metodoFilter.length > 0;

  function toggleTipo(tipo: string) {
    if (tipoFilter.includes(tipo)) {
      onTipoChange(tipoFilter.filter((t) => t !== tipo));
    } else {
      onTipoChange([...tipoFilter, tipo]);
    }
  }

  function toggleMetodo(metodo: string) {
    if (metodoFilter.includes(metodo)) {
      onMetodoChange(metodoFilter.filter((m) => m !== metodo));
    } else {
      onMetodoChange([...metodoFilter, metodo]);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold transition ${
          hasFilters
            ? "border-cubelo-blue bg-blue-50 text-cubelo-blue"
            : "border-gray-300 text-gray-700"
        }`}
      >
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filtrar movimiento
        {hasFilters ? (
          <span className="rounded-full bg-cubelo-blue px-1.5 text-[10px] text-white">
            {tipoFilter.length + metodoFilter.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Filtros</span>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  onTipoChange([]);
                  onMetodoChange([]);
                }}
                className="text-xs font-bold text-cubelo-blue hover:underline"
              >
                Limpiar
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setExpandedSection("tipo")}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold text-gray-900 hover:bg-gray-50"
          >
            TIPO
            <ChevronDown className={`h-4 w-4 transition ${expandedSection === "tipo" ? "rotate-180" : ""}`} />
          </button>
          {expandedSection === "tipo" ? (
            <div className="mb-2 space-y-1 pl-2">
              {["Ingresos", "Gastos"].map((tipo) => {
                const isChecked = tipoFilter.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleTipo(tipo)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                      isChecked ? "bg-blue-50 text-cubelo-blue" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isChecked ? "border-cubelo-blue bg-cubelo-blue" : "border-gray-300"
                      }`}
                    >
                      {isChecked ? <Check className="h-3 w-3 text-white" /> : null}
                    </span>
                    {tipo}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setExpandedSection("metodo")}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold text-gray-900 hover:bg-gray-50"
          >
            MÉTODO DE PAGO
            <ChevronDown className={`h-4 w-4 transition ${expandedSection === "metodo" ? "rotate-180" : ""}`} />
          </button>
          {expandedSection === "metodo" ? (
            <div className="space-y-1 pl-2">
              {metodoOptions.map((metodo) => {
                const isChecked = metodoFilter.includes(metodo);
                return (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => toggleMetodo(metodo)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                      isChecked ? "bg-blue-50 text-cubelo-blue" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isChecked ? "border-cubelo-blue bg-cubelo-blue" : "border-gray-300"
                      }`}
                    >
                      {isChecked ? <Check className="h-3 w-3 text-white" /> : null}
                    </span>
                    {metodo}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
