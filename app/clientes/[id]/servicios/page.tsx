import { loadClienteData } from "@/app/clientes/[id]/clienteData";
import { ServiciosCliente } from "@/app/clientes/[id]/ServiciosCliente";

export const revalidate = 60;
export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ClienteServiciosPage({ params }: PageProps) {
  const data = await loadClienteData(params.id);

  return (
    <ServiciosCliente
      cliente={{
        id: String(data.cliente.id),
        nombre: data.cliente.nombre ?? "Cliente"
      }}
      presupuestos={data.presupuestos}
      acuerdos={data.acuerdos}
      cobros={data.cobros}
    />
  );
}
