import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { MovimientosClient } from "@/app/admin/movimientos/MovimientosClient";
import { type MovimientoRow } from "@/app/admin/movimientos/types";
import { type CategoriaMovimientoOption } from "@/components/movimientos/PopoverCategoria";
import { type CuentaMovimientoOption } from "@/components/movimientos/PopoverMetodoPago";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const BANCARIOS_TIPOS = new Set(["banco", "tarjeta", "caja_ahorro", "cuenta_corriente"]);

type RecordLike = Record<string, unknown>;

function getString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function getNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

export default async function MovimientosPage() {
  const supabase = createClient();
  const [movimientosResult, cuentasResult, categoriasResult, clientesResult, colaboradoresResult] =
    await Promise.all([
      supabase.from("movimientos").select("*").order("fecha", { ascending: false }),
      supabase.from("cuentas").select("id, nombre, tipo"),
      supabase.from("categorias_movimiento").select("id, nombre"),
      supabase.from("clientes").select("id, razon_social, nombre_comercial"),
      supabase.from("colaboradores").select("id, nombre")
    ]);

  if (movimientosResult.error) console.error("No se pudieron cargar los movimientos", movimientosResult.error);
  if (cuentasResult.error) console.error("No se pudieron cargar las cuentas", cuentasResult.error);
  if (categoriasResult.error) console.error("No se pudieron cargar las categorias_movimiento", categoriasResult.error);
  if (clientesResult.error) console.error("No se pudieron cargar los clientes para movimientos", clientesResult.error);
  if (colaboradoresResult.error) console.error("No se pudieron cargar los colaboradores para movimientos", colaboradoresResult.error);

  const cuentaById = new Map(
    (cuentasResult.data ?? []).map((cuenta: RecordLike) => [
      String(cuenta.id),
      {
        id: String(cuenta.id),
        nombre: String(cuenta.nombre ?? "Cuenta"),
        tipo: getString(cuenta.tipo),
        color: null
      }
    ])
  );

  const categoriaById = new Map(
    (categoriasResult.data ?? []).map((categoria: RecordLike) => [
      String(categoria.id),
      {
        id: String(categoria.id),
        nombre: String(categoria.nombre ?? "Categoría"),
        color: null
      }
    ])
  );

  const clienteById = new Map(
    (clientesResult.data ?? []).map((cliente: RecordLike) => [
      String(cliente.id),
      String(cliente.razon_social ?? cliente.nombre_comercial ?? "Cliente")
    ])
  );

  const colaboradorById = new Map(
    (colaboradoresResult.data ?? []).map((colaborador: RecordLike) => [
      String(colaborador.id),
      String(colaborador.nombre ?? "Colaborador")
    ])
  );

  const categorias: CategoriaMovimientoOption[] = Array.from(categoriaById.values());
  const cuentas: CuentaMovimientoOption[] = Array.from(cuentaById.values());

  const allRows: MovimientoRow[] =
    movimientosResult.data?.map((movimiento: RecordLike) => {
      const cuentaId = getString(movimiento.cuenta_id);
      const categoriaId = getString(movimiento.categoria_id);
      const clienteId = getString(movimiento.cliente_id);
      const colaboradorId = getString(movimiento.colaborador_id);
      const cuenta = cuentaId ? cuentaById.get(cuentaId) : null;
      const categoria = categoriaId ? categoriaById.get(categoriaId) : null;

      return {
        id: String(movimiento.id),
        fecha: getString(movimiento.fecha),
        descripcion: getString(movimiento.descripcion),
        notas: getString(movimiento.notas),
        referencia: getString(movimiento.referencia ?? movimiento.comprobante),
        importe: getNumber(movimiento.importe),
        saldo: movimiento.saldo === null || movimiento.saldo === undefined ? null : getNumber(movimiento.saldo),
        moneda: getString(movimiento.moneda),
        origen: getString(movimiento.origen),
        conciliado: Boolean(movimiento.conciliado),
        categoriaId,
        categoriaNombre: categoria?.nombre ?? null,
        categoriaColor: categoria?.color ?? null,
        descripcionResumida: getString(movimiento.descripcion_resumida),
        cuentaId,
        cuentaNombre: cuenta?.nombre ?? null,
        cuentaTipo: cuenta?.tipo ?? null,
        clienteId,
        clienteNombre: clienteId ? clienteById.get(clienteId) ?? null : null,
        colaboradorId,
        colaboradorNombre: colaboradorId ? colaboradorById.get(colaboradorId) ?? null : null,
        acuerdoId: getString(movimiento.acuerdo_id)
      };
    }) ?? [];

  const bancariosRows = allRows.filter((row) => {
    if (!row.cuentaId) return false;
    const cuenta = cuentaById.get(row.cuentaId);
    return cuenta ? BANCARIOS_TIPOS.has(cuenta.tipo ?? "") : false;
  });

  const otrosRows = allRows.filter((row) => {
    if (!row.cuentaId) return true;
    const cuenta = cuentaById.get(row.cuentaId);
    return cuenta ? !BANCARIOS_TIPOS.has(cuenta.tipo ?? "") : true;
  });

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
          <h1 className="text-3xl font-bold text-black">Movimientos</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">
            Movimientos bancarios, otros importes y conciliación.
          </p>
        </div>
      </div>

      <MovimientosClient
        bancariosRows={bancariosRows}
        otrosRows={otrosRows}
        categorias={categorias}
        cuentas={cuentas}
      />
    </section>
  );
}
