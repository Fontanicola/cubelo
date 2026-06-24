import { cookies } from "next/headers";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

function buildCookieMethods(cookieStore: ReturnType<typeof cookies>): CookieMethodsServer {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Server Components cannot set cookies; middleware can refresh sessions.
      }
    }
  };
}

function createAuthClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: buildCookieMethods(cookieStore)
  });
}

export function createClient() {
  if (supabaseServiceKey) {
    return createSupabaseJsClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return createAuthClient();
}

export function createServiceClient() {
  if (!supabaseServiceKey) {
    console.warn("SUPABASE_SECRET_KEY is not set; falling back to anon key (RLS applies).");
    return createAuthClient();
  }

  return createSupabaseJsClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const createSupabaseServerClient = createClient;

export async function getLoggedUserName() {
  const supabase = createAuthClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Usuario"
  );
}
