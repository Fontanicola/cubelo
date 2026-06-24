"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const STORAGE_KEY = "cubelo:sumar-servicio";

export type ClienteOption = {
  id: string;
  razonSocial: string;
};

export type UnidadOption = {
  id: string;
  nombre: string;
};

export type ProductoOption = {
  id: string;
  nombre: string;
  unidadNegocioId: string | null;
  precioArs: number;
  raw: Record<string, unknown>;
};

export type ColaboradorOption = {
  id: string;
  nombreApellido: string;
};

export type PersonalRow = {
  id: string;
  unidadId: string;
  colaboradorId: string;
  rol: string;
  estadoPago: "pendiente" | "pagado";
  tipoPago?: "completo" | "anticipo";
  montoAnticipo?: number;
  nota?: string;
  feeAcordado: number;
};

export type UnitDetail = {
  montoTotal?: number;
  utilidad?: number;
  tipoCobro: "completo" | "anticipo";
  montoAnticipo?: number;
  locacion?: string;
};

export type WizardState = {
  fecha: string;
  clienteId: string;
  clienteNombre: string;
  detalle: string;
  activeUnitId: string;
  selectedUnitIds: string[];
  locacion: string;
  productsByUnit: Record<string, string[]>;
  customProductsByUnit: Record<string, string[]>;
  rolesByUnit: Record<string, string[]>;
  personalRowsByUnit: Record<string, PersonalRow[]>;
  detailsByUnit: Record<string, UnitDetail>;
  manualTotal: number | null;
  linkReferencia: string;
};

const initialState: WizardState = {
  fecha: new Date().toISOString().slice(0, 10),
  clienteId: "",
  clienteNombre: "",
  detalle: "",
  activeUnitId: "",
  selectedUnitIds: [],
  locacion: "",
  productsByUnit: {},
  customProductsByUnit: {},
  rolesByUnit: {},
  personalRowsByUnit: {},
  detailsByUnit: {},
  manualTotal: null,
  linkReferencia: ""
};

type WizardContextValue = {
  state: WizardState;
  setState: (next: WizardState | ((current: WizardState) => WizardState)) => void;
  reset: () => void;
  getSelectedProductIds: () => string[];
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setState({ ...initialState, ...JSON.parse(stored) });
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<WizardContextValue>(
    () => ({
      state,
      setState,
      reset() {
        setState(initialState);
        window.sessionStorage.removeItem(STORAGE_KEY);
      },
      getSelectedProductIds() {
        return Object.values(state.productsByUnit).flat();
      }
    }),
    [state]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);

  if (!context) {
    throw new Error("useWizard must be used inside WizardProvider");
  }

  return context;
}

export const ROLE_OPTIONS = [
  "Animador",
  "Community Manager",
  "Realizador Audiovisual",
  "Creativo",
  "Diseñador",
  "Dronero",
  "Renderista 3D",
  "Editor de videos",
  "Editor de fotos",
  "Editor de planos",
  "Ejecutivo",
  "Guionista",
  "Publicista",
  "Editor de recorridos virtuales",
  "Fotógrafo",
  "Programador"
];

export function createPersonalRow(unidadId: string, rol: string, feeAcordado: number): PersonalRow {
  return {
    id: `${unidadId}-${rol}-${crypto.randomUUID()}`,
    unidadId,
    colaboradorId: "",
    rol,
    estadoPago: "pendiente",
    tipoPago: "completo",
    feeAcordado
  };
}
