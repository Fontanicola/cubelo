import { type CategoriaMovimientoOption } from "@/components/movimientos/PopoverCategoria";
import { type CuentaMovimientoOption } from "@/components/movimientos/PopoverMetodoPago";

export type MovimientoRow = {
  id: string;
  fecha: string | null;
  descripcion: string | null;
  notas: string | null;
  referencia: string | null;
  importe: number;
  saldo?: number | null;
  moneda: string | null;
  origen: string | null;
  conciliado: boolean;
  categoriaId: string | null;
  categoriaNombre: string | null;
  categoriaColor: string | null;
  descripcionResumida: string | null;
  cuentaId: string | null;
  cuentaNombre: string | null;
  cuentaTipo: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  colaboradorId: string | null;
  colaboradorNombre: string | null;
  acuerdoId: string | null;
};

export type MovimientosClientProps = {
  bancariosRows: MovimientoRow[];
  otrosRows: MovimientoRow[];
  categorias: CategoriaMovimientoOption[];
  cuentas: CuentaMovimientoOption[];
};
