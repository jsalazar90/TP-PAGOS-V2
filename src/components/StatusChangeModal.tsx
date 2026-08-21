import React, { useState, useEffect, useRef } from 'react';
import { PaymentRequest, RequestStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { FilePreviewModal } from './FilePreviewModal';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  Clipboard,
  Trash2,
  Landmark,
  Eye,
  Pencil
} from 'lucide-react';

interface StatusChangeModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmStatusChange: (
    requestId: string,
    newStatus: RequestStatus,
    receiptFile?: File | null,
    originBank?: string
  ) => Promise<void>;
}

const COMMON_ORIGIN_BANKS = [
  'BANESCO',
  'BANCO DE VENEZUELA',
  'MERCANTIL',
  'BANCO PROVINCIAL',
  'BANCAMIGA',
  'BNC',
  'BANPLUS',
  'BINANCE',
  'ZELLE'
];

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirmStatusChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(request?.status || 'en_proceso');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'confirm' | 'view'>('confirm');
  const [originBank, setOriginBank] = useState<string>(request?.origin_bank || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected status and origin bank when request or modal opens
  useEffect(() => {
    if (request) {
      setSelectedStatus(request.status);
      setOriginBank(request.origin_bank || '');
      setReceiptFile(null);
      setPendingReceiptFile(null);
      setIsPreviewOpen(false);
      setPreviewUrl(null);
      setErrorMsg('');
    }
  }, [request, isOpen]);

  const handleReceiptSelected = (file: File | null) => {
    if (!file) return;
    setPendingReceiptFile(file);
    setPreviewMode('confirm');
    setSelectedStatus('realizado');
    setErrorMsg('');
    setIsPreviewOpen(true);
  };

  const handleConfirmReceipt = () => {
    if (pendingReceiptFile) {
      setReceiptFile(pendingReceiptFile);
      setPendingReceiptFile(null);
    }
    setIsPreviewOpen(false);
  };

  const handleCancelReceipt = () => {
    setPendingReceiptFile(null);
    setIsPreviewOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenViewReceipt = () => {
    setPreviewMode('view');
    setIsPreviewOpen(true);
  };

  const handleTriggerModify = () => {
    fileInputRef.current?.click();
  };

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

  if (!isOpen || !request) return null;

  // Handle Ctrl+V clipboard paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `comprobante_${Date.now()}.png`, { type: blob.type || 'image/png' });
          handleReceiptSelected(file);
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
          handleReceiptSelected(file);
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

    if (selectedStatus === 'realizado') {
      if (!receiptFile && !request.receipt_file_url) {
        setErrorMsg('⚠️ ES OBLIGATORIO adjuntar o pegar el comprobante de pago para marcar la solicitud como "Realizado".');
        return;
      }
      if (!originBank.trim()) {
        setErrorMsg('⚠️ ES OBLIGATORIO indicar el Banco de Origen desde el cual se emitió el pago.');
        return;
      }
    }

    try {
      setLoading(true);
      await onConfirmStatusChange(
        request.id,
        selectedStatus,
        receiptFile,
        selectedStatus === 'realizado' ? originBank.trim().toUpperCase() : request.origin_bank
      );
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
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3 text-xs">
            {/* Banco de Origen Input */}
            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-emerald-300">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Banco de Origen (Cuenta Emisora) <span className="text-rose-500">*</span></span>
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold">Obligatorio</span>
              </div>
              <input
                type="text"
                value={originBank}
                onChange={(e) => setOriginBank(e.target.value.toUpperCase())}
                placeholder="Ej: BANESCO, BANCO DE VENEZUELA, MERCANTIL, BINANCE..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
              {/* Quick Bank Chips */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {COMMON_ORIGIN_BANKS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setOriginBank(b)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                      originBank === b
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-bold text-emerald-800">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>Adjunto u Opción de Pegar Imagen <span className="text-rose-500">*</span></span>
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  handleReceiptSelected(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleTriggerModify}
                className="active-press flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{receiptFile || request.receipt_file_url ? 'Cambiar Archivo' : 'Adjuntar Archivo'}</span>
              </button>

              <button
                type="button"
                onClick={handleReadClipboard}
                className="active-press flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
                <span>📋 Pegar Imagen (Ctrl + V)</span>
              </button>
            </div>

            {/* Preview Thumbnail or File Status */}
            {receiptFile ? (
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Vista previa del comprobante"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={handleOpenViewReceipt}
                    />
                  ) : (
                    <FileCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  )}
                  <div className="truncate min-w-0">
                    <span className="font-bold text-slate-800 block text-xs truncate">{receiptFile.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(receiptFile.size / 1024).toFixed(1)} KB • Listo para guardar
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenViewReceipt}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg font-bold text-[11px] border border-emerald-200 flex items-center gap-1 active-press"
                  >
                    <Eye className="w-3 h-3 text-emerald-600" />
                    <span>Ver</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerModify}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-[11px] border border-amber-300 flex items-center gap-1 active-press"
                  >
                    <Pencil className="w-3 h-3 text-amber-700" />
                    <span>Modificar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    title="Quitar archivo"
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : request.receipt_file_url ? (
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="truncate min-w-0">
                    <span className="font-bold text-slate-800 block text-xs truncate">
                      {request.receipt_file_name || 'Comprobante Registrado'}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Comprobante guardado previamente</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenViewReceipt}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg font-bold text-[11px] border border-emerald-200 flex items-center gap-1 active-press"
                  >
                    <Eye className="w-3 h-3 text-emerald-600" />
                    <span>Ver</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerModify}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-[11px] border border-amber-300 flex items-center gap-1 active-press"
                  >
                    <Pencil className="w-3 h-3 text-amber-700" />
                    <span>Modificar</span>
                  </button>
                </div>
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

        {/* File Preview Modal for Receipt */}
        <FilePreviewModal
          isOpen={isPreviewOpen}
          file={pendingReceiptFile || receiptFile}
          fileUrl={!pendingReceiptFile && !receiptFile ? request.receipt_file_url : null}
          fileName={
            pendingReceiptFile?.name ||
            receiptFile?.name ||
            request.receipt_file_name ||
            'comprobante_pago'
          }
          title={
            previewMode === 'confirm'
              ? 'Verificar Comprobante antes de Cargar'
              : 'Comprobante de Pago'
          }
          subtitle={
            previewMode === 'confirm'
              ? 'Verifica que los datos del pago y número de referencia sean correctos antes de confirmar.'
              : undefined
          }
          mode={previewMode}
          confirmText="Cargar Comprobante"
          cancelText={previewMode === 'confirm' ? 'Cancelar' : 'Cerrar'}
          onConfirm={handleConfirmReceipt}
          onCancel={handleCancelReceipt}
          onModify={handleTriggerModify}
        />
      </div>
    </div>
  );
};
