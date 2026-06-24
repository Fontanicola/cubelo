import { FichaCliente } from "@/app/clientes/[id]/FichaCliente";
import { loadClienteData } from "@/app/clientes/[id]/clienteData";

export const revalidate = 60;
export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ClientePage({ params }: PageProps) {
  const data = await loadClienteData(params.id);

  return (
    <FichaCliente
      cliente={{
        id: String(data.cliente.id),
        nombre: data.cliente.nombre ?? "Cliente",
        nombre_comercial: data.cliente.nombre_comercial ?? null,
        email: data.cliente.email ?? null,
        telefono: data.cliente.telefono ?? null,
        direccion: data.cliente.direccion ?? null,
        cuit: data.cliente.cuit ?? null,
        tipo_comprobante: data.cliente.tipo_comprobante ?? null,
        notas: data.cliente.notas ?? null,
        fecha_inicio: data.cliente.fecha_inicio ?? null,
        activo: Boolean(data.cliente.activo ?? true)
      }}
    />
  );
}
