export type UserRole = 'admin' | 'solicitante' | 'operador';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
  created_at: string;
}

export type RequestStatus = 'urgente' | 'en_proceso' | 'realizado' | 'anulado';
export type PaymentMethodType =
  | 'transferencia_bs'
  | 'pago_movil'
  | 'binance'
  | 'zelle_usd'
  | 'efectivo_usd'
  | 'efectivo_bs';

export type PaymentCurrency = 'VES' | 'USD';
export type ServiceCategory = 'hospedaje' | 'traslado' | 'vuelos' | 'gastos_apoyo' | 'viaticos';

export interface GuestItem {
  name: string;
  ci: string;
  phone?: string;
}

export interface BankDetails {
  payment_method?: PaymentMethodType;
  beneficiary: string;
  rif?: string;
  bank?: string;
  account_number?: string;
  account_type?: string;
  pago_movil_phone?: string;
  pago_movil_ci?: string;
  binance_email?: string;
  binance_pay_id?: string;
  zelle_email?: string;
  zelle_name?: string;
  cash_receiver?: string;
  notes?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  rif?: string;
  category?: ServiceCategory;
  bank_details: BankDetails;
  created_at?: string;
  updated_at?: string;
}

export interface AttachedFile {
  url: string;
  fileName: string;
  uploaded_at?: string;
}

export interface PaymentRequest {
  id: string;
  request_number: number;
  category?: ServiceCategory;
  title: string;
  client: string;
  hotel_name: string;
  guest_name: string;
  guest_ci: string;
  guest_list?: GuestItem[];
  locator: string;
  location: string;
  room_type: string;
  people_count: number;
  additionals: string;
  nights_dates: string;
  route_from_to?: string;
  expense_concept?: string;
  airline?: string;
  flight_route?: string;
  currency?: PaymentCurrency;
  amount_usd: number;
  bcv_rate: number;
  amount_bs: number;
  bank_details: BankDetails;
  status: RequestStatus;
  support_file_url?: string;
  support_file_name?: string;
  support_files?: AttachedFile[];
  receipt_file_url?: string;
  receipt_file_name?: string;
  receipt_files?: AttachedFile[];
  origin_bank?: string;
  modification_requested?: boolean;
  modification_reason?: string;
  modification_requested_at?: string;
  modification_requested_by?: string;
  cancellation_requested?: boolean;
  cancellation_reason?: string;
  cancellation_requested_at?: string;
  cancellation_requested_by?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequestInput {
  category?: ServiceCategory;
  title: string;
  client: string;
  hotel_name: string;
  guest_name: string;
  guest_ci: string;
  guest_list?: GuestItem[];
  locator: string;
  location: string;
  room_type: string;
  people_count: number;
  additionals: string;
  nights_dates: string;
  route_from_to?: string;
  expense_concept?: string;
  airline?: string;
  flight_route?: string;
  currency?: PaymentCurrency;
  amount_usd: number;
  bcv_rate: number;
  amount_bs?: number;
  bank_details: BankDetails;
  support_file?: File | null;
  support_files?: File[];
  status?: RequestStatus;
  is_urgent?: boolean;
  modification_requested?: boolean;
  modification_reason?: string;
  modification_requested_at?: string;
  modification_requested_by?: string;
  cancellation_requested?: boolean;
  cancellation_reason?: string;
  cancellation_requested_at?: string;
  cancellation_requested_by?: string;
}

export interface FilterState {
  status?: RequestStatus | 'all';
  category?: ServiceCategory | 'all';
  searchQuery?: string;
  dateRange?: 'all' | 'today' | 'week' | 'month';
  client?: string;
}

export interface FinancialSummary {
  totalPendingUsd: number;
  totalPendingBs: number;
  totalPaidUsd: number;
  totalPaidBs: number;
  countEnProceso: number;
  countUrgente: number;
  countRealizado: number;
  countAnulado: number;
  countCancellationRequested: number;
  countTotal: number;
}
