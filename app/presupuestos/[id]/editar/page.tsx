import { notFound } from "next/navigation";

import { EditorPresupuesto } from "@/app/presupuestos/[id]/editar/EditorPresupuesto";
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

function buildItemRecord(item: SimpleRecord, serviceMap: Map<string, SimpleRecord>, categoryMap: Map<string, SimpleRecord>, productMap: Map<string, SimpleRecord>) {
  const product = item.producto_id ? productMap.get(String(item.producto_id)) ?? null : null;
  const category = item.categoria_id ? categoryMap.get(String(item.categoria_id)) ?? null : null;
  const service = item.servicio_id ? serviceMap.get(String(item.servicio_id)) ?? null : null;

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
                servicios: service
                  ? {
                      id: service.id,
                      nombre: service.nombre
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

export default async function EditarPresupuestoPage({ params }: PageProps) {
  const supabase = createClient();
  const presupuestoResult = await supabase.from("presupuestos").select("*").eq("id", params.id).maybeSingle();

  if (presupuestoResult.error) {
    console.error("No se pudo cargar el presupuesto", presupuestoResult.error);
  }

  if (!presupuestoResult.data) {
    notFound();
  }

  const presupuesto = presupuestoResult.data as BudgetRecord;
  const clienteId = String(presupuesto.cliente_id ?? "");

  const [clienteResult, itemsResult, servicesResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from("clientes").select("id, nombre").eq("id", clienteId).maybeSingle(),
    supabase.from("presupuesto_items").select("*").eq("presupuesto_id", params.id).order("orden", { ascending: true }),
    supabase.from("servicios").select("id, nombre, activo, orden"),
    supabase.from("categorias").select("id, servicio_id, nombre, activo, orden"),
    supabase.from("productos").select("id, categoria_id, nombre, pdv_ars, pdv_usd, costo_total, es_plan_mensual, periodo_minimo_meses, activo, orden")
  ]);

  if (clienteResult.error) console.error("No se pudo cargar el cliente del presupuesto", clienteResult.error);
  if (itemsResult.error) console.error("No se pudieron cargar los items del presupuesto", itemsResult.error);
  if (servicesResult.error) console.error("No se pudieron cargar los servicios", servicesResult.error);
  if (categoriesResult.error) console.error("No se pudieron cargar las categorias", categoriesResult.error);
  if (productsResult.error) console.error("No se pudieron cargar los productos", productsResult.error);

  if (!clienteResult.data) {
    notFound();
  }

  const serviceMap = new Map<string, SimpleRecord>((servicesResult.data ?? []).map((item: SimpleRecord) => [String(item.id), item]));
  const categoryMap = new Map<string, SimpleRecord>((categoriesResult.data ?? []).map((item: SimpleRecord) => [String(item.id), item]));
  const productMap = new Map<string, SimpleRecord>((productsResult.data ?? []).map((item: SimpleRecord) => [String(item.id), item]));

  const items = ((itemsResult.data ?? []) as SimpleRecord[]).map((item) => buildItemRecord(item, serviceMap, categoryMap, productMap));

  const cliente: ClientePresupuesto = {
    id: String(clienteResult.data.id),
    nombre: asString(clienteResult.data.nombre) ?? "Cliente"
  };

  return <EditorPresupuesto presupuesto={presupuesto} cliente={cliente} initialItems={items} />;
}
