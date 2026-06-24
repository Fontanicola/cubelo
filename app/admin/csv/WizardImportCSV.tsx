"use client";

import { CalendarDays, Grid3X3, Table2, X } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/client";

export type CsvImport = {
  banco: string;
  mes: string;
  columnas: string[];
  tipos: string[];
  filas: string[][];
  hiddenColumns?: number[];
  colors?: Record<number, string>;
};

const STORAGE_KEY = "cubelo_csv_imports";
const TYPE_OPTIONS = [
  "COLUMNA DE ESTADO",
  "COLUMNA DE TEXTO",
  "COLUMNA NUMÉRICA",
  "COLUMNA DE FECHA",
  "Ignorar columna"
];

function getColumnName(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

async function parseFile(file: File): Promise<string[][]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
    return (rows as unknown[][]).map((row) => row.map(normalizeCell));
  }

  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  return parsed.data.map((row) => row.map(normalizeCell));
}

function saveImport(nextImport: CsvImport) {
  const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CsvImport[];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, nextImport]));
}

type WizardImportCSVProps = {
  file: File;
  onClose: () => void;
  onDone: () => void;
};

export function WizardImportCSV({ file, onClose, onDone }: WizardImportCSVProps) {
  const [rows, setRows] = useState<string[][]>([]);
  const [step, setStep] = useState(1);
  const [headerRow, setHeaderRow] = useState(2);
  const [firstColumn, setFirstColumn] = useState(1);
  const [bancos, setBancos] = useState<string[]>([]);
  const [banco, setBanco] = useState("");
  const [types, setTypes] = useState<Record<number, string>>({});

  useEffect(() => {
    parseFile(file).then(setRows);

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    supabase
      .from("cuentas")
      .select("nombre")
      .order("nombre", { ascending: true })
      .then((result) => {
        const names = (result.data ?? []).map((item) => item.nombre).filter(Boolean) as string[];
        setBancos(names);
        setBanco((current) => current || names[0] || "");
      });
  }, [file]);

  const previewRows = rows.slice(0, 12);
  const maxColumns = Math.max(...previewRows.map((row) => row.length), 0);
  const columnas = useMemo(
    () => (rows[headerRow] ?? []).slice(firstColumn).map((header, index) => header || `Columna ${index + 1}`),
    [firstColumn, headerRow, rows]
  );

  function createBoard() {
    const dataRows = rows.slice(headerRow + 1).map((row) => row.slice(firstColumn));
    saveImport({
      banco,
      mes: "Noviembre 2023",
      columnas,
      tipos: columnas.map((_, index) => types[index] ?? "COLUMNA DE TEXTO"),
      filas: dataRows
    });
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between p-5">
          <div>
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
              Paso {step} de 3
            </span>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className={`h-2 rounded-full ${item <= step ? "bg-cubelo-blue" : "bg-gray-200"}`} />
          ))}
        </div>

        <div className="max-h-[62vh] overflow-auto p-5">
          <div className="mb-5 flex items-start gap-3">
            {step === 3 ? (
              <CalendarDays className="mt-1 h-6 w-6 text-cubelo-blue" />
            ) : (
              <Grid3X3 className="mt-1 h-6 w-6 text-cubelo-blue" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-black">
                {step === 1
                  ? "¿Cuál es tu primera fila?"
                  : step === 2
                    ? "¿Cuál es tu primer columna?"
                    : "Personaliza tus columnas"}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {step === 1
                  ? "Estos se convertiran en los títulos de las columnas."
                  : step === 2
                    ? "Estos se convertiran en el título de cada fila"
                    : "Puedes seleccionar la funcionalidad de cada columna"}
              </p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Seleccioná el banco</span>
            <select
              value={banco}
              onChange={(event) => setBanco(event.target.value)}
              disabled={step > 1}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue disabled:bg-gray-50"
            >
              {bancos.length ? bancos.map((name) => <option key={name}>{name}</option>) : <option>Banco</option>}
            </select>
          </label>

          <div className="overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-12 border border-gray-200 px-2 py-2" />
                  {Array.from({ length: maxColumns }).map((_, columnIndex) => (
                    <th
                      key={columnIndex}
                      onClick={() => step === 2 && setFirstColumn(columnIndex)}
                      className={`border border-gray-200 px-2 py-2 font-bold ${
                        step === 2 && columnIndex === firstColumn ? "bg-blue-100 text-cubelo-blue" : ""
                      }`}
                    >
                      {step === 3 ? (
                        <select
                          value={types[columnIndex - firstColumn] ?? "COLUMNA DE TEXTO"}
                          onChange={(event) =>
                            setTypes((current) => ({ ...current, [columnIndex - firstColumn]: event.target.value }))
                          }
                          className="max-w-[150px] rounded border border-gray-300 bg-white px-2 py-1 text-[10px]"
                        >
                          {TYPE_OPTIONS.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        getColumnName(columnIndex)
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    onClick={() => step === 1 && setHeaderRow(rowIndex)}
                    className={step === 1 && rowIndex === headerRow ? "bg-blue-100" : ""}
                  >
                    <td className="border border-gray-200 px-2 py-2 text-center font-bold text-gray-400">
                      {rowIndex + 1}
                    </td>
                    {Array.from({ length: maxColumns }).map((_, columnIndex) => (
                      <td
                        key={columnIndex}
                        className={`border border-gray-200 px-2 py-2 ${
                          step === 2 && columnIndex === firstColumn ? "bg-blue-100" : ""
                        }`}
                      >
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Table2 className="h-5 w-5 text-green-600" />
            {file.name}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => (step === 1 ? onClose() : setStep((current) => current - 1))}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-white"
            >
              {step === 1 ? "Cancelar" : "Volver atrás"}
            </button>
            <button
              type="button"
              onClick={() => (step === 3 ? createBoard() : setStep((current) => current + 1))}
              className="rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
            >
              {step === 3 ? "Crear Tablero" : "Continuar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
