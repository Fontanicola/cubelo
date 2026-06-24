"use client";

import { FileText, Link as LinkIcon, MessageCircle, X } from "lucide-react";
import { useState } from "react";

type ModalCompartirProps = {
  open: boolean;
  onClose: () => void;
};

export function ModalCompartir({ open, onClose }: ModalCompartirProps) {
  const [copied, setCopied] = useState(false);

  if (!open) {
    return null;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function shareWhatsApp() {
    const link = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${link}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 no-print" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">Compartir presupuesto</h2>
            <p className="mt-1 text-sm italic text-gray-400">Elegí una opción para enviar el preview.</p>
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

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-4 text-center text-xs font-bold text-cubelo-blue hover:bg-blue-50"
          >
            <LinkIcon className="h-6 w-6" aria-hidden="true" />
            {copied ? "Copiado" : "Copiar Link"}
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-4 text-center text-xs font-bold text-cubelo-blue hover:bg-blue-50"
          >
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-lg bg-cubelo-blue px-3 py-4 text-center text-xs font-bold text-white hover:bg-[#2929a8]"
          >
            <FileText className="h-6 w-6" aria-hidden="true" />
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
