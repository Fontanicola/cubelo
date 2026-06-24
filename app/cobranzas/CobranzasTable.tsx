"use client";

import { ArrowUpRight, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BotonComentario } from "@/components/cobranzas/BotónComentario";
import { DatePickerContacto } from "@/components/cobranzas/DatePickerContacto";
import {
  DropdownEstado,
  getEstadoPago,
  type EstadoPago
} from "@/components/cobranzas/DropdownEstado";
import { DropdownMetodoPago } from "@/components/cobranzas/DropdownMetodoPago";
import { ModalComprobante } from "@/components/cobranzas/ModalComprobante";

export type CobranzasRow = {
  id: string;
  cui: string | null;
  nombreAcuerdo: string | null;
  clienteId: string | null;
  clienteNombre: string;
  telefono: string | null;
  email: string | null;
  direccionPago: string | null;
  moneda: string | null;
  totalAcordado: number;
  totalCobrado: number;
  saldoPendiente: number;
  mesOperacion: number | null;
  anioOperacion: number | null;
  metodoPago: string | null;
  ultimoContacto: string | null;
  cobroId: string | null;
  notas: string | null;
  linkReferencia: string | null;
};

const TABLE_HEADERS = [
  "EMPRESA",
  "TELÉFONO",
  "MAIL",
  "DIRECCIÓN",
  "MONTO",
  "ESTADO DEL PAGO",
  "SUBIR COMP",
  "MÉTODO DE PAGO",
  "ÚLTIMO CONTACTO",
  "COM.",
  "CONTACTARSE",
  "HISTORIAL"
];

function formatMoney(amount: number, currency?: string | null) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency || "ARS",
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency ?? "$"} ${amount.toLocaleString("es-AR")}`;
  }
}

function matchesDate(row: CobranzasRow, dateValue: string) {
  if (!dateValue) {
    return true;
  }

  const [year, month] = dateValue.split("-").map(Number);

  return row.anioOperacion === year && row.mesOperacion === month;
}

type CobranzasTableProps = {
  rows: CobranzasRow[];
};

export function CobranzasTable({ rows }: CobranzasTableProps) {
  const [searchDraft, setSearchDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = normalizedSearch
        ? row.clienteNombre.toLowerCase().includes(normalizedSearch)
        : true;

      return matchesSearch && matchesDate(row, date);
    });
  }, [date, rows, search]);

  function handleFilter() {
    setSearch(searchDraft);
    setDate(dateDraft);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Buscar empresa"
            className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>

        <input
          type="date"
          value={dateDraft}
          onChange={(event) => setDateDraft(event.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cubelo-blue"
        />

        <button
          type="button"
          onClick={handleFilter}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtrar
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[1500px] w-full border-collapse">
          <thead className="bg-[#1E2A6E] text-white">
            <tr>
              {TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-normal"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row) => {
                const estado: EstadoPago = getEstadoPago(row.saldoPendiente, row.totalCobrado);

                return (
                  <tr key={row.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-bold text-gray-900">{row.clienteNombre}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{row.telefono || "-"}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{row.email || "-"}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{row.direccionPago || "-"}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900">
                      {formatMoney(row.totalAcordado, row.moneda)}
                    </td>
                    <td className="px-4 py-4">
                      <DropdownEstado acuerdoId={row.id} estado={estado} />
                    </td>
                    <td className="px-4 py-4">
                      <ModalComprobante acuerdoId={row.id} linkReferencia={row.linkReferencia} />
                    </td>
                    <td className="px-4 py-4">
                      <DropdownMetodoPago
                        acuerdoId={row.id}
                        cobroId={row.cobroId}
                        metodo={row.metodoPago}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <DatePickerContacto
                        acuerdoId={row.id}
                        lastContact={row.ultimoContacto}
                        notas={row.notas}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <BotonComentario acuerdoId={row.id} notas={row.notas} />
                    </td>
                    <td className="px-4 py-4">
                      {row.email || row.telefono ? (
                        <a
                          href={row.email ? `mailto:${row.email}` : `tel:${row.telefono}`}
                          className="inline-flex items-center gap-1 text-sm font-bold text-cubelo-blue hover:underline"
                        >
                          Contactar
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/cobranzas/${row.id}`}
                        className="text-sm font-bold text-cubelo-blue hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay cobranzas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
