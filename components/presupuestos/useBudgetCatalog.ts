"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type ServiceOption = {
  id: string;
  nombre: string;
};

export type CategoryOption = {
  id: string;
  servicioId: string | null;
  nombre: string;
};

export type ProductOption = {
  id: string;
  categoriaId: string | null;
  nombre: string;
  pdvArs: number;
  pdvUsd: number | null;
  costoTotal: number | null;
  esPlanMensual: boolean;
  periodoMinimoMeses: number | null;
  orden: number | null;
};

export type RoleOption = {
  id: string;
  nombre: string;
};

export type CollaboratorRole = {
  colaboradorId: string;
  rolId: string;
};

export type CollaboratorOption = {
  id: string;
  nombre: string;
  roleIds: string[];
};

export type BudgetCatalog = {
  services: ServiceOption[];
  categories: CategoryOption[];
  products: ProductOption[];
  roles: RoleOption[];
  collaborators: CollaboratorOption[];
  productRoles: Record<string, string[]>;
};

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(value) || 0;
}

export function useBudgetCatalog(open: boolean) {
  const [catalog, setCatalog] = useState<BudgetCatalog>({
    services: [],
    categories: [],
    products: [],
    roles: [],
    collaborators: [],
    productRoles: {}
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);

    async function loadCatalog() {
      const supabase = createClient();
      const [servicesResult, categoriesResult, productsResult, rolesResult, collaboratorsResult, collaboratorRolesResult, productRolesResult] =
        await Promise.all([
          supabase.from("servicios").select("id, nombre, activo, orden").eq("activo", true).order("orden", { ascending: true }),
          supabase.from("categorias").select("id, servicio_id, nombre, activo, orden").eq("activo", true).order("orden", { ascending: true }),
          supabase
            .from("productos")
            .select("id, categoria_id, nombre, pdv_ars, pdv_usd, costo_total, es_plan_mensual, periodo_minimo_meses, activo, orden")
            .eq("activo", true)
            .order("orden", { ascending: true }),
          supabase.from("roles").select("id, nombre, activo").eq("activo", true).order("nombre", { ascending: true }),
          supabase.from("colaboradores").select("id, nombre, activo").eq("activo", true).order("nombre", { ascending: true }),
          supabase.from("colaborador_roles").select("colaborador_id, rol_id"),
          supabase.from("producto_roles").select("producto_id, rol_id")
        ]);

      if (!active) {
        return;
      }

      [
        servicesResult,
        categoriesResult,
        productsResult,
        rolesResult,
        collaboratorsResult,
        collaboratorRolesResult,
        productRolesResult
      ].forEach((result, index) => {
        if (result.error) {
          const labels = ["servicios", "categorias", "productos", "roles", "colaboradores", "colaborador_roles", "producto_roles"];
          console.error(`No se pudo cargar ${labels[index]}`, result.error);
        }
      });

      const collaboratorRoleMap = (collaboratorRolesResult.data ?? []).reduce<Record<string, string[]>>(
        (acc, row: Record<string, unknown>) => {
          const collaboratorId = String(row.colaborador_id);
          const roleId = String(row.rol_id);
          acc[collaboratorId] = [...(acc[collaboratorId] ?? []), roleId];
          return acc;
        },
        {}
      );
      const productRoleMap = (productRolesResult.data ?? []).reduce<Record<string, string[]>>((acc, row: Record<string, unknown>) => {
        const productId = String(row.producto_id);
        const roleId = String(row.rol_id);
        acc[productId] = [...(acc[productId] ?? []), roleId];
        return acc;
      }, {});

      setCatalog({
        services: (servicesResult.data ?? []).map((item: Record<string, unknown>) => ({
          id: String(item.id),
          nombre: String(item.nombre ?? "Servicio")
        })),
        categories: (categoriesResult.data ?? []).map((item: Record<string, unknown>) => ({
          id: String(item.id),
          servicioId: item.servicio_id === null || item.servicio_id === undefined ? null : String(item.servicio_id),
          nombre: String(item.nombre ?? "Categoría")
        })),
        products: (productsResult.data ?? []).map((item: Record<string, unknown>) => ({
          id: String(item.id),
          categoriaId: item.categoria_id === null || item.categoria_id === undefined ? null : String(item.categoria_id),
          nombre: String(item.nombre ?? "Producto"),
          pdvArs: asNumber(item.pdv_ars),
          pdvUsd: item.pdv_usd === null || item.pdv_usd === undefined ? null : Number(item.pdv_usd),
          costoTotal: item.costo_total === null || item.costo_total === undefined ? null : Number(item.costo_total),
          esPlanMensual: Boolean(item.es_plan_mensual),
          periodoMinimoMeses:
            item.periodo_minimo_meses === null || item.periodo_minimo_meses === undefined
              ? null
              : Number(item.periodo_minimo_meses),
          orden: item.orden === null || item.orden === undefined ? null : Number(item.orden)
        })),
        roles: (rolesResult.data ?? []).map((item: Record<string, unknown>) => ({
          id: String(item.id),
          nombre: String(item.nombre ?? "Rol")
        })),
        collaborators: (collaboratorsResult.data ?? []).map((item: Record<string, unknown>) => ({
          id: String(item.id),
          nombre: String(item.nombre ?? "Colaborador"),
          roleIds: collaboratorRoleMap[String(item.id)] ?? []
        })),
        productRoles: productRoleMap
      });
      setLoading(false);
    }

    loadCatalog();

    return () => {
      active = false;
    };
  }, [open]);

  return useMemo(() => ({ catalog, loading }), [catalog, loading]);
}
