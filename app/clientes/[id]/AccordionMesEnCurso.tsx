"use client";

import { ChevronDown, ChevronRight, FileText, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ModalComprobante } from "@/components/clientes/ModalComprobante";
import { ModalEditarAcuerdo } from "@/components/clientes/ModalEditarAcuerdo";
import { ModalVerComprobantes } from "@/components/clientes/ModalVerComprobantes";
import { MONTH_NAMES, formatDate, formatMoney, groupItemsByServicio, type PresupuestoItem } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/client";

type AgreementRow = Record<string, unknown> & {
  id: string | number;
  presupuesto_id?: string | number | null;
  mes_operacion?: number | null;
  anio_operacion?: number | null;
  total?: number | string | null;
  moneda?: string | null;
  fecha?: string | null;
  presupuestoItems: PresupuestoItem[];
};

type CobroRow = Record<string, unknown> & {
  id: string | number;
  acuerdo_id?: string | number | null;
  fecha?: string | null;
  importe?: number | string | null;
  moneda?: string | null;
  comprobante_url?: string | null;
  acuerdos?: {
    id?: string | number | null;
    mes_operacion?: number | null;
    anio_operacion?: number | null;
  } | null;
};

type AccordionMesEnCursoProps = {
  acuerdos: AgreementRow[];
  cobros: Array<Record<string, unknown>>;
};

function summarizeServices(items: PresupuestoItem[]) {
  return groupItemsByServicio(items)
    .map((group) => group.servicioNombre)
    .join(" - ");
}

function MonthTable({ acuerdos }: { acuerdos: AgreementRow[] }) {
  const total = useMemo(
    () => acuerdos.reduce((sum, acuerdo) => sum + Number(acuerdo.total ?? 0), 0),
    [acuerdos]
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[760px] w-full border-collapse">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-gray-500">Servicios</th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-gray-500">Valor</th>
            </tr>
          </thead>
          <tbody>
            {acuerdos.length ? (
              acuerdos.map((acuerdo) => (
                <tr key={String(acuerdo.id)} className="border-t border-gray-200 bg-white">
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(String(acuerdo.fecha ?? null))}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {summarizeServices(acuerdo.presupuestoItems) || "Sin servicios"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    {formatMoney(Number(acuerdo.total ?? 0), String(acuerdo.moneda ?? "ARS"))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                  Sin acuerdos para este periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-lg font-bold text-gray-900">
        TOTAL {formatMoney(total, acuerdos[0]?.moneda ? String(acuerdos[0].moneda) : "ARS")}
      </div>
    </div>
  );
}

export { MonthTable };

export function AccordionMesEnCurso({ acuerdos, cobros = [] }: AccordionMesEnCursoProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [viewingComprobantes, setViewingComprobantes] = useState(false);
  const [editingAcuerdo, setEditingAcuerdo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const now = new Date();
  const currentMonthNumber = now.getMonth() + 1;
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  const filtered = useMemo(
    () =>
      acuerdos.filter(
        (acuerdo) =>
          Number(acuerdo.mes_operacion ?? 0) === currentMonthNumber &&
          Number(acuerdo.anio_operacion ?? 0) === currentYear
      ),
    [acuerdos, currentMonthNumber, currentYear]
  );

  const selectedAgreement = filtered[0]
    ? {
        id: String(filtered[0].id),
        total: Number(filtered[0].total ?? 0),
        moneda: String(filtered[0].moneda ?? "ARS")
      }
    : null;

  const filteredCobros = useMemo(() => {
    const validAgreementIds = new Set(filtered.map((acuerdo) => String(acuerdo.id)));

    return (cobros as CobroRow[])
      .filter((cobro) => {
        const acuerdoId = String(cobro.acuerdo_id ?? cobro.acuerdos?.id ?? "");
        return validAgreementIds.has(acuerdoId) && Boolean(cobro.comprobante_url);
      })
      .map((cobro) => ({
        id: String(cobro.id),
        acuerdoId: String(cobro.acuerdo_id ?? cobro.acuerdos?.id ?? ""),
        fecha: cobro.fecha ? String(cobro.fecha) : null,
        comprobanteUrl: String(cobro.comprobante_url ?? "")
      }));
  }, [cobros, filtered]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function handleComprobanteSelected(file: File) {
    if (!selectedAgreement) {
      return;
    }

    setUploading(true);

    try {
      await fetch("/api/comprobantes/setup", {
        method: "POST"
      });

      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, "-");
      const path = `cobros/${selectedAgreement.id}/${timestamp}-${safeName}`;
      const uploadResult = await supabase.storage.from("comprobantes").upload(path, file, {
        upsert: false
      });

      if (uploadResult.error) {
        console.error("No se pudo subir el comprobante", uploadResult.error);
        return;
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("comprobantes").getPublicUrl(path);
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("cobros").insert({
        acuerdo_id: selectedAgreement.id,
        fecha: new Date().toISOString().slice(0, 10),
        importe: 0,
        comprobante_url: publicUrl,
        created_by: user?.id ?? null
      });

      if (error) {
        console.error("No se pudo registrar el cobro", error);
        return;
      }

      showToast("Comprobante subido con éxito");
      router.refresh();
    } catch (error) {
      console.error("No se pudo procesar el comprobante", error);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveAgreement(nextTotal: number) {
    if (!selectedAgreement) {
      return;
    }

    const { error } = await supabase
      .from("acuerdos")
      .update({ total: nextTotal })
      .eq("id", selectedAgreement.id);

    if (error) {
      console.error("No se pudo actualizar el acuerdo", error);
      return;
    }

    setEditingAcuerdo(false);
    showToast("Acuerdo actualizado");
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between bg-[#1E2A6E] px-4 py-3 text-left text-sm font-bold uppercase text-white"
      >
        MES EN CURSO - {currentMonth}
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="p-4">
          <MonthTable acuerdos={filtered} />

          <div className="mt-4 flex flex-wrap gap-2 lg:justify-end">
            <ModalComprobante disabled={!selectedAgreement || uploading} onSelectFile={handleComprobanteSelected} />
            <button
              type="button"
              onClick={() => setViewingComprobantes(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Ver comprobantes
            </button>
            <button
              type="button"
              onClick={() => setEditingAcuerdo(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              className="rounded-md bg-cubelo-blue px-4 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
            >
              Prefactura
            </button>
            <button
              type="button"
              className="rounded-md bg-[#1E2A6E] px-4 py-2 text-sm font-bold text-white hover:bg-[#172154]"
            >
              Facturar
            </button>
          </div>

          {uploading ? (
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-cubelo-blue">
              Subiendo comprobante...
            </div>
          ) : null}
        </div>
      ) : null}

      <ModalVerComprobantes
        open={viewingComprobantes}
        onClose={() => setViewingComprobantes(false)}
        comprobantes={filteredCobros}
      />
      <ModalEditarAcuerdo
        open={editingAcuerdo}
        onClose={() => setEditingAcuerdo(false)}
        acuerdo={selectedAgreement}
        onSave={handleSaveAgreement}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
