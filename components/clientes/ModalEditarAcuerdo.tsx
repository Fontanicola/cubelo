"use client";

import { Bookmark, X } from "lucide-react";
import { useEffect, useState } from "react";

type ModalEditarAcuerdoProps = {
  open: boolean;
  onClose: () => void;
  onSave: (nextTotal: number) => Promise<void>;
  acuerdo: {
    id: string;
    total: number;
    moneda: string;
  } | null;
};

export function ModalEditarAcuerdo({ open, onClose, onSave, acuerdo }: ModalEditarAcuerdoProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(acuerdo ? String(acuerdo.total) : "");
  }, [acuerdo]);

  if (!open || !acuerdo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">Editar acuerdo</h2>
            <p className="mt-1 text-sm italic text-gray-400">Actualizá el total del acuerdo.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="text-[11px] font-bold uppercase text-cubelo-blue">Total ({acuerdo.moneda})</span>
          <input
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(Number(value || 0));
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            {saving ? "Guardando" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
