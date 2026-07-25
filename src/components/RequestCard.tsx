import React, { useState } from 'react';
import { PaymentRequest, UserProfile } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Building2,
  User,
  MapPin,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Landmark,
  Eye,
  RefreshCw,
  FileCheck,
  ArrowUpRight,
  Copy,
  Check,
  QrCode,
  Smartphone,
  DollarSign,
  Car,
  Receipt,
  Hotel,
  Wallet,
  AlertTriangle
} from 'lucide-react';

interface RequestCardProps {
  request: PaymentRequest;
  currentUser: UserProfile;
  onOpenDetails: (request: PaymentRequest) => void;
  onOpenStatusModal: (request: PaymentRequest) => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  currentUser,
  onOpenDetails,
  onOpenStatusModal,
}) => {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  const isDirectUsd = request.currency === 'USD' || request.bcv_rate === 0;

  const handleCopyBankDetails = () => {
    let textToCopy = `Beneficiario: ${request.bank_details.beneficiary}`;

    if (request.bank_details.payment_method === 'binance' || request.bank_details.binance_email) {
      if (request.bank_details.binance_email) textToCopy += `\nBinance Email: ${request.bank_details.binance_email}`;
      if (request.bank_details.binance_pay_id) textToCopy += `\nBinance Pay ID: ${request.bank_details.binance_pay_id}`;
    } else if (request.bank_details.payment_method === 'zelle_usd' || request.bank_details.zelle_email) {
      if (request.bank_details.zelle_email) textToCopy += `\nZelle Email: ${request.bank_details.zelle_email}`;
      if (request.bank_details.account_number) textToCopy += `\nBanco/Cuenta USD: ${request.bank_details.account_number}`;
    } else if (request.bank_details.payment_method === 'pago_movil') {
      if (request.bank_details.bank) textToCopy += `\nBanco: ${request.bank_details.bank}`;
      if (request.bank_details.pago_movil_phone) textToCopy += `\nPago Móvil: ${request.bank_details.pago_movil_phone}`;
      if (request.bank_details.pago_movil_ci) textToCopy += `\nCédula/RIF PM: ${request.bank_details.pago_movil_ci}`;
    } else {
      if (request.bank_details.rif) textToCopy += `\nRIF/CI: ${request.bank_details.rif}`;
      if (request.bank_details.bank) textToCopy += `\nBanco: ${request.bank_details.bank}`;
      if (request.bank_details.account_number) textToCopy += `\nCuenta: ${request.bank_details.account_number}`;
      if (request.bank_details.pago_movil_phone) textToCopy += `\nPago Móvil: ${request.bank_details.pago_movil_phone}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const category = request.category || 'hospedaje';

  return (
    <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-card hover:shadow-card-hover hover:border-slate-300 transition-all space-y-3 group">
      {/* Main Horizontal Row Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Column: LOC, Category, Status, Payment Method Badge, Title, Hotel/Provider, Guest */}
        <div className="space-y-1 md:max-w-[48%]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              LOC: #{request.locator}
            </span>

            {/* Category Badge */}
            {category === 'traslado' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                <Car className="w-3 h-3 text-blue-600" /> Traslado
              </span>
            ) : category === 'gastos_apoyo' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                <Receipt className="w-3 h-3 text-purple-600" /> Gastos / Apoyo
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                <Hotel className="w-3 h-3 text-indigo-600" /> Hospedaje
              </span>
            )}

            <StatusBadge status={request.status} size="sm" />

            {/* Payment Method Badge */}
            {request.bank_details.payment_method === 'binance' || request.bank_details.binance_email ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-amber-700" /> Binance Pay
              </span>
            ) : request.bank_details.payment_method === 'pago_movil' ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-teal-700" /> Pago Móvil
              </span>
            ) : request.bank_details.payment_method === 'zelle_usd' || request.bank_details.zelle_email ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-700" /> Zelle / USD
              </span>
            ) : null}

            <span className="text-xs text-slate-500 font-medium ml-1">
              Cliente: <strong className="text-slate-800">{request.client}</strong>
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
            {request.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              {category === 'traslado' ? (
                <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              ) : category === 'gastos_apoyo' ? (
                <Receipt className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              )}
              {request.hotel_name}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {request.guest_name} ({request.guest_ci})
            </span>
          </div>

          {/* Route or Expense Specific Details */}
          {request.route_from_to && (
            <p className="text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 inline-block">
              Ruta: {request.route_from_to}
            </p>
          )}

          {request.expense_concept && (
            <p className="text-[11px] font-semibold text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded border border-purple-100 inline-block">
              Concepto: {request.expense_concept}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              {request.location}
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              {request.nights_dates}
            </span>
            {request.room_type && <span>({request.room_type})</span>}
            <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/80 text-[10px]">
              <User className="w-3 h-3 text-indigo-600 shrink-0" />
              Solicitado por: {request.creator_name || 'Solicitante'}
            </span>
          </div>
        </div>

        {/* Middle Column: Amounts (USD & BS / Divisa) */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between md:justify-end gap-4 shrink-0 md:min-w-[200px]">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Monto Divisas
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-600">
              {formatUSD(request.amount_usd)}
            </span>
          </div>

          <div className="text-right border-l border-slate-200 pl-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {isDirectUsd ? 'Método Moneda' : 'Moneda Local'}
            </span>

            {isDirectUsd ? (
              <div>
                <span className="text-xs font-black text-indigo-700 block bg-indigo-100/80 px-2 py-0.5 rounded text-center">
                  💵 Pago Divisa
                </span>
                <span className="text-[9px] text-slate-400 block text-center font-medium">Sin Tasa BS</span>
              </div>
            ) : (
              <>
                <span className="text-sm sm:text-base font-black text-indigo-700">
                  BS {formatBS(request.amount_bs || (request.amount_usd && request.bcv_rate ? request.amount_usd * request.bcv_rate : 0))}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Tasa: BS {request.bcv_rate}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="flex items-center gap-2 shrink-0 md:flex-col md:items-end justify-between md:justify-center">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenDetails(request)}
              className="active-press px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-200/80 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Ficha</span>
            </button>

            {currentUser.role === 'admin' && request.status !== 'realizado' && (
              <button
                onClick={() => onOpenStatusModal(request)}
                className="active-press px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
              >
                {request.status === 'px_fondos' && <Wallet className="w-3.5 h-3.5 text-amber-300" />}
                {request.status === 'en_proceso' && <RefreshCw className="w-3.5 h-3.5" />}
                {request.status === 'urgente' && <AlertTriangle className="w-3.5 h-3.5 text-rose-300 animate-pulse" />}
                <span>Gestionar</span>
              </button>
            )}
          </div>

          {/* Quick Bank Details Accordion Button */}
          <button
            onClick={() => setShowBankDetails(!showBankDetails)}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 py-0.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100 transition-colors"
          >
            {request.bank_details.payment_method === 'binance' || request.bank_details.binance_email ? (
              <QrCode className="w-3 h-3 text-amber-600" />
            ) : request.bank_details.payment_method === 'pago_movil' ? (
              <Smartphone className="w-3 h-3 text-teal-600" />
            ) : (
              <Landmark className="w-3 h-3 text-indigo-600" />
            )}
            <span>Datos de Pago</span>
            {showBankDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Bank Details Drawer */}
      {showBankDetails && (
        <div className="p-3 bg-teal-50/70 rounded-xl text-xs space-y-2 text-slate-800 font-mono border border-teal-100/90 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-teal-200/60 pb-1.5 font-sans">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              {request.bank_details.payment_method === 'binance' || request.bank_details.binance_email ? (
                <QrCode className="w-3.5 h-3.5 text-amber-600" />
              ) : request.bank_details.payment_method === 'pago_movil' ? (
                <Smartphone className="w-3.5 h-3.5 text-teal-600" />
              ) : (
                <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
              )}
              <span>Datos Destino de Pago</span>
            </span>
            <button
              type="button"
              onClick={handleCopyBankDetails}
              className="active-press flex items-center gap-1 text-[11px] font-bold text-[#00b4a2] hover:text-teal-700 bg-white hover:bg-teal-100/60 px-2 py-0.5 rounded border border-teal-200 transition-all shadow-2xs"
            >
              {copiedBank ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-extrabold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-[#00b4a2]" />
                  <span>Copiar Datos</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs font-sans">
            <p><strong className="text-slate-500 font-normal">Beneficiario:</strong> <span className="font-bold text-slate-900 font-mono">{request.bank_details.beneficiary}</span></p>

            {/* BINANCE */}
            {(request.bank_details.payment_method === 'binance' || request.bank_details.binance_email) && (
              <>
                {request.bank_details.binance_email && (
                  <p className="font-mono text-amber-900 font-bold"><strong className="text-slate-500 font-sans font-normal">Correo Binance:</strong> {request.bank_details.binance_email}</p>
                )}
                {request.bank_details.binance_pay_id && (
                  <p className="font-mono text-amber-900 font-bold"><strong className="text-slate-500 font-sans font-normal">Pay ID:</strong> {request.bank_details.binance_pay_id}</p>
                )}
              </>
            )}

            {/* ZELLE */}
            {(request.bank_details.payment_method === 'zelle_usd' || request.bank_details.zelle_email) && (
              <>
                {request.bank_details.zelle_email && (
                  <p className="font-mono text-emerald-900 font-bold"><strong className="text-slate-500 font-sans font-normal">Email Zelle:</strong> {request.bank_details.zelle_email}</p>
                )}
                {request.bank_details.account_number && (
                  <p className="font-mono text-emerald-900 font-bold"><strong className="text-slate-500 font-sans font-normal">Cuenta/Banco USD:</strong> {request.bank_details.account_number}</p>
                )}
              </>
            )}

            {/* PAGO MÓVIL */}
            {request.bank_details.payment_method === 'pago_movil' && (
              <>
                {request.bank_details.bank && <p><strong className="text-slate-500 font-normal">Banco:</strong> {request.bank_details.bank}</p>}
                {request.bank_details.pago_movil_phone && (
                  <p className="font-mono text-teal-900 font-bold"><strong className="text-slate-500 font-sans font-normal">Pago Móvil:</strong> {request.bank_details.pago_movil_phone}</p>
                )}
                {request.bank_details.pago_movil_ci && (
                  <p className="font-mono text-teal-900 font-bold"><strong className="text-slate-500 font-sans font-normal">Cédula PM:</strong> {request.bank_details.pago_movil_ci}</p>
                )}
              </>
            )}

            {/* BANK ACCOUNT */}
            {(!request.bank_details.payment_method || request.bank_details.payment_method === 'transferencia_bs') && (
              <>
                {request.bank_details.rif && <p><strong className="text-slate-500 font-normal">RIF:</strong> {request.bank_details.rif}</p>}
                {request.bank_details.bank && <p><strong className="text-slate-500 font-normal">Banco:</strong> {request.bank_details.bank}</p>}
                {request.bank_details.account_number && (
                  <p className="text-[#00b4a2] font-bold font-mono select-all"><strong className="text-slate-500 font-sans font-normal">Cuenta:</strong> {request.bank_details.account_number}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Support File Links */}
      {(request.support_file_url || request.receipt_file_url) && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-400 font-medium">Adjuntos:</span>
          {request.support_file_url && (
            <a
              href={request.support_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
            >
              <FileText className="w-3 h-3 text-indigo-600" />
              <span className="truncate max-w-[150px]">{request.support_file_name || 'Soporte Solicitud'}</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </a>
          )}

          {request.receipt_file_url && (
            <a
              href={request.receipt_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[150px]">{request.receipt_file_name || 'Comprobante Pago'}</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
