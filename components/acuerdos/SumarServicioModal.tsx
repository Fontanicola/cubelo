"use client";

import { Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ColaboradorOption,
  type UnitDetail,
  UnidadOption,
  useWizard
} from "@/app/acuerdos/nuevo/WizardContext";
import { TablaPersonal } from "@/components/acuerdos/TablaPersonal";

type SumarServicioModalProps = {
  open: boolean;
  onClose: () => void;
  unidades: UnidadOption[];
  colaboradores: ColaboradorOption[];
  total: number;
};

export function SumarServicioModal({
  open,
  onClose,
  unidades,
  colaboradores,
  total
}: SumarServicioModalProps) {
  const router = useRouter();
  const { state, setState } = useWizard();
  const selectedUnits = unidades.filter((unidad) => state.selectedUnitIds.includes(unidad.id));
  const [index, setIndex] = useState(0);
  const unidad = selectedUnits[index];
  const rows = unidad ? state.personalRowsByUnit[unidad.id] ?? [] : [];
  const feeTotal = useMemo(() => rows.reduce((sum, row) => sum + Number(row.feeAcordado ?? 0), 0), [rows]);
  const detail = unidad ? state.detailsByUnit[unidad.id] ?? { tipoCobro: "completo" as const } : null;
  const montoTotal = detail?.montoTotal ?? total;
  const utilidad = detail?.utilidad ?? montoTotal - feeTotal;

  if (!open || !unidad || !detail) {
    return null;
  }

  function updateDetail(patch: Partial<UnitDetail>) {
    setState((current) => ({
      ...current,
      detailsByUnit: {
        ...current.detailsByUnit,
        [unidad.id]: {
          tipoCobro: "completo",
          ...detail,
          ...patch
        }
      }
    }));
  }

  function continueWizard() {
    if (index < selectedUnits.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    router.push("/acuerdos/nuevo/resumen");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">{unidad.nombre}</h2>
            <p className="mt-1 text-sm italic text-gray-400">
              Detalle de personal {index + 1} de {selectedUnits.length}
            </p>
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

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Monto total</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={montoTotal}
                onChange={(event) => updateDetail({ montoTotal: Number(event.target.value || 0) })}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
              <Pencil className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Utilidad</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={utilidad}
                onChange={(event) => updateDetail({ utilidad: Number(event.target.value || 0) })}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
              <Pencil className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
            </div>
          </label>
          <div>
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Pago</span>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={detail.tipoCobro === "completo"}
                  onChange={() => updateDetail({ tipoCobro: "completo", montoAnticipo: undefined })}
                  className="h-4 w-4 accent-cubelo-blue"
                />
                COMPLETO
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={detail.tipoCobro === "anticipo"}
                  onChange={() => updateDetail({ tipoCobro: "anticipo" })}
                  className="h-4 w-4 accent-cubelo-blue"
                />
                ANTICIPO
              </label>
            </div>
            {detail.tipoCobro === "anticipo" ? (
              <input
                type="number"
                value={detail.montoAnticipo ?? ""}
                onChange={(event) => updateDetail({ montoAnticipo: Number(event.target.value || 0) })}
                placeholder="Monto anticipo"
                className="mt-3 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
            ) : null}
          </div>
          {unidad.nombre.toLowerCase().includes("audiovisual") ? (
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-cubelo-blue">Locación</span>
              <input
                value={detail.locacion ?? state.locacion}
                onChange={(event) => {
                  updateDetail({ locacion: event.target.value });
                  setState((current) => ({ ...current, locacion: event.target.value }));
                }}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
            </label>
          ) : null}
        </div>

        <div className="mt-6">
          <TablaPersonal unidad={unidad} colaboradores={colaboradores} />
        </div>

        <label className="mt-6 block">
          <span className="text-[11px] font-bold uppercase text-cubelo-blue">Link de trabajo</span>
          <input
            value={state.linkReferencia}
            onChange={(event) => setState((current) => ({ ...current, linkReferencia: event.target.value }))}
            placeholder="Copiar link de trabajo"
            className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={continueWizard}
            className="rounded-md bg-cubelo-blue px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8]"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
