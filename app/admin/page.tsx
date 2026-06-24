import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ModalUploader } from "@/components/admin/ModalUploader";

export const revalidate = 60;

const adminCards = [
  { title: "SUMAR MOVIMIENTOS", href: "/admin/movimientos/nuevo" },
  { title: "MOVIMIENTOS", href: "/admin/movimientos" }
];

export default function AdminPage() {
  return (
    <section className="flex w-full flex-col gap-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h1 className="text-3xl font-bold text-black">Administración</h1>
            <p className="mt-1 text-base font-medium italic text-gray-400">
              Importes, movimientos y herramientas internas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ModalUploader variant="card" />
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex min-h-[260px] cursor-pointer flex-col overflow-hidden rounded-2xl bg-[#F3F4F6] p-5 transition hover:shadow-lg"
          >
            <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-200 text-center text-sm font-semibold uppercase text-gray-500">
              {card.title}
            </div>
            <div className="mt-6 h-1 w-full rounded-full bg-cubelo-blue" />
            <div className="flex min-h-[76px] items-center justify-center text-center text-base font-bold uppercase text-cubelo-blue">
              {card.title}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
