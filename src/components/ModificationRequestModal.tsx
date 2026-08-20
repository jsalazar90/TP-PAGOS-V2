import React, { useState, useEffect } from 'react';
import { PaymentRequest } from '../types';
import { Edit3, AlertCircle, X, Send } from 'lucide-react';

interface ModificationRequestModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestId: string, reason: string) => Promise<void>;
}

export const ModificationRequestModal: React.FC<ModificationRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && request) {
      setReason(request.modification_reason || '');
      setErrorMsg('');
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('⚠️ Por favor indica la observación o los cambios específicos a realizar.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await onConfirm(request.id, reason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar la solicitud de modificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Top Header Banner */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Pedir Modificación al Administrador
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

        {/* Current Request Summary Box */}
        <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Título:</span>
            <span className="font-bold text-slate-800 truncate max-w-[240px]">{request.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Monto:</span>
            <span className="font-black text-[#009b8b]">
              ${request.amount_usd} USD
              {request.amount_bs > 0 && ` (Bs. ${request.amount_bs})`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Beneficiario:</span>
            <span className="font-medium text-slate-700">{request.bank_details.beneficiary}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Observación / Cambios a Realizar *
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indica con detalle los cambios requeridos (Ej: Cambiar fecha del 20 al 25 de agosto, corregir número de cuenta de destino, ajustar monto a $150...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner font-medium"
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Al enviar, el Administrador verá esta observación de inmediato y podrá abrir el formulario para realizar los ajustes.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="active-press px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {loading ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar al Administrador</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
