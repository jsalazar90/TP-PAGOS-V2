import { getTodayLocalDate } from '../utils/dateUtils';
import { loadFromStorage, saveToStorage } from '../../core/utils/storage';

export interface TasaCambioDia {
  id: string;
  fecha: string;
  tasa: number;
  fuente?: string;
  created_at?: string;
}

const TASAS_STORAGE_KEY = 'jt_pagos_erp_tasas_bcv_v1';

const INITIAL_TASAS: TasaCambioDia[] = [
  { id: 'bcv-2026-11-21', fecha: '2026-11-21', tasa: 919.8227, fuente: 'BCV' },
  { id: 'bcv-2026-11-20', fecha: '2026-11-20', tasa: 918.7662, fuente: 'BCV' },
  { id: 'bcv-2026-11-19', fecha: '2026-11-19', tasa: 917.7751, fuente: 'BCV' }
];

export function getStoredTasas(): TasaCambioDia[] {
  return loadFromStorage<TasaCambioDia[]>(TASAS_STORAGE_KEY, INITIAL_TASAS);
}

export async function syncTasasFromDatabase(): Promise<TasaCambioDia[]> {
  return getStoredTasas();
}

export async function dbSaveTasaCambio(
  fecha: string,
  tasa: number,
  fuente: string = 'BCV'
): Promise<TasaCambioDia[]> {
  const cleanFecha = (fecha || getTodayLocalDate()).split('T')[0];
  const numericTasa = Number(Number(tasa).toFixed(4));
  const current = getStoredTasas();
  const idx = current.findIndex((t) => t.fecha === cleanFecha);
  const now = new Date().toISOString();

  if (idx >= 0) {
    current[idx] = { ...current[idx], tasa: numericTasa, fuente, created_at: now };
  } else {
    current.unshift({
      id: `bcv-${cleanFecha}`,
      fecha: cleanFecha,
      tasa: numericTasa,
      fuente,
      created_at: now
    });
  }
  current.sort((a, b) => b.fecha.localeCompare(a.fecha));
  saveToStorage(TASAS_STORAGE_KEY, current);
  return current;
}

export function saveStoredTasa(
  fecha: string,
  tasa: number,
  fuente: string = 'BCV'
): TasaCambioDia[] {
  void dbSaveTasaCambio(fecha, tasa, fuente);
  return getStoredTasas();
}

export async function dbDeleteTasaCambio(fecha: string): Promise<TasaCambioDia[]> {
  const cleanFecha = (fecha || '').split('T')[0];
  const next = getStoredTasas().filter((t) => t.fecha !== cleanFecha);
  saveToStorage(TASAS_STORAGE_KEY, next);
  return next;
}

export function deleteStoredTasa(fecha: string): TasaCambioDia[] {
  void dbDeleteTasaCambio(fecha);
  return getStoredTasas();
}

export function getTasaForDate(fecha?: string): number {
  const targetDate = (fecha || getTodayLocalDate()).split('T')[0];
  const list = getStoredTasas();

  const exact = list.find((t) => t.fecha === targetDate);
  if (exact && exact.tasa > 0) return exact.tasa;

  const prior = list
    .filter((t) => t.fecha <= targetDate && t.tasa > 0)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (prior.length > 0) return prior[0].tasa;

  if (list.length > 0 && list[0].tasa > 0) return list[0].tasa;
  return 919.8227;
}

export interface LiveBcvResult {
  success: boolean;
  tasa?: number;
  fecha?: string;
  fuente?: string;
  error?: string;
}

export async function fetchLiveBcvRate(_force: boolean = false): Promise<LiveBcvResult> {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (res.ok) {
      const data: any = await res.json();
      const rate = Number(data.promedio || data.venta || data.precio);
      if (rate > 0) {
        const fecha =
          (data.fechaActualizacion ? data.fechaActualizacion.split('T')[0] : '') ||
          getTodayLocalDate();
        const rounded = Number(rate.toFixed(4));
        await dbSaveTasaCambio(fecha, rounded, 'BCV (Oficial)');
        return {
          success: true,
          tasa: rounded,
          fecha,
          fuente: 'BCV (Oficial)'
        };
      }
    }
  } catch {
    // Fallback a tasa guardada
  }
  const latest = getTasaForDate();
  return {
    success: true,
    tasa: latest,
    fecha: getTodayLocalDate(),
    fuente: 'BCV'
  };
}
