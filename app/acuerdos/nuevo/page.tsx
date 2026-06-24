"use client";

import { ArrowLeft, CalendarDays, Pencil, PenSquare, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createPersonalRow, WizardProvider, useWizard } from "@/app/acuerdos/nuevo/WizardContext";
import { SumarServicioModal } from "@/components/acuerdos/SumarServicioModal";
import { createClient } from "@/lib/supabase/client";

type ClienteOption = {
  id: string;
  nombre: string;
};

type ServiceOption = {
  id: string;
  nombre: string;
};

type CategoryOption = {
  id: string;
  nombre: string;
  servicioId: string;
};

type ProductOption = {
  id: string;
  nombre: string;
  categoriaId: string;
  servicioId: string;
  precioArs: number;
};

type CollaboratorOption = {
  id: string;
  nombreApellido: string;
};

type ProductRoleAssignment = {
  roleId: string;
  roleName: string;
  collaborators: Array<{ id: string; nombre: string }>;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-AR")}.-`;
}

function NuevoAcuerdoInner() {
  const { state, setState, reset } = useWizard();
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [categoriesByService, setCategoriesByService] = useState<Record<string, CategoryOption[]>>({});
  const [productsByCategory, setProductsByCategory] = useState<Record<string, ProductOption[]>>({});
  const [catalogProducts, setCatalogProducts] = useState<Record<string, ProductOption>>({});
  const [colaboradores, setColaboradores] = useState<CollaboratorOption[]>([]);
  const [selectedCategoryByService, setSelectedCategoryByService] = useState<Record<string, string>>({});
  const [productAssignments, setProductAssignments] = useState<Record<string, ProductRoleAssignment[]>>({});
  const [clientQuery, setClientQuery] = useState(state.clienteNombre);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [totalEditing, setTotalEditing] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadInitialData() {
      const [clientesResult, servicesResult, colaboradoresResult] = await Promise.all([
        supabase.from("clientes").select("id, nombre").order("nombre", { ascending: true }),
        supabase.from("servicios").select("id, nombre, activo, orden").eq("activo", true).order("orden", { ascending: true }),
        supabase.from("colaboradores").select("id, nombre, activo").eq("activo", true).order("nombre", { ascending: true })
      ]);

      if (clientesResult.error) {
        console.error("No se pudieron cargar los clientes", clientesResult.error);
      }

      if (servicesResult.error) {
        console.error("No se pudieron cargar los servicios", servicesResult.error);
      }

      if (colaboradoresResult.error) {
        console.error("No se pudieron cargar los colaboradores", colaboradoresResult.error);
      }

      setClientes(
        (clientesResult.data ?? []).map((cliente) => ({
          id: String(cliente.id),
          nombre: cliente.nombre ?? "Cliente"
        }))
      );

      setServices(
        (servicesResult.data ?? []).map((service) => ({
          id: String(service.id),
          nombre: service.nombre ?? "Servicio"
        }))
      );

      setColaboradores(
        (colaboradoresResult.data ?? []).map((colaborador) => ({
          id: String(colaborador.id),
          nombreApellido: colaborador.nombre ?? "Colaborador"
        }))
      );
    }

    loadInitialData();
  }, []);

  const activeService = services.find((service) => service.id === state.activeUnitId) ?? null;
  const activeCategories = activeService ? categoriesByService[activeService.id] ?? [] : [];
  const activeCategoryId = activeService ? selectedCategoryByService[activeService.id] ?? "" : "";
  const activeProducts = activeCategoryId ? productsByCategory[activeCategoryId] ?? [] : [];
  const selectedProductIds = Object.values(state.productsByUnit).flat();
  const selectedProducts = selectedProductIds
    .map((productId) => catalogProducts[productId])
    .filter((product): product is ProductOption => Boolean(product));
  const calculatedTotal = selectedProducts.reduce((sum, product) => sum + product.precioArs, 0);
  const total = state.manualTotal ?? calculatedTotal;
  const canContinue = Boolean(state.fecha && state.clienteId && selectedProducts.length);

  const filteredClientes = clientes
    .filter((cliente) => cliente.nombre.toLowerCase().includes(clientQuery.toLowerCase()))
    .slice(0, 5);

  async function loadCategories(serviceId: string) {
    if (categoriesByService[serviceId]) {
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre, servicio_id, activo, orden")
      .eq("servicio_id", serviceId)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("No se pudieron cargar las categorías", error);
      return;
    }

    setCategoriesByService((current) => ({
      ...current,
      [serviceId]: (data ?? []).map((category) => ({
        id: String(category.id),
        nombre: category.nombre ?? "Categoría",
        servicioId: String(category.servicio_id)
      }))
    }));
  }

  async function loadProducts(categoryId: string, serviceId: string) {
    if (productsByCategory[categoryId]) {
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, categoria_id, pdv_ars, activo, orden")
      .eq("categoria_id", categoryId)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("No se pudieron cargar los productos", error);
      return;
    }

    const nextProducts = (data ?? []).map((product) => ({
      id: String(product.id),
      nombre: product.nombre ?? "Producto",
      categoriaId: String(product.categoria_id),
      servicioId: serviceId,
      precioArs: Number(product.pdv_ars ?? 0)
    }));

    setProductsByCategory((current) => ({
      ...current,
      [categoryId]: nextProducts
    }));
    setCatalogProducts((current) => ({
      ...current,
      ...Object.fromEntries(nextProducts.map((product) => [product.id, product]))
    }));
  }

  async function loadAssignmentsForProduct(product: ProductOption) {
    if (productAssignments[product.id]) {
      return;
    }

    const supabase = createClient();
    const { data: rolesData, error: rolesError } = await supabase
      .from("producto_roles")
      .select("rol_id, roles(id, nombre)")
      .eq("producto_id", product.id);

    if (rolesError) {
      console.error("No se pudieron cargar los roles del producto", rolesError);
      return;
    }

    const roleAssignments = await Promise.all(
      (rolesData ?? []).map(async (row) => {
        const roleId = String(row.rol_id);
        const roleName =
          typeof row.roles === "object" && row.roles && "nombre" in row.roles
            ? String((row.roles as { nombre?: string | null }).nombre ?? "Rol")
            : "Rol";

        const collaboratorsResult = await supabase
          .from("colaborador_roles")
          .select("colaborador_id, colaboradores!inner(id, nombre, activo)")
          .eq("rol_id", roleId)
          .eq("colaboradores.activo", true);

        if (collaboratorsResult.error) {
          console.error("No se pudieron cargar los colaboradores para el rol", collaboratorsResult.error);
        }

        return {
          roleId,
          roleName,
          collaborators: (collaboratorsResult.data ?? []).map((item) => ({
            id: String(item.colaborador_id),
            nombre:
              typeof item.colaboradores === "object" && item.colaboradores && "nombre" in item.colaboradores
                ? String((item.colaboradores as { nombre?: string | null }).nombre ?? "Colaborador")
                : "Colaborador"
          }))
        } satisfies ProductRoleAssignment;
      })
    );

    setProductAssignments((current) => ({
      ...current,
      [product.id]: roleAssignments
    }));

    if (!activeService) {
      return;
    }

    setState((current) => {
      const existingRows = current.personalRowsByUnit[activeService.id] ?? [];
      const nextRows = [...existingRows];

      roleAssignments.forEach((assignment) => {
        if (!nextRows.some((row) => row.rol === assignment.roleName)) {
          nextRows.push(createPersonalRow(activeService.id, assignment.roleName, 0));
        }
      });

      return {
        ...current,
        personalRowsByUnit: {
          ...current.personalRowsByUnit,
          [activeService.id]: nextRows
        }
      };
    });
  }

  function toggleService(service: ServiceOption) {
    const isSelected = state.selectedUnitIds.includes(service.id);
    const nextSelectedIds = isSelected
      ? state.selectedUnitIds.filter((id) => id !== service.id)
      : [...state.selectedUnitIds, service.id];

    setState((current) => ({
      ...current,
      selectedUnitIds: nextSelectedIds,
      activeUnitId: isSelected ? nextSelectedIds[0] ?? "" : service.id,
      detailsByUnit: {
        ...current.detailsByUnit,
        [service.id]: current.detailsByUnit[service.id] ?? { tipoCobro: "completo" }
      }
    }));

    if (!isSelected) {
      void loadCategories(service.id);
    }
  }

  function selectCategory(category: CategoryOption) {
    setSelectedCategoryByService((current) => ({
      ...current,
      [category.servicioId]: category.id
    }));

    void loadProducts(category.id, category.servicioId);
  }

  async function addProduct(product: ProductOption) {
    if (!activeService) {
      return;
    }

    setState((current) => ({
      ...current,
      productsByUnit: {
        ...current.productsByUnit,
        [activeService.id]: Array.from(new Set([...(current.productsByUnit[activeService.id] ?? []), product.id]))
      }
    }));

    await loadAssignmentsForProduct(product);
  }

  function removeProduct(productId: string) {
    setState((current) => {
      const nextProductsByUnit = Object.fromEntries(
        Object.entries(current.productsByUnit).map(([serviceId, ids]) => [
          serviceId,
          ids.filter((id) => id !== productId)
        ])
      );

      return {
        ...current,
        productsByUnit: nextProductsByUnit
      };
    });
  }

  function updateCollaboratorAssignment(serviceId: string, roleName: string, collaboratorId: string) {
    setState((current) => {
      const existingRows = current.personalRowsByUnit[serviceId] ?? [];
      const rowIndex = existingRows.findIndex((row) => row.rol === roleName);

      if (rowIndex >= 0) {
        return {
          ...current,
          personalRowsByUnit: {
            ...current.personalRowsByUnit,
            [serviceId]: existingRows.map((row, index) =>
              index === rowIndex ? { ...row, colaboradorId: collaboratorId } : row
            )
          }
        };
      }

      return {
        ...current,
        personalRowsByUnit: {
          ...current.personalRowsByUnit,
          [serviceId]: [...existingRows, { ...createPersonalRow(serviceId, roleName, 0), colaboradorId: collaboratorId }]
        }
      };
    });
  }

  function chipClass(selected: boolean) {
    return `cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
      selected
        ? "border-[#3333CC] bg-[#3333CC] text-white"
        : "border-gray-300 bg-white text-gray-700 hover:border-[#3333CC] hover:text-[#3333CC]"
    }`;
  }

  const selectedServiceItems = state.selectedUnitIds.flatMap((serviceId) => {
    const service = services.find((item) => item.id === serviceId);
    const categories = categoriesByService[serviceId] ?? [];
    const selectedProductIdsForService = state.productsByUnit[serviceId] ?? [];

    return selectedProductIdsForService.map((productId) => {
      const product = catalogProducts[productId];
      const category = categories.find((item) => item.id === product?.categoriaId);
      return {
        serviceName: service?.nombre ?? "Servicio",
        categoryName: category?.nombre ?? "Categoría",
        product
      };
    });
  });

  return (
    <section className="flex min-h-[calc(100vh-120px)] flex-col bg-white">
      <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link
              href="/"
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md border border-cubelo-blue text-cubelo-blue hover:bg-blue-50"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="border-l-4 border-cubelo-blue pl-4">
              <h1 className="text-3xl font-bold text-black">Sumar Servicio</h1>
              <p className="mt-1 text-base font-medium italic text-gray-400">Configuración general</p>
            </div>
          </div>
          <Link
            href="/admin/servicios"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-cubelo-blue px-4 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar servicios
          </Link>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[30%_1px_minmax(0,70%)]">
          <div className="space-y-7 py-2 pr-0 lg:border-r lg:border-gray-200 lg:pr-8">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#3333CC]">FECHA</span>
              <div className="mt-2 flex h-11 items-center gap-2 rounded-md border border-gray-300 bg-white px-3">
                <CalendarDays className="h-4 w-4 text-cubelo-blue" aria-hidden="true" />
                <input
                  type="date"
                  value={state.fecha}
                  onChange={(event) => setState((current) => ({ ...current, fecha: event.target.value }))}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>

            <div className="relative">
              <span className="text-xs font-bold uppercase text-[#3333CC]">CLIENTE</span>
              <input
                value={clientQuery}
                onChange={(event) => {
                  setClientQuery(event.target.value);
                  setState((current) => ({ ...current, clienteId: "", clienteNombre: event.target.value }));
                }}
                className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
              {clientQuery ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => {
                        setClientQuery(cliente.nombre);
                        setState((current) => ({
                          ...current,
                          clienteId: cliente.id,
                          clienteNombre: cliente.nombre
                        }));
                      }}
                      className="block w-full px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      {cliente.nombre}
                    </button>
                  ))}
                  {!filteredClientes.length ? (
                    <Link
                      href="/clientes/nuevo"
                      className="block px-3 py-2 text-sm font-bold text-cubelo-blue hover:bg-blue-50"
                    >
                      Crear cliente
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#3333CC]">DETALLE PARA EL CLIENTE</span>
              <input
                value={state.detalle}
                onChange={(event) => setState((current) => ({ ...current, detalle: event.target.value }))}
                className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
              />
            </label>

            <div>
              <span className="text-xs font-bold uppercase text-[#3333CC]">SERVICIO</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={chipClass(state.selectedUnitIds.includes(service.id))}
                  >
                    {service.nombre}
                  </button>
                ))}
              </div>
              {state.selectedUnitIds
                .map((id) => services.find((service) => service.id === id))
                .some((service) => service?.nombre.toLowerCase().includes("audiovisual")) ? (
                <input
                  value={state.locacion}
                  onChange={(event) => setState((current) => ({ ...current, locacion: event.target.value }))}
                  placeholder="Completá la locación"
                  className="mt-3 h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
                />
              ) : null}
            </div>

            <div className="space-y-3">
              {selectedServiceItems.map((item) =>
                item.product ? (
                  <div key={item.product.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase text-cubelo-blue">{item.serviceName}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800">{item.categoryName}</div>
                        <div className="text-sm text-gray-600">{item.product.nombre}</div>
                        <div className="mt-2 text-sm font-bold text-gray-900">{formatMoney(item.product.precioArs)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(item.product.id)}
                        className="text-red-600 hover:text-red-700"
                        aria-label="Quitar producto"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          <div className="hidden h-full w-px bg-gray-200 lg:block" />

          <div className="space-y-8 py-2 pl-0 lg:pl-8">
            <div className="flex flex-wrap gap-2">
              {state.selectedUnitIds.map((serviceId) => {
                const service = services.find((item) => item.id === serviceId);
                return service ? (
                  <button
                    key={serviceId}
                    type="button"
                    onClick={() => {
                      setState((current) => ({ ...current, activeUnitId: serviceId }));
                      void loadCategories(serviceId);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                      state.activeUnitId === serviceId ? "bg-cubelo-blue text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {service.nombre}
                  </button>
                ) : null;
              })}
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-[#3333CC]">CATEGORÍA</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {!activeService ? (
                  <p className="text-sm font-medium text-gray-400">
                    Seleccioná un servicio para ver las categorías disponibles
                  </p>
                ) : (
                  <>
                    {activeCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectCategory(category)}
                        className={chipClass(activeCategoryId === category.id)}
                      >
                        {category.nombre}
                      </button>
                    ))}
                    {showCustomCategory ? (
                      <div className="flex gap-2">
                        <input
                          value={customCategory}
                          onChange={(event) => setCustomCategory(event.target.value)}
                          placeholder="Nueva categoría"
                          className="h-9 w-44 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-cubelo-blue"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomCategory(false);
                            setCustomCategory("");
                          }}
                          className="rounded-lg bg-cubelo-blue px-3 text-white"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCustomCategory(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 transition hover:border-[#3333CC] hover:text-[#3333CC]"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#3333CC] text-white">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        Sumar categoría
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-[#3333CC]">PRODUCTOS</span>
              <div className="mt-3 space-y-3">
                {!activeService || !activeCategoryId ? (
                  <p className="text-sm font-medium text-gray-400">
                    Seleccioná una categoría para ver sus productos
                  </p>
                ) : activeProducts.length ? (
                  activeProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => void addProduct(product)}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-cubelo-blue hover:bg-blue-50"
                    >
                      <span className="text-sm font-semibold text-gray-800">{product.nombre}</span>
                      <span className="text-sm font-bold text-cubelo-blue">{formatMoney(product.precioArs)}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm font-medium text-gray-400">No hay productos activos en esta categoría</p>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-[#3333CC]">COLABORADORES</span>
              <div className="mt-3 space-y-4">
                {activeService && (state.productsByUnit[activeService.id] ?? []).length ? (
                  (state.productsByUnit[activeService.id] ?? []).map((productId) => {
                    const product = catalogProducts[productId];
                    const assignments = productAssignments[productId] ?? [];

                    return product ? (
                      <div key={productId} className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-sm font-bold text-cubelo-blue">{product.nombre}</div>
                        <div className="mt-3 space-y-3">
                          {assignments.length ? (
                            assignments.map((assignment) => (
                              <label key={`${productId}-${assignment.roleId}`} className="block">
                                <span className="text-[11px] font-bold uppercase text-gray-500">
                                  Seleccionar {assignment.roleName}
                                </span>
                                <select
                                  value={
                                    state.personalRowsByUnit[activeService.id]?.find((row) => row.rol === assignment.roleName)
                                      ?.colaboradorId ?? ""
                                  }
                                  onChange={(event) =>
                                    updateCollaboratorAssignment(activeService.id, assignment.roleName, event.target.value)
                                  }
                                  className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-cubelo-blue"
                                >
                                  <option value="">Seleccionar</option>
                                  {assignment.collaborators.map((collaborator) => (
                                    <option key={collaborator.id} value={collaborator.id}>
                                      {collaborator.nombre}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))
                          ) : (
                            <p className="text-sm text-gray-400">Este producto no tiene roles requeridos.</p>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-sm font-medium text-gray-400">
                    Seleccioná un producto para asignar colaboradores
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-col gap-4 border-t border-gray-200 bg-[#F3F4F6] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex items-center justify-end gap-2 text-xl font-bold text-gray-900">
          TOTAL:
          {totalEditing ? (
            <input
              type="number"
              value={state.manualTotal ?? calculatedTotal}
              onChange={(event) => setState((current) => ({ ...current, manualTotal: Number(event.target.value || 0) }))}
              className="h-10 w-40 rounded-md border border-gray-300 px-3 text-right text-base"
            />
          ) : (
            <span>{formatMoney(total)}</span>
          )}
          <button type="button" onClick={() => setTotalEditing((current) => !current)} className="text-cubelo-blue">
            <PenSquare className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-cubelo-blue px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2929a8] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Continuar
        </button>
      </footer>

      <SumarServicioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        unidades={services.map((service) => ({ id: service.id, nombre: service.nombre }))}
        colaboradores={colaboradores}
        total={total}
      />
    </section>
  );
}

export default function NuevoAcuerdoPage() {
  return (
    <WizardProvider>
      <NuevoAcuerdoInner />
    </WizardProvider>
  );
}
