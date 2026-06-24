"use client";

import { Filter, Search, User, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatDate } from "@/lib/clientes/format";
import { createClient } from "@/lib/supabase/client";

export type ClienteRow = {
  id: string;
  nombre: string;
  nombreComercial: string | null;
  email: string | null;
  telefono: string | null;
  fechaInicio: string | null;
  activo: boolean;
};

const TABLE_HEADERS = ["ESTADO", "NOMBRE", "FECHA DE INICIO", "MAIL", "TELÉFONO", "SERVICIOS", "ELIMINAR"];

type ClientesTableProps = {
  clientes: ClienteRow[];
};

export function ClientesTable({ clientes }: ClientesTableProps) {
  const [rows, setRows] = useState(clientes);
  const [searchDraft, setSearchDraft] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("todos");
  const [deleteTarget, setDeleteTarget] = useState<ClienteRow | null>(null);

  const filteredRows = useMemo(() => {
    const normalized = searchDraft.trim().toLowerCase();

    return rows
      .filter((cliente) => {
      const haystack = [cliente.nombre, cliente.nombreComercial, cliente.email, cliente.telefono]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = normalized ? haystack.includes(normalized) : true;
      const matchesEstado =
        estadoFiltro === "todos" ? true : estadoFiltro === "activos" ? cliente.activo : !cliente.activo;

      return matchesSearch && matchesEstado;
    })
      .sort((a, b) => {
        if (a.activo !== b.activo) {
          return Number(b.activo) - Number(a.activo);
        }

        return a.nombre.localeCompare(b.nombre, "es");
      });
  }, [rows, searchDraft, estadoFiltro]);

  async function handleToggle(cliente: ClienteRow) {
    const nextActivo = !cliente.activo;
    setRows((current) =>
      current.map((item) => (item.id === cliente.id ? { ...item, activo: nextActivo } : item))
    );

    const supabase = createClient();
    const { error } = await supabase.from("clientes").update({ activo: nextActivo }).eq("id", cliente.id);

    if (error) {
      console.error("No se pudo actualizar el estado del cliente", error);
      setRows((current) =>
        current.map((item) => (item.id === cliente.id ? { ...item, activo: cliente.activo } : item))
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      setDeleteTarget(null);
      return;
    }

    const target = deleteTarget;
    setRows((current) => current.filter((item) => item.id !== target.id));
    setDeleteTarget(null);

    const supabase = createClient();
    const { error } = await supabase.from("clientes").delete().eq("id", target.id);

    if (error) {
      console.error("No se pudo eliminar el cliente", error);
      setRows((current) => [...current, target].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <Link
          href="/clientes/nuevo"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Crear Cliente
        </Link>

        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Buscar cliente"
            className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>

        <select
          value={estadoFiltro}
          onChange={(event) => setEstadoFiltro(event.target.value as typeof estadoFiltro)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>

        <button
          type="button"
          onClick={() => setSearchDraft((current) => current.trim())}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtrar
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[980px] w-full border-collapse">
          <thead className="bg-[#1E2A6E] text-white">
            <tr>
              {TABLE_HEADERS.map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((cliente) => (
                <tr key={cliente.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(cliente)}
                      className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                        cliente.activo ? "bg-[#16A34A]" : "bg-gray-300"
                      }`}
                      aria-label="Cambiar estado del cliente"
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white transition ${
                          cliente.activo ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-cubelo-blue transition hover:bg-blue-100"
                        aria-label={`Ver detalle de ${cliente.nombre}`}
                      >
                        <User className="h-5 w-5" aria-hidden="true" />
                      </Link>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{cliente.nombre}</div>
                        {cliente.nombreComercial ? (
                          <div className="text-xs text-gray-500">{cliente.nombreComercial}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                      {formatDate(cliente.fechaInicio)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{cliente.email || "-"}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{cliente.telefono || "-"}</td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/clientes/${cliente.id}/servicios`}
                      className="text-sm font-bold text-cubelo-blue hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(cliente)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Eliminar cliente"
                    >
                      <XCircle className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay clientes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-black">¿Eliminar cliente?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Esta acción eliminará a {deleteTarget.nombre} de la lista.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
