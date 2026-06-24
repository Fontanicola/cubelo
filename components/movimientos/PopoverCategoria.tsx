"use client";

import { ChevronDown, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type CategoriaMovimientoOption = {
  id: string | null;
  nombre: string;
  color?: string | null;
};

type PopoverCategoriaProps = {
  categorias: CategoriaMovimientoOption[];
  value?: CategoriaMovimientoOption | null;
  mode?: "ingreso" | "gasto" | "all";
  label?: string;
  onChange: (categoria: CategoriaMovimientoOption) => void;
};

const CUSTOM_STORAGE_KEY = "cubelo_movimiento_etiquetas_categoria";

const DEFAULT_CATEGORIAS: CategoriaMovimientoOption[] = [
  { id: null, nombre: "COBRANZAS", color: "#84CC16" },
  { id: null, nombre: "TRASPASO", color: "#047857" },
  { id: null, nombre: "PAGO COLABORADORES", color: "#7C3AED" },
  { id: null, nombre: "SUSCRIPCIONES", color: "#06B6D4" },
  { id: null, nombre: "GASTOS BANCARIOS", color: "#1E2A6E" },
  { id: null, nombre: "CLIENTES A COBRAR", color: "#EC4899" },
  { id: null, nombre: "CAPACITACIONES", color: "#2563EB" },
  { id: null, nombre: "GASTOS ADMINISTRATIVOS", color: "#F97316" },
  { id: null, nombre: "GASTOS REUNIONES", color: "#F9A8D4" },
  { id: null, nombre: "IMPUESTOS", color: "#DC2626" },
  { id: null, nombre: "REGALOS", color: "#DB2777" },
  { id: null, nombre: "GASTOS KEVIN", color: "#C2410C" },
  { id: null, nombre: "VIATICOS", color: "#16A34A" },
  { id: null, nombre: "GASTOS OFICINA", color: "#EA580C" },
  { id: null, nombre: "GASTOS OFICINA CUOTAS", color: "#92400E" },
  { id: null, nombre: "INVERSIONES", color: "#38BDF8" },
  { id: null, nombre: "ADMINISTRACIÓN", color: "#3B82F6" }
];

const INGRESO_CATEGORIAS = new Set(["COBRANZAS", "TRASPASO", "CLIENTES A COBRAR"]);

function getCustomCategorias() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(CUSTOM_STORAGE_KEY) ?? "[]") as CategoriaMovimientoOption[];
  } catch {
    return [];
  }
}

export function getCategoriaColor(nombre?: string | null, fallback?: string | null) {
  if (fallback) {
    return fallback;
  }

  const option = DEFAULT_CATEGORIAS.find(
    (categoria) => categoria.nombre.toLowerCase() === String(nombre ?? "").toLowerCase()
  );

  return option?.color ?? "#3333CC";
}

export function ChipMovimiento({
  label,
  color,
  compact = false
}: {
  label: string;
  color?: string | null;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-[180px] items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white shadow-sm ${
        compact ? "truncate" : ""
      }`}
      style={{ backgroundColor: color ?? getCategoriaColor(label) }}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PopoverCategoria({
  categorias,
  value,
  mode = "all",
  label = "Categoría",
  onChange
}: PopoverCategoriaProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customCategorias, setCustomCategorias] = useState<CategoriaMovimientoOption[]>([]);

  useEffect(() => {
    setCustomCategorias(getCustomCategorias());
  }, []);

  const options = useMemo(() => {
    const byName = new Map<string, CategoriaMovimientoOption>();
    [...DEFAULT_CATEGORIAS, ...categorias, ...customCategorias].forEach((categoria) => {
      const key = categoria.nombre.trim().toLowerCase();
      if (!key) return;
      byName.set(key, {
        ...categoria,
        color: categoria.color ?? getCategoriaColor(categoria.nombre)
      });
    });

    return Array.from(byName.values()).filter((categoria) => {
      if (mode === "ingreso") {
        return INGRESO_CATEGORIAS.has(categoria.nombre.toUpperCase());
      }
      return true;
    });
  }, [categorias, customCategorias, mode]);

  function saveCustom() {
    const trimmed = customLabel.trim().toUpperCase();

    if (!trimmed) {
      return;
    }

    const next = [
      { id: null, nombre: trimmed, color: "#3333CC" },
      ...customCategorias.filter((categoria) => categoria.nombre.toUpperCase() !== trimmed)
    ];

    setCustomCategorias(next);
    window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next));
    setCustomLabel("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-bold text-gray-700 transition hover:border-cubelo-blue"
        aria-label={label}
      >
        {value ? (
          <ChipMovimiento label={value.nombre} color={value.color} compact />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cubelo-blue text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-11 z-40 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
            {options.map((categoria) => (
              <button
                key={`${categoria.id ?? categoria.nombre}-${categoria.nombre}`}
                type="button"
                onClick={() => {
                  onChange(categoria);
                  setOpen(false);
                }}
                className="rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white transition hover:scale-[1.02]"
                style={{ backgroundColor: categoria.color ?? getCategoriaColor(categoria.nombre) }}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="text-xs font-bold text-cubelo-blue hover:underline"
            >
              Editar Etiquetas
            </button>

            {editing ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder="Nueva etiqueta"
                  className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
                />
                <button
                  type="button"
                  onClick={saveCustom}
                  className="inline-flex h-9 items-center gap-1 rounded-md bg-cubelo-blue px-3 text-xs font-bold text-white"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Guardar cambios
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
