/**
 * Utilidades seguras de almacenamiento local con manejo de errores
 * y protección contra QuotaExceededError o JSON corrupto.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`[Storage] Error al leer la clave "${key}":`, err);
    return fallback;
  }
}

export function saveToStorage<T>(
  key: string,
  value: T,
  onQuotaError?: () => void
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[Storage] No se pudo guardar la clave "${key}":`, err);
    onQuotaError?.();
    return false;
  }
}
