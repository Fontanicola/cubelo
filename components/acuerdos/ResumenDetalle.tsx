"use client";

import { Briefcase, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ProductoOption,
  UnidadOption,
  useWizard
} from "@/app/acuerdos/nuevo/WizardContext";

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-AR")}.-`;
}

type ResumenDetalleProps = {
  unidades: UnidadOption[];
  productos: ProductoOption[];
};

export function ResumenDetalle({ unidades, productos }: ResumenDetalleProps) {
  const { state, setState } = useWizard();
  const [openUnit, setOpenUnit] = useState<string | null>(state.selectedUnitIds[0] ?? null);
  const productosById = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos]
  );

  function getUnitTotal(unitId: string) {
    const productTotal = (state.productsByUnit[unitId] ?? []).reduce(
      (sum, productId) => sum + (productosById.get(productId)?.precioArs ?? 0),
      0
    );
    const customTotal = (state.customProductsByUnit[unitId] ?? []).length * 0;
    return state.detailsByUnit[unitId]?.montoTotal ?? productTotal + customTotal;
  }

  function updateUnitTotal(unitId: string, total: number) {
    setState((current) => ({
      ...current,
      detailsByUnit: {
        ...current.detailsByUnit,
        [unitId]: {
          ...current.detailsByUnit[unitId],
          tipoCobro: current.detailsByUnit[unitId]?.tipoCobro ?? "completo",
          montoTotal: total
        }
      }
    }));
  }

  return (
    <div className="space-y-3">
      {unidades
        .filter((unidad) => state.selectedUnitIds.includes(unidad.id))
        .map((unidad) => {
          const open = openUnit === unidad.id;
          const productIds = state.productsByUnit[unidad.id] ?? [];
          const customProducts = state.customProductsByUnit[unidad.id] ?? [];
          const total = getUnitTotal(unidad.id);

          return (
            <section key={unidad.id} className="overflow-hidden rounded-lg border border-blue-100 bg-white">
              <button
                type="button"
                onClick={() => setOpenUnit((current) => (current === unidad.id ? null : unidad.id))}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-3 text-sm font-bold text-cubelo-blue">
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  {unidad.nombre}
                </span>
                <span className="flex items-center gap-3 text-sm font-bold text-gray-900">
                  {formatMoney(total)}
                  {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </span>
              </button>

              {open ? (
                <div className="border-t border-blue-100 p-4">
                  {[...productIds.map((id) => productosById.get(id)?.nombre ?? id), ...customProducts].map(
                    (label) => (
                      <div key={label} className="flex items-center justify-between border-b border-gray-100 py-2">
                        <span className="border-l-2 border-cubelo-blue pl-3 text-sm text-gray-700">{label}</span>
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
                          {formatMoney(0)}
                          <Pencil className="h-3.5 w-3.5 text-cubelo-blue" aria-hidden="true" />
                        </span>
                      </div>
                    )
                  )}
                  <label className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-gray-900">Total {unidad.nombre}</span>
                    <input
                      type="number"
                      value={total}
                      onChange={(event) => updateUnitTotal(unidad.id, Number(event.target.value || 0))}
                      className="h-9 w-32 rounded-md border border-gray-300 px-3 text-right text-sm font-bold outline-none focus:border-cubelo-blue"
                    />
                  </label>
                </div>
              ) : null}
            </section>
          );
        })}
    </div>
  );
}
