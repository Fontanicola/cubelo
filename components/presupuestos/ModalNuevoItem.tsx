"use client";

import { Bookmark, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { formatMoney, mapPresupuestoItem, type PresupuestoItem } from "@/lib/presupuestos/document";
import { createClient } from "@/lib/supabase/client";
import { useBudgetCatalog } from "@/components/presupuestos/useBudgetCatalog";

type ModalNuevoItemProps = {
  open: boolean;
  onClose: () => void;
  presupuestoId: string;
  onCreated: (item: PresupuestoItem) => void;
};

type AssignmentState = Record<string, { colaboradorId: string; costo: string }>;

export function ModalNuevoItem({ open, onClose, presupuestoId, onCreated }: ModalNuevoItemProps) {
  const { catalog, loading } = useBudgetCatalog(open);
  const [serviceId, setServiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [periodoMeses, setPeriodoMeses] = useState("");
  const [diaPago, setDiaPago] = useState("");
  const [renovacionAutomatica, setRenovacionAutomatica] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentState>({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const categories = useMemo(
    () => catalog.categories.filter((category) => category.servicioId === serviceId),
    [catalog.categories, serviceId]
  );
  const products = useMemo(
    () => catalog.products.filter((product) => product.categoriaId === categoryId),
    [catalog.products, categoryId]
  );
  const selectedProduct = products.find((product) => product.id === productId) ?? null;
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

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { data: insertedItem, error } = await supabase
        .from("presupuesto_items")
        .insert({
          presupuesto_id: presupuestoId,
          servicio_id: serviceId || null,
          categoria_id: categoryId || null,
          producto_id: productId || null,
          precio_unitario: Number(precioUnitario || selectedProduct?.pdvArs || 0),
          cantidad: Number(cantidad || 1),
          subtotal: Number(precioUnitario || selectedProduct?.pdvArs || 0) * Number(cantidad || 1),
          es_plan_mensual: Boolean(selectedProduct?.esPlanMensual),
          periodo_meses: selectedProduct?.esPlanMensual ? Number(periodoMeses || selectedProduct?.periodoMinimoMeses || 0) || null : null,
          dia_pago: selectedProduct?.esPlanMensual ? Number(diaPago || 0) || null : null,
          renovacion_automatica: selectedProduct?.esPlanMensual ? renovacionAutomatica : false
        })
        .select("*")
        .single();

      if (error || !insertedItem) {
        console.error("No se pudo guardar el item", error);
        setErrorMessage("No se pudo guardar el servicio.");
        return;
      }

      const collaboratorRows = requiredRoles.flatMap((roleId) => {
        const selected = assignments[roleId];

        if (!selected?.colaboradorId) {
          return [];
        }

        return [
          {
            presupuesto_item_id: insertedItem.id,
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

      onCreated(
        mapPresupuestoItem({
          ...(insertedItem as Record<string, unknown>),
          productos: selectedProduct
            ? {
                id: selectedProduct.id,
                nombre: selectedProduct.nombre,
                pdv_ars: selectedProduct.pdvArs,
                pdv_usd: selectedProduct.pdvUsd,
                costo_total: selectedProduct.costoTotal,
                es_plan_mensual: selectedProduct.esPlanMensual,
                periodo_minimo_meses: selectedProduct.periodoMinimoMeses,
                activo: true,
                orden: selectedProduct.orden,
                categorias: catalog.categories.find((category) => category.id === categoryId)
                  ? {
                      id: categoryId,
                      nombre: catalog.categories.find((category) => category.id === categoryId)?.nombre,
                      servicio_id: serviceId,
                      servicios: catalog.services.find((service) => service.id === serviceId)
                        ? {
                            id: serviceId,
                            nombre: catalog.services.find((service) => service.id === serviceId)?.nombre
                          }
                        : null
                    }
                  : null
              }
            : null
        })
      );

      onClose();
    } catch (error) {
      console.error("No se pudo guardar el item", error);
      setErrorMessage("No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Agregar servicio</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Servicio</span>
            <select
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setCategoryId("");
                setProductId("");
              }}
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
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Categoría</span>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setProductId("");
              }}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
              disabled={!serviceId}
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
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Producto</span>
            <select
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                const nextProduct = catalog.products.find((product) => product.id === event.target.value);
                setPrecioUnitario(String(nextProduct?.pdvArs ?? ""));
                setPeriodoMeses(String(nextProduct?.periodoMinimoMeses ?? ""));
                setRenovacionAutomatica(false);
                setAssignments({});
              }}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
              disabled={!categoryId}
            >
              <option value="">Seleccionar</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nombre} - {formatMoney(product.pdvArs)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Precio unitario</span>
            <input
              type="number"
              value={precioUnitario}
              onChange={(event) => setPrecioUnitario(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold uppercase text-cubelo-blue">Cantidad</span>
            <input
              type="number"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
            />
          </label>
        </div>

        {selectedProduct?.esPlanMensual ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-cubelo-blue">Período mínimo</span>
              <input
                type="number"
                value={periodoMeses}
                onChange={(event) => setPeriodoMeses(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase text-cubelo-blue">Día de pago</span>
              <input
                type="number"
                value={diaPago}
                onChange={(event) => setDiaPago(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
              />
            </label>
            <label className="flex items-end gap-2 rounded-md border border-gray-300 px-3 py-2">
              <input
                type="checkbox"
                checked={renovacionAutomatica}
                onChange={(event) => setRenovacionAutomatica(event.target.checked)}
                className="h-4 w-4 accent-cubelo-blue"
              />
              <span className="text-sm font-semibold text-gray-700">Renovación automática</span>
            </label>
          </div>
        ) : null}

        {requiredRoles.length ? (
          <div className="mt-6 space-y-3">
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
                      value={assignments[roleId]?.colaboradorId ?? ""}
                      onChange={(event) =>
                        setAssignments((current) => ({
                          ...current,
                          [roleId]: {
                            colaboradorId: event.target.value,
                            costo: current[roleId]?.costo ?? "0"
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
                      value={assignments[roleId]?.costo ?? "0"}
                      onChange={(event) =>
                        setAssignments((current) => ({
                          ...current,
                          [roleId]: {
                            colaboradorId: current[roleId]?.colaboradorId ?? "",
                            costo: event.target.value
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

        {errorMessage ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-md bg-cubelo-blue px-5 py-2 text-sm font-bold text-white hover:bg-[#2929a8] disabled:bg-gray-300"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            {saving ? "Guardando" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
