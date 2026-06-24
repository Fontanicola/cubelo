import { notFound } from "next/navigation";

import { mapPresupuestoItem, type BudgetRecord, type PresupuestoItem } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/server";

export type ClienteRecord = Record<string, unknown> & {
  id: string | number;
  nombre?: string | null;
  nombre_comercial?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  cuit?: string | null;
  tipo_comprobante?: string | null;
  notas?: string | null;
  fecha_inicio?: string | null;
  activo?: boolean | null;
};

type SimpleRecord = Record<string, unknown>;

function groupByBudget(items: PresupuestoItem[]) {
  return items.reduce<Record<string, PresupuestoItem[]>>((acc, item) => {
    acc[item.presupuestoId] = [...(acc[item.presupuestoId] ?? []), item];
    return acc;
  }, {});
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

  const categoryFromProduct = product?.categoria_id ? categoryMap.get(String(product.categoria_id)) ?? null : null;
  const serviceFromProduct =
    categoryFromProduct?.servicio_id ? serviceMap.get(String(categoryFromProduct.servicio_id)) ?? null : null;

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
          categorias: categoryFromProduct
            ? {
                id: categoryFromProduct.id,
                nombre: categoryFromProduct.nombre,
                servicio_id: categoryFromProduct.servicio_id,
                servicios: serviceFromProduct
                  ? {
                      id: serviceFromProduct.id,
                      nombre: serviceFromProduct.nombre
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

export async function loadClienteData(paramsId: string) {
  const supabase = createClient();
  const [
    clienteResult,
    presupuestosResult,
    itemsResult,
    acuerdosResult,
    cobrosResult,
    serviciosResult,
    categoriasResult,
    productosResult
  ] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", paramsId).single(),
    supabase.from("presupuestos").select("*").eq("cliente_id", paramsId).order("created_at", { ascending: false }),
    supabase.from("presupuesto_items").select("*").order("orden", { ascending: true }),
    supabase
      .from("acuerdos")
      .select("*")
      .eq("cliente_id", paramsId)
      .order("anio_operacion", { ascending: false })
      .order("mes_operacion", { ascending: false }),
    supabase
      .from("cobros")
      .select("*, acuerdos!inner(id, cliente_id, presupuesto_id, mes_operacion, anio_operacion, total, moneda)")
      .eq("acuerdos.cliente_id", paramsId)
      .order("created_at", { ascending: false }),
    supabase.from("servicios").select("id, nombre, activo, orden"),
    supabase.from("categorias").select("id, servicio_id, nombre, activo, orden"),
    supabase
      .from("productos")
      .select("id, categoria_id, nombre, pdv_ars, pdv_usd, costo_total, es_plan_mensual, periodo_minimo_meses, activo, orden")
  ]);

  if (clienteResult.error || !clienteResult.data) {
    if (clienteResult.error) {
      console.error("No se pudo cargar el cliente", clienteResult.error);
    }

    notFound();
  }

  [presupuestosResult, itemsResult, acuerdosResult, cobrosResult, serviciosResult, categoriasResult, productosResult].forEach((result, index) => {
    if (result.error) {
      const labels = ["presupuestos", "items", "acuerdos", "cobros", "servicios", "categorias", "productos"];
      console.error(`No se pudieron cargar ${labels[index]} del cliente`, result.error);
    }
  });

  const serviceMap = new Map<string, SimpleRecord>(
    ((serviciosResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const categoryMap = new Map<string, SimpleRecord>(
    ((categoriasResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );
  const productMap = new Map<string, SimpleRecord>(
    ((productosResult.data ?? []) as SimpleRecord[]).map((item) => [String(item.id), item])
  );

  const items = ((itemsResult.data ?? []) as SimpleRecord[]).map((item) =>
    buildItemRecord(item, serviceMap, categoryMap, productMap)
  );
  const itemsByBudget = groupByBudget(items);

  const presupuestos = ((presupuestosResult.data ?? []) as BudgetRecord[]).map((presupuesto) => ({
    ...presupuesto,
    items: itemsByBudget[String(presupuesto.id)] ?? []
  }));

  const acuerdos = ((acuerdosResult.data ?? []) as SimpleRecord[]).map((acuerdo) => ({
    id: String(acuerdo.id),
    ...acuerdo,
    presupuestoItems: itemsByBudget[String(acuerdo.presupuesto_id)] ?? []
  }));

  return {
    cliente: clienteResult.data as ClienteRecord,
    presupuestos,
    acuerdos,
    cobros: (cobrosResult.data ?? []) as SimpleRecord[]
  };
}
