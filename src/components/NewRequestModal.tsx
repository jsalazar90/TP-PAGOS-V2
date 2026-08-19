import React, { useState, useEffect } from 'react';
import {
  CreatePaymentRequestInput,
  PaymentCurrency,
  PaymentMethodType,
  PaymentRequest,
  ServiceCategory,
  GuestItem
} from '../types';
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
  CheckCircle2
} from 'lucide-react';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePaymentRequestInput) => Promise<void>;
  editingRequest?: PaymentRequest | null;
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

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    hotel_name: '',
    locator: '',
    location: '',
    room_type: 'HABITACION SENCILLA',
    people_count: 1,
    additionals: 'Desayuno incluido',
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
  });

  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const resetForm = () => {
    setLoading(false);
    setErrorMsg('');
    setShowConfirmDialog(false);
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
      room_type: 'HABITACION SENCILLA',
      people_count: 1,
      additionals: 'Desayuno incluido',
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

  // Generador dinámico de plantillas limpias según Rubro y Método de Pago
  const generateStructureTemplate = (cat: ServiceCategory, method: PaymentMethodType): string => {
    const lines: string[] = [];

    if (cat === 'hospedaje') {
      lines.push('Asunto: PAGO HOSPEDAJE');
      lines.push('Servicio: Hospedaje');
      lines.push('Cliente: ');
      lines.push('Hotel: ');
      lines.push('Huésped: ');
      lines.push('LOC: ');
      lines.push('Ubicación: ');
      lines.push('Habitación: ');
      lines.push('Fechas: ');
    } else if (cat === 'traslado') {
      lines.push('Asunto: PAGO TRASLADO EJECUTIVO');
      lines.push('Servicio: Traslado');
      lines.push('Cliente: ');
      lines.push('Empresa Traslado: ');
      lines.push('Pasajero: ');
      lines.push('LOC: ');
      lines.push('Ruta: ');
      lines.push('Fechas: ');
    } else if (cat === 'vuelos') {
      lines.push('Asunto: EMISION BOLETO AEREO');
      lines.push('Servicio: Vuelos');
      lines.push('Cliente: ');
      lines.push('Aerolínea: ');
      lines.push('Ruta: ');
      lines.push('Pasajero: ');
      lines.push('LOC: ');
      lines.push('Fechas: ');
    } else if (cat === 'gastos_apoyo') {
      lines.push('Asunto: APOYO PARA GASTOS (REEMBOLSABLE)');
      lines.push('Servicio: Gastos');
      lines.push('Prioridad: URGENTE');
      lines.push('Cliente: ');
      lines.push('Concepto: ');
      lines.push('LOC: ');
      lines.push('Fechas: ');
    }

    // Montos
    if (method === 'binance' || method === 'zelle_usd' || method === 'efectivo_usd' || method === 'efectivo_bs') {
      lines.push('Monto USD: ');
      lines.push(`Metodo: ${method === 'binance' ? 'Binance' : method === 'zelle_usd' ? 'Zelle' : 'Efectivo'}`);
    } else {
      lines.push('Monto USD: ');
      lines.push('Tasa BCV: ');
    }

    // Datos Bancarios del Beneficiario / Titular de la cuenta
    lines.push('Beneficiario / Titular Cuenta: ');

    if (method === 'transferencia_bs') {
      lines.push('RIF: ');
      lines.push('Banco: ');
      lines.push('Cuenta: ');
    } else if (method === 'pago_movil') {
      lines.push('Banco: ');
      lines.push('Pago movil: ');
      lines.push('Cedula PM: ');
    } else if (method === 'binance') {
      lines.push('Pay ID: ');
      lines.push('Binance Email: ');
    } else if (method === 'zelle_usd') {
      lines.push('Zelle Email: ');
    } else if (method === 'efectivo_usd' || method === 'efectivo_bs') {
      lines.push('Persona que recibe efectivo: ');
    }

    return lines.join('\n');
  };

  const handleAutoParseText = (textToParse: string) => {
    if (!textToParse.trim()) return;

    const lines = textToParse.split('\n').map((l) => l.trim());
    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        const regex = new RegExp(`(?:${key})\\s*[:=-]\\s*(.+)`, 'i');
        for (const line of lines) {
          const match = line.match(regex);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
      }
      return '';
    };

    // Detect Urgency
    if (/urgente|emergencia|prioridad\s*:\s*urgente/i.test(textToParse)) {
      setIsUrgent(true);
    }

    // Detect Service Category
    let detectedCategory: ServiceCategory = category;
    if (/servicio\s*:\s*vuelo|vuelo|boleto|aéreo|aereo|aerolínea|aerolinea|pnr|laser|rutaca|conviasa|avior/i.test(textToParse)) {
      detectedCategory = 'vuelos';
    } else if (/servicio\s*:\s*traslado|traslado|transporte|chofer|ruta|vehiculo|vehículo|caracas\s*-\s*valencia/i.test(textToParse)) {
      detectedCategory = 'traslado';
    } else if (/servicio\s*:\s*gasto|gasto|apoyo|viático|viatico|reembolso|caja\s*chica|alimentación/i.test(textToParse)) {
      detectedCategory = 'gastos_apoyo';
    } else if (/hospedaje|hotel|habitación|habitacion/i.test(textToParse)) {
      detectedCategory = 'hospedaje';
    }
    setCategory(detectedCategory);

    const parsedTitle = getValue(['Asunto', 'Titulo', 'Título', 'Pago']) || (lines[0] && !lines[0].includes(':') ? lines[0] : '');
    const parsedClient = getValue(['Cliente', 'Empresa']) || formData.client;

    const parsedHotel = getValue(['Hotel', 'Nombre del Hotel', 'Hospedaje', 'Empresa Traslado', 'Línea', 'Proveedor', 'Aerolínea', 'Aerolinea']);
    const parsedLocator = getValue(['LOC', 'Loc', 'Localizador', 'Reserva', 'N° Orden', 'PNR']);
    const parsedLocation = getValue(['Ubicación', 'Ubicacion', 'Ciudad', 'Destino']);
    const parsedRoomType = getValue(['Habitación', 'Habitacion', 'Tipo', 'Vehículo', 'Vehiculo', 'Clase']);
    const parsedPeople = getValue(['Personas', 'Cant. Personas', 'Huéspedes', 'Pasajeros']);
    const parsedNightsDates = getValue(['Fechas', 'Noches', 'Periodo', 'Check-in', 'Fecha Traslado', 'Fecha']);
    const parsedAdditionals = getValue(['Adicionales', 'Adicional', 'Servicios', 'Detalles']);

    const parsedRoute = getValue(['Ruta', 'Origen - Destino', 'Trayecto']);
    const parsedExpenseConcept = getValue(['Concepto', 'Detalle Gasto', 'Justificación']);

    const rawBs = getValue(['Monto BS', 'Monto Bolivares', 'Monto Bolívares', 'Monto en BS', 'Monto en Bolívares', 'Monto Local', 'BS', 'Bs.']);
    const numBsParsed = rawBs ? parseFloat(rawBs.replace(/[^0-9.]/g, '')) : NaN;

    const rawUsd = getValue(['Monto USD', 'Monto Divisas', 'Monto', 'USD', '\\$']);
    let numUsd = rawUsd ? parseFloat(rawUsd.replace(/[^0-9.]/g, '')) : formData.amount_usd;

    const rawBcv = getValue(['Tasa BCV', 'Tasa', 'BCV']);
    let numBcv = rawBcv ? parseFloat(rawBcv.replace(/[^0-9.]/g, '')) : formData.bcv_rate;

    let finalBs = !isNaN(numBsParsed) ? numBsParsed : NaN;

    if (!isNaN(finalBs) && !isNaN(numBcv) && (isNaN(numUsd) || numUsd === 0) && numBcv > 0) {
      numUsd = Number((finalBs / numBcv).toFixed(2));
    } else if (!isNaN(numUsd) && !isNaN(numBcv) && isNaN(finalBs)) {
      finalBs = Number((numUsd * numBcv).toFixed(2));
    } else if (!isNaN(numUsd) && !isNaN(finalBs) && (isNaN(numBcv) || numBcv === 0) && numUsd > 0) {
      numBcv = Number((finalBs / numUsd).toFixed(4));
    }

    const parsedBeneficiary = getValue(['Beneficiario', 'Titular', 'A Nombre de']);
    const parsedRif = getValue(['RIF', 'Rif', 'Rif Beneficiario']);
    const parsedBank = getValue(['Banco', 'Entidad']);
    const parsedAccount = getValue(['Cuenta', 'N° Cuenta', 'Numero de Cuenta']);
    const parsedPagoMovilPhone = getValue(['Pago movil', 'Pago móvil', 'Teléfono PM', 'Telefono PM', 'Telefono', 'Teléfono']);
    const parsedPagoMovilCi = getValue(['Cedula PM', 'Cédula PM', 'Cedula Pago Movil', 'Cédula Pago Móvil', 'CI PM']) || getValue(['Cedula', 'Cédula']);

    const parsedBinanceEmail = getValue(['Binance Email', 'Correo Binance', 'Email Binance', 'Binance ID Email']);
    const parsedBinancePayId = getValue(['Pay ID', 'Binance Pay ID', 'PayID', 'Binance ID']);

    const parsedZelleEmail = getValue(['Email Zelle', 'Correo Zelle', 'Zelle Email', 'Zelle']);
    const parsedZelleName = getValue(['Titular Zelle', 'Nombre Zelle', 'Zelle Name']);
    const parsedCashReceiver = getValue(['Entregar a', 'Receptor Efectivo', 'Persona Efectivo']);

    // Detect Payment Method & Currency Automatically
    let detectedMethod: PaymentMethodType = paymentMethod;
    let detectedCurrency: PaymentCurrency = currency;

    if (parsedBinanceEmail || parsedBinancePayId || /binance/i.test(textToParse)) {
      detectedMethod = 'binance';
      detectedCurrency = 'USD';
    } else if (parsedZelleEmail || /zelle/i.test(textToParse)) {
      detectedMethod = 'zelle_usd';
      detectedCurrency = 'USD';
    } else if (/efectivo/i.test(textToParse)) {
      detectedMethod = 'efectivo_usd';
      detectedCurrency = 'USD';
    } else if (parsedPagoMovilPhone || /pago\s*móvil|pago\s*movil|\bpm\b/i.test(textToParse)) {
      if (!parsedAccount) {
        detectedMethod = 'pago_movil';
      }
    } else if (parsedAccount) {
      detectedMethod = 'transferencia_bs';
    }

    if (/divisa|solo\s*usd|usdt|binance|zelle/i.test(textToParse) && (!rawBcv || numBcv === 0)) {
      detectedCurrency = 'USD';
    } else if (rawBcv && numBcv > 0) {
      detectedCurrency = 'VES';
    }

    setPaymentMethod(detectedMethod);
    setCurrency(detectedCurrency);

    // Multi-line Guest / Passenger Parsing
    const parsedGuests: GuestItem[] = [];

    const guestHeaderIdx = lines.findIndex(l => /^Huésped|^Huesped|^Pasajeros|^Pasajero|^Nombres|^Beneficiario/i.test(l));
    if (guestHeaderIdx !== -1) {
      const headerLine = lines[guestHeaderIdx];
      const inlineVal = headerLine.replace(/^Huésped(?:es)?|^Huesped(?:es)?|^Pasajero(?:s)?|^Nombres|^Beneficiario(?:s)?/i, '').replace(/^[:=-]\s*/, '').trim();

      const candidateRaw: string[] = [];
      if (inlineVal) candidateRaw.push(inlineVal);

      for (let i = guestHeaderIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (!l) continue;
        if (/^(LOC|PNR|Ubicación|Ubicacion|Habitación|Habitacion|Personas|Fechas|Adicionales|Monto|Tasa|Beneficiario|RIF|Banco|Cuenta|Pago movil|Pago móvil|Cedula PM|Cédula PM|Binance|Zelle|Pay ID|Ruta|Concepto)/i.test(l)) {
          break;
        }
        candidateRaw.push(l);
      }

      // Process raw lines (split by commas or newlines if multiple in one line)
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
        // Strip leading numbering or bullets: '1. ', '1) ', '- ', '* ', '• '
        const cleaned = lineStr.replace(/^[\d]+[\.\)\-]\s*|^[\-\*•]\s*/, '').trim();
        if (!cleaned) continue;

        // Match Name + CI format: "Carlos Mendoza V-17.654.321" or "Carlos Mendoza 17654321" or "Carlos Mendoza (V-17.654.321)"
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

    if (parsedGuests.length > 0) {
      setGuestList(parsedGuests);
    }

    setFormData((prev) => ({
      ...prev,
      title: parsedTitle || prev.title,
      client: parsedClient || prev.client,
      hotel_name: parsedHotel || prev.hotel_name,
      locator: parsedLocator || prev.locator,
      location: parsedLocation || prev.location,
      room_type: parsedRoomType || prev.room_type,
      people_count: parsedPeople ? parseInt(parsedPeople) || prev.people_count : (parsedGuests.length > 0 ? parsedGuests.length : prev.people_count),
      nights_dates: parsedNightsDates || prev.nights_dates,
      additionals: parsedAdditionals || prev.additionals,
      route_from_to: parsedRoute || prev.route_from_to,
      flight_route: parsedRoute || prev.flight_route,
      airline: parsedHotel || prev.airline,
      expense_concept: parsedExpenseConcept || prev.expense_concept,
      amount_usd: isNaN(numUsd) ? prev.amount_usd : numUsd,
      bcv_rate: isNaN(numBcv) ? prev.bcv_rate : numBcv,
      amount_bs: !isNaN(finalBs) ? finalBs : (!isNaN(numUsd) && !isNaN(numBcv) ? Number((numUsd * numBcv).toFixed(2)) : prev.amount_bs),
      bank_beneficiary: parsedBeneficiary || prev.bank_beneficiary,
      bank_rif: parsedRif || prev.bank_rif,
      bank_name: parsedBank ? parsedBank.toUpperCase() : prev.bank_name,
      bank_account: parsedAccount ? parsedAccount.replace(/[^0-9-]/g, '') : prev.bank_account,
      pago_movil_phone: parsedPagoMovilPhone ? parsedPagoMovilPhone.replace(/[^0-9]/g, '') : prev.pago_movil_phone,
      pago_movil_ci: parsedPagoMovilCi || prev.pago_movil_ci,
      binance_email: parsedBinanceEmail || prev.binance_email,
      binance_pay_id: parsedBinancePayId || prev.binance_pay_id,
      zelle_email: parsedZelleEmail || prev.zelle_email,
      zelle_name: parsedZelleName || prev.zelle_name,
      cash_receiver: parsedCashReceiver || prev.cash_receiver,
    }));
  };

  const handleApplyTemplate = (newCat: ServiceCategory, newMethod: PaymentMethodType) => {
    setCategory(newCat);
    setPaymentMethod(newMethod);
    const isDirect = newMethod === 'binance' || newMethod === 'zelle_usd' || newMethod === 'efectivo_usd';
    setCurrency(isDirect ? 'USD' : 'VES');
    const text = generateStructureTemplate(newCat, newMethod);
    navigator.clipboard.writeText(text);
    setCopiedTemplate(true);
    setRawText(text);
    handleAutoParseText(text);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleGoToPreview = () => {
    setErrorMsg('');
    handleAutoParseText(rawText);

    const numUsd = Number(formData.amount_usd) || 0;
    const numBs = Number(formData.amount_bs) || 0;

    if (!formData.client || !formData.client.trim()) {
      setErrorMsg('⚠️ Falta el Cliente / Empresa: Por favor indica el cliente en el mensaje o en el campo inferior.');
      return;
    }

    if (currency === 'USD' && numUsd <= 0) {
      setErrorMsg('⚠️ Falta el Monto a pagar: Ingresa el monto en divisas (USD / USDT) en el panel inferior.');
      return;
    }

    if (currency === 'VES' && numBs <= 0 && numUsd <= 0) {
      setErrorMsg('⚠️ Falta el Monto a pagar: Ingresa el monto en Bolívares o USD con su tasa en el panel inferior.');
      return;
    }

    if (!formData.bank_beneficiary || !formData.bank_beneficiary.trim()) {
      setErrorMsg('⚠️ Falta el Beneficiario: Indica el titular o beneficiario en el mensaje antes de continuar.');
      return;
    }

    if (paymentMethod === 'transferencia_bs' && (!formData.bank_account || !formData.bank_account.trim())) {
      setErrorMsg('⚠️ Falta la Cuenta de Destino: Indica el N° de Cuenta Bancaria (20 dígitos) en el mensaje.');
      return;
    }

    if (paymentMethod === 'pago_movil' && (!formData.pago_movil_phone?.trim() || !formData.pago_movil_ci?.trim())) {
      setErrorMsg('⚠️ Faltan datos de Pago Móvil: Indica el Teléfono y Cédula/RIF de destino en el mensaje.');
      return;
    }

    if (paymentMethod === 'binance' && (!formData.binance_email?.trim() && !formData.binance_pay_id?.trim())) {
      setErrorMsg('⚠️ Faltan datos de Binance: Indica el Pay ID o Correo de Binance en el mensaje.');
      return;
    }

    if (paymentMethod === 'zelle_usd' && (!formData.zelle_email?.trim() && !formData.bank_account?.trim())) {
      setErrorMsg('⚠️ Faltan datos de Zelle: Indica el Correo de Zelle en el mensaje.');
      return;
    }

    if ((paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && !formData.cash_receiver?.trim()) {
      setErrorMsg('⚠️ Falta indicar el responsable que recibirá el efectivo en el mensaje.');
      return;
    }

    setStep('preview');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const firstGuest = guestList[0];
    const mainTitle = formData.title || (
      category === 'traslado' ? `TRASLADO ${formData.hotel_name || 'EJECUTIVO'}` :
      category === 'vuelos' ? `BOLETO AEREO ${formData.hotel_name || 'VUELO'}` :
      category === 'gastos_apoyo' ? `APOYO ${formData.expense_concept || 'GASTOS'}` :
      `HOSPEDAJE ${formData.hotel_name || 'HOTEL'}`
    );

    if (!mainTitle || !firstGuest?.name?.trim() || !formData.nights_dates) {
      setErrorMsg('⚠️ Por favor completa los campos requeridos (*), incluyendo al menos Nombre del Huésped / Pasajero y Fecha');
      return;
    }

    if (!formData.client || !formData.client.trim()) {
      setErrorMsg('⚠️ Falta el Cliente / Empresa: Por favor indica el cliente de la solicitud.');
      return;
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

    const mainTitle = formData.title || (
      category === 'traslado' ? `TRASLADO ${formData.hotel_name || 'EJECUTIVO'}` :
      category === 'vuelos' ? `BOLETO AEREO ${formData.hotel_name || 'VUELO'}` :
      category === 'gastos_apoyo' ? `APOYO ${formData.expense_concept || 'GASTOS'}` :
      `HOSPEDAJE ${formData.hotel_name || 'HOTEL'}`
    );

    const fullGuestNames = guestList.map(g => g.name.trim()).filter(Boolean).join(', ');
    const fullGuestCis = guestList.map(g => g.ci.trim()).filter(Boolean).join(' / ');

    try {
      setLoading(true);
      await onSubmit({
        category,
        title: mainTitle.toUpperCase(),
        client: formData.client.toUpperCase(),
        hotel_name: (formData.hotel_name || (category === 'traslado' ? 'SERVICIO TRASLADO' : category === 'vuelos' ? 'AEROLINEA' : category === 'gastos_apoyo' ? 'CAJA CHICA / APOYO' : 'HOTEL')).toUpperCase(),
        guest_name: fullGuestNames,
        guest_ci: fullGuestCis,
        guest_list: guestList,
        locator: formData.locator || String(Math.floor(10000000 + Math.random() * 90000000)),
        location: (formData.location || 'VENEZUELA').toUpperCase(),
        room_type: formData.room_type,
        people_count: guestList.length > 0 ? guestList.length : Number(formData.people_count),
        additionals: formData.additionals,
        nights_dates: formData.nights_dates,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
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

              <div className="bg-teal-50/50 rounded-2xl border border-teal-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-[#00b4a2]" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                      1. Pega aquí el texto del mensaje (WhatsApp o Correo):
                    </span>
                  </div>

                  {/* 2 Selectores: Rubro y Método de Pago */}
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
                </div>

                {/* Caja de Texto Grande y Cómoda */}
                <textarea
                  rows={7}
                  placeholder={`Ejemplo de texto:\n\nAsunto: PAGO PENDIENTE EXTENSION KARIÑA\nCliente: G1\nHotel: HOTEL KARIÑA PUNTA DE MATA\nHuésped: José Gregorio Hernández V-18.452.910\nLOC: 00000015\nFechas: 22/07 AL 27/07\nMonto USD: 450\nTasa BCV: 737.88\nBeneficiario: INVERSIONES HOTEL KARIÑA C.A.\nBanco: BANESCO\nCuenta: 01340034120341098234`}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    handleAutoParseText(e.target.value);
                  }}
                  className="w-full bg-white border border-teal-300 rounded-2xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00b4a2] font-mono shadow-2xs leading-relaxed min-h-[170px]"
                />

                {/* Adjuntar Soporte de Reserva */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <label className="active-press cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{supportFile ? 'Cambiar Soporte' : 'Adjuntar Documento / Foto (Opcional)'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setSupportFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>

                  {supportFile && (
                    <div className="flex items-center gap-1.5 bg-teal-100/80 px-2.5 py-1 rounded-xl text-teal-950 font-bold text-xs truncate max-w-[180px]">
                      <FileText className="w-3 h-3 text-[#00b4a2] shrink-0" />
                      <span className="truncate">{supportFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setSupportFile(null)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. PANEL DINÁMICO DE MONTO Y SELECCIÓN DE MONEDA (SEPARADO DEL MENSAJE) */}
              <div className="bg-white p-4 rounded-2xl border-2 border-teal-300 shadow-xs space-y-3">
                {/* Campos Cliente y Beneficiario */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Cliente / Solicitante *:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. PETRO MONAGAS, G1, etc."
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold text-xs focus:outline-none focus:border-[#00b4a2]"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="text-[11px] font-black text-teal-800 uppercase tracking-wider block">
                      Beneficiario / Titular de Cuenta *:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. HOTEL KARIÑA C.A., MARÍA DELGADO..."
                      value={formData.bank_beneficiary}
                      onChange={(e) => setFormData({ ...formData, bank_beneficiary: e.target.value })}
                      className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1 text-teal-950 font-bold text-xs focus:outline-none focus:border-[#00b4a2]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-[#00b4a2] animate-pulse" />
                      <span>Monto y Moneda de Pago:</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      El monto se separó automáticamente. Selecciona cómo se pagará:
                    </span>
                  </div>

                  {/* Selector de Moneda Dinámico */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrency('VES');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        currency === 'VES'
                          ? 'bg-[#00b4a2] text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>🇻🇪 En Bolívares (VES)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrency('USD');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        currency === 'USD'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>💵 En Divisas (USD / USDT)</span>
                    </button>
                  </div>
                </div>

                {/* Campos Dinámicos de Monto en Vivo */}
                {currency === 'USD' ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-extrabold text-emerald-950 text-xs block">
                        Monto a Pagar en Divisas (USD / USDT)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Pago directo en Binance Pay, Zelle o Efectivo (Sin conversión a Bs.)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-emerald-600">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount_usd === 0 ? '' : formData.amount_usd}
                        onChange={(e) => setFormData({ ...formData, amount_usd: parseFloat(e.target.value) || 0 })}
                        className="w-36 bg-white border-2 border-emerald-400 rounded-xl px-3 py-1.5 text-emerald-700 font-black text-lg focus:outline-none focus:border-emerald-600 text-right shadow-2xs"
                      />
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg">
                        USD/USDT
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-teal-50/60 rounded-xl border border-teal-200">
                    <div>
                      <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                        Monto Base Ref. ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount_usd === 0 ? '' : formData.amount_usd}
                          onChange={(e) => {
                            const usd = parseFloat(e.target.value) || 0;
                            const bs = formData.bcv_rate > 0 ? Number((usd * formData.bcv_rate).toFixed(2)) : formData.amount_bs;
                            setFormData({ ...formData, amount_usd: usd, amount_bs: bs });
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-2.5 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-[#00b4a2] text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-0.5 text-[11px]">
                        Tasa de Cambio (Bs/$)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="0.00"
                        value={formData.bcv_rate === 0 ? '' : formData.bcv_rate}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          const bs = rate > 0 && formData.amount_usd > 0 ? Number((formData.amount_usd * rate).toFixed(2)) : formData.amount_bs;
                          setFormData({ ...formData, bcv_rate: rate, amount_bs: bs });
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold font-mono focus:outline-none focus:border-[#00b4a2] text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[#009b8b] font-black mb-0.5 text-[11px]">
                        Total en Bolívares (Bs.) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount_bs === 0 ? '' : formData.amount_bs}
                        onChange={(e) => {
                          const bs = parseFloat(e.target.value) || 0;
                          const usd = formData.bcv_rate > 0 ? Number((bs / formData.bcv_rate).toFixed(2)) : formData.amount_usd;
                          setFormData({ ...formData, amount_bs: bs, amount_usd: usd });
                        }}
                        className="w-full bg-white border-2 border-teal-400 rounded-xl px-2.5 py-1.5 text-[#009b8b] font-black focus:outline-none focus:border-[#00b4a2] text-xs shadow-2xs"
                      />
                    </div>
                  </div>
                )}
              </div>

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
                    <span className="font-extrabold text-slate-900">{formData.client}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      {category === 'traslado'
                        ? 'Proveedor Traslado:'
                        : category === 'vuelos'
                        ? 'Aerolínea:'
                        : category === 'gastos_apoyo'
                        ? 'Concepto / Destino:'
                        : 'Hotel / Hospedaje:'}
                    </span>
                    <span className="font-extrabold text-[#009b8b] flex items-center gap-1">
                      {category === 'traslado' ? (
                        <Car className="w-3.5 h-3.5 text-emerald-600" />
                      ) : category === 'vuelos' ? (
                        <Plane className="w-3.5 h-3.5 text-sky-600" />
                      ) : category === 'gastos_apoyo' ? (
                        <Receipt className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      {formData.hotel_name || formData.airline || formData.route_from_to || 'Sin especificar'}
                    </span>
                  </div>
                </div>

                {/* Datos del Hospedaje / Pasajeros */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-xs">
                    <Users className="w-3.5 h-3.5 text-[#00b4a2]" />
                    <span>
                      {category === 'traslado'
                        ? 'Datos del Traslado y Pasajeros'
                        : category === 'vuelos'
                        ? 'Datos del Vuelo y Pasajeros'
                        : category === 'gastos_apoyo'
                        ? 'Datos del Beneficiario y Concepto'
                        : 'Datos del Hospedaje y Huéspedes'}
                    </span>
                  </h4>

                  {formData.route_from_to && (
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900">
                      📍 Ruta Terrestre: {formData.route_from_to}
                    </div>
                  )}

                  {formData.flight_route && (
                    <div className="p-2 bg-sky-50 rounded-xl border border-sky-200 text-xs font-bold text-sky-900">
                      ✈️ Ruta Aérea: {formData.airline ? `${formData.airline} • ` : ''} {formData.flight_route}
                    </div>
                  )}

                  {formData.expense_concept && (
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 text-xs font-bold text-purple-900">
                      📝 Concepto: {formData.expense_concept}
                    </div>
                  )}

                  {/* Lista Completa de Huéspedes / Pasajeros */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-slate-500 block text-[11px] font-bold">
                      {guestList.length > 1
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
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 uppercase">
                      {paymentMethod.replace(/_/g, ' ')}
                    </span>
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
                {supportFile && (
                  <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between text-teal-900 font-bold text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#00b4a2]" />
                      <span className="truncate">Soporte: {supportFile.name}</span>
                    </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['hospedaje', 'traslado', 'vuelos', 'gastos_apoyo'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs capitalize border ${
                      category === cat ? 'bg-[#00b4a2] text-white border-[#00b4a2]' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {cat.replace(/_/g, ' ')}
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
                  <label className="block text-slate-700 font-bold mb-1">Hotel / Proveedor *</label>
                  <input
                    type="text"
                    value={formData.hotel_name}
                    onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

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
                  <label className="block text-slate-700 font-bold mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fechas / Noches *</label>
                  <input
                    type="text"
                    value={formData.nights_dates}
                    onChange={(e) => setFormData({ ...formData, nights_dates: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Lista Pasajeros */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Pasajeros / Huéspedes ({guestList.length})</span>
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
                      placeholder="Nombre y Apellido"
                      value={g.name}
                      onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      required={idx === 0}
                    />
                    <input
                      type="text"
                      placeholder="Cédula / Pasaporte"
                      value={g.ci}
                      onChange={(e) => handleGuestChange(idx, 'ci', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      required={idx === 0}
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

              {/* Datos Bancarios */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-slate-700 font-bold">Datos Bancarios</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Beneficiario"
                    value={formData.bank_beneficiary}
                    onChange={(e) => setFormData({ ...formData, bank_beneficiary: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                    required
                  />
                  <input
                    type="text"
                    placeholder="RIF / Cédula"
                    value={formData.bank_rif}
                    onChange={(e) => setFormData({ ...formData, bank_rif: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                  />
                  <select
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="N° Cuenta / Pago Móvil / Zelle"
                    value={formData.bank_account || formData.pago_movil_phone || formData.zelle_email}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value, pago_movil_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Botón para regresar a la vista de ficha */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="px-5 py-2.5 rounded-xl bg-[#00b4a2] text-white font-bold text-xs flex items-center gap-1.5"
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
      </div>
    </div>
  );
};
