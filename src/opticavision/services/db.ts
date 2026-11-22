import { loadFromStorage, saveToStorage } from '../../core/utils/storage';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { isUUID, getTodayLocalDate } from './storageHelper';

export { isUUID, getTodayLocalDate };

export function normalizeErpRow(row: any): any {
  if (!row) return row;
  const payload =
    row.payload && typeof row.payload === 'object' ? row.payload : {};
  const merged = { ...row, ...payload };
  delete merged.payload;
  return merged;
}

export async function syncErpTableFromSupabase<T>(
  tableName: string,
  storageKey: string,
  fallback: T[]
): Promise<T[]> {
  const local = loadFromStorage<T[]>(storageKey, fallback);
  if (!isSupabaseConfigured || !supabase) return local;
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      const normalized = data.map(normalizeErpRow) as T[];
      saveToStorage(storageKey, normalized);
      return normalized;
    }
  } catch (err) {
    console.warn(`[ERP Supabase Sync] Fallback local para ${tableName}:`, err);
  }
  return local;
}

export async function upsertErpRowToSupabase(
  tableName: string,
  item: any,
  extraColumns: Record<string, any> = {}
): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !item?.id) return;
  try {
    const rowPayload: Record<string, any> = {
      id: String(item.id),
      ...extraColumns,
      payload: item,
      updated_at: new Date().toISOString()
    };
    await supabase.from(tableName).upsert(rowPayload, { onConflict: 'id' });
  } catch (err) {
    console.warn(`[ERP Supabase Upsert] ${tableName}:`, err);
  }
}

export async function deleteErpRowFromSupabase(
  tableName: string,
  id: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !id) return;
  try {
    await supabase.from(tableName).delete().eq('id', String(id));
  } catch (err) {
    console.warn(`[ERP Supabase Delete] ${tableName}:`, err);
  }
}

export const ERP_STORAGE_KEYS = {
  CUENTAS: 'jt_pagos_erp_cuentas_v1',
  BANCOS: 'jt_pagos_erp_bancos_v1',
  MOVIMIENTOS_BANCOS: 'jt_pagos_erp_movimientos_bancos_v1',
  COMPROBANTES: 'jt_pagos_erp_comprobantes_v1',
  CONFIG_CONTABLE: 'jt_pagos_erp_config_contable_v1',
  TERMINALES_POS: 'jt_pagos_erp_terminales_pos_v1',
  LOTES_POS: 'jt_pagos_erp_lotes_pos_v1',
  ACTIVOS_FIJOS: 'jt_pagos_erp_activos_fijos_v1',
  CATEGORIAS_ACTIVOS: 'jt_pagos_erp_categorias_activos_v1',
  DEPRECIACIONES: 'jt_pagos_erp_depreciaciones_v1',
  CXC: 'jt_pagos_erp_cxc_v1',
  CXP: 'jt_pagos_erp_cxp_v1',
  COBRANZAS: 'jt_pagos_erp_cobranzas_v1',
  PAGOS: 'jt_pagos_erp_pagos_v1'
};

export const SAMPLE_FULL_BALANCE_CUENTAS = [
  // 1. ACTIVOS
  { id: '1', codigo: '1', nombre: 'ACTIVO', nivel: 1, tipo: 'Título General', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.1', codigo: '1.1', nombre: 'Activo Corriente', nivel: 2, tipo: 'Título de Cuenta Movimiento', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.1.01', codigo: '1.1.01', nombre: 'Efectivo y Equivalentes de Efectivo', nivel: 3, tipo: 'Título de Cuenta Movimiento', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.1.01.001', codigo: '1.1.01.001', nombre: 'Caja Chica Administración (USD)', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.01.002', codigo: '1.1.01.002', nombre: 'Caja Principal Efectivo (Bs / USD)', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.01.003', codigo: '1.1.01.003', nombre: 'Banesco Banco Universal (Cuenta Corriente Bs)', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.01.004', codigo: '1.1.01.004', nombre: 'Banco Mercantil (Cuenta Corriente Bs)', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.01.005', codigo: '1.1.01.005', nombre: 'Banesco Panamá / Zelle Corporativo (USD)', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.01.006', codigo: '1.1.01.006', nombre: 'Binance Pay Tesorería (USDT)', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.01.007', codigo: '1.1.01.007', nombre: 'Puntos de Venta (POS) por Liquidar', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },

  // 1.1.03 Cuentas por Cobrar
  { id: '1.1.03', codigo: '1.1.03', nombre: 'Deudores Comerciales y Cuentas por Cobrar', nivel: 3, tipo: 'Título de Cuenta Movimiento', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.1.03.001', codigo: '1.1.03.001', nombre: 'Cuentas por Cobrar Clientes Nacionales', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.03.006', codigo: '1.1.03.006', nombre: 'Anticipos a Proveedores, Hoteles y Aerolíneas', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },

  // 1.1.05 Tributos / Activos Fiscales
  { id: '1.1.05', codigo: '1.1.05', nombre: 'Activos Fiscales y Pagos Anticipados', nivel: 3, tipo: 'Título de Cuenta Movimiento', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.1.05.001', codigo: '1.1.05.001', nombre: 'Crédito Fiscal IVA por Compensar', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.05.002', codigo: '1.1.05.002', nombre: 'Retenciones de IVA Soportadas en Ventas', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.1.05.003', codigo: '1.1.05.003', nombre: 'Anticipos y Retenciones de ISLR', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },

  // 1.2 Activo No Corriente
  { id: '1.2', codigo: '1.2', nombre: 'Activo No Corriente', nivel: 2, tipo: 'Título de Cuenta Movimiento', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.2.01', codigo: '1.2.01', nombre: 'Propiedad, Mobiliario y Equipos (Activos Fijos)', nivel: 3, tipo: 'Título de Cuenta Movimiento', grupo: 'Activo', naturaleza: 'Deudora' },
  { id: '1.2.01.008', codigo: '1.2.01.008', nombre: 'Equipos de Computación, Redes y Servidores', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.2.01.009', codigo: '1.2.01.009', nombre: 'Depreciación Acumulada Equipos de Computación', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '1.2.01.010', codigo: '1.2.01.010', nombre: 'Mobiliario y Equipos de Oficina', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '1.2.01.011', codigo: '1.2.01.011', nombre: 'Depreciación Acumulada de Mobiliario', nivel: 4, tipo: 'Movimiento', grupo: 'Activo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },

  // 2. PASIVOS
  { id: '2', codigo: '2', nombre: 'PASIVO', nivel: 1, tipo: 'Título General', grupo: 'Pasivo', naturaleza: 'Acreedora' },
  { id: '2.1', codigo: '2.1', nombre: 'Pasivo Corriente', nivel: 2, tipo: 'Título de Cuenta Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora' },
  { id: '2.1.01', codigo: '2.1.01', nombre: 'Cuentas y Obligaciones Comerciales por Pagar', nivel: 3, tipo: 'Título de Cuenta Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora' },
  { id: '2.1.01.001', codigo: '2.1.01.001', nombre: 'Cuentas por Pagar Proveedores, Hoteles y Aerolíneas', nivel: 4, tipo: 'Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '2.1.01.002', codigo: '2.1.01.002', nombre: 'Tarjetas de Crédito Corporativas por Pagar (BSP)', nivel: 4, tipo: 'Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '2.1.01.003', codigo: '2.1.01.003', nombre: 'Pagos en Cuarentena por Identificar', nivel: 4, tipo: 'Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '2.1.03', codigo: '2.1.03', nombre: 'Tributos e Impuestos por Pagar', nivel: 3, tipo: 'Título de Cuenta Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora' },
  { id: '2.1.03.001', codigo: '2.1.03.001', nombre: 'Débito Fiscal IVA por Pagar', nivel: 4, tipo: 'Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '2.1.03.002', codigo: '2.1.03.002', nombre: 'Retenciones de IVA por Enterar SENIAT', nivel: 4, tipo: 'Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '2.1.03.003', codigo: '2.1.03.003', nombre: 'Retenciones de ISLR por Enterar SENIAT', nivel: 4, tipo: 'Movimiento', grupo: 'Pasivo', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },

  // 3. PATRIMONIO
  { id: '3', codigo: '3', nombre: 'PATRIMONIO', nivel: 1, tipo: 'Título General', grupo: 'Patrimonio', naturaleza: 'Acreedora' },
  { id: '3.1', codigo: '3.1', nombre: 'Patrimonio Neto y Reservas', nivel: 2, tipo: 'Título de Cuenta Movimiento', grupo: 'Patrimonio', naturaleza: 'Acreedora' },
  { id: '3.1.01.001', codigo: '3.1.01.001', nombre: 'Capital Social Suscrito y Pagado', nivel: 4, tipo: 'Movimiento', grupo: 'Patrimonio', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '3.1.03.001', codigo: '3.1.03.001', nombre: 'Utilidades Retenidas de Ejercicios Anteriores', nivel: 4, tipo: 'Movimiento', grupo: 'Patrimonio', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },
  { id: '3.1.03.003', codigo: '3.1.03.003', nombre: 'Resultado del Ejercicio Actual (Utilidad Neta)', nivel: 4, tipo: 'Movimiento', grupo: 'Patrimonio', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },

  // 4. INGRESOS
  { id: '4', codigo: '4', nombre: 'INGRESOS', nivel: 1, tipo: 'Título General', grupo: 'Ingresos', naturaleza: 'Acreedora' },
  { id: '4.1', codigo: '4.1', nombre: 'Ingresos por Servicios Turísticos y Operaciones', nivel: 2, tipo: 'Título de Cuenta Movimiento', grupo: 'Ingresos', naturaleza: 'Acreedora' },
  { id: '4.1.01.001', codigo: '4.1.01.001', nombre: 'Ingresos por Emisión de Boletos, Hoteles y Servicios', nivel: 4, tipo: 'Movimiento', grupo: 'Ingresos', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'cobranzas' },
  { id: '4.1.01.002', codigo: '4.1.01.002', nombre: 'Ganancia en Diferencial Cambiario (SAPS)', nivel: 4, tipo: 'Movimiento', grupo: 'Ingresos', naturaleza: 'Acreedora', saldo: 0, saldoActual: 0 },

  // 5. COSTOS Y GASTOS OPERATIVOS (JT PAGOS PRO)
  { id: '5', codigo: '5', nombre: 'COSTOS Y GASTOS OPERATIVOS', nivel: 1, tipo: 'Título General', grupo: 'Egresos', naturaleza: 'Deudora' },
  { id: '5.1', codigo: '5.1', nombre: 'Costos Directos de Operación (Boletos, Hoteles, Traslados)', nivel: 2, tipo: 'Título de Cuenta Movimiento', grupo: 'Egresos', naturaleza: 'Deudora' },
  { id: '5.1.01.001', codigo: '5.1.01.001', nombre: 'Costo de Emisión Boletos Aéreos (BSP / Consolidadores)', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'proveedores_real' },
  { id: '5.1.01.002', codigo: '5.1.01.002', nombre: 'Costo de Remisiones y Penalidades Aéreas', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'proveedores_real' },
  { id: '5.1.02.001', codigo: '5.1.02.001', nombre: 'Costo de Reservas y Emisión de Hoteles (Hospedaje)', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'proveedores_real' },
  { id: '5.1.03.001', codigo: '5.1.03.001', nombre: 'Costo de Traslados Ejecutivos y Transporte Terrestre', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'proveedores_real' },
  { id: '5.1.04.001', codigo: '5.1.04.001', nombre: 'Compras Directas por Página Web / Gastos de Apoyo', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'gastos_er' },
  { id: '5.2.01.001', codigo: '5.2.01.001', nombre: 'Comisiones Bancarias y Puntos de Venta (POS)', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'gastos_er' },
  { id: '5.2.01.002', codigo: '5.2.01.002', nombre: 'Pérdida en Diferencial Cambiario (SAPS)', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0 },
  { id: '6.1.01.001', codigo: '6.1.01.001', nombre: 'Viáticos y Gastos Operativos de Personal', nivel: 4, tipo: 'Movimiento', grupo: 'Egresos', naturaleza: 'Deudora', saldo: 0, saldoActual: 0, areaFlujoCaja: 'gastos_er' }
];

export async function dbResetToFullDemoCuentas(): Promise<any[]> {
  saveToStorage(ERP_STORAGE_KEYS.CUENTAS, SAMPLE_FULL_BALANCE_CUENTAS);
  if (isSupabaseConfigured && supabase) {
    try {
      const rows = SAMPLE_FULL_BALANCE_CUENTAS.map((c) => ({
        id: String(c.id),
        codigo: c.codigo,
        nombre: c.nombre,
        nivel: c.nivel,
        tipo: c.tipo,
        grupo: c.grupo,
        naturaleza: c.naturaleza,
        area_flujo_caja: (c as any).areaFlujoCaja || null,
        saldo: (c as any).saldo || 0,
        payload: c,
        updated_at: new Date().toISOString()
      }));
      await supabase.from('cuentas_contables').upsert(rows, { onConflict: 'id' });
    } catch {
      // ignore fallback
    }
  }
  return SAMPLE_FULL_BALANCE_CUENTAS;
}

export async function dbFetchTerminalesPos(_empresaId?: string): Promise<any[]> {
  return syncErpTableFromSupabase('terminales_pos', ERP_STORAGE_KEYS.TERMINALES_POS, []);
}

export async function dbSaveTerminalPos(term: any, _empresaId?: string): Promise<boolean> {
  const list = loadFromStorage<any[]>(ERP_STORAGE_KEYS.TERMINALES_POS, []);
  const id = term.id || crypto.randomUUID();
  const item = { ...term, id };
  const idx = list.findIndex((t) => String(t.id) === String(id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item };
  } else {
    list.push(item);
  }
  saveToStorage(ERP_STORAGE_KEYS.TERMINALES_POS, list);
  term.id = id;
  void upsertErpRowToSupabase('terminales_pos', item, {
    nombre: item.nombre || item.name || '',
    banco_id: item.banco_id || item.bancoId || null
  });
  return true;
}

export async function dbDeleteTerminalPos(id: string, _empresaId?: string): Promise<boolean> {
  const list = loadFromStorage<any[]>(ERP_STORAGE_KEYS.TERMINALES_POS, []);
  saveToStorage(
    ERP_STORAGE_KEYS.TERMINALES_POS,
    list.filter((t) => String(t.id) !== String(id))
  );
  void deleteErpRowFromSupabase('terminales_pos', id);
  return true;
}

export async function dbFetchLotesPos(_empresaId?: string): Promise<any[]> {
  return syncErpTableFromSupabase('lotes_pos', ERP_STORAGE_KEYS.LOTES_POS, []);
}

export async function dbSaveLotePos(lote: any, _empresaId?: string): Promise<boolean> {
  const list = loadFromStorage<any[]>(ERP_STORAGE_KEYS.LOTES_POS, []);
  const id = lote.id || crypto.randomUUID();
  const item = { ...lote, id };
  const idx = list.findIndex((l) => String(l.id) === String(id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item };
  } else {
    list.unshift(item);
  }
  saveToStorage(ERP_STORAGE_KEYS.LOTES_POS, list);
  lote.id = id;
  void upsertErpRowToSupabase('lotes_pos', item, {
    terminal_id: item.terminal_id || item.terminalId || null,
    fecha: item.fecha || null
  });
  return true;
}

export async function dbDeleteLotePos(id: string, _empresaId?: string): Promise<boolean> {
  const list = loadFromStorage<any[]>(ERP_STORAGE_KEYS.LOTES_POS, []);
  saveToStorage(
    ERP_STORAGE_KEYS.LOTES_POS,
    list.filter((l) => String(l.id) !== String(id))
  );
  void deleteErpRowFromSupabase('lotes_pos', id);
  return true;
}

export async function dbSaveComprobante(comp: any, _empresaId?: string): Promise<any> {
  const list = loadFromStorage<any[]>(ERP_STORAGE_KEYS.COMPROBANTES, []);
  const id = comp.id || crypto.randomUUID();
  const saved = { ...comp, id };
  const idx = list.findIndex((c) => String(c.id) === String(id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...saved };
  } else {
    list.unshift(saved);
  }
  saveToStorage(ERP_STORAGE_KEYS.COMPROBANTES, list);
  void upsertErpRowToSupabase('comprobantes_diario', saved, {
    numero: saved.numero || `CMP-${String(Date.now()).slice(-6)}`,
    fecha: saved.fecha || getTodayLocalDate(),
    tipo: saved.tipo || 'Diario',
    descripcion: saved.descripcion || '',
    referencia: saved.referencia || '',
    total: Number(saved.total) || 0,
    estado: saved.estado || 'Contabilizado',
    movimiento_banco_id: saved.movimientoBancoId || saved.movimiento_banco_id || null,
    lineas: Array.isArray(saved.lineas) ? saved.lineas : []
  });
  return saved;
}

export async function dbSaveConfiguracionContable(config: any, _empresaId?: string): Promise<any> {
  saveToStorage(ERP_STORAGE_KEYS.CONFIG_CONTABLE, config);
  void upsertErpRowToSupabase('configuracion_contable', { ...config, id: 'default' });
  return config;
}
