import React, { useState, useEffect } from 'react';
import { PaymentRequest } from '../types';
import { RotateCcw, AlertCircle, X, CheckCircle2, ArrowRight } from 'lucide-react';

interface RestoreRequestModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (request: PaymentRequest, reason: string) => Promise<void>;
}

export const RestoreRequestModal: React.FC<RestoreRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg('');
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('⚠️ Por favor indica el motivo por el cual se estará restaurando esta solicitud.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await onConfirm(request, reason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restaurar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-50 rounded-2xl border border-sky-200 text-sky-700">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Restaurar Solicitud Anulada
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                LOC: <strong className="font-mono text-slate-700">#{request.locator}</strong> • {request.client}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="mt-4 p-3 bg-sky-50/80 rounded-2xl border border-sky-200 text-xs text-sky-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-800">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Retorno a Bandeja de Entrada</span>
          </div>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            Esta solicitud se restablecerá al estado <strong>En Proceso</strong> y volverá a estar disponible en el módulo <strong>Bandeja de Entrada</strong> con sus montos y gestión activos.
          </p>
        </div>

        {/* Request Summary */}
        <div className="my-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Concepto / Detalle:</span>
            <span className="font-bold text-slate-800 truncate max-w-[240px]">
              {request.guest_name || request.expense_concept || request.hotel_name || request.title}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Monto Original:</span>
            <span className="font-black text-[#009b8b]">
              ${request.amount_usd} USD
              {request.amount_bs > 0 && ` (Bs. ${request.amount_bs})`}
            </span>
          </div>
          {request.bank_details?.beneficiary && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Beneficiario:</span>
              <span className="font-medium text-slate-700 truncate max-w-[240px]">{request.bank_details.beneficiary}</span>
            </div>
          )}
          {request.cancellation_reason && (
            <div className="pt-1 mt-1 border-t border-slate-200/70 text-[11px]">
              <span className="text-slate-400 font-medium block">Motivo anterior de anulación:</span>
              <span className="text-slate-600 italic">"{request.cancellation_reason}"</span>
            </div>
          )}
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Motivo de la Restauración <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Indica el motivo o justificación de por qué se reactiva esta solicitud (Ej: Anulada por error, el cliente reconfirmó la reserva, cambio de decisión operativa, etc.)..."
              rows={3}
              disabled={loading}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 font-medium resize-none"
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Este motivo y tu usuario quedarán registrados permanentemente en la ficha de la solicitud para fines de auditoría.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="active-press flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Restaurando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirmar Restauración</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
