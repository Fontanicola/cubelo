"use client";

import { Bookmark, MessageCircle, X } from "lucide-react";
import { useState } from "react";

import { getComentarioFromNotas, setComentarioInNotas } from "@/lib/cobranzas/notas";
import { createClient } from "@/lib/supabase/client";

type BotonComentarioProps = {
  acuerdoId: string;
  notas?: string | null;
};

export function BotonComentario({ acuerdoId, notas }: BotonComentarioProps) {
  const [openPopover, setOpenPopover] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [savedNotas, setSavedNotas] = useState(notas ?? "");
  const [comment, setComment] = useState(getComentarioFromNotas(notas));
  const visibleComment = getComentarioFromNotas(savedNotas);
  const hasComment = Boolean(visibleComment);

  async function handleSave() {
    const nextNotas = setComentarioInNotas(savedNotas, comment);
    const supabase = createClient();

    if (supabase) {
      const { error } = await supabase.from("acuerdos").update({ notas: nextNotas }).eq("id", acuerdoId);

      if (error) {
        console.error("No se pudo guardar el comentario", error);
      }
    }

    setSavedNotas(nextNotas);
    setOpenDialog(false);
    setOpenPopover(false);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => (hasComment ? setOpenPopover((current) => !current) : setOpenDialog(true))}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm ${
          hasComment
            ? "border-cubelo-blue bg-blue-50 text-cubelo-blue"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        }`}
        aria-label="Comentario"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </button>

      {openPopover && hasComment ? (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-xl">
          <p className="whitespace-pre-wrap text-sm text-gray-700">{visibleComment}</p>
          <button
            type="button"
            onClick={() => {
              setComment(visibleComment);
              setOpenDialog(true);
            }}
            className="mt-3 text-sm font-bold text-cubelo-blue hover:underline"
          >
            Editar
          </button>
        </div>
      ) : null}

      {openDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Comentario</h2>
              <button
                type="button"
                onClick={() => setOpenDialog(false)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Deja un comentario del trabajo realizado por el colaborador seleccionado."
              className="mt-5 min-h-[150px] w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cubelo-blue"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenDialog(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8]"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
