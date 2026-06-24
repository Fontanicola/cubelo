"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { WizardImportCSV } from "@/app/admin/csv/WizardImportCSV";

type ModalUploaderProps = {
  variant?: "card" | "button";
};

export function ModalUploader({ variant = "button" }: ModalUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function handleFile(nextFile?: File) {
    if (!nextFile) {
      return;
    }

    setOpen(false);
    setFile(nextFile);
  }

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex min-h-[260px] cursor-pointer flex-col overflow-hidden rounded-2xl bg-[#F3F4F6] p-5 text-left transition hover:shadow-lg"
        >
          <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-200 text-center text-sm font-semibold uppercase text-gray-500">
            IMPORTE CSV
          </div>
          <div className="mt-6 h-1 w-full rounded-full bg-cubelo-blue" />
          <div className="flex min-h-[76px] items-center justify-center text-center text-base font-bold uppercase text-cubelo-blue">
            IMPORTE CSV
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-cubelo-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8]"
        >
          Nuevo importe
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-l-4 border-cubelo-blue pl-4">
              <h2 className="text-2xl font-bold text-black">Carga tu archivo de excel/CSV</h2>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="mt-6 flex min-h-[220px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-center hover:bg-gray-50"
            >
              <UploadCloud className="h-12 w-12 text-gray-400" />
              <span className="mt-4 text-sm font-semibold text-gray-500">
                Arrastra el archivo o haz click para explorar
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {file ? (
        <WizardImportCSV
          file={file}
          onClose={() => setFile(null)}
          onDone={() => {
            setFile(null);
            router.push("/admin/csv");
          }}
        />
      ) : null}
    </>
  );
}
