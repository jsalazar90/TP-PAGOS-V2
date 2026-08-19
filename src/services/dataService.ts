import {
  CreatePaymentRequestInput,
  FinancialSummary,
  PaymentRequest,
  RequestStatus,
  UserProfile
} from '../types';
import { INITIAL_REQUESTS, INITIAL_USERS } from './mockData';
import { uploadAttachment } from './storage';
import { isSupabaseConfigured, supabase } from './supabase';

const REQUESTS_STORAGE_KEY = 'jt_pagos_requests_v1';
const USERS_STORAGE_KEY = 'jt_pagos_users_v1';

// Initial local storage setup
function getLocalRequests(): PaymentRequest[] {
  const users = getLocalUsers();
  const userMap = new Map(users.map(u => [u.id, u.full_name || u.username]));
  const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
  if (!stored) {
    const initialized = INITIAL_REQUESTS.map(req => ({
      ...req,
      creator_name: req.creator_name || userMap.get(req.created_by) || 'Usuario'
    }));
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(initialized));
    return initialized;
  }
  try {
    const parsed: PaymentRequest[] = JSON.parse(stored);
    return parsed.map(req => ({
      ...req,
      creator_name: req.creator_name || userMap.get(req.created_by) || 'Usuario'
    }));
  } catch (e) {
    return INITIAL_REQUESTS;
  }
}

function setLocalRequests(requests: PaymentRequest[]) {
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
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

export async function fetchPaymentRequests(_currentUser?: UserProfile): Promise<PaymentRequest[]> {
  let list: PaymentRequest[] = [];
  const users = await fetchUsers();
  const userMap = new Map(users.map(u => [u.id, u.full_name || u.username]));

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
        list = (data || []).map((item: any) => ({
          ...item,
          creator_name:
            item.creator_name ||
            item.profiles?.full_name ||
            item.profiles?.username ||
            userMap.get(item.created_by) ||
            (_currentUser?.id === item.created_by ? _currentUser?.full_name : 'Usuario')
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch failed, fallback to local storage:', e);
      list = getLocalRequests();
    }
  } else {
    // Local fallback - returns all requests for all users
    list = getLocalRequests();
  }

  return list
    .map(req => {
      const isDirectUsd = req.currency === 'USD' || req.bcv_rate === 0;
      const computedBs = isDirectUsd
        ? 0
        : Number(((req.amount_usd || 0) * (req.bcv_rate || 0)).toFixed(2));
      const creatorName =
        req.creator_name ||
        userMap.get(req.created_by) ||
        (_currentUser?.id === req.created_by ? _currentUser?.full_name : 'Usuario');
      return {
        ...req,
        creator_name: creatorName,
        amount_bs: req.amount_bs || computedBs
      };
    })
    .sort((a, b) => {
      if (a.status === 'urgente' && b.status !== 'urgente') return -1;
      if (a.status !== 'urgente' && b.status === 'urgente') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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
  const { data, error } = await supabase
    .from('payment_requests')
    .insert([record])
    .select('*, profiles:created_by(full_name, username)')
    .single();

  if (error) {
    const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/i);
    if (missingColMatch && missingColMatch[1] && retryCount < 5) {
      const missingCol = missingColMatch[1];
      console.warn(
        `[Supabase Notice] La columna '${missingCol}' no existe aún en la base de datos remota. Reintentando guardado compatible...`
      );
      const adjusted = { ...record };
      delete adjusted[missingCol];
      return resilientSupabaseInsert(adjusted, retryCount + 1);
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
  const amountBs =
    input.amount_bs !== undefined && input.amount_bs > 0
      ? Number(input.amount_bs.toFixed(2))
      : isDirectUsd
      ? 0
      : Number((input.amount_usd * input.bcv_rate).toFixed(2));
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
        amount_usd: input.amount_usd,
        bcv_rate: isDirectUsd ? 0 : input.bcv_rate,
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
    amount_usd: input.amount_usd,
    bcv_rate: isDirectUsd ? 0 : input.bcv_rate,
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
  receiptFile?: File | null
): Promise<PaymentRequest> {
  let receiptUrl: string | undefined;
  let receiptFileName: string | undefined;

  if (newStatus === 'realizado') {
    if (!receiptFile) {
      throw new Error(
        'Es obligatorio adjuntar el comprobante o soporte de pago al cambiar el estado a "Realizado".'
      );
    }
    const uploadRes = await uploadAttachment(receiptFile);
    receiptUrl = uploadRes.url;
    receiptFileName = uploadRes.fileName;
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

      const { data, error } = await supabase
        .from('payment_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*, profiles:created_by(full_name, username)')
        .single();

      if (!error && data) {
        return {
          ...data,
          creator_name:
            data.creator_name || data.profiles?.full_name || data.profiles?.username || 'Usuario'
        };
      }
    } catch (e) {
      console.warn('Supabase updateRequestStatus failed, fallback to local:', e);
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
    ...(receiptUrl ? { receipt_file_url: receiptUrl, receipt_file_name: receiptFileName } : {})
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
  const amountBs =
    input.amount_bs !== undefined && input.amount_bs > 0
      ? Number(input.amount_bs.toFixed(2))
      : isDirectUsd
      ? 0
      : Number((input.amount_usd * input.bcv_rate).toFixed(2));
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
        amount_usd: input.amount_usd,
        bcv_rate: isDirectUsd ? 0 : input.bcv_rate,
        amount_bs: amountBs,
        bank_details: input.bank_details,
        status: updatedStatus,
        support_file_url: supportUrl,
        support_file_name: supportFileName,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payment_requests')
        .update(updateRecord)
        .eq('id', requestId)
        .select('*, profiles:created_by(full_name, username)')
        .single();

      if (!error && data) {
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
    amount_usd: input.amount_usd,
    bcv_rate: isDirectUsd ? 0 : input.bcv_rate,
    amount_bs: amountBs,
    bank_details: input.bank_details,
    status: updatedStatus,
    support_file_url: supportUrl,
    support_file_name: supportFileName,
    updated_at: new Date().toISOString()
  };

  requests[index] = updatedReq;
  setLocalRequests(requests);
  return updatedReq;
}

export async function deletePaymentRequest(
  requestId: string,
  _currentUser: UserProfile
): Promise<void> {
  const requests = getLocalRequests();
  const existing = requests.find(r => r.id === requestId);

  if (existing && existing.status === 'realizado') {
    throw new Error('No se pueden eliminar solicitudes que ya están en estado Realizado.');
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('payment_requests').delete().eq('id', requestId);
      if (!error) return;
    } catch (e) {
      console.warn('Supabase deletePaymentRequest fallback to local:', e);
    }
  }

  const filtered = requests.filter(r => r.id !== requestId);
  setLocalRequests(filtered);
}

// Analytics and Metrics Helper
export function calculateFinancialSummary(requests: PaymentRequest[]): FinancialSummary {
  let totalPendingUsd = 0;
  let totalPendingBs = 0;
  let totalPaidUsd = 0;
  let totalPaidBs = 0;
  let countPxFondos = 0;
  let countEnProceso = 0;
  let countUrgente = 0;
  let countRealizado = 0;

  for (const req of requests) {
    const usd = Number(req.amount_usd) || 0;
    const bs = Number(req.amount_bs) || 0;

    if (req.status === 'realizado') {
      countRealizado++;
      totalPaidUsd += usd;
      totalPaidBs += bs;
    } else {
      totalPendingUsd += usd;
      totalPendingBs += bs;

      if (req.status === 'urgente') countUrgente++;
      else if (req.status === 'en_proceso') countEnProceso++;
      else if (req.status === 'px_fondos') countPxFondos++;
    }
  }

  return {
    totalPendingUsd: Number(totalPendingUsd.toFixed(2)),
    totalPendingBs: Number(totalPendingBs.toFixed(2)),
    totalPaidUsd: Number(totalPaidUsd.toFixed(2)),
    totalPaidBs: Number(totalPaidBs.toFixed(2)),
    countPxFondos,
    countEnProceso,
    countUrgente,
    countRealizado,
    countTotal: requests.length
  };
}

// CSV / Excel Exporter
export function exportRequestsToCSV(requests: PaymentRequest[], filenamePrefix = 'TP_PAGOS_REPORTE') {
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
    'Banco',
    'Cuenta / Pago Móvil / Zelle',
    'Creado Por',
    'Fecha Creación',
    'Fecha Actualización'
  ];

  const rows = requests.map(r => {
    const b = r.bank_details || {};
    const bankAccount =
      b.account_number ||
      b.pago_movil_phone ||
      b.zelle_email ||
      b.binance_pay_id ||
      b.cash_receiver ||
      '';

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
      r.amount_usd || 0,
      r.bcv_rate || 0,
      r.amount_bs || 0,
      `"${(b.payment_method || 'transferencia_bs').replace(/_/g, ' ').toUpperCase()}"`,
      `"${(b.beneficiary || '').replace(/"/g, '""')}"`,
      `"${(b.bank || '').replace(/"/g, '""')}"`,
      `"${bankAccount.replace(/"/g, '""')}"`,
      `"${(r.creator_name || '').replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString()}"`,
      `"${new Date(r.updated_at).toLocaleString()}"`
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
