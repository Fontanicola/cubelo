import type { SupabaseClient } from "@supabase/supabase-js";

export const MONTH_NAMES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE"
];

export type PresupuestoEstado = "esperando_aprobacion" | "aprobado" | "rechazado";

export const PRESUPUESTO_ESTADOS: Array<{
  value: PresupuestoEstado;
  label: string;
  color: string;
}> = [
  { value: "esperando_aprobacion", label: "ESPERANDO APROBACIÓN", color: "#D97706" },
  { value: "aprobado", label: "APROBADO", color: "#16A34A" },
  { value: "rechazado", label: "RECHAZADO", color: "#DC2626" }
];

export type BudgetRecord = Record<string, unknown> & {
  id: string | number;
  cliente_id?: string | number | null;
  fecha?: string | null;
  estado?: string | null;
  descuento_porcentaje?: number | string | null;
  total_bruto?: number | string | null;
  total_neto?: number | string | null;
  moneda?: string | null;
  notas?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientePresupuesto = {
  id: string;
  nombre: string;
};

export type BudgetServiceNode = {
  id: string;
  nombre: string;
};

export type BudgetCategoryNode = {
  id: string;
  nombre: string;
  servicioId: string | null;
  servicioNombre: string;
};

export type BudgetProductNode = {
  id: string;
  nombre: string;
  categoriaId: string | null;
  categoriaNombre: string;
  servicioId: string | null;
  servicioNombre: string;
  pdvArs: number;
  pdvUsd: number | null;
  costoTotal: number | null;
  esPlanMensual: boolean;
  periodoMinimoMeses: number | null;
  activo: boolean;
  orden: number | null;
};

export type BudgetCollaboratorAssignment = {
  colaboradorId: string;
  colaboradorNombre: string;
  rolId: string | null;
  rolNombre: string | null;
  costo: number;
};

export type PresupuestoItem = {
  id: string;
  presupuestoId: string;
  servicioId: string | null;
  servicioNombre: string;
  categoriaId: string | null;
  categoriaNombre: string;
  productoId: string | null;
  productoNombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  esPlanMensual: boolean;
  periodoMeses: number | null;
  diaPago: number | null;
  renovacionAutomatica: boolean;
  orden: number | null;
  collaborators: BudgetCollaboratorAssignment[];
  raw: Record<string, unknown>;
};

export type PresupuestoGroup = {
  key: string;
  servicioId: string | null;
  servicioNombre: string;
  total: number;
  items: PresupuestoItem[];
};

function asString(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(value) || 0;
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

export function normalizePresupuestoEstado(value?: string | null): PresupuestoEstado {
  if (value === "aprobado" || value === "rechazado") {
    return value;
  }

  return "esperando_aprobacion";
}

export function getPresupuestoEstadoMeta(value?: string | null) {
  const normalized = normalizePresupuestoEstado(value);

  return PRESUPUESTO_ESTADOS.find((item) => item.value === normalized) ?? PRESUPUESTO_ESTADOS[0];
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsed);
}

export function formatMoney(value?: number | string | null, currency = "ARS") {
  const amount = Number(value ?? 0);

  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString("es-AR")}.-`;
  }
}

function readNode(record: Record<string, unknown>, key: string, fallbackKey?: string) {
  const value = record[key] ?? (fallbackKey ? record[fallbackKey] : undefined);
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readServiceFromCategory(category: Record<string, unknown> | null) {
  const service = category ? readNode(category, "servicios", "servicio") : null;

  return {
    id: asString(category?.servicio_id ?? service?.id),
    nombre: asString(service?.nombre ?? category?.servicio_nombre ?? category?.nombre_servicio) ?? "Servicio"
  };
}

function readCategoryFromProduct(product: Record<string, unknown> | null) {
  const category = product ? readNode(product, "categorias", "categoria") : null;
  const service = readServiceFromCategory(category);

  return {
    id: asString(product?.categoria_id ?? category?.id),
    nombre: asString(category?.nombre ?? product?.categoria_nombre ?? product?.nombre_categoria) ?? "Categoría",
    servicioId: service.id,
    servicioNombre: service.nombre
  };
}

export function mapPresupuestoItem(item: Record<string, unknown>): PresupuestoItem {
  const producto = readNode(item, "productos", "producto");
  const categoria = producto ? readNode(producto, "categorias", "categoria") : readNode(item, "categorias", "categoria");
  const service = readServiceFromCategory(categoria);
  const category = readCategoryFromProduct(producto ?? {});

  const collaborators = Array.isArray(item.presupuesto_item_colaboradores)
    ? item.presupuesto_item_colaboradores
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }

          const record = row as Record<string, unknown>;
          const colaborador = readNode(record, "colaboradores", "colaborador");
          const rol = readNode(record, "roles", "rol");

          return {
            colaboradorId: asString(record.colaborador_id ?? colaborador?.id) ?? "",
            colaboradorNombre: asString(colaborador?.nombre) ?? "Colaborador",
            rolId: asString(record.rol_id ?? rol?.id),
            rolNombre: asString(rol?.nombre),
            costo: asNumber(record.costo)
          } satisfies BudgetCollaboratorAssignment;
        })
        .filter((value): value is BudgetCollaboratorAssignment => Boolean(value && value.colaboradorId))
    : [];

  return {
    id: String(item.id),
    presupuestoId: String(item.presupuesto_id),
    servicioId: asString(item.servicio_id ?? category.servicioId),
    servicioNombre: asString(service.nombre) ?? category.servicioNombre,
    categoriaId: asString(item.categoria_id ?? category.id),
    categoriaNombre: asString(category.nombre) ?? "Categoría",
    productoId: asString(item.producto_id ?? producto?.id),
    productoNombre: asString(producto?.nombre ?? item.producto_nombre ?? item.descripcion) ?? "Producto",
    precioUnitario: asNumber(item.precio_unitario ?? producto?.pdv_ars ?? item.importe ?? item.total),
    cantidad: asNumber(item.cantidad) || 1,
    subtotal: asNumber(item.subtotal ?? item.precio_unitario ?? producto?.pdv_ars ?? item.importe),
    esPlanMensual: asBoolean(item.es_plan_mensual ?? producto?.es_plan_mensual),
    periodoMeses: item.periodo_meses === null || item.periodo_meses === undefined ? asNumber(producto?.periodo_minimo_meses) || null : asNumber(item.periodo_meses),
    diaPago: item.dia_pago === null || item.dia_pago === undefined ? null : asNumber(item.dia_pago),
    renovacionAutomatica: asBoolean(item.renovacion_automatica),
    orden: item.orden === null || item.orden === undefined ? null : asNumber(item.orden),
    collaborators,
    raw: item
  };
}

export function groupItemsByServicio(items: PresupuestoItem[]) {
  const groups = new Map<string, PresupuestoGroup>();

  items.forEach((item) => {
    const key = item.servicioId ? `${item.servicioId}:${item.servicioNombre}` : item.servicioNombre;
    const current =
      groups.get(key) ??
      ({
        key,
        servicioId: item.servicioId,
        servicioNombre: item.servicioNombre,
        total: 0,
        items: []
      } satisfies PresupuestoGroup);

    current.items.push(item);
    current.total += item.subtotal || item.precioUnitario * item.cantidad;
    groups.set(key, current);
  });

  return Array.from(groups.values());
}

export function getPresupuestoTotal(items: PresupuestoItem[]) {
  return items.reduce((sum, item) => sum + (item.subtotal || item.precioUnitario * item.cantidad), 0);
}

export function getNetTotal(totalBruto: number, descuentoPorcentaje: number) {
  return totalBruto - totalBruto * (descuentoPorcentaje / 100);
}

export async function fetchPresupuestoItems(supabase: SupabaseClient, presupuestoId: string) {
  return supabase
    .from("presupuesto_items")
    .select("*")
    .eq("presupuesto_id", presupuestoId)
    .order("orden", { ascending: true });
}

export function formatBudgetDate(value?: string | null) {
  return formatDate(value);
}

export function formatBudgetMoney(value: number) {
  return formatMoney(value);
}
