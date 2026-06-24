"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { TablonCSV } from "@/app/admin/csv/TablonCSV";
import { type CsvImport } from "@/app/admin/csv/WizardImportCSV";
import { ModalUploader } from "@/components/admin/ModalUploader";

const STORAGE_KEY = "cubelo_csv_imports";

export default function AdminCsvPage() {
  const [imports, setImports] = useState<CsvImport[]>([]);

  useEffect(() => {
    setImports(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CsvImport[]);
  }, []);

  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver a administración"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">Importe CSV</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">
              Tableros importados y carga de movimientos.
            </p>
          </div>
        </div>
        {imports.length ? <ModalUploader /> : null}
      </div>

      {imports.length ? <TablonCSV imports={imports} onChange={setImports} /> : <ModalUploader />}
    </section>
  );
}
