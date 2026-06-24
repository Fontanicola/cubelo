"use client";

import { ExternalLink, FileImage, FileText, X } from "lucide-react";

import { formatDate } from "@/lib/presupuestos/document";

type CobroComprobante = {
  id: string;
  acuerdoId: string;
  fecha: string | null;
  comprobanteUrl: string;
};

type ModalVerComprobantesProps = {
  open: boolean;
  onClose: () => void;
  comprobantes: CobroComprobante[];
};

function getFileName(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "comprobante");
  } catch {
    return url.split("/").pop() || "comprobante";
  }
}

function isImage(url: string) {
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
}

export function ModalVerComprobantes({ open, onClose, comprobantes }: ModalVerComprobantesProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">Comprobantes</h2>
            <p className="mt-1 text-sm italic text-gray-400">Archivos cargados para este acuerdo.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {comprobantes.length ? (
            comprobantes.map((comprobante) => (
              <a
                key={comprobante.id}
                href={comprobante.comprobanteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 transition hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600">
                    {isImage(comprobante.comprobanteUrl) ? (
                      <FileImage className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-gray-900">
                      {getFileName(comprobante.comprobanteUrl)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatDate(comprobante.fecha)} · Acuerdo {comprobante.acuerdoId}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-cubelo-blue">
                  Abrir
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Sin comprobantes cargados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
