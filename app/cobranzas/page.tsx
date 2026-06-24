import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CobranzasTable, type CobranzasRow } from "@/app/cobranzas/CobranzasTable";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

type SaldoAcuerdo = {
  id: string | number;
  cui: string | null;
  nombre_acuerdo: string | null;
  cliente_id: string | number | null;
  cliente_nombre: string | null;
  moneda: string | null;
  total_acordado: number | string | null;
  total_cobrado: number | string | null;
  saldo_pendiente: number | string | null;
  mes_operacion: number | string | null;
  anio_operacion: number | string | null;
};

type Cliente = {
  id: string | number;
  telefono: string | null;
  email: string | null;
  direccion_pago: string | null;
};

type CobroCliente = {
  id: string | number;
  acuerdo_id: string | number | null;
  tipo_cobro: string | null;
  created_at: string | null;
};

type Acuerdo = {
  id: string | number;
  notas: string | null;
  link_referencia: string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(value);
}

function toOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return Number(value);
}

function uniqueValues(values: Array<string | number | null>) {
  return Array.from(new Set(values.filter((value): value is string | number => value !== null))).map(String);
}

async function getCobranzas(): Promise<CobranzasRow[]> {
  const supabase = createClient();

  const { data: saldos, error } = await supabase
    .from("v_saldo_acuerdos")
    .select(
      "id,cui,nombre_acuerdo,cliente_id,cliente_nombre,moneda,total_acordado,total_cobrado,saldo_pendiente,mes_operacion,anio_operacion"
    )
    .order("anio_operacion", { ascending: false })
    .order("mes_operacion", { ascending: false });

  if (error || !saldos?.length) {
    if (error) {
      console.error("No se pudieron cargar las cobranzas", error);
    }

    return [];
  }

  const saldoRows = saldos as SaldoAcuerdo[];
  const clienteIds = uniqueValues(saldoRows.map((row) => row.cliente_id));
  const acuerdoIds = uniqueValues(saldoRows.map((row) => row.id));

  const [clientesResult, cobrosResult, acuerdosResult] = await Promise.all([
    clienteIds.length
      ? supabase.from("clientes").select("id,telefono,email,direccion_pago").in("id", clienteIds)
      : Promise.resolve({ data: [] as Cliente[], error: null }),
    acuerdoIds.length
      ? supabase
          .from("cobros_clientes")
          .select("id,acuerdo_id,tipo_cobro,created_at")
          .in("acuerdo_id", acuerdoIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as CobroCliente[], error: null }),
    acuerdoIds.length
      ? supabase.from("acuerdos").select("id,notas,link_referencia").in("id", acuerdoIds)
      : Promise.resolve({ data: [] as Acuerdo[], error: null })
  ]);

  if (clientesResult.error) {
    console.error("No se pudieron cargar los clientes", clientesResult.error);
  }

  if (cobrosResult.error) {
    console.error("No se pudieron cargar los cobros", cobrosResult.error);
  }

  if (acuerdosResult.error) {
    console.error("No se pudieron cargar los acuerdos", acuerdosResult.error);
  }

  const clientesById = new Map(
    ((clientesResult.data ?? []) as Cliente[]).map((cliente) => [String(cliente.id), cliente])
  );
  const acuerdosById = new Map(
    ((acuerdosResult.data ?? []) as Acuerdo[]).map((acuerdo) => [String(acuerdo.id), acuerdo])
  );
  const latestCobroByAcuerdo = new Map<string, CobroCliente>();

  ((cobrosResult.data ?? []) as CobroCliente[]).forEach((cobro) => {
    if (!cobro.acuerdo_id) {
      return;
    }

    const acuerdoId = String(cobro.acuerdo_id);

    if (!latestCobroByAcuerdo.has(acuerdoId)) {
      latestCobroByAcuerdo.set(acuerdoId, cobro);
    }
  });

  return saldoRows.map((row) => {
    const acuerdoId = String(row.id);
    const cliente = row.cliente_id ? clientesById.get(String(row.cliente_id)) : undefined;
    const cobro = latestCobroByAcuerdo.get(acuerdoId);
    const acuerdo = acuerdosById.get(acuerdoId);

    return {
      id: acuerdoId,
      cui: row.cui,
      nombreAcuerdo: row.nombre_acuerdo,
      clienteId: row.cliente_id ? String(row.cliente_id) : null,
      clienteNombre: row.cliente_nombre ?? "Sin empresa",
      telefono: cliente?.telefono ?? null,
      email: cliente?.email ?? null,
      direccionPago: cliente?.direccion_pago ?? null,
      moneda: row.moneda,
      totalAcordado: toNumber(row.total_acordado),
      totalCobrado: toNumber(row.total_cobrado),
      saldoPendiente: toNumber(row.saldo_pendiente),
      mesOperacion: toOptionalNumber(row.mes_operacion),
      anioOperacion: toOptionalNumber(row.anio_operacion),
      metodoPago: cobro?.tipo_cobro ?? null,
      ultimoContacto: cobro?.created_at ?? null,
      cobroId: cobro?.id ? String(cobro.id) : null,
      notas: acuerdo?.notas ?? null,
      linkReferencia: acuerdo?.link_referencia ?? null
    };
  });
}

export default async function CobranzasPage() {
  const cobranzas = await getCobranzas();

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Mis Cobranzas</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">
            Seguimiento de saldos, pagos y contactos de clientes.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>

      <CobranzasTable rows={cobranzas} />
    </section>
  );
}
