import React, { useState, useRef } from 'react';
import { PaymentRequest, UserProfile } from '../types';
import { StatusBadge } from './StatusBadge';
import { FilePreviewModal } from './FilePreviewModal';
import { getRequestReceiptFiles, getRequestSupportFiles } from '../services/dataService';
import {
  X,
  Building2,
  User,
  MapPin,
  Calendar,
  Landmark,
  FileText,
  FileCheck,
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
  Clock,
  CheckCircle2,
  Eye,
  Ban,
  Plus,
  RotateCcw
} from 'lucide-react';

interface RequestDetailModalProps {
  request: PaymentRequest | null;
  currentUser?: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onEditRequest?: (request: PaymentRequest) => void;
  onRequestModification?: (request: PaymentRequest) => void;
  onCancelModification?: (request: PaymentRequest) => void;
  onRequestCancellation?: (request: PaymentRequest) => void;
  onCancelCancellation?: (request: PaymentRequest) => void;
  onRestoreRequest?: (request: PaymentRequest) => void;
  onUpdateSupportFile?: (requestId: string, file: File) => Promise<void>;
  onUpdateReceiptFile?: (requestId: string, file: File) => Promise<void>;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  currentUser,
  isOpen,
  onClose,
  onEditRequest,
  onRequestModification,
  onCancelModification,
  onRequestCancellation,
  onCancelCancellation,
  onRestoreRequest,
  onUpdateSupportFile,
  onUpdateReceiptFile,
}) => {
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedLoc, setCopiedLoc] = useState(false);
  const [isUpdatingFile, setIsUpdatingFile] = useState(false);

  // Preview Modal State
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    file: File | null;
    fileUrl: string | null;
    fileName: string;
    title: string;
    subtitle?: string;
    mode: 'confirm' | 'view';
    targetType: 'support' | 'receipt';
  }>({
    isOpen: false,
    file: null,
    fileUrl: null,
    fileName: '',
    title: '',
    mode: 'view',
    targetType: 'support'
  });

  const supportInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !request) return null;

  const handleSelectNewSupportFile = (file: File | null) => {
    if (!file) return;
    setPreviewState({
      isOpen: true,
      file,
      fileUrl: null,
      fileName: file.name,
      title: 'Verificar Nuevo Soporte antes de Cargar',
      subtitle: 'Revisa que la imagen o documento del soporte sea el correcto antes de reemplazar el actual.',
      mode: 'confirm',
      targetType: 'support'
    });
  };

  const handleSelectNewReceiptFile = (file: File | null) => {
    if (!file) return;
    setPreviewState({
      isOpen: true,
      file,
      fileUrl: null,
      fileName: file.name,
      title: 'Verificar Nuevo Comprobante antes de Cargar',
      subtitle: 'Revisa que los datos y referencia de pago sean correctos antes de confirmar.',
      mode: 'confirm',
      targetType: 'receipt'
    });
  };

  const handleConfirmUpload = async () => {
    if (!previewState.file || !request) return;
    try {
      setIsUpdatingFile(true);
      if (previewState.targetType === 'support' && onUpdateSupportFile) {
        await onUpdateSupportFile(request.id, previewState.file);
      } else if (previewState.targetType === 'receipt' && onUpdateReceiptFile) {
        await onUpdateReceiptFile(request.id, previewState.file);
      }
      setPreviewState(prev => ({ ...prev, isOpen: false, file: null }));
    } catch (e) {
      console.error('Error al actualizar archivo:', e);
    } finally {
      setIsUpdatingFile(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewState(prev => ({ ...prev, isOpen: false, file: null }));
    if (supportInputRef.current) supportInputRef.current.value = '';
    if (receiptInputRef.current) receiptInputRef.current.value = '';
  };

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      val
    );

  const isDirectUsd = request.currency === 'USD';
  const displayUsd =
    request.amount_usd > 0
      ? request.amount_usd
      : request.amount_bs > 0 && request.bcv_rate && request.bcv_rate > 0
      ? Number((request.amount_bs / request.bcv_rate).toFixed(2))
      : 0;
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
      textToCopy += `\nMonto: $${displayUsd.toFixed(2)} USD`;
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
            {currentUser?.role === 'solicitante' && onCancelModification && (
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
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-300 space-y-2 animate-pulse-subtle">
            <div className="flex items-center justify-between">
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
            <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-950 font-medium">
              <strong className="text-rose-800 font-bold block text-[10px] uppercase">
                Motivo de Anulación:
              </strong>
              {request.cancellation_reason || 'Sin motivo especificado.'}
            </div>
            {currentUser?.role === 'solicitante' && onCancelCancellation && (
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

        {/* Anulado Status Banner */}
        {request.status === 'anulado' && (
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>🚫 Esta solicitud se encuentra ANULADA</span>
              </span>
              <span className="text-[10px] font-bold text-rose-800 bg-rose-200/70 px-2 py-0.5 rounded-lg border border-rose-300">
                Historial (Saldo $0)
              </span>
            </div>
            {request.cancellation_reason && (
              <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-950 font-medium">
                <strong className="text-rose-800 font-bold block text-[10px] uppercase">
                  Motivo de Anulación Registrado:
                </strong>
                {request.cancellation_reason}
              </div>
            )}
            {onRestoreRequest && (
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-rose-200/80">
                <span className="text-[11px] text-rose-800 font-medium">
                  ¿Deseas reactivar esta solicitud y regresarla a la Bandeja de Entrada?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRestoreRequest(request);
                  }}
                  className="active-press px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Solicitud</span>
                </button>
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
            {request.status === 'realizado' && (request.paid_at || request.receipt_files?.[0]?.uploaded_at) && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Fecha de Liquidación:
                </span>
                <span className="font-semibold text-emerald-700">
                  {new Date(request.paid_at || request.receipt_files?.[0]?.uploaded_at || request.created_at).toLocaleDateString()}{' '}
                  {new Date(request.paid_at || request.receipt_files?.[0]?.uploaded_at || request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Last Modification Audit Info */}
            {request.last_modified_by_name && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-amber-600" />
                  Última Modificación por:
                </span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span>{request.last_modified_by_name}</span>
                  {request.last_modified_at && (
                    <span className="text-slate-400 font-normal text-[10px]">
                      ({new Date(request.last_modified_at).toLocaleDateString()} {new Date(request.last_modified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Restored Request Audit Info */}
            {request.restored_by_name && (
              <div className="pt-1.5 border-t border-slate-200/60">
                <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 flex items-center gap-1.5 text-[11px]">
                      <RotateCcw className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Restaurada por: <strong className="text-sky-950">{request.restored_by_name}</strong></span>
                    </span>
                    {request.restored_at && (
                      <span className="text-[10px] text-sky-700 font-semibold">
                        {new Date(request.restored_at).toLocaleDateString()} {new Date(request.restored_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {request.restored_reason && (
                    <div className="text-[11px] text-sky-800 bg-white/90 p-2 rounded-lg border border-sky-100 mt-1">
                      <strong className="text-sky-900 block text-[10px] uppercase">Motivo de Restauración:</strong>
                      <span className="italic">{request.restored_reason}</span>
                    </div>
                  )}
                </div>
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
                {request.room_type && category !== 'viaticos' && (category === 'hospedaje' || !request.room_type.toUpperCase().includes('HABITACION')) && (
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
                {formatUSD(displayUsd)}
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

          {/* Attachments & Files Section */}
          <div className="space-y-3 pt-1 border-t border-slate-200/80">
            {/* Hidden Inputs for File Updating */}
            <input
              ref={supportInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => {
                handleSelectNewSupportFile(e.target.files?.[0] || null);
                e.target.value = '';
              }}
              className="hidden"
            />
            <input
              ref={receiptInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => {
                handleSelectNewReceiptFile(e.target.files?.[0] || null);
                e.target.value = '';
              }}
              className="hidden"
            />

            {/* Support Files Section */}
            {(() => {
              const supportFiles = getRequestSupportFiles(request);
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileText className="w-3.5 h-3.5 text-[#00b4a2]" />
                      <span>Soportes / Facturas de Reserva ({supportFiles.length})</span>
                    </h4>
                    {(currentUser?.role === 'admin' || currentUser?.id === request.created_by) && (
                      <button
                        type="button"
                        onClick={() => supportInputRef.current?.click()}
                        className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-[#009b8b] rounded-lg font-bold text-[10px] border border-teal-200 flex items-center gap-1 active-press"
                      >
                        <Plus className="w-3 h-3 text-[#00b4a2]" />
                        <span>{supportFiles.length > 0 ? 'Agregar Soporte' : 'Adjuntar'}</span>
                      </button>
                    )}
                  </div>

                  {supportFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {supportFiles.map((sf, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                        >
                          <div
                            className="flex items-center gap-2.5 truncate min-w-0 cursor-pointer flex-1"
                            onClick={() =>
                              setPreviewState({
                                isOpen: true,
                                file: null,
                                fileUrl: sf.url || null,
                                fileName: sf.fileName || `Soporte ${idx + 1}`,
                                title: `Soporte #${idx + 1} de Reserva`,
                                mode: 'view',
                                targetType: 'support'
                              })
                            }
                          >
                            <div className="w-8 h-8 rounded-lg bg-teal-100/80 text-[#009b8b] flex items-center justify-center shrink-0">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                {supportFiles.length > 1 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                                    #{idx + 1}
                                  </span>
                                )}
                                <span className="truncate font-bold text-xs text-slate-800 block">
                                  {sf.fileName || `Soporte ${idx + 1}`}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">Soporte adjunto a la solicitud</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewState({
                                  isOpen: true,
                                  file: null,
                                  fileUrl: sf.url || null,
                                  fileName: sf.fileName || `Soporte ${idx + 1}`,
                                  title: `Soporte #${idx + 1} de Reserva`,
                                  mode: 'view',
                                  targetType: 'support'
                                })
                              }
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 text-[11px] font-bold active-press shadow-2xs"
                              title="Ver vista previa completa"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#00b4a2]" />
                              <span>Ver</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">No se adjuntó soporte al crear la solicitud</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Receipt Files Section (Liquidación / Pagos Realizados) */}
            {(() => {
              const receiptFiles = getRequestReceiptFiles(request);
              if (receiptFiles.length === 0 && request.status !== 'realizado') return null;

              return (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Comprobantes de Pago / Liquidación ({receiptFiles.length})</span>
                    </h4>
                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => receiptInputRef.current?.click()}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px] border border-emerald-200 flex items-center gap-1 active-press"
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        <span>{receiptFiles.length > 0 ? 'Agregar Comprobante' : 'Adjuntar'}</span>
                      </button>
                    )}
                  </div>

                  {receiptFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {receiptFiles.map((rf, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200 transition-colors shadow-2xs"
                        >
                          <div
                            className="flex items-center gap-2.5 truncate min-w-0 cursor-pointer flex-1"
                            onClick={() =>
                              setPreviewState({
                                isOpen: true,
                                file: null,
                                fileUrl: rf.url || null,
                                fileName: rf.fileName || `Comprobante ${idx + 1}`,
                                title: `Comprobante de Pago #${idx + 1}`,
                                mode: 'view',
                                targetType: 'receipt'
                              })
                            }
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                                  #{idx + 1}
                                </span>
                                <span className="truncate font-bold text-xs text-emerald-950 block">
                                  {rf.fileName || `Comprobante ${idx + 1}`}
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-700 font-medium">Comprobante de liquidación bancaria</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewState({
                                  isOpen: true,
                                  file: null,
                                  fileUrl: rf.url || null,
                                  fileName: rf.fileName || `Comprobante ${idx + 1}`,
                                  title: `Comprobante de Pago #${idx + 1}`,
                                  mode: 'view',
                                  targetType: 'receipt'
                                })
                              }
                              className="p-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1 text-[11px] font-bold active-press shadow-2xs"
                              title="Ver comprobante"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ver</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">No se ha adjuntado comprobante de liquidación</span>
                    </div>
                  )}
                </div>
              );
            })()}
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

          {request.status === 'anulado' && onRestoreRequest && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRestoreRequest(request);
              }}
              className="active-press px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Solicitud</span>
            </button>
          )}

          {currentUser?.role === 'admin' && request.status !== 'realizado' && request.status !== 'anulado' && onEditRequest && (
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

          {currentUser?.role !== 'admin' && request.status !== 'realizado' && request.status !== 'anulado' && onRequestModification && (
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
              <span>{request.modification_requested ? 'Ver Modificación Pedida' : 'Pedir Modificación'}</span>
            </button>
          )}

          {currentUser?.role !== 'admin' && request.status !== 'realizado' && request.status !== 'anulado' && onRequestCancellation && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestCancellation(request);
              }}
              className={`active-press px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border shadow-2xs transition-colors ${
                request.cancellation_requested
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                  : 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{request.cancellation_requested ? 'Ver Anulación Pedida' : 'Solicitar Anulación'}</span>
            </button>
          )}
        </div>

        {/* Reusable File Preview Modal */}
        <FilePreviewModal
          isOpen={previewState.isOpen}
          file={previewState.file}
          fileUrl={previewState.fileUrl}
          fileName={previewState.fileName}
          title={previewState.title}
          subtitle={previewState.subtitle}
          mode={previewState.mode}
          confirmText={
            previewState.targetType === 'support' ? 'Cargar Soporte' : 'Cargar Comprobante'
          }
          cancelText={previewState.mode === 'confirm' ? 'Cancelar' : 'Cerrar'}
          isLoading={isUpdatingFile}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelPreview}
          onModify={
            previewState.targetType === 'support'
              ? () => supportInputRef.current?.click()
              : () => receiptInputRef.current?.click()
          }
        />
      </div>
    </div>
  );
};
