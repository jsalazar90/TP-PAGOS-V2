import React, { useState } from 'react';
import { CreatePaymentRequestInput, PaymentCurrency, PaymentMethodType, ServiceCategory } from '../types';
import {
  X,
  Upload,
  Calculator,
  Landmark,
  Sparkles,
  Building2,
  User,
  Wand2,
  UserPlus,
  Trash2,
  Smartphone,
  CreditCard,
  DollarSign,
  QrCode,
  Clipboard,
  Car,
  Receipt,
  Hotel,
  AlertTriangle
} from 'lucide-react';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePaymentRequestInput) => Promise<void>;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSmartPaste, setShowSmartPaste] = useState(true);
  const [rawText, setRawText] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [activeTemplateType, setActiveTemplateType] = useState<'bs' | 'pm' | 'binance' | 'traslado' | 'gastos'>('bs');

  // Category State
  const [category, setCategory] = useState<ServiceCategory>('hospedaje');

  // Urgent Toggle State (Default false -> En Proceso, if true -> Urgente)
  const [isUrgent, setIsUrgent] = useState(false);

  // Currency & Payment Method States
  const [currency, setCurrency] = useState<PaymentCurrency>('VES');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('transferencia_bs');

  // Dynamic Multiple Guests / Passengers State
  const [guestList, setGuestList] = useState<Array<{ name: string; ci: string }>>([
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
    client: 'G1',
    hotel_name: '',
    locator: '',
    location: '',
    room_type: 'HABITACION SENCILLA',
    people_count: 1,
    additionals: 'Desayuno incluido',
    nights_dates: '',
    route_from_to: '',
    expense_concept: '',
    amount_usd: 100,
    bcv_rate: 737.88,
    bank_beneficiary: '',
    bank_rif: '',
    bank_name: 'BANESCO',
    bank_account: '',
    pago_movil_phone: '',
    pago_movil_ci: '',
    binance_email: '',
    binance_pay_id: '',
    zelle_email: '',
    notes: '',
  });

  const [supportFile, setSupportFile] = useState<File | null>(null);

  const calculatedBs = currency === 'VES'
    ? (Number(formData.amount_usd || 0) * Number(formData.bcv_rate || 0)).toFixed(2)
    : '0.00';

  if (!isOpen) return null;

  // Sample templates for smart copy & paste
  const SAMPLE_TEMPLATES = {
    bs: `Asunto: PAGO PENDIENTE EXTENSION KARIÑA
Servicio: Hospedaje
Cliente: G1
Hotel: HOTEL KARIÑA PUNTA DE MATA
Huésped: José Gregorio Hernández V-18.452.910 
LOC: 00000015
Ubicación: PUNTA DE MATA
Habitación: HABITACION SENCILLA
Personas: 1
Fechas: 22/07 AL 27/07
Monto USD: 450
Tasa BCV: 737.88
Beneficiario: INVERSIONES HOTEL KARIÑA C.A.
RIF: J-30981234-5
Banco: BANESCO
Cuenta: 01340034120341098234`,

    pm: `Asunto: PAGO MO VIL HOSPEDAJE VALENCIA (URGENTE)
Servicio: Hospedaje
Cliente: G1
Prioridad: URGENTE
Hotel: HOTEL EMBASSY VALENCIA
Huésped: María Delgado V-20.123.456
LOC: 00000022
Fechas: 25/07 AL 27/07
Monto USD: 180
Tasa BCV: 737.88
Beneficiario: MARIA DELGADO
Banco: MERCANTIL
Pago movil: 04141234567
Cedula PM: 20123456`,

    binance: `Asunto: PAGO DIRECTO BINANCE USDT - HOSPEDAJE MARACAY
Servicio: Hospedaje
Cliente: VIP
Hotel: HOTEL MARACAY PALACE
Huésped: Gabriel Torres V-24.512.900
LOC: 00000030
Fechas: 26/07 AL 28/07
Monto USD: 250
Metodo: Binance
Beneficiario: MARACAY PALACE SUITES
Binance Email: pagos.maracaypalace@binance.com
Pay ID: 891024351`,

    traslado: `Asunto: PAGO TRASLADO EJECUTIVO CARACAS - VALENCIA
Servicio: Traslado
Cliente: PETRO MONAGAS
Empresa: TRANSPORTE EJECUTIVO VIP C.A.
Pasajero: Ing. José Manuel Silva V-14.890.123
LOC: TR-00019
Ruta: Aeropuerto Maiquetía -> Hotel Embassy Valencia
Ubicación: CARACAS / VALENCIA
Vehículo: CAMIONETA FORTUNER 4X4
Fechas: 26/07/2026
Monto USD: 150
Tasa BCV: 737.88
Beneficiario: TRANSPORTE EJECUTIVO VIP
Banco: BANESCO
Pago movil: 04129876543
Cedula PM: 409128374`,

    gastos: `Asunto: APOYO DE VIATICOS Y ALIMENTACION CAMPO (URGENTE)
Servicio: Gastos / Apoyos
Prioridad: URGENTE
Cliente: G1
Concepto: Apoyo para combustible y logística de inspección
Beneficiario: Técnico Pedro Luis Colmenares V-21.432.109
LOC: AP-00020
Ubicación: PUNTA DE MATA
Fechas: 25/07 AL 27/07
Monto USD: 120
Metodo: Binance
Beneficiario: PEDRO LUIS COLMENARES
Binance Email: pedro.colmenares@gmail.com`
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
    if (/servicio\s*:\s*traslado|traslado|transporte|chofer|ruta|vehiculo|vehículo|caracas\s*-\s*valencia/i.test(textToParse)) {
      detectedCategory = 'traslado';
    } else if (/servicio\s*:\s*gasto|gasto|apoyo|viático|viatico|reembolso|caja\s*chica|alimentación/i.test(textToParse)) {
      detectedCategory = 'gastos_apoyo';
    } else if (/hospedaje|hotel|habitación|habitacion/i.test(textToParse)) {
      detectedCategory = 'hospedaje';
    }
    setCategory(detectedCategory);

    const parsedTitle = getValue(['Asunto', 'Titulo', 'Título', 'Pago']) || (lines[0] && !lines[0].includes(':') ? lines[0] : '');
    const parsedClient = getValue(['Cliente', 'Empresa']) || formData.client;

    const parsedHotel = getValue(['Hotel', 'Nombre del Hotel', 'Hospedaje', 'Empresa Traslado', 'Línea', 'Proveedor']);
    const parsedLocator = getValue(['LOC', 'Loc', 'Localizador', 'Reserva', 'N° Orden']);
    const parsedLocation = getValue(['Ubicación', 'Ubicacion', 'Ciudad', 'Destino']);
    const parsedRoomType = getValue(['Habitación', 'Habitacion', 'Tipo', 'Vehículo', 'Vehiculo']);
    const parsedPeople = getValue(['Personas', 'Cant. Personas', 'Huéspedes', 'Pasajeros']);
    const parsedNightsDates = getValue(['Fechas', 'Noches', 'Periodo', 'Check-in', 'Fecha Traslado']);
    const parsedAdditionals = getValue(['Adicionales', 'Adicional', 'Servicios', 'Detalles']);

    const parsedRoute = getValue(['Ruta', 'Origen - Destino', 'Trayecto']);
    const parsedExpenseConcept = getValue(['Concepto', 'Detalle Gasto', 'Justificación']);

    const rawUsd = getValue(['Monto USD', 'Monto Divisas', 'Monto', 'USD', '\\$']);
    const numUsd = rawUsd ? parseFloat(rawUsd.replace(/[^0-9.]/g, '')) : formData.amount_usd;

    const rawBcv = getValue(['Tasa BCV', 'Tasa', 'BCV']);
    const numBcv = rawBcv ? parseFloat(rawBcv.replace(/[^0-9.]/g, '')) : formData.bcv_rate;

    const parsedBeneficiary = getValue(['Beneficiario', 'Titular', 'A Nombre de']);
    const parsedRif = getValue(['RIF', 'Rif', 'Rif Beneficiario']);
    const parsedBank = getValue(['Banco', 'Entidad']);
    const parsedAccount = getValue(['Cuenta', 'N° Cuenta', 'Numero de Cuenta']);
    const parsedPagoMovilPhone = getValue(['Pago movil', 'Pago móvil', 'Teléfono PM', 'Telefono PM', 'Telefono', 'Teléfono']);
    const parsedPagoMovilCi = getValue(['Cedula PM', 'Cédula PM', 'Cedula Pago Movil', 'Cédula Pago Móvil', 'CI PM']) || getValue(['Cedula', 'Cédula']);

    const parsedBinanceEmail = getValue(['Binance Email', 'Correo Binance', 'Email Binance', 'Binance ID Email']);
    const parsedBinancePayId = getValue(['Pay ID', 'Binance Pay ID', 'PayID', 'Binance ID']);

    const parsedZelleEmail = getValue(['Email Zelle', 'Correo Zelle', 'Zelle Email', 'Zelle']);

    // Detect Payment Method & Currency Automatically
    let detectedMethod: PaymentMethodType = paymentMethod;
    let detectedCurrency: PaymentCurrency = currency;

    if (parsedBinanceEmail || parsedBinancePayId || /binance/i.test(textToParse)) {
      detectedMethod = 'binance';
      detectedCurrency = 'USD';
    } else if (parsedZelleEmail || /zelle/i.test(textToParse)) {
      detectedMethod = 'zelle_usd';
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
    const parsedGuests: Array<{ name: string; ci: string }> = [];

    const guestHeaderIdx = lines.findIndex(l => /^Huésped|^Huesped|^Pasajeros|^Pasajero|^Nombres|^Beneficiario Gasto/i.test(l));
    if (guestHeaderIdx !== -1) {
      const headerLine = lines[guestHeaderIdx];
      const inlineVal = headerLine.replace(/^Huésped|^Huesped|^Pasajeros|^Pasajero|^Nombres|^Beneficiario Gasto/i, '').replace(/^[:=-]\s*/, '').trim();

      const candidateLines: string[] = [];
      if (inlineVal) candidateLines.push(inlineVal);

      for (let i = guestHeaderIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (!l) continue;
        if (/^(LOC|Ubicación|Ubicacion|Habitación|Habitacion|Personas|Fechas|Adicionales|Monto|Tasa|Beneficiario|RIF|Banco|Cuenta|Pago movil|Pago móvil|Cedula PM|Cédula PM|Binance|Zelle|Pay ID|Ruta|Concepto)/i.test(l)) {
          break;
        }
        candidateLines.push(l);
      }

      for (const lineStr of candidateLines) {
        const match = lineStr.match(/^(.+?)\s+([VEJ]-?\s*[\d.]{5,12}|\b\d{7,10}\b)$/i);
        if (match) {
          parsedGuests.push({ name: match[1].trim(), ci: match[2].trim() });
        } else if (lineStr.trim()) {
          parsedGuests.push({ name: lineStr.trim(), ci: '' });
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
      expense_concept: parsedExpenseConcept || prev.expense_concept,
      amount_usd: isNaN(numUsd) ? prev.amount_usd : numUsd,
      bcv_rate: isNaN(numBcv) ? prev.bcv_rate : numBcv,
      bank_beneficiary: parsedBeneficiary || prev.bank_beneficiary,
      bank_rif: parsedRif || prev.bank_rif,
      bank_name: parsedBank ? parsedBank.toUpperCase() : prev.bank_name,
      bank_account: parsedAccount ? parsedAccount.replace(/[^0-9-]/g, '') : prev.bank_account,
      pago_movil_phone: parsedPagoMovilPhone ? parsedPagoMovilPhone.replace(/[^0-9]/g, '') : prev.pago_movil_phone,
      pago_movil_ci: parsedPagoMovilCi || prev.pago_movil_ci,
      binance_email: parsedBinanceEmail || prev.binance_email,
      binance_pay_id: parsedBinancePayId || prev.binance_pay_id,
      zelle_email: parsedZelleEmail || prev.zelle_email,
    }));
  };

  const handleReadSupportClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setErrorMsg('Presiona Ctrl + V para pegar la imagen de la captura del soporte.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          const file = new File([blob], `soporte_${Date.now()}.png`, { type: imgType });
          setSupportFile(file);
          return;
        }
      }
      setErrorMsg('No se encontró ninguna imagen en el portapapeles.');
    } catch (err) {
      setErrorMsg('Usa el teclado (Ctrl + V) para pegar la captura.');
    }
  };

  const handleCopyTemplate = (type: 'bs' | 'pm' | 'binance' | 'traslado' | 'gastos') => {
    navigator.clipboard.writeText(SAMPLE_TEMPLATES[type]);
    setActiveTemplateType(type);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const firstGuest = guestList[0];
    const mainTitle = formData.title || (
      category === 'traslado' ? `TRASLADO ${formData.hotel_name || 'EJECUTIVO'}` :
      category === 'gastos_apoyo' ? `APOYO ${formData.expense_concept || 'GASTOS'}` :
      `HOSPEDAJE ${formData.hotel_name}`
    );

    if (!mainTitle || !firstGuest?.name?.trim() || !formData.nights_dates) {
      setErrorMsg('Por favor completa los campos requeridos (*), incluyendo al menos Nombre del Huésped / Pasajero / Beneficiario y Fecha');
      return;
    }

    if (!formData.bank_beneficiary) {
      setErrorMsg('El nombre del beneficiario o titular es obligatorio');
      return;
    }

    if (paymentMethod === 'transferencia_bs' && !formData.bank_account) {
      setErrorMsg('Por favor ingresa el N° de Cuenta bancaria del beneficiario');
      return;
    }

    if (paymentMethod === 'pago_movil' && (!formData.pago_movil_phone || !formData.pago_movil_ci)) {
      setErrorMsg('Por favor ingresa el Teléfono y Cédula/RIF para Pago Móvil');
      return;
    }

    if (paymentMethod === 'binance' && (!formData.binance_email && !formData.binance_pay_id)) {
      setErrorMsg('Por favor ingresa el Correo Electrónico Binance o el Pay ID');
      return;
    }

    if (paymentMethod === 'zelle_usd' && (!formData.zelle_email && !formData.bank_account)) {
      setErrorMsg('Por favor ingresa el Correo de Zelle o Número de Cuenta en dólares');
      return;
    }

    const fullGuestNames = guestList.map(g => g.name.trim()).filter(Boolean).join(', ');
    const fullGuestCis = guestList.map(g => g.ci.trim()).filter(Boolean).join(' / ');

    try {
      setLoading(true);
      await onSubmit({
        category,
        title: mainTitle.toUpperCase(),
        client: formData.client.toUpperCase(),
        hotel_name: (formData.hotel_name || (category === 'traslado' ? 'SERVICIO TRASLADO' : category === 'gastos_apoyo' ? 'CAJA CHICA / APOYO' : 'HOTEL')).toUpperCase(),
        guest_name: fullGuestNames,
        guest_ci: fullGuestCis,
        locator: formData.locator || String(Math.floor(10000000 + Math.random() * 90000000)),
        location: (formData.location || 'VENEZUELA').toUpperCase(),
        room_type: formData.room_type,
        people_count: guestList.length > 0 ? guestList.length : Number(formData.people_count),
        additionals: formData.additionals,
        nights_dates: formData.nights_dates,
        route_from_to: formData.route_from_to,
        expense_concept: formData.expense_concept,
        currency,
        amount_usd: Number(formData.amount_usd),
        bcv_rate: currency === 'USD' ? 0 : Number(formData.bcv_rate),
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
          notes: formData.notes
        },
        support_file: supportFile,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-modal max-h-[92vh] flex flex-col my-auto text-slate-800">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Nueva Solicitud de Pago</h2>
              <p className="text-[11px] text-slate-500">Hospedaje, Traslados y Apoyos / Gastos Logísticos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* SELECTOR CATEGORÍA DE SERVICIO */}
          <div className="bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] uppercase font-bold text-slate-600 px-1 flex items-center gap-1">
              Tipo de Servicio:
            </span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setCategory('hospedaje')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                  category === 'hospedaje'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Hotel className="w-3.5 h-3.5" />
                <span>🏨 Hospedaje</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('traslado')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                  category === 'traslado'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>🚗 Traslado</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('gastos_apoyo')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                  category === 'gastos_apoyo'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>📋 Gastos / Apoyo</span>
              </button>
            </div>
          </div>

          {/* TOGGLE SOLICITUD URGENTE */}
          <div className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
            isUrgent ? 'bg-rose-50 border-rose-300 shadow-2xs' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
              <div>
                <span className={`font-bold text-xs block ${isUrgent ? 'text-rose-900' : 'text-slate-800'}`}>
                  ¿Marcar Solicitud como URGENTE?
                </span>
                <span className="text-[11px] text-slate-500">
                  {isUrgent ? '🚨 Se enviará con prioridad máxima como URGENTE' : 'Por defecto se enviará en estado "En Proceso"'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isUrgent ? 'bg-rose-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isUrgent ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* CAJA DE PEGADO INTELIGENTE */}
          <div className="bg-indigo-50/60 rounded-xl border border-indigo-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSmartPaste(!showSmartPaste)}
                className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs hover:text-indigo-700 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>⚡ PEGADO RÁPIDO INTELIGENTE (Auto-procesado)</span>
              </button>

              {/* Dynamic Copiar Plantilla */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('bs')}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    copiedTemplate && activeTemplateType === 'bs'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white text-indigo-700 border-indigo-200'
                  }`}
                >
                  {copiedTemplate && activeTemplateType === 'bs' ? '✓ Copiado' : 'Hotel (BS)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('traslado')}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    copiedTemplate && activeTemplateType === 'traslado'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white text-indigo-700 border-indigo-200'
                  }`}
                >
                  {copiedTemplate && activeTemplateType === 'traslado' ? '✓ Copiado' : 'Traslado'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('gastos')}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    copiedTemplate && activeTemplateType === 'gastos'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white text-indigo-700 border-indigo-200'
                  }`}
                >
                  {copiedTemplate && activeTemplateType === 'gastos' ? '✓ Copiado' : 'Gastos/Apoyo'}
                </button>
              </div>
            </div>

            {showSmartPaste && (
              <div className="space-y-1.5">
                <textarea
                  rows={2}
                  placeholder="Pega aquí la información del mensaje (WhatsApp, Correo, Binance Pay ID, Traslado, Gastos, Urgente)..."
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    handleAutoParseText(e.target.value);
                  }}
                  className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Sección 1: Datos Generales */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] uppercase font-bold text-indigo-700 tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> 1. Datos Generales del Servicio ({category.toUpperCase()})
            </h3>

            <div>
              <label className="block text-slate-700 font-semibold mb-0.5">Asunto / Título *</label>
              <input
                type="text"
                placeholder={
                  category === 'traslado' ? 'Ej. TRASLADO EJECUTIVO CARACAS - VALENCIA' :
                  category === 'gastos_apoyo' ? 'Ej. APOYO DE VIATICOS Y ALIMENTACION CAMPO' :
                  'Ej. PAGO PENDIENTE EXTENSION KARIÑA'
                }
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Cliente / Empresa *</label>
                <input
                  type="text"
                  placeholder="Ej. G1 o PETRO MONAGAS"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">
                  {category === 'traslado' ? 'Empresa / Proveedor Traslado *' :
                   category === 'gastos_apoyo' ? 'Entidad / Referencia Gasto *' :
                   'Nombre del Hotel *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    category === 'traslado' ? 'Ej. TRANSPORTE EJECUTIVO VIP C.A.' :
                    category === 'gastos_apoyo' ? 'Ej. CAJA CHICA OPERACIONES' :
                    'Ej. HOTEL KARIÑA PUNTA DE MATA'
                  }
                  value={formData.hotel_name}
                  onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Personas / Pasajeros / Beneficiarios y Ruta */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase font-bold text-[#00b4a2] tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> 2.{' '}
                {category === 'traslado' ? `Pasajeros (${guestList.length})` :
                 category === 'gastos_apoyo' ? `Beneficiarios de Apoyo (${guestList.length})` :
                 `Huéspedes (${guestList.length})`} y Detalles
              </h3>
              <button
                type="button"
                onClick={handleAddGuestRow}
                className="active-press flex items-center gap-1 text-[11px] font-bold text-[#00b4a2] hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg border border-teal-200/80 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#00b4a2]" />
                <span>+ Agregar Persona</span>
              </button>
            </div>

            {/* Lista Dinámica de Personas */}
            <div className="space-y-2 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
              {guestList.map((guest, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-2 border-b border-slate-200/60 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      {category === 'traslado' ? `Pasajero #${idx + 1}` :
                       category === 'gastos_apoyo' ? `Beneficiario #${idx + 1}` :
                       `Huésped #${idx + 1}`} (Nombre Completo) {idx === 0 ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      placeholder={`Ej. ${idx === 0 ? 'José Gregorio Hernández' : 'María Gómez'}`}
                      value={guest.name}
                      onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#00b4a2] text-xs font-medium"
                      required={idx === 0}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">
                      Cédula (C.I.) {idx === 0 ? '*' : ''}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder={`Ej. ${idx === 0 ? 'V-18.452.910' : 'V-20.123.456'}`}
                        value={guest.ci}
                        onChange={(e) => handleGuestChange(idx, 'ci', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#00b4a2] text-xs font-medium"
                        required={idx === 0}
                      />
                      {guestList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGuestRow(idx)}
                          title="Eliminar esta persona"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 shrink-0 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom fields for Traslado & Gastos */}
            {category === 'traslado' && (
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Ruta / Trayecto (Origen ➔ Destino)</label>
                <input
                  type="text"
                  placeholder="Ej. Aeropuerto Maiquetía ➔ Hotel Embassy Valencia"
                  value={formData.route_from_to}
                  onChange={(e) => setFormData({ ...formData, route_from_to: e.target.value })}
                  className="w-full bg-indigo-50/60 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            )}

            {category === 'gastos_apoyo' && (
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Concepto del Gasto / Apoyo</label>
                <input
                  type="text"
                  placeholder="Ej. Apoyo para combustible, alimentación e imprevistos de inspección"
                  value={formData.expense_concept}
                  onChange={(e) => setFormData({ ...formData, expense_concept: e.target.value })}
                  className="w-full bg-indigo-50/60 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">N° Orden / LOC</label>
                <input
                  type="text"
                  placeholder={category === 'traslado' ? 'TR-00019' : category === 'gastos_apoyo' ? 'AP-00020' : '00000015'}
                  value={formData.locator}
                  onChange={(e) => setFormData({ ...formData, locator: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Ubicación / Ciudad</label>
                <input
                  type="text"
                  placeholder="Ej. PUNTA DE MATA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">
                  {category === 'traslado' ? 'Tipo de Vehículo' :
                   category === 'gastos_apoyo' ? 'Categoría Gasto' :
                   'Tipo Habitación'}
                </label>
                <input
                  type="text"
                  placeholder={
                    category === 'traslado' ? 'Ej. CAMIONETA FORTUNER 4X4' :
                    category === 'gastos_apoyo' ? 'Ej. GASTOS LOGISTICOS' :
                    'Ej. SENCILLA'
                  }
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Cant. Personas</label>
                <input
                  type="number"
                  min="1"
                  value={formData.people_count}
                  onChange={(e) => setFormData({ ...formData, people_count: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Fecha del Servicio *</label>
                <input
                  type="text"
                  placeholder="Ej. 26/07/2026"
                  value={formData.nights_dates}
                  onChange={(e) => setFormData({ ...formData, nights_dates: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Observaciones / Adicionales</label>
                <input
                  type="text"
                  placeholder="Ej. Chofer + Peajes incluidos"
                  value={formData.additionals}
                  onChange={(e) => setFormData({ ...formData, additionals: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Moneda y Conversión BCV */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-[11px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" /> 3. Moneda y Monto del Pago
              </h3>

              {/* Selector Tasa BCV vs Divisa Directa */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-emerald-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCurrency('VES')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                    currency === 'VES'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>🇻🇪 Pago en BS (Con Tasa BCV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                    currency === 'USD'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>💵 Divisa Directa (USD / USDT)</span>
                </button>
              </div>
            </div>

            {currency === 'USD' ? (
              <div className="bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold text-indigo-900 text-xs block">Pago Directo en Divisas (USD / Binance / Zelle)</span>
                    <span className="text-[11px] text-slate-500">No requiere conversión ni Tasa BCV en Bolívares.</span>
                  </div>
                </div>
                <div className="w-36">
                  <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">Monto Divisas ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={formData.amount_usd}
                    onChange={(e) => setFormData({ ...formData, amount_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-indigo-700 font-extrabold focus:outline-none focus:border-indigo-600 text-sm"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">Monto USD ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150"
                    value={formData.amount_usd}
                    onChange={(e) => setFormData({ ...formData, amount_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-emerald-700 font-extrabold focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">Tasa BCV (BS/$) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="737.88"
                    value={formData.bcv_rate}
                    onChange={(e) => setFormData({ ...formData, bcv_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
                    required={currency === 'VES'}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">Monto BS (Calculado)</label>
                  <div className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-indigo-700 font-black text-sm flex items-center justify-between">
                    <span>BS {calculatedBs}</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">AUTO</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección 4: Datos del Destinatario (Selector de Método) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-[11px] uppercase font-bold text-indigo-700 tracking-wider flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5" /> 4. Método de Pago del Destinatario
              </h3>

              {/* Selector Métodos */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transferencia_bs')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    paymentMethod === 'transferencia_bs'
                      ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3 h-3 text-indigo-600" />
                  <span>Cuenta Banco</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pago_movil')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    paymentMethod === 'pago_movil'
                      ? 'bg-white text-teal-700 shadow-2xs border border-teal-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3 h-3 text-teal-600" />
                  <span>Pago Móvil</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('binance')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    paymentMethod === 'binance'
                      ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>Binance Pay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('zelle_usd')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    paymentMethod === 'zelle_usd'
                      ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>Zelle / USD</span>
                </button>
              </div>
            </div>

            {/* Beneficiario Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Beneficiario / Titular *</label>
                <input
                  type="text"
                  placeholder="Ej. TRANSPORTE EJECUTIVO VIP C.A."
                  value={formData.bank_beneficiary}
                  onChange={(e) => setFormData({ ...formData, bank_beneficiary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              {paymentMethod !== 'binance' && paymentMethod !== 'zelle_usd' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">RIF / C.I. *</label>
                  <input
                    type="text"
                    placeholder="Ej. J-30981234-5"
                    value={formData.bank_rif}
                    onChange={(e) => setFormData({ ...formData, bank_rif: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    required={paymentMethod === 'transferencia_bs'}
                  />
                </div>
              )}
            </div>

            {/* METHOD FIELDS */}
            {paymentMethod === 'binance' && (
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>Datos de Cuenta Binance Pay / USDT</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Correo Electrónico Binance *</label>
                    <input
                      type="email"
                      placeholder="Ej. pagos.transporte@binance.com"
                      value={formData.binance_email}
                      onChange={(e) => setFormData({ ...formData, binance_email: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Binance Pay ID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. 891024351"
                      value={formData.binance_pay_id}
                      onChange={(e) => setFormData({ ...formData, binance_pay_id: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'zelle_usd' && (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/90 space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Datos Zelle / Cuenta Internacional USD</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Correo Electrónico Zelle *</label>
                    <input
                      type="email"
                      placeholder="Ej. zelle.transporte@gmail.com"
                      value={formData.zelle_email}
                      onChange={(e) => setFormData({ ...formData, zelle_email: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Banco / Cuenta USD (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Bank of America / Route..."
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'pago_movil' && (
              <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200/90 space-y-2.5">
                <div className="flex items-center justify-between border-b border-teal-200/60 pb-1">
                  <div className="flex items-center gap-1.5 text-teal-900 font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-teal-600" />
                    <span>Datos de Pago Móvil</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Banco Destino *</label>
                    <input
                      type="text"
                      placeholder="Ej. BANESCO, MERCANTIL..."
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-slate-900 uppercase font-semibold focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Teléfono Pago Móvil *</label>
                    <input
                      type="text"
                      placeholder="Ej. 04129876543"
                      value={formData.pago_movil_phone}
                      onChange={(e) => setFormData({ ...formData, pago_movil_phone: e.target.value })}
                      className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Cédula / RIF PM *</label>
                    <input
                      type="text"
                      placeholder="Ej. 409128374"
                      value={formData.pago_movil_ci}
                      onChange={(e) => setFormData({ ...formData, pago_movil_ci: e.target.value })}
                      className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'transferencia_bs' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">Banco Destino *</label>
                    <input
                      type="text"
                      placeholder="Ej. BANESCO"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2] uppercase font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">N° Cuenta (20 dígitos) *</label>
                    <input
                      type="text"
                      placeholder="0134-0000-00-0000000000"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">Pago Móvil (Teléfono Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. 04129876543"
                      value={formData.pago_movil_phone}
                      onChange={(e) => setFormData({ ...formData, pago_movil_phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5 text-[11px]">Cédula / RIF Pago Móvil</label>
                    <input
                      type="text"
                      placeholder="Ej. 409128374"
                      value={formData.pago_movil_ci}
                      onChange={(e) => setFormData({ ...formData, pago_movil_ci: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección 5: Soporte Adjunto */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-slate-700 font-semibold">Soporte Adjunto (PDF/Foto o Pegar Captura)</label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="active-press cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Seleccionar Archivo</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setSupportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleReadSupportClipboard}
                className="active-press flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5 text-indigo-600" />
                <span>📋 Pegar Captura (Portapapeles)</span>
              </button>

              <span className="text-xs text-slate-600 truncate max-w-[180px] font-mono">
                {supportFile ? supportFile.name : 'Sin archivo'}
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white py-2 -mx-4 px-4 rounded-b-2xl z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="active-press px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Crear Solicitud</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
