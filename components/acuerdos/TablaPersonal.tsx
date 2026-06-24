"use client";

import { MessageCircle, PenSquare, Plus, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ColaboradorOption,
  createPersonalRow,
  ROLE_OPTIONS,
  UnidadOption,
  useWizard
} from "@/app/acuerdos/nuevo/WizardContext";

type TablaPersonalProps = {
  unidad: UnidadOption;
  colaboradores: ColaboradorOption[];
};

type PaymentPopover = {
  rowId: string;
  tipoPago: "completo" | "anticipo";
  montoAnticipo: string;
} | null;

type CommentPopover = {
  rowId: string;
  nota: string;
} | null;

export function TablaPersonal({ unidad, colaboradores }: TablaPersonalProps) {
  const { state, setState } = useWizard();
  const rows = state.personalRowsByUnit[unidad.id] ?? [];
  const selectedRoles = state.rolesByUnit[unidad.id] ?? [];
  const [paymentPopover, setPaymentPopover] = useState<PaymentPopover>(null);
  const [commentPopover, setCommentPopover] = useState<CommentPopover>(null);
  const [editableCosts, setEditableCosts] = useState<Record<string, boolean>>({});

  const roleOptions = useMemo(
    () => Array.from(new Set([...selectedRoles, ...ROLE_OPTIONS])),
    [selectedRoles]
  );

  function updateRow(rowId: string, patch: Record<string, unknown>) {
    setState((current) => ({
      ...current,
      personalRowsByUnit: {
        ...current.personalRowsByUnit,
        [unidad.id]: rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
      }
    }));
  }

  function removeRow(rowId: string) {
    setState((current) => ({
      ...current,
      personalRowsByUnit: {
        ...current.personalRowsByUnit,
        [unidad.id]: rows.filter((row) => row.id !== rowId)
      }
    }));
  }

  function addRow() {
    setState((current) => ({
      ...current,
      personalRowsByUnit: {
        ...current.personalRowsByUnit,
        [unidad.id]: [...rows, createPersonalRow(unidad.id, selectedRoles[0] ?? "Rol", 0)]
      }
    }));
  }

  function savePayment() {
    if (!paymentPopover) {
      return;
    }

    updateRow(paymentPopover.rowId, {
      estadoPago: "pagado",
      tipoPago: paymentPopover.tipoPago,
      montoAnticipo: Number(paymentPopover.montoAnticipo || 0)
    });
    setPaymentPopover(null);
  }

  function saveComment() {
    if (!commentPopover) {
      return;
    }

    updateRow(commentPopover.rowId, { nota: commentPopover.nota });
    setCommentPopover(null);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[940px] w-full border-collapse">
          <thead className="bg-[#1E2A6E] text-white">
            <tr>
              {["", "PERSONAL", "ROL", "PAGO", "COM.", "COSTOS", ""].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-200 bg-white hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="text-red-600 hover:text-red-700"
                    aria-label="Eliminar fila"
                  >
                    <XCircle className="h-5 w-5" aria-hidden="true" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={row.colaboradorId}
                    onChange={(event) => updateRow(row.id, { colaboradorId: event.target.value })}
                    className="h-10 min-w-[220px] rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                  >
                    <option value="">Selecciona un colaborador</option>
                    {colaboradores.map((colaborador) => (
                      <option key={colaborador.id} value={colaborador.id}>
                        {colaborador.nombreApellido}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={row.rol}
                    onChange={(event) => updateRow(row.id, { rol: event.target.value })}
                    className="h-10 min-w-[180px] rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                  >
                    {roleOptions.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="relative px-4 py-3">
                  <input
                    type="checkbox"
                    checked={row.estadoPago === "pagado"}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setPaymentPopover({
                          rowId: row.id,
                          tipoPago: row.tipoPago ?? "completo",
                          montoAnticipo: String(row.montoAnticipo ?? "")
                        });
                      } else {
                        updateRow(row.id, { estadoPago: "pendiente" });
                      }
                    }}
                    className="h-4 w-4 accent-cubelo-blue"
                  />
                </td>
                <td className="relative px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setCommentPopover({ rowId: row.id, nota: row.nota ?? "" })}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${
                      row.nota
                        ? "border-cubelo-blue bg-blue-50 text-cubelo-blue"
                        : "border-gray-300 text-gray-600"
                    }`}
                    aria-label="Comentario"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={row.feeAcordado}
                    readOnly={!editableCosts[row.id]}
                    onChange={(event) => updateRow(row.id, { feeAcordado: Number(event.target.value || 0) })}
                    className="h-10 w-32 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue read-only:bg-gray-50"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditableCosts((current) => ({ ...current, [row.id]: !current[row.id] }))
                    }
                    className="text-cubelo-blue hover:text-[#2929a8]"
                    aria-label="Editar costos"
                  >
                    <PenSquare className="h-5 w-5" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Sumar colaborador
      </button>

      {paymentPopover ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-black">Pago</h3>
            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={paymentPopover.tipoPago === "completo"}
                  onChange={() => setPaymentPopover({ ...paymentPopover, tipoPago: "completo" })}
                  className="h-4 w-4 accent-cubelo-blue"
                />
                COMPLETO
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={paymentPopover.tipoPago === "anticipo"}
                  onChange={() => setPaymentPopover({ ...paymentPopover, tipoPago: "anticipo" })}
                  className="h-4 w-4 accent-cubelo-blue"
                />
                ANTICIPO
              </label>
            </div>
            {paymentPopover.tipoPago === "anticipo" ? (
              <input
                type="number"
                value={paymentPopover.montoAnticipo}
                onChange={(event) =>
                  setPaymentPopover({ ...paymentPopover, montoAnticipo: event.target.value })
                }
                placeholder="Monto anticipo"
                className="mt-4 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
            ) : null}
            <button
              type="button"
              onClick={savePayment}
              className="mt-5 w-full rounded-md bg-cubelo-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : null}

      {commentPopover ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-black">Comentario</h3>
            <textarea
              value={commentPopover.nota}
              onChange={(event) => setCommentPopover({ ...commentPopover, nota: event.target.value })}
              className="mt-4 min-h-[120px] w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cubelo-blue"
            />
            <button
              type="button"
              onClick={saveComment}
              className="mt-5 w-full rounded-md bg-cubelo-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
