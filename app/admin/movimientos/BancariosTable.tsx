"use client";

import { LogIn, MessageCircle, Plus } from "lucide-react";

import { type MovimientoRow } from "@/app/admin/movimientos/types";
import { ChipMovimiento, getCategoriaColor, type CategoriaMovimientoOption, PopoverCategoria } from "@/components/movimientos/PopoverCategoria";
import { ChipMetodo, getMetodoColor, type CuentaMovimientoOption, PopoverMetodoPago } from "@/components/movimientos/PopoverMetodoPago";
import { createClient } from "@/lib/supabase/client";

const BANCO_COLORS: Record<string, string> = {
  santander: "#8B0000",
  bbva: "#1A3A6B"
};

function getBancoColor(nombre?: string | null) {
  const lower = String(nombre ?? "").toLowerCase();
  for (const [key, color] of Object.entries(BANCO_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return hashColor(nombre);
}

function hashColor(text?: string | null) {
  const palette = ["#8B1A1A", "#004A9F", "#047857", "#7C3AED", "#D97706", "#0F766E", "#BE185D"];
  const sum = String(text ?? "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
}

function formatMoney(amount: number, currency = "ARS") {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  } catch {
    return `$${Math.abs(amount).toLocaleString("es-AR")}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function SubcategoriaPicker({
  value,
  onChange
}: {
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const OPTIONS = [
    { nombre: "PAGO MAS", color: "#06B6D4" },
    { nombre: "COSTO DE SERVICIO", color: "#7C3AED" },
    { nombre: "PAGO COMPLETO", color: "#16A34A" },
    { nombre: "ADELANTO", color: "#D97706" },
    { nombre: "GASTO ADMINISTRATIVO", color: "#F97316" }
  ];
  const selected = OPTIONS.find((o) => o.nombre === value);

  if (value) {
    return <ChipMovimiento label={value} color={selected?.color ?? "#3333CC"} compact />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-cubelo-blue text-white"
        aria-label="Asignar subcategoría"
      >
        <Plus className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute left-0 top-10 z-40 flex w-72 flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          {OPTIONS.map((option) => (
            <button
              key={option.nombre}
              type="button"
              onClick={() => { onChange(option.nombre); setOpen(false); }}
              className="rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white"
              style={{ backgroundColor: option.color }}
            >
              {option.nombre}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import { useState } from "react";

type BancariosTableProps = {
  rows: MovimientoRow[];
  categorias: CategoriaMovimientoOption[];
  cuentas: CuentaMovimientoOption[];
  selectedRows: Record<string, boolean>;
  onToggleRow: (id: string, checked: boolean) => void;
  onLink: (row: MovimientoRow) => void;
  onPatch: (id: string, patch: Partial<MovimientoRow>, dbPatch: Record<string, unknown>) => void;
};

export function BancariosTable({
  rows,
  categorias,
  cuentas,
  selectedRows,
  onToggleRow,
  onLink,
  onPatch
}: BancariosTableProps) {
  const saldoById = (() => {
    let running = 0;
    const byId = new Map<string, number>();
    [...rows]
      .sort((a, b) => String(a.fecha ?? "").localeCompare(String(b.fecha ?? "")))
      .forEach((row) => {
        running += row.importe;
        byId.set(row.id, running);
      });
    return byId;
  })();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-[1780px] w-full border-collapse">
        <thead className="bg-[#1E2A6E] text-white">
          <tr>
            {["", "FECHA", "SUC", "BANCO", "DESCRIPCIÓN", "REF", "CATEGORÍA", "SUBCATEGORÍA", "ENTRADA", "SALIDA", "SALDO", "MÉTODO DE PAGO", "VINCULAR"].map((header) => (
              <th key={header || "sel"} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-normal">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => {
              const linkedName = row.clienteNombre ?? row.colaboradorNombre;
              return (
                <tr key={row.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedRows[row.id])}
                      onChange={(e) => onToggleRow(row.id, e.target.checked)}
                      className="h-4 w-4 accent-cubelo-blue"
                    />
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900">{formatDate(row.fecha)}</td>
                  <td className="px-4 py-4 text-cubelo-blue">
                    <span className="text-xs font-bold">SUC</span>
                  </td>
                  <td className="px-4 py-4">
                    {row.cuentaNombre ? (
                      <span
                        className="inline-flex max-w-36 truncate rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white"
                        style={{ backgroundColor: getBancoColor(row.cuentaNombre) }}
                        title={row.cuentaNombre}
                      >
                        {row.cuentaNombre}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="max-w-72 px-4 py-4 text-sm text-gray-700">
                    <span className="block truncate" title={row.descripcion ?? ""}>
                      {row.descripcion || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={async () => {
                        const next = window.prompt("Notas del movimiento", row.notas ?? "");
                        if (next === null) return;
                        await onPatch(row.id, { notas: next }, { notas: next });
                      }}
                      className="text-cubelo-blue hover:text-[#2929a8]"
                      title={row.notas ?? "Editar notas"}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    {row.categoriaNombre ? (
                      <ChipMovimiento
                        label={row.categoriaNombre}
                        color={getCategoriaColor(row.categoriaNombre, row.categoriaColor)}
                        compact
                      />
                    ) : (
                      <PopoverCategoria
                        categorias={categorias}
                        value={null}
                        onChange={(categoria) =>
                          onPatch(
                            row.id,
                            {
                              categoriaId: categoria.id,
                              categoriaNombre: categoria.nombre,
                              categoriaColor: categoria.color ?? getCategoriaColor(categoria.nombre)
                            },
                            { categoria_id: categoria.id }
                          )
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <SubcategoriaPicker
                      value={row.descripcionResumida}
                      onChange={(value) => onPatch(row.id, { descripcionResumida: value }, { descripcion_resumida: value })}
                    />
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-green-700">
                    {row.importe > 0 ? formatMoney(row.importe, row.moneda ?? "ARS") : ""}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-red-700">
                    {row.importe < 0 ? formatMoney(row.importe, row.moneda ?? "ARS") : ""}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900">
                    {formatMoney(saldoById.get(row.id) ?? 0, row.moneda ?? "ARS")}
                  </td>
                  <td className="px-4 py-4">
                    {row.cuentaNombre ? (
                      <ChipMetodo label={row.cuentaNombre} color={getMetodoColor(row.cuentaNombre)} compact />
                    ) : (
                      <PopoverMetodoPago
                        cuentas={cuentas}
                        value={null}
                        onChange={(cuenta) =>
                          onPatch(
                            row.id,
                            { cuentaId: cuenta.id, cuentaNombre: cuenta.nombre, cuentaTipo: cuenta.tipo ?? null },
                            { cuenta_id: cuenta.id }
                          )
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {linkedName ? (
                      <span className="inline-flex max-w-40 truncate rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase text-cubelo-blue">
                        {linkedName}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLink(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-cubelo-blue hover:bg-blue-50"
                        aria-label="Vincular movimiento"
                      >
                        <LogIn className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={13} className="px-4 py-12 text-center text-sm text-gray-500">
                No hay movimientos bancarios para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
