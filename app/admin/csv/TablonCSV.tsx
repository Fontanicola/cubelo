"use client";

import { ChevronDown, ChevronRight, FileText, FolderInput, MoreVertical, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { type CsvImport } from "@/app/admin/csv/WizardImportCSV";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "cubelo_csv_imports";
const COLORS = ["#111827", "#6B7280", "#8B1A1A", "#D97706", "#FACC15", "#16A34A", "#3333CC", "#7C3AED", "#FFFFFF"];

type TablonCSVProps = {
  imports: CsvImport[];
  onChange: (imports: CsvImport[]) => void;
};

function saveImports(imports: CsvImport[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imports));
}

function parseNumber(value: string) {
  return Number(String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

export function TablonCSV({ imports, onChange }: TablonCSVProps) {
  const [openImport, setOpenImport] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [columnMenu, setColumnMenu] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState<string | null>(null);
  const [confirmMove, setConfirmMove] = useState(false);

  const selectedKeys = useMemo(
    () => Object.entries(selectedRows).filter(([, selected]) => selected).map(([key]) => key),
    [selectedRows]
  );

  function updateImports(next: CsvImport[]) {
    saveImports(next);
    onChange(next);
  }

  function updateImport(index: number, patch: Partial<CsvImport>) {
    updateImports(imports.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeSelectedRows() {
    const next = imports.map((item, importIndex) => ({
      ...item,
      filas: item.filas.filter((_, rowIndex) => !selectedRows[`${importIndex}:${rowIndex}`])
    }));
    setSelectedRows({});
    updateImports(next);
  }

  async function moveToMovimientos() {
    const supabase = createClient();

    if (!supabase) {
      return;
    }

    const userResult = await supabase.auth.getUser();
    const rowsToInsert = [];

    for (const key of selectedKeys) {
      const [importIndexText, rowIndexText] = key.split(":");
      const importIndex = Number(importIndexText);
      const rowIndex = Number(rowIndexText);
      const item = imports[importIndex];
      const row = item.filas[rowIndex];
      const cuentaResult = await supabase.from("cuentas").select("id").ilike("nombre", item.banco).maybeSingle();
      const fechaIndex = item.tipos.findIndex((type) => type === "COLUMNA DE FECHA");
      const textIndex = item.tipos.findIndex((type) => type === "COLUMNA DE TEXTO");
      const numericIndexes = item.tipos
        .map((type, index) => (type === "COLUMNA NUMÉRICA" ? index : -1))
        .filter((index) => index >= 0);
      const importe = numericIndexes.map((index) => parseNumber(row[index] ?? "")).find((value) => value !== 0) ?? 0;

      rowsToInsert.push({
        fecha: row[fechaIndex] || new Date().toISOString().slice(0, 10),
        descripcion: row[textIndex] || "Movimiento CSV",
        importe,
        cuenta_id: cuentaResult.data?.id ?? null,
        moneda: "ARS",
        origen: "csv",
        created_by: userResult.data.user?.id ?? null
      });
    }

    if (rowsToInsert.length) {
      const { error } = await supabase.from("movimientos").insert(rowsToInsert);

      if (error) {
        console.error("No se pudieron mover los movimientos", error);
        return;
      }
    }

    setConfirmMove(false);
    removeSelectedRows();
  }

  return (
    <div className="space-y-5">
      {imports.map((item, importIndex) => {
        const hidden = new Set(item.hiddenColumns ?? []);
        return (
          <section key={`${item.banco}-${importIndex}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpenImport(openImport === importIndex ? -1 : importIndex)}
              className="flex w-full items-center justify-between bg-[#8B1A1A] px-4 py-3 text-left text-sm font-bold uppercase text-white"
            >
              ⋮ {item.banco} - ÚLTIMOS MOVIMIENTOS
              {openImport === importIndex ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

            {openImport === importIndex ? (
              <div>
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <input
                    value={item.mes}
                    onChange={(event) => updateImport(importIndex, { mes: event.target.value })}
                    className="font-bold text-cubelo-blue outline-none"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border border-gray-200 px-3 py-2">
                          <input
                            type="checkbox"
                            onChange={(event) => {
                              const next = { ...selectedRows };
                              item.filas.forEach((_, rowIndex) => {
                                next[`${importIndex}:${rowIndex}`] = event.target.checked;
                              });
                              setSelectedRows(next);
                            }}
                            className="h-4 w-4 accent-cubelo-blue"
                          />
                        </th>
                        {item.columnas.map((column, columnIndex) =>
                          hidden.has(columnIndex) ? null : (
                            <th
                              key={columnIndex}
                              onClick={() => setColorPicker(`${importIndex}:${columnIndex}`)}
                              className="relative border border-gray-200 px-3 py-2 text-left font-bold"
                              style={{ backgroundColor: item.colors?.[columnIndex] ?? "#FFFFFF" }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                {column}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setColumnMenu(columnMenu === `${importIndex}:${columnIndex}` ? null : `${importIndex}:${columnIndex}`);
                                  }}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                              {columnMenu === `${importIndex}:${columnIndex}` ? (
                                <div className="absolute right-2 top-9 z-20 w-44 rounded-md border border-gray-200 bg-white p-1 text-xs shadow-lg">
                                  {["Duplicar", "Cambiar nombre", "Ocultar columna", "Eliminar columna"].map((action) => (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => {
                                        const next = [...imports];
                                        if (action === "Duplicar") {
                                          next[importIndex].columnas.splice(columnIndex + 1, 0, `${column} copia`);
                                          next[importIndex].tipos.splice(columnIndex + 1, 0, item.tipos[columnIndex]);
                                          next[importIndex].filas = item.filas.map((row) => {
                                            const copy = [...row];
                                            copy.splice(columnIndex + 1, 0, row[columnIndex]);
                                            return copy;
                                          });
                                        }
                                        if (action === "Cambiar nombre") {
                                          const name = window.prompt("Nuevo nombre", column);
                                          if (name) next[importIndex].columnas[columnIndex] = name;
                                        }
                                        if (action === "Ocultar columna") {
                                          next[importIndex].hiddenColumns = [...(item.hiddenColumns ?? []), columnIndex];
                                        }
                                        if (action === "Eliminar columna") {
                                          next[importIndex].columnas.splice(columnIndex, 1);
                                          next[importIndex].tipos.splice(columnIndex, 1);
                                          next[importIndex].filas = item.filas.map((row) => row.filter((_, index) => index !== columnIndex));
                                        }
                                        setColumnMenu(null);
                                        updateImports(next);
                                      }}
                                      className="block w-full rounded px-2 py-1.5 text-left hover:bg-gray-100"
                                    >
                                      {action}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                              {colorPicker === `${importIndex}:${columnIndex}` ? (
                                <div className="absolute left-2 top-9 z-20 grid grid-cols-5 gap-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                                  {COLORS.map((color) => (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        updateImport(importIndex, {
                                          colors: { ...(item.colors ?? {}), [columnIndex]: color }
                                        });
                                        setColorPicker(null);
                                      }}
                                      className="h-5 w-5 rounded border border-gray-200"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {item.filas.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedRows[`${importIndex}:${rowIndex}`])}
                              onChange={(event) =>
                                setSelectedRows((current) => ({
                                  ...current,
                                  [`${importIndex}:${rowIndex}`]: event.target.checked
                                }))
                              }
                              className="h-4 w-4 accent-cubelo-blue"
                            />
                          </td>
                          {row.map((cell, columnIndex) =>
                            hidden.has(columnIndex) ? null : (
                              <td key={columnIndex} className="border border-gray-200 px-3 py-2 text-gray-700">
                                {cell}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}

      {selectedKeys.length ? (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-xl ring-1 ring-gray-200">
          <span className="text-sm font-bold text-gray-900">{selectedKeys.length} Items seleccionados</span>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700">
            <FileText className="h-4 w-4" /> Exportar PDF
          </button>
          <button type="button" onClick={() => window.confirm("¿Eliminar filas?") && removeSelectedRows()} className="inline-flex items-center gap-2 rounded-md border border-red-600 px-3 py-2 text-sm font-bold text-red-600">
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
          <button type="button" onClick={() => setConfirmMove(true)} className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-3 py-2 text-sm font-bold text-white">
            <FolderInput className="h-4 w-4" /> Mover a movimientos
          </button>
        </div>
      ) : null}

      {confirmMove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-black">¿Estas seguro que deseas cargar {selectedKeys.length} movimientos nuevos?</h2>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmMove(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700">
                No, continuar cargando
              </button>
              <button type="button" onClick={moveToMovimientos} className="rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white">
                Si, enviar a Movimientos
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
