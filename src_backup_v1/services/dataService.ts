import { CreatePaymentRequestInput, PaymentRequest, RequestStatus, UserProfile } from '../types';
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

function getLocalUsers(): UserProfile[] {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    return JSON.parse(stored);
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
          creator_name: item.creator_name || item.profiles?.full_name || item.profiles?.username || userMap.get(item.created_by) || (_currentUser?.id === item.created_by ? _currentUser?.full_name : 'Usuario')
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

  return list.map(req => {
    const isDirectUsd = req.currency === 'USD' || req.bcv_rate === 0;
    const computedBs = isDirectUsd ? 0 : Number(((req.amount_usd || 0) * (req.bcv_rate || 0)).toFixed(2));
    const creatorName = req.creator_name || userMap.get(req.created_by) || (_currentUser?.id === req.created_by ? _currentUser?.full_name : 'Usuario');
    return {
      ...req,
      creator_name: creatorName,
      amount_bs: req.amount_bs || computedBs
    };
  }).sort((a, b) => {
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
  const amountBs = input.amount_bs !== undefined && input.amount_bs > 0
    ? Number(input.amount_bs.toFixed(2))
    : (isDirectUsd ? 0 : Number((input.amount_usd * input.bcv_rate).toFixed(2)));
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

      const { data, error } = await supabase
        .from('payment_requests')
        .insert([newRecord])
        .select('*, profiles:created_by(full_name, username)')
        .single();

      if (error) {
        console.warn('Supabase insert error (fallback to local):', error.message);
        throw new Error(error.message);
      }
      return {
        ...data,
        creator_name: data.creator_name || data.profiles?.full_name || data.profiles?.username || creatorFullName
      };
    } catch (supabaseErr: any) {
      console.warn('Could not insert to Supabase, saving locally:', supabaseErr.message);
      // If table doesn't exist yet in Supabase, fall back to local storage
    }
  }

  // Local Storage Fallback
  const requests = getLocalRequests();
  const nextReqNum = (requests.length > 0 ? Math.max(...requests.map(r => r.request_number)) : 10) + 1;
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
    locator: input.locator || formattedReqNum,
    location: input.location,
    room_type: input.room_type,
    people_count: input.people_count,
    additionals: input.additionals,
    nights_dates: input.nights_dates,
    route_from_to: input.route_from_to,
    expense_concept: input.expense_concept,
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
      throw new Error('Es obligatorio adjuntar el comprobante o soporte de pago al cambiar el estado a "Realizado".');
    }
    const uploadRes = await uploadAttachment(receiptFile);
    receiptUrl = uploadRes.url;
    receiptFileName = uploadRes.fileName;
  }

  if (isSupabaseConfigured && supabase) {
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
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn('Supabase fetchUsers error, fallback to local users:', error.message);
        return getLocalUsers();
      }
      return data && data.length > 0 ? data : getLocalUsers();
    } catch (e) {
      console.warn('Supabase fetchUsers exception, fallback to local users:', e);
      return getLocalUsers();
    }
  }
  return getLocalUsers();
}

export async function createNewUser(userData: Omit<UserProfile, 'id' | 'created_at'>): Promise<UserProfile> {
  const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0')}`;

  const { password, ...dbFields } = userData;

  const payload = {
    id: generatedId,
    ...dbFields
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('profiles').insert([payload]).select().single();
    if (error) throw new Error(error.message);
    return { ...data, password };
  }

  const users = getLocalUsers();
  const newUser: UserProfile = {
    id: generatedId,
    ...userData,
    created_at: new Date().toISOString()
  };
  const updated = [newUser, ...users];
  setLocalUsers(updated);
  return newUser;
}

export async function toggleUserActiveStatus(userId: string): Promise<UserProfile> {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.id === userId);
  const currentStatus = index !== -1 ? users[index].is_active : true;
  const newStatus = !currentStatus;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (index !== -1) {
      users[index].is_active = newStatus;
      setLocalUsers(users);
    }
    return data;
  }

  if (index === -1) throw new Error('Usuario no encontrado');
  users[index].is_active = newStatus;
  setLocalUsers(users);
  return users[index];
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
  const amountBs = input.amount_bs !== undefined && input.amount_bs > 0
    ? Number(input.amount_bs.toFixed(2))
    : (isDirectUsd ? 0 : Number((input.amount_usd * input.bcv_rate).toFixed(2)));
  const effectiveCurrency = input.currency || (isDirectUsd ? 'USD' : 'VES');
  const updatedStatus = input.status || (input.is_urgent ? 'urgente' : 'en_proceso');

  if (isSupabaseConfigured && supabase) {
    const updateRecord = {
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

    if (error) throw new Error(error.message);
    return {
      ...data,
      creator_name: data.creator_name || data.profiles?.full_name || data.profiles?.username || currentUser.full_name
    };
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
    locator: input.locator || requests[index].locator,
    location: input.location,
    room_type: input.room_type,
    people_count: input.people_count,
    additionals: input.additionals,
    nights_dates: input.nights_dates,
    route_from_to: input.route_from_to,
    expense_concept: input.expense_concept,
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
    const { error } = await supabase
      .from('payment_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw new Error(error.message);
    return;
  }

  const filtered = requests.filter(r => r.id !== requestId);
  setLocalRequests(filtered);
}
