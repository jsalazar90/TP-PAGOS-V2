import {
  CreatePaymentRequestInput,
  FinancialSummary,
  PaymentRequest,
  RequestStatus,
  UserProfile,
  UserRole,
  Beneficiary,
  AttachedFile,
  JtRate
} from '../types';
import { INITIAL_REQUESTS, INITIAL_USERS, INITIAL_BENEFICIARIES } from './mockData';
import { uploadAttachment } from './storage';
import { isSupabaseConfigured, supabase } from './supabase';
import { broadcastPushToAdmins, broadcastPushToAll } from './pushSender';

const REQUESTS_STORAGE_KEY = 'jt_pagos_requests_v1';
const USERS_STORAGE_KEY = 'jt_pagos_users_v1';
const BENEFICIARIES_STORAGE_KEY = 'jt_pagos_beneficiaries_v1';
const DELETED_REQUESTS_KEY = 'jt_pagos_deleted_requests_v1';

function getDeletedRequestIds(): Set<string> {
  try {
    const stored = localStorage.getItem(DELETED_REQUESTS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function addDeletedRequestId(id: string) {
  try {
    const set = getDeletedRequestIds();
    set.add(id);
    localStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    // ignore
  }
}

// Initial local storage setup
function getLocalRequests(): PaymentRequest[] {
  const users = getLocalUsers();
  const userMap = new Map(users.map(u => [u.id, u.full_name || u.username]));
  const deletedIds = getDeletedRequestIds();
  const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
  if (!stored) {
    const initialized = INITIAL_REQUESTS
      .filter(req => !deletedIds.has(req.id))
      .map(req => ({
        ...req,
        creator_name: req.creator_name || userMap.get(req.created_by) || 'Usuario'
      }));
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(initialized));
    return initialized;
  }
  try {
    const parsed: PaymentRequest[] = JSON.parse(stored);
    return parsed
      .filter(req => !deletedIds.has(req.id))
      .map(req => ({
        ...req,
        creator_name: req.creator_name || userMap.get(req.created_by) || 'Usuario'
      }));
  } catch (e) {
    return INITIAL_REQUESTS.filter(req => !deletedIds.has(req.id));
  }
}

export function setLocalRequests(requests: PaymentRequest[]) {
  const deletedIds = getDeletedRequestIds();
  const filtered = requests.filter(r => !deletedIds.has(r.id));
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(filtered));
}

export function saveRealtimeRequestToLocal(action: 'upsert' | 'delete', itemOrId: PaymentRequest | string) {
  try {
    const local = getLocalRequests();
    if (action === 'delete') {
      setLocalRequests(local.filter(r => r.id !== itemOrId));
    } else {
      const item = itemOrId as PaymentRequest;
      const exists = local.some(r => r.id === item.id);
      if (exists) {
        setLocalRequests(local.map(r => r.id === item.id ? { ...r, ...item } : r));
      } else {
        setLocalRequests([item, ...local]);
      }
    }
  } catch (e) {
    console.warn('saveRealtimeRequestToLocal error:', e);
  }
}

// Initial local storage setup
function getLocalUsers(): UserProfile[] {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    const parsed: any[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return parsed.map(u => {
      const uname = String(u?.username || u?.email?.split('@')[0] || u?.full_name || 'usuario').trim();
      return {
        id: u?.id || `usr-${Date.now()}`,
        username: uname,
        email: u?.email || `${uname.toLowerCase()}@tppagos.com`,
        full_name: u?.full_name || uname,
        role: u?.role || 'solicitante',
        is_active: u?.is_active ?? true,
        password: u?.password || (uname.toLowerCase() === 'admin' ? 'admin' : '1234'),
        created_at: u?.created_at || new Date().toISOString()
      };
    });
  } catch (e) {
    return INITIAL_USERS;
  }
}

function setLocalUsers(users: UserProfile[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function normalizeBeneficiary(b: any): Beneficiary {
  let bDetails = b.bank_details;
  if (typeof bDetails === 'string') {
    try {
      bDetails = JSON.parse(bDetails);
    } catch (e) {
      bDetails = {};
    }
  }
  bDetails = bDetails || {};

  const benName = (b.name || bDetails.beneficiary || b.bank_beneficiary || '').trim().toUpperCase();
  const benRif = (b.rif || bDetails.rif || b.bank_rif || '').trim().toUpperCase();

  return {
    id: String(b.id || `ben-${Date.now()}`),
    name: benName,
    rif: benRif,
    category: b.category || 'hospedaje',
    bank_details: {
      payment_method: bDetails.payment_method || b.payment_method || 'transferencia_bs',
      beneficiary: benName,
      rif: benRif,
      bank: (bDetails.bank || b.bank_name || 'BANESCO').trim().toUpperCase(),
      account_number: (bDetails.account_number || b.bank_account || '').trim(),
      account_type: bDetails.account_type || 'Corriente',
      pago_movil_phone: (bDetails.pago_movil_phone || b.pago_movil_phone || '').trim(),
      pago_movil_ci: (bDetails.pago_movil_ci || b.pago_movil_ci || '').trim().toUpperCase(),
      binance_email: (bDetails.binance_email || b.binance_email || '').trim(),
      binance_pay_id: (bDetails.binance_pay_id || b.binance_pay_id || '').trim(),
      zelle_email: (bDetails.zelle_email || b.zelle_email || '').trim(),
      zelle_name: (bDetails.zelle_name || b.zelle_name || '').trim().toUpperCase(),
      cash_receiver: (bDetails.cash_receiver || b.cash_receiver || '').trim().toUpperCase(),
      notes: bDetails.notes || ''
    },
    created_at: b.created_at || new Date().toISOString(),
    updated_at: b.updated_at || new Date().toISOString()
  };
}

const DELETED_BENEFICIARIES_KEY = 'jt_pagos_deleted_beneficiaries_v1';

export function getDeletedBeneficiaryIds(): string[] {
  try {
    const stored = localStorage.getItem(DELETED_BENEFICIARIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

export function addDeletedBeneficiaryId(id: string) {
  const deleted = getDeletedBeneficiaryIds();
  if (!deleted.includes(id)) {
    deleted.push(id);
    localStorage.setItem(DELETED_BENEFICIARIES_KEY, JSON.stringify(deleted));
  }
}

export function removeDeletedBeneficiaryId(id: string) {
  const deleted = getDeletedBeneficiaryIds();
  const filtered = deleted.filter(dId => dId !== id);
  localStorage.setItem(DELETED_BENEFICIARIES_KEY, JSON.stringify(filtered));
}

// Initial local storage setup for Beneficiaries
function getLocalBeneficiaries(): Beneficiary[] {
  const deletedIds = getDeletedBeneficiaryIds();
  const stored = localStorage.getItem(BENEFICIARIES_STORAGE_KEY);
  if (stored === null) {
    localStorage.setItem(BENEFICIARIES_STORAGE_KEY, JSON.stringify(INITIAL_BENEFICIARIES));
    return INITIAL_BENEFICIARIES.map(normalizeBeneficiary).filter(b => !deletedIds.includes(b.id));
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeBeneficiary).filter(b => !deletedIds.includes(b.id));
  } catch (e) {
    return [];
  }
}

function setLocalBeneficiaries(bens: Beneficiary[]) {
  localStorage.setItem(BENEFICIARIES_STORAGE_KEY, JSON.stringify(bens.map(normalizeBeneficiary)));
}

export function getRequestReceiptFiles(r?: PaymentRequest | null): AttachedFile[] {
  if (!r) return [];
  if (Array.isArray(r.receipt_files) && r.receipt_files.length > 0) {
    return r.receipt_files;
  }
  if (r.receipt_file_url) {
    return [{
      url: r.receipt_file_url,
      fileName: r.receipt_file_name || 'Comprobante de Pago',
      uploaded_at: r.updated_at || r.created_at
    }];
  }
  return [];
}

export function getRequestSupportFiles(r?: PaymentRequest | null): AttachedFile[] {
  if (!r) return [];
  if (Array.isArray(r.support_files) && r.support_files.length > 0) {
    return r.support_files;
  }
  if (r.support_file_url) {
    return [{
      url: r.support_file_url,
      fileName: r.support_file_name || 'Soporte de Reserva',
      uploaded_at: r.created_at
    }];
  }
  return [];
}

export function normalizePaymentRequest(
  item: any,
  userMap?: Map<string, string>,
  _currentUser?: UserProfile | null
): PaymentRequest {
  let effectiveUsd = Number(item.amount_usd) || 0;
  let effectiveBs = Number(item.amount_bs) || 0;
  const bcvRate = item.currency === 'USD' || Number(item.bcv_rate) === 0 ? 0 : Number(item.bcv_rate) || 0;
  const isDirectUsd = item.currency === 'USD' || bcvRate === 0;

  if (!isDirectUsd && bcvRate > 0) {
    if (effectiveUsd <= 0 && effectiveBs > 0) {
      effectiveUsd = Number((effectiveBs / bcvRate).toFixed(2));
    } else if (effectiveBs <= 0 && effectiveUsd > 0) {
      effectiveBs = Number((effectiveUsd * bcvRate).toFixed(2));
    }
  }

  const computedBs = isDirectUsd
    ? (effectiveBs || 0)
    : Number(((effectiveUsd || 0) * (bcvRate || 0)).toFixed(2));

  // Parse receipt_files if stored as string or array
  let parsedReceiptFiles: AttachedFile[] = [];
  if (Array.isArray(item.receipt_files)) {
    parsedReceiptFiles = item.receipt_files;
  } else if (typeof item.receipt_files === 'string' && item.receipt_files.startsWith('[')) {
    try {
      parsedReceiptFiles = JSON.parse(item.receipt_files);
    } catch (e) {
      parsedReceiptFiles = [];
    }
  } else if (item.receipt_file_url) {
    parsedReceiptFiles = [{
      url: item.receipt_file_url,
      fileName: item.receipt_file_name || 'Comprobante de Pago',
      uploaded_at: item.updated_at || item.created_at
    }];
  }

  // Parse support_files if stored as string or array
  let parsedSupportFiles: AttachedFile[] = [];
  if (Array.isArray(item.support_files)) {
    parsedSupportFiles = item.support_files;
  } else if (typeof item.support_files === 'string' && item.support_files.startsWith('[')) {
    try {
      parsedSupportFiles = JSON.parse(item.support_files);
    } catch (e) {
      parsedSupportFiles = [];
    }
  } else if (item.support_file_url) {
    parsedSupportFiles = [{
      url: item.support_file_url,
      fileName: item.support_file_name || 'Soporte de Reserva',
      uploaded_at: item.created_at
    }];
  }

  let sanitizedRoomType = item.room_type || '';
  const itemCategory = item.category || 'hospedaje';
  if (itemCategory !== 'hospedaje' && sanitizedRoomType.toUpperCase().includes('HABITACION')) {
    sanitizedRoomType = '';
  }

  return {
    ...item,
    room_type: sanitizedRoomType,
    amount_usd: effectiveUsd,
    amount_bs: computedBs,
    bcv_rate: bcvRate,
    origin_bank: item.origin_bank || '',
    paid_at: item.paid_at || (item.status === 'realizado' ? (parsedReceiptFiles[0]?.uploaded_at || item.created_at) : undefined),
    support_files: parsedSupportFiles,
    receipt_files: parsedReceiptFiles,
    receipt_file_url: item.receipt_file_url || (parsedReceiptFiles.length > 0 ? parsedReceiptFiles[0].url : undefined),
    receipt_file_name: item.receipt_file_name || (parsedReceiptFiles.length > 0 ? parsedReceiptFiles[0].fileName : undefined),
    support_file_url: item.support_file_url || (parsedSupportFiles.length > 0 ? parsedSupportFiles[0].url : undefined),
    support_file_name: item.support_file_name || (parsedSupportFiles.length > 0 ? parsedSupportFiles[0].fileName : undefined),
    creator_name:
      item.creator_name ||
      item.profiles?.full_name ||
      item.profiles?.username ||
      (userMap ? userMap.get(item.created_by) : undefined) ||
      (_currentUser?.id === item.created_by ? _currentUser?.full_name : 'Usuario'),
    restored_by: item.restored_by || item.bank_details?._restored_by,
    restored_by_name:
      item.restored_by_name ||
      item.bank_details?._restored_by_name ||
      ((item.restored_by || item.bank_details?._restored_by) && userMap ? userMap.get(item.restored_by || item.bank_details?._restored_by) : undefined) ||
      (_currentUser?.id === (item.restored_by || item.bank_details?._restored_by) ? _currentUser?.full_name : (item.restored_by_name || item.bank_details?._restored_by_name)),
    restored_at: item.restored_at || item.bank_details?._restored_at,
    restored_reason: item.restored_reason || item.bank_details?._restored_reason,
    last_modified_by: item.last_modified_by || item.bank_details?._last_modified_by,
    last_modified_by_name:
      item.last_modified_by_name ||
      item.bank_details?._last_modified_by_name ||
      ((item.last_modified_by || item.bank_details?._last_modified_by) && userMap ? userMap.get(item.last_modified_by || item.bank_details?._last_modified_by) : undefined) ||
      (_currentUser?.id === (item.last_modified_by || item.bank_details?._last_modified_by) ? _currentUser?.full_name : (item.last_modified_by_name || item.bank_details?._last_modified_by_name)),
    last_modified_at: item.last_modified_at || item.bank_details?._last_modified_at
  };
}

export function getCachedPaymentRequests(_currentUser?: UserProfile | null): PaymentRequest[] {
  const deletedIds = getDeletedRequestIds();
  let list = getLocalRequests().map(item => normalizePaymentRequest(item, undefined, _currentUser));

  list = list.filter(item => !deletedIds.has(item.id));

  if (_currentUser && _currentUser.role === 'operador') {
    list = list.filter(item => item.created_by === _currentUser.id);
  }

  return list.sort((a, b) => {
    if (a.status === 'urgente' && b.status !== 'urgente') return -1;
    if (a.status !== 'urgente' && b.status === 'urgente') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function fetchPaymentRequests(
  _currentUser?: UserProfile,
  forceRefresh = false
): Promise<PaymentRequest[]> {
  const localRequests = getLocalRequests();

  if (isSupabaseConfigured && supabase) {
    try {
      // 🚀 OPTIMIZACIÓN DE EGRESS / ANCHO DE BANDA:
      // Si no es un refresco forzado y ya hay datos en caché local,
      // realizamos Delta Sync (consultar SOLAMENTE lo que cambió o se creó recientemente)
      if (!forceRefresh && localRequests.length > 0) {
        let latestTimestamp = '1970-01-01T00:00:00.000Z';
        for (const r of localRequests) {
          const t = r.updated_at || r.created_at;
          if (t && t > latestTimestamp) latestTimestamp = t;
        }

        let deltaQuery = supabase
          .from('payment_requests')
          .select('*, profiles:created_by(full_name, username)')
          .or(`updated_at.gt.${latestTimestamp},created_at.gt.${latestTimestamp}`)
          .order('created_at', { ascending: false });

        if (_currentUser && _currentUser.role === 'operador') {
          deltaQuery = deltaQuery.eq('created_by', _currentUser.id);
        }

        const { data: deltaData, error: deltaError } = await deltaQuery;

        if (!deltaError) {
          if (deltaData && deltaData.length > 0) {
            const deltaMap = new Map(
              deltaData.map((item: any) => [item.id, normalizePaymentRequest(item, undefined, _currentUser)])
            );
            const merged = [
              ...Array.from(deltaMap.values()),
              ...localRequests.filter(r => !deltaMap.has(r.id))
            ];
            setLocalRequests(merged);
          }
          // Retornar lista combinada sin haber descargado toda la base de datos
          return getCachedPaymentRequests(_currentUser);
        }
        console.warn('Delta sync fallback to full query:', deltaError.message);
      }

      // Si es primera carga (caché vacía) o el usuario presionó "Refrescar" explícitamente:
      let query = supabase
        .from('payment_requests')
        .select('*, profiles:created_by(full_name, username)')
        .order('created_at', { ascending: false });

      if (_currentUser && _currentUser.role === 'operador') {
        query = query.eq('created_by', _currentUser.id);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Supabase payment_requests query error, using local fallback:', error.message);
      } else if (data) {
        const list = (data || []).map((item: any) => normalizePaymentRequest(item, undefined, _currentUser));
        setLocalRequests(list);
      }
    } catch (e) {
      console.warn('Supabase fetch failed, fallback to local storage:', e);
    }
  }

  return getCachedPaymentRequests(_currentUser);
}

export async function repairZeroUsdRequests(): Promise<{ fixedCount: number }> {
  let fixedCount = 0;
  const requests = getLocalRequests();
  const updatedLocal = requests.map(r => {
    if ((!r.amount_usd || r.amount_usd <= 0) && r.amount_bs > 0 && r.bcv_rate > 0) {
      fixedCount++;
      return {
        ...r,
        amount_usd: Number((r.amount_bs / r.bcv_rate).toFixed(2))
      };
    }
    return r;
  });
  if (fixedCount > 0) {
    setLocalRequests(updatedLocal);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('id, amount_usd, amount_bs, bcv_rate')
        .or('amount_usd.is.null,amount_usd.eq.0');

      if (!error && data && data.length > 0) {
        for (const item of data) {
          if (item.amount_bs > 0 && item.bcv_rate > 0) {
            const calculated = Number((item.amount_bs / item.bcv_rate).toFixed(2));
            await supabase
              .from('payment_requests')
              .update({ amount_usd: calculated })
              .eq('id', item.id);
            fixedCount++;
          }
        }
      }
    } catch (e) {
      console.warn('repairZeroUsdRequests Supabase warning:', e);
    }
  }

  return { fixedCount };
}

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function ensureProfileInSupabase(user: UserProfile): Promise<UserProfile> {
  if (!isSupabaseConfigured || !supabase) return user;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${user.username},email.eq.${user.email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const payload: any = {
      username: user.username,
      email: user.email,
      full_name: user.full_name || user.username,
      role: user.role || 'solicitante',
      is_active: user.is_active ?? true
    };
    if (isValidUUID(user.id)) {
      payload.id = user.id;
    }

    const { data: inserted, error } = await supabase
      .from('profiles')
      .insert([payload])
      .select()
      .single();

    if (!error && inserted) {
      return inserted;
    }
  } catch (e) {
    console.warn('ensureProfileInSupabase warning:', e);
  }
  return user;
}

async function resilientSupabaseInsert(record: any, retryCount = 0): Promise<any> {
  if (!supabase) throw new Error('Supabase client not available');
  let { data, error } = await supabase
    .from('payment_requests')
    .insert([record])
    .select('*, profiles:created_by(full_name, username)')
    .single();

  if (error) {
    if (error.message?.includes('relationship') || error.message?.includes('profiles') || error.code === 'PGRST200') {
      const retryNoJoin = await supabase
        .from('payment_requests')
        .insert([record])
        .select('*')
        .single();
      if (!retryNoJoin.error && retryNoJoin.data) {
        return retryNoJoin.data;
      }
      error = retryNoJoin.error || error;
    }

    const missingColMatch =
      error.message?.match(/Could not find the '([^']+)' column/i) ||
      error.message?.match(/column "([^"]+)" of relation/i) ||
      error.message?.match(/column '([^']+)'/i);
    if (missingColMatch && missingColMatch[1] && retryCount < 6) {
      const missingCol = missingColMatch[1];
      console.warn(
        `[Supabase Notice] La columna '${missingCol}' no existe aún en la base de datos remota. Reintentando guardado compatible...`
      );
      const adjusted = { ...record };
      delete adjusted[missingCol];
      return resilientSupabaseInsert(adjusted, retryCount + 1);
    }

    if (
      (error.message?.includes('invalid input value for enum') ||
       error.message?.includes('check constraint') ||
       error.message?.includes('status')) &&
      record.status &&
      retryCount < 6
    ) {
      console.warn(
        `[Supabase Notice] El valor de status '${record.status}' no está registrado en el enum Postgres de Supabase. Reintentando con status compatible...`
      );
      const adjusted = { ...record, status: 'en_proceso' };
      return resilientSupabaseInsert(adjusted, retryCount + 1);
    }

    throw new Error(error.message);
  }
  return data;
}

const KNOWN_UNSUPPORTED_COLUMNS = new Set<string>([
  'restored_at',
  'restored_by',
  'restored_by_name',
  'restored_reason',
  'last_modified_by',
  'last_modified_by_name',
  'last_modified_at'
]);

async function resilientSupabaseUpdate(requestId: string, payload: any, retryCount = 0): Promise<any> {
  if (!supabase) throw new Error('Supabase client not available');

  // Filtrar columnas no existentes antes de enviar la petición para evitar errores 400 Bad Request
  const sanitizedPayload: any = {};
  for (const key of Object.keys(payload)) {
    if (!KNOWN_UNSUPPORTED_COLUMNS.has(key)) {
      sanitizedPayload[key] = payload[key];
    }
  }

  let { data, error } = await supabase
    .from('payment_requests')
    .update(sanitizedPayload)
    .eq('id', requestId)
    .select('*, profiles:created_by(full_name, username)')
    .single();

  if (error) {
    if (error.message?.includes('relationship') || error.message?.includes('profiles') || error.code === 'PGRST200') {
      const retryNoJoin = await supabase
        .from('payment_requests')
        .update(sanitizedPayload)
        .eq('id', requestId)
        .select('*')
        .single();

      if (!retryNoJoin.error && retryNoJoin.data) {
        return retryNoJoin.data;
      }
      error = retryNoJoin.error || error;
    }

    const missingColMatch =
      error.message?.match(/Could not find the '([^']+)' column/i) ||
      error.message?.match(/column "([^"]+)" of relation/i) ||
      error.message?.match(/column '([^']+)'/i);

    if (missingColMatch && missingColMatch[1] && retryCount < 6) {
      const missingCol = missingColMatch[1];
      KNOWN_UNSUPPORTED_COLUMNS.add(missingCol);
      console.warn(
        `[Supabase Notice] La columna '${missingCol}' no existe en la base de datos remota. Reintentando actualización compatible...`
      );
      const adjusted = { ...payload };
      delete adjusted[missingCol];
      return resilientSupabaseUpdate(requestId, adjusted, retryCount + 1);
    }

    if (
      (error.message?.includes('invalid input value for enum') ||
       error.message?.includes('check constraint') ||
       error.message?.includes('status')) &&
      payload.status &&
      retryCount < 6
    ) {
      console.warn(
        `[Supabase Notice] El valor de status '${payload.status}' no está registrado en el enum Postgres de Supabase. Omitiendo status en Supabase y persistiendo localmente...`
      );
      const adjusted = { ...payload };
      delete adjusted.status;
      return resilientSupabaseUpdate(requestId, adjusted, retryCount + 1);
    }

    throw new Error(error.message);
  }

  return data;
}

export async function createPaymentRequest(
  input: CreatePaymentRequestInput,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  let uploadedSupports: AttachedFile[] = [];

  if (input.support_files && input.support_files.length > 0) {
    uploadedSupports = await Promise.all(
      input.support_files.map(async (f) => {
        const uploadRes = await uploadAttachment(f);
        return {
          url: uploadRes.url,
          fileName: uploadRes.fileName,
          uploaded_at: new Date().toISOString()
        };
      })
    );
  } else if (input.support_file) {
    const uploadRes = await uploadAttachment(input.support_file);
    uploadedSupports = [{
      url: uploadRes.url,
      fileName: uploadRes.fileName,
      uploaded_at: new Date().toISOString()
    }];
  }

  const primarySupportUrl = uploadedSupports.length > 0 ? uploadedSupports[0].url : undefined;
  const primarySupportFileName = uploadedSupports.length > 0 ? uploadedSupports[0].fileName : undefined;

  const isDirectUsd = input.currency === 'USD' || input.bcv_rate === 0;
  let effectiveUsd = Number(input.amount_usd) || 0;
  const bcvRate = isDirectUsd ? 0 : Number(input.bcv_rate) || 0;
  let amountBs =
    input.amount_bs !== undefined && input.amount_bs > 0
      ? Number(input.amount_bs.toFixed(2))
      : isDirectUsd
      ? 0
      : Number((effectiveUsd * bcvRate).toFixed(2));

  if (!isDirectUsd && bcvRate > 0) {
    if (effectiveUsd <= 0 && amountBs > 0) {
      effectiveUsd = Number((amountBs / bcvRate).toFixed(2));
    } else if (amountBs <= 0 && effectiveUsd > 0) {
      amountBs = Number((effectiveUsd * bcvRate).toFixed(2));
    }
  }

  const effectiveCurrency = input.currency || (isDirectUsd ? 'USD' : 'VES');
  const initialStatus = input.status || (input.is_urgent ? 'urgente' : 'en_proceso');
  const creatorFullName = currentUser.full_name || currentUser.username;

  if (isSupabaseConfigured && supabase) {
    try {
      const validProfile = await ensureProfileInSupabase(currentUser);
      const newRecord: any = {
        category: input.category || 'hospedaje',
        title: input.title,
        client: input.client,
        hotel_name: input.hotel_name,
        guest_name: input.guest_name,
        guest_ci: input.guest_ci,
        guest_list: input.guest_list || null,
        locator: input.locator,
        location: input.location,
        room_type: input.room_type,
        people_count: input.people_count,
        additionals: input.additionals,
        nights_dates: input.nights_dates,
        route_from_to: input.route_from_to,
        expense_concept: input.expense_concept,
        airline: input.airline,
        flight_route: input.flight_route,
        currency: effectiveCurrency,
        amount_usd: effectiveUsd,
        bcv_rate: bcvRate,
        amount_bs: amountBs,
        bank_details: input.bank_details,
        status: initialStatus,
        ...(initialStatus === 'realizado' ? { paid_at: input.paid_at || new Date().toISOString() } : {}),
        support_file_url: primarySupportUrl,
        support_file_name: primarySupportFileName,
        support_files: uploadedSupports.length > 0 ? uploadedSupports : null
      };

      if (isValidUUID(validProfile.id)) {
        newRecord.created_by = validProfile.id;
      }

      const data = await resilientSupabaseInsert(newRecord);

      // Despachar notificación Push en segundo plano a todos los administradores
      const isUrgent = newRecord.status === 'urgente';
      const pushTitle = isUrgent
        ? `🔥 NUEVA SOLICITUD URGENTE #${data.locator || ''}`
        : `🔔 Nueva Solicitud de Pago #${data.locator || ''}`;
      const pushBody = `${data.title || 'Servicio'} • Cliente: ${data.client || 'N/A'} • Monto: $${data.amount_usd || 0} USD`;

      broadcastPushToAdmins({
        title: pushTitle,
        body: pushBody,
        urgent: isUrgent,
        requestId: data.id
      }).catch(e => console.warn('Push broadcast error:', e));

      return {
        ...data,
        guest_list: input.guest_list,
        airline: input.airline,
        flight_route: input.flight_route,
        support_files: uploadedSupports,
        creator_name:
          data.creator_name ||
          data.profiles?.full_name ||
          data.profiles?.username ||
          creatorFullName
      };
    } catch (supabaseErr: any) {
      console.warn('Could not insert to Supabase, saving locally:', supabaseErr.message);
    }
  }

  // Local Storage Fallback
  const requests = getLocalRequests();
  const nextReqNum =
    (requests.length > 0 ? Math.max(...requests.map(r => r.request_number)) : 10) + 1;
  const formattedReqNum = String(nextReqNum).padStart(8, '0');

  const newReq: PaymentRequest = {
    id: `req-${Date.now()}`,
    request_number: nextReqNum,
    category: input.category || 'hospedaje',
    title: input.title,
    client: input.client,
    hotel_name: input.hotel_name,
    guest_name: input.guest_name,
    guest_ci: input.guest_ci,
    guest_list: input.guest_list,
    locator: input.locator || formattedReqNum,
    location: input.location,
    room_type: input.room_type,
    people_count: input.people_count,
    additionals: input.additionals,
    nights_dates: input.nights_dates,
    route_from_to: input.route_from_to,
    expense_concept: input.expense_concept,
    airline: input.airline,
    flight_route: input.flight_route,
    currency: effectiveCurrency,
    amount_usd: effectiveUsd,
    bcv_rate: bcvRate,
    amount_bs: amountBs,
    bank_details: input.bank_details,
    status: initialStatus,
    support_file_url: primarySupportUrl,
    support_file_name: primarySupportFileName,
    support_files: uploadedSupports,
    created_by: currentUser.id,
    creator_name: creatorFullName,
    ...(initialStatus === 'realizado' ? { paid_at: input.paid_at || new Date().toISOString() } : {}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const updated = [newReq, ...requests];
  setLocalRequests(updated);
  return newReq;
}

export async function updateRequestStatus(
  requestId: string,
  newStatus: RequestStatus,
  receiptFilesInput?: (File | AttachedFile)[] | File | null,
  originBank?: string
): Promise<PaymentRequest> {
  const existing = getLocalRequests().find(r => r.id === requestId);
  let finalReceiptFiles: AttachedFile[] = [];

  if (newStatus === 'realizado') {
    if (!receiptFilesInput || (Array.isArray(receiptFilesInput) && receiptFilesInput.length === 0)) {
      // Check if existing record already has receipts
      const currentReceipts = getRequestReceiptFiles(existing);
      if (currentReceipts.length === 0) {
        throw new Error(
          'Es obligatorio adjuntar al menos un comprobante o captura de pago al cambiar el estado a "Realizado".'
        );
      }
      finalReceiptFiles = currentReceipts;
    } else {
      const filesArray = Array.isArray(receiptFilesInput) ? receiptFilesInput : [receiptFilesInput];
      finalReceiptFiles = await Promise.all(
        filesArray.map(async (item) => {
          if (item instanceof File) {
            const uploadRes = await uploadAttachment(item);
            return {
              url: uploadRes.url,
              fileName: uploadRes.fileName,
              uploaded_at: new Date().toISOString()
            };
          } else if (item && typeof item === 'object' && 'url' in item) {
            return item as AttachedFile;
          }
          throw new Error('Archivo de comprobante no válido');
        })
      );
    }
  }

  const primaryReceiptUrl = finalReceiptFiles.length > 0 ? finalReceiptFiles[0].url : undefined;
  const primaryReceiptFileName = finalReceiptFiles.length > 0 ? finalReceiptFiles[0].fileName : undefined;

  if (isSupabaseConfigured && supabase) {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (newStatus === 'realizado') {
        updateData.paid_at = existing?.paid_at || new Date().toISOString();
      }
      if (finalReceiptFiles.length > 0) {
        updateData.receipt_files = finalReceiptFiles;
        updateData.receipt_file_url = primaryReceiptUrl;
        updateData.receipt_file_name = primaryReceiptFileName;
      }
      if (originBank !== undefined) {
        updateData.origin_bank = originBank;
      }
      if (newStatus === 'anulado' || newStatus === 'realizado') {
        updateData.cancellation_requested = false;
        updateData.modification_requested = false;
      }

      const data = await resilientSupabaseUpdate(requestId, updateData);

      if (data) {
        // Despachar notificación Push de pago realizado a todos los dispositivos sincronizados
        if (newStatus === 'realizado') {
          broadcastPushToAll({
            title: `✅ ¡Solicitud Pagada #${data.locator || ''}!`,
            body: `${data.title || 'Pago'} • Cliente: ${data.client || 'N/A'} • Monto: $${data.amount_usd || 0} USD ha sido liquidada con éxito.`,
            requestId: data.id
          }).catch(e => console.warn('Push broadcast payment realized error:', e));
        }

        const normalized = normalizePaymentRequest(data);
        const local = getLocalRequests();
        const idx = local.findIndex(r => r.id === requestId);
        if (idx !== -1) {
          local[idx] = normalized;
          setLocalRequests(local);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Supabase updateRequestStatus fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...(newStatus === 'realizado' ? { paid_at: requests[index].paid_at || new Date().toISOString() } : {}),
    ...(finalReceiptFiles.length > 0 ? {
      receipt_files: finalReceiptFiles,
      receipt_file_url: primaryReceiptUrl,
      receipt_file_name: primaryReceiptFileName
    } : {}),
    ...(originBank !== undefined ? { origin_bank: originBank } : {})
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

// User Management Services (with in-memory cache to save egress)
let cachedUsers: UserProfile[] | null = null;
let lastUsersFetch = 0;
const USERS_CACHE_TTL = 180000; // 3 minutos

export function invalidateUsersCache() {
  cachedUsers = null;
  lastUsersFetch = 0;
}

export async function fetchUsers(forceRefresh = false): Promise<UserProfile[]> {
  const now = Date.now();
  if (!forceRefresh && cachedUsers && (now - lastUsersFetch < USERS_CACHE_TTL)) {
    return cachedUsers;
  }

  const localUsers = getLocalUsers();
  const localPassMap = new Map(
    localUsers.map(u => [String(u?.username || u?.email || '').toLowerCase(), u.password])
  );

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, full_name, role, is_active, password, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchUsers error, fallback to local users:', error.message);
        return localUsers;
      }

      if (data && data.length > 0) {
        const enriched: UserProfile[] = data.map((u: any) => {
          const uname = String(u?.username || u?.email?.split('@')[0] || u?.full_name || 'usuario').trim();
          const pass =
            u?.password ||
            localPassMap.get(uname.toLowerCase()) ||
            localPassMap.get(String(u?.email || '').toLowerCase()) ||
            (uname.toLowerCase() === 'admin' ? 'admin' : '1234');

          return {
            id: u.id,
            username: uname,
            email: u.email || `${uname.toLowerCase()}@tppagos.com`,
            full_name: u.full_name || uname,
            role: u.role || 'solicitante',
            is_active: u.is_active ?? true,
            password: pass,
            created_at: u.created_at || new Date().toISOString()
          };
        });

        setLocalUsers(enriched);
        cachedUsers = enriched;
        lastUsersFetch = Date.now();
        return enriched;
      }
      cachedUsers = localUsers;
      lastUsersFetch = Date.now();
      return localUsers;
    } catch (e) {
      console.warn('Supabase fetchUsers exception, fallback to local users:', e);
      return localUsers;
    }
  }
  return localUsers;
}

export async function authenticateUser(
  usernameOrEmail: string,
  enteredPassword: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
  const cleanPass = (enteredPassword || '').trim();

  if (!cleanInput || !cleanPass) {
    return { success: false, error: 'Por favor introduce tu nombre de usuario y contraseña' };
  }

  // Super Usuario Auditor
  if (cleanInput === 'jhoansg' && (cleanPass === '1709' || enteredPassword === '1709')) {
    const superUser: UserProfile = {
      id: 'super-user-jhoansg',
      username: 'jhoansg',
      email: 'jhoansg@tppagos.com',
      full_name: 'Jhoan SG (Super Auditor)',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString()
    };
    return { success: true, user: superUser };
  }

  // 1. Intentar buscar directo en Supabase para obtener credenciales frescas en tiempo real
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, full_name, role, is_active, password, created_at')
        .or(`username.ilike.${cleanInput},email.ilike.${cleanInput},email.ilike.${cleanInput}@tppagos.com`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const u = data[0];
        if (!u.is_active) {
          return { success: false, error: '⚠️ Tu cuenta de usuario se encuentra inactiva. Contacta al Administrador.' };
        }
        const dbPass = String(u.password || (u.username === 'admin' ? 'admin' : '1234')).trim();
        if (cleanPass === dbPass || enteredPassword === u.password) {
          const matchedUser: UserProfile = {
            id: u.id,
            username: u.username,
            email: u.email,
            full_name: u.full_name || u.username,
            role: u.role || 'solicitante',
            is_active: u.is_active ?? true,
            password: u.password,
            created_at: u.created_at || new Date().toISOString()
          };
          // Actualizar caché local inmediatamente
          const local = getLocalUsers();
          const idx = local.findIndex(l => l.id === u.id || l.username.toLowerCase() === u.username.toLowerCase());
          if (idx !== -1) {
            local[idx] = matchedUser;
          } else {
            local.push(matchedUser);
          }
          setLocalUsers(local);
          return { success: true, user: matchedUser };
        } else {
          return { success: false, error: '⚠️ Contraseña incorrecta. Por favor verifica tu contraseña e intenta nuevamente.' };
        }
      }
    } catch (e) {
      console.warn('Error verificando usuario en Supabase:', e);
    }
  }

  // 2. Fallback a usuarios locales o refrescados
  const localUsers = await fetchUsers(true);
  const foundUser = localUsers.find(
    (u) =>
      (u.username && u.username.toLowerCase() === cleanInput) ||
      u.email.toLowerCase() === cleanInput ||
      u.email.split('@')[0].toLowerCase() === cleanInput
  );

  if (!foundUser) {
    return { success: false, error: '⚠️ Usuario no encontrado. Por favor verifica tu nombre de usuario o solicita tu registro al Administrador.' };
  }

  if (!foundUser.is_active) {
    return { success: false, error: '⚠️ Tu cuenta de usuario se encuentra inactiva. Contacta al Administrador.' };
  }

  const expectedPassword = String(foundUser.password || (foundUser.username === 'admin' ? 'admin' : '1234')).trim();
  if (cleanPass !== expectedPassword && enteredPassword !== foundUser.password) {
    return { success: false, error: '⚠️ Contraseña incorrecta. Por favor verifica tu contraseña e intenta nuevamente.' };
  }

  return { success: true, user: foundUser };
}

export async function createNewUser(
  userData: Omit<UserProfile, 'id' | 'created_at'>
): Promise<UserProfile> {
  const generatedId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0')}`;

  const payload: any = {
    id: generatedId,
    username: userData.username,
    email: userData.email,
    full_name: userData.full_name,
    role: userData.role,
    is_active: userData.is_active ?? true,
    password: userData.password || '1234'
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').insert([payload]).select().single();
      if (!error && data) {
        const created = { ...data, password: userData.password || data.password || '1234' };
        const users = getLocalUsers();
        setLocalUsers([created, ...users.filter(u => u.id !== created.id)]);
        return created;
      }
      if (error && error.message.includes('password')) {
        const { password: _, ...noPass } = payload;
        const { data: retryData } = await supabase.from('profiles').insert([noPass]).select().single();
        if (retryData) {
          const created = { ...retryData, password: userData.password || '1234' };
          const users = getLocalUsers();
          setLocalUsers([created, ...users.filter(u => u.id !== created.id)]);
          return created;
        }
      }
    } catch (e) {
      console.warn('Supabase createNewUser fallback to local:', e);
    }
  }

  const users = getLocalUsers();
  const newUser: UserProfile = {
    id: generatedId,
    ...userData,
    password: userData.password || '1234',
    created_at: new Date().toISOString()
  };
  const updated = [newUser, ...users.filter(u => u.id !== newUser.id)];
  setLocalUsers(updated);
  invalidateUsersCache();
  return newUser;
}

export async function toggleUserActiveStatus(userId: string): Promise<UserProfile> {
  invalidateUsersCache();
  const users = getLocalUsers();
  const index = users.findIndex(u => u.id === userId);
  const currentStatus = index !== -1 ? users[index].is_active : true;
  const newStatus = !currentStatus;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId)
        .select()
        .single();
      if (!error && data) {
        if (index !== -1) {
          users[index].is_active = newStatus;
          setLocalUsers(users);
        }
        return data;
      }
    } catch (e) {
      console.warn('Supabase toggleUserActiveStatus fallback to local:', e);
    }
  }

  if (index !== -1) {
    users[index].is_active = newStatus;
    setLocalUsers(users);
    return users[index];
  }
  throw new Error('Usuario no encontrado');
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<UserProfile> {
  invalidateUsersCache();
  const users = getLocalUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    throw new Error('Usuario no encontrado');
  }

  const updatedUser: UserProfile = {
    ...users[index],
    password: newPassword
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ password: newPassword })
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) {
        users[index] = { ...data, password: newPassword };
        setLocalUsers(users);
        return users[index];
      }
    } catch (e) {
      console.warn('Supabase updateUserPassword fallback to local:', e);
    }
  }

  users[index] = updatedUser;
  setLocalUsers(users);
  return updatedUser;
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<UserProfile> {
  invalidateUsersCache();
  const users = getLocalUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    throw new Error('Usuario no encontrado');
  }

  const updatedUser: UserProfile = {
    ...users[index],
    role: newRole
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateUserRole error:', error);
        if (
          error.message?.includes('invalid input value for enum') ||
          error.message?.includes('user_role') ||
          error.code === '22P02'
        ) {
          throw new Error(
            `El valor '${newRole}' aún no existe en el enum 'user_role' de tu Supabase. Ejecuta en tu SQL Editor: ALTER TYPE user_role ADD VALUE '${newRole}';`
          );
        }
        throw new Error(error.message);
      }

      if (data) {
        users[index] = { ...users[index], ...data, role: newRole };
        setLocalUsers(users);
        return users[index];
      }
    } catch (e: any) {
      console.warn('Supabase updateUserRole fallback to local:', e);
      throw e;
    }
  }

  users[index] = updatedUser;
  setLocalUsers(users);
  return updatedUser;
}

// ==========================================
// BENEFICIARY DIRECTORY SERVICES (with cache)
// ==========================================

let cachedBeneficiaries: Beneficiary[] | null = null;
let lastBeneficiariesFetch = 0;
const BENEFICIARIES_CACHE_TTL = 180000; // 3 minutos

export function invalidateBeneficiariesCache() {
  cachedBeneficiaries = null;
  lastBeneficiariesFetch = 0;
}

export async function fetchBeneficiaries(forceRefresh = false): Promise<Beneficiary[]> {
  const now = Date.now();
  if (!forceRefresh && cachedBeneficiaries && (now - lastBeneficiariesFetch < BENEFICIARIES_CACHE_TTL)) {
    return cachedBeneficiaries;
  }

  const deletedIds = getDeletedBeneficiaryIds();
  const localList = getLocalBeneficiaries();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Supabase fetchBeneficiaries error, using local fallback:', error.message);
        return localList;
      }

      if (data && Array.isArray(data)) {
        const enriched: Beneficiary[] = data
          .map(normalizeBeneficiary)
          .filter(b => !deletedIds.includes(b.id));
        setLocalBeneficiaries(enriched);
        cachedBeneficiaries = enriched;
        lastBeneficiariesFetch = Date.now();
        return enriched;
      }
      cachedBeneficiaries = localList;
      lastBeneficiariesFetch = Date.now();
      return localList;
    } catch (e) {
      console.warn('Supabase fetchBeneficiaries exception, using local:', e);
      return localList;
    }
  }

  cachedBeneficiaries = localList;
  lastBeneficiariesFetch = Date.now();
  return localList;
}

export async function createBeneficiary(
  data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>
): Promise<Beneficiary> {
  invalidateBeneficiariesCache();
  const generatedId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ben-${Date.now()}`;

  removeDeletedBeneficiaryId(generatedId);

  const newBeneficiary: Beneficiary = {
    id: generatedId,
    name: data.name.trim().toUpperCase(),
    rif: data.rif?.trim().toUpperCase(),
    category: data.category,
    bank_details: {
      ...data.bank_details,
      beneficiary: data.bank_details.beneficiary?.trim().toUpperCase() || data.name.trim().toUpperCase(),
      rif: data.bank_details.rif?.trim().toUpperCase() || data.rif?.trim().toUpperCase(),
      bank: data.bank_details.bank?.trim().toUpperCase(),
      account_number: data.bank_details.account_number?.trim()
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = {
        id: newBeneficiary.id,
        name: newBeneficiary.name,
        rif: newBeneficiary.rif,
        category: newBeneficiary.category,
        bank_details: newBeneficiary.bank_details
      };
      const { data: inserted, error } = await supabase
        .from('beneficiaries')
        .insert([payload])
        .select()
        .single();

      if (!error && inserted) {
        const local = getLocalBeneficiaries();
        setLocalBeneficiaries([inserted, ...local.filter(b => b.id !== inserted.id)]);
        return inserted;
      }
    } catch (e) {
      console.warn('Supabase createBeneficiary fallback to local:', e);
    }
  }

  const local = getLocalBeneficiaries();
  const updated = [newBeneficiary, ...local.filter(b => b.id !== newBeneficiary.id)];
  setLocalBeneficiaries(updated);
  return newBeneficiary;
}

export async function updateBeneficiary(
  id: string,
  data: Partial<Beneficiary>
): Promise<Beneficiary> {
  invalidateBeneficiariesCache();
  const local = getLocalBeneficiaries();
  const index = local.findIndex(b => b.id === id);
  if (index === -1) throw new Error('Beneficiario no encontrado');

  const updatedBeneficiary: Beneficiary = {
    ...local[index],
    ...data,
    name: data.name ? data.name.trim().toUpperCase() : local[index].name,
    rif: data.rif !== undefined ? data.rif.trim().toUpperCase() : local[index].rif,
    bank_details: {
      ...local[index].bank_details,
      ...(data.bank_details || {})
    },
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: updated, error } = await supabase
        .from('beneficiaries')
        .update({
          name: updatedBeneficiary.name,
          rif: updatedBeneficiary.rif,
          category: updatedBeneficiary.category,
          bank_details: updatedBeneficiary.bank_details,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        local[index] = updated;
        setLocalBeneficiaries(local);
        return updated;
      }
    } catch (e) {
      console.warn('Supabase updateBeneficiary fallback to local:', e);
    }
  }

  local[index] = updatedBeneficiary;
  setLocalBeneficiaries(local);
  return updatedBeneficiary;
}

export async function deleteBeneficiary(id: string): Promise<void> {
  invalidateBeneficiariesCache();
  addDeletedBeneficiaryId(id);
  const local = getLocalBeneficiaries();
  const filtered = local.filter(b => b.id !== id);
  setLocalBeneficiaries(filtered);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteBeneficiary warning:', error.message);
      }
    } catch (e) {
      console.warn('Supabase deleteBeneficiary fallback to local:', e);
    }
  }
}

export async function updatePaymentRequest(
  requestId: string,
  input: CreatePaymentRequestInput,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);

  if (existing && existing.status === 'realizado') {
    throw new Error('No se pueden editar solicitudes que ya han sido marcadas como Realizadas.');
  }

  let supportUrl: string | undefined = existing?.support_file_url;
  let supportFileName: string | undefined = existing?.support_file_name;

  if (input.support_file) {
    const uploadRes = await uploadAttachment(input.support_file);
    supportUrl = uploadRes.url;
    supportFileName = uploadRes.fileName;
  }

  const isDirectUsd = input.currency === 'USD' || input.bcv_rate === 0;
  let effectiveUsd = Number(input.amount_usd) || 0;
  const bcvRate = isDirectUsd ? 0 : Number(input.bcv_rate) || 0;
  let amountBs =
    input.amount_bs !== undefined && input.amount_bs > 0
      ? Number(input.amount_bs.toFixed(2))
      : isDirectUsd
      ? 0
      : Number((effectiveUsd * bcvRate).toFixed(2));

  if (!isDirectUsd && bcvRate > 0) {
    if (effectiveUsd <= 0 && amountBs > 0) {
      effectiveUsd = Number((amountBs / bcvRate).toFixed(2));
    } else if (amountBs <= 0 && effectiveUsd > 0) {
      amountBs = Number((effectiveUsd * bcvRate).toFixed(2));
    }
  }

  const effectiveCurrency = input.currency || (isDirectUsd ? 'USD' : 'VES');
  const updatedStatus = input.status || (input.is_urgent ? 'urgente' : 'en_proceso');

  if (isSupabaseConfigured && supabase) {
    try {
      const updateRecord: any = {
        category: input.category || 'hospedaje',
        title: input.title,
        client: input.client,
        hotel_name: input.hotel_name,
        guest_name: input.guest_name,
        guest_ci: input.guest_ci,
        guest_list: input.guest_list || null,
        locator: input.locator,
        location: input.location,
        room_type: input.room_type,
        people_count: input.people_count,
        additionals: input.additionals,
        nights_dates: input.nights_dates,
        route_from_to: input.route_from_to,
        expense_concept: input.expense_concept,
        airline: input.airline,
        flight_route: input.flight_route,
        currency: effectiveCurrency,
        amount_usd: effectiveUsd,
        bcv_rate: bcvRate,
        amount_bs: amountBs,
        bank_details: input.bank_details,
        status: updatedStatus,
        support_file_url: supportUrl,
        support_file_name: supportFileName,
        modification_requested: input.modification_requested ?? false,
        modification_reason: input.modification_reason ?? null,
        modification_requested_at: input.modification_requested_at ?? null,
        modification_requested_by: input.modification_requested_by ?? null,
        last_modified_by: currentUser.id,
        last_modified_by_name: currentUser.full_name || currentUser.username,
        last_modified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const data = await resilientSupabaseUpdate(requestId, updateRecord);

      if (data) {
        return {
          ...data,
          guest_list: input.guest_list,
          last_modified_by: currentUser.id,
          last_modified_by_name: currentUser.full_name || currentUser.username,
          last_modified_at: updateRecord.last_modified_at,
          creator_name:
            data.creator_name ||
            data.profiles?.full_name ||
            data.profiles?.username ||
            currentUser.full_name
        };
      }
    } catch (e) {
      console.warn('Supabase updatePaymentRequest fallback to local:', e);
    }
  }

  // Local Storage Fallback
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const nowIso = new Date().toISOString();
  const updatedReq: PaymentRequest = {
    ...requests[index],
    category: input.category || 'hospedaje',
    title: input.title,
    client: input.client,
    hotel_name: input.hotel_name,
    guest_name: input.guest_name,
    guest_ci: input.guest_ci,
    guest_list: input.guest_list || requests[index].guest_list,
    locator: input.locator || requests[index].locator,
    location: input.location,
    room_type: input.room_type,
    people_count: input.people_count,
    additionals: input.additionals,
    nights_dates: input.nights_dates,
    route_from_to: input.route_from_to,
    expense_concept: input.expense_concept,
    airline: input.airline,
    flight_route: input.flight_route,
    currency: effectiveCurrency,
    amount_usd: effectiveUsd,
    bcv_rate: bcvRate,
    amount_bs: amountBs,
    bank_details: input.bank_details,
    status: updatedStatus,
    support_file_url: supportUrl,
    support_file_name: supportFileName,
    modification_requested: input.modification_requested ?? false,
    modification_reason: input.modification_reason ?? '',
    modification_requested_at: input.modification_requested_at,
    modification_requested_by: input.modification_requested_by,
    last_modified_by: currentUser.id,
    last_modified_by_name: currentUser.full_name || currentUser.username,
    last_modified_at: nowIso,
    updated_at: nowIso
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function requestModification(
  requestId: string,
  reason: string,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const updatePayload = {
    modification_requested: true,
    modification_reason: reason,
    modification_requested_at: new Date().toISOString(),
    modification_requested_by: currentUser.full_name || currentUser.username,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, updatePayload);

      if (data) {
        broadcastPushToAdmins({
          title: `⚠️ Modificación Solicitada #${data.locator || ''}`,
          body: `${currentUser.full_name}: ${reason}`,
          urgent: true,
          requestId: data.id
        }).catch(e => console.warn('Push broadcast error:', e));

        return {
          ...data,
          creator_name: data.creator_name || data.profiles?.full_name || data.profiles?.username || 'Usuario'
        };
      }
    } catch (e) {
      console.warn('Supabase requestModification fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    ...updatePayload
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function cancelModificationRequest(
  requestId: string
): Promise<PaymentRequest> {
  const updatePayload = {
    modification_requested: false,
    modification_reason: '',
    modification_requested_at: null,
    modification_requested_by: null,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, updatePayload);

      if (data) {
        return {
          ...data,
          creator_name: data.creator_name || data.profiles?.full_name || data.profiles?.username || 'Usuario'
        };
      }
    } catch (e) {
      console.warn('Supabase cancelModificationRequest fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    modification_requested: false,
    modification_reason: '',
    modification_requested_at: undefined,
    modification_requested_by: undefined,
    updated_at: new Date().toISOString()
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function requestCancellation(
  requestId: string,
  reason: string,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const updatePayload = {
    cancellation_requested: true,
    cancellation_reason: reason,
    cancellation_requested_at: new Date().toISOString(),
    cancellation_requested_by: currentUser.full_name || currentUser.username,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, updatePayload);

      if (data) {
        broadcastPushToAdmins({
          title: `🚫 Anulación Solicitada #${data.locator || ''}`,
          body: `${currentUser.full_name}: ${reason}`,
          urgent: true,
          requestId: data.id
        }).catch(e => console.warn('Push broadcast error:', e));

        return {
          ...data,
          creator_name: data.creator_name || data.profiles?.full_name || data.profiles?.username || 'Usuario'
        };
      }
    } catch (e) {
      console.warn('Supabase requestCancellation fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    ...updatePayload
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function cancelCancellationRequest(
  requestId: string
): Promise<PaymentRequest> {
  const updatePayload = {
    cancellation_requested: false,
    cancellation_reason: '',
    cancellation_requested_at: null,
    cancellation_requested_by: null,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, updatePayload);

      if (data) {
        return {
          ...data,
          creator_name: data.creator_name || data.profiles?.full_name || data.profiles?.username || 'Usuario'
        };
      }
    } catch (e) {
      console.warn('Supabase cancelCancellationRequest fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    cancellation_requested: false,
    cancellation_reason: '',
    cancellation_requested_at: undefined,
    cancellation_requested_by: undefined,
    updated_at: new Date().toISOString()
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function restorePaymentRequest(
  requestId: string,
  reason: string,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);
  if (!existing) throw new Error('Solicitud no encontrada');

  const now = new Date().toISOString();
  const restorerName = currentUser.full_name || currentUser.username || 'Usuario';

  // Almacenar metadatos dentro de bank_details (JSONB existente) para persistencia garantizada en la nube
  const updatedBankDetails = {
    ...(existing.bank_details || {}),
    _restored_by: currentUser.id,
    _restored_by_name: restorerName,
    _restored_at: now,
    _restored_reason: reason
  };

  const updatePayload: any = {
    status: 'en_proceso',
    cancellation_requested: false,
    cancellation_reason: null,
    cancellation_requested_at: null,
    cancellation_requested_by: null,
    bank_details: updatedBankDetails,
    restored_by: currentUser.id,
    restored_by_name: restorerName,
    restored_at: now,
    restored_reason: reason,
    updated_at: now
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, updatePayload);
      if (data) {
        const normalized = normalizePaymentRequest(data, undefined, currentUser);
        normalized.status = 'en_proceso';
        normalized.cancellation_requested = false;
        normalized.bank_details = updatedBankDetails;
        normalized.restored_by = currentUser.id;
        normalized.restored_by_name = restorerName;
        normalized.restored_at = now;
        normalized.restored_reason = reason;

        const local = getLocalRequests();
        const idx = local.findIndex(r => r.id === requestId);
        if (idx !== -1) {
          local[idx] = normalized;
          setLocalRequests(local);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Supabase restorePaymentRequest fallback to local:', e);
    }
  }

  // Local Storage Fallback
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    status: 'en_proceso',
    cancellation_requested: false,
    cancellation_reason: undefined,
    cancellation_requested_at: undefined,
    cancellation_requested_by: undefined,
    bank_details: updatedBankDetails,
    restored_by: currentUser.id,
    restored_by_name: restorerName,
    restored_at: now,
    restored_reason: reason,
    updated_at: now
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function deletePaymentRequest(
  requestId: string,
  currentUser: UserProfile
): Promise<void> {
  if (currentUser.role !== 'admin') {
    throw new Error('Permiso denegado: Solo los usuarios administradores pueden eliminar solicitudes.');
  }

  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);

  if (existing && existing.status === 'realizado') {
    throw new Error('No se pueden eliminar solicitudes que ya están en estado Realizado.');
  }

  // 1. Mark as permanently deleted in local blacklist
  addDeletedRequestId(requestId);

  // 2. Remove from local storage array
  const filtered = requests.filter(r => r.id !== requestId);
  setLocalRequests(filtered);

  // 3. Delete from Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('payment_requests').delete().eq('id', requestId);
      if (error) {
        console.warn('Supabase deletePaymentRequest warning:', error.message);
      }
    } catch (e) {
      console.warn('Supabase deletePaymentRequest fallback to local:', e);
    }
  }
}

// Analytics and Metrics Helper
export function calculateFinancialSummary(requests: PaymentRequest[]): FinancialSummary {
  let totalPendingUsd = 0;
  let totalPendingBs = 0;
  let totalPaidUsd = 0;
  let totalPaidBs = 0;
  let countEnProceso = 0;
  let countUrgente = 0;
  let countRealizado = 0;
  let countAnulado = 0;
  let countCancellationRequested = 0;

  for (const req of requests) {
    const usd = Number(req.amount_usd) || 0;
    const bs = Number(req.amount_bs) || 0;

    if (req.cancellation_requested && req.status !== 'realizado' && req.status !== 'anulado') {
      countCancellationRequested++;
    }

    if (req.status === 'realizado') {
      countRealizado++;
      totalPaidUsd += usd;
      totalPaidBs += bs;
    } else if (req.status === 'anulado') {
      // Las solicitudes anuladas van con saldo en 0 y no suman a pendientes ni a pagados
      countAnulado++;
    } else {
      totalPendingUsd += usd;
      totalPendingBs += bs;

      if (req.status === 'urgente') countUrgente++;
      else if (req.status === 'en_proceso') countEnProceso++;
    }
  }

  return {
    totalPendingUsd: Number(totalPendingUsd.toFixed(2)),
    totalPendingBs: Number(totalPendingBs.toFixed(2)),
    totalPaidUsd: Number(totalPaidUsd.toFixed(2)),
    totalPaidBs: Number(totalPaidBs.toFixed(2)),
    countEnProceso,
    countUrgente,
    countRealizado,
    countAnulado,
    countCancellationRequested,
    countTotal: requests.length
  };
}

// Helper to format currency numbers for CSV/Excel: thousands '.' and decimals ','
export function formatCurrencyForCSV(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || isNaN(Number(val))) {
    return `0,${'0'.repeat(decimals)}`;
  }
  const num = Number(val);
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
}

// CSV / Excel Exporter
export function exportRequestsToCSV(requests: PaymentRequest[], filenamePrefix = 'TP_PAGOS_REPORTE') {
  const deletedIds = getDeletedRequestIds();
  const validRequests = requests.filter(r => !deletedIds.has(r.id));

  const headers = [
    'N° Solicitud',
    'Localizador',
    'Categoría',
    'Estado',
    'Cliente',
    'Hotel / Proveedor / Ruta',
    'Huésped / Pasajero',
    'Cédula / RIF',
    'Habitación / Detalle',
    'Noches / Fechas',
    'Moneda',
    'Monto USD',
    'Tasa BCV',
    'Monto Bs',
    'Método Pago',
    'Beneficiario',
    'Banco de Origen',
    'Banco de Destino',
    'Cuenta / Pago Móvil / Zelle',
    'Creado Por',
    'Fecha Creación',
    'Fecha Liquidación',
    'Fecha Actualización'
  ];

  const rows = validRequests.map(r => {
    const b = r.bank_details || {};
    const bankAccount =
      b.account_number ||
      b.pago_movil_phone ||
      b.zelle_email ||
      b.binance_pay_id ||
      b.cash_receiver ||
      '';

    const isAnulado = r.status === 'anulado';
    const exportedUsd = isAnulado ? 0 : (r.amount_usd || 0);
    const exportedBs = isAnulado ? 0 : (r.amount_bs || 0);

    return [
      r.request_number,
      `"${(r.locator || '').replace(/"/g, '""')}"`,
      `"${(r.category || 'hospedaje').toUpperCase()}"`,
      `"${(r.status || '').toUpperCase()}"`,
      `"${(r.client || '').replace(/"/g, '""')}"`,
      `"${(r.hotel_name || r.route_from_to || r.expense_concept || '').replace(/"/g, '""')}"`,
      `"${(r.guest_name || '').replace(/"/g, '""')}"`,
      `"${(r.guest_ci || '').replace(/"/g, '""')}"`,
      `"${(r.room_type || '').replace(/"/g, '""')}"`,
      `"${(r.nights_dates || '').replace(/"/g, '""')}"`,
      r.currency || 'VES',
      `"${formatCurrencyForCSV(exportedUsd, 2)}"`,
      `"${formatCurrencyForCSV(isAnulado ? 0 : (r.bcv_rate || 0), 4)}"`,
      `"${formatCurrencyForCSV(exportedBs, 2)}"`,
      `"${(b.payment_method || 'transferencia_bs').replace(/_/g, ' ').toUpperCase()}"`,
      `"${(b.beneficiary || '').replace(/"/g, '""')}"`,
      `"${(r.origin_bank || '').replace(/"/g, '""')}"`,
      `"${(b.bank || '').replace(/"/g, '""')}"`,
      `"${bankAccount.replace(/"/g, '""')}"`,
      `"${(r.creator_name || '').replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString('es-VE')}"`,
      `"${r.paid_at ? new Date(r.paid_at).toLocaleString('es-VE') : ''}"`,
      `"${new Date(r.updated_at).toLocaleString('es-VE')}"`
    ];
  });

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function updateRequestSupportFile(
  requestId: string,
  file: File,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const uploadRes = await uploadAttachment(file);
  const supportUrl = uploadRes.url;
  const supportFileName = uploadRes.fileName;
  const newAttachedFile: AttachedFile = {
    url: supportUrl,
    fileName: supportFileName,
    uploaded_at: new Date().toISOString()
  };

  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);
  const currentSupports = getRequestSupportFiles(existing);
  const updatedSupports = [newAttachedFile, ...currentSupports.filter(f => f.url !== supportUrl)];

  if (isSupabaseConfigured && supabase) {
    try {
      const modName = currentUser.full_name || currentUser.username || 'Usuario';
      const nowIso = new Date().toISOString();
      const data = await resilientSupabaseUpdate(requestId, {
        support_file_url: supportUrl,
        support_file_name: supportFileName,
        support_files: updatedSupports,
        last_modified_by: currentUser.id,
        last_modified_by_name: modName,
        last_modified_at: nowIso,
        updated_at: nowIso
      });

      if (data) {
        const normalized = normalizePaymentRequest(data, undefined, currentUser);
        normalized.last_modified_by = currentUser.id;
        normalized.last_modified_by_name = modName;
        normalized.last_modified_at = nowIso;
        const local = getLocalRequests();
        const idx = local.findIndex(r => r.id === requestId);
        if (idx !== -1) {
          local[idx] = normalized;
          setLocalRequests(local);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Supabase updateRequestSupportFile fallback to local:', e);
    }
  }

  // Local fallback
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const nowIsoSupport = new Date().toISOString();
  const updatedReq: PaymentRequest = {
    ...requests[index],
    support_file_url: supportUrl,
    support_file_name: supportFileName,
    support_files: updatedSupports,
    last_modified_by: currentUser.id,
    last_modified_by_name: currentUser.full_name || currentUser.username,
    last_modified_at: nowIsoSupport,
    updated_at: nowIsoSupport
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function addRequestSupportFile(
  requestId: string,
  file: File,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  return updateRequestSupportFile(requestId, file, currentUser);
}

export async function deleteRequestSupportFile(
  requestId: string,
  fileUrl: string,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);
  if (!existing) throw new Error('Solicitud no encontrada');

  const currentSupports = getRequestSupportFiles(existing);
  const updatedSupports = currentSupports.filter(f => f.url !== fileUrl);
  const primarySupportUrl = updatedSupports.length > 0 ? updatedSupports[0].url : null;
  const primarySupportFileName = updatedSupports.length > 0 ? updatedSupports[0].fileName : null;

  if (isSupabaseConfigured && supabase) {
    try {
      const modName = currentUser.full_name || currentUser.username || 'Usuario';
      const nowIso = new Date().toISOString();
      const data = await resilientSupabaseUpdate(requestId, {
        support_file_url: primarySupportUrl,
        support_file_name: primarySupportFileName,
        support_files: updatedSupports.length > 0 ? updatedSupports : null,
        last_modified_by: currentUser.id,
        last_modified_by_name: modName,
        last_modified_at: nowIso,
        updated_at: nowIso
      });

      if (data) {
        const normalized = normalizePaymentRequest(data, undefined, currentUser);
        normalized.last_modified_by = currentUser.id;
        normalized.last_modified_by_name = modName;
        normalized.last_modified_at = nowIso;
        const local = getLocalRequests();
        const idx = local.findIndex(r => r.id === requestId);
        if (idx !== -1) {
          local[idx] = normalized;
          setLocalRequests(local);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Supabase deleteRequestSupportFile fallback to local:', e);
    }
  }

  const indexDel = requests.findIndex(r => r.id === requestId);
  const nowIsoDel = new Date().toISOString();
  const updatedReq: PaymentRequest = {
    ...requests[indexDel],
    support_file_url: primarySupportUrl || undefined,
    support_file_name: primarySupportFileName || undefined,
    support_files: updatedSupports,
    last_modified_by: currentUser.id,
    last_modified_by_name: currentUser.full_name || currentUser.username,
    last_modified_at: nowIsoDel,
    updated_at: nowIsoDel
  };

  requests[indexDel] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function updateRequestReceiptFile(
  requestId: string,
  file: File,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const uploadRes = await uploadAttachment(file);
  const receiptUrl = uploadRes.url;
  const receiptFileName = uploadRes.fileName;
  const newAttachedFile: AttachedFile = {
    url: receiptUrl,
    fileName: receiptFileName,
    uploaded_at: new Date().toISOString()
  };

  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);
  const currentReceipts = getRequestReceiptFiles(existing);
  const updatedReceipts = [newAttachedFile, ...currentReceipts.filter(f => f.url !== receiptUrl)];

  if (isSupabaseConfigured && supabase) {
    try {
      const modName = currentUser.full_name || currentUser.username || 'Usuario';
      const nowIso = new Date().toISOString();
      const data = await resilientSupabaseUpdate(requestId, {
        receipt_file_url: receiptUrl,
        receipt_file_name: receiptFileName,
        receipt_files: updatedReceipts,
        last_modified_by: currentUser.id,
        last_modified_by_name: modName,
        last_modified_at: nowIso,
        updated_at: nowIso
      });

      if (data) {
        const normalized = normalizePaymentRequest(data, undefined, currentUser);
        normalized.last_modified_by = currentUser.id;
        normalized.last_modified_by_name = modName;
        normalized.last_modified_at = nowIso;
        const local = getLocalRequests();
        const idx = local.findIndex(r => r.id === requestId);
        if (idx !== -1) {
          local[idx] = normalized;
          setLocalRequests(local);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Supabase updateRequestReceiptFile fallback to local:', e);
    }
  }

  // Local fallback
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const nowIsoReceipt = new Date().toISOString();
  const updatedReq: PaymentRequest = {
    ...requests[index],
    receipt_file_url: receiptUrl,
    receipt_file_name: receiptFileName,
    receipt_files: updatedReceipts,
    last_modified_by: currentUser.id,
    last_modified_by_name: currentUser.full_name || currentUser.username,
    last_modified_at: nowIsoReceipt,
    updated_at: nowIsoReceipt
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function addRequestReceiptFile(
  requestId: string,
  file: File,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  return updateRequestReceiptFile(requestId, file, currentUser);
}

export async function deleteRequestReceiptFile(
  requestId: string,
  fileUrl: string,
  currentUser: UserProfile
): Promise<PaymentRequest> {
  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);
  if (!existing) throw new Error('Solicitud no encontrada');

  const currentReceipts = getRequestReceiptFiles(existing);
  const updatedReceipts = currentReceipts.filter(f => f.url !== fileUrl);
  const primaryReceiptUrl = updatedReceipts.length > 0 ? updatedReceipts[0].url : null;
  const primaryReceiptFileName = updatedReceipts.length > 0 ? updatedReceipts[0].fileName : null;

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, {
        receipt_file_url: primaryReceiptUrl,
        receipt_file_name: primaryReceiptFileName,
        receipt_files: updatedReceipts.length > 0 ? updatedReceipts : null,
        updated_at: new Date().toISOString()
      });

      if (data) {
        const normalized = normalizePaymentRequest(data, undefined, currentUser);
        const local = getLocalRequests();
        const idx = local.findIndex(r => r.id === requestId);
        if (idx !== -1) {
          local[idx] = normalized;
          setLocalRequests(local);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Supabase deleteRequestReceiptFile fallback to local:', e);
    }
  }

  const index = requests.findIndex(r => r.id === requestId);
  const updatedReq: PaymentRequest = {
    ...requests[index],
    receipt_file_url: primaryReceiptUrl || undefined,
    receipt_file_name: primaryReceiptFileName || undefined,
    receipt_files: updatedReceipts,
    updated_at: new Date().toISOString()
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

// ==========================================
// TASA JT MANAGEMENT & DIFFERENTIAL REPORT
// ==========================================

export const JT_RATES_STORAGE_KEY = 'jt_pagos_jt_rates_v1';

export function getLocalJtRates(): JtRate[] {
  try {
    const stored = localStorage.getItem(JT_RATES_STORAGE_KEY);
    if (!stored) return [];
    const rates: JtRate[] = JSON.parse(stored);
    return Array.isArray(rates) ? rates.sort((a, b) => b.rate_date.localeCompare(a.rate_date)) : [];
  } catch (e) {
    console.error('Error al leer tasas JT locales:', e);
    return [];
  }
}

export function setLocalJtRates(rates: JtRate[]): void {
  try {
    const sorted = [...rates].sort((a, b) => b.rate_date.localeCompare(a.rate_date));
    localStorage.setItem(JT_RATES_STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.error('Error al guardar tasas JT locales:', e);
  }
}

export async function fetchJtRates(): Promise<JtRate[]> {
  const localRates = getLocalJtRates();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('jt_rates')
        .select('*')
        .order('rate_date', { ascending: false });

      if (!error && data) {
        setLocalJtRates(data as JtRate[]);
        return data as JtRate[];
      }
    } catch (e) {
      console.warn('Supabase fetchJtRates fallback a local:', e);
    }
  }
  return localRates;
}

export async function saveJtRate(
  dateStr: string,
  rateValue: number,
  currentUser?: UserProfile | null
): Promise<{ rate: JtRate; isUpdate: boolean }> {
  const localRates = getLocalJtRates();
  const existingIndex = localRates.findIndex(r => r.rate_date === dateStr);
  const isUpdate = existingIndex !== -1;
  const nowIso = new Date().toISOString();
  const creator = currentUser?.full_name || currentUser?.username || 'Administrador';

  let recordToSave: JtRate;

  if (isUpdate) {
    recordToSave = {
      ...localRates[existingIndex],
      rate: rateValue,
      updated_at: nowIso
    };
    localRates[existingIndex] = recordToSave;
  } else {
    recordToSave = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `jt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      rate_date: dateStr,
      rate: rateValue,
      created_by: creator,
      created_at: nowIso,
      updated_at: nowIso
    };
    localRates.unshift(recordToSave);
  }

  setLocalJtRates(localRates);

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = {
        rate_date: dateStr,
        rate: rateValue,
        updated_at: nowIso
      };

      if (!isUpdate) {
        payload.id = recordToSave.id;
        payload.created_by = creator;
        payload.created_at = nowIso;
      }

      const { data, error } = await supabase
        .from('jt_rates')
        .upsert(payload, { onConflict: 'rate_date' })
        .select()
        .single();

      if (!error && data) {
        recordToSave = data as JtRate;
        const updatedLocal = getLocalJtRates().map(r => r.rate_date === dateStr ? recordToSave : r);
        setLocalJtRates(updatedLocal);
      }
    } catch (e) {
      console.warn('Supabase upsert jt_rates fallback a local:', e);
    }
  }

  return { rate: recordToSave, isUpdate };
}

export function getJtRateForDate(dateStr: string, jtRates: JtRate[]): number {
  if (!jtRates || jtRates.length === 0 || !dateStr) return 0;

  // Coincidencia exacta única: solo si existe tasa registrada específicamente para esta fecha
  const exact = jtRates.find(r => r.rate_date === dateStr);
  if (exact && Number(exact.rate) > 0) return Number(exact.rate);

  return 0;
}

/**
 * Redondea un número a una cantidad fija de decimales (por defecto 2)
 */
export function roundToDecimals(num: number | undefined | null, decimals = 2): number {
  if (num === undefined || num === null || isNaN(Number(num))) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
}

/**
 * Formatea un número según el estándar hispanohablante/venezolano:
 * - Separador de miles: '.'
 * - Separador de decimales: ','
 * - Redondeo estricto a 2 dígitos decimales
 * Ejemplos:
 * 77.995 -> '78,00'
 * 80 -> '80,00'
 * 1234.56 -> '1.234,56'
 */
export function formatSpanishNumber(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || isNaN(Number(val))) {
    return `0,${'0'.repeat(decimals)}`;
  }
  const factor = Math.pow(10, decimals);
  const rounded = Math.round((Math.abs(Number(val)) + Number.EPSILON) * factor) / factor;
  const isNeg = Number(val) < 0 && rounded > 0;
  const fixed = rounded.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (isNeg ? '-' : '') + (decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt);
}

/**
 * Genera y descarga el reporte Excel con el diseño exacto del bosquejo:
 * "Relacion de Gastos Actualizados a Tasa JT"
 * Incluye recuadro superior derecho de Ganancia, Perdida, Utilidad
 * y columnas calculadas de USD Real, Diferencial y Observación.
 * Todas las columnas numéricas están formateadas con punto '.' como separador de miles,
 * coma ',' como separador de decimales y redondeo estricto a 2 dígitos decimales.
 * Si un día no tiene tasa JT creada, se deja en blanco y se coloca la observación:
 * "Sin tasa JT creada este día".
 */
export function exportDifferentialReportToExcel(
  requests: PaymentRequest[],
  jtRates: JtRate[],
  filenamePrefix = 'RELACION_GASTOS_TASA_JT'
) {
  const deletedIds = getDeletedRequestIds();
  // Para este reporte SOLO serán las solicitudes en moneda VES. Cualquier otra moneda estará fuera de este reporte.
  const validRequests = requests.filter(r => {
    if (deletedIds.has(r.id)) return false;

    // Descartar si es expresamente USD o métodos directos de divisas sin bolívares
    const isDirectUsd =
      r.currency === 'USD' ||
      Number(r.bcv_rate) === 0 ||
      (!r.currency && (r.bank_details?.payment_method === 'zelle_usd' || r.bank_details?.payment_method === 'efectivo_usd'));

    if (isDirectUsd) return false;

    const curr = (r.currency || 'VES').toUpperCase();
    return curr === 'VES';
  });

  let totalGanancia = 0;
  let totalPerdida = 0;

  const dataRows = validRequests.map(r => {
    const isAnulado = r.status === 'anulado';
    const rawDate = r.paid_at || r.receipt_files?.[0]?.uploaded_at || r.created_at;
    const dateObj = new Date(rawDate);
    const dateIso = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';
    const dateDisplay = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

    // Valores redondeados a 2 dígitos
    const montoUsd = isAnulado ? 0 : roundToDecimals(Number(r.amount_usd || 0), 2);
    const bcvRate = isAnulado ? 0 : roundToDecimals(Number(r.bcv_rate || 0), 2);
    const montoBs = isAnulado ? 0 : roundToDecimals(Number(r.amount_bs || 0), 2);

    const rawTasaJt = isAnulado ? 0 : getJtRateForDate(dateIso, jtRates);
    const hasRate = !isAnulado && rawTasaJt > 0;
    const tasaJt = hasRate ? roundToDecimals(rawTasaJt, 2) : 0;

    let usdReal = 0;
    let diferencial = 0;
    let observacion = 'Sin diferencial';
    let obsClass = 'obs-neutral';

    if (isAnulado) {
      observacion = 'Anulado';
      obsClass = 'obs-neutral';
    } else if (!hasRate) {
      // No existe tasa creada para este día: se deja en blanco y se coloca la observación solicitada
      observacion = 'Sin tasa JT creada este día';
      obsClass = 'obs-sin-tasa';
    } else {
      // USD Real: Monto Bs / Tasa JT (ambos redondeados a 2 dígitos)
      if (tasaJt > 0 && montoBs > 0) {
        usdReal = roundToDecimals(montoBs / tasaJt, 2);
      } else {
        usdReal = montoUsd;
      }

      // Diferencial: Monto USD - USD Real (redondeado a 2 dígitos)
      diferencial = roundToDecimals(montoUsd - usdReal, 2);

      if (diferencial > 0.005) {
        observacion = 'Ganancia cambiaria';
        obsClass = 'obs-ganancia';
        totalGanancia += diferencial;
      } else if (diferencial < -0.005) {
        observacion = 'Pérdida cambiaria';
        obsClass = 'obs-perdida';
        totalPerdida += Math.abs(diferencial);
      } else {
        observacion = 'Sin diferencial';
        obsClass = 'obs-neutral';
      }
    }

    return {
      dateDisplay,
      requestNumber: r.request_number || '',
      locator: r.locator || 'S/L',
      category: (r.category || 'hospedaje').toUpperCase(),
      montoUsd,
      bcvRate,
      montoBs,
      tasaJt,
      usdReal,
      diferencial,
      observacion,
      obsClass,
      hasRate,
      isAnulado
    };
  });

  const roundedGanancia = roundToDecimals(totalGanancia, 2);
  const roundedPerdida = roundToDecimals(totalPerdida, 2);
  const roundedUtilidad = roundToDecimals(roundedGanancia - roundedPerdida, 2);

  const rowsHtml = dataRows.length === 0
    ? `<tr><td colspan="11" class="td-cell td-center" style="padding: 16px; color: #64748b;">No hay solicitudes en moneda VES registradas en el reporte.</td></tr>`
    : dataRows.map(row => `
    <tr>
      <td class="td-cell td-center">${row.dateDisplay}</td>
      <td class="td-cell td-center" style="font-weight: 600;">${row.requestNumber}</td>
      <td class="td-cell td-center">${row.locator}</td>
      <td class="td-cell td-center">${row.category}</td>
      <td class="td-cell td-num">${formatSpanishNumber(row.montoUsd, 2)}</td>
      <td class="td-cell td-num">${formatSpanishNumber(row.bcvRate, 2)}</td>
      <td class="td-cell td-num">${formatSpanishNumber(row.montoBs, 2)}</td>
      <td class="td-cell td-num">${row.hasRate ? formatSpanishNumber(row.tasaJt, 2) : ''}</td>
      <td class="td-cell td-num" style="font-weight: 600;">${row.hasRate ? formatSpanishNumber(row.usdReal, 2) : ''}</td>
      <td class="td-cell td-num" style="font-weight: 700; ${row.diferencial > 0.005 ? 'color: #15803d;' : row.diferencial < -0.005 ? 'color: #b91c1c;' : ''}">${row.hasRate ? formatSpanishNumber(row.diferencial, 2) : ''}</td>
      <td class="td-cell td-center ${row.obsClass}">${row.observacion}</td>
    </tr>
  `).join('');

  const excelHtml = `\uFEFF<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Relacion Gastos Tasa JT</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; }
    table { border-collapse: collapse; width: 100%; }
    .title { font-size: 15pt; font-weight: bold; text-align: center; height: 38px; vertical-align: middle; color: #0f172a; }
    .summary-title-cell { font-size: 10pt; font-weight: bold; background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    .summary-val-ganancia { font-size: 10pt; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; color: #15803d; background-color: #f0fdf4; mso-number-format: "\\#\\.\\#\\#0\\,00"; }
    .summary-val-perdida { font-size: 10pt; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; color: #b91c1c; background-color: #fef2f2; mso-number-format: "\\#\\.\\#\\#0\\,00"; }
    .summary-val-utilidad { font-size: 11pt; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; color: #0f172a; background-color: #e2e8f0; mso-number-format: "\\#\\.\\#\\#0\\,00"; }
    .th-header { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: center; border: 1px solid #334155; padding: 8px 6px; vertical-align: middle; }
    .td-cell { font-size: 9.5pt; border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
    .td-center { text-align: center; }
    .td-num { text-align: right; mso-number-format: "\\#\\.\\#\\#0\\,00"; }
    .obs-ganancia { color: #15803d; font-weight: bold; }
    .obs-perdida { color: #b91c1c; font-weight: bold; }
    .obs-neutral { color: #64748b; }
    .obs-sin-tasa { color: #64748b; font-style: italic; }
  </style>
</head>
<body>
  <table>
    <!-- Row 1: Titulo centrado -->
    <tr>
      <td colspan="11" class="title">Relacion de Gastos Actualizados a Tasa JT</td>
    </tr>

    <!-- Row 2: Ganancia -->
    <tr>
      <td colspan="7"></td>
      <td class="summary-title-cell">Ganancia</td>
      <td colspan="3" class="summary-val-ganancia">${formatSpanishNumber(roundedGanancia, 2)}</td>
    </tr>

    <!-- Row 3: Perdida -->
    <tr>
      <td colspan="7"></td>
      <td class="summary-title-cell">Perdida</td>
      <td colspan="3" class="summary-val-perdida">${formatSpanishNumber(roundedPerdida, 2)}</td>
    </tr>

    <!-- Row 4: Utilidad -->
    <tr>
      <td colspan="7"></td>
      <td class="summary-title-cell">Utilidad</td>
      <td colspan="3" class="summary-val-utilidad">${formatSpanishNumber(roundedUtilidad, 2)}</td>
    </tr>

    <!-- Row 5: Espacio en blanco -->
    <tr><td colspan="11" style="height: 14px;"></td></tr>

    <!-- Row 6: Encabezados de tabla según el bosquejo -->
    <thead>
      <tr>
        <th class="th-header" style="width: 120px;">Fecha Liquidación</th>
        <th class="th-header" style="width: 100px;">N° Solicitud</th>
        <th class="th-header" style="width: 100px;">Localizador</th>
        <th class="th-header" style="width: 110px;">Categoría</th>
        <th class="th-header" style="width: 100px;">Monto USD</th>
        <th class="th-header" style="width: 90px;">Tasa BCV</th>
        <th class="th-header" style="width: 110px;">Monto Bs</th>
        <th class="th-header" style="width: 90px;">Tasa JT</th>
        <th class="th-header" style="width: 100px;">USD Real</th>
        <th class="th-header" style="width: 100px;">Diferencial</th>
        <th class="th-header" style="width: 150px;">observacion</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `${filenamePrefix}_${dateStr}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
