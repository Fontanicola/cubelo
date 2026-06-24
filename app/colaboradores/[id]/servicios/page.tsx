import { notFound } from "next/navigation";

import { ServiciosColaborador, type AssignmentServiceRow } from "@/app/colaboradores/[id]/servicios/ServiciosColaborador";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    month?: string;
    year?: string;
  };
};

type CollaboratorRecord = Record<string, unknown> & {
  id: string | number;
  nombre?: string | null;
};

type AssignmentRecord = Record<string, unknown> & {
  id: string | number;
  acuerdo_id?: string | number | null;
  presupuesto_item_id?: string | number | null;
  rol_id?: string | number | null;
  fee?: number | string | null;
  comprobante_url?: string | null;
  notas?: string | null;
};

function toNumber(value: string | undefined, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

export default async function ColaboradorServiciosPage({ params, searchParams }: PageProps) {
  const now = new Date();
  const month = toNumber(searchParams?.month, now.getMonth() + 1);
  const year = toNumber(searchParams?.year, now.getFullYear());
  const supabase = createClient();

  const [collaboratorResult, assignmentsResult, rolesResult] = await Promise.all([
    supabase.from("colaboradores").select("id, nombre").eq("id", params.id).maybeSingle(),
    supabase
      .from("asignaciones")
      .select("id, acuerdo_id, presupuesto_item_id, rol_id, fee, comprobante_url, notas")
      .eq("colaborador_id", params.id)
      .eq("mes_operacion", month)
      .eq("anio_operacion", year),
    supabase.from("roles").select("id, nombre, activo").eq("activo", true).order("nombre", { ascending: true })
  ]);

  if (collaboratorResult.error || !collaboratorResult.data) {
    if (collaboratorResult.error) {
      console.error("No se pudo cargar el colaborador", collaboratorResult.error);
    }
    notFound();
  }

  if (assignmentsResult.error) {
    console.error("No se pudieron cargar las asignaciones del colaborador", assignmentsResult.error);
  }

  if (rolesResult.error) {
    console.error("No se pudieron cargar los roles para servicios del colaborador", rolesResult.error);
  }

  const assignmentRows = (assignmentsResult.data ?? []) as AssignmentRecord[];
  const agreementIds = Array.from(new Set(assignmentRows.map((row) => String(row.acuerdo_id ?? "")).filter(Boolean)));
  const itemIds = Array.from(new Set(assignmentRows.map((row) => String(row.presupuesto_item_id ?? "")).filter(Boolean)));
  const roleIds = Array.from(new Set(assignmentRows.map((row) => String(row.rol_id ?? "")).filter(Boolean)));

  const [agreementsResult, itemsResult, clientsResult, categoriesResult, productsResult, servicesResult, selectedRolesResult] =
    await Promise.all([
      agreementIds.length ? supabase.from("acuerdos").select("id, cliente_id").in("id", agreementIds) : Promise.resolve({ data: [], error: null }),
      itemIds.length ? supabase.from("presupuesto_items").select("id, servicio_id, categoria_id, producto_id").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
      supabase.from("clientes").select("id, nombre"),
      supabase.from("categorias").select("id, nombre, servicio_id"),
      supabase.from("productos").select("id, nombre, pdv_ars"),
      supabase.from("servicios").select("id, nombre"),
      roleIds.length ? supabase.from("roles").select("id, nombre").in("id", roleIds) : Promise.resolve({ data: [], error: null })
    ]);

  [agreementsResult, itemsResult, clientsResult, categoriesResult, productsResult, servicesResult, selectedRolesResult].forEach((result, index) => {
    if (result.error) {
      const labels = ["acuerdos", "items", "clientes", "categorias", "productos", "servicios", "roles seleccionados"];
      console.error(`No se pudo cargar ${labels[index]} para servicios del colaborador`, result.error);
    }
  });

  const agreementsMap = new Map(
    ((agreementsResult.data ?? []) as Array<Record<string, unknown>>).map((agreement) => [String(agreement.id), agreement])
  );
  const itemsMap = new Map(
    ((itemsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => [String(item.id), item])
  );
  const clientsMap = new Map(
    ((clientsResult.data ?? []) as Array<Record<string, unknown>>).map((client) => [String(client.id), client])
  );
  const categoriesMap = new Map(
    ((categoriesResult.data ?? []) as Array<Record<string, unknown>>).map((category) => [String(category.id), category])
  );
  const productsMap = new Map(
    ((productsResult.data ?? []) as Array<Record<string, unknown>>).map((product) => [String(product.id), product])
  );
  const servicesMap = new Map(
    ((servicesResult.data ?? []) as Array<Record<string, unknown>>).map((service) => [String(service.id), service])
  );
  const rolesMap = new Map(
    ((selectedRolesResult.data ?? []) as Array<Record<string, unknown>>).map((role) => [String(role.id), role])
  );

  const rows: AssignmentServiceRow[] = assignmentRows.map((assignment) => {
    const agreement = agreementsMap.get(String(assignment.acuerdo_id ?? ""));
    const item = itemsMap.get(String(assignment.presupuesto_item_id ?? ""));
    const client = agreement?.cliente_id ? clientsMap.get(String(agreement.cliente_id)) : null;
    const category = item?.categoria_id ? categoriesMap.get(String(item.categoria_id)) : null;
    const product = item?.producto_id ? productsMap.get(String(item.producto_id)) : null;
    const service = item?.servicio_id ? servicesMap.get(String(item.servicio_id)) : null;
    const role = assignment.rol_id ? rolesMap.get(String(assignment.rol_id)) : null;

    return {
      id: String(assignment.id),
      acuerdoId: String(assignment.acuerdo_id ?? ""),
      clienteNombre: String(client?.nombre ?? "Cliente"),
      rolId: String(assignment.rol_id ?? ""),
      rolNombre: String(role?.nombre ?? "Rol"),
      servicioId: String(item?.servicio_id ?? ""),
      servicioNombre: String(service?.nombre ?? "Servicio"),
      categoriaId: String(item?.categoria_id ?? ""),
      categoriaNombre: String(category?.nombre ?? "Categoría"),
      productoNombre: String(product?.nombre ?? "Producto"),
      precioVenta: Number(product?.pdv_ars ?? 0),
      fee: Number(assignment.fee ?? 0),
      notas: assignment.notas ? String(assignment.notas) : null,
      comprobanteUrl: assignment.comprobante_url ? String(assignment.comprobante_url) : null
    };
  });

  return (
    <ServiciosColaborador
      colaborador={{
        id: String((collaboratorResult.data as CollaboratorRecord).id),
        nombre: String((collaboratorResult.data as CollaboratorRecord).nombre ?? "Colaborador")
      }}
      month={month}
      year={year}
      rows={rows}
      roles={(rolesResult.data ?? []).map((role) => ({
        id: String(role.id),
        nombre: role.nombre ?? "Rol"
      }))}
      categories={(categoriesResult.data ?? []).map((category) => ({
        id: String(category.id),
        nombre: category.nombre ?? "Categoría",
        servicioId: String(category.servicio_id ?? "")
      }))}
    />
  );
}
