"use client";

import { Bookmark, FileText, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ModalComprobanteProps = {
  acuerdoId: string;
  linkReferencia?: string | null;
};

export function ModalComprobante({ acuerdoId, linkReferencia }: ModalComprobanteProps) {
  const [open, setOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState(linkReferencia ?? "");
  const [savedValue, setSavedValue] = useState(linkReferencia ?? "");

  const files = useMemo(
    () =>
      savedValue
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [savedValue]
  );

  async function handleSave() {
    const supabase = createClient();

    if (supabase) {
      const { error } = await supabase
        .from("acuerdos")
        .update({ link_referencia: value })
        .eq("id", acuerdoId);

      if (error) {
        console.error("No se pudo guardar el comprobante", error);
      }
    }

    setSavedValue(value);
    setOpen(false);
    setShowInput(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-cubelo-blue shadow-sm hover:bg-gray-50"
        aria-label="Subir comprobante"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Archivos subidos</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {files.length ? (
                files.map((file) => (
                  <a
                    key={file}
                    href={file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 text-red-600" aria-hidden="true" />
                    <span className="truncate">{file}</span>
                  </a>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
                  Sin archivos subidos
                </div>
              )}
            </div>

            {showInput ? (
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="https://..."
                className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cubelo-blue"
              />
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setShowInput(true)}
                className="rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
              >
                + Sumar comprobante
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
