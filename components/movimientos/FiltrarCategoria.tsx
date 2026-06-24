"use client";

import { Check, Filter } from "lucide-react";
import { useMemo, useState } from "react";

import { type CategoriaMovimientoOption } from "@/components/movimientos/PopoverCategoria";

type FiltrarCategoriaProps = {
  categorias: CategoriaMovimientoOption[];
  selected: string[];
  onChange: (categoriaIds: string[]) => void;
};

export function FiltrarCategoria({ categorias, selected, onChange }: FiltrarCategoriaProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...categorias].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categorias]
  );

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold transition ${
          selected.length
            ? "border-cubelo-blue bg-blue-50 text-cubelo-blue"
            : "border-gray-300 text-gray-700"
        }`}
      >
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filtrar categoría
        {selected.length ? <span className="rounded-full bg-cubelo-blue px-1.5 text-[10px] text-white">{selected.length}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Categorías</span>
            {selected.length ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-bold text-cubelo-blue hover:underline"
              >
                Limpiar
              </button>
            ) : null}
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {sorted.map((categoria) => {
              const id = categoria.id ?? "";
              const isChecked = selected.includes(id);
              return (
                <button
                  key={categoria.id ?? categoria.nombre}
                  type="button"
                  onClick={() => id && toggle(id)}
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
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: categoria.color ?? "#3333CC" }}
                  />
                  {categoria.nombre}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
