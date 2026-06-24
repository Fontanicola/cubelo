"use client";

import { CalendarDays, CheckCircle, Plus, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ProductoOption,
  UnidadOption,
  WizardProvider,
  useWizard
} from "@/app/acuerdos/nuevo/WizardContext";
import { ResumenDetalle } from "@/components/acuerdos/ResumenDetalle";
import { createClient } from "@/lib/supabase/client";

function asString(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-AR")}.-`;
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsed);
}

function ResumenInner() {
  const router = useRouter();
  const { state, setState, reset } = useWizard();
  const [unidades, setUnidades] = useState<UnidadOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      return;
    }
    const client = supabase;

    async function loadData() {
      const [unidadesResult, productosResult] = await Promise.all([
        client.from("unidades_negocio").select("id,nombre").order("nombre", { ascending: true }),
        client.from("productos").select("*")
      ]);

      if (unidadesResult.data) {
        setUnidades(
          unidadesResult.data.map((unidad) => ({
            id: String(unidad.id),
            nombre: unidad.nombre ?? "Unidad"
          }))
        );
      }

      if (productosResult.data) {
        setProductos(
          (productosResult.data as Record<string, unknown>[]).map((producto) => ({
            id: String(producto.id),
            nombre: asString(producto.nombre ?? producto.descripcion ?? producto.categoria_id) || "Producto",
            unidadNegocioId: asString(producto.unidad_negocio_id),
            precioArs: asNumber(producto.precio_ars ?? producto.importe_ars ?? producto.precio ?? producto.valor),
            raw: producto
          }))
        );
      }
    }

    loadData();
  }, []);

  const productIds = Object.values(state.productsByUnit).flat();
  const serviceUnits = useMemo(() => {
    const matched = unidades.filter((unidad) => state.selectedUnitIds.includes(unidad.id));
    const fallback = [
      { id: "fallback-redes", nombre: "Redes" },
      { id: "fallback-audiovisual", nombre: "Audiovisual" },
      { id: "fallback-adicional", nombre: "Adicional" }
    ].filter((unidad) => state.selectedUnitIds.includes(unidad.id));

    return matched.length ? unidades : [...unidades, ...fallback];
  }, [state.selectedUnitIds, unidades]);
  const customProducts = Object.values(state.customProductsByUnit).flat();
  const productTotal = useMemo(
    () =>
      productIds.reduce(
        (sum, productId) => sum + (productos.find((producto) => producto.id === productId)?.precioArs ?? 0),
        0
      ),
    [productIds, productos]
  );
  const detailTotals = Object.values(state.detailsByUnit)
    .map((detail) => detail.montoTotal)
    .filter((value): value is number => typeof value === "number");
  const montoTotal = state.manualTotal ?? (detailTotals.length ? detailTotals.reduce((sum, item) => sum + item, 0) : productTotal);
  const feeTotal = Object.values(state.personalRowsByUnit)
    .flat()
    .reduce((sum, row) => sum + Number(row.feeAcordado ?? 0), 0);
  const utilidad = montoTotal - feeTotal;
  const missingCollaborators = Object.values(state.personalRowsByUnit)
    .flat()
    .filter((row) => !row.colaboradorId).length;

  async function finish() {
    setSaving(true);
    setErrorMessage("");
    setWarning(missingCollaborators ? `Falta ${missingCollaborators} Colaborador${missingCollaborators === 1 ? "" : "es"}` : "");

    const supabase = createClient();

    if (!supabase) {
      setErrorMessage("Error al guardar el servicio");
      setSaving(false);
      return;
    }

    const [year, month] = state.fecha.split("-").map(Number);
    const selectedDetails = Object.values(state.detailsByUnit);
    const firstDetail = selectedDetails[0] ?? { tipoCobro: "completo" as const };
    const locacion = state.locacion || selectedDetails.find((detail) => detail.locacion)?.locacion || "";
    const notas = JSON.stringify({
      tipo_cobro: firstDetail.tipoCobro,
      monto_anticipo: firstDetail.montoAnticipo ?? 0,
      locacion
    });
    const productId = productIds[0] ?? null;
    const skuTexto = JSON.stringify([...productIds.slice(1), ...customProducts]);
    const userResult = await supabase.auth.getUser();

    const acuerdoPayload = {
      cliente_id: state.clienteId,
      nombre_acuerdo: state.detalle,
      mes_operacion: month,
      anio_operacion: year,
      producto_id: productId,
      sku_texto: skuTexto,
      moneda: "ARS",
      importe_bruto: montoTotal,
      importe_neto: montoTotal,
      tc: 1,
      importe_ars: montoTotal,
      link_referencia: state.linkReferencia || null,
      notas,
      estado: "activo",
      created_by: userResult.data.user?.id ?? null
    };

    const acuerdoResult = await supabase.from("acuerdos").insert(acuerdoPayload).select("id").single();

    if (acuerdoResult.error || !acuerdoResult.data?.id) {
      console.error("No se pudo guardar el acuerdo", acuerdoResult.error);
      setErrorMessage("Error al guardar el servicio");
      setSaving(false);
      return;
    }

    const acuerdoId = String(acuerdoResult.data.id);
    const rows = Object.values(state.personalRowsByUnit)
      .flat()
      .filter((row) => row.colaboradorId);
    const asignaciones = rows.map((row) => ({
      acuerdo_id: acuerdoId,
      colaborador_id: row.colaboradorId,
      rol_servicio: row.rol,
      moneda: "ARS",
      fee_acordado: row.feeAcordado,
      tc: 1,
      fee_ars: row.feeAcordado,
      estado_pago: row.estadoPago,
      mes_operacion: month,
      anio_operacion: year,
      mes_pago: month,
      anio_pago: year,
      notas: row.nota ?? null
    }));

    if (asignaciones.length) {
      let asignacionesResult = await supabase.from("asignaciones").insert(asignaciones);

      if (asignacionesResult.error) {
        const fallback = asignaciones.map(({ mes_operacion, anio_operacion, ...row }) => row);
        asignacionesResult = await supabase.from("asignaciones").insert(fallback);
      }

      if (asignacionesResult.error) {
        console.error("No se pudieron guardar las asignaciones", asignacionesResult.error);
        setErrorMessage("Error al guardar el servicio");
        setSaving(false);
        return;
      }
    }

    reset();
    router.push(`/clientes/${state.clienteId}`);
  }

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="border-l-4 border-cubelo-blue pl-4">
        <h1 className="text-3xl font-bold text-black">Resúmen</h1>
        <p className="mt-1 text-base font-medium italic text-gray-400">Nuevo Servicio</p>
      </div>

      {warning ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {warning}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <article className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-[#EEF2FF] shadow-sm">
        <div className="px-5 py-4 text-sm font-bold uppercase text-cubelo-blue">Nuevo Servicio</div>
        <div className="grid gap-4 px-5 pb-5 lg:grid-cols-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Fecha <Link href="/acuerdos/nuevo" className="ml-2 normal-case">Editar</Link></span>
            <div className="mt-1 flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-gray-800">
              <CalendarDays className="h-4 w-4 text-cubelo-blue" />
              {formatDate(state.fecha)}
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Cliente <Link href="/acuerdos/nuevo" className="ml-2 normal-case">Editar</Link></span>
            <input readOnly value={state.clienteNombre} className="mt-1 h-10 w-full rounded-md bg-white px-3 text-sm font-semibold text-gray-800" />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Detalle para el Cliente <Link href="/acuerdos/nuevo" className="ml-2 normal-case">Editar</Link></span>
            <input readOnly value={state.detalle} className="mt-1 h-10 w-full rounded-md bg-white px-3 text-sm font-semibold text-gray-800" />
          </label>
        </div>

        <div className="px-5 pb-5">
          <ResumenDetalle unidades={serviceUnits} productos={productos} />
        </div>

        <footer className="flex flex-col gap-3 bg-gray-100 px-5 py-4 lg:flex-row lg:justify-end">
          <div className="text-sm font-bold text-gray-900">Monto total {formatMoney(montoTotal)}</div>
          <div className="text-sm font-bold text-gray-900">Utilidad {formatMoney(utilidad)}</div>
        </footer>
      </article>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/acuerdos/nuevo"
          className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-5 py-2.5 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Sumar Servicio
        </Link>
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8] disabled:bg-gray-300"
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          {saving ? "Guardando" : "Finalizar"}
        </button>
      </div>

      {confirmCancel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-black">¿Cancelar servicio?</h2>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Volver
              </button>
              <Link
                href="/"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function ResumenPage() {
  return (
    <WizardProvider>
      <ResumenInner />
    </WizardProvider>
  );
}
