export const isUUID = (str?: string | null): boolean =>
  Boolean(
    str &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim())
  );

export const getTodayLocalDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function sanitizeInput(value?: string | null, maxLength: number = 500): string {
  if (!value) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function normalizeTaxId(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .trim()
    .slice(0, 25);
}

export async function purgeAllLegacyLocalBusinessData(): Promise<void> {}
export const DEFAULT_LOCAL_COMPANY: any = null;
export async function getLocal<T>(_key: string, defaultVal: T): Promise<T> {
  return defaultVal;
}
export async function setLocal(_key: string, _val: any): Promise<void> {}
export async function delLocal(_key: string): Promise<void> {}
