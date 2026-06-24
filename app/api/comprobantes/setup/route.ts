import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const payload = await request.json().catch(() => null);
    const bucketName =
      payload && typeof payload.bucketName === "string" && payload.bucketName.trim()
        ? payload.bucketName.trim()
        : "comprobantes";

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("No se pudieron listar los buckets", bucketsError);
      return NextResponse.json({ error: "No se pudieron listar los buckets" }, { status: 500 });
    }

    const existingBucket = buckets.find((bucket) => bucket.name === bucketName);

    if (!existingBucket) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });

      if (createError) {
        console.error("No se pudo crear el bucket comprobantes", createError);
        return NextResponse.json({ error: "No se pudo crear el bucket" }, { status: 500 });
      }
    } else if (!existingBucket.public) {
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true
      });

      if (updateError) {
        console.error("No se pudo actualizar el bucket comprobantes", updateError);
        return NextResponse.json({ error: "No se pudo actualizar el bucket" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error inesperado preparando el bucket comprobantes", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
