"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const METODOS = ["Efectivo", "Transferencia", "Depósito"] as const;

type MetodoPago = (typeof METODOS)[number];

type DropdownMetodoPagoProps = {
  acuerdoId: string;
  cobroId?: string | null;
  metodo?: string | null;
};

export function DropdownMetodoPago({ acuerdoId, cobroId, metodo }: DropdownMetodoPagoProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(metodo || "Transferencia");

  async function handleSelect(nextValue: MetodoPago) {
    setValue(nextValue);
    setOpen(false);

    const supabase = createClient();

    if (!supabase) {
      return;
    }

    const payload = {
      tipo_cobro: nextValue,
      updated_at: new Date().toISOString()
    };

    const { error } = cobroId
      ? await supabase.from("cobros_clientes").update(payload).eq("id", cobroId)
      : await supabase.from("cobros_clientes").upsert(
          {
            acuerdo_id: acuerdoId,
            tipo_cobro: nextValue,
            created_at: new Date().toISOString()
          },
          { onConflict: "acuerdo_id" }
        );

    if (error) {
      console.error("No se pudo guardar el metodo de pago", error);
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-[146px] items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <span>{value}</span>
        <ChevronDown className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-10 z-30 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {METODOS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-100"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
