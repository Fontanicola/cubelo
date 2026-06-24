"use client";

import { CalendarDays, ChevronDown, MessageCircle, Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  MONTH_NAMES,
  formatDate,
  formatMoney,
  getNetTotal,
  groupItemsByServicio,
  type PresupuestoEstado,
  type PresupuestoItem
} from "@/lib/presupuestos/document";
import { approvePresupuesto } from "@/lib/presupuestos/approveBudget";
import { createClient } from "@/lib/supabase/client";

export type PresupuestoListRow = Record<string, unknown> & {
  id: string;
  cliente_id?: string | number | null;
  clienteNombre: string;
  fecha?: string | null;
  estado?: string | null;
  descuento_porcentaje?: number | string | null;
  total_bruto?: number | string | null;
  total_neto?: number | string | null;
  moneda?: string | null;
  notas?: string | null;
  items: PresupuestoItem[];
};

const STATE_META: Record<PresupuestoEstado, { label: string; color: string }> = {
  esperando_aprobacion: { label: "Pendiente", color: "#D97706" },
  aprobado: { label: "Aprobado", color: "#16A34A" },
  rechazado: { label: "Rechazado", color: "#DC2626" }
};

function normalizeState(value?: string | null): PresupuestoEstado {
  if (value === "aprobado" || value === "rechazado") {
    return value;
  }

  return "esperando_aprobacion";
}

function PresupuestoEstadoDropdown({ presupuesto }: { presupuesto: PresupuestoListRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PresupuestoEstado>(normalizeState(presupuesto.estado));
  const meta = STATE_META[state];

  async function updateEstado(nextState: PresupuestoEstado) {
    setState(nextState);
    setOpen(false);

    const supabase = createClient();
    const { error } = await supabase.from("presupuestos").update({ estado: nextState }).eq("id", presupuesto.id);

    if (error) {
      console.error("No se pudo actualizar el estado del presupuesto", error);
      return;
    }

    if (nextState === "aprobado") {
      await approvePresupuesto(presupuesto.id, router);
      return;
    }

    router.refresh();
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-10 z-30 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {(["esperando_aprobacion", "aprobado", "rechazado"] as PresupuestoEstado[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateEstado(option)}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-100"
            >
              {STATE_META[option].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PresupuestosTable({ rows }: { rows: PresupuestoListRow[] }) {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredRows = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.clienteNombre.toLowerCase().includes(searchTerm) ||
        row.items.some((item) => item.servicioNombre.toLowerCase().includes(searchTerm) || item.productoNombre.toLowerCase().includes(searchTerm));

      const matchesDate = !dateFilter || String(row.fecha ?? "").startsWith(dateFilter);

      return matchesSearch && matchesDate;
    });
  }, [dateFilter, rows, search]);

  const rowsByMonth = useMemo(() => {
    return filteredRows.reduce<Record<string, PresupuestoListRow[]>>((acc, row) => {
      const date = row.fecha ? new Date(row.fecha) : new Date();
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      acc[key] = [...(acc[key] ?? []), row];
      return acc;
    }, {});
  }, [filteredRows]);

  const sortedMonthKeys = useMemo(
    () =>
      Object.keys(rowsByMonth).sort((a, b) => {
        const [yearA, monthA] = a.split("-").map(Number);
        const [yearB, monthB] = b.split("-").map(Number);
        return new Date(yearB, monthB).getTime() - new Date(yearA, monthA).getTime();
      }),
    [rowsByMonth]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(searchDraft);
              }
            }}
            placeholder="Buscar presupuesto"
            className="h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>
        <label className="relative">
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="h-11 min-w-[190px] rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>
        <button
          type="button"
          onClick={() => setSearch(searchDraft)}
          className="h-11 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          Filtrar
        </button>
      </div>

      {sortedMonthKeys.length ? (
        sortedMonthKeys.map((monthKey) => {
          const [year, monthIndex] = monthKey.split("-").map(Number);
          const title = `PRESUPUESTOS ${MONTH_NAMES[monthIndex]}`;

          return (
            <section key={monthKey} className="space-y-4">
              <div className="rounded-lg bg-[#1E2A6E] px-4 py-3 text-sm font-bold uppercase text-white">
                {title} {year}
              </div>

              {rowsByMonth[monthKey].map((presupuesto) => {
                const groups = groupItemsByServicio(presupuesto.items);
                const totalBruto = Number(presupuesto.total_bruto ?? 0);
                const totalNeto = Number(
                  presupuesto.total_neto ?? getNetTotal(totalBruto, Number(presupuesto.descuento_porcentaje ?? 0))
                );

                return (
                  <article key={presupuesto.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <PresupuestoEstadoDropdown presupuesto={presupuesto} />
                        {presupuesto.notas ? (
                          <span
                            title={String(presupuesto.notas)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-cubelo-blue"
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href={`/presupuestos/${presupuesto.id}/editar`}
                        className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-6 lg:grid-cols-[160px_220px_minmax(0,1fr)_160px]">
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-400">Fecha</div>
                        <div className="mt-1 text-sm font-bold text-cubelo-blue">
                          {formatDate(String(presupuesto.fecha ?? null))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-400">Cliente</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800">{presupuesto.clienteNombre}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-400">Servicios</div>
                        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                          {groups.map((group) => (
                            <div key={group.key}>
                              <div className="flex items-center justify-between bg-[#EEF2FF] px-3 py-2 text-sm font-bold text-cubelo-blue">
                                <span>{group.servicioNombre}</span>
                                <span>{formatMoney(group.total, String(presupuesto.moneda ?? "ARS"))}</span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {group.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-4 px-3 py-2 text-sm text-gray-700">
                                    <div className="pl-3">{item.productoNombre}</div>
                                    <div className="font-semibold text-gray-900">
                                      {formatMoney(item.precioUnitario, String(presupuesto.moneda ?? "ARS"))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-400">Valor</div>
                        <div className="mt-1 text-sm font-bold text-cubelo-blue">
                          {formatMoney(totalNeto, String(presupuesto.moneda ?? "ARS"))}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500 shadow-sm">
          No hay presupuestos para mostrar.
        </div>
      )}
    </div>
  );
}
