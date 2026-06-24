import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PresupuestosTable, type PresupuestoListRow } from "@/app/presupuestos/PresupuestosTable";
import { mapPresupuestoItem, type BudgetRecord } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

type SimpleRecord = Record<string, unknown>;

function buildItemRecord(
  item: SimpleRecord,
  serviceMap: Map<string, SimpleRecord>,
  categoryMap: Map<string, SimpleRecord>,
  productMap: Map<string, SimpleRecord>
) {
  const product = item.producto_id ? productMap.get(String(item.producto_id)) ?? null : null;
  const category = item.categoria_id ? categoryMap.get(String(item.categoria_id)) ?? null : null;
  const service = item.servicio_id ? serviceMap.get(String(item.servicio_id)) ?? null : null;
  const serviceFromCategory = category?.servicio_id ? serviceMap.get(String(category.servicio_id)) ?? null : null;

  return mapPresupuestoItem({
    ...item,
    productos: product
      ? {
          id: product.id,
          nombre: product.nombre,
          pdv_ars: product.pdv_ars,
          pdv_usd: product.pdv_usd,
          costo_total: product.costo_total,
          es_plan_mensual: product.es_plan_mensual,
          periodo_minimo_meses: product.periodo_minimo_meses,
          activo: product.activo,
          orden: product.orden,
          categorias: category
            ? {
                id: category.id,
                nombre: category.nombre,
                servicio_id: category.servicio_id,
                servicios: serviceFromCategory
                  ? {
                      id: serviceFromCategory.id,
                      nombre: serviceFromCategory.nombre
                    }
                  : null
              }
            : null
        }
      : null,
    categorias: category
      ? {
          id: category.id,
          nombre: category.nombre,
          servicio_id: category.servicio_id,
          servicios: service
            ? {
                id: service.id,
                nombre: service.nombre
              }
            : null
        }
      : null
  });
}

async function loadPresupuestos() {
  const supabase = createClient();
  const [presupuestosResult, clientesResult, itemsResult, serviciosResult, categoriasResult, productosResult] =
    await Promise.all([
      supabase.from("presupuestos").select("*").order("fecha", { ascending: false }),
      supabase.from("clientes").select("id, nombre"),
      supabase.from("presupuesto_items").select("*").order("orden", { ascending: true }),
      supabase.from("servicios").select("id, nombre, activo, orden"),
      supabase.from("categorias").select("id, servicio_id, nombre, activo, orden"),
      supabase
        .from("productos")
        .select("id, categoria_id, nombre, pdv_ars, pdv_usd, costo_total, es_plan_mensual, periodo_minimo_meses, activo, orden")
    ]);

  [presupuestosResult, clientesResult, itemsResult, serviciosResult, categoriasResult, productosResult].forEach(
    (result, index) => {
      if (result.error) {
        const labels = ["presupuestos", "clientes", "items", "servicios", "categorias", "productos"];
        console.error(`No se pudo cargar ${labels[index]} para la pantalla de presupuestos`, result.error);
      }
    }
  );

  const serviceMap = new Map<string, SimpleRecord>(
    ((serviciosResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const categoryMap = new Map<string, SimpleRecord>(
    ((categoriasResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const productMap = new Map<string, SimpleRecord>(
    ((productosResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const clientMap = new Map<string, string>(
    ((clientesResult.data ?? []) as Array<{ id: string | number; nombre?: string | null }>).map((client) => [
      String(client.id),
      client.nombre ?? "Cliente"
    ])
  );

  const mappedItems = ((itemsResult.data ?? []) as SimpleRecord[]).map((item) =>
    buildItemRecord(item, serviceMap, categoryMap, productMap)
  );
  const itemsByBudget = mappedItems.reduce<Record<string, ReturnType<typeof buildItemRecord>[]>>((acc, item) => {
    acc[item.presupuestoId] = [...(acc[item.presupuestoId] ?? []), item];
    return acc;
  }, {});

  return ((presupuestosResult.data ?? []) as BudgetRecord[]).map((presupuesto) => ({
    ...presupuesto,
    id: String(presupuesto.id),
    clienteNombre: clientMap.get(String(presupuesto.cliente_id ?? "")) ?? "Cliente",
    items: itemsByBudget[String(presupuesto.id)] ?? []
  })) satisfies PresupuestoListRow[];
}

export default async function PresupuestosPage() {
  const rows = await loadPresupuestos();

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex items-start gap-4">
        <Link
          href="/"
          className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Presupuestos</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">
            Seguimiento de propuestas, estados y servicios cargados.
          </p>
        </div>
      </div>

      <PresupuestosTable rows={rows} />
    </section>
  );
}
