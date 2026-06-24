import { redirect } from "next/navigation";

type PageProps = {
  params: {
    id: string;
  };
};

export default function ColaboradorPage({ params }: PageProps) {
  redirect(`/colaboradores/${params.id}/servicios`);
}
