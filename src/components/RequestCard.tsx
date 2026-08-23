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
  Plane,
  Briefcase,
  AlertTriangle,
  Pencil,
  Trash2,
  Banknote,
  Edit3,
  Clock,
  Ban
} from 'lucide-react';

interface RequestCardProps {
  request: PaymentRequest;
  currentUser: UserProfile;
  onOpenDetails: (request: PaymentRequest) => void;
  onOpenStatusModal: (request: PaymentRequest) => void;
  onEditRequest?: (request: PaymentRequest) => void;
  onDeleteRequest?: (request: PaymentRequest) => void;
  onRequestModification?: (request: PaymentRequest) => void;
  onCancelModification?: (request: PaymentRequest) => void;
  onRequestCancellation?: (request: PaymentRequest) => void;
  onCancelCancellation?: (request: PaymentRequest) => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  currentUser,
  onOpenDetails,
  onOpenStatusModal,
  onEditRequest,
  onDeleteRequest,
  onRequestModification,
  onCancelModification,
  onRequestCancellation,
  onCancelCancellation,
}) => {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedLoc, setCopiedLoc] = useState(false);

  const isDirectUsd = request.currency === 'USD' || request.bcv_rate === 0;
  const canDelete =
    request.status !== 'realizado' &&
    currentUser.role === 'admin';

  const handleCopyLocator = () => {
    navigator.clipboard.writeText(request.locator);
    setCopiedLoc(true);
    setTimeout(() => setCopiedLoc(false), 2000);
  };

  const handleCopyBankDetails = () => {
    let textToCopy = `Beneficiario: ${request.bank_details.beneficiary}`;

    if (request.bank_details.payment_method === 'binance' || request.bank_details.binance_email) {
      if (request.bank_details.binance_email)
        textToCopy += `\nBinance Email: ${request.bank_details.binance_email}`;
      if (request.bank_details.binance_pay_id)
        textToCopy += `\nBinance Pay ID: ${request.bank_details.binance_pay_id}`;
    } else if (
      request.bank_details.payment_method === 'zelle_usd' ||
      request.bank_details.zelle_email
    ) {
      if (request.bank_details.zelle_email)
        textToCopy += `\nZelle Email: ${request.bank_details.zelle_email}`;
      if (request.bank_details.zelle_name)
        textToCopy += `\nTitular Zelle: ${request.bank_details.zelle_name}`;
    } else if (request.bank_details.payment_method === 'pago_movil') {
      if (request.bank_details.bank) textToCopy += `\nBanco: ${request.bank_details.bank}`;
      if (request.bank_details.pago_movil_phone)
        textToCopy += `\nPago Móvil: ${request.bank_details.pago_movil_phone}`;
      if (request.bank_details.pago_movil_ci)
        textToCopy += `\nCédula/RIF: ${request.bank_details.pago_movil_ci}`;
    } else if (
      request.bank_details.payment_method === 'efectivo_usd' ||
      request.bank_details.payment_method === 'efectivo_bs'
    ) {
      if (request.bank_details.cash_receiver)
        textToCopy += `\nPersona que Recibe: ${request.bank_details.cash_receiver}`;
    } else {
      if (request.bank_details.rif) textToCopy += `\nRIF/CI: ${request.bank_details.rif}`;
      if (request.bank_details.bank) textToCopy += `\nBanco: ${request.bank_details.bank}`;
      if (request.bank_details.account_number)
        textToCopy += `\nCuenta: ${request.bank_details.account_number}`;
      if (request.bank_details.pago_movil_phone)
        textToCopy += `\nPago Móvil: ${request.bank_details.pago_movil_phone}`;
    }

    // Agregar Monto a Transferir
    if (request.currency === 'USD' || isDirectUsd) {
      textToCopy += `\nMonto: $${request.amount_usd.toFixed(2)} USD`;
    } else {
      textToCopy += `\nMonto a Transferir: Bs. ${formatBS(request.amount_bs || 0)}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      val
    );

  const category = request.category || 'hospedaje';

  return (
    <div
      className={`bg-white rounded-2xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
        request.status === 'urgente'
          ? 'border-rose-300 ring-1 ring-rose-200/60 bg-rose-50/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Modification Request Alert Banner */}
      {request.modification_requested && (
        <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-300 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                ⚠️ Modificación Solicitada
                {request.modification_requested_by ? ` por ${request.modification_requested_by}` : ''}
              </span>
            </span>
            {request.modification_requested_at && (
              <span className="text-[11px] text-amber-900 font-bold flex items-center gap-1 bg-amber-200/70 px-2 py-0.5 rounded-lg border border-amber-300">
                <Clock className="w-3 h-3 text-amber-800" />
                <span>
                  {new Date(request.modification_requested_at).toLocaleDateString()} • {new Date(request.modification_requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            )}
          </div>
          <div className="bg-white/95 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium">
            <strong className="text-amber-800 font-bold block text-[10px] uppercase">
              Observación / Cambios a Realizar:
            </strong>
            {request.modification_reason || 'Sin observación especificada.'}
          </div>
          {currentUser.role === 'admin' && onEditRequest && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onEditRequest(request)}
                className="active-press flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Aprobar y Modificar Solicitud</span>
              </button>
              {onCancelModification && (
                <button
                  onClick={() => onCancelModification(request)}
                  title="Descartar solicitud de modificación"
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-semibold text-xs border border-amber-200 transition-colors"
                >
                  Descartar
                </button>
              )}
            </div>
          )}
          {currentUser.role === 'solicitante' && onCancelModification && (
            <div className="flex items-center justify-between text-[11px] text-amber-800 pt-0.5">
              <span>El administrador fue notificado para realizar los cambios.</span>
              <button
                onClick={() => onCancelModification(request)}
                className="text-rose-600 hover:text-rose-800 font-bold hover:underline"
              >
                Cancelar Petición
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Request Alert Banner */}
      {request.cancellation_requested && (
        <div className="p-3 bg-rose-50/90 rounded-2xl border border-rose-300 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
              <Ban className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                🚫 Anulación Solicitada
                {request.cancellation_requested_by ? ` por ${request.cancellation_requested_by}` : ''}
              </span>
            </span>
            {request.cancellation_requested_at && (
              <span className="text-[11px] text-rose-900 font-bold flex items-center gap-1 bg-rose-200/70 px-2 py-0.5 rounded-lg border border-rose-300">
                <Clock className="w-3 h-3 text-rose-800" />
                <span>
                  {new Date(request.cancellation_requested_at).toLocaleDateString()} • {new Date(request.cancellation_requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            )}
          </div>
          <div className="bg-white/95 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-950 font-medium">
            <strong className="text-rose-800 font-bold block text-[10px] uppercase">
              Motivo de Anulación:
            </strong>
            {request.cancellation_reason || 'Sin motivo especificado.'}
          </div>
          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onOpenStatusModal(request)}
                className="active-press flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Gestionar y Anular Solicitud</span>
              </button>
              {onCancelCancellation && (
                <button
                  onClick={() => onCancelCancellation(request)}
                  title="Descartar solicitud de anulación"
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-semibold text-xs border border-rose-200 transition-colors"
                >
                  Descartar
                </button>
              )}
            </div>
          )}
          {currentUser.role === 'solicitante' && onCancelCancellation && (
            <div className="flex items-center justify-between text-[11px] text-rose-800 pt-0.5">
              <span>El administrador fue notificado para anular este pago.</span>
              <button
                onClick={() => onCancelCancellation(request)}
                className="text-slate-600 hover:text-slate-900 font-bold hover:underline"
              >
                Cancelar Petición
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Grid Content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Column: LOC, Category, Status, Payment Method Badge, Title, Hotel/Provider, Guest */}
        <div className="space-y-1.5 md:max-w-[50%]">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Locator pill with copy */}
            <button
              onClick={handleCopyLocator}
              title="Copiar Localizador"
              className="font-mono text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1 active-press transition-colors"
            >
              <span>#{request.locator}</span>
              {copiedLoc ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-slate-400" />
              )}
            </button>

            {/* Category Badge */}
            {category === 'traslado' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Car className="w-3 h-3 text-emerald-600" /> Traslado
              </span>
            ) : category === 'vuelos' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                <Plane className="w-3 h-3 text-sky-600" /> Vuelos
              </span>
            ) : category === 'gastos_apoyo' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Receipt className="w-3 h-3 text-purple-600" /> Gastos
              </span>
            ) : category === 'viaticos' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-amber-700" /> Viáticos
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                <Hotel className="w-3 h-3 text-indigo-600" /> Hospedaje
              </span>
            )}

            <StatusBadge status={request.status} size="sm" />

            {/* Payment Method Badge */}
            {request.bank_details.payment_method === 'binance' ||
            request.bank_details.binance_email ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-amber-700" /> Binance Pay
              </span>
            ) : request.bank_details.payment_method === 'pago_movil' ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-300 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-teal-700" /> Pago Móvil
              </span>
            ) : request.bank_details.payment_method === 'zelle_usd' ||
              request.bank_details.zelle_email ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-700" /> Zelle / USD
              </span>
            ) : request.bank_details.payment_method === 'efectivo_usd' ||
              request.bank_details.payment_method === 'efectivo_bs' ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                <Banknote className="w-3 h-3 text-slate-600" /> Efectivo
              </span>
            ) : null}

            <span className="text-xs text-slate-500 font-medium ml-1">
              Cliente: <strong className="text-slate-800 font-bold">{request.client}</strong>
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
            {request.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              {category === 'traslado' ? (
                <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : category === 'vuelos' ? (
                <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              ) : category === 'gastos_apoyo' ? (
                <Receipt className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              ) : category === 'viaticos' ? (
                <Briefcase className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              )}
              {category === 'viaticos'
                ? 'Viáticos'
                : category === 'gastos_apoyo'
                ? request.expense_concept || request.hotel_name || 'Gastos'
                : category === 'vuelos'
                ? request.airline || request.hotel_name || 'Vuelo'
                : request.hotel_name || 'Servicio'}
            </span>
            {category !== 'gastos_apoyo' && request.guest_name && (
              <span className="flex items-center gap-1 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {request.guest_name} {request.guest_ci ? `(${request.guest_ci})` : ''}
                {request.people_count > 1 && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-bold">
                    +{request.people_count - 1} más
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Specific category detail line */}
          {category === 'traslado' && request.route_from_to && (
            <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
              Ruta Traslado: {request.route_from_to}
            </p>
          )}

          {category === 'vuelos' && (request.flight_route || request.airline) && (
            <p className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 inline-block">
              Vuelo: {request.airline ? `${request.airline} • ` : ''} {request.flight_route || request.route_from_to}
            </p>
          )}

          {category === 'gastos_apoyo' && request.expense_concept && (
            <p className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 inline-block">
              Concepto: {request.expense_concept}
            </p>
          )}

          {category === 'viaticos' && request.additionals && (
            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
              Observación: {request.additionals}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
            {request.location && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                {request.location}
              </span>
            )}
            {request.nights_dates && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                {request.nights_dates}
              </span>
            )}
            {request.created_at && (
              <span className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title="Fecha y hora de creación">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Middle Column: Amounts */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-right md:min-w-[200px] shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Monto en USD</span>
            <span className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {formatUSD(request.amount_usd)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {isDirectUsd ? 'Moneda' : 'Monto en Bolívares'}
            </span>

            {isDirectUsd ? (
              <div>
                <span className="text-xs font-black text-indigo-700 block bg-indigo-50 px-2 py-0.5 rounded text-center border border-indigo-100">
                  💵 Pago Directo USD
                </span>
              </div>
            ) : (
              <>
                <span className="text-base sm:text-lg font-black text-[#00b4a2] leading-tight">
                  Bs. {formatBS(request.amount_bs || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Tasa: Bs. {request.bcv_rate}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 md:flex-col md:items-end justify-between md:justify-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => onOpenDetails(request)}
              className="active-press px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 border border-slate-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Ficha</span>
            </button>

            {currentUser.role === 'admin' && onEditRequest && (
              <button
                onClick={() => onEditRequest(request)}
                title="Editar solicitud"
                className="active-press px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 border border-amber-200 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-600" />
                <span>Editar</span>
              </button>
            )}

            {currentUser.role === 'solicitante' && request.status !== 'realizado' && request.status !== 'anulado' && (
              <>
                <button
                  onClick={() => onRequestModification && onRequestModification(request)}
                  title="Pedir modificación al administrador"
                  className={`active-press px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 border transition-colors ${
                    request.modification_requested
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>{request.modification_requested ? 'Modificación Solicitada' : 'Pedir Modificación'}</span>
                </button>

                <button
                  onClick={() => onRequestCancellation && onRequestCancellation(request)}
                  title="Solicitar anulación al administrador"
                  className={`active-press px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 border transition-colors ${
                    request.cancellation_requested
                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>{request.cancellation_requested ? 'Anulación Solicitada' : 'Solicitar Anulación'}</span>
                </button>
              </>
            )}

            {canDelete && onDeleteRequest && (
              <button
                onClick={() => {
                  if (
                    window.confirm(`¿Estás seguro de eliminar la solicitud LOC: #${request.locator}?`)
                  ) {
                    onDeleteRequest(request);
                  }
                }}
                title="Eliminar solicitud (Solo Administradores)"
                className="active-press p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              </button>
            )}

            {currentUser.role === 'admin' && request.status !== 'realizado' && request.status !== 'anulado' && (
              <button
                onClick={() => onOpenStatusModal(request)}
                className="active-press px-3.5 py-1.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
              >
                {request.status === 'en_proceso' && <RefreshCw className="w-3.5 h-3.5" />}
                {request.status === 'urgente' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
                )}
                <span>Gestionar</span>
              </button>
            )}
          </div>

          {/* Quick Bank Details Drawer Button */}
          <button
            onClick={() => setShowBankDetails(!showBankDetails)}
            className="text-[11px] font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 py-0.5 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
          >
            {request.bank_details.payment_method === 'binance' ? (
              <QrCode className="w-3 h-3 text-amber-600" />
            ) : request.bank_details.payment_method === 'pago_movil' ? (
              <Smartphone className="w-3 h-3 text-teal-600" />
            ) : (
              <Landmark className="w-3 h-3 text-[#00b4a2]" />
            )}
            <span>Datos Bancarios</span>
            {showBankDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Bank Details Drawer */}
      {showBankDetails && (
        <div className="p-3 bg-teal-50/70 rounded-xl text-xs space-y-2 text-slate-800 border border-teal-100 animate-fade-in">
          <div className="flex items-center justify-between border-b border-teal-200/60 pb-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
              <span>Destino de Pago</span>
            </span>
            <button
              type="button"
              onClick={handleCopyBankDetails}
              className="active-press flex items-center gap-1 text-[11px] font-bold text-[#00b4a2] hover:text-teal-800 bg-white hover:bg-teal-50 px-2 py-0.5 rounded border border-teal-200 transition-all shadow-2xs"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {request.origin_bank && (
              <p className="bg-emerald-100/60 p-1.5 rounded-lg border border-emerald-300 sm:col-span-2 md:col-span-4">
                <strong className="text-emerald-800 font-bold">Banco de Origen (Emisor):</strong>{' '}
                <span className="font-bold text-emerald-950 uppercase">{request.origin_bank}</span>
              </p>
            )}

            <p>
              <strong className="text-slate-500 font-normal">Beneficiario:</strong>{' '}
              <span className="font-bold text-slate-900 font-mono">
                {request.bank_details.beneficiary}
              </span>
            </p>

            {/* BINANCE */}
            {(request.bank_details.payment_method === 'binance' ||
              request.bank_details.binance_email) && (
              <>
                {request.bank_details.binance_email && (
                  <p className="font-mono text-amber-900 font-bold">
                    <strong className="text-slate-500 font-normal">Binance:</strong>{' '}
                    {request.bank_details.binance_email}
                  </p>
                )}
                {request.bank_details.binance_pay_id && (
                  <p className="font-mono text-amber-900 font-bold">
                    <strong className="text-slate-500 font-normal">Pay ID:</strong>{' '}
                    {request.bank_details.binance_pay_id}
                  </p>
                )}
              </>
            )}

            {/* ZELLE */}
            {(request.bank_details.payment_method === 'zelle_usd' ||
              request.bank_details.zelle_email) && (
              <>
                {request.bank_details.zelle_email && (
                  <p className="font-mono text-emerald-900 font-bold">
                    <strong className="text-slate-500 font-normal">Zelle:</strong>{' '}
                    {request.bank_details.zelle_email}
                  </p>
                )}
                {request.bank_details.zelle_name && (
                  <p className="font-mono text-emerald-900 font-bold">
                    <strong className="text-slate-500 font-normal">Titular:</strong>{' '}
                    {request.bank_details.zelle_name}
                  </p>
                )}
              </>
            )}

            {/* PAGO MÓVIL */}
            {request.bank_details.payment_method === 'pago_movil' && (
              <>
                {request.bank_details.bank && (
                  <p>
                    <strong className="text-slate-500 font-normal">Banco:</strong>{' '}
                    {request.bank_details.bank}
                  </p>
                )}
                {request.bank_details.pago_movil_phone && (
                  <p className="font-mono text-teal-900 font-bold">
                    <strong className="text-slate-500 font-normal">Pago Móvil:</strong>{' '}
                    {request.bank_details.pago_movil_phone}
                  </p>
                )}
                {request.bank_details.pago_movil_ci && (
                  <p className="font-mono text-teal-900 font-bold">
                    <strong className="text-slate-500 font-normal">Cédula:</strong>{' '}
                    {request.bank_details.pago_movil_ci}
                  </p>
                )}
              </>
            )}

            {/* BANK ACCOUNT */}
            {(!request.bank_details.payment_method ||
              request.bank_details.payment_method === 'transferencia_bs') && (
              <>
                {request.bank_details.rif && (
                  <p>
                    <strong className="text-slate-500 font-normal">RIF/CI:</strong>{' '}
                    {request.bank_details.rif}
                  </p>
                )}
                {request.bank_details.bank && (
                  <p>
                    <strong className="text-slate-500 font-normal">Banco:</strong>{' '}
                    {request.bank_details.bank}
                  </p>
                )}
                {request.bank_details.account_number && (
                  <p className="text-[#009b8b] font-bold font-mono select-all">
                    <strong className="text-slate-500 font-normal">Cuenta:</strong>{' '}
                    {request.bank_details.account_number}
                  </p>
                )}
              </>
            )}

            {/* Monto a Transferir */}
            <div className="sm:col-span-2 md:col-span-4 pt-1.5 border-t border-teal-200/80 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-700 font-sans">Monto a Transferir:</span>
              <span className="font-black text-[#009b8b] text-sm">
                {isDirectUsd
                  ? `${formatUSD(request.amount_usd)} (USD / USDT)`
                  : `Bs. ${formatBS(request.amount_bs || 0)}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Bar */}
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
              <FileText className="w-3 h-3 text-[#00b4a2]" />
              <span className="truncate max-w-[160px]">
                {request.support_file_name || 'Soporte Reserva'}
              </span>
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
              <span className="truncate max-w-[160px]">
                {request.receipt_file_name || 'Comprobante de Pago'}
              </span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
