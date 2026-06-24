"use client";

import { AlertCircle, ChevronDown, Info, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type PersonaMovimiento = {
  id: string;
  nombre: string;
  tipo: "cliente" | "colaborador";
  subtitulo: string;
};

type ServicioVinculable = {
  id: string;
  acuerdoId: string | null;
  nombre: string;
  categoria: string;
  valor: number;
  moneda: string;
};

export type VinculoMovimiento = {
  clienteId: string | null;
  colaboradorId: string | null;
  acuerdoId: string | null;
  nombre: string;
  tipo: "cliente" | "colaborador";
};

type ModalVincularMovimientoProps = {
  open: boolean;
  movimientoId?: string | null;
  importe: number;
  contexto?: "bancarios" | "otros";
  categoriaNombre?: string | null;
  onClose: () => void;
  onLinked: (vinculo: VinculoMovimiento) => void;
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatMoney(amount: number, currency = "ARS") {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  } catch {
    return `$${Math.abs(amount).toLocaleString("es-AR")}`;
  }
}

function toNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${MONTHS[(month || 1) - 1]} ${year}`;
}

function isCobranzaCategory(nombre?: string | null) {
  const upper = String(nombre ?? "").toUpperCase();
  return upper.includes("COBRANZA") || upper.includes("CLIENTES A COBRAR");
}

function isPagoColaboradoresCategory(nombre?: string | null) {
  return String(nombre ?? "").toUpperCase().includes("PAGO COLABORADORES");
}

export function ModalVincularMovimiento({
  open,
  movimientoId,
  importe,
  contexto = "bancarios",
  categoriaNombre,
  onClose,
  onLinked
}: ModalVincularMovimientoProps) {
  const [personas, setPersonas] = useState<PersonaMovimiento[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<PersonaMovimiento | null>(null);
  const [servicios, setServicios] = useState<ServicioVinculable[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [loading, setLoading] = useState(false);
  const [confirmOverflow, setConfirmOverflow] = useState(false);

  const showSoloClientes = contexto === "otros" && isCobranzaCategory(categoriaNombre);
  const showSoloColaboradores = contexto === "otros" && isPagoColaboradoresCategory(categoriaNombre);
  const isContextual = showSoloClientes || showSoloColaboradores;

  const subtitle = useMemo(() => {
    if (showSoloClientes) return "Selecciona al cliente al cual quieres vincular el movimiento";
    if (showSoloColaboradores) return "Selecciona la persona a la cual quieres vincular el movimiento";
    return "Selecciona la persona a la cual quieres vincular el movimiento";
  }, [showSoloClientes, showSoloColaboradores]);

  const crearLabel = showSoloClientes ? "Crear Cliente" : showSoloColaboradores ? "Crear Persona" : "Crear Cliente/Persona";
  const crearHref = showSoloClientes ? "/clientes/nuevo" : showSoloColaboradores ? "/colaboradores/nuevo" : "/clientes/nuevo";

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    if (!supabase) return;
    const client = supabase;

    async function loadPersonas() {
      const [clientesResult, colaboradoresResult] = await Promise.all([
        showSoloColaboradores
          ? Promise.resolve({ data: [] })
          : client
              .from("clientes")
              .select("id, razon_social, nombre_comercial")
              .eq("activo", true)
              .order("razon_social", { ascending: true }),
        showSoloClientes
          ? Promise.resolve({ data: [] })
          : client
              .from("colaboradores")
              .select("id, nombre, puesto")
              .eq("activo", true)
              .order("nombre", { ascending: true })
      ]);

      const clientes =
        clientesResult.data?.map((cliente) => ({
          id: String(cliente.id),
          nombre: String(cliente.razon_social ?? cliente.nombre_comercial ?? "Cliente"),
          tipo: "cliente" as const,
          subtitulo: "Cliente"
        })) ?? [];

      const colaboradores =
        colaboradoresResult.data?.map((colaborador) => ({
          id: String(colaborador.id),
          nombre: String(colaborador.nombre ?? "Colaborador"),
          tipo: "colaborador" as const,
          subtitulo: String(colaborador.puesto ?? "Colaborador")
        })) ?? [];

      setPersonas([...clientes, ...colaboradores].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }

    loadPersonas();
  }, [open, showSoloClientes, showSoloColaboradores]);

  useEffect(() => {
    if (!open || !selectedPersona) {
      setServicios([]);
      setSelectedItems({});
      return;
    }

    const supabase = createClient();
    if (!supabase) return;
    const client = supabase;
    const persona = selectedPersona;

    async function loadServicios() {
      setLoading(true);
      setSelectedItems({});
      const [year, month] = monthValue.split("-").map(Number);

      if (persona.tipo === "cliente") {
        const { data } = await client
          .from("v_saldo_acuerdos")
          .select("*")
          .eq("cliente_id", persona.id)
          .eq("mes_operacion", month)
          .eq("anio_operacion", year);

        setServicios(
          (data ?? []).map((row) => ({
            id: String(row.id),
            acuerdoId: String(row.id),
            nombre: String(row.nombre_acuerdo ?? row.cui ?? "Servicio"),
            categoria: String(row.unidad_negocio ?? row.categoria ?? "SERVICIOS"),
            valor: toNumber(row.saldo_pendiente ?? row.total_acordado),
            moneda: String(row.moneda ?? "ARS")
          }))
        );
      } else {
        const { data } = await client
          .from("v_deuda_colaboradores")
          .select("*")
          .eq("colaborador_id", persona.id)
          .eq("mes_operacion", month)
          .eq("anio_operacion", year);

        setServicios(
          (data ?? []).map((row, index) => ({
            id: String(row.id ?? row.asignacion_id ?? `${persona.id}-${index}`),
            acuerdoId: row.acuerdo_id ? String(row.acuerdo_id) : null,
            nombre: String(row.nombre_acuerdo ?? row.servicio ?? row.rol ?? "Asignación"),
            categoria: String(row.unidad_negocio ?? row.categoria ?? "ASIGNACIONES"),
            valor: toNumber(row.saldo_pendiente ?? row.total_pendiente ?? row.importe ?? row.monto),
            moneda: String(row.moneda ?? "ARS")
          }))
        );
      }

      setLoading(false);
    }

    loadServicios();
  }, [monthValue, open, selectedPersona]);

  const filteredPersonas = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return personas;
    return personas.filter((persona) => persona.nombre.toLowerCase().includes(normalized));
  }, [personas, search]);

  const selectedServicios = useMemo(
    () => servicios.filter((servicio) => selectedItems[servicio.id]),
    [selectedItems, servicios]
  );

  const groupedServicios = useMemo(() => {
    return selectedPersona
      ? servicios.reduce<Record<string, ServicioVinculable[]>>((groups, servicio) => {
          groups[servicio.categoria] = [...(groups[servicio.categoria] ?? []), servicio];
          return groups;
        }, {})
      : {};
  }, [selectedPersona, servicios]);

  const totalSeleccionado = selectedServicios.reduce((sum, servicio) => sum + servicio.valor, 0);
  const importeAbsoluto = Math.abs(importe);
  const diferencia = totalSeleccionado - importeAbsoluto;

  const footerIngresoGasto = importe >= 0
    ? `Ingreso: ${formatMoney(importeAbsoluto)}`
    : `Gasto: ${formatMoney(importeAbsoluto)}`;
  const footerTotalLabel = importe >= 0
    ? `Total a cobrar: ${formatMoney(totalSeleccionado)}`
    : `Total a pagar: ${formatMoney(totalSeleccionado)}`;

  async function confirmLink(force = false) {
    if (!selectedPersona) return;

    if (diferencia > 0 && !force) {
      setConfirmOverflow(true);
      return;
    }

    const acuerdoId = selectedServicios[0]?.acuerdoId ?? null;
    const vinculo: VinculoMovimiento = {
      clienteId: selectedPersona.tipo === "cliente" ? selectedPersona.id : null,
      colaboradorId: selectedPersona.tipo === "colaborador" ? selectedPersona.id : null,
      acuerdoId,
      nombre: selectedPersona.nombre,
      tipo: selectedPersona.tipo
    };

    if (movimientoId) {
      const supabase = createClient();
      await supabase
        ?.from("movimientos")
        .update({
          cliente_id: vinculo.clienteId,
          colaborador_id: vinculo.colaboradorId,
          acuerdo_id: vinculo.acuerdoId,
          conciliado: true
        })
        .eq("id", movimientoId);
    }

    onLinked(vinculo);
    setConfirmOverflow(false);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-black">Vincular Movimiento</h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={showSoloClientes ? "Buscar cliente" : showSoloColaboradores ? "Buscar colaborador" : "Buscar persona/cliente"}
              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
          <button
            type="button"
            onClick={() => { window.location.href = crearHref; }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cubelo-blue px-4 text-sm font-bold text-white"
          >
            <UserPlus className="h-4 w-4" />
            {crearLabel}
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[32%_68%]">
          <div className="min-h-0 border-r border-gray-200">
            <div className="bg-[#1E2A6E] px-4 py-3 text-xs font-bold uppercase text-white">NOMBRE</div>
            <div className="max-h-[420px] overflow-y-auto">
              {filteredPersonas.map((persona) => (
                <button
                  key={`${persona.tipo}-${persona.id}`}
                  type="button"
                  onClick={() => setSelectedPersona(persona)}
                  className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    selectedPersona?.id === persona.id && selectedPersona.tipo === persona.tipo
                      ? "border-l-4 border-l-cubelo-blue bg-blue-50 text-cubelo-blue"
                      : "border-l-4 border-l-transparent text-gray-900"
                  }`}
                >
                  <span className="block text-sm font-bold">{persona.nombre}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{persona.subtitulo}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0">
            <div className="bg-[#1E2A6E] px-4 py-3 text-xs font-bold uppercase text-white">SELECCIONAR SERVICIO</div>
            <div className="max-h-[420px] overflow-y-auto p-4">
              <label className="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700">
                <span>{getMonthLabel(monthValue)}</span>
                <ChevronDown className="h-4 w-4" />
                <input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="w-0 opacity-0"
                  aria-label="Seleccionar mes"
                />
              </label>

              {!selectedPersona ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  Seleccioná una persona para ver los servicios disponibles.
                </div>
              ) : loading ? (
                <div className="p-8 text-center text-sm text-gray-500">Cargando servicios...</div>
              ) : servicios.length ? (
                <div className="space-y-4">
                  {Object.entries(groupedServicios).map(([categoria, items]) => (
                    <section key={categoria} className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between bg-[#EEF2FF] px-4 py-2 text-sm font-bold text-gray-900">
                        <span>{categoria}</span>
                        <span>{formatMoney(items.reduce((sum, item) => sum + item.valor, 0), items[0]?.moneda)}</span>
                      </div>
                      {items.map((servicio) => (
                        <label
                          key={servicio.id}
                          className="flex cursor-pointer items-center justify-between gap-4 border-t border-gray-100 px-4 py-3 hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedItems[servicio.id])}
                              onChange={(e) =>
                                setSelectedItems((current) => ({
                                  ...current,
                                  [servicio.id]: e.target.checked
                                }))
                              }
                              className="h-4 w-4 accent-cubelo-blue"
                            />
                            <span className="text-sm font-medium text-gray-800">{servicio.nombre}</span>
                          </span>
                          <span className="text-sm font-bold text-gray-900">{formatMoney(servicio.valor, servicio.moneda)}</span>
                        </label>
                      ))}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-red-100 bg-red-50 p-6">
                  <div className="flex items-start gap-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                      {selectedPersona.nombre} no tiene ningún servicio a pagar. ¿Desear vincular gasto de todas maneras?
                    </p>
                  </div>
                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => confirmLink(true)}
                      className="rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white"
                    >
                      Si, vincular
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
                    >
                      No, gracias
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="font-bold text-cubelo-blue">{footerIngresoGasto}</span>
              <span className="font-bold text-gray-900">{footerTotalLabel}</span>
              {diferencia > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-red-600">
                  <Info className="h-4 w-4" />
                  Restan: {formatMoney(diferencia)}
                </span>
              ) : null}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmLink(false)}
                disabled={!selectedPersona}
                className="rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>

        {confirmOverflow ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-xl font-bold text-black">Ups! Sobran {formatMoney(diferencia)} del total a cobrar.</h3>
              <p className="mt-2 text-sm text-gray-500">¿Estas seguro?</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOverflow(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
                >
                  No, volver atrás
                </button>
                <button
                  type="button"
                  onClick={() => confirmLink(true)}
                  className="rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white"
                >
                  Si, continuar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
