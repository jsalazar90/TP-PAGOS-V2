import { CreatePaymentRequestInput, PaymentRequest, RequestStatus, UserProfile } from '../types';
import { INITIAL_REQUESTS, INITIAL_USERS } from './mockData';
import { uploadAttachment } from './storage';
import { isSupabaseConfigured, supabase } from './supabase';

const REQUESTS_STORAGE_KEY = 'jt_pagos_requests_v1';
const USERS_STORAGE_KEY = 'jt_pagos_users_v1';

// Initial local storage setup
function getLocalRequests(): PaymentRequest[] {
  const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_REQUESTS));
    return INITIAL_REQUESTS;
  }
  try {
    return JSON.parse(stored);
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
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }
    return data || [];
  }

  // Local fallback - returns all requests for all users
  return getLocalRequests();
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
  const amountBs = isDirectUsd ? 0 : Number((input.amount_usd * input.bcv_rate).toFixed(2));
  const effectiveCurrency = input.currency || (isDirectUsd ? 'USD' : 'VES');
  const initialStatus = input.status || (input.is_urgent ? 'urgente' : 'en_proceso');

  if (isSupabaseConfigured && supabase) {
    const newRecord = {
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
      bank_details: input.bank_details,
      status: initialStatus,
      support_file_url: supportUrl,
      support_file_name: supportFileName,
      created_by: currentUser.id
    };

    const { data, error } = await supabase
      .from('payment_requests')
      .insert([newRecord])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
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
    creator_name: currentUser.full_name,
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
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
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
