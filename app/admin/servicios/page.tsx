import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminServiciosPage() {
  return (
    <section className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex items-start gap-4">
        <Link
          href="/acuerdos/nuevo"
          className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
          aria-label="Volver a sumar servicio"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-3xl font-bold text-black">Administración de Servicios</h1>
          <p className="mt-1 text-base font-medium italic text-gray-400">Próximamente</p>
        </div>
      </div>

      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-gray-400">Próximamente</div>
        <p className="mt-3 max-w-2xl text-sm font-medium text-gray-500">
          Desde acá vas a poder gestionar el catálogo de Servicios, Categorías y Productos.
        </p>
      </div>
    </section>
  );
}
