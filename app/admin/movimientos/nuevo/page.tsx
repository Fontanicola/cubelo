"use client";

import { ArrowLeft, CalendarDays, ChevronDown, FileUp, LogIn, PenLine, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ModalVincularMovimiento, type VinculoMovimiento } from "@/components/movimientos/ModalVincularMovimiento";
import {
  ChipMovimiento,
  type CategoriaMovimientoOption,
  PopoverCategoria
} from "@/components/movimientos/PopoverCategoria";
import {
  type CuentaMovimientoOption,
  PopoverMetodoPago
} from "@/components/movimientos/PopoverMetodoPago";
import { createClient } from "@/lib/supabase/client";

type TipoMovimiento = "ingreso" | "gasto";

type EtiquetaOption = {
  nombre: string;
  color: string;
};

const SUBCATEGORIAS_INGRESO: EtiquetaOption[] = [
  { nombre: "PAGO MAS", color: "#06B6D4" },
  { nombre: "ANTICIPO", color: "#D97706" },
  { nombre: "PAGO COMPLETO", color: "#16A34A" }
];

const SUBCATEGORIAS_GASTO: EtiquetaOption[] = [
  { nombre: "COSTO DE SERVICIO", color: "#7C3AED" },
  { nombre: "PAGO COMPLETO", color: "#16A34A" },
  { nombre: "ADELANTO", color: "#D97706" },
  { nombre: "GASTO ADMINISTRATIVO", color: "#F97316" }
];

const STORAGE_SUBCATEGORIAS = "cubelo_movimiento_etiquetas_subcategoria";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Math.abs(value || 0));
}

function getStoredSubcategorias() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_SUBCATEGORIAS) ?? "[]") as EtiquetaOption[];
  } catch {
    return [];
  }
}

function PopoverSubcategoria({
  value,
  tipo,
  onChange
}: {
  value: EtiquetaOption | null;
  tipo: TipoMovimiento;
  onChange: (value: EtiquetaOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customSubcategorias, setCustomSubcategorias] = useState<EtiquetaOption[]>([]);

  useEffect(() => {
    setCustomSubcategorias(getStoredSubcategorias());
  }, []);

  const options = useMemo(
    () => [...customSubcategorias, ...(tipo === "ingreso" ? SUBCATEGORIAS_INGRESO : SUBCATEGORIAS_GASTO)],
    [customSubcategorias, tipo]
  );

  function saveCustom() {
    const trimmed = customLabel.trim().toUpperCase();
    if (!trimmed) return;

    const next = [
      { nombre: trimmed, color: "#3333CC" },
      ...customSubcategorias.filter((option) => option.nombre !== trimmed)
    ];
    setCustomSubcategorias(next);
    window.localStorage.setItem(STORAGE_SUBCATEGORIAS, JSON.stringify(next));
    setCustomLabel("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-bold text-gray-700 transition hover:border-cubelo-blue"
      >
        {value ? (
          <ChipMovimiento label={value.nombre} color={value.color} compact />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cubelo-blue text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-11 z-40 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
            {options.map((option) => (
              <button
                key={option.nombre}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="rounded-md px-2.5 py-1 text-[11px] font-bold uppercase text-white transition hover:scale-[1.02]"
                style={{ backgroundColor: option.color }}
              >
                {option.nombre}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="text-xs font-bold text-cubelo-blue hover:underline"
            >
              Editar Etiquetas
            </button>
            {editing ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder="Nueva etiqueta"
                  className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
                />
                <button
                  type="button"
                  onClick={saveCustom}
                  className="inline-flex h-9 items-center gap-1 rounded-md bg-cubelo-blue px-3 text-xs font-bold text-white"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Guardar cambios
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoMovimiento>("ingreso");
  const [fecha, setFecha] = useState(today());
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState<CategoriaMovimientoOption | null>(null);
  const [subcategoria, setSubcategoria] = useState<EtiquetaOption | null>(null);
  const [cuenta, setCuenta] = useState<CuentaMovimientoOption | null>(null);
  const [comprobante, setComprobante] = useState("");
  const [categorias, setCategorias] = useState<CategoriaMovimientoOption[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMovimientoOption[]>([]);
  const [vinculo, setVinculo] = useState<VinculoMovimiento | null>(null);
  const [modalVincular, setModalVincular] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      return;
    }
    const client = supabase;

    async function loadOptions() {
      const [categoriasResult, cuentasResult] = await Promise.all([
        client.from("categorias_movimiento").select("id, nombre").order("nombre", { ascending: true }),
        client.from("cuentas").select("id, nombre, tipo").order("nombre", { ascending: true })
      ]);

      setCategorias(
        categoriasResult.data?.map((item) => ({
          id: String(item.id),
          nombre: String(item.nombre),
          color: null
        })) ?? []
      );
      setCuentas(
        cuentasResult.data?.map((item) => ({
          id: String(item.id),
          nombre: String(item.nombre),
          tipo: item.tipo ? String(item.tipo) : null,
          color: null
        })) ?? []
      );
    }

    loadOptions();
  }, []);

  const signedAmount = (Number(importe) || 0) * (tipo === "ingreso" ? 1 : -1);

  async function handleSave() {
    const numericAmount = Number(importe);

    if (!fecha || !descripcion.trim() || !numericAmount) {
      window.alert("Completá fecha, descripción e importe para cargar el movimiento.");
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      return;
    }

    setSaving(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("movimientos").insert({
      fecha,
      descripcion: descripcion.trim(),
      importe: signedAmount,
      moneda: "ARS",
      categoria_id: categoria?.id ?? null,
      descripcion_resumida: subcategoria?.nombre ?? null,
      cuenta_id: cuenta?.id ?? null,
      comprobante: comprobante || null,
      cliente_id: vinculo?.clienteId ?? null,
      colaborador_id: vinculo?.colaboradorId ?? null,
      acuerdo_id: vinculo?.acuerdoId ?? null,
      origen: "manual",
      conciliado: Boolean(vinculo),
      created_by: user?.id ?? null
    });

    setSaving(false);

    if (error) {
      console.error("No se pudo cargar el movimiento", error);
      window.alert("No se pudo cargar el movimiento.");
      return;
    }

    router.push("/admin/movimientos");
  }

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex items-start gap-4">
        <Link
          href="/admin"
          className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
          aria-label="Volver a administración"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Sumar Movimiento</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">Carga manual de ingresos y gastos.</p>
        </div>
      </div>

      <div className="flex gap-8 border-b border-gray-200">
        {[
          { key: "ingreso" as const, label: "INGRESOS" },
          { key: "gasto" as const, label: "GASTOS" }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setTipo(tab.key);
              setCategoria(null);
              setSubcategoria(null);
            }}
            className={`border-b-4 px-1 pb-3 text-sm font-bold transition ${
              tipo === tab.key
                ? "border-cubelo-blue text-cubelo-blue"
                : "border-gray-300 text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[1380px] w-full border-collapse">
          <thead className="bg-[#1E2A6E] text-white">
            <tr>
              {[
                "FECHA",
                "DESCRIPCIÓN",
                "CATEGORIA",
                "SUBCATEGORIA",
                "IMPORTE",
                "MÉTODO DE PAGO",
                "COMPROBANTE",
                "VINCULAR"
              ].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-normal">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 border-l-4 border-l-cubelo-blue bg-white">
              <td className="px-4 py-4">
                <label className="relative block">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="h-10 w-40 rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
                  />
                </label>
              </td>
              <td className="px-4 py-4">
                <input
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  placeholder="Escribe una descripción"
                  className="h-10 w-64 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                />
              </td>
              <td className="px-4 py-4">
                <PopoverCategoria
                  categorias={categorias}
                  value={categoria}
                  mode={tipo}
                  onChange={setCategoria}
                />
              </td>
              <td className="px-4 py-4">
                <PopoverSubcategoria value={subcategoria} tipo={tipo} onChange={setSubcategoria} />
              </td>
              <td className="px-4 py-4">
                <input
                  type="number"
                  value={importe}
                  onChange={(event) => setImporte(event.target.value)}
                  placeholder="Importe"
                  className="h-10 w-36 rounded-md border border-gray-300 bg-white px-3 text-sm font-bold outline-none focus:border-cubelo-blue"
                />
                {Number(importe) ? (
                  <div className="mt-1 text-xs font-bold text-gray-400">{tipo === "gasto" ? "-" : "+"}{formatMoney(Number(importe))}</div>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <PopoverMetodoPago cuentas={cuentas} value={cuenta} mode={tipo} onChange={setCuenta} />
              </td>
              <td className="px-4 py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => setComprobante(event.target.files?.[0]?.name ?? "")}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-cubelo-blue hover:bg-blue-50"
                  aria-label="Subir comprobante"
                >
                  <FileUp className="h-5 w-5" aria-hidden="true" />
                </button>
                {comprobante ? <div className="mt-1 max-w-32 truncate text-xs text-gray-500">{comprobante}</div> : null}
              </td>
              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => setModalVincular(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-cubelo-blue hover:bg-blue-50"
                  aria-label="Vincular movimiento"
                >
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                </button>
                {vinculo ? (
                  <div className="mt-1 inline-flex max-w-36 items-center gap-1 truncate rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-cubelo-blue">
                    <PenLine className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{vinculo.nombre}</span>
                  </div>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end justify-between gap-4 rounded-lg bg-[#F3F4F6] px-5 py-4 sm:flex-row">
        <div className="text-sm font-bold text-gray-700">
          TOTAL: <span className="text-cubelo-blue">{formatMoney(Number(importe) || 0)}</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("¿Cancelar movimiento?")) {
                router.push("/admin");
              }
            }}
            className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-cubelo-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Cargar movimiento
          </button>
        </div>
      </div>

      <ModalVincularMovimiento
        open={modalVincular}
        importe={signedAmount}
        onClose={() => setModalVincular(false)}
        onLinked={setVinculo}
      />
    </section>
  );
}
