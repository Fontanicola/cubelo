"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RolOption = {
  id: string;
  nombre: string;
};

type SelectorRolesProps = {
  value: string[];
  onChange: (nextValue: string[]) => void;
  label?: string;
  disabled?: boolean;
};

export function SelectorRoles({ value, onChange, label = "Roles", disabled = false }: SelectorRolesProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RolOption[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("roles")
        .select("id, nombre, activo")
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (error) {
        console.error("No se pudieron cargar los roles", error);
      }

      if (!active) {
        return;
      }

      setRoles((data ?? []).map((rol) => ({ id: String(rol.id), nombre: String(rol.nombre ?? "Rol") })));
      setLoading(false);
    }

    loadRoles();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const roleMap = useMemo(() => new Map(roles.map((rol) => [rol.id, rol])), [roles]);
  const selectedRoles = useMemo(
    () => value.map((roleId) => roleMap.get(roleId)).filter((item): item is RolOption => Boolean(item)),
    [roleMap, value]
  );

  function toggleRole(roleId: string) {
    if (disabled) {
      return;
    }

    onChange(value.includes(roleId) ? value.filter((item) => item !== roleId) : [...value, roleId]);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1 text-[11px] font-bold uppercase text-cubelo-blue">{label}</div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:border-cubelo-blue disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        <span>{loading ? "Cargando roles..." : "Agregar rol"}</span>
        <ChevronDown className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
          <div className="max-h-60 overflow-auto pr-1">
            {roles.length ? (
              roles.map((rol) => {
                const selected = value.includes(rol.id);

                return (
                  <button
                    key={rol.id}
                    type="button"
                    onClick={() => toggleRole(rol.id)}
                    className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition last:mb-0 ${
                      selected ? "bg-blue-50 text-cubelo-blue" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{rol.nombre}</span>
                    {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500">No hay roles activos.</div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedRoles.length ? (
          selectedRoles.map((rol) => (
            <span
              key={rol.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3333CC] bg-[#3333CC] px-3 py-1.5 text-sm font-semibold text-white"
            >
              {rol.nombre}
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => toggleRole(rol.id)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                  aria-label={`Quitar rol ${rol.nombre}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-400">Sin roles asignados</span>
        )}
      </div>
    </div>
  );
}
