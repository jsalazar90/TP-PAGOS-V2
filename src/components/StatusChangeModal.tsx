import React, { useState, useEffect } from 'react';
import { PaymentRequest, RequestStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  Clipboard,
  Trash2
} from 'lucide-react';

interface StatusChangeModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmStatusChange: (requestId: string, newStatus: RequestStatus, receiptFile?: File | null) => Promise<void>;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirmStatusChange,
}) => {
  if (!isOpen || !request) return null;

  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(request.status);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update preview URL when receiptFile changes
  useEffect(() => {
    if (receiptFile && receiptFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(receiptFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [receiptFile]);

  // Handle Ctrl+V clipboard paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `comprobante_${Date.now()}.png`, { type: blob.type || 'image/png' });
          setReceiptFile(file);
          setSelectedStatus('realizado');
          setErrorMsg('');
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setErrorMsg('Presiona Ctrl + V en tu teclado para pegar la imagen de la captura.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `comprobante_${Date.now()}.png`, { type: imageType });
          setReceiptFile(file);
          setSelectedStatus('realizado');
          setErrorMsg('');
          return;
        }
      }
      setErrorMsg('No se encontró ninguna imagen en el portapapeles. Copia una captura e intenta de nuevo.');
    } catch (err) {
      setErrorMsg('Usa el teclado (Ctrl + V) para pegar la captura directamente.');
    }
  };

  const handleSave = async () => {
    setErrorMsg('');

    if (selectedStatus === 'realizado' && !receiptFile && !request.receipt_file_url) {
      setErrorMsg('⚠️ ES OBLIGATORIO adjuntar o pegar el comprobante de pago para marcar la solicitud como "Realizado".');
      return;
    }

    try {
      setLoading(true);
      await onConfirmStatusChange(request.id, selectedStatus, receiptFile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el estado de la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm focus:outline-none"
    >
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-4 shadow-modal space-y-3 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Gestionar Estado de Solicitud</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Request Info */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-indigo-700 font-bold">LOC: #{request.locator}</span>
            <StatusBadge status={request.status} size="sm" />
          </div>
          <p className="font-semibold text-slate-800">{request.title}</p>
          <p className="text-slate-500">
            Huésped: <strong className="text-slate-700">{request.guest_name}</strong> | Hotel:{' '}
            <strong className="text-slate-700">{request.hotel_name}</strong>
          </p>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status Selector Options */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Seleccionar Nuevo Estado:
          </label>

          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {[
              { status: 'px_fondos', title: 'PxFondos', desc: 'En espera de disponibilidad de fondos para ejecutar el pago' },
              { status: 'en_proceso', title: 'En Proceso', desc: 'Pago en gestión activa con el banco o canal de destino' },
              { status: 'urgente', title: 'Urgente', desc: 'Prioridad máxima e inmediata para procesar el pago' },
              { status: 'realizado', title: 'Realizado (Pago Concretado)', desc: 'Requiere adjuntar o pegar soporte de comprobante obligatorio' },
            ].map((item) => (
              <label
                key={item.status}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === item.status
                    ? 'bg-indigo-50/80 border-indigo-300 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={item.status}
                  checked={selectedStatus === item.status}
                  onChange={() => setSelectedStatus(item.status as RequestStatus)}
                  className="mt-1 accent-indigo-600"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <StatusBadge status={item.status as RequestStatus} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* File Upload & Paste Section for Realizado */}
        {selectedStatus === 'realizado' && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-bold text-emerald-800">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>Adjunto u Opción de Pegar Imagen</span>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                Ctrl + V Activo
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Puedes subir un archivo PDF/Foto o <strong>pegar directamente la captura del comprobante (Ctrl + V)</strong>.
            </p>

            {/* Action buttons: Subir Archivo + Pegar Imagen */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="active-press cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Adjuntar Archivo</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleReadClipboard}
                className="active-press flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
                <span>📋 Pegar Imagen (Portapapeles)</span>
              </button>
            </div>

            {/* Preview Thumbnail or File Status */}
            {receiptFile ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-300">
                <div className="flex items-center gap-2 truncate">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Vista previa del comprobante"
                      className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0"
                    />
                  ) : (
                    <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-bold text-slate-800 block text-[11px] truncate">{receiptFile.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(receiptFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  title="Quitar archivo"
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : request.receipt_file_url ? (
              <div className="text-[11px] text-emerald-900 font-medium flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>La solicitud ya posee un comprobante adjunto. Puedes reemplazarlo subiendo o pegando uno nuevo.</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="active-press px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
