import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PaymentRequest, RequestStatus, AttachedFile } from '../types';
import { StatusBadge } from './StatusBadge';
import { FilePreviewModal } from './FilePreviewModal';
import { getRequestReceiptFiles } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { useCompany } from '../opticavision/context/CompanyContext';
import { getTodayLocalDate } from '../opticavision/utils/dateUtils';
import { getTasaForDate } from '../opticavision/services/exchangeRateService';
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
  Receipt,
  Calendar,
  Check,
  ChevronDown,
  Hash,
  Layers,
  Search,
  Wallet
} from 'lucide-react';

export interface BankPaymentAllocation {
  bankId: string;
  bankName: string;
  bankAccountNumber: string;
  currency: string;
  amountUsd: number;
  tasa: number;
  amountBs: number | null;
  reference: string;
  bankAccountingAccountId?: string;
}

export interface StatusChangeSaveOptions {
  receiptFiles?: (File | AttachedFile)[];
  originBank?: string;
  paymentDate?: string;
  overrideAccountId?: string;
  overrideAccountCode?: string;
  overrideAccountName?: string;
  paymentExecutionReference?: string;
  bankAllocations?: BankPaymentAllocation[];
}

interface BankAllocationRow {
  rowId: string;
  bankId: string;
  amountUsd: string;
  tasa: string;
  reference: string;
}

interface StatusChangeModalProps {
  request: PaymentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmStatusChange: (
    requestId: string,
    newStatus: RequestStatus,
    options: StatusChangeSaveOptions
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

const ACCOUNT_CODE_BY_CATEGORY: Record<string, string> = {
  hospedaje: '5.1.02.001',
  traslado: '5.1.03.001',
  vuelos: '5.1.01.001',
  gastos_apoyo: '5.1.04.001',
  viaticos: '6.1.01.001'
};

const isBankIngreso = (tipo?: string): boolean => {
  const t = (tipo || '').toLowerCase();
  return (
    t === 'ingreso' ||
    t === 'ingreso_directo' ||
    t === 'deposito' ||
    t === 'cobro' ||
    t === 'cobranza' ||
    t === 'transferencia_recibida' ||
    t === 'ajuste_ganancia'
  );
};

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
  onRemove
}) => {
  const isNativeFile = item instanceof File;
  const fileName = isNativeFile
    ? item.name
    : (item as AttachedFile).fileName || `Comprobante ${index + 1}`;
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
  onConfirmStatusChange
}) => {
  const { bancos, movimientosBancos, cuentasContables } = useCompany();

  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>('realizado');
  const [receiptFilesList, setReceiptFilesList] = useState<(File | AttachedFile)[]>([]);
  const [activePreviewFile, setActivePreviewFile] = useState<{
    file: File | null;
    fileUrl: string | null;
    fileName: string;
    mode: 'confirm' | 'view';
  } | null>(null);
  const [originBank, setOriginBank] = useState<string>('');
  const [executionRef, setExecutionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => getTodayLocalDate());
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [bankAllocations, setBankAllocations] = useState<BankAllocationRow[]>([]);
  const [openBankPickerRowId, setOpenBankPickerRowId] = useState<string | null>(null);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saldos vivos por cada cuenta bancaria de Tesorería (misma lógica que Banks.tsx)
  const bancosConSaldos = useMemo(() => {
    return (bancos || []).map((b: any) => {
      let saldoUSD = 0;
      let saldoVES = 0;
      (movimientosBancos || [])
        .filter(
          (m: any) => String(m.banco_id) === String(b.id) && m.estado !== 'anulado'
        )
        .forEach((m: any) => {
          const esIngreso = isBankIngreso(m.tipo);
          const montoAbs = Math.abs(Number(m.monto) || 0);
          saldoUSD += esIngreso ? montoAbs : -montoAbs;
          if (b.moneda === 'Bolivares') {
            let mVES =
              m.montoBs !== undefined && m.montoBs !== null && m.montoBs !== ''
                ? Math.abs(parseFloat(String(m.montoBs)))
                : montoAbs * (m.tasa || b.tasa || 1);
            if (m.tipo === 'ajuste_ganancia' || m.tipo === 'ajuste_perdida') {
              mVES = 0;
            }
            saldoVES += esIngreso ? mVES : -mVES;
          }
        });
      return { ...b, saldoUSD, saldoVES };
    });
  }, [bancos, movimientosBancos]);

  // Cuentas contables de movimiento del Plan de Cuentas NIIF
  const cuentasMovimiento = useMemo(() => {
    return (cuentasContables || [])
      .filter((c: any) => c.tipo === 'Movimiento' || !c.tipo)
      .sort((a: any, b: any) => (a.codigo || '').localeCompare(b.codigo || ''));
  }, [cuentasContables]);

  const effectiveAmountUsd = useMemo(() => {
    if (!request) return 0;
    if (request.amount_usd > 0) return Number(request.amount_usd);
    if (request.amount_bs > 0 && request.bcv_rate && request.bcv_rate > 0) {
      return Number((request.amount_bs / request.bcv_rate).toFixed(2));
    }
    return 0;
  }, [request]);

  useEffect(() => {
    if (!isOpen || !request) return;

    const today = getTodayLocalDate();
    const defaultStatus: RequestStatus = request.cancellation_requested
      ? 'anulado'
      : request.status === 'realizado' || request.status === 'anulado'
      ? request.status
      : 'realizado';

    setSelectedStatus(defaultStatus);
    setPaymentDate(today);
    setOriginBank(request.origin_bank || '');
    setExecutionRef('');
    setReceiptFilesList(getRequestReceiptFiles(request));
    setActivePreviewFile(null);
    setOpenBankPickerRowId(null);
    setBankSearchQuery('');
    setErrorMsg('');

    // Preseleccionar cuenta contable NIIF de gasto
    if (cuentasMovimiento.length > 0) {
      const bd = request.bank_details || ({} as any);
      const catCode = ACCOUNT_CODE_BY_CATEGORY[request.category || 'hospedaje'] || '5.1.04.001';
      const matchedNiif =
        cuentasMovimiento.find(
          (c: any) =>
            (bd.default_account_id && String(c.id) === String(bd.default_account_id)) ||
            (bd.default_account_code && c.codigo === bd.default_account_code)
        ) ||
        cuentasMovimiento.find((c: any) => c.codigo === catCode) ||
        cuentasMovimiento.find((c: any) => c.codigo === '5.1.04.001') ||
        cuentasMovimiento[0];
      setSelectedAccountId(String(matchedNiif.id));
    } else {
      setSelectedAccountId('');
    }

    // Autoseleccionar banco de Tesorería acorde al método/moneda de la solicitud
    if (bancosConSaldos.length > 0) {
      const pm = request.bank_details?.payment_method || '';
      const isUsdReq =
        request.currency === 'USD' ||
        pm === 'binance' ||
        pm === 'zelle_usd' ||
        pm === 'transferencia_usd' ||
        pm === 'efectivo_usd' ||
        !request.bcv_rate ||
        request.bcv_rate <= 0;

      const bankHint = (request.bank_details?.bank || '').toLowerCase();
      const channelHint =
        pm === 'binance'
          ? 'binance'
          : pm === 'zelle_usd'
          ? 'zelle'
          : pm === 'efectivo_usd'
          ? 'caja'
          : '';

      let defaultBank: any;
      if (isUsdReq) {
        const usdBanks = bancosConSaldos.filter((b: any) => b.moneda !== 'Bolivares');
        defaultBank =
          usdBanks.find(
            (b: any) =>
              (channelHint && (b.banco || '').toLowerCase().includes(channelHint)) ||
              (bankHint && (b.banco || '').toLowerCase().includes(bankHint))
          ) ||
          usdBanks[0] ||
          bancosConSaldos[0];
      } else {
        const vesBanks = bancosConSaldos.filter((b: any) => b.moneda === 'Bolivares');
        defaultBank =
          vesBanks.find(
            (b: any) => bankHint && (b.banco || '').toLowerCase().includes(bankHint)
          ) ||
          vesBanks[0] ||
          bancosConSaldos[0];
      }

      const isDefaultVes = defaultBank?.moneda === 'Bolivares';
      const initialRate = isDefaultVes
        ? String(
            request.bcv_rate > 0
              ? request.bcv_rate
              : defaultBank?.tasa || getTasaForDate(today)
          )
        : '1';

      const amtUsdInit =
        request.amount_usd > 0
          ? Number(request.amount_usd)
          : request.amount_bs > 0 && request.bcv_rate > 0
          ? Number((request.amount_bs / request.bcv_rate).toFixed(2))
          : 0;

      setBankAllocations([
        {
          rowId: `alloc-${Date.now()}`,
          bankId: defaultBank ? String(defaultBank.id) : '',
          amountUsd: amtUsdInit.toFixed(2),
          tasa: initialRate,
          reference: ''
        }
      ]);
    } else {
      setBankAllocations([]);
    }
  }, [request?.id, isOpen, bancosConSaldos.length, cuentasMovimiento.length]);

  // Escuchar Ctrl+V global mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen || !request) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].type.startsWith('image/') || items[i].kind === 'file') {
          const blob = items[i].getAsFile();
          if (blob) {
            const file =
              blob.name && blob.name !== 'image.png'
                ? blob
                : new File([blob], `comprobante_${Date.now()}_${i + 1}.png`, {
                    type: blob.type || 'image/png'
                  });
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        setReceiptFilesList((prev) => [...prev, ...pastedFiles]);
        setSelectedStatus('realizado');
        setErrorMsg('');
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const formatUsd = (val: number) =>
    `$${val.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatBs = (val: number) =>
    `Bs. ${val.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const totalAssignedUsd = bankAllocations.reduce(
    (sum, row) => sum + (parseFloat(row.amountUsd) || 0),
    0
  );
  const diffUsd = Number((effectiveAmountUsd - totalAssignedUsd).toFixed(2));
  const hasBanks = bancosConSaldos.length > 0;

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setReceiptFilesList((prev) => [...prev, ...newFiles]);
    setSelectedStatus('realizado');
    setErrorMsg('');
  };

  const handleRemoveFileIndex = (indexToRemove: number) => {
    setReceiptFilesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setErrorMsg('Presiona Ctrl + V en tu teclado para pegar la imagen de la captura.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File(
            [blob],
            `comprobante_${receiptFilesList.length + 1}_${Date.now()}.png`,
            { type: imageType }
          );
          setReceiptFilesList((prev) => [...prev, file]);
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
      setErrorMsg(
        'No se encontró ninguna imagen en el portapapeles. Copia una captura e intenta de nuevo.'
      );
    } catch {
      setErrorMsg('Usa el teclado (Ctrl + V) para pegar la captura directamente.');
    }
  };

  const handleRowChange = (
    rowId: string,
    field: keyof BankAllocationRow,
    value: string
  ) => {
    setBankAllocations((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        if (field === 'bankId') {
          const targetBank = bancosConSaldos.find(
            (b: any) => String(b.id) === String(value)
          );
          const nextTasa =
            targetBank?.moneda === 'Bolivares'
              ? String(
                  request.bcv_rate > 0
                    ? request.bcv_rate
                    : targetBank?.tasa || getTasaForDate(paymentDate)
                )
              : '1';
          return { ...row, bankId: value, tasa: nextTasa };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleAddBankSplit = () => {
    const usedIds = new Set(bankAllocations.map((r) => String(r.bankId)));
    const nextBank =
      bancosConSaldos.find((b: any) => !usedIds.has(String(b.id))) ||
      bancosConSaldos[0];
    const remaining = Math.max(0, effectiveAmountUsd - totalAssignedUsd);
    const nextRate =
      nextBank?.moneda === 'Bolivares'
        ? String(
            request.bcv_rate > 0
              ? request.bcv_rate
              : nextBank?.tasa || getTasaForDate(paymentDate)
          )
        : '1';

    setBankAllocations((prev) => [
      ...prev,
      {
        rowId: `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        bankId: nextBank ? String(nextBank.id) : '',
        amountUsd: remaining.toFixed(2),
        tasa: nextRate,
        reference: ''
      }
    ]);
  };

  const handleRemoveBankSplit = (rowId: string) => {
    if (bankAllocations.length <= 1) return;
    setBankAllocations((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const handleAdjustRemaining = () => {
    if (bankAllocations.length === 0) return;
    const lastIdx = bankAllocations.length - 1;
    const lastVal = parseFloat(bankAllocations[lastIdx].amountUsd) || 0;
    const adjusted = Math.max(0, lastVal + diffUsd);
    setBankAllocations((prev) =>
      prev.map((row, idx) =>
        idx === lastIdx ? { ...row, amountUsd: adjusted.toFixed(2) } : row
      )
    );
  };

  const handleSave = async () => {
    if (loading) return;
    setErrorMsg('');

    const matchedNiif = cuentasMovimiento.find(
      (c: any) => String(c.id) === String(selectedAccountId)
    );

    if (selectedStatus === 'realizado') {
      if (receiptFilesList.length === 0) {
        setErrorMsg(
          '⚠️ ES OBLIGATORIO adjuntar o pegar con Ctrl + V al menos un comprobante / captura de pago para marcar la solicitud como "Realizado".'
        );
        return;
      }

      if (hasBanks) {
        if (bankAllocations.length === 0) {
          setErrorMsg('⚠️ Selecciona al menos un banco de Tesorería para emitir el pago.');
          return;
        }

        const builtAllocations: BankPaymentAllocation[] = [];
        let sumUsd = 0;

        for (let i = 0; i < bankAllocations.length; i++) {
          const row = bankAllocations[i];
          const bankObj = bancosConSaldos.find(
            (b: any) => String(b.id) === String(row.bankId)
          );
          if (!bankObj) {
            setErrorMsg('⚠️ Selecciona un banco válido en todas las líneas de pago.');
            return;
          }

          const amtUsd = Number((parseFloat(row.amountUsd) || 0).toFixed(2));
          if (amtUsd <= 0) {
            setErrorMsg(
              `⚠️ El monto USD asignado al banco "${bankObj.banco}" debe ser mayor a 0.`
            );
            return;
          }

          const isVES = bankObj.moneda === 'Bolivares';
          const rateNum = isVES ? parseFloat(row.tasa) || 0 : 1;
          if (isVES && rateNum <= 0) {
            setErrorMsg(
              `⚠️ Ingresa una Tasa BCV válida mayor a 0 para "${bankObj.banco}".`
            );
            return;
          }

          sumUsd += amtUsd;
          const autoRef = `REF-${Date.now().toString().slice(-6)}${
            bankAllocations.length > 1 ? `-${i + 1}` : ''
          }`;

          builtAllocations.push({
            bankId: String(bankObj.id),
            bankName: bankObj.banco || 'Banco',
            bankAccountNumber: bankObj.cuenta || bankObj.numero_cuenta || '',
            currency: bankObj.moneda || 'USD',
            amountUsd: amtUsd,
            tasa: rateNum,
            amountBs: isVES ? Number((amtUsd * rateNum).toFixed(2)) : null,
            reference: row.reference.trim() || autoRef,
            bankAccountingAccountId:
              bankObj.cuenta_contable_id || bankObj.cuentaContableId
          });
        }

        if (effectiveAmountUsd > 0 && Math.abs(sumUsd - effectiveAmountUsd) >= 0.01) {
          setErrorMsg(
            `⚠️ La suma asignada (${formatUsd(sumUsd)}) no coincide con el monto de la solicitud (${formatUsd(
              effectiveAmountUsd
            )}).`
          );
          return;
        }

        const combinedOriginBank =
          builtAllocations.length === 1
            ? `${builtAllocations[0].bankName} (${
                builtAllocations[0].currency === 'Bolivares' ? 'Bs.' : 'USD'
              })`
            : builtAllocations
                .map((a) => `${a.bankName} ($${a.amountUsd.toFixed(2)})`)
                .join(' + ');

        const combinedRef = builtAllocations.map((a) => a.reference).join(' / ');

        try {
          setLoading(true);
          await onConfirmStatusChange(request.id, selectedStatus, {
            receiptFiles: receiptFilesList,
            originBank: combinedOriginBank,
            paymentDate: paymentDate || getTodayLocalDate(),
            overrideAccountId: selectedAccountId || undefined,
            overrideAccountCode: matchedNiif?.codigo,
            overrideAccountName: matchedNiif?.nombre,
            paymentExecutionReference: combinedRef,
            bankAllocations: builtAllocations
          });

          notificationService.triggerHaptic('success');
          notificationService.playChime('paid');
          onClose();
        } catch (err: any) {
          notificationService.triggerHaptic('error');
          setErrorMsg(err.message || 'Error al registrar el pago de la solicitud');
        } finally {
          setLoading(false);
        }
        return;
      }

      // Fallback si aún no existen bancos registrados en Tesorería
      if (!originBank.trim()) {
        setErrorMsg(
          '⚠️ ES OBLIGATORIO indicar el Banco de Origen desde el cual se emitió el pago.'
        );
        return;
      }
    }

    try {
      setLoading(true);
      await onConfirmStatusChange(request.id, selectedStatus, {
        receiptFiles: selectedStatus === 'realizado' ? receiptFilesList : undefined,
        originBank:
          selectedStatus === 'realizado'
            ? originBank.trim().toUpperCase()
            : request.origin_bank,
        paymentDate: paymentDate || getTodayLocalDate(),
        overrideAccountId: selectedAccountId || undefined,
        overrideAccountCode: matchedNiif?.codigo,
        overrideAccountName: matchedNiif?.nombre,
        paymentExecutionReference:
          executionRef.trim() ||
          (selectedStatus === 'realizado'
            ? `REF-${Date.now().toString().slice(-6)}`
            : undefined)
      });

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
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs focus:outline-none overflow-y-auto"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-modal space-y-3 text-slate-800 max-h-[94vh] overflow-y-auto my-auto">
        {/* Header + Resumen de Solicitud */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                  Gestionar Estado de Solicitud
                </h3>
                <StatusBadge status={request.status} size="sm" />
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs mt-0.5">
                <span className="font-mono text-indigo-700 font-bold">
                  LOC: #{request.locator}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-800">{request.title}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  Beneficiario:{' '}
                  <strong className="text-slate-700">
                    {request.bank_details?.beneficiary || request.hotel_name}
                  </strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  Monto:{' '}
                  <strong className="text-emerald-700 font-black">
                    {formatUsd(effectiveAmountUsd)}
                  </strong>
                  {request.currency !== 'USD' && request.amount_bs > 0 && (
                    <span className="text-slate-500 font-semibold ml-1">
                      ({formatBs(request.amount_bs)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 self-end sm:self-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
                {request.cancellation_requested_at
                  ? new Date(request.cancellation_requested_at).toLocaleString()
                  : ''}
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Seleccionar Nuevo Estado:
            </label>

            {/* 4 Opciones de Estado en Fila Horizontal */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === 'urgente'
                    ? 'bg-rose-50/90 border-rose-400 text-slate-900 ring-1 ring-rose-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="urgente"
                  checked={selectedStatus === 'urgente'}
                  onChange={() => setSelectedStatus('urgente')}
                  className="mt-0.5 accent-rose-600"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">Urgente</span>
                    <StatusBadge status="urgente" size="sm" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Prioridad máxima e inmediata
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === 'en_proceso'
                    ? 'bg-blue-50/90 border-blue-400 text-slate-900 ring-1 ring-blue-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="en_proceso"
                  checked={selectedStatus === 'en_proceso'}
                  onChange={() => setSelectedStatus('en_proceso')}
                  className="mt-0.5 accent-blue-600"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">En Proceso</span>
                    <StatusBadge status="en_proceso" size="sm" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Pago en gestión activa
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === 'realizado'
                    ? 'bg-emerald-50/90 border-emerald-400 text-slate-900 ring-1 ring-emerald-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="realizado"
                  checked={selectedStatus === 'realizado'}
                  onChange={() => setSelectedStatus('realizado')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">Realizado</span>
                    <span className="inline-flex items-center rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-1.5 py-0.2 text-[9px]">
                      Pago Concretado
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Debita del banco y archiva
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === 'anulado'
                    ? 'bg-rose-50/80 border-rose-300 text-slate-900 ring-1 ring-rose-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="anulado"
                  checked={selectedStatus === 'anulado'}
                  onChange={() => setSelectedStatus('anulado')}
                  className="mt-0.5 accent-rose-600"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">Anulado</span>
                    <StatusBadge status="anulado" size="sm" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Cancela la orden de pago
                  </p>
                </div>
              </label>
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
                Al confirmar, la solicitud <strong>#{request.locator}</strong> se registrará como{' '}
                <strong>ANULADA</strong> con saldos en 0 en el Historial. No afectará los totales de montos liquidados ni pendientes.
              </p>
            </div>
          )}

          {/* Panel de Liquidación en 2 Columnas cuando se selecciona "Realizado" */}
          {selectedStatus === 'realizado' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/90 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Columna Izquierda: Bancos de Tesorería (Egreso), Fecha y Cuenta Contable */}
              <div className="lg:col-span-7 min-w-0 space-y-3">
                {hasBanks ? (
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Banco(s) de Origen (Salida en Tesorería): *</span>
                      </label>
                      {bancosConSaldos.length > 1 && (
                        <button
                          type="button"
                          onClick={handleAddBankSplit}
                          className="active-press px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Dividir en otro banco</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 min-w-0">
                      {bankAllocations.map((row, idx) => {
                        const selectedBank = bancosConSaldos.find(
                          (b: any) => String(b.id) === String(row.bankId)
                        );
                        const isVES = selectedBank?.moneda === 'Bolivares';
                        const rowUsd = parseFloat(row.amountUsd) || 0;
                        const rowRate = parseFloat(row.tasa) || 1;
                        const rowBs = isVES ? rowUsd * rowRate : 0;
                        const isOpenPicker = openBankPickerRowId === row.rowId;
                        const accRaw =
                          selectedBank?.cuenta || selectedBank?.numero_cuenta || '';
                        const accShort = accRaw
                          ? accRaw.length > 10
                            ? `...${accRaw.slice(-4)}`
                            : accRaw
                          : '';
                        const balUsd = selectedBank ? selectedBank.saldoUSD : 0;
                        const balTextColor =
                          balUsd > 0
                            ? 'text-emerald-700'
                            : balUsd < 0
                            ? 'text-rose-600'
                            : 'text-slate-500';
                        const iconChipClass = selectedBank?.es_caja
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : isVES
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700';

                        const q = bankSearchQuery.trim().toLowerCase();
                        const filteredBanks = q
                          ? bancosConSaldos.filter((b: any) =>
                              `${b.banco || ''} ${b.moneda || ''} ${b.cuenta || ''} ${
                                b.numero_cuenta || ''
                              }`
                                .toLowerCase()
                                .includes(q)
                            )
                          : bancosConSaldos;

                        return (
                          <div
                            key={row.rowId}
                            className="bg-white rounded-2xl border border-emerald-200/90 p-3 space-y-2.5 shadow-2xs min-w-0"
                          >
                            {bankAllocations.length > 1 && (
                              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                                  Banco de Salida #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBankSplit(row.rowId)}
                                  title="Quitar este banco"
                                  className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Quitar</span>
                                </button>
                              </div>
                            )}

                            {/* Trigger Visual de Etiqueta de Banco */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenBankPickerRowId((prev) =>
                                  prev === row.rowId ? null : row.rowId
                                );
                                setBankSearchQuery('');
                              }}
                              className={`w-full min-w-0 text-left rounded-xl border p-2.5 flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                isOpenPicker
                                  ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/15'
                                  : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconChipClass}`}
                                >
                                  {selectedBank?.es_caja ? (
                                    <Wallet className="w-4 h-4" />
                                  ) : (
                                    <Landmark className="w-4 h-4" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-extrabold text-slate-900 text-xs truncate">
                                      {selectedBank
                                        ? selectedBank.banco
                                        : 'Seleccionar banco o caja de Tesorería'}
                                    </span>
                                    {selectedBank && (
                                      <span
                                        className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${
                                          isVES
                                            ? 'bg-blue-100/80 text-blue-800 border-blue-200'
                                            : 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                                        }`}
                                      >
                                        {isVES ? 'Bs.' : 'USD'}
                                      </span>
                                    )}
                                  </div>

                                  {selectedBank && (
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px]">
                                      <span className="text-slate-500 font-medium">
                                        Disponible:{' '}
                                        <span
                                          className={`font-mono font-bold tabular-nums ${balTextColor}`}
                                        >
                                          {isVES
                                            ? `${formatBs(
                                                selectedBank.saldoVES
                                              )} (${formatUsd(selectedBank.saldoUSD)})`
                                            : `${formatUsd(selectedBank.saldoUSD)} USD`}
                                        </span>
                                      </span>
                                      {accShort && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          • {accShort}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-700 hidden sm:inline">
                                  Cambiar
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                                    isOpenPicker ? 'rotate-180 text-emerald-600' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Lista Desplegable Segura de Bancos */}
                            {isOpenPicker && (
                              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                                {bancosConSaldos.length > 4 && (
                                  <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                                    <div className="relative">
                                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="text"
                                        value={bankSearchQuery}
                                        onChange={(e) => setBankSearchQuery(e.target.value)}
                                        placeholder="Buscar banco, moneda o cuenta..."
                                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-[11px] font-medium text-slate-800 focus:outline-none focus:border-emerald-400"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="max-h-52 overflow-y-auto p-1.5 space-y-1">
                                  {filteredBanks.length === 0 ? (
                                    <p className="py-3 text-center text-[11px] text-slate-400 font-medium">
                                      No se encontraron bancos con "{bankSearchQuery}".
                                    </p>
                                  ) : (
                                    filteredBanks.map((b: any) => {
                                      const bIsVes = b.moneda === 'Bolivares';
                                      const isSelectedOpt =
                                        String(b.id) === String(row.bankId);
                                      const bAcc = b.cuenta || b.numero_cuenta || '';
                                      const bBalColor =
                                        b.saldoUSD > 0
                                          ? 'text-emerald-700'
                                          : b.saldoUSD < 0
                                          ? 'text-rose-600'
                                          : 'text-slate-600';
                                      const bIconClass = b.es_caja
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : bIsVes
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-700';

                                      return (
                                        <button
                                          key={b.id}
                                          type="button"
                                          onClick={() => {
                                            handleRowChange(
                                              row.rowId,
                                              'bankId',
                                              String(b.id)
                                            );
                                            setOpenBankPickerRowId(null);
                                            setBankSearchQuery('');
                                          }}
                                          className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                                            isSelectedOpt
                                              ? 'bg-emerald-50/90 border-emerald-300'
                                              : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div
                                              className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${bIconClass}`}
                                            >
                                              {b.es_caja ? (
                                                <Wallet className="w-3.5 h-3.5" />
                                              ) : (
                                                <Landmark className="w-3.5 h-3.5" />
                                              )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-xs text-slate-900 leading-tight break-words">
                                                  {b.banco}
                                                </span>
                                                <span
                                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black border shrink-0 ${
                                                    bIsVes
                                                      ? 'bg-blue-100/80 text-blue-800 border-blue-200'
                                                      : 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                                                  }`}
                                                >
                                                  {bIsVes ? 'Bs.' : 'USD'}
                                                </span>
                                              </div>
                                              {bAcc && (
                                                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                                                  {bAcc}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0 flex items-center gap-2">
                                            <div>
                                              <span
                                                className={`block font-mono font-black text-[11px] tabular-nums ${bBalColor}`}
                                              >
                                                {bIsVes
                                                  ? formatBs(b.saldoVES)
                                                  : `${formatUsd(b.saldoUSD)} USD`}
                                              </span>
                                              {bIsVes && (
                                                <span className="block font-mono text-[10px] text-slate-500 tabular-nums">
                                                  ({formatUsd(b.saldoUSD)})
                                                </span>
                                              )}
                                            </div>
                                            {isSelectedOpt && (
                                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Inputs de Monto / Tasa BCV / Referencia */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                              {bankAllocations.length > 1 && (
                                <div className="min-w-0">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                    Monto USD (Banco {idx + 1}):
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={row.amountUsd}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.rowId,
                                        'amountUsd',
                                        e.target.value
                                      )
                                    }
                                    className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-400"
                                  />
                                </div>
                              )}

                              {isVES && (
                                <div className="min-w-0">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 truncate">
                                    Tasa BCV (Salida: {formatBs(rowBs)}):
                                  </label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    min="0.01"
                                    value={row.tasa}
                                    onChange={(e) =>
                                      handleRowChange(row.rowId, 'tasa', e.target.value)
                                    }
                                    className="w-full min-w-0 bg-blue-50/50 border border-blue-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:bg-white focus:border-blue-400"
                                  />
                                </div>
                              )}

                              <div
                                className={`min-w-0 ${
                                  bankAllocations.length === 1 && !isVES
                                    ? 'sm:col-span-2'
                                    : ''
                                }`}
                              >
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                  N° Referencia Bancaria (Opcional):
                                </label>
                                <div className="relative">
                                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={row.reference}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.rowId,
                                        'reference',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ej: REF-882910 / AUTH-4412"
                                    className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-400"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bankAllocations.length > 1 && (
                      <div
                        className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-2 flex-wrap ${
                          Math.abs(diffUsd) < 0.01
                            ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                            : 'bg-amber-50 border-amber-300 text-amber-900'
                        }`}
                      >
                        <span>
                          Asignado: {formatUsd(totalAssignedUsd)} / Solicitud:{' '}
                          {formatUsd(effectiveAmountUsd)}
                        </span>
                        {Math.abs(diffUsd) >= 0.01 && (
                          <button
                            type="button"
                            onClick={handleAdjustRemaining}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black"
                          >
                            Ajustar ({diffUsd > 0 ? `+${diffUsd.toFixed(2)}` : diffUsd.toFixed(2)})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 min-w-0">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-semibold">
                      No hay cuentas registradas en Tesorería. Crea un banco en{' '}
                      <strong>Cuentas &amp; Mayor → Tesorería</strong> para descontar saldos automáticamente.
                    </div>
                    <div className="bg-white rounded-2xl border border-emerald-200/90 p-3 space-y-2.5 shadow-2xs min-w-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                            <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Banco de Origen (Cuenta Emisora){' '}
                              <span className="text-rose-500">*</span>
                            </span>
                          </label>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Obligatorio
                          </span>
                        </div>
                        <input
                          type="text"
                          value={originBank}
                          onChange={(e) => setOriginBank(e.target.value.toUpperCase())}
                          placeholder="Ej: BANESCO, BANCO DE VENEZUELA, MERCANTIL, BINANCE..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        />
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
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
                      <div className="min-w-0">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          N° Referencia / Confirmación Bancaria (Opcional):
                        </label>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={executionRef}
                            onChange={(e) => setExecutionRef(e.target.value)}
                            placeholder="Ej: REF-882910 / AUTH-4412"
                            className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fecha de Pago + Cuenta Contable NIIF agrupados */}
                <div className="bg-white rounded-2xl border border-emerald-200/90 p-3 space-y-2.5 shadow-2xs min-w-0">
                  <div className="min-w-0">
                    <label className="text-[11px] font-black text-emerald-950 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Fecha de Ejecución del Pago:</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-400"
                    />
                  </div>

                  {cuentasMovimiento.length > 0 && (
                    <div className="min-w-0">
                      <label className="text-[11px] font-black text-emerald-950 mb-0.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Cuenta Contable de Gasto (Plan de Cuentas NIIF): *</span>
                      </label>
                      <p className="text-[10px] text-emerald-800 mb-1.5">
                        Se generará el asiento automático contra el banco seleccionado.
                      </p>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full min-w-0 max-w-full truncate bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-400"
                        required
                      >
                        {cuentasMovimiento.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.codigo} — {acc.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Comprobantes / Capturas de Pago */}
              <div className="lg:col-span-5 min-w-0">
                <div className="bg-emerald-50/70 border border-emerald-300/90 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs">
                      <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Comprobantes / Capturas de Pago ({receiptFilesList.length})</span>
                      <span className="text-rose-500">*</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-200/80 text-emerald-950 font-black text-[10px]">
                      Ctrl + V Activo
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Puedes adjuntar{' '}
                    <strong className="text-slate-800">varios comprobantes</strong> (si el
                    pago se dividió en 2 transferencias) o{' '}
                    <strong className="text-slate-800">
                      pegar capturas directamente con Ctrl + V
                    </strong>
                    .
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
                    <div className="space-y-2 pt-1 max-h-52 overflow-y-auto pr-1">
                      {receiptFilesList.map((item, idx) => (
                        <ReceiptItemCard
                          key={`receipt-item-${idx}-${
                            item instanceof File
                              ? item.name + item.size
                              : (item as AttachedFile).url
                          }`}
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
                  <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="active-press px-3.5 py-2 rounded-xl bg-[#008f68] hover:bg-[#007a58] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
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
                      onClick={() => void handleReadClipboard()}
                      className="active-press px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-emerald-700" />
                      <span>📋 Pegar Captura (Ctrl + V)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading}
            className="active-press px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs disabled:opacity-50 transition-colors"
          >
            {loading
              ? selectedStatus === 'realizado'
                ? 'Registrando Pago...'
                : 'Actualizando...'
              : 'Guardar Cambios'}
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
