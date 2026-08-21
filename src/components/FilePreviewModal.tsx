import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  FileText,
  Download,
  ExternalLink,
  Pencil,
  AlertCircle,
  FileCheck
} from 'lucide-react';

export interface FilePreviewModalProps {
  isOpen: boolean;
  file?: File | null;
  fileUrl?: string | null;
  fileName?: string;
  title?: string;
  subtitle?: string;
  mode?: 'confirm' | 'view'; // 'confirm' = before uploading (Cargar/Cancelar), 'view' = existing file with modify option
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  onModify?: () => void;
  isLoading?: boolean;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  file,
  fileUrl,
  fileName,
  title = 'Vista Previa del Archivo',
  subtitle,
  mode = 'confirm',
  confirmText = 'Cargar Archivo',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  onModify,
  isLoading = false,
}) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Generate object URL when file or fileUrl changes
  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setRotation(0);
      return;
    }

    if (file) {
      const type = file.type || '';
      const name = file.name || '';
      const isImg = type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(name);
      const isDocPdf = type === 'application/pdf' || /\.pdf$/i.test(name);

      setIsImage(isImg);
      setIsPdf(isDocPdf);

      const url = URL.createObjectURL(file);
      setPreviewSrc(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (fileUrl) {
      const isImg =
        fileUrl.startsWith('data:image/') ||
        /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(fileUrl) ||
        !fileUrl.endsWith('.pdf');
      const isDocPdf =
        fileUrl.startsWith('data:application/pdf') ||
        /\.pdf(\?.*)?$/i.test(fileUrl);

      setIsImage(isImg && !isDocPdf);
      setIsPdf(isDocPdf);
      setPreviewSrc(fileUrl);
    } else {
      setPreviewSrc(null);
      setIsImage(false);
      setIsPdf(false);
    }
  }, [file, fileUrl, isOpen]);

  if (!isOpen) return null;

  const displayName = fileName || file?.name || 'documento_soporte';
  const fileSize = file ? `${(file.size / 1024).toFixed(1)} KB` : null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-teal-100 text-[#009b8b] flex items-center justify-center shrink-0 shadow-2xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 text-sm sm:text-base truncate leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {subtitle || (mode === 'confirm' ? 'Verifica que la imagen sea legible y correcta antes de confirmar' : displayName)}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            aria-label="Cerrar vista previa"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar for image manipulation */}
        {isImage && previewSrc && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100/90 border-b border-slate-200 text-xs text-slate-600 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Acercar (Zoom In)"
                className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 font-bold flex items-center gap-1 transition-colors active-press"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Zoom +</span>
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Alejar (Zoom Out)"
                className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 font-bold flex items-center gap-1 transition-colors active-press"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Zoom -</span>
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Girar 90°"
                className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 font-bold flex items-center gap-1 transition-colors active-press"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Girar</span>
              </button>
              {(zoom !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Restablecer vista"
                  className="p-1.5 bg-white hover:bg-slate-200 text-teal-700 rounded-lg border border-teal-300 font-bold flex items-center gap-1 transition-colors active-press"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Restablecer</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              {fileSize && <span>• {fileSize}</span>}
            </div>
          </div>
        )}

        {/* Preview Content Area */}
        <div className="flex-1 overflow-auto bg-slate-900/5 p-4 sm:p-6 flex items-center justify-center min-h-[260px] max-h-[58vh]">
          {isImage && previewSrc ? (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
              <img
                src={previewSrc}
                alt="Vista previa del soporte"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
              />
            </div>
          ) : isPdf && previewSrc ? (
            <div className="w-full h-[50vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
              <FileText className="w-16 h-16 text-rose-500" />
              <div>
                <h4 className="font-black text-slate-800 text-sm">{displayName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Documento PDF {fileSize ? `(${fileSize})` : ''}</p>
              </div>
              <a
                href={previewSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="active-press inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir PDF en pestaña nueva</span>
              </a>
            </div>
          ) : previewSrc ? (
            <div className="w-full py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-4">
              <FileCheck className="w-14 h-14 text-teal-600" />
              <div>
                <h4 className="font-black text-slate-800 text-sm">{displayName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{fileSize || 'Archivo adjunto'}</p>
              </div>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="active-press inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-2xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar / Abrir</span>
                </a>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-semibold">No se pudo cargar la vista previa del archivo.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {onModify && (
              <button
                type="button"
                onClick={onModify}
                className="active-press px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-700" />
                <span>Modificar Archivo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              {cancelText}
            </button>

            {mode === 'confirm' && onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="active-press px-6 py-2.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-black text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isLoading ? 'Cargando...' : confirmText}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
