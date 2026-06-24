import { UserCircle } from "lucide-react";

import { getLoggedUserName } from "@/lib/supabase/server";

export async function Header() {
  const userName = await getLoggedUserName();

  return (
    <header className="fixed left-0 top-0 z-50 flex h-[60px] w-full items-center bg-cubelo-blue px-6 text-white">
      <div className="flex w-full items-center justify-between px-4 sm:px-6">
        <img src="/logo.cubelo.svg" alt="Cubelo" className="h-10 w-auto" />
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserCircle className="h-6 w-6" aria-hidden="true" />
          <span>{userName}</span>
        </div>
      </div>
    </header>
  );
}
