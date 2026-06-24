"use client";

import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AccordionHistorial } from "@/app/clientes/[id]/AccordionHistorial";
import { AccordionMesEnCurso } from "@/app/clientes/[id]/AccordionMesEnCurso";
import { AccordionPresupuesto } from "@/app/clientes/[id]/AccordionPresupuesto";
import { AccordionRechazados } from "@/app/clientes/[id]/AccordionRechazados";
import type { BudgetRecord, PresupuestoItem } from "@/lib/presupuestos/document";

type ClienteServiciosProps = {
  cliente: {
    id: string;
    nombre: string;
  };
  presupuestos: Array<BudgetRecord & { items: PresupuestoItem[] }>;
  acuerdos: Array<Record<string, unknown> & { id: string | number; presupuestoItems: PresupuestoItem[] }>;
  cobros: Array<Record<string, unknown>>;
};

export function ServiciosCliente({ cliente, presupuestos, acuerdos, cobros }: ClienteServiciosProps) {
  const [toast, setToast] = useState("");
  const presupuestosActivos = presupuestos.filter((presupuesto) => presupuesto.estado !== "rechazado");
  const presupuestosRechazados = presupuestos.filter((presupuesto) => presupuesto.estado === "rechazado");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/clientes"
            className="mt-1 inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver a clientes"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">{cliente.nombre}</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">Servicios</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => showToast("Próximamente")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cubelo-blue bg-blue-50 px-5 text-sm font-bold text-cubelo-blue hover:bg-blue-100"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Resumen de cuenta
        </button>
      </div>

      <div className="space-y-4">
        <AccordionPresupuesto clienteId={cliente.id} presupuestos={presupuestosActivos} />
        <AccordionMesEnCurso acuerdos={acuerdos} cobros={cobros} />
        <AccordionHistorial acuerdos={acuerdos} />
        <AccordionRechazados clienteId={cliente.id} presupuestos={presupuestosRechazados} />
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
