export type UserRole = 'admin' | 'solicitante';

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

export type RequestStatus = 'px_fondos' | 'en_proceso' | 'urgente' | 'realizado';
export type PaymentMethodType = 'transferencia_bs' | 'pago_movil' | 'binance' | 'zelle_usd';
export type PaymentCurrency = 'VES' | 'USD';
export type ServiceCategory = 'hospedaje' | 'traslado' | 'gastos_apoyo';

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
  notes?: string;
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
  locator: string;
  location: string;
  room_type: string;
  people_count: number;
  additionals: string;
  nights_dates: string;
  route_from_to?: string;
  expense_concept?: string;
  currency?: PaymentCurrency;
  amount_usd: number;
  bcv_rate: number;
  amount_bs: number;
  bank_details: BankDetails;
  status: RequestStatus;
  support_file_url?: string;
  support_file_name?: string;
  receipt_file_url?: string;
  receipt_file_name?: string;
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
  locator: string;
  location: string;
  room_type: string;
  people_count: number;
  additionals: string;
  nights_dates: string;
  route_from_to?: string;
  expense_concept?: string;
  currency?: PaymentCurrency;
  amount_usd: number;
  bcv_rate: number;
  bank_details: BankDetails;
  support_file?: File | null;
  status?: RequestStatus;
  is_urgent?: boolean;
}

export interface FilterState {
  status?: RequestStatus | 'all';
  searchQuery?: string;
  dateRange?: 'all' | 'today' | 'week' | 'month';
}
