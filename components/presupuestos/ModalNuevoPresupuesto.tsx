"use client";

import { Bookmark, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { mapPresupuestoItem, type PresupuestoItem } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/client";
import { useBudgetCatalog } from "@/components/presupuestos/useBudgetCatalog";

type ModalNuevoPresupuestoProps = {
  clienteId: string;
};

type DraftItem = {
  serviceId: string;
  categoryId: string;
  productId: string;
  precioUnitario: string;
  cantidad: string;
  periodoMeses: string;
  diaPago: string;
  renovacionAutomatica: boolean;
  assignments: Record<string, { colaboradorId: string; costo: string }>;
};

const emptyDraft = (): DraftItem => ({
  serviceId: "",
  categoryId: "",
  productId: "",
  precioUnitario: "",
  cantidad: "1",
  periodoMeses: "",
  diaPago: "",
  renovacionAutomatica: false,
  assignments: {}
});

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR")}.-`;
}

export function ModalNuevoPresupuesto({ clienteId }: ModalNuevoPresupuestoProps) {
  const [open, setOpen] = useState(false);
  const { catalog, loading } = useBudgetCatalog(open);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [moneda, setMoneda] = useState("ARS");
  const [descuento, setDescuento] = useState("0");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = useMemo(
    () => catalog.categories.filter((category) => category.servicioId === draft.serviceId),
    [catalog.categories, draft.serviceId]
  );
  const products = useMemo(
    () => catalog.products.filter((product) => product.categoriaId === draft.categoryId),
    [catalog.products, draft.categoryId]
  );
  const selectedProduct = products.find((product) => product.id === draft.productId) ?? null;
  const requiredRoles = useMemo(
    () => (selectedProduct ? catalog.productRoles[selectedProduct.id] ?? [] : []),
    [catalog.productRoles, selectedProduct]
  );
  const collaboratorOptionsByRole = useMemo(() => {
    return requiredRoles.reduce<Record<string, { id: string; nombre: string }[]>>((acc, roleId) => {
      acc[roleId] = catalog.collaborators.filter((collaborator) => collaborator.roleIds.includes(roleId));
      return acc;
    }, {});
  }, [catalog.collaborators, requiredRoles]);

  const totalBruto = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.precioUnitario || selectedProduct?.pdvArs || 0);
      const amount = Number(item.cantidad || 1);
      return sum + price * amount;
    }, 0);
  }, [items, selectedProduct?.pdvArs]);
  const totalNeto = totalBruto - (totalBruto * Number(descuento || 0)) / 100;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo presupuesto
      </button>
    );
  }

  function addDraftItem() {
    if (!draft.serviceId || !draft.categoryId || !draft.productId) {
      return;
    }

    setItems((current) => [...current, { ...draft }]);
    setDraft(emptyDraft());
  }

  async function saveBudget() {
    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { data: userResult } = await supabase.auth.getUser();
      const userId = userResult.user?.id ?? null;

      const { data: presupuesto, error } = await supabase
        .from("presupuestos")
        .insert({
          cliente_id: clienteId,
          fecha,
          estado: "esperando_aprobacion",
          descuento_porcentaje: Number(descuento || 0),
          total_bruto: totalBruto,
          total_neto: totalNeto,
          moneda,
          created_by: userId
        })
        .select("id")
        .single();

      if (error || !presupuesto?.id) {
        console.error("No se pudo guardar el presupuesto", error);
        setErrorMessage("No se pudo guardar el presupuesto.");
        return;
      }

      for (const [index, item] of items.map((value, idx) => [idx, value] as const)) {
        const product = catalog.products.find((entry) => entry.id === item.productId) ?? null;
        const price = Number(item.precioUnitario || product?.pdvArs || 0);
        const qty = Number(item.cantidad || 1);

        const { data: savedItem, error: itemError } = await supabase
          .from("presupuesto_items")
          .insert({
            presupuesto_id: presupuesto.id,
            servicio_id: item.serviceId,
            categoria_id: item.categoryId,
            producto_id: item.productId,
            precio_unitario: price,
            cantidad: qty,
            subtotal: price * qty,
            es_plan_mensual: Boolean(product?.esPlanMensual),
            periodo_meses: product?.esPlanMensual ? Number(item.periodoMeses || product?.periodoMinimoMeses || 0) || null : null,
            dia_pago: product?.esPlanMensual ? Number(item.diaPago || 0) || null : null,
            renovacion_automatica: product?.esPlanMensual ? item.renovacionAutomatica : false,
            orden: index + 1
          })
          .select("id")
          .single();

        if (itemError || !savedItem?.id) {
          console.error("No se pudo guardar el item del presupuesto", itemError);
          continue;
        }

        const collaboratorRows = requiredRoles.flatMap((roleId) => {
          const selected = item.assignments[roleId];

          if (!selected?.colaboradorId) {
            return [];
          }

          return [
            {
              presupuesto_item_id: savedItem.id,
              colaborador_id: selected.colaboradorId,
              rol_id: roleId,
              costo: Number(selected.costo || 0)
            }
          ];
        });

        if (collaboratorRows.length) {
          const { error: collaboratorError } = await supabase.from("presupuesto_item_colaboradores").insert(collaboratorRows);
          if (collaboratorError) {
            console.error("No se pudieron guardar los colaboradores del item", collaboratorError);
          }
        }
      }

      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("No se pudo guardar el presupuesto", error);
      setErrorMessage("No se pudo guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/30 px-4 py-4">
      <div className="mx-auto my-4 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="border-l-4 border-cubelo-blue pl-4">
            <h2 className="text-2xl font-bold text-black">Nuevo presupuesto</h2>
            <p className="mt-1 text-sm italic text-gray-400">Armá los items y sus colaboradores antes de guardar.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Moneda</span>
            <select
              value={moneda}
              onChange={(event) => setMoneda(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Descuento (%)</span>
            <input
              type="number"
              value={descuento}
              onChange={(event) => setDescuento(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <div className="mb-3 text-sm font-bold uppercase text-cubelo-blue">Agregar servicio</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-gray-500">Servicio</span>
              <select
                value={draft.serviceId}
                onChange={(event) => setDraft((current) => ({ ...current, serviceId: event.target.value, categoryId: "", productId: "" }))}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
              >
                <option value="">Seleccionar</option>
                {catalog.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-gray-500">Categoría</span>
              <select
                value={draft.categoryId}
                onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value, productId: "" }))}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                disabled={!draft.serviceId}
              >
                <option value="">Seleccionar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-[11px] font-bold uppercase text-gray-500">Producto</span>
              <select
                value={draft.productId}
                onChange={(event) => {
                  const nextProduct = catalog.products.find((product) => product.id === event.target.value);
                  setDraft((current) => ({
                    ...current,
                    productId: event.target.value,
                    precioUnitario: String(nextProduct?.pdvArs ?? ""),
                    periodoMeses: String(nextProduct?.periodoMinimoMeses ?? ""),
                    renovacionAutomatica: false,
                    assignments: {}
                  }));
                }}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                disabled={!draft.categoryId}
              >
                <option value="">Seleccionar</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nombre} - {formatMoney(product.pdvArs)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedProduct?.esPlanMensual ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase text-gray-500">Período mínimo</span>
                <input
                  type="number"
                  value={draft.periodoMeses}
                  onChange={(event) => setDraft((current) => ({ ...current, periodoMeses: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase text-gray-500">Día de pago</span>
                <input
                  type="number"
                  value={draft.diaPago}
                  onChange={(event) => setDraft((current) => ({ ...current, diaPago: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                />
              </label>
              <label className="flex items-end gap-2 rounded-md border border-gray-300 px-3 py-2">
                <input
                  type="checkbox"
                  checked={draft.renovacionAutomatica}
                  onChange={(event) => setDraft((current) => ({ ...current, renovacionAutomatica: event.target.checked }))}
                  className="h-4 w-4 accent-cubelo-blue"
                />
                <span className="text-sm font-semibold text-gray-700">Renovación automática</span>
              </label>
            </div>
          ) : null}

          {requiredRoles.length ? (
            <div className="mt-4 space-y-3">
              <div className="text-[11px] font-bold uppercase text-cubelo-blue">Colaboradores requeridos</div>
              {requiredRoles.map((roleId) => {
                const role = catalog.roles.find((entry) => entry.id === roleId);
                const options = collaboratorOptionsByRole[roleId] ?? [];

                return (
                  <div key={roleId} className="grid gap-3 rounded-md border border-gray-200 p-3 md:grid-cols-[1fr_140px]">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase text-gray-500">
                        Seleccionar {role?.nombre ?? "rol"}
                      </span>
                      <select
                        value={draft.assignments[roleId]?.colaboradorId ?? ""}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            assignments: {
                              ...current.assignments,
                              [roleId]: {
                                colaboradorId: event.target.value,
                                costo: current.assignments[roleId]?.costo ?? "0"
                              }
                            }
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                      >
                        <option value="">Seleccionar</option>
                        {options.map((collaborator) => (
                          <option key={collaborator.id} value={collaborator.id}>
                            {collaborator.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase text-gray-500">Costo</span>
                      <input
                        type="number"
                        value={draft.assignments[roleId]?.costo ?? "0"}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            assignments: {
                              ...current.assignments,
                              [roleId]: {
                                colaboradorId: current.assignments[roleId]?.colaboradorId ?? "",
                                costo: event.target.value
                              }
                            }
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={addDraftItem}
              className="inline-flex items-center gap-2 rounded-md border border-cubelo-blue px-4 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar servicio
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="text-sm font-bold uppercase text-cubelo-blue">Items agregados</div>
          {items.length ? (
            items.map((item, index) => {
              const product = catalog.products.find((entry) => entry.id === item.productId);
              const service = catalog.services.find((entry) => entry.id === item.serviceId);
              const category = catalog.categories.find((entry) => entry.id === item.categoryId);

              return (
                <div key={`${item.productId}-${index}`} className="rounded-md border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase text-gray-400">{service?.nombre}</div>
                      <div className="text-sm font-semibold text-gray-900">{category?.nombre}</div>
                      <div className="text-sm text-gray-700">{product?.nombre}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    Precio: {formatMoney(Number(item.precioUnitario || product?.pdvArs || 0))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">Todavía no agregaste servicios.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-gray-700">Total bruto</span>
            <span className="font-bold text-gray-900">{formatMoney(totalBruto)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-gray-700">Descuento</span>
            <span className="font-bold text-gray-900">-{formatMoney(totalBruto - totalNeto)}</span>
          </div>
          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-gray-900">Total neto</span>
            <span className="font-bold text-gray-900">{formatMoney(totalNeto)}</span>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveBudget}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8] disabled:bg-gray-300"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Guardar presupuesto
          </button>
        </div>
      </div>
    </div>
  );
}
