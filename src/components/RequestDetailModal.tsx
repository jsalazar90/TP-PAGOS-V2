import React, { useState } from 'react';
import { PaymentRequest, UserProfile } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Building2,
  User,
  MapPin,
  Calendar,
  Landmark,
  FileText,
  FileCheck,
  ArrowUpRight,
  Copy,
  Check,
  Car,
  Receipt,
  Hotel,
  Plane,
  Briefcase,
  Users,
  AlertTriangle,
  Pencil,
  Edit3,
  Clock
} from 'lucide-react';

interface RequestDetailModalProps {
  request: PaymentRequest | null;
  currentUser?: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onEditRequest?: (request: PaymentRequest) => void;
  onRequestModification?: (request: PaymentRequest) => void;
  onCancelModification?: (request: PaymentRequest) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  currentUser,
  isOpen,
  onClose,
  onEditRequest,
  onRequestModification,
  onCancelModification,
}) => {
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedLoc, setCopiedLoc] = useState(false);

  if (!isOpen || !request) return null;

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      val
    );

  const isDirectUsd = request.currency === 'USD' || request.bcv_rate === 0;
  const category = request.category || 'hospedaje';

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
        textToCopy += `\nTitular: ${request.bank_details.zelle_name}`;
    } else if (request.bank_details.payment_method === 'pago_movil') {
      if (request.bank_details.bank) textToCopy += `\nBanco: ${request.bank_details.bank}`;
      if (request.bank_details.pago_movil_phone)
        textToCopy += `\nPago Móvil: ${request.bank_details.pago_movil_phone}`;
      if (request.bank_details.pago_movil_ci)
        textToCopy += `\nCédula/RIF PM: ${request.bank_details.pago_movil_ci}`;
    } else if (
      request.bank_details.payment_method === 'efectivo_usd' ||
      request.bank_details.payment_method === 'efectivo_bs'
    ) {
      if (request.bank_details.cash_receiver)
        textToCopy += `\nReceptor: ${request.bank_details.cash_receiver}`;
    } else {
      if (request.bank_details.rif) textToCopy += `\nRIF/CI: ${request.bank_details.rif}`;
      if (request.bank_details.bank) textToCopy += `\nBanco: ${request.bank_details.bank}`;
      if (request.bank_details.account_number)
        textToCopy += `\nCuenta: ${request.bank_details.account_number}`;
      if (request.bank_details.pago_movil_phone)
        textToCopy += `\nPago Móvil: ${request.bank_details.pago_movil_phone}`;
    }

    // Agregar Monto a Transferir al texto copiado
    if (request.currency === 'USD' || isDirectUsd) {
      textToCopy += `\nMonto: $${request.amount_usd.toFixed(2)} USD`;
    } else {
      textToCopy += `\nMonto a Transferir: Bs. ${formatBS(request.amount_bs || 0)}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-modal space-y-3.5 max-h-[92vh] flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleCopyLocator}
                className="font-mono text-[#009b8b] font-bold text-xs bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg border border-teal-200 flex items-center gap-1 active-press"
              >
                <span>LOC: #{request.locator}</span>
                {copiedLoc ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-teal-600" />
                )}
              </button>

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
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg mt-1.5 leading-snug">
              {request.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modification Request Alert Banner */}
        {request.modification_requested && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-2 animate-pulse-subtle">
            <div className="flex items-center justify-between">
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
            <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium">
              <strong className="text-amber-800 font-bold block text-[10px] uppercase">
                Observación / Cambios Solicitados:
              </strong>
              {request.modification_reason || 'Sin observación especificada.'}
            </div>
            {currentUser?.role === 'admin' && onEditRequest && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onEditRequest(request);
                  }}
                  className="active-press flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Aprobar y Modificar Solicitud</span>
                </button>
                {onCancelModification && (
                  <button
                    onClick={() => onCancelModification(request)}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Descartar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-3 text-xs text-slate-600 pr-1">
          {/* General Client & Service */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Cliente / Cuenta:</span>
              <span className="font-bold text-slate-900">{request.client}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">
                {category === 'traslado'
                  ? 'Empresa Traslado:'
                  : category === 'vuelos'
                  ? 'Aerolínea:'
                  : category === 'gastos_apoyo'
                  ? 'Concepto:'
                  : category === 'viaticos'
                  ? 'Servicio:'
                  : 'Hotel / Hospedaje:'}
              </span>
              <span className="font-bold text-[#009b8b] flex items-center gap-1">
                {category === 'traslado' ? (
                  <>
                    <Car className="w-3.5 h-3.5 text-emerald-600" />
                    {request.hotel_name || 'Sin especificar'}
                  </>
                ) : category === 'vuelos' ? (
                  <>
                    <Plane className="w-3.5 h-3.5 text-sky-600" />
                    {request.airline || request.hotel_name || 'Sin especificar'}
                  </>
                ) : category === 'gastos_apoyo' ? (
                  <>
                    <Receipt className="w-3.5 h-3.5 text-purple-600" />
                    {request.expense_concept || request.hotel_name || 'Sin especificar'}
                  </>
                ) : category === 'viaticos' ? (
                  <>
                    <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                    Viáticos
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    {request.hotel_name}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Solicitado Por:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#00b4a2]" />
                {request.creator_name || 'Usuario'}
              </span>
            </div>
            {request.created_at && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-500 font-medium">Fecha y Hora de Creación:</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Details, Routes & Passengers */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-[#00b4a2]" />
              <span>
                {category === 'traslado'
                  ? 'Datos del Traslado y Pasajeros'
                  : category === 'vuelos'
                  ? 'Datos del Vuelo y Pasajeros'
                  : category === 'gastos_apoyo'
                  ? 'Datos del Apoyo para Gastos'
                  : category === 'viaticos'
                  ? 'Datos de la Solicitud de Viáticos'
                  : 'Datos del Hospedaje y Huéspedes'}
              </span>
            </h4>

            {category === 'traslado' && request.route_from_to && (
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Ruta Traslado: {request.route_from_to}</span>
              </div>
            )}

            {category === 'vuelos' && (request.flight_route || request.route_from_to) && (
              <div className="p-2 bg-sky-50 rounded-xl border border-sky-200 text-xs font-semibold text-sky-900 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Ruta Aérea: {request.airline ? `${request.airline} • ` : ''} {request.flight_route || request.route_from_to}</span>
              </div>
            )}

            {category === 'gastos_apoyo' && request.expense_concept && (
              <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Concepto: {request.expense_concept}</span>
              </div>
            )}

            {category !== 'gastos_apoyo' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">
                    {category === 'viaticos'
                      ? 'Usuario Responsable'
                      : category === 'traslado' || category === 'vuelos'
                      ? 'Pasajero Principal'
                      : 'Huésped Principal'}
                  </span>
                  <span className="font-bold text-slate-900">{request.guest_name || 'Sin especificar'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">
                    Cédula / RIF / Pasaporte
                  </span>
                  <span className="font-bold text-slate-900">{request.guest_ci || 'N/A'}</span>
                </div>
                {request.location && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">Ubicación</span>
                    <span className="font-medium text-slate-800 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" /> {request.location}
                    </span>
                  </div>
                )}
                {request.nights_dates && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">
                      Fechas / Noches
                    </span>
                    <span className="font-medium text-slate-800 flex items-center gap-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" /> {request.nights_dates}
                    </span>
                  </div>
                )}
                {request.room_type && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">
                      {category === 'traslado'
                        ? 'Tipo Vehículo'
                        : category === 'vuelos'
                        ? 'Clase'
                        : 'Tipo Habitación'}
                    </span>
                    <span className="font-medium text-slate-800">{request.room_type}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">
                    Cant. Personas
                  </span>
                  <span className="font-medium text-slate-800">
                    {request.people_count} persona(s)
                  </span>
                </div>
              </div>
            )}

            {/* Multiple Guest List breakdown if present */}
            {category !== 'gastos_apoyo' && request.guest_list && request.guest_list.length > 1 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lista Completa de Acompañantes ({request.guest_list.length}):
                </span>
                <div className="space-y-1">
                  {request.guest_list.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-medium text-slate-800">
                        {idx + 1}. {g.name}
                      </span>
                      <span className="font-mono text-slate-500 font-bold">{g.ci}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {request.additionals && (
              <div className="pt-2 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-semibold">Observaciones / Adicionales: </span>
                <span className="text-slate-800 font-medium">{request.additionals}</span>
              </div>
            )}
          </div>

          {/* Amount Breakdown Box */}
          <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-200/80 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Monto Divisas
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600">
                {formatUSD(request.amount_usd)}
              </span>
            </div>
            <div className="text-right border-l border-teal-200 pl-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {isDirectUsd ? 'Moneda de Pago' : 'Monto en Bolívares'}
              </span>
              {isDirectUsd ? (
                <div>
                  <span className="text-xs font-black text-indigo-700 block mt-0.5 bg-indigo-50 px-2 py-0.5 rounded text-center border border-indigo-200">
                    💵 Pago Directo USD
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-base sm:text-lg font-black text-[#009b8b]">
                    Bs. {formatBS(request.amount_bs || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Tasa BCV: Bs. {request.bcv_rate}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Bank Destination Details */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
                <span>Datos Destino de Pago</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyBankDetails}
                className="active-press flex items-center gap-1 text-[11px] font-bold text-[#00b4a2] hover:text-teal-800 bg-white hover:bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-all shadow-2xs"
              >
                {copiedBank ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3 text-[#00b4a2]" />
                    <span>Copiar Datos</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-xs space-y-1">
              {request.origin_bank && (
                <p className="bg-emerald-50 text-emerald-950 px-2 py-1 rounded-md border border-emerald-200 font-semibold mb-1">
                  <strong className="text-emerald-800 font-bold">Banco de Origen (Emisor):</strong>{' '}
                  <span className="font-bold uppercase text-emerald-900">{request.origin_bank}</span>
                </p>
              )}

              <p>
                <strong className="text-slate-500 font-normal">Beneficiario:</strong>{' '}
                <span className="font-bold text-slate-900 font-mono">
                  {request.bank_details.beneficiary}
                </span>
              </p>

              {/* BINANCE DETAILS */}
              {(request.bank_details.payment_method === 'binance' ||
                request.bank_details.binance_email) && (
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 space-y-1 font-mono">
                  {request.bank_details.binance_email && (
                    <p className="text-amber-900 font-bold">
                      <strong className="text-amber-700 font-normal font-sans">Correo Binance:</strong>{' '}
                      {request.bank_details.binance_email}
                    </p>
                  )}
                  {request.bank_details.binance_pay_id && (
                    <p className="text-amber-900 font-bold">
                      <strong className="text-amber-700 font-normal font-sans">Binance Pay ID:</strong>{' '}
                      {request.bank_details.binance_pay_id}
                    </p>
                  )}
                  <p className="text-amber-950 font-black pt-1 border-t border-amber-200 text-xs">
                    <strong className="text-amber-800 font-sans font-bold">Monto a Transferir:</strong>{' '}
                    {formatUSD(request.amount_usd)} USDT
                  </p>
                </div>
              )}

              {/* ZELLE DETAILS */}
              {(request.bank_details.payment_method === 'zelle_usd' ||
                request.bank_details.zelle_email) && (
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 space-y-1 font-mono">
                  {request.bank_details.zelle_email && (
                    <p className="text-emerald-900 font-bold">
                      <strong className="text-emerald-700 font-normal font-sans">Email Zelle:</strong>{' '}
                      {request.bank_details.zelle_email}
                    </p>
                  )}
                  {request.bank_details.zelle_name && (
                    <p className="text-emerald-900 font-bold">
                      <strong className="text-emerald-700 font-normal font-sans">Titular:</strong>{' '}
                      {request.bank_details.zelle_name}
                    </p>
                  )}
                  <p className="text-emerald-950 font-black pt-1 border-t border-emerald-200 text-xs">
                    <strong className="text-emerald-800 font-sans font-bold">Monto a Transferir:</strong>{' '}
                    {formatUSD(request.amount_usd)} USD
                  </p>
                </div>
              )}

              {/* PAGO MÓVIL DETAILS */}
              {request.bank_details.payment_method === 'pago_movil' && (
                <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200 space-y-1 font-mono">
                  {request.bank_details.bank && (
                    <p className="text-teal-900 font-bold">
                      <strong className="text-teal-700 font-normal font-sans">Banco:</strong>{' '}
                      {request.bank_details.bank}
                    </p>
                  )}
                  {request.bank_details.pago_movil_phone && (
                    <p className="text-teal-900 font-bold">
                      <strong className="text-teal-700 font-normal font-sans">Pago Móvil:</strong>{' '}
                      {request.bank_details.pago_movil_phone}
                    </p>
                  )}
                  {request.bank_details.pago_movil_ci && (
                    <p className="text-teal-900 font-bold">
                      <strong className="text-teal-700 font-normal font-sans">Cédula:</strong>{' '}
                      {request.bank_details.pago_movil_ci}
                    </p>
                  )}
                  <p className="text-[#009b8b] font-black pt-1 border-t border-teal-200 text-xs">
                    <strong className="text-teal-800 font-sans font-bold">Monto a Transferir:</strong>{' '}
                    Bs. {formatBS(request.amount_bs || 0)}
                  </p>
                </div>
              )}

              {/* STANDARD BANK ACCOUNT DETAILS */}
              {(!request.bank_details.payment_method ||
                request.bank_details.payment_method === 'transferencia_bs') && (
                <div className="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200 space-y-1 font-mono">
                  {request.bank_details.rif && (
                    <p>
                      <strong className="text-slate-500 font-normal font-sans">RIF / CI:</strong>{' '}
                      {request.bank_details.rif}
                    </p>
                  )}
                  {request.bank_details.bank && (
                    <p>
                      <strong className="text-slate-500 font-normal font-sans">Banco:</strong>{' '}
                      {request.bank_details.bank}
                    </p>
                  )}
                  {request.bank_details.account_number && (
                    <p className="font-mono text-[#009b8b] font-bold select-all">
                      <strong className="text-slate-500 font-normal font-sans">N° Cuenta:</strong>{' '}
                      {request.bank_details.account_number}
                    </p>
                  )}
                  {request.bank_details.pago_movil_phone && (
                    <p className="font-mono text-slate-800 pt-0.5">
                      <strong className="text-slate-500 font-normal font-sans">Pago Móvil:</strong>{' '}
                      {request.bank_details.pago_movil_phone}
                      {request.bank_details.pago_movil_ci && (
                        <span className="text-slate-500">
                          {' '}
                          | C.I.: {request.bank_details.pago_movil_ci}
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-[#009b8b] font-black pt-1 border-t border-slate-200 text-xs">
                    <strong className="text-slate-700 font-sans font-bold">Monto a Transferir:</strong>{' '}
                    Bs. {formatBS(request.amount_bs || 0)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-1.5 pt-1">
            {request.support_file_url && (
              <a
                href={request.support_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[#00b4a2] shrink-0" />
                  <span className="truncate font-semibold">
                    {request.support_file_name || 'Soporte de Reserva'}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </a>
            )}

            {request.receipt_file_url && (
              <a
                href={request.receipt_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate font-bold">
                    {request.receipt_file_name || 'Comprobante de Pago'}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </a>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>

          {currentUser?.role === 'admin' && request.status !== 'realizado' && onEditRequest && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditRequest(request);
              }}
              className="active-press px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Modificar Solicitud</span>
            </button>
          )}

          {currentUser?.role === 'solicitante' && request.status !== 'realizado' && onRequestModification && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestModification(request);
              }}
              className={`active-press px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border shadow-2xs transition-colors ${
                request.modification_requested
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{request.modification_requested ? 'Ver Modificación Pedida' : 'Pedir Modificación al Administrador'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
