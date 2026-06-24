"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { createClient } from "@/lib/supabase/client";

type PresupuestoApprovalRecord = {
  id: string | number;
  cliente_id?: string | number | null;
  fecha?: string | null;
  total_neto?: number | string | null;
  moneda?: string | null;
  presupuesto_items?: Array<{
    id: string | number;
    presupuesto_item_colaboradores?: Array<{
      colaborador_id?: string | number | null;
      rol_id?: string | number | null;
      costo?: number | string | null;
    }>;
  }>;
};

export async function approvePresupuesto(presupuestoId: string, router: AppRouterInstance) {
  const supabase = createClient();

  const { data: presupuesto, error: presupuestoError } = await supabase
    .from("presupuestos")
    .select("*, presupuesto_items(*, presupuesto_item_colaboradores(*))")
    .eq("id", presupuestoId)
    .single();

  if (presupuestoError || !presupuesto) {
    console.error("No se pudo cargar el presupuesto para aprobar", presupuestoError);
    return;
  }

  const budget = presupuesto as PresupuestoApprovalRecord;

  const { error: updateError } = await supabase
    .from("presupuestos")
    .update({ estado: "aprobado" })
    .eq("id", presupuestoId);

  if (updateError) {
    console.error("No se pudo aprobar el presupuesto", updateError);
    return;
  }

  const { data: existingAgreement, error: existingAgreementError } = await supabase
    .from("acuerdos")
    .select("id")
    .eq("presupuesto_id", presupuestoId)
    .maybeSingle();

  if (existingAgreementError) {
    console.error("No se pudo verificar el acuerdo existente", existingAgreementError);
    return;
  }

  if (existingAgreement?.id) {
    router.refresh();
    return;
  }

  const budgetDate = budget.fecha ? new Date(budget.fecha) : new Date();
  const mesOp = budgetDate.getMonth() + 1;
  const anioOp = budgetDate.getFullYear();

  const { data: acuerdo, error: agreementError } = await supabase
    .from("acuerdos")
    .insert({
      presupuesto_id: presupuestoId,
      cliente_id: budget.cliente_id,
      mes_operacion: mesOp,
      anio_operacion: anioOp,
      total: Number(budget.total_neto ?? 0),
      moneda: budget.moneda ?? "ARS",
      estado: "activo"
    })
    .select("id")
    .single();

  if (agreementError || !acuerdo?.id) {
    console.error("No se pudo crear el acuerdo al aprobar el presupuesto", agreementError);
    return;
  }

  const asignaciones = (budget.presupuesto_items ?? []).flatMap((item) =>
    (item.presupuesto_item_colaboradores ?? [])
      .filter((pic) => pic.colaborador_id && pic.rol_id)
      .map((pic) => ({
        acuerdo_id: acuerdo.id,
        presupuesto_item_id: item.id,
        colaborador_id: pic.colaborador_id,
        rol_id: pic.rol_id,
        mes_operacion: mesOp,
        anio_operacion: anioOp,
        fee: Number(pic.costo ?? 0)
      }))
  );

  if (asignaciones.length > 0) {
    const { error: asignacionesError } = await supabase.from("asignaciones").insert(asignaciones);

    if (asignacionesError) {
      console.error("No se pudieron crear las asignaciones al aprobar el presupuesto", asignacionesError);
      return;
    }
  }

  router.refresh();
}
