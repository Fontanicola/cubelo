"use client";

import { Paperclip } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

type ModalComprobanteProps = {
  disabled?: boolean;
  onSelectFile: (file: File) => Promise<void>;
};

export function ModalComprobante({ disabled = false, onSelectFile }: ModalComprobanteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await onSelectFile(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.png,.jpeg"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
      >
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        Sumar comprobante
      </button>
    </>
  );
}
