import {
  CreatePaymentRequestInput,
  FinancialSummary,
  PaymentRequest,
  RequestStatus,
  UserProfile,
  Beneficiary
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

function setLocalRequests(requests: PaymentRequest[]) {
  const deletedIds = getDeletedRequestIds();
  const filtered = requests.filter(r => !deletedIds.has(r.id));
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(filtered));
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

export async function fetchPaymentRequests(_currentUser?: UserProfile): Promise<PaymentRequest[]> {
  let list: PaymentRequest[] = [];
  const users = await fetchUsers();
  const userMap = new Map(users.map(u => [u.id, u.full_name || u.username]));
  const deletedIds = getDeletedRequestIds();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*, profiles:created_by(full_name, username)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase payment_requests query error, using local fallback:', error.message);
        list = getLocalRequests();
      } else {
        const client = supabase;
        list = (data || []).map((item: any) => {
          let itemUsd = Number(item.amount_usd) || 0;
          const itemBs = Number(item.amount_bs) || 0;
          const itemBcv = Number(item.bcv_rate) || 0;

          // Auto-reparar registros existentes con USD en 0 en Supabase
          if (itemUsd <= 0 && itemBs > 0 && itemBcv > 0 && client) {
            itemUsd = Number((itemBs / itemBcv).toFixed(2));
            client
              .from('payment_requests')
              .update({ amount_usd: itemUsd })
              .eq('id', item.id)
              .then(
                () => {},
                (updateErr: any) => {
                  if (updateErr) console.warn('Aviso de auto-reparación Supabase:', updateErr.message);
                }
              );
          }

          return {
            ...item,
            amount_usd: itemUsd,
            origin_bank: item.origin_bank || '',
            creator_name:
              item.creator_name ||
              item.profiles?.full_name ||
              item.profiles?.username ||
              userMap.get(item.created_by) ||
              (_currentUser?.id === item.created_by ? _currentUser?.full_name : 'Usuario')
          };
        });
        // Keep local cache synced with remote active items
        setLocalRequests(list);
      }
    } catch (e) {
      console.warn('Supabase fetch failed, fallback to local storage:', e);
      list = getLocalRequests();
    }
  } else {
    // Local fallback - returns all requests for all users
    list = getLocalRequests();
  }

  // Filter out any permanently deleted requests
  list = list.filter(item => !deletedIds.has(item.id));

  return list
    .map(req => {
      const isDirectUsd = req.currency === 'USD' || req.bcv_rate === 0;
      let effectiveUsd = Number(req.amount_usd) || 0;
      let effectiveBs = Number(req.amount_bs) || 0;
      const bcvRate = isDirectUsd ? 0 : Number(req.bcv_rate) || 0;

      if (!isDirectUsd && bcvRate > 0) {
        if (effectiveUsd <= 0 && effectiveBs > 0) {
          effectiveUsd = Number((effectiveBs / bcvRate).toFixed(2));
        } else if (effectiveBs <= 0 && effectiveUsd > 0) {
          effectiveBs = Number((effectiveUsd * bcvRate).toFixed(2));
        }
      }

      const computedBs = isDirectUsd
        ? 0
        : Number(((effectiveUsd || 0) * (bcvRate || 0)).toFixed(2));
      const creatorName =
        req.creator_name ||
        userMap.get(req.created_by) ||
        (_currentUser?.id === req.created_by ? _currentUser?.full_name : 'Usuario');
      return {
        ...req,
        creator_name: creatorName,
        amount_usd: effectiveUsd,
        amount_bs: effectiveBs || computedBs
      };
    })
    .sort((a, b) => {
      if (a.status === 'urgente' && b.status !== 'urgente') return -1;
      if (a.status !== 'urgente' && b.status === 'urgente') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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

async function resilientSupabaseUpdate(requestId: string, payload: any, retryCount = 0): Promise<any> {
  if (!supabase) throw new Error('Supabase client not available');

  let { data, error } = await supabase
    .from('payment_requests')
    .update(payload)
    .eq('id', requestId)
    .select('*, profiles:created_by(full_name, username)')
    .single();

  if (error) {
    if (error.message?.includes('relationship') || error.message?.includes('profiles') || error.code === 'PGRST200') {
      const retryNoJoin = await supabase
        .from('payment_requests')
        .update(payload)
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
  let supportUrl: string | undefined;
  let supportFileName: string | undefined;

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
        support_file_url: supportUrl,
        support_file_name: supportFileName
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
    support_file_url: supportUrl,
    support_file_name: supportFileName,
    created_by: currentUser.id,
    creator_name: creatorFullName,
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
  receiptFile?: File | null,
  originBank?: string
): Promise<PaymentRequest> {
  let receiptUrl: string | undefined;
  let receiptFileName: string | undefined;

  if (newStatus === 'realizado') {
    if (!receiptFile) {
      // Check if existing record already has receipt
      const existing = getLocalRequests().find(r => r.id === requestId);
      if (!existing?.receipt_file_url) {
        throw new Error(
          'Es obligatorio adjuntar el comprobante o soporte de pago al cambiar el estado a "Realizado".'
        );
      }
    } else {
      const uploadRes = await uploadAttachment(receiptFile);
      receiptUrl = uploadRes.url;
      receiptFileName = uploadRes.fileName;
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (receiptUrl) {
        updateData.receipt_file_url = receiptUrl;
        updateData.receipt_file_name = receiptFileName;
      }
      if (originBank !== undefined) {
        updateData.origin_bank = originBank;
      }
      if (newStatus === 'anulado') {
        updateData.cancellation_requested = false;
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

        return {
          ...data,
          origin_bank: data.origin_bank || originBank || '',
          creator_name:
            data.creator_name || data.profiles?.full_name || data.profiles?.username || 'Usuario'
        };
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
    ...(receiptUrl ? { receipt_file_url: receiptUrl, receipt_file_name: receiptFileName } : {}),
    ...(originBank !== undefined ? { origin_bank: originBank } : {})
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

// User Management Services
export async function fetchUsers(): Promise<UserProfile[]> {
  const localUsers = getLocalUsers();
  const localPassMap = new Map(
    localUsers.map(u => [String(u?.username || u?.email || '').toLowerCase(), u.password])
  );

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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
        return enriched;
      }
      return localUsers;
    } catch (e) {
      console.warn('Supabase fetchUsers exception, fallback to local users:', e);
      return localUsers;
    }
  }
  return localUsers;
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
  return newUser;
}

export async function toggleUserActiveStatus(userId: string): Promise<UserProfile> {
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

// ==========================================
// BENEFICIARY DIRECTORY SERVICES
// ==========================================

export async function fetchBeneficiaries(): Promise<Beneficiary[]> {
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
        return enriched;
      }
      return localList;
    } catch (e) {
      console.warn('Supabase fetchBeneficiaries exception, using local:', e);
      return localList;
    }
  }

  return localList;
}

export async function createBeneficiary(
  data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>
): Promise<Beneficiary> {
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
        updated_at: new Date().toISOString()
      };

      const data = await resilientSupabaseUpdate(requestId, updateRecord);

      if (data) {
        return {
          ...data,
          guest_list: input.guest_list,
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
    updated_at: new Date().toISOString()
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

    if (req.cancellation_requested) {
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

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, {
        support_file_url: supportUrl,
        support_file_name: supportFileName,
        updated_at: new Date().toISOString()
      });

      if (data) {
        return {
          ...data,
          creator_name:
            data.creator_name || data.profiles?.full_name || data.profiles?.username || currentUser.full_name
        };
      }
    } catch (e) {
      console.warn('Supabase updateRequestSupportFile fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    support_file_url: supportUrl,
    support_file_name: supportFileName,
    updated_at: new Date().toISOString()
  };

  requests[index] = updatedReq;
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

  if (isSupabaseConfigured && supabase) {
    try {
      const data = await resilientSupabaseUpdate(requestId, {
        receipt_file_url: receiptUrl,
        receipt_file_name: receiptFileName,
        updated_at: new Date().toISOString()
      });

      if (data) {
        return {
          ...data,
          creator_name:
            data.creator_name || data.profiles?.full_name || data.profiles?.username || currentUser.full_name
        };
      }
    } catch (e) {
      console.warn('Supabase updateRequestReceiptFile fallback to local:', e);
    }
  }

  // Local fallback
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) throw new Error('Solicitud no encontrada');

  const updatedReq: PaymentRequest = {
    ...requests[index],
    receipt_file_url: receiptUrl,
    receipt_file_name: receiptFileName,
    updated_at: new Date().toISOString()
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

