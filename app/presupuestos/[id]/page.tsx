import { notFound } from "next/navigation";

import { VistaPresupuesto } from "@/app/presupuestos/[id]/VistaPresupuesto";
import { mapPresupuestoItem, type BudgetRecord, type ClientePresupuesto, type PresupuestoItem } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

type PageProps = {
  params: {
    id: string;
  };
};

type SimpleRecord = Record<string, unknown>;

function asString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

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

async function loadBudgetPage(paramsId: string) {
  const supabase = createClient();
  const presupuestoResult = await supabase.from("presupuestos").select("*").eq("id", paramsId).maybeSingle();

  if (presupuestoResult.error || !presupuestoResult.data) {
    if (presupuestoResult.error) {
      console.error("No se pudo cargar el presupuesto", presupuestoResult.error);
    }

    notFound();
  }

  const presupuesto = presupuestoResult.data as BudgetRecord;

  const [itemsResult, clienteResult, servicesResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from("presupuesto_items").select("*").eq("presupuesto_id", paramsId).order("orden", { ascending: true }),
    supabase.from("clientes").select("id, nombre").eq("id", String(presupuesto.cliente_id ?? "")).maybeSingle(),
    supabase.from("servicios").select("id, nombre, activo, orden"),
    supabase.from("categorias").select("id, servicio_id, nombre, activo, orden"),
    supabase.from("productos").select("id, categoria_id, nombre, pdv_ars, pdv_usd, costo_total, es_plan_mensual, periodo_minimo_meses, activo, orden")
  ]);

  if (itemsResult.error) {
    console.error("No se pudieron cargar los items del presupuesto", itemsResult.error);
  }

  if (clienteResult.error) {
    console.error("No se pudo cargar el cliente del presupuesto", clienteResult.error);
  }

  const serviceMap = new Map<string, SimpleRecord>(
    ((servicesResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const categoryMap = new Map<string, SimpleRecord>(
    ((categoriesResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const productMap = new Map<string, SimpleRecord>(
    ((productsResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );

  const items = ((itemsResult.data ?? []) as SimpleRecord[]).map((item) =>
    buildItemRecord(item, serviceMap, categoryMap, productMap)
  );
  const cliente: ClientePresupuesto = {
    id: String(presupuesto.cliente_id ?? clienteResult.data?.id ?? ""),
    nombre: asString(clienteResult.data?.nombre) ?? "Cliente"
  };

  return { presupuesto, cliente, items };
}

export default async function PresupuestoPage({ params }: PageProps) {
  const { presupuesto, cliente, items } = await loadBudgetPage(params.id);

  return (
    <VistaPresupuesto presupuesto={presupuesto} cliente={cliente} items={items} />
  );
}
