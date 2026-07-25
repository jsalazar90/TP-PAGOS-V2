import React, { useState } from 'react';
import { PaymentRequest } from '../types';
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
  QrCode,
  Smartphone,
  DollarSign,
  Car,
  Receipt,
  Hotel
} from 'lucide-react';

interface RequestDetailModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const [copiedBank, setCopiedBank] = useState(false);

  if (!isOpen || !request) return null;

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const isDirectUsd = request.currency === 'USD' || request.bcv_rate === 0;
  const category = request.category || 'hospedaje';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-4 shadow-modal space-y-3 max-h-[90vh] flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-indigo-700 font-bold text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                LOC: #{request.locator}
              </span>

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
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1">{request.title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-2.5 text-xs text-slate-600 pr-1">
          {/* Cliente & Entidad */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cliente / Empresa:</span>
              <span className="font-bold text-slate-800">{request.client}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                {category === 'traslado' ? 'Proveedor Traslado:' : category === 'gastos_apoyo' ? 'Entidad / Referencia:' : 'Hotel:'}
              </span>
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                {category === 'traslado' ? <Car className="w-3.5 h-3.5" /> : category === 'gastos_apoyo' ? <Receipt className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                {request.hotel_name}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-500">Solicitado Por:</span>
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                {request.creator_name || 'Usuario'}
              </span>
            </div>
          </div>

          {/* Details & Passengers */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-800 flex items-center gap-1 border-b border-slate-200 pb-1 text-xs">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              {category === 'traslado' ? 'Datos de Pasajeros' : category === 'gastos_apoyo' ? 'Datos de Beneficiario' : 'Datos del Huésped'}
            </h4>

            {request.route_from_to && (
              <div className="p-1.5 bg-blue-50/80 rounded-lg border border-blue-100 text-[11px] font-semibold text-blue-900">
                📍 Ruta: {request.route_from_to}
              </div>
            )}

            {request.expense_concept && (
              <div className="p-1.5 bg-purple-50/80 rounded-lg border border-purple-100 text-[11px] font-semibold text-purple-900">
                📝 Concepto: {request.expense_concept}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Nombre Completo</span>
                <span className="font-medium text-slate-800">{request.guest_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cédula (C.I.)</span>
                <span className="font-medium text-slate-800">{request.guest_ci}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ubicación</span>
                <span className="font-medium text-slate-800 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" /> {request.location}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Fecha del Servicio</span>
                <span className="font-medium text-slate-800 flex items-center gap-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" /> {request.nights_dates}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {category === 'traslado' ? 'Vehículo' : category === 'gastos_apoyo' ? 'Categoría' : 'Tipo Habitación'}
                </span>
                <span className="font-medium text-slate-800">{request.room_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cant. Personas</span>
                <span className="font-medium text-slate-800">{request.people_count} persona(s)</span>
              </div>
            </div>

            {request.additionals && (
              <div className="pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-400">Observaciones: </span>
                <span className="text-slate-800 font-medium">{request.additionals}</span>
              </div>
            )}
          </div>

          {/* Amount Breakdown */}
          <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Monto Divisas
              </span>
              <span className="text-base font-extrabold text-emerald-600">
                {formatUSD(request.amount_usd)}
              </span>
            </div>
            <div className="text-right border-l border-indigo-200 pl-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                {isDirectUsd ? 'Método Moneda' : 'Moneda Local (BS)'}
              </span>
              {isDirectUsd ? (
                <div>
                  <span className="text-xs font-extrabold text-indigo-700 block mt-1 bg-indigo-100/80 px-2 py-0.5 rounded text-center">
                    💵 Pago en Divisa
                  </span>
                  <span className="text-[9px] text-slate-400 block text-center">Sin Tasa BCV</span>
                </div>
              ) : (
                <>
                  <span className="text-base font-extrabold text-indigo-700">
                    BS {formatBS(request.amount_bs || (request.amount_usd && request.bcv_rate ? request.amount_usd * request.bcv_rate : 0))}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Tasa: BS {request.bcv_rate}</span>
                </>
              )}
            </div>
          </div>

          {/* Bank / Destinatario Details */}
          <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                {request.bank_details.payment_method === 'binance' || request.bank_details.binance_email ? (
                  <QrCode className="w-3.5 h-3.5 text-amber-500" />
                ) : request.bank_details.payment_method === 'pago_movil' ? (
                  <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                ) : request.bank_details.payment_method === 'zelle_usd' ? (
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
                )}
                <span>Datos Destino de Pago</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyBankDetails}
                className="active-press flex items-center gap-1 text-[11px] font-bold text-[#00b4a2] hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200/80 transition-all shadow-2xs"
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
              <p><strong className="text-slate-500 font-normal">Beneficiario:</strong> <span className="font-bold text-slate-900">{request.bank_details.beneficiary}</span></p>

              {/* BINANCE DETAILS */}
              {(request.bank_details.payment_method === 'binance' || request.bank_details.binance_email) && (
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 space-y-0.5">
                  {request.bank_details.binance_email && (
                    <p className="font-mono text-amber-900 font-bold">
                      <strong className="text-amber-700 font-sans font-medium">Correo Binance:</strong> {request.bank_details.binance_email}
                    </p>
                  )}
                  {request.bank_details.binance_pay_id && (
                    <p className="font-mono text-amber-900 font-bold">
                      <strong className="text-amber-700 font-sans font-medium">Binance Pay ID:</strong> {request.bank_details.binance_pay_id}
                    </p>
                  )}
                </div>
              )}

              {/* ZELLE DETAILS */}
              {(request.bank_details.payment_method === 'zelle_usd' || request.bank_details.zelle_email) && (
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 space-y-0.5">
                  {request.bank_details.zelle_email && (
                    <p className="font-mono text-emerald-900 font-bold">
                      <strong className="text-emerald-700 font-sans font-medium">Email Zelle:</strong> {request.bank_details.zelle_email}
                    </p>
                  )}
                  {request.bank_details.account_number && (
                    <p className="font-mono text-emerald-900 font-bold">
                      <strong className="text-emerald-700 font-sans font-medium">Banco/Cuenta USD:</strong> {request.bank_details.account_number}
                    </p>
                  )}
                </div>
              )}

              {/* PAGO MÓVIL DETAILS */}
              {request.bank_details.payment_method === 'pago_movil' && (
                <div className="bg-teal-50 p-2 rounded-lg border border-teal-200 space-y-0.5 font-mono">
                  {request.bank_details.bank && (
                    <p className="text-teal-900 font-bold">
                      <strong className="text-teal-700 font-sans font-medium">Banco:</strong> {request.bank_details.bank}
                    </p>
                  )}
                  {request.bank_details.pago_movil_phone && (
                    <p className="text-teal-900 font-bold">
                      <strong className="text-teal-700 font-sans font-medium">Pago Móvil:</strong> {request.bank_details.pago_movil_phone}
                    </p>
                  )}
                  {request.bank_details.pago_movil_ci && (
                    <p className="text-teal-900 font-bold">
                      <strong className="text-teal-700 font-sans font-medium">Cédula/RIF PM:</strong> {request.bank_details.pago_movil_ci}
                    </p>
                  )}
                </div>
              )}

              {/* STANDARD BANK ACCOUNT DETAILS */}
              {(!request.bank_details.payment_method || request.bank_details.payment_method === 'transferencia_bs') && (
                <>
                  {request.bank_details.rif && <p><strong className="text-slate-500 font-normal">RIF / CI:</strong> {request.bank_details.rif}</p>}
                  {request.bank_details.bank && <p><strong className="text-slate-500 font-normal">Banco:</strong> {request.bank_details.bank}</p>}
                  {request.bank_details.account_number && (
                    <p className="font-mono text-[#00b4a2] font-bold select-all"><strong className="text-slate-500 font-sans font-normal">N° Cuenta:</strong> {request.bank_details.account_number}</p>
                  )}
                  {request.bank_details.pago_movil_phone && (
                    <p className="font-mono text-slate-800 pt-0.5">
                      <strong className="text-slate-500 font-sans font-normal">Pago Móvil:</strong> {request.bank_details.pago_movil_phone}
                      {request.bank_details.pago_movil_ci && <span className="text-slate-500 font-sans"> | C.I.: {request.bank_details.pago_movil_ci}</span>}
                    </p>
                  )}
                </>
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
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{request.support_file_name || 'Soporte Solicitud'}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </a>
            )}

            {request.receipt_file_url && (
              <a
                href={request.receipt_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-medium">{request.receipt_file_name || 'Comprobante de Pago'}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
