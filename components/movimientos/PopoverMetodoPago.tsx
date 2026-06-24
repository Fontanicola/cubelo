"use client";

import { ChevronDown, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type CuentaMovimientoOption = {
  id: string | null;
  nombre: string;
  tipo?: string | null;
  color?: string | null;
};

type PopoverMetodoPagoProps = {
  cuentas: CuentaMovimientoOption[];
  value?: CuentaMovimientoOption | null;
  mode?: "ingreso" | "gasto" | "all";
  onChange: (cuenta: CuentaMovimientoOption) => void;
};

const STORAGE_KEY = "cubelo_movimiento_etiquetas_metodo";

const DEFAULT_METODOS: CuentaMovimientoOption[] = [
  { id: null, nombre: "EFECTIVO", color: "#DB2777" },
  { id: null, nombre: "MERCADO PAGO", color: "#06B6D4" },
  { id: null, nombre: "CHEQUE", color: "#047857" },
  { id: null, nombre: "TRANSFERENCIA", color: "#22D3EE" }
];

function hashColor(text?: string | null) {
  const palette = ["#8B1A1A", "#004A9F", "#06B6D4", "#DB2777", "#047857", "#7C3AED", "#D97706"];
  const value = String(text ?? "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return palette[value % palette.length];
}

function getCustomMetodos() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CuentaMovimientoOption[];
  } catch {
    return [];
  }
}

export function getMetodoColor(nombre?: string | null, fallback?: string | null) {
  return fallback ?? DEFAULT_METODOS.find((metodo) => metodo.nombre === String(nombre ?? "").toUpperCase())?.color ?? hashColor(nombre);
}

export function ChipMetodo({
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
      className={`inline-flex max-w-[190px] items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white shadow-sm ${
        compact ? "truncate" : ""
      }`}
      style={{ backgroundColor: getMetodoColor(label, color) }}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PopoverMetodoPago({ cuentas, value, mode = "all", onChange }: PopoverMetodoPagoProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customMetodos, setCustomMetodos] = useState<CuentaMovimientoOption[]>([]);

  useEffect(() => {
    setCustomMetodos(getCustomMetodos());
  }, []);

  const options = useMemo(() => {
    const byName = new Map<string, CuentaMovimientoOption>();
    const base = mode === "gasto" ? DEFAULT_METODOS.filter((metodo) => metodo.nombre !== "TRANSFERENCIA") : DEFAULT_METODOS;

    [...base, ...cuentas, ...customMetodos].forEach((cuenta) => {
      const key = cuenta.nombre.trim().toLowerCase();
      if (!key) return;
      byName.set(key, {
        ...cuenta,
        color: getMetodoColor(cuenta.nombre, cuenta.color)
      });
    });

    return Array.from(byName.values());
  }, [cuentas, customMetodos, mode]);

  function saveCustom() {
    const trimmed = customLabel.trim().toUpperCase();

    if (!trimmed) {
      return;
    }

    const next = [
      { id: null, nombre: trimmed, color: "#3333CC" },
      ...customMetodos.filter((metodo) => metodo.nombre.toUpperCase() !== trimmed)
    ];

    setCustomMetodos(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCustomLabel("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-bold text-gray-700 transition hover:border-cubelo-blue"
        aria-label="Método de pago"
      >
        {value ? (
          <ChipMetodo label={value.nombre} color={value.color} compact />
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
            {options.map((cuenta) => (
              <button
                key={`${cuenta.id ?? cuenta.nombre}-${cuenta.nombre}`}
                type="button"
                onClick={() => {
                  onChange(cuenta);
                  setOpen(false);
                }}
                className="rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white transition hover:scale-[1.02]"
                style={{ backgroundColor: getMetodoColor(cuenta.nombre, cuenta.color) }}
              >
                {cuenta.nombre}
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
