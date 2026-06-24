import Link from "next/link";

import { getLoggedUserName } from "@/lib/supabase/server";

export const revalidate = 60;

const modules = [
  { title: "COBRANZAS", href: "/cobranzas", image: "/home/Cobranzas.svg" },
  { title: "CLIENTES", href: "/clientes", image: "/home/Clientes.svg" },
  { title: "COLABORADORES", href: "/colaboradores", image: "/home/Colaboradores.svg" },
  { title: "PRESUPUESTOS", href: "/presupuestos", image: "/home/Presupuestos.svg" },
  { title: "SUMAR SERVICIO", href: "/acuerdos/nuevo", image: "/home/Sumar%20servicio.svg" }
];

export default async function HomePage() {
  const userName = await getLoggedUserName();

  return (
    <section className="mx-auto flex w-full max-w-[1840px] flex-col gap-28 px-8 py-14">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:justify-between">
        <div className="border-l-4 border-cubelo-blue pl-4">
          <h1 className="text-4xl font-bold text-black">Bienvenido {userName}</h1>
          <p className="mt-1 text-xl font-medium italic text-gray-600">Administrador</p>
        </div>
        <Link
          href="/admin"
          className="rounded-md bg-cubelo-blue px-8 py-3 text-lg font-bold text-white shadow-sm transition hover:bg-[#2929a8] sm:shrink-0"
        >
          Administración
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group flex min-h-[330px] cursor-pointer flex-col overflow-hidden rounded-2xl bg-[#E6E8F0] px-7 pb-7 pt-6 shadow-[0_5px_12px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_18px_rgba(0,0,0,0.24)]"
          >
            <div className="flex min-h-[210px] flex-1 items-end justify-center">
              <img
                src={module.image}
                alt=""
                className="h-[205px] w-full object-contain mix-blend-multiply transition group-hover:scale-[1.02]"
                aria-hidden="true"
              />
            </div>
            <div className="mt-4 h-1 w-full rounded-full bg-[#001B8E]" />
            <div className="flex min-h-[74px] items-end justify-center text-center text-2xl font-extrabold uppercase text-[#001B8E]">
              {module.title}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
