"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type EstadoPago = "Pago Comp." | "Anticipo" | "Pendiente";

const ESTADOS: Array<{ label: EstadoPago; color: string }> = [
  { label: "Pago Comp.", color: "#16A34A" },
  { label: "Anticipo", color: "#D97706" },
  { label: "Pendiente", color: "#DC2626" }
];

export function getEstadoPago(saldoPendiente: number, totalCobrado: number): EstadoPago {
  if (saldoPendiente === 0) {
    return "Pago Comp.";
  }

  if (saldoPendiente > 0 && totalCobrado > 0) {
    return "Anticipo";
  }

  return "Pendiente";
}

export function getEstadoColor(estado: EstadoPago) {
  return ESTADOS.find((item) => item.label === estado)?.color ?? "#DC2626";
}

type DropdownEstadoProps = {
  acuerdoId: string;
  estado: EstadoPago;
};

export function DropdownEstado({ acuerdoId, estado }: DropdownEstadoProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<EstadoPago>(estado);
  const [saving, setSaving] = useState(false);

  async function handleSelect(nextValue: EstadoPago) {
    setValue(nextValue);
    setOpen(false);
    setSaving(true);

    const supabase = createClient();

    if (!supabase) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("cobros_clientes").upsert(
      {
        acuerdo_id: acuerdoId,
        estado_pago: nextValue,
        updated_at: new Date().toISOString()
      },
      { onConflict: "acuerdo_id" }
    );

    if (error) {
      console.error("No se pudo guardar el estado del pago", error);
    }

    setSaving(false);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-[126px] items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: getEstadoColor(value) }}
        aria-label="Estado del pago"
      >
        <span>{value}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-30 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {ESTADOS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSelect(item.label)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-100"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {saving ? <span className="sr-only">Guardando estado</span> : null}
    </div>
  );
}
