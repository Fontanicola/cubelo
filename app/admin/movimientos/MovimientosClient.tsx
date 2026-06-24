"use client";

import {
  FileText,
  FolderInput,
  Search,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";

import { BancariosTable } from "@/app/admin/movimientos/BancariosTable";
import { OtrosTable } from "@/app/admin/movimientos/OtrosTable";
import { type MovimientoRow, type MovimientosClientProps } from "@/app/admin/movimientos/types";
import { FiltrarCategoria } from "@/components/movimientos/FiltrarCategoria";
import { FiltrarMovimiento } from "@/components/movimientos/FiltrarMovimiento";
import { ModalVincularMovimiento, type VinculoMovimiento } from "@/components/movimientos/ModalVincularMovimiento";
import { createClient } from "@/lib/supabase/client";

type TabMovimiento = "bancarios" | "otros";

function monthLabel(value?: string | null) {
  if (!value) return "SIN FECHA";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date).toUpperCase();
}

export function MovimientosClient({ bancariosRows, otrosRows, categorias, cuentas }: MovimientosClientProps) {
  const [bancarios, setBancarios] = useState(bancariosRows);
  const [otros, setOtros] = useState(otrosRows);
  const [tab, setTab] = useState<TabMovimiento>("bancarios");
  const [searchDraft, setSearchDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [metodoFilter, setMetodoFilter] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [linkTarget, setLinkTarget] = useState<MovimientoRow | null>(null);

  const activeRows = tab === "bancarios" ? bancarios : otros;
  const setActiveRows = tab === "bancarios" ? setBancarios : setOtros;

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchDraft.trim().toLowerCase();

    return activeRows.filter((row) => {
      const matchesSearch = normalizedSearch
        ? String(row.descripcion ?? "").toLowerCase().includes(normalizedSearch)
        : true;
      const matchesDate = dateDraft ? row.fecha?.slice(0, 10) === dateDraft : true;
      const matchesCategory = categoryFilter.length > 0
        ? (row.categoriaId ? categoryFilter.includes(row.categoriaId) : false)
        : true;
      const matchesTipo = tipoFilter.length > 0
        ? (tipoFilter.includes("Ingresos") && row.importe > 0) ||
          (tipoFilter.includes("Gastos") && row.importe < 0)
        : true;
      const matchesMetodo = metodoFilter.length > 0
        ? (row.cuentaNombre ? metodoFilter.includes(row.cuentaNombre.toUpperCase()) : false)
        : true;

      return matchesSearch && matchesDate && matchesCategory && matchesTipo && matchesMetodo;
    });
  }, [activeRows, searchDraft, dateDraft, categoryFilter, tipoFilter, metodoFilter]);

  const selectedIds = useMemo(
    () => Object.entries(selectedRows).filter(([, s]) => s).map(([id]) => id),
    [selectedRows]
  );

  function toggleRow(id: string, checked: boolean) {
    setSelectedRows((current) => ({ ...current, [id]: checked }));
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    filteredRows.forEach((row) => { next[row.id] = checked; });
    setSelectedRows(next);
  }

  async function patchMovimiento(id: string, patch: Partial<MovimientoRow>, dbPatch: Record<string, unknown>) {
    setActiveRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    const supabase = createClient();
    const { error } = await supabase.from("movimientos").update(dbPatch).eq("id", id);
    if (error) console.error("No se pudo actualizar el movimiento", error);
  }

  async function deleteSelected() {
    if (!selectedIds.length || !window.confirm(`¿Eliminar ${selectedIds.length} movimientos?`)) return;
    const previous = { bancarios, otros };
    setActiveRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
    setSelectedRows({});
    const supabase = createClient();
    const { error } = await supabase.from("movimientos").delete().in("id", selectedIds);
    if (error) {
      console.error("No se pudieron eliminar los movimientos", error);
      setBancarios(previous.bancarios);
      setOtros(previous.otros);
    }
  }

  async function markCsvAsManual() {
    const supabase = createClient();
    await supabase.from("movimientos").update({ origen: "manual" }).in("id", selectedIds);
    setActiveRows((current) =>
      current.map((row) => (selectedIds.includes(row.id) ? { ...row, origen: "manual" } : row))
    );
  }

  function updateLinked(vinculo: VinculoMovimiento) {
    if (!linkTarget) return;
    const patch: Partial<MovimientoRow> = {
      clienteId: vinculo.clienteId,
      clienteNombre: vinculo.tipo === "cliente" ? vinculo.nombre : null,
      colaboradorId: vinculo.colaboradorId,
      colaboradorNombre: vinculo.tipo === "colaborador" ? vinculo.nombre : null,
      acuerdoId: vinculo.acuerdoId,
      conciliado: true
    };
    setActiveRows((current) => current.map((row) => (row.id === linkTarget.id ? { ...row, ...patch } : row)));
    setLinkTarget(null);
  }

  const hasCsvSelected = activeRows.some((row) => selectedIds.includes(row.id) && row.origen === "csv");

  return (
    <div className="space-y-6">
      <div className="flex gap-8 border-b border-gray-200">
        {([
          { key: "bancarios" as const, label: "MOVIMIENTOS BANCARIOS" },
          { key: "otros" as const, label: "OTROS" }
        ]).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => { setTab(item.key); setSelectedRows({}); }}
            className={`border-b-4 px-1 pb-3 text-sm font-bold transition ${
              tab === item.key
                ? "border-cubelo-blue text-cubelo-blue"
                : "border-gray-300 text-gray-400 hover:text-gray-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar descripción"
            className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
          />
        </label>
        <input
          type="date"
          value={dateDraft}
          onChange={(e) => setDateDraft(e.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cubelo-blue"
        />
        <FiltrarCategoria
          categorias={categorias}
          selected={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FiltrarMovimiento
          cuentas={cuentas}
          tipoFilter={tipoFilter}
          metodoFilter={metodoFilter}
          onTipoChange={setTipoFilter}
          onMetodoChange={setMetodoFilter}
        />
      </div>

      {tab === "bancarios" ? (
        <BancariosTable
          rows={filteredRows}
          categorias={categorias}
          cuentas={cuentas}
          selectedRows={selectedRows}
          onToggleRow={toggleRow}
          onLink={setLinkTarget}
          onPatch={patchMovimiento}
        />
      ) : (
        <OtrosTable
          rows={filteredRows}
          categorias={categorias}
          cuentas={cuentas}
          selectedRows={selectedRows}
          onToggleRow={toggleRow}
          onLink={setLinkTarget}
          onPatch={patchMovimiento}
        />
      )}

      {selectedIds.length ? (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-xl ring-1 ring-gray-200">
          <span className="text-sm font-bold text-gray-900">{selectedIds.length} Items seleccionados</span>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </button>
          <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-2 rounded-md border border-red-600 px-3 py-2 text-sm font-bold text-red-600">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
          {hasCsvSelected ? (
            <button type="button" onClick={markCsvAsManual} className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-3 py-2 text-sm font-bold text-white">
              <FolderInput className="h-4 w-4" />
              Mover a movimientos
            </button>
          ) : null}
        </div>
      ) : null}

      <ModalVincularMovimiento
        open={Boolean(linkTarget)}
        movimientoId={linkTarget?.id}
        importe={linkTarget?.importe ?? 0}
        contexto={tab === "otros" ? "otros" : "bancarios"}
        categoriaNombre={linkTarget?.categoriaNombre}
        onClose={() => setLinkTarget(null)}
        onLinked={updateLinked}
      />
    </div>
  );
}
