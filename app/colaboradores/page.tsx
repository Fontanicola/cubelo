import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

import { ColaboradoresTable, type ColaboradorRow } from "@/app/colaboradores/ColaboradoresTable";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

type CollaboratorRecord = Record<string, unknown> & {
  id: string | number;
  nombre?: string | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fecha_inicio?: string | null;
  fecha_cumpleanos?: string | null;
  puesto?: string | null;
  banco?: string | null;
  numero_cuenta?: string | null;
  cuit?: string | null;
  cbu?: string | null;
  metodo_pago?: string | null;
  activo?: boolean | null;
  envio_mes?: boolean | null;
  pago_mes?: boolean | null;
  factura_mes?: boolean | null;
  datos_bancarios_mes?: boolean | null;
};

type RoleJoinRecord = Record<string, unknown> & {
  colaborador_id: string | number;
  roles?: {
    id?: string | number | null;
    nombre?: string | null;
    activo?: boolean | null;
  } | null;
};

type AssignmentRecord = Record<string, unknown> & {
  id: string | number;
  colaborador_id?: string | number | null;
  presupuesto_item_id?: string | number | null;
  fee?: number | string | null;
  envio?: boolean | null;
  pago?: boolean | null;
  factura?: boolean | null;
  datos_bancarios?: boolean | null;
  comprobante_url?: string | null;
};

async function getRolesByColaborador() {
  const supabase = createClient();
  const joined = await supabase
    .from("colaborador_roles")
    .select("colaborador_id, roles(id, nombre, activo)")
    .order("id", { ascending: true });

  if (joined.error) {
    console.error("No se pudieron cargar los roles de los colaboradores", joined.error);
    return new Map<string, Array<{ id: string; nombre: string }>>();
  }

  const grouped = new Map<string, Array<{ id: string; nombre: string }>>();

  (joined.data ?? []).forEach((row) => {
    const record = row as RoleJoinRecord;
    const collaboratorId = String(record.colaborador_id);
    const roleId = record.roles?.id ? String(record.roles.id) : null;
    const roleName = record.roles?.nombre ? String(record.roles.nombre) : null;

    if (!roleId || !roleName) {
      return;
    }

    const current = grouped.get(collaboratorId) ?? [];
    current.push({ id: roleId, nombre: roleName });
    grouped.set(collaboratorId, current);
  });

  return grouped;
}

async function getColaboradores() {
  const supabase = createClient();
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  const [colaboradoresResult, asignacionesResult, rolesByColaborador] = await Promise.all([
    supabase.from("colaboradores").select("*").order("nombre", { ascending: true }),
    supabase
      .from("asignaciones")
      .select("id, colaborador_id, presupuesto_item_id, fee, envio, pago, factura, datos_bancarios, comprobante_url")
      .eq("mes_operacion", mesActual)
      .eq("anio_operacion", anioActual),
    getRolesByColaborador()
  ]);

  if (colaboradoresResult.error) {
    console.error("No se pudieron cargar los colaboradores", colaboradoresResult.error);
  }

  if (asignacionesResult.error) {
    console.error("No se pudieron cargar las asignaciones del mes", asignacionesResult.error);
  }

  const assignmentRows = (asignacionesResult.data ?? []) as AssignmentRecord[];

  const assignmentsByCollaborator = assignmentRows.reduce<Record<string, AssignmentRecord[]>>((acc, assignment) => {
    const collaboratorId = String(assignment.colaborador_id ?? "");
    if (!collaboratorId) {
      return acc;
    }

    acc[collaboratorId] = [...(acc[collaboratorId] ?? []), assignment];
    return acc;
  }, {});

  const rows: ColaboradorRow[] = ((colaboradoresResult.data ?? []) as CollaboratorRecord[]).map((colaborador) => {
    const id = String(colaborador.id);
    const collaboratorAssignments = assignmentsByCollaborator[id] ?? [];
    const collaboratorRoles = rolesByColaborador.get(id) ?? [];

    const total = collaboratorAssignments.reduce((acc, assignment) => acc + Number(assignment.fee ?? 0), 0);

    return {
      id,
      nombre: String(colaborador.nombre ?? "Sin nombre"),
      correo: colaborador.correo ? String(colaborador.correo) : null,
      telefono: colaborador.telefono ? String(colaborador.telefono) : null,
      metodoPago: colaborador.metodo_pago ? String(colaborador.metodo_pago) : null,
      puesto: colaborador.puesto ? String(colaborador.puesto) : null,
      direccion: colaborador.direccion ? String(colaborador.direccion) : null,
      fechaInicio: colaborador.fecha_inicio ? String(colaborador.fecha_inicio) : null,
      fechaCumpleanos: colaborador.fecha_cumpleanos ? String(colaborador.fecha_cumpleanos) : null,
      banco: colaborador.banco ? String(colaborador.banco) : null,
      numeroCuenta: colaborador.numero_cuenta ? String(colaborador.numero_cuenta) : null,
      cuit: colaborador.cuit ? String(colaborador.cuit) : null,
      cbu: colaborador.cbu ? String(colaborador.cbu) : null,
      roleIds: collaboratorRoles.map((role) => role.id),
      roleNames: collaboratorRoles.map((role) => role.nombre),
      activo: Boolean(colaborador.activo ?? true),
      total,
      hasMonthlyAssignments: collaboratorAssignments.length > 0,
      envio: collaboratorAssignments.length
        ? collaboratorAssignments.every((item) => Boolean(item.envio))
        : Boolean(colaborador.envio_mes ?? false),
      pago: collaboratorAssignments.length
        ? collaboratorAssignments.every((item) => Boolean(item.pago))
        : Boolean(colaborador.pago_mes ?? false),
      factura: collaboratorAssignments.length
        ? collaboratorAssignments.every((item) => Boolean(item.factura))
        : Boolean(colaborador.factura_mes ?? false),
      datosBancarios: collaboratorAssignments.length
        ? collaboratorAssignments.every((item) => Boolean(item.datos_bancarios))
        : Boolean(colaborador.datos_bancarios_mes ?? false),
      hasComprobante: collaboratorAssignments.some((item) => Boolean(item.comprobante_url)),
      comprobanteUrl:
        collaboratorAssignments.find((item) => item.comprobante_url)?.comprobante_url
          ? String(collaboratorAssignments.find((item) => item.comprobante_url)?.comprobante_url)
          : null,
      currentMonth: mesActual,
      currentYear: anioActual
    };
  });

  return { rows, mesActual, anioActual };
}

export default async function ColaboradoresPage() {
  const { rows, mesActual, anioActual } = await getColaboradores();

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="mt-1 inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">Colaboradores</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">
              Seguimiento del equipo, pagos y comprobantes del mes actual.
            </p>
          </div>
        </div>

        <Link
          href="/colaboradores/nuevo"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-cubelo-blue px-5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Nuevo colaborador
        </Link>
      </div>

      <ColaboradoresTable rows={rows} month={mesActual} year={anioActual} />
    </section>
  );
}
