export type PresupuestoEstado = "esperando_aprobacion" | "aprobado" | "rechazado";

export const PRESUPUESTO_ESTADOS: Array<{
  value: PresupuestoEstado;
  label: string;
  color: string;
}> = [
  {
    value: "esperando_aprobacion",
    label: "ESPERANDO APROBACIÓN",
    color: "#D97706"
  },
  {
    value: "aprobado",
    label: "APROBADO",
    color: "#16A34A"
  },
  {
    value: "rechazado",
    label: "RECHAZADO",
    color: "#DC2626"
  }
];

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
