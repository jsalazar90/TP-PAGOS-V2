import React, { useState, useEffect, useRef } from 'react';
import {
  CreatePaymentRequestInput,
  PaymentCurrency,
  PaymentMethodType,
  PaymentRequest,
  ServiceCategory,
  GuestItem,
  Beneficiary
} from '../types';
import { fetchBeneficiaries } from '../services/dataService';
import { FilePreviewModal } from './FilePreviewModal';
import {
  X,
  Upload,
  Landmark,
  Sparkles,
  Building2,
  Trash2,
  Car,
  Receipt,
  Hotel,
  Plane,
  Briefcase,
  Flame,
  Eye,
  SlidersHorizontal,
  ClipboardPaste,
  Users,
  MapPin,
  Calendar,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Smartphone,
  QrCode,
  DollarSign,
  Banknote,
  Pencil,
  FileCheck,
  Search
} from 'lucide-react';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePaymentRequestInput) => Promise<void>;
  editingRequest?: PaymentRequest | null;
  beneficiaries?: Beneficiary[];
}

const POPULAR_BANKS = [
  'BANESCO',
  'BANCO DE VENEZUELA',
  'MERCANTIL',
  'BANCO PROVINCIAL (BBVA)',
  'BANCAMIGA',
  'BANCO NACIONAL DE CRÉDITO (BNC)',
  'BANPLUS',
  'BANCO EXTERIOR',
  'BANCO DEL TESORO',
  'BANCO BICENTENARIO',
  '100% BANCO',
  'BANCO CARIBE',
  'OTRO BANCO'
];

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingRequest,
  beneficiaries,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<'paste' | 'preview' | 'manual'>('paste');
  const [rawText, setRawText] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Category State
  const [category, setCategory] = useState<ServiceCategory>('hospedaje');

  // Urgent Toggle State
  const [isUrgent, setIsUrgent] = useState(false);

  // Currency & Payment Method States
  const [currency, setCurrency] = useState<PaymentCurrency>('VES');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('transferencia_bs');

  // Dynamic Multiple Guests / Passengers State
  const [guestList, setGuestList] = useState<GuestItem[]>([
    { name: '', ci: '' }
  ]);

  const handleAddGuestRow = () => {
    setGuestList(prev => [...prev, { name: '', ci: '' }]);
    setFormData(prev => ({ ...prev, people_count: prev.people_count + 1 }));
  };

  const handleRemoveGuestRow = (index: number) => {
    setGuestList(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, people_count: Math.max(1, prev.people_count - 1) }));
  };

  const handleGuestChange = (index: number, field: 'name' | 'ci', val: string) => {
    setGuestList(prev => prev.map((g, i) => i === index ? { ...g, [field]: val } : g));
  };

  // Beneficiaries list state
  const [beneficiariesList, setBeneficiariesList] = useState<Beneficiary[]>(beneficiaries || []);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (beneficiaries && beneficiaries.length > 0) {
        setBeneficiariesList(beneficiaries);
      } else {
        fetchBeneficiaries()
          .then((list) => setBeneficiariesList(list))
          .catch(() => {});
      }
    }
  }, [isOpen, beneficiaries]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    hotel_name: '',
    locator: '',
    location: '',
    room_type: '',
    people_count: 1,
    additionals: '',
    nights_dates: '',
    route_from_to: '',
    expense_concept: '',
    airline: '',
    flight_route: '',
    amount_usd: 0,
    bcv_rate: 0,
    amount_bs: 0,
    bank_beneficiary: '',
    bank_rif: '',
    bank_name: '',
    bank_account: '',
    pago_movil_phone: '',
    pago_movil_ci: '',
    binance_email: '',
    binance_pay_id: '',
    zelle_email: '',
    zelle_name: '',
    cash_receiver: '',
    notes: '',
  });

  const handleResetBeneficiary = () => {
    setSelectedBeneficiaryId('');
    setRawText('');
    setFormData((prev) => ({
      ...prev,
      title: '',
      hotel_name: '',
      airline: '',
      expense_concept: '',
      bank_beneficiary: '',
      bank_rif: '',
      bank_name: 'BANESCO',
      bank_account: '',
      pago_movil_phone: '',
      pago_movil_ci: '',
      binance_email: '',
      binance_pay_id: '',
      zelle_email: '',
      zelle_name: '',
      cash_receiver: '',
      notes: '',
    }));
  };

  const handleSelectBeneficiary = (benId: string) => {
    if (!benId) {
      handleResetBeneficiary();
      return;
    }

    setSelectedBeneficiaryId(benId);
    const ben = beneficiariesList.find((b) => b.id === benId);
    if (!ben) return;

    const bDetails = ben.bank_details;
    const targetCat = ben.category || 'hospedaje';
    const targetMethod = bDetails.payment_method || 'transferencia_bs';
    setCategory(targetCat);
    setPaymentMethod(targetMethod);

    const isDirect = targetMethod === 'binance' || targetMethod === 'zelle_usd' || targetMethod === 'efectivo_usd';
    const targetCurr = isDirect ? 'USD' : 'VES';
    setCurrency(targetCurr);

    const enrichedForm = {
      ...formData,
      hotel_name: ben.name,
      airline: targetCat === 'vuelos' ? ben.name : formData.airline,
      expense_concept: targetCat === 'gastos_apoyo' ? ben.name : formData.expense_concept,
      bank_beneficiary: ben.name,
      bank_rif: ben.rif || bDetails.rif || '',
      bank_name: bDetails.bank || 'BANESCO',
      bank_account: bDetails.account_number || '',
      pago_movil_phone: bDetails.pago_movil_phone || '',
      pago_movil_ci: bDetails.pago_movil_ci || '',
      binance_email: bDetails.binance_email || '',
      binance_pay_id: bDetails.binance_pay_id || '',
      zelle_email: bDetails.zelle_email || '',
      zelle_name: bDetails.zelle_name || '',
      cash_receiver: bDetails.cash_receiver || '',
      notes: bDetails.notes || '',
    };

    setFormData(enrichedForm);

    // Auto-llenar plantilla con los datos del servicio y solo campos faltantes
    const guide = generateStructureTemplate(targetCat, targetMethod, ben);
    setRawText(guide);
    handleAutoParseText(guide, targetCat, targetMethod, targetCurr, enrichedForm);
  };

  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [pendingSupportFile, setPendingSupportFile] = useState<File | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'confirm' | 'view'>('confirm');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    setPendingSupportFile(file);
    setPreviewMode('confirm');
    setIsPreviewModalOpen(true);
  };

  const handleConfirmSupportFile = () => {
    if (pendingSupportFile) {
      setSupportFile(pendingSupportFile);
      setPendingSupportFile(null);
    }
    setIsPreviewModalOpen(false);
  };

  const handleCancelSupportFile = () => {
    setPendingSupportFile(null);
    setIsPreviewModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenViewSupport = () => {
    setPreviewMode('view');
    setIsPreviewModalOpen(true);
  };

  const handleTriggerModifyFile = () => {
    fileInputRef.current?.click();
  };

  const handleModalPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `soporte_${Date.now()}.png`, { type: blob.type || 'image/png' });
          handleFileSelected(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const resetForm = () => {
    setLoading(false);
    setErrorMsg('');
    setShowConfirmDialog(false);
    setPendingSupportFile(null);
    setIsPreviewModalOpen(false);
    setSelectedBeneficiaryId('');
    setStep('paste');
    setRawText('');
    setCopiedTemplate(false);
    setCategory('hospedaje');
    setIsUrgent(false);
    setCurrency('VES');
    setPaymentMethod('transferencia_bs');
    setGuestList([{ name: '', ci: '' }]);
    setFormData({
      title: '',
      client: '',
      hotel_name: '',
      locator: '',
      location: '',
      room_type: '',
      people_count: 1,
      additionals: '',
      nights_dates: '',
      route_from_to: '',
      expense_concept: '',
      airline: '',
      flight_route: '',
      amount_usd: 0,
      bcv_rate: 0,
      amount_bs: 0,
      bank_beneficiary: '',
      bank_rif: '',
      bank_name: '',
      bank_account: '',
      pago_movil_phone: '',
      pago_movil_ci: '',
      binance_email: '',
      binance_pay_id: '',
      zelle_email: '',
      zelle_name: '',
      cash_receiver: '',
      notes: '',
    });
    setSupportFile(null);
  };

  useEffect(() => {
    if (isOpen && editingRequest) {
      setStep('preview');
      setCategory(editingRequest.category || 'hospedaje');
      setIsUrgent(editingRequest.status === 'urgente');
      setCurrency(editingRequest.currency || 'VES');
      setPaymentMethod(editingRequest.bank_details?.payment_method || 'transferencia_bs');

      const initialGuests: GuestItem[] = editingRequest.guest_list && editingRequest.guest_list.length > 0
        ? editingRequest.guest_list
        : (editingRequest.guest_name || '').split(',').map((name, idx) => ({
            name: name.trim(),
            ci: (editingRequest.guest_ci || '').split('/')[idx]?.trim() || ''
          }));

      setGuestList(initialGuests.length > 0 ? initialGuests : [{ name: '', ci: '' }]);

      setFormData({
        title: editingRequest.title,
        client: editingRequest.client,
        hotel_name: editingRequest.hotel_name,
        locator: editingRequest.locator,
        location: editingRequest.location,
        room_type: editingRequest.room_type,
        people_count: editingRequest.people_count,
        additionals: editingRequest.additionals,
        nights_dates: editingRequest.nights_dates,
        route_from_to: editingRequest.route_from_to || '',
        expense_concept: editingRequest.expense_concept || '',
        airline: editingRequest.airline || '',
        flight_route: editingRequest.flight_route || '',
        amount_usd: editingRequest.amount_usd,
        bcv_rate: editingRequest.bcv_rate,
        amount_bs: editingRequest.amount_bs,
        bank_beneficiary: editingRequest.bank_details?.beneficiary || '',
        bank_rif: editingRequest.bank_details?.rif || '',
        bank_name: editingRequest.bank_details?.bank || 'BANESCO',
        bank_account: editingRequest.bank_details?.account_number || '',
        pago_movil_phone: editingRequest.bank_details?.pago_movil_phone || '',
        pago_movil_ci: editingRequest.bank_details?.pago_movil_ci || '',
        binance_email: editingRequest.bank_details?.binance_email || '',
        binance_pay_id: editingRequest.bank_details?.binance_pay_id || '',
        zelle_email: editingRequest.bank_details?.zelle_email || '',
        zelle_name: editingRequest.bank_details?.zelle_name || '',
        cash_receiver: editingRequest.bank_details?.cash_receiver || '',
        notes: editingRequest.bank_details?.notes || '',
      });
    } else if (isOpen && !editingRequest) {
      resetForm();
    }
  }, [isOpen, editingRequest]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Generador dinámico de plantillas limpias según los 5 Rubros, Método de Pago o Beneficiario
  const generateStructureTemplate = (
    cat: ServiceCategory,
    method: PaymentMethodType,
    ben?: Beneficiary | null
  ): string => {
    const lines: string[] = [];
    const effectiveCat = ben?.category || cat;
    const effectiveMethod = ben?.bank_details?.payment_method || method;
    const benName = ben ? ben.name : '';

    if (effectiveCat === 'hospedaje') {
      lines.push(benName ? `Asunto: PAGO HOSPEDAJE - ${benName}` : 'Asunto: PAGO HOSPEDAJE');
      lines.push('Servicio: Hospedaje');
      lines.push('Cliente: ');
      lines.push(benName ? `Hotel: ${benName}` : 'Hotel: ');
      lines.push('Huésped: ');
      lines.push('LOC: ');
      lines.push('Ubicación: ');
      lines.push('Habitación: ');
      lines.push('Fechas: ');
      lines.push('Observacion: ');
    } else if (effectiveCat === 'traslado') {
      lines.push(benName ? `Asunto: PAGO TRASLADO EJECUTIVO - ${benName}` : 'Asunto: PAGO TRASLADO EJECUTIVO');
      lines.push('Servicio: Traslado');
      lines.push('Cliente: ');
      lines.push(benName ? `Empresa Traslado: ${benName}` : 'Empresa Traslado: ');
      lines.push('Pasajero: ');
      lines.push('LOC: ');
      lines.push('Ruta: ');
      lines.push('Fechas: ');
      lines.push('Observacion: ');
    } else if (effectiveCat === 'vuelos') {
      lines.push(benName ? `Asunto: EMISION BOLETO AEREO - ${benName}` : 'Asunto: EMISION BOLETO AEREO');
      lines.push('Servicio: Vuelos');
      lines.push('Cliente: ');
      lines.push(benName ? `Aerolínea: ${benName}` : 'Aerolínea: ');
      lines.push('Ruta: ');
      lines.push('Pasajero: ');
      lines.push('LOC: ');
      lines.push('Fechas: ');
      lines.push('Observacion: ');
    } else if (effectiveCat === 'gastos_apoyo') {
      lines.push(benName ? `Asunto: APOYO PARA GASTOS - ${benName}` : 'Asunto: APOYO PARA GASTOS');
      lines.push('Servicio: Gastos');
      lines.push('Cliente: ');
      lines.push(benName ? `Concepto: ${benName}` : 'Concepto: ');
      lines.push('Observacion: ');
    } else if (effectiveCat === 'viaticos') {
      lines.push(benName ? `Asunto: SOLICITUD DE VIATICOS - ${benName}` : 'Asunto: SOLICITUD DE VIATICOS');
      lines.push('Servicio: VIATICOS');
      lines.push('Cliente: ');
      lines.push('Usuario: ');
      lines.push('Cantidad de personas: ');
      lines.push('Fechas: ');
      lines.push('Observacion: ');
    }

    // Montos
    if (effectiveMethod === 'binance' || effectiveMethod === 'zelle_usd' || effectiveMethod === 'efectivo_usd' || effectiveMethod === 'efectivo_bs') {
      lines.push('Monto USD: ');
      lines.push(`Metodo: ${effectiveMethod === 'binance' ? 'Binance' : effectiveMethod === 'zelle_usd' ? 'Zelle' : 'Efectivo'}`);
    } else if (effectiveMethod === 'pago_movil') {
      lines.push('Monto USD: ');
      lines.push('Tasa BCV: ');
      lines.push('Metodo: Pago Movil');
    } else {
      lines.push('Monto USD: ');
      lines.push('Tasa BCV: ');
      lines.push('Metodo: Transferencia');
    }

    // Datos Bancarios del Beneficiario / Titular de la cuenta
    if (ben) {
      const bDetails = ben.bank_details;
      lines.push(`Beneficiario / Titular Cuenta: ${ben.name || bDetails?.beneficiary || ''}`);
      if (ben.rif || bDetails?.rif) {
        lines.push(`RIF: ${ben.rif || bDetails?.rif}`);
      }

      if (effectiveMethod === 'transferencia_bs') {
        lines.push(`Banco: ${bDetails?.bank || 'BANESCO'}`);
        lines.push(`Cuenta: ${bDetails?.account_number || ''}`);
      } else if (effectiveMethod === 'pago_movil') {
        lines.push(`Banco: ${bDetails?.bank || 'BANESCO'}`);
        lines.push(`Pago movil: ${bDetails?.pago_movil_phone || ''}`);
        lines.push(`Cedula PM: ${bDetails?.pago_movil_ci || ben.rif || ''}`);
      } else if (effectiveMethod === 'binance') {
        lines.push(`Pay ID: ${bDetails?.binance_pay_id || ''}`);
        lines.push(`Binance Email: ${bDetails?.binance_email || ''}`);
      } else if (effectiveMethod === 'zelle_usd') {
        lines.push(`Zelle Email: ${bDetails?.zelle_email || ''}`);
        lines.push(`Titular Zelle: ${bDetails?.zelle_name || ben.name || ''}`);
      } else if (effectiveMethod === 'efectivo_usd' || effectiveMethod === 'efectivo_bs') {
        lines.push(`Persona que recibe efectivo: ${bDetails?.cash_receiver || ben.name || ''}`);
      }
    } else {
      lines.push('Beneficiario / Titular Cuenta: ');

      if (effectiveMethod === 'transferencia_bs') {
        lines.push('RIF: ');
        lines.push('Banco: ');
        lines.push('Cuenta: ');
      } else if (effectiveMethod === 'pago_movil') {
        lines.push('Banco: ');
        lines.push('Pago movil: ');
        lines.push('Cedula PM: ');
      } else if (effectiveMethod === 'binance') {
        lines.push('Pay ID: ');
        lines.push('Binance Email: ');
      } else if (effectiveMethod === 'zelle_usd') {
        lines.push('Zelle Email: ');
      } else if (effectiveMethod === 'efectivo_usd' || effectiveMethod === 'efectivo_bs') {
        lines.push('Persona que recibe efectivo: ');
      }
    }

    return lines.join('\n');
  };

  const parseAmount = (valStr: string): number => {
    if (!valStr) return NaN;
    let cleaned = valStr.replace(/[^0-9.,]/g, '').trim();
    if (!cleaned) return NaN;

    if (cleaned.includes('.') && cleaned.includes(',')) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  };

  const parseMessageData = (textToParse: string, currentForm = formData, currentCat = category, currentMethod = paymentMethod, currentCurr = currency) => {
    if (!textToParse.trim()) return null;

    const lines = textToParse.split('\n').map((l) => l.trim());
    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^(?:[\\s•*-]*)(?:${escaped})\\s*[:=-]\\s*(.+)`, 'i');
        for (const line of lines) {
          const match = line.match(regex);
          if (match && match[1] && match[1].trim()) {
            return match[1].trim();
          }
        }
      }
      return '';
    };

    // Detect Urgency
    let detectedUrgent = isUrgent;
    if (/urgente|emergencia|prioridad\s*:\s*urgente/i.test(textToParse)) {
      detectedUrgent = true;
    }

    // Detect Service Category
    let detectedCategory: ServiceCategory = currentCat;
    if (/servicio\s*:\s*viatico|servicio\s*:\s*viáticos|viatico|viático/i.test(textToParse)) {
      detectedCategory = 'viaticos';
    } else if (/servicio\s*:\s*vuelo|vuelo|boleto|aéreo|aereo|aerolínea|aerolinea|pnr|laser|rutaca|conviasa|avior/i.test(textToParse)) {
      detectedCategory = 'vuelos';
    } else if (/servicio\s*:\s*traslado|traslado|transporte|chofer|ruta|vehiculo|vehículo|caracas\s*-\s*valencia/i.test(textToParse)) {
      detectedCategory = 'traslado';
    } else if (/servicio\s*:\s*gasto|gasto|apoyo|reembolso|caja\s*chica|alimentación/i.test(textToParse)) {
      detectedCategory = 'gastos_apoyo';
    } else if (/hospedaje|hotel|habitación|habitacion/i.test(textToParse)) {
      detectedCategory = 'hospedaje';
    }

    const parsedTitle = getValue(['Asunto', 'Titulo', 'Título', 'Pago']) || (lines[0] && !lines[0].includes(':') ? lines[0] : '');
    const parsedClient = getValue(['Cliente', 'Empresa']) || currentForm.client;

    const parsedHotel = getValue(['Hotel', 'Nombre del Hotel', 'Hospedaje', 'Empresa Traslado', 'Empresa de Traslado', 'Línea', 'Proveedor', 'Aerolínea', 'Aerolinea']);
    const parsedLocator = getValue(['LOC', 'Loc', 'Localizador', 'Reserva', 'N° Orden', 'Nro Orden', 'PNR']);
    const parsedLocation = getValue(['Ubicación', 'Ubicacion', 'Ciudad', 'Destino']);
    const parsedRoomType = getValue(['Habitación', 'Habitacion', 'Tipo', 'Vehículo', 'Vehiculo', 'Clase']);
    const parsedPeople = getValue(['Cantidad de personas', 'Cant. Personas', 'Cant Personas', 'Personas', 'Huéspedes', 'Pasajeros']);
    const parsedNightsDates = getValue(['Fechas', 'Noches', 'Periodo', 'Check-in', 'Fecha Traslado', 'Fecha']);
    const parsedAdditionals = getValue(['Observacion', 'Observación', 'Observaciones', 'Adicionales', 'Adicional', 'Servicios', 'Detalles']);

    const parsedRoute = getValue(['Ruta', 'Origen - Destino', 'Trayecto']);
    const parsedExpenseConcept = getValue(['Concepto', 'Detalle Gasto', 'Justificación']);

    const rawBs = getValue(['Monto BS', 'Monto en BS', 'Monto Bolivares', 'Monto Bolívares', 'Monto en Bolívares', 'Monto Local', 'BS', 'Bs.']);
    const numBsParsed = rawBs ? parseAmount(rawBs) : NaN;

    const rawUsd = getValue(['Monto USD', 'Monto en USD', 'Monto Divisas', 'Monto en Divisas', 'Monto ($)', 'Monto', 'USD', '\\$']);
    let numUsd = rawUsd ? parseAmount(rawUsd) : currentForm.amount_usd;

    const rawBcv = getValue(['Tasa BCV', 'Tasa de Cambio', 'Tasa', 'BCV']);
    let numBcv = rawBcv ? parseAmount(rawBcv) : currentForm.bcv_rate;

    let finalBs = !isNaN(numBsParsed) ? numBsParsed : NaN;

    if (!isNaN(finalBs) && !isNaN(numBcv) && (isNaN(numUsd) || numUsd === 0) && numBcv > 0) {
      numUsd = Number((finalBs / numBcv).toFixed(2));
    } else if (!isNaN(numUsd) && !isNaN(numBcv) && isNaN(finalBs)) {
      finalBs = Number((numUsd * numBcv).toFixed(2));
    } else if (!isNaN(numUsd) && !isNaN(finalBs) && (isNaN(numBcv) || numBcv === 0) && numUsd > 0) {
      numBcv = Number((finalBs / numUsd).toFixed(4));
    }

    const parsedBeneficiary = getValue([
      'Beneficiario / Titular Cuenta',
      'Beneficiario / Titular de Cuenta',
      'Beneficiario / Titular',
      'Beneficiario',
      'Titular de Cuenta',
      'Titular Cuenta',
      'Titular',
      'A Nombre de',
      'Nombre Beneficiario'
    ]);

    let parsedRif = getValue(['RIF / CI', 'RIF/CI', 'RIF Beneficiario', 'RIF', 'Rif', 'Cédula / RIF', 'Cedula / RIF', 'CI Beneficiario']);
    if (!parsedRif) {
      const rifMatch = textToParse.match(/\b([VEJPGvejpg]-?\s*\d{7,9}-?\d?)\b/i);
      if (rifMatch) {
        parsedRif = rifMatch[1].toUpperCase().replace(/\s+/g, '');
      }
    }

    const parsedBank = getValue(['Banco / Entidad', 'Banco', 'Entidad Bancaria', 'Entidad']);
    
    let parsedAccount = getValue([
      'Cuenta Bancaria',
      'N° Cuenta Bancaria',
      'N° de Cuenta',
      'No. Cuenta',
      'N° Cuenta',
      'Numero de Cuenta',
      'Número de Cuenta',
      'Nro de Cuenta',
      'Nro. Cuenta',
      'Cuenta'
    ]);

    // Fallback: search for 20-digit bank account anywhere in the text
    if (!parsedAccount || parsedAccount.replace(/[^0-9]/g, '').length < 10) {
      const accMatch = textToParse.match(/\b(0\d{3}[-\s]?\d{4}[-\s]?\d{2}[-\s]?\d{10}|\d{20})\b/);
      if (accMatch) {
        parsedAccount = accMatch[1].replace(/[^0-9]/g, '');
      }
    }

    const parsedPagoMovilPhone = getValue(['Pago movil', 'Pago móvil', 'Teléfono PM', 'Telefono PM', 'Telefono', 'Teléfono']);
    const parsedPagoMovilCi = getValue(['Cedula PM', 'Cédula PM', 'Cedula Pago Movil', 'Cédula Pago Móvil', 'CI PM']) || getValue(['Cedula', 'Cédula']);

    let parsedBinanceEmail = getValue([
      'Binance Email',
      'Correo Binance',
      'Email Binance',
      'Binance ID Email',
      'Correo de Binance',
      'Email de Binance',
      'Binance User',
      'Usuario Binance'
    ]);

    let parsedBinancePayId = getValue([
      'Binance Pay ID',
      'Pay ID Binance',
      'Pay ID',
      'PayID',
      'Binance ID',
      'Pay ID / Binance',
      'ID Binance',
      'Pay ID / ID'
    ]);

    let parsedZelleEmail = getValue([
      'Email Zelle',
      'Correo Zelle',
      'Zelle Email',
      'Correo de Zelle',
      'Email de Zelle',
      'Zelle'
    ]);

    const parsedZelleName = getValue([
      'Titular Zelle',
      'Nombre Zelle',
      'Zelle Name',
      'Titular de Zelle',
      'Beneficiario Zelle'
    ]);

    const parsedCashReceiver = getValue([
      'Persona que recibe efectivo',
      'Persona que recibe el efectivo',
      'Responsable Efectivo',
      'Persona que recibe',
      'Entregar a',
      'Receptor Efectivo',
      'Persona Efectivo',
      'Receptor de Efectivo'
    ]);

    // Detect Payment Method & Currency Automatically
    const explicitMethod = getValue(['Metodo de Pago', 'Método de Pago', 'Metodo', 'Método', 'Forma de Pago']);
    let detectedMethod: PaymentMethodType = currentMethod;
    let detectedCurrency: PaymentCurrency = currentCurr;

    if (explicitMethod) {
      if (/binance/i.test(explicitMethod)) {
        detectedMethod = 'binance';
        detectedCurrency = 'USD';
      } else if (/zelle/i.test(explicitMethod)) {
        detectedMethod = 'zelle_usd';
        detectedCurrency = 'USD';
      } else if (/efectivo/i.test(explicitMethod)) {
        detectedMethod = 'efectivo_usd';
        detectedCurrency = 'USD';
      } else if (/pago\s*m[oó]vil|pm/i.test(explicitMethod)) {
        detectedMethod = 'pago_movil';
        detectedCurrency = 'VES';
      } else if (/transferencia|banco|cuenta|bs/i.test(explicitMethod)) {
        detectedMethod = 'transferencia_bs';
        detectedCurrency = 'VES';
      }
    } else {
      if (parsedBinanceEmail || parsedBinancePayId || /\bbinance\b/i.test(textToParse)) {
        detectedMethod = 'binance';
        detectedCurrency = 'USD';
      } else if (parsedZelleEmail || /\bzelle\b/i.test(textToParse)) {
        detectedMethod = 'zelle_usd';
        detectedCurrency = 'USD';
      } else if (parsedCashReceiver || /\befectivo\b/i.test(textToParse)) {
        detectedMethod = 'efectivo_usd';
        detectedCurrency = 'USD';
      } else if (parsedPagoMovilPhone || /pago\s*móvil|pago\s*movil|\bpm\b/i.test(textToParse)) {
        if (!parsedAccount) {
          detectedMethod = 'pago_movil';
          detectedCurrency = 'VES';
        }
      } else if (parsedAccount && parsedAccount.replace(/[^0-9]/g, '').length >= 10) {
        detectedMethod = 'transferencia_bs';
        detectedCurrency = 'VES';
      }
    }

    if (/divisa|solo\s*usd|usdt|binance|zelle/i.test(textToParse) && (!rawBcv || numBcv === 0)) {
      detectedCurrency = 'USD';
    } else if (rawBcv && numBcv > 0) {
      detectedCurrency = 'VES';
    }

    // Fallbacks for Binance / Zelle
    if (!parsedBinancePayId && (detectedMethod === 'binance' || /binance/i.test(textToParse))) {
      const payIdMatch = textToParse.match(/(?:pay\s*id|binance\s*id|payid)\s*[:=-]?\s*(\d{5,12})/i);
      if (payIdMatch) {
        parsedBinancePayId = payIdMatch[1];
      }
    }

    if (!parsedBinanceEmail && (detectedMethod === 'binance' || /binance/i.test(textToParse))) {
      const emailMatch = textToParse.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
      if (emailMatch && !/tppagos|travelpoint/i.test(emailMatch[1])) {
        parsedBinanceEmail = emailMatch[1];
      }
    }

    if (!parsedZelleEmail && (detectedMethod === 'zelle_usd' || /zelle/i.test(textToParse))) {
      const emailMatch = textToParse.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
      if (emailMatch && !/tppagos|travelpoint/i.test(emailMatch[1])) {
        parsedZelleEmail = emailMatch[1];
      }
    }

    // Multi-line Guest / Passenger / Usuario Parsing
    const parsedGuests: GuestItem[] = [];
    const guestHeaderIdx = lines.findIndex(l => /^Huésped|^Huesped|^Pasajeros|^Pasajero|^Huéspedes|^Huespedes|^Nombres\s*:|^Usuario\s*:/i.test(l));
    if (guestHeaderIdx !== -1) {
      const headerLine = lines[guestHeaderIdx];
      const inlineVal = headerLine.replace(/^Huésped(?:es)?|^Huesped(?:es)?|^Pasajero(?:s)?|^Nombres|^Usuario/i, '').replace(/^[:=-]\s*/, '').trim();

      const candidateRaw: string[] = [];
      if (inlineVal) candidateRaw.push(inlineVal);

      for (let i = guestHeaderIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (!l) continue;
        if (/^(LOC|PNR|Ubicación|Ubicacion|Habitación|Habitacion|Personas|Cantidad|Fechas|Observacion|Observación|Observaciones|Adicionales|Monto|Tasa|Beneficiario|RIF|Banco|Cuenta|Pago movil|Pago móvil|Cedula PM|Cédula PM|Binance|Zelle|Pay ID|Ruta|Concepto)/i.test(l)) {
          break;
        }
        candidateRaw.push(l);
      }

      const allLines: string[] = [];
      for (const raw of candidateRaw) {
        if (raw.includes(',') && !/\bC\.?A\.?\b/i.test(raw)) {
          raw.split(',').forEach(sub => sub.trim() && allLines.push(sub.trim()));
        } else if (raw.includes(';') && !/\bC\.?A\.?\b/i.test(raw)) {
          raw.split(';').forEach(sub => sub.trim() && allLines.push(sub.trim()));
        } else {
          allLines.push(raw.trim());
        }
      }

      for (const lineStr of allLines) {
        const cleaned = lineStr.replace(/^[\d]+[\.\)\-]\s*|^[\-\*•]\s*/, '').trim();
        if (!cleaned) continue;

        // Match format: JENFRI CHIRINOS C.I: 13.480.283 or Name V-123456
        const ciPattern = /(?:C\.?I\.?|CI|Cédula|Cedula|V-?)\s*[:=-]?\s*([VEJPGvejpg\d.-]+)/i;
        const ciMatch = cleaned.match(ciPattern);

        if (ciMatch) {
          const namePart = cleaned.replace(ciPattern, '').replace(/[\(\[\{]/g, '').trim();
          const ciPart = ciMatch[1].replace(/[\)\]\}]/g, '').trim();
          parsedGuests.push({
            name: namePart.replace(/^[:=-]\s*/, '').trim(),
            ci: ciPart
          });
        } else {
          const match = cleaned.match(/^(.+?)(?:\s+|-|\/|\()([VEJPGvejjpg]-?\s*[\d.]{5,12}|\b\d{7,10}\b)\)?$/i);
          if (match) {
            parsedGuests.push({
              name: match[1].replace(/[\(\[\{]/g, '').trim(),
              ci: match[2].replace(/[\)\]\}]/g, '').trim()
            });
          } else {
            parsedGuests.push({ name: cleaned, ci: '' });
          }
        }
      }
    }

    // Direct Usuario fallback if not found in guest list
    const rawUsuario = getValue(['Usuario', 'Usuario Solicitante', 'Responsable']);
    if (rawUsuario && parsedGuests.length === 0) {
      const ciMatch = rawUsuario.match(/(?:C\.?I\.?|CI|Cédula|Cedula|V-?)\s*[:=-]?\s*([VEJPGvejpg\d.-]+)/i);
      let nameOnly = rawUsuario;
      let ciOnly = '';
      if (ciMatch) {
        ciOnly = ciMatch[1].replace(/[^0-9VEJPGvejpg]/gi, '').trim();
        nameOnly = rawUsuario.replace(/(?:C\.?I\.?|CI|Cédula|Cedula|V-?)\s*[:=-]?\s*[VEJPGvejpg\d.-]+/i, '').trim();
      }
      parsedGuests.push({
        name: nameOnly.replace(/^[:=-]\s*/, '').trim(),
        ci: ciOnly.trim()
      });
    }

    const defaultTitle =
      detectedCategory === 'viaticos'
        ? (parsedClient ? `SOLICITUD DE VIATICOS - ${parsedClient}` : 'SOLICITUD DE VIATICOS')
        : detectedCategory === 'gastos_apoyo'
        ? (parsedExpenseConcept ? `APOYO PARA GASTOS - ${parsedExpenseConcept}` : 'APOYO PARA GASTOS')
        : detectedCategory === 'traslado'
        ? (parsedHotel ? `PAGO TRASLADO EJECUTIVO - ${parsedHotel}` : 'PAGO TRASLADO EJECUTIVO')
        : detectedCategory === 'vuelos'
        ? (parsedHotel ? `EMISION BOLETO AEREO - ${parsedHotel}` : 'EMISION BOLETO AEREO')
        : (parsedHotel ? `PAGO HOSPEDAJE - ${parsedHotel}` : 'PAGO HOSPEDAJE');

    const isTraslado = detectedCategory === 'traslado';
    const isVuelos = detectedCategory === 'vuelos';
    const isGastos = detectedCategory === 'gastos_apoyo';
    const isViaticos = detectedCategory === 'viaticos';

    const selectedBen = selectedBeneficiaryId ? beneficiariesList.find(b => b.id === selectedBeneficiaryId) : null;
    const benDetails = selectedBen?.bank_details;

    const finalBeneficiary = parsedBeneficiary || (selectedBen ? selectedBen.name : '');
    const finalRif = parsedRif || (selectedBen ? (selectedBen.rif || benDetails?.rif || '') : '');
    const finalBank = (parsedBank ? parsedBank.toUpperCase() : '') || (selectedBen ? (benDetails?.bank || 'BANESCO') : (currentForm.bank_name || 'BANESCO'));
    const finalAccount = (parsedAccount ? parsedAccount.replace(/[^0-9-]/g, '') : '') || (selectedBen ? (benDetails?.account_number || '') : (parsedAccount ? parsedAccount.replace(/[^0-9-]/g, '') : ''));
    const finalPmPhone = (parsedPagoMovilPhone ? parsedPagoMovilPhone.replace(/[^0-9]/g, '') : '') || (selectedBen ? (benDetails?.pago_movil_phone || '') : '');
    const finalPmCi = parsedPagoMovilCi || (selectedBen ? (benDetails?.pago_movil_ci || '') : '');
    const finalBinanceEmail = parsedBinanceEmail || (selectedBen ? (benDetails?.binance_email || '') : '');
    const finalBinancePayId = parsedBinancePayId || (selectedBen ? (benDetails?.binance_pay_id || '') : '');
    const finalZelleEmail = parsedZelleEmail || (selectedBen ? (benDetails?.zelle_email || '') : '');
    const finalZelleName = parsedZelleName || (selectedBen ? (benDetails?.zelle_name || '') : '');
    const finalCashReceiver = parsedCashReceiver || (selectedBen ? (benDetails?.cash_receiver || '') : '');

    const finalHotel = isViaticos ? 'VIATICOS' : isGastos ? (parsedExpenseConcept || (selectedBen ? selectedBen.name : 'GASTOS')) : (parsedHotel || (selectedBen ? selectedBen.name : ''));

    const updatedFormData = {
      ...currentForm,
      title: parsedTitle || defaultTitle,
      client: parsedClient || currentForm.client,
      hotel_name: finalHotel,
      locator: parsedLocator || currentForm.locator,
      location: parsedLocation || currentForm.location,
      room_type: parsedRoomType || currentForm.room_type,
      people_count: parsedPeople ? parseInt(parsedPeople) || currentForm.people_count : (parsedGuests.length > 0 ? parsedGuests.length : currentForm.people_count),
      nights_dates: parsedNightsDates || currentForm.nights_dates,
      additionals: parsedAdditionals || currentForm.additionals,
      route_from_to: isTraslado ? (parsedRoute || currentForm.route_from_to) : '',
      flight_route: isVuelos ? (parsedRoute || currentForm.flight_route) : '',
      airline: isVuelos ? (parsedHotel || currentForm.airline || selectedBen?.name || '') : '',
      expense_concept: isGastos ? (parsedExpenseConcept || currentForm.expense_concept || selectedBen?.name || '') : '',
      amount_usd: isNaN(numUsd) ? currentForm.amount_usd : numUsd,
      bcv_rate: isNaN(numBcv) ? currentForm.bcv_rate : numBcv,
      amount_bs: !isNaN(finalBs) ? finalBs : (!isNaN(numUsd) && !isNaN(numBcv) ? Number((numUsd * numBcv).toFixed(2)) : currentForm.amount_bs),
      bank_beneficiary: finalBeneficiary,
      bank_rif: finalRif,
      bank_name: finalBank,
      bank_account: finalAccount,
      pago_movil_phone: finalPmPhone,
      pago_movil_ci: finalPmCi,
      binance_email: finalBinanceEmail,
      binance_pay_id: finalBinancePayId,
      zelle_email: finalZelleEmail,
      zelle_name: finalZelleName,
      cash_receiver: finalCashReceiver,
    };

    return {
      updatedFormData,
      detectedCategory,
      detectedMethod,
      detectedCurrency,
      detectedUrgent,
      parsedGuests
    };
  };

  const handleAutoParseText = (
    textToParse: string,
    targetCat = category,
    targetMethod = paymentMethod,
    targetCurr = currency,
    overrideForm?: typeof formData
  ) => {
    const formToUse = overrideForm || formData;
    const result = parseMessageData(textToParse, formToUse, targetCat, targetMethod, targetCurr);
    if (!result) return;

    if (result.detectedUrgent) setIsUrgent(true);
    setCategory(result.detectedCategory);
    setPaymentMethod(result.detectedMethod);
    setCurrency(result.detectedCurrency);
    if (result.parsedGuests.length > 0) {
      setGuestList(result.parsedGuests);
    }
    setFormData(result.updatedFormData);
  };

  const handleApplyTemplate = (newCat: ServiceCategory, newMethod: PaymentMethodType) => {
    setCategory(newCat);
    setPaymentMethod(newMethod);
    const isDirect = newMethod === 'binance' || newMethod === 'zelle_usd' || newMethod === 'efectivo_usd';
    const newCurr = isDirect ? 'USD' : 'VES';
    setCurrency(newCurr);
    const ben = beneficiariesList.find((b) => b.id === selectedBeneficiaryId);
    const text = generateStructureTemplate(newCat, newMethod, ben);
    try {
      navigator.clipboard?.writeText(text);
    } catch (e) {
      // Ignore clipboard focus errors
    }
    setCopiedTemplate(true);
    setRawText(text);
    handleAutoParseText(text, newCat, newMethod, newCurr);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleGoToPreview = () => {
    setErrorMsg('');
    if (!rawText.trim()) {
      setErrorMsg('⚠️ Por favor pega el texto de la reserva o pago (WhatsApp o Correo) para continuar.');
      return;
    }

    const parsed = parseMessageData(rawText, formData, category, paymentMethod, currency);
    if (parsed) {
      if (parsed.detectedUrgent) setIsUrgent(true);
      setCategory(parsed.detectedCategory);
      setPaymentMethod(parsed.detectedMethod);
      setCurrency(parsed.detectedCurrency);
      if (parsed.parsedGuests.length > 0) {
        setGuestList(parsed.parsedGuests);
      }
      setFormData(parsed.updatedFormData);
    }

    setStep('preview');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const isGastos = category === 'gastos_apoyo';
    const firstGuest = guestList[0];
    const mainTitle = formData.title || (
      category === 'traslado' ? `TRASLADO ${formData.hotel_name || 'EJECUTIVO'}` :
      category === 'vuelos' ? `BOLETO AEREO ${formData.hotel_name || 'VUELO'}` :
      category === 'gastos_apoyo' ? `APOYO ${formData.expense_concept || 'GASTOS'}` :
      category === 'viaticos' ? `SOLICITUD DE VIATICOS ${formData.client ? `- ${formData.client}` : ''}` :
      `HOSPEDAJE ${formData.hotel_name || 'HOTEL'}`
    );

    if (!mainTitle || (!isGastos && (!firstGuest?.name?.trim() || !formData.nights_dates))) {
      setErrorMsg(
        category === 'viaticos'
          ? '⚠️ Por favor completa los campos requeridos (*), incluyendo Usuario (Nombre y C.I.) y Fechas.'
          : '⚠️ Por favor completa los campos requeridos (*), incluyendo al menos Nombre del Huésped / Pasajero y Fecha.'
      );
      return;
    }

    if (!formData.client || !formData.client.trim()) {
      if (!isGastos) {
        setErrorMsg('⚠️ Falta el Cliente / Empresa: Por favor indica el cliente de la solicitud.');
        return;
      }
    }

    // Validar Montos en Bolívares o Divisas
    const numUsd = Number(formData.amount_usd) || 0;
    const numBs = Number(formData.amount_bs) || 0;

    if (currency === 'USD') {
      if (numUsd <= 0) {
        setErrorMsg('⚠️ Por favor coloca el monto en divisas (USD / USDT) a pagar.');
        return;
      }
    } else {
      if (numBs <= 0 && numUsd <= 0) {
        setErrorMsg('⚠️ Por favor coloca el monto a pagar en Bolívares o USD con su tasa de cambio.');
        return;
      }
    }

    // Validar Beneficiario
    if (!formData.bank_beneficiary || !formData.bank_beneficiary.trim()) {
      setErrorMsg('⚠️ Por favor ingresa el Nombre del Beneficiario o Titular de la cuenta de destino.');
      return;
    }

    // Validar Cuenta de Destino según método
    if (paymentMethod === 'transferencia_bs' && (!formData.bank_account || !formData.bank_account.trim())) {
      setErrorMsg('⚠️ Falta la Cuenta de Destino: Ingresa el N° de Cuenta Bancaria (20 dígitos) para la transferencia en Bolívares.');
      return;
    }

    if (paymentMethod === 'pago_movil' && (!formData.pago_movil_phone?.trim() || !formData.pago_movil_ci?.trim())) {
      setErrorMsg('⚠️ Faltan datos de Pago Móvil: Por favor ingresa el Teléfono y Cédula/RIF de destino.');
      return;
    }

    if (paymentMethod === 'binance' && (!formData.binance_email?.trim() && !formData.binance_pay_id?.trim())) {
      setErrorMsg('⚠️ Faltan datos de Binance: Ingresa el Pay ID o Correo Electrónico de Binance para el pago en divisas.');
      return;
    }

    if (paymentMethod === 'zelle_usd' && (!formData.zelle_email?.trim() && !formData.bank_account?.trim())) {
      setErrorMsg('⚠️ Faltan datos de Zelle: Ingresa el Correo Electrónico de Zelle para el pago en divisas.');
      return;
    }

    if ((paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && !formData.cash_receiver?.trim()) {
      setErrorMsg('⚠️ Falta indicar el responsable o persona que recibirá el efectivo.');
      return;
    }

    // Abrir Modal de Confirmación de Seguridad
    setShowConfirmDialog(true);
  };

  const executeSubmit = async () => {
    setShowConfirmDialog(false);
    setErrorMsg('');

    const isGastos = category === 'gastos_apoyo';
    const mainTitle = formData.title || (
      category === 'traslado' ? `TRASLADO ${formData.hotel_name || 'EJECUTIVO'}` :
      category === 'vuelos' ? `BOLETO AEREO ${formData.hotel_name || 'VUELO'}` :
      category === 'gastos_apoyo' ? `APOYO ${formData.expense_concept || 'GASTOS'}` :
      category === 'viaticos' ? `SOLICITUD DE VIATICOS ${formData.client ? `- ${formData.client}` : ''}` :
      `HOSPEDAJE ${formData.hotel_name || 'HOTEL'}`
    );

    const fullGuestNames = isGastos ? '' : guestList.map(g => g.name.trim()).filter(Boolean).join(', ');
    const fullGuestCis = isGastos ? '' : guestList.map(g => g.ci.trim()).filter(Boolean).join(' / ');
    const effectiveGuestList = isGastos ? [] : guestList;

    try {
      setLoading(true);
      await onSubmit({
        category,
        title: mainTitle.toUpperCase(),
        client: (formData.client || (isGastos ? 'INTERNO' : 'SIN ESPECIFICAR')).toUpperCase(),
        hotel_name: (formData.hotel_name || (category === 'traslado' ? 'SERVICIO TRASLADO' : category === 'vuelos' ? 'AEROLINEA' : category === 'gastos_apoyo' ? (formData.expense_concept || 'GASTOS') : category === 'viaticos' ? 'VIATICOS' : 'HOTEL')).toUpperCase(),
        guest_name: fullGuestNames,
        guest_ci: fullGuestCis,
        guest_list: effectiveGuestList,
        locator: formData.locator || String(Math.floor(10000000 + Math.random() * 90000000)),
        location: (formData.location || 'VENEZUELA').toUpperCase(),
        room_type: isGastos ? 'N/A' : formData.room_type,
        people_count: isGastos ? 1 : (guestList.length > 0 ? guestList.length : Number(formData.people_count)),
        additionals: formData.additionals,
        nights_dates: formData.nights_dates || (isGastos ? new Date().toLocaleDateString() : 'N/A'),
        route_from_to: formData.route_from_to,
        flight_route: formData.flight_route,
        airline: formData.airline,
        expense_concept: formData.expense_concept,
        currency,
        amount_usd: Number(formData.amount_usd),
        bcv_rate: currency === 'USD' ? 0 : Number(formData.bcv_rate),
        amount_bs: currency === 'USD' ? 0 : Number(formData.amount_bs || (formData.amount_usd * formData.bcv_rate)),
        status: isUrgent ? 'urgente' : 'en_proceso',
        is_urgent: isUrgent,
        bank_details: {
          payment_method: paymentMethod,
          beneficiary: formData.bank_beneficiary.toUpperCase(),
          rif: formData.bank_rif.toUpperCase(),
          bank: formData.bank_name,
          account_number: formData.bank_account,
          pago_movil_phone: formData.pago_movil_phone,
          pago_movil_ci: formData.pago_movil_ci,
          binance_email: formData.binance_email,
          binance_pay_id: formData.binance_pay_id,
          zelle_email: formData.zelle_email,
          zelle_name: formData.zelle_name,
          cash_receiver: formData.cash_receiver,
          notes: formData.notes
        },
        support_file: supportFile,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div
      onPaste={handleModalPaste}
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in focus:outline-none"
    >
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-modal max-h-[92vh] flex flex-col my-auto text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10 rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#00b4a2] flex items-center justify-center border border-teal-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                {editingRequest ? `Editar Solicitud #${editingRequest.locator}` : 'Nueva Solicitud de Pago'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {step === 'paste'
                  ? 'Paso 1: Pega la información de la reserva'
                  : 'Paso 2: Revisa la ficha y confirma la solicitud'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-2.5 shadow-2xs animate-shake">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mt-1 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 1: PEGA AQUÍ EL TEXTO (AMPLIO Y CÓMODO)                              */}
          {/* ========================================================================= */}
          {step === 'paste' && (
            <div className="space-y-4 animate-fade-in">
              {/* Beneficiary Quick Selector at Top */}
              <div className="bg-teal-50/50 rounded-2xl border border-teal-200/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#00b4a2]" />
                    <span>Seleccionar Beneficiario de la Base de Datos:</span>
                  </label>
                  <span className="text-[10px] text-teal-700 font-medium">
                    {selectedBeneficiaryId ? '✨ Datos bancarios vinculados automáticamente' : 'Autocompleta el servicio y datos de pago'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-teal-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedBeneficiaryId}
                      onChange={(e) => handleSelectBeneficiary(e.target.value)}
                      className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer truncate ${
                        selectedBeneficiaryId
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/20'
                          : 'bg-white border-teal-300 text-slate-800'
                      }`}
                    >
                      <option value="">🔍 Seleccionar un beneficiario de la base de datos...</option>
                      {beneficiariesList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.rif ? `(${b.rif})` : ''} • {b.category ? b.category.toUpperCase() : 'HOSPEDAJE'} • {b.bank_details.bank || b.bank_details.payment_method}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBeneficiaryId && (
                    <button
                      type="button"
                      onClick={handleResetBeneficiary}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                      title="Deseleccionar y mostrar selectores manuales"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Restablecer</span>
                    </button>
                  )}
                </div>

                {selectedBeneficiaryId && (
                  <div className="p-3 bg-emerald-50/90 rounded-2xl border-2 border-emerald-300 text-xs text-emerald-950 space-y-1.5 animate-fade-in shadow-2xs">
                    <div className="flex items-center justify-between gap-2 border-b border-emerald-200/80 pb-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-extrabold text-slate-900 text-xs">
                          {formData.bank_beneficiary || formData.hotel_name}
                        </span>
                        {formData.bank_rif && (
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {formData.bank_rif}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                        ✨ Datos Bancarios Vinculados
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-700">
                      <div>
                        <span className="text-slate-500 font-semibold">Banco: </span>
                        <strong className="text-slate-900">{formData.bank_name || 'BANESCO'}</strong>
                      </div>
                      {paymentMethod === 'transferencia_bs' && (
                        <div>
                          <span className="text-slate-500 font-semibold">Cuenta: </span>
                          <strong className="font-mono text-emerald-900 font-bold">{formData.bank_account || 'Sin cuenta'}</strong>
                        </div>
                      )}
                      {paymentMethod === 'pago_movil' && (
                        <div>
                          <span className="text-slate-500 font-semibold">Pago Móvil: </span>
                          <strong className="font-mono text-emerald-900 font-bold">{formData.pago_movil_phone} ({formData.pago_movil_ci})</strong>
                        </div>
                      )}
                      {paymentMethod === 'binance' && (
                        <div>
                          <span className="text-slate-500 font-semibold">Binance: </span>
                          <strong className="font-mono text-emerald-900 font-bold">{formData.binance_pay_id || formData.binance_email}</strong>
                        </div>
                      )}
                      {paymentMethod === 'zelle_usd' && (
                        <div>
                          <span className="text-slate-500 font-semibold">Zelle: </span>
                          <strong className="font-mono text-emerald-900 font-bold">{formData.zelle_email} ({formData.zelle_name})</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Textarea Container */}
              <div className="bg-teal-50/50 rounded-2xl border border-teal-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-[#00b4a2]" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                      1. Pega aquí el texto del mensaje (WhatsApp o Correo):
                    </span>
                  </div>

                  {/* SI hay beneficiario seleccionado: OCULTAR SELECTORES Y MOSTRAR BADGE DEL SERVICIO */}
                  {selectedBeneficiaryId ? (
                    <div className="flex flex-wrap items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-teal-300 shadow-2xs animate-fade-in">
                      <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                        {category === 'traslado' ? '🚗 Traslado' : category === 'vuelos' ? '✈️ Vuelos' : category === 'gastos_apoyo' ? '🧾 Gastos' : category === 'viaticos' ? '💼 Viáticos' : '🏨 Hospedaje'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {paymentMethod === 'binance' ? '💰 Binance' : paymentMethod === 'zelle_usd' ? '💵 Zelle' : paymentMethod === 'pago_movil' ? '📱 Pago Móvil' : paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs' ? '💵 Efectivo' : '🏦 Transferencia'}
                      </span>
                    </div>
                  ) : (
                    /* SI NO hay beneficiario seleccionado: MOSTRAR SELECTORES DE RUBRO Y MÉTODO DE PAGO */
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {/* Selector 1: Rubro */}
                      <select
                        value={category}
                        onChange={(e) => handleApplyTemplate(e.target.value as ServiceCategory, paymentMethod)}
                        className="bg-white border-2 border-teal-300 hover:border-[#00b4a2] text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00b4a2]/20 shadow-2xs cursor-pointer"
                        title="Seleccionar Rubro del Servicio"
                      >
                        <option value="hospedaje">🏨 Hospedaje / Hotel</option>
                        <option value="traslado">🚗 Traslado Ejecutivo</option>
                        <option value="vuelos">✈️ Vuelo / Boleto</option>
                        <option value="gastos_apoyo">🧾 Gastos de Apoyo</option>
                        <option value="viaticos">💼 Solicitud de Viáticos</option>
                      </select>

                      {/* Selector 2: Método de Pago */}
                      <select
                        value={paymentMethod}
                        onChange={(e) => handleApplyTemplate(category, e.target.value as PaymentMethodType)}
                        className="bg-white border-2 border-teal-300 hover:border-[#00b4a2] text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00b4a2]/20 shadow-2xs cursor-pointer"
                        title="Seleccionar Método de Pago"
                      >
                        <option value="transferencia_bs">🏦 Transferencia (Bs)</option>
                        <option value="pago_movil">📱 Pago Móvil (Bs)</option>
                        <option value="binance">💰 Binance (USDT)</option>
                        <option value="zelle_usd">💵 Zelle (USD)</option>
                        <option value="efectivo_usd">💵 Efectivo ($ / Bs)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(category, paymentMethod)}
                        className="px-2.5 py-1.5 bg-[#00b4a2] hover:bg-[#009b8b] text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                        title="Cargar y Copiar la estructura guía en la caja de texto"
                      >
                        {copiedTemplate ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>¡Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Cargar Guía</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Caja de Texto Grande y Cómoda */}
                <textarea
                  rows={7}
                  placeholder={
                    selectedBeneficiaryId
                      ? `Ejemplo para ${formData.bank_beneficiary || 'este beneficiario'} (Solo datos faltantes):\n\n` +
                        generateStructureTemplate(category, paymentMethod, beneficiariesList.find(b => b.id === selectedBeneficiaryId))
                      : `Ejemplo de texto:\n\nAsunto: PAGO PENDIENTE EXTENSION KARIÑA\nCliente: G1\nHotel: HOTEL KARIÑA PUNTA DE MATA\nHuésped: José Gregorio Hernández V-18.452.910\nLOC: 00000015\nFechas: 22/07 AL 27/07\nMonto USD: 450\nTasa BCV: 737.88\nBeneficiario: INVERSIONES HOTEL KARIÑA C.A.\nBanco: BANESCO\nCuenta: 01340034120341098234`
                  }
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    handleAutoParseText(e.target.value);
                  }}
                  className="w-full bg-white border border-teal-300 rounded-2xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00b4a2] font-mono shadow-2xs leading-relaxed min-h-[170px]"
                />
              </div>

              {/* Live Detection Summary Pill (Solo si hay texto pegado) */}
              {rawText.trim() && (
                <div className="bg-white p-3 rounded-2xl border border-teal-200 shadow-2xs space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] text-teal-800 font-bold border-b border-teal-100 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#00b4a2]" />
                      <span>Información detectada del mensaje:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Podrás revisar y editar cada detalle en el siguiente paso
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {/* Badge Método de Pago */}
                    <span className="bg-slate-900 text-white px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                      {paymentMethod === 'binance' ? '💰 Binance USDT' :
                       paymentMethod === 'zelle_usd' ? '💵 Zelle USD' :
                       paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs' ? '💵 Efectivo' :
                       paymentMethod === 'pago_movil' ? '📱 Pago Móvil' :
                       '🏦 Transferencia Bs.'}
                    </span>

                    {formData.client && (
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-bold">
                        🏢 {formData.client}
                      </span>
                    )}

                    {formData.bank_beneficiary && (
                      <span className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl text-teal-900 font-bold">
                        👤 {formData.bank_beneficiary}
                      </span>
                    )}

                    {/* Transferencia Bancaria */}
                    {paymentMethod === 'transferencia_bs' && formData.bank_name && (
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-bold">
                        🏦 {formData.bank_name}
                      </span>
                    )}
                    {paymentMethod === 'transferencia_bs' && formData.bank_account && (
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-mono font-bold">
                        💳 ••••{formData.bank_account.slice(-4)}
                      </span>
                    )}

                    {/* Pago Móvil */}
                    {paymentMethod === 'pago_movil' && formData.bank_name && (
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-bold">
                        🏦 {formData.bank_name}
                      </span>
                    )}
                    {paymentMethod === 'pago_movil' && formData.pago_movil_phone && (
                      <span className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl text-teal-900 font-bold">
                        📱 PM: {formData.pago_movil_phone}
                      </span>
                    )}
                    {paymentMethod === 'pago_movil' && formData.pago_movil_ci && (
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-bold">
                        🪪 {formData.pago_movil_ci}
                      </span>
                    )}

                    {/* Binance */}
                    {paymentMethod === 'binance' && formData.binance_pay_id && (
                      <span className="bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl text-amber-900 font-mono font-bold">
                        🆔 Pay ID: {formData.binance_pay_id}
                      </span>
                    )}
                    {paymentMethod === 'binance' && formData.binance_email && (
                      <span className="bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl text-amber-900 font-bold">
                        📧 {formData.binance_email}
                      </span>
                    )}

                    {/* Zelle */}
                    {paymentMethod === 'zelle_usd' && formData.zelle_email && (
                      <span className="bg-purple-50 border border-purple-300 px-2.5 py-1 rounded-xl text-purple-900 font-bold">
                        📧 Zelle: {formData.zelle_email}
                      </span>
                    )}
                    {paymentMethod === 'zelle_usd' && formData.zelle_name && (
                      <span className="bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl text-purple-900 font-bold">
                        👤 Titular: {formData.zelle_name}
                      </span>
                    )}

                    {/* Efectivo */}
                    {(paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && formData.cash_receiver && (
                      <span className="bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xl text-emerald-900 font-bold">
                        💵 Entrega: {formData.cash_receiver}
                      </span>
                    )}

                    {/* Montos */}
                    {currency === 'VES' && (formData.amount_bs > 0 || formData.amount_usd > 0) && (
                      <span className="bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xl text-emerald-800 font-black">
                        🇻🇪 {formData.amount_bs > 0 ? `${formatBS(formData.amount_bs)} Bs.` : `$${formData.amount_usd}`}
                      </span>
                    )}
                    {currency === 'USD' && formData.amount_usd > 0 && (
                      <span className="bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xl text-emerald-800 font-black">
                        💵 ${formData.amount_usd} USD
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Botón Principal: Ver Solicitud */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGoToPreview}
                  className="active-press px-6 py-2.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-black text-xs shadow-2xs flex items-center gap-2 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Solicitud</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 2: VER SOLICITUD / FICHA TÉCNICA ESTRUCTURADA                        */}
          {/* ========================================================================= */}
          {step === 'preview' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Ficha Técnica Idéntica a la Captura Aprobada */}
              <div className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                {/* Header Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-black text-[#009b8b] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      LOC: #{formData.locator || '00000000'}
                    </span>

                    {category === 'traslado' ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Car className="w-3 h-3 text-emerald-600" /> Traslado
                      </span>
                    ) : category === 'vuelos' ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                        <Plane className="w-3 h-3 text-sky-600" /> Vuelos
                      </span>
                    ) : category === 'gastos_apoyo' ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-purple-600" /> Gastos
                      </span>
                    ) : category === 'viaticos' ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-amber-700" /> Viáticos
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <Hotel className="w-3 h-3 text-indigo-600" /> Hospedaje
                      </span>
                    )}

                    {isUrgent ? (
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3 fill-current" /> URGENTE
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        PxFondos / En Proceso
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsUrgent(!isUrgent)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                      isUrgent
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isUrgent ? '🔥 Marcado Urgente' : 'Marcar Urgente'}
                  </button>
                </div>

                <h3 className="font-black text-slate-900 text-base leading-snug">
                  {formData.title || 'SOLICITUD DE PAGO'}
                </h3>

                {/* Cliente / Cuenta */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Cliente / Cuenta:</span>
                    <span className="font-extrabold text-slate-900">{formData.client || 'Sin especificar'}</span>
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
                    <span className="font-extrabold text-[#009b8b] flex items-center gap-1">
                      {category === 'traslado' ? (
                        <>
                          <Car className="w-3.5 h-3.5 text-emerald-600" />
                          {formData.hotel_name || 'Sin especificar'}
                        </>
                      ) : category === 'vuelos' ? (
                        <>
                          <Plane className="w-3.5 h-3.5 text-sky-600" />
                          {formData.airline || formData.hotel_name || 'Sin especificar'}
                        </>
                      ) : category === 'gastos_apoyo' ? (
                        <>
                          <Receipt className="w-3.5 h-3.5 text-purple-600" />
                          {formData.expense_concept || formData.hotel_name || 'Sin especificar'}
                        </>
                      ) : category === 'viaticos' ? (
                        <>
                          <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                          VIÁTICOS
                        </>
                      ) : (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          {formData.hotel_name || 'Sin especificar'}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Datos del Servicio / Pasajeros / Usuario */}
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

                  {category === 'traslado' && formData.route_from_to && (
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Ruta Traslado: {formData.route_from_to}</span>
                    </div>
                  )}

                  {category === 'vuelos' && (formData.flight_route || formData.route_from_to) && (
                    <div className="p-2 bg-sky-50 rounded-xl border border-sky-200 text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Ruta Aérea: {formData.airline ? `${formData.airline} • ` : ''} {formData.flight_route || formData.route_from_to}</span>
                    </div>
                  )}

                  {category === 'gastos_apoyo' && formData.expense_concept && (
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Concepto: {formData.expense_concept}</span>
                    </div>
                  )}

                  {/* Lista de Personas / Huéspedes / Pasajeros / Usuario (Oculto para Apoyo para Gastos) */}
                  {category !== 'gastos_apoyo' && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-slate-500 block text-[11px] font-bold">
                        {category === 'viaticos'
                          ? 'Usuario(s) Solicitante(s):'
                          : guestList.length > 1
                          ? `Lista de Pasajeros / Huéspedes (${guestList.length}):`
                          : 'Huésped / Pasajero:'}
                      </span>

                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                        {guestList.map((g, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-teal-50 text-[#009b8b] font-bold text-[10px] flex items-center justify-center border border-teal-200 shrink-0">
                                {i + 1}
                              </span>
                              <span className="font-extrabold text-slate-900">
                                {g.name || 'Sin nombre'}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {g.ci ? `C.I. ${g.ci}` : 'S/C'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {category !== 'gastos_apoyo' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Ubicación</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-slate-400" /> {formData.location || 'Venezuela'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Fechas / Noches</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3 text-slate-400" /> {formData.nights_dates || 'Pendiente'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Habitación / Vehículo</span>
                        <span className="font-semibold text-slate-800 text-xs">{formData.room_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Total Personas</span>
                        <span className="font-extrabold text-[#009b8b] text-xs">{guestList.length} persona(s)</span>
                      </div>
                    </div>
                  )}

                  {formData.additionals && (
                    <div className="pt-2 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 font-semibold">Observaciones / Adicionales: </span>
                      <span className="text-slate-800 font-medium">{formData.additionals}</span>
                    </div>
                  )}
                </div>

                {/* Monto Divisas o Monto en Bolívares */}
                {currency === 'USD' ? (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                        <span>💵 Pago Directo en Divisas (USD / USDT)</span>
                      </span>
                      <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                        No requiere conversión ni cálculo en Bolívares.
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-2xl font-black text-emerald-700 block">
                        {formatUSD(formData.amount_usd)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        USD / USDT
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-teal-50/90 rounded-2xl border border-teal-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Monto Base Ref. ($)
                      </span>
                      <span className="text-lg font-black text-slate-800">
                        {formatUSD(formData.amount_usd)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Tasa BCV Suministrada
                      </span>
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        Bs. {formData.bcv_rate}
                      </span>
                    </div>
                    <div className="sm:text-right sm:border-l sm:border-teal-200 sm:pl-3">
                      <span className="text-[10px] uppercase font-black text-[#009b8b] block">
                        Total en Bolívares (Bs.)
                      </span>
                      <span className="text-xl font-black text-[#009b8b]">
                        Bs. {formatBS(formData.amount_bs || (formData.amount_usd * formData.bcv_rate))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Destino de Pago */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
                      <span>Datos Destino de Pago</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          const newMethod = e.target.value as PaymentMethodType;
                          setPaymentMethod(newMethod);
                          if (newMethod === 'binance' || newMethod === 'zelle_usd') {
                            setCurrency('USD');
                          } else if (newMethod === 'transferencia_bs' || newMethod === 'pago_movil') {
                            setCurrency('VES');
                          }
                        }}
                        className="text-[11px] font-bold text-teal-950 bg-teal-50 border border-teal-300 rounded-lg px-2 py-0.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00b4a2]"
                        title="Cambiar Método de Pago"
                      >
                        <option value="transferencia_bs">🏦 Transferencia (Bs)</option>
                        <option value="pago_movil">📱 Pago Móvil (Bs)</option>
                        <option value="binance">💰 Binance Pay (USDT)</option>
                        <option value="zelle_usd">💵 Zelle (USD)</option>
                        <option value="efectivo_usd">💵 Efectivo ($ / Bs)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setStep('manual')}
                        className="text-[10px] font-bold text-[#00b4a2] hover:text-[#009b8b] underline ml-1"
                      >
                        Editar Datos
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pt-0.5">
                    {formData.bank_beneficiary ? (
                      <p>
                        <strong className="text-slate-500 font-normal">Beneficiario:</strong>{' '}
                        <span className="font-bold text-slate-900 font-mono">
                          {formData.bank_beneficiary}
                        </span>
                      </p>
                    ) : (
                      <p className="text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                        ⚠️ Falta el Nombre del Beneficiario / Titular de la cuenta.
                      </p>
                    )}

                    {formData.bank_rif && (
                      <p>
                        <strong className="text-slate-500 font-normal">RIF / CI:</strong>{' '}
                        <span className="font-bold text-slate-900 font-mono">{formData.bank_rif}</span>
                      </p>
                    )}
                    {formData.bank_name && (
                      <p>
                        <strong className="text-slate-500 font-normal">Banco:</strong>{' '}
                        <span className="font-semibold text-slate-800">{formData.bank_name}</span>
                      </p>
                    )}

                    {paymentMethod === 'transferencia_bs' && (
                      formData.bank_account ? (
                        <p className="font-mono text-[#009b8b] font-black select-all">
                          <strong className="text-slate-500 font-normal font-sans">N° Cuenta:</strong>{' '}
                          {formData.bank_account}
                        </p>
                      ) : (
                        <p className="text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          ⚠️ Falta el N° de Cuenta Bancaria (20 dígitos) para la transferencia.
                        </p>
                      )
                    )}

                    {paymentMethod === 'pago_movil' && (
                      formData.pago_movil_phone && formData.pago_movil_ci ? (
                        <p className="font-mono text-teal-900 font-bold">
                          <strong className="text-slate-500 font-normal font-sans">Pago Móvil:</strong>{' '}
                          {formData.pago_movil_phone} (CI: {formData.pago_movil_ci})
                        </p>
                      ) : (
                        <p className="text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          ⚠️ Falta el Teléfono o Cédula para Pago Móvil.
                        </p>
                      )
                    )}

                    {paymentMethod === 'binance' && (
                      formData.binance_email || formData.binance_pay_id ? (
                        <p className="font-mono text-amber-900 font-bold">
                          <strong className="text-slate-500 font-normal font-sans">Binance:</strong>{' '}
                          {formData.binance_email || ''} {formData.binance_pay_id ? `(Pay ID: ${formData.binance_pay_id})` : ''}
                        </p>
                      ) : (
                        <p className="text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          ⚠️ Falta el Pay ID o Correo Electrónico de Binance.
                        </p>
                      )
                    )}

                    {paymentMethod === 'zelle_usd' && (
                      formData.zelle_email ? (
                        <p className="font-mono text-emerald-900 font-bold">
                          <strong className="text-slate-500 font-normal font-sans">Zelle:</strong>{' '}
                          {formData.zelle_email} {formData.zelle_name ? `(${formData.zelle_name})` : ''}
                        </p>
                      ) : (
                        <p className="text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          ⚠️ Falta el Correo Electrónico de Zelle.
                        </p>
                      )
                    )}

                    {(paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && (
                      formData.cash_receiver ? (
                        <p className="text-indigo-900 font-bold">
                          <strong className="text-slate-500 font-normal font-sans">Receptor:</strong>{' '}
                          {formData.cash_receiver}
                        </p>
                      ) : (
                        <p className="text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          ⚠️ Falta indicar el responsable que recibe el efectivo.
                        </p>
                      )
                    )}

                    {/* Monto a Transferir destacado */}
                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Monto a Transferir:</span>
                      <span className="font-black text-[#009b8b] text-sm">
                        {currency === 'USD'
                          ? `${formatUSD(formData.amount_usd)} (USD / USDT)`
                          : `Bs. ${formatBS(formData.amount_bs || (formData.amount_usd * formData.bcv_rate))}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Soporte Adjunto */}
                {supportFile ? (
                  <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-200/80 text-teal-900 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4 text-[#009b8b]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-teal-950 block truncate">
                          Soporte Adjunto: {supportFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(supportFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenViewSupport}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-900 rounded-lg font-bold text-[11px] border border-teal-300 flex items-center gap-1 transition-colors active-press shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#00b4a2]" />
                        <span>Vista Previa</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerModifyFile}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-[11px] border border-amber-300 flex items-center gap-1 transition-colors active-press shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                        <span>Modificar Archivo</span>
                      </button>
                    </div>
                  </div>
                ) : editingRequest?.support_file_url ? (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-900 block truncate">
                          {editingRequest.support_file_name || 'Soporte de Reserva Registrado'}
                        </span>
                        <span className="text-[10px] text-slate-500">Archivo existente</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenViewSupport}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-bold text-[11px] border border-slate-300 flex items-center gap-1 transition-colors active-press"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#00b4a2]" />
                        <span>Ver Soporte</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerModifyFile}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-[11px] border border-amber-300 flex items-center gap-1 transition-colors active-press shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                        <span>Modificar Archivo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">Sin documento de soporte adjunto</span>
                    <button
                      type="button"
                      onClick={handleTriggerModifyFile}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 flex items-center gap-1 active-press"
                    >
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Adjuntar Soporte</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Botones de Acción del Paso 2 */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStep('paste')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modificar Texto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('manual')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#00b4a2]" />
                    <span>Ajustar Campos</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="active-press px-6 py-2.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-black text-xs shadow-2xs flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Guardando...' : editingRequest ? 'Guardar Cambios' : 'Crear Solicitud de Pago'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 3: AJUSTAR CAMPOS MANUALMENTE (OPCIONAL)                             */}
          {/* ========================================================================= */}
          {step === 'manual' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl">
                <span className="font-bold text-slate-700 text-xs">Editando campos del formulario manual:</span>
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="px-3 py-1 bg-white hover:bg-slate-200 rounded-lg text-slate-800 font-bold text-xs border border-slate-300 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-[#00b4a2]" />
                  <span>Volver a Ficha</span>
                </button>
              </div>

              {/* Categoría */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['hospedaje', 'traslado', 'vuelos', 'gastos_apoyo', 'viaticos'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs capitalize border transition-all ${
                      category === cat ? 'bg-[#00b4a2] text-white border-[#00b4a2] shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'gastos_apoyo' ? '🧾 Gastos' : cat === 'viaticos' ? '💼 Viáticos' : cat === 'traslado' ? '🚗 Traslado' : cat === 'vuelos' ? '✈️ Vuelos' : '🏨 Hospedaje'}
                  </button>
                ))}
              </div>

              {/* Título & Cliente */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Título de la Solicitud *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cliente / Cuenta *</label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {category === 'traslado'
                      ? 'Empresa de Traslado *'
                      : category === 'vuelos'
                      ? 'Aerolínea *'
                      : category === 'gastos_apoyo'
                      ? 'Concepto / Destino *'
                      : category === 'viaticos'
                      ? 'Concepto / Servicio'
                      : 'Hotel / Proveedor *'}
                  </label>
                  <input
                    type="text"
                    value={category === 'gastos_apoyo' ? (formData.expense_concept || formData.hotel_name) : formData.hotel_name}
                    onChange={(e) => {
                      if (category === 'gastos_apoyo') {
                        setFormData({ ...formData, expense_concept: e.target.value, hotel_name: e.target.value });
                      } else {
                        setFormData({ ...formData, hotel_name: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required={category !== 'viaticos'}
                  />
                </div>
              </div>

              {category === 'traslado' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ruta del Traslado</label>
                  <input
                    type="text"
                    placeholder="Ej: CCS - VALENCIA"
                    value={formData.route_from_to}
                    onChange={(e) => setFormData({ ...formData, route_from_to: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              )}

              {category === 'vuelos' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ruta de Vuelo</label>
                  <input
                    type="text"
                    placeholder="Ej: CCS - PMV - CCS"
                    value={formData.flight_route}
                    onChange={(e) => setFormData({ ...formData, flight_route: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Localizador (#LOC)</label>
                  <input
                    type="text"
                    value={formData.locator}
                    onChange={(e) => setFormData({ ...formData, locator: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {category === 'viaticos' ? 'Cantidad de Personas' : 'Ubicación'}
                  </label>
                  {category === 'viaticos' ? (
                    <input
                      type="number"
                      min="1"
                      value={formData.people_count}
                      onChange={(e) => setFormData({ ...formData, people_count: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fechas / Período *</label>
                  <input
                    type="text"
                    value={formData.nights_dates}
                    onChange={(e) => setFormData({ ...formData, nights_dates: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Lista Pasajeros / Usuario (Oculto para Apoyo para Gastos) */}
              {category !== 'gastos_apoyo' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      {category === 'viaticos'
                        ? `Usuario Responsable / Personas (${guestList.length})`
                        : `Pasajeros / Huéspedes (${guestList.length})`}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddGuestRow}
                      className="text-xs font-bold text-[#00b4a2] hover:text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200"
                    >
                      + Agregar
                    </button>
                  </div>
                  {guestList.map((g, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={category === 'viaticos' ? 'Nombre y Apellido del Usuario' : 'Nombre y Apellido'}
                        value={g.name}
                        onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required={idx === 0}
                      />
                      <input
                        type="text"
                        placeholder="Cédula / C.I."
                        value={g.ci}
                        onChange={(e) => handleGuestChange(idx, 'ci', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      />
                      {guestList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGuestRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Observación</label>
                <textarea
                  rows={2}
                  value={formData.additionals}
                  onChange={(e) => setFormData({ ...formData, additionals: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  placeholder="Detalles u observaciones del servicio"
                />
              </div>

              {/* Montos */}
              <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-200 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monto USD ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount_usd}
                    onChange={(e) => {
                      const usd = parseFloat(e.target.value) || 0;
                      const bs = formData.bcv_rate > 0 ? Number((usd * formData.bcv_rate).toFixed(2)) : formData.amount_bs;
                      setFormData({ ...formData, amount_usd: usd, amount_bs: bs });
                    }}
                    className="w-full bg-white border border-teal-300 rounded-xl px-2.5 py-1.5 text-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tasa BCV</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.bcv_rate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const bs = rate > 0 && formData.amount_usd > 0 ? Number((formData.amount_usd * rate).toFixed(2)) : formData.amount_bs;
                      setFormData({ ...formData, bcv_rate: rate, amount_bs: bs });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monto Bs.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount_bs}
                    onChange={(e) => {
                      const bs = parseFloat(e.target.value) || 0;
                      const usd = formData.bcv_rate > 0 ? Number((bs / formData.bcv_rate).toFixed(2)) : formData.amount_usd;
                      setFormData({ ...formData, amount_bs: bs, amount_usd: usd });
                    }}
                    className="w-full bg-white border border-teal-300 rounded-xl px-2.5 py-1.5 text-[#009b8b] font-bold"
                  />
                </div>
              </div>

              {/* Selector de Método de Pago y Moneda */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-slate-800 font-black text-xs">
                    Método de Pago *
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrency('VES');
                        if (paymentMethod === 'binance' || paymentMethod === 'zelle_usd') {
                          setPaymentMethod('transferencia_bs');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                        currency === 'VES'
                          ? 'bg-[#00b4a2] text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🇻🇪 Bolívares (VES)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrency('USD');
                        if (paymentMethod === 'transferencia_bs' || paymentMethod === 'pago_movil') {
                          setPaymentMethod('binance');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                        currency === 'USD'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      💵 Divisas (USD)
                    </button>
                  </div>
                </div>

                {/* Beneficiary Quick Selector in Step 3 */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#00b4a2]" />
                      <span>Cargar Datos desde Beneficiario Guardado:</span>
                    </label>
                    {selectedBeneficiaryId && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✨ Beneficiario Activo
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedBeneficiaryId}
                    onChange={(e) => handleSelectBeneficiary(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00b4a2] cursor-pointer truncate"
                  >
                    <option value="">🔍 Seleccionar un beneficiario de la base de datos...</option>
                    {beneficiariesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.rif ? `(${b.rif})` : ''} - {b.bank_details.bank || b.bank_details.payment_method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botones de Métodos de Pago */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('transferencia_bs');
                      setCurrency('VES');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'transferencia_bs'
                        ? 'bg-[#00b4a2] text-white border-[#00b4a2] shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Transferencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('pago_movil');
                      setCurrency('VES');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'pago_movil'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pago Móvil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('binance');
                      setCurrency('USD');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'binance'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Binance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('zelle_usd');
                      setCurrency('USD');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'zelle_usd'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Zelle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('efectivo_usd');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                </div>
              </div>

              {/* Campos dinámicos según el método de pago seleccionado */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-slate-800 font-bold text-xs">
                  Detalles del Destino de Pago ({paymentMethod === 'binance' ? 'Binance Pay' : paymentMethod === 'zelle_usd' ? 'Zelle USD' : paymentMethod === 'pago_movil' ? 'Pago Móvil' : paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs' ? 'Efectivo' : 'Transferencia Bancaria'})
                </label>

                {paymentMethod === 'transferencia_bs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Beneficiario / Titular *</label>
                      <input
                        type="text"
                        placeholder="Nombre o Razón Social"
                        value={formData.bank_beneficiary}
                        onChange={(e) => setFormData({ ...formData, bank_beneficiary: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">RIF / Cédula *</label>
                      <input
                        type="text"
                        placeholder="J-12345678-0 o V-12345678"
                        value={formData.bank_rif}
                        onChange={(e) => setFormData({ ...formData, bank_rif: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Banco de Destino *</label>
                      <select
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      >
                        {POPULAR_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">N° de Cuenta (20 Dígitos) *</label>
                      <input
                        type="text"
                        placeholder="0134..."
                        value={formData.bank_account}
                        onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'pago_movil' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Beneficiario / Titular *</label>
                      <input
                        type="text"
                        placeholder="Nombre del Titular"
                        value={formData.bank_beneficiary}
                        onChange={(e) => setFormData({ ...formData, bank_beneficiary: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Cédula / RIF *</label>
                      <input
                        type="text"
                        placeholder="V-12345678"
                        value={formData.pago_movil_ci || formData.bank_rif}
                        onChange={(e) => setFormData({ ...formData, pago_movil_ci: e.target.value, bank_rif: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Banco *</label>
                      <select
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      >
                        {POPULAR_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Teléfono Pago Móvil *</label>
                      <input
                        type="text"
                        placeholder="04141234567"
                        value={formData.pago_movil_phone}
                        onChange={(e) => setFormData({ ...formData, pago_movil_phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'binance' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Titular / Beneficiario *</label>
                      <input
                        type="text"
                        placeholder="Nombre del Titular de Binance"
                        value={formData.bank_beneficiary}
                        onChange={(e) => setFormData({ ...formData, bank_beneficiary: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Binance Pay ID</label>
                      <input
                        type="text"
                        placeholder="ID de 8 o 9 dígitos"
                        value={formData.binance_pay_id}
                        onChange={(e) => setFormData({ ...formData, binance_pay_id: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Correo Electrónico de Binance</label>
                      <input
                        type="email"
                        placeholder="usuario@email.com"
                        value={formData.binance_email}
                        onChange={(e) => setFormData({ ...formData, binance_email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'zelle_usd' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Titular / Nombre en Zelle *</label>
                      <input
                        type="text"
                        placeholder="Nombre Completo del Titular"
                        value={formData.zelle_name || formData.bank_beneficiary}
                        onChange={(e) => setFormData({ ...formData, zelle_name: e.target.value, bank_beneficiary: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Correo / Teléfono Zelle *</label>
                      <input
                        type="text"
                        placeholder="correo@zelle.com o Teléfono"
                        value={formData.zelle_email}
                        onChange={(e) => setFormData({ ...formData, zelle_email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                )}

                {(paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Persona que Recibe / Responsable *</label>
                      <input
                        type="text"
                        placeholder="Nombre y Apellido"
                        value={formData.cash_receiver || formData.bank_beneficiary}
                        onChange={(e) => setFormData({ ...formData, cash_receiver: e.target.value, bank_beneficiary: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Detalle / Ubicación de Entrega</label>
                      <input
                        type="text"
                        placeholder="Oficina, Chofer, etc."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botón para regresar a la vista de ficha */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="px-5 py-2.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Ficha Actualizada ➔</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* ========================================================================= */}
        {/* MODAL DE CONFIRMACIÓN DE SEGURIDAD PARA PAGO                              */}
        {/* ========================================================================= */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl border-2 border-amber-400 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    ¿Confirmar Datos de la Solicitud?
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Verifica la cuenta y el monto para evitar pagos incorrectos.
                  </p>
                </div>
              </div>

              {/* Ficha Resumen de Seguridad */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Monto a Liquidar
                  </span>
                  <span className="text-lg font-black text-emerald-600">
                    {currency === 'USD'
                      ? `${formatUSD(formData.amount_usd)} (USD / USDT)`
                      : `Bs. ${formatBS(formData.amount_bs || (formData.amount_usd * formData.bcv_rate))} (Tasa: Bs. ${formData.bcv_rate})`}
                  </span>
                </div>

                <div className="border-t border-slate-200/80 pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Beneficiario / Titular
                  </span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm">
                    {formData.bank_beneficiary} {formData.bank_rif ? `(${formData.bank_rif})` : ''}
                  </span>
                </div>

                <div className="border-t border-slate-200/80 pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cuenta / Destino de Pago
                  </span>
                  <div className="font-mono text-slate-900 font-bold text-xs mt-0.5 bg-white p-2 rounded-xl border border-slate-200">
                    {paymentMethod === 'transferencia_bs' && (
                      <p>
                        <strong className="text-teal-700 font-sans block text-[11px] uppercase">Transferencia {formData.bank_name}:</strong>
                        <span>N° {formData.bank_account}</span>
                      </p>
                    )}
                    {paymentMethod === 'pago_movil' && (
                      <p>
                        <strong className="text-teal-700 font-sans block text-[11px] uppercase">Pago Móvil:</strong>
                        <span>Tel: {formData.pago_movil_phone} • CI: {formData.pago_movil_ci}</span>
                      </p>
                    )}
                    {paymentMethod === 'binance' && (
                      <p>
                        <strong className="text-amber-700 font-sans block text-[11px] uppercase">Binance Pay:</strong>
                        <span>{formData.binance_pay_id ? `Pay ID: ${formData.binance_pay_id}` : ''} {formData.binance_email ? `(${formData.binance_email})` : ''}</span>
                      </p>
                    )}
                    {paymentMethod === 'zelle_usd' && (
                      <p>
                        <strong className="text-emerald-700 font-sans block text-[11px] uppercase">Zelle:</strong>
                        <span>{formData.zelle_email} {formData.zelle_name ? `(${formData.zelle_name})` : ''}</span>
                      </p>
                    )}
                    {(paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && (
                      <p>
                        <strong className="text-indigo-700 font-sans block text-[11px] uppercase">Efectivo:</strong>
                        <span>Responsable: {formData.cash_receiver}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  ✏️ Modificar Datos
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={executeSubmit}
                  className="px-4 py-2.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Guardando...' : 'Sí, Crear Solicitud'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Vista Previa del Soporte */}
        <FilePreviewModal
          isOpen={isPreviewModalOpen}
          file={pendingSupportFile || supportFile}
          fileUrl={!pendingSupportFile && !supportFile ? editingRequest?.support_file_url : null}
          fileName={
            pendingSupportFile?.name ||
            supportFile?.name ||
            editingRequest?.support_file_name ||
            'soporte_pago'
          }
          title={
            previewMode === 'confirm'
              ? 'Vista Previa del Soporte a Cargar'
              : 'Soporte de la Solicitud'
          }
          subtitle={
            previewMode === 'confirm'
              ? 'Revisa que la foto o documento sea el correcto y legible antes de adjuntarlo.'
              : undefined
          }
          mode={previewMode}
          confirmText="Cargar Soporte"
          cancelText={previewMode === 'confirm' ? 'Cancelar' : 'Cerrar'}
          onConfirm={handleConfirmSupportFile}
          onCancel={handleCancelSupportFile}
          onModify={handleTriggerModifyFile}
        />
      </div>
    </div>
  );
};
