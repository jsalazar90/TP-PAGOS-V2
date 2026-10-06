import React, { useState, useEffect, useRef } from 'react';
import { PaymentRequest, RequestStatus, AttachedFile } from '../types';
import { StatusBadge } from './StatusBadge';
import { FilePreviewModal } from './FilePreviewModal';
import { getRequestReceiptFiles } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clipboard,
  Trash2,
  Landmark,
  Eye,
  XCircle,
  Ban,
  Plus,
  Receipt
} from 'lucide-react';

interface StatusChangeModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmStatusChange: (
    requestId: string,
    newStatus: RequestStatus,
    receiptFiles?: (File | AttachedFile)[] | File | null,
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

interface ReceiptItemCardProps {
  item: File | AttachedFile;
  index: number;
  onPreview: (file: File | null, fileUrl: string | null, fileName: string) => void;
  onRemove: () => void;
}

const ReceiptItemCard: React.FC<ReceiptItemCardProps> = ({
  item,
  index,
  onPreview,
  onRemove,
}) => {
  const isNativeFile = item instanceof File;
  const fileName = isNativeFile ? item.name : (item as AttachedFile).fileName || `Comprobante ${index + 1}`;
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let urlToRevoke: string | null = null;

    if (isNativeFile && item.type.startsWith('image/')) {
      urlToRevoke = URL.createObjectURL(item);
      if (active) setThumbUrl(urlToRevoke);
    } else if (!isNativeFile && (item as AttachedFile).url) {
      if (active) setThumbUrl((item as AttachedFile).url);
    } else {
      if (active) setThumbUrl(null);
    }

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [item, isNativeFile]);

  return (
    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
      <div className="flex items-center gap-2 truncate min-w-0">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Comprobante ${index + 1}`}
            className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() =>
              onPreview(
                isNativeFile ? item : null,
                !isNativeFile ? (item as AttachedFile).url : null,
                fileName
              )
            }
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        )}
        <div className="truncate min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              #{index + 1}
            </span>
            <span className="font-bold text-slate-800 block text-xs truncate">
              {fileName}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            {isNativeFile
              ? `${(item.size / 1024).toFixed(1)} KB • Listo para guardar`
              : 'Comprobante guardado previamente'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          type="button"
          onClick={() =>
            onPreview(
              isNativeFile ? item : null,
              !isNativeFile ? (item as AttachedFile).url : null,
              fileName
            )
          }
          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg font-bold text-[11px] border border-emerald-200 flex items-center gap-1 active-press"
        >
          <Eye className="w-3 h-3 text-emerald-600" />
          <span>Ver</span>
        </button>

        <button
          type="button"
          onClick={onRemove}
          title="Quitar este comprobante"
          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  request,
  isOpen,
  onClose,
  onConfirmStatusChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(request?.status || 'en_proceso');
  const [receiptFilesList, setReceiptFilesList] = useState<(File | AttachedFile)[]>([]);
  const [activePreviewFile, setActivePreviewFile] = useState<{
    file: File | null;
    fileUrl: string | null;
    fileName: string;
    mode: 'confirm' | 'view';
  } | null>(null);
  const [originBank, setOriginBank] = useState<string>(request?.origin_bank || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected status and origin bank when request or modal opens
  useEffect(() => {
    if (request) {
      setSelectedStatus(request.status);
      setOriginBank(request.origin_bank || '');
      const existingReceipts = getRequestReceiptFiles(request);
      setReceiptFilesList(existingReceipts);
      setActivePreviewFile(null);
      setErrorMsg('');
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setReceiptFilesList(prev => [...prev, ...newFiles]);
    setSelectedStatus('realizado');
    setErrorMsg('');
  };

  const handleRemoveFileIndex = (indexToRemove: number) => {
    setReceiptFilesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle Ctrl+V clipboard paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File(
            [blob],
            `comprobante_${receiptFilesList.length + 1}_${Date.now()}.png`,
            { type: blob.type || 'image/png' }
          );
          setReceiptFilesList(prev => [...prev, file]);
          setSelectedStatus('realizado');
          setErrorMsg('');
          setActivePreviewFile({
            file,
            fileUrl: null,
            fileName: file.name,
            mode: 'view'
          });
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
          const file = new File(
            [blob],
            `comprobante_${receiptFilesList.length + 1}_${Date.now()}.png`,
            { type: imageType }
          );
          setReceiptFilesList(prev => [...prev, file]);
          setSelectedStatus('realizado');
          setErrorMsg('');
          setActivePreviewFile({
            file,
            fileUrl: null,
            fileName: file.name,
            mode: 'view'
          });
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
      if (receiptFilesList.length === 0) {
        setErrorMsg('⚠️ ES OBLIGATORIO adjuntar al menos un comprobante o captura de pago para marcar la solicitud como "Realizado".');
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
        receiptFilesList,
        selectedStatus === 'realizado' ? originBank.trim().toUpperCase() : request.origin_bank
      );

      // Feedback háptico y auditivo diferenciado
      if (selectedStatus === 'realizado') {
        notificationService.triggerHaptic('success');
        notificationService.playChime('paid');
      } else if (selectedStatus === 'urgente') {
        notificationService.triggerHaptic('urgent');
        notificationService.playChime('urgent');
      } else if (selectedStatus === 'anulado') {
        notificationService.triggerHaptic('warning');
      } else {
        notificationService.triggerHaptic('medium');
      }

      onClose();
    } catch (err: any) {
      notificationService.triggerHaptic('error');
      setErrorMsg(err.message || 'Error al actualizar el estado de la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm focus:outline-none overflow-y-auto"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-modal space-y-3.5 text-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Gestionar Estado de Solicitud</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Request Info */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-indigo-700 font-bold">LOC: #{request.locator}</span>
            <StatusBadge status={request.status} size="sm" />
          </div>
          <p className="font-semibold text-slate-800 text-xs sm:text-sm">{request.title}</p>
          <p className="text-slate-500">
            Huésped: <strong className="text-slate-700">{request.guest_name}</strong> | Hotel:{' '}
            <strong className="text-slate-700">{request.hotel_name}</strong>
          </p>
        </div>

        {/* Banner de Solicitud de Anulación si aplica */}
        {request.cancellation_requested && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <Ban className="w-4 h-4 text-rose-600 shrink-0" />
              <span>El solicitante ha pedido ANULAR este pago:</span>
            </div>
            <p className="font-semibold text-rose-950 italic bg-white/70 p-2 rounded-lg border border-rose-200">
              "{request.cancellation_reason}"
            </p>
            {request.cancellation_requested_by && (
              <p className="text-[10px] text-rose-600">
                Solicitado por: <strong>{request.cancellation_requested_by}</strong> •{' '}
                {request.cancellation_requested_at ? new Date(request.cancellation_requested_at).toLocaleString() : ''}
              </p>
            )}
          </div>
        )}

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
              { status: 'urgente', title: 'Urgente', desc: 'Prioridad máxima e inmediata para procesar el pago' },
              { status: 'en_proceso', title: 'En Proceso', desc: 'Pago en gestión activa con el banco o canal de destino' },
              { status: 'realizado', title: 'Realizado (Pago Concretado)', desc: 'Permite adjuntar una o múltiples transferencias/capturas de pago' },
              { status: 'anulado', title: 'Anulado (Cancelación)', desc: 'Anula esta solicitud. Se traslada al historial con saldos en 0.' },
            ].map((item) => (
              <label
                key={item.status}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === item.status
                    ? item.status === 'anulado'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-indigo-50/80 border-indigo-300 text-slate-900'
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

        {/* Mensaje de confirmación cuando se selecciona Anulado */}
        {selectedStatus === 'anulado' && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5 text-xs text-rose-900">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Confirmación de Anulación</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              Al confirmar, la solicitud <strong>#{request.locator}</strong> se registrará como <strong>ANULADA</strong> con saldos en 0 en el Historial. No afectará los totales de montos liquidados ni pendientes.
            </p>
          </div>
        )}

        {/* File Upload & Paste Section for Realizado (Multiple Files Support) */}
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
                <span>Comprobantes / Capturas de Pago ({receiptFilesList.length}) <span className="text-rose-500">*</span></span>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                Ctrl + V Activo
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-normal">
              Puedes adjuntar <strong>varios comprobantes</strong> (si el pago se dividió en 2 transferencias) o <strong>pegar capturas directamente con Ctrl + V</strong>.
            </p>

            {/* Hidden Multiple File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={(e) => {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />

            {/* List of Attached Receipts */}
            {receiptFilesList.length > 0 && (
              <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                {receiptFilesList.map((item, idx) => (
                  <ReceiptItemCard
                    key={`receipt-item-${idx}-${item instanceof File ? item.name + item.size : (item as AttachedFile).url}`}
                    item={item}
                    index={idx}
                    onPreview={(file, fileUrl, fileName) =>
                      setActivePreviewFile({
                        file,
                        fileUrl,
                        fileName,
                        mode: 'view'
                      })
                    }
                    onRemove={() => handleRemoveFileIndex(idx)}
                  />
                ))}
              </div>
            )}

            {/* Action buttons: Subir Archivo(s) + Pegar Imagen */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/80">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="active-press flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
              >
                {receiptFilesList.length > 0 ? (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Otro Archivo</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Adjuntar Comprobante(s)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReadClipboard}
                className="active-press flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
                <span>📋 Pegar Captura (Ctrl + V)</span>
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="active-press px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
          >
            {loading ? 'Actualizando...' : 'Guardar Cambios'}
          </button>
        </div>

        {/* File Preview Modal */}
        {activePreviewFile && (
          <FilePreviewModal
            isOpen={true}
            file={activePreviewFile.file}
            fileUrl={activePreviewFile.fileUrl}
            fileName={activePreviewFile.fileName}
            title="Comprobante de Pago"
            mode="view"
            confirmText="Cerrar"
            cancelText="Cerrar"
            onConfirm={() => setActivePreviewFile(null)}
            onCancel={() => setActivePreviewFile(null)}
          />
        )}
      </div>
    </div>
  );
};
