import React, { useState, useEffect, useMemo } from 'react';
import { Beneficiary, PaymentMethodType, ServiceCategory, UserProfile } from '../types';
import { useCompany } from '../opticavision/context/CompanyContext';
import {
  X,
  Landmark,
  Building2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Globe,
  BookOpen,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface BeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  editingBeneficiary?: Beneficiary | null;
  currentUser?: UserProfile | null;
}

const COMMON_BANKS = [
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
  'BANCO CARIBE'
];

const ACCOUNT_CODE_BY_CATEGORY: Record<ServiceCategory, string> = {
  hospedaje: '5.1.02.001',
  traslado: '5.1.03.001',
  vuelos: '5.1.01.001',
  gastos_apoyo: '5.1.04.001',
  viaticos: '6.1.01.001'
};

function parseBinanceInput(raw: string): { email: string; payId: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { email: '', payId: '' };

  const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  let remainder = email ? trimmed.replace(email, '') : trimmed;
  remainder = remainder
    .replace(/(?:binance\s*)?pay\s*id\s*[:=-]?/gi, '')
    .replace(/[|•/]/g, ' ')
    .trim();

  if (!email && !remainder) {
    return { email: '', payId: trimmed };
  }

  return {
    email,
    payId: remainder
  };
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingBeneficiary,
  currentUser
}) => {
  const { cuentasContables } = useCompany();

  const cuentasMovimiento = useMemo(() => {
    return (cuentasContables || [])
      .filter((c: any) => c.tipo === 'Movimiento' || !c.tipo)
      .sort((a: any, b: any) => (a.codigo || '').localeCompare(b.codigo || ''));
  }, [cuentasContables]);

  const [name, setName] = useState('');
  const [rif, setRif] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('hospedaje');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('transferencia_bs');
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');

  // Campos Bolívares (Transferencia Bs / Pago Móvil Bs)
  const [bank, setBank] = useState('BANESCO');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('Corriente');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');

  // Campo unificado Binance Pay (Correo o Pay ID)
  const [binanceEmailOrId, setBinanceEmailOrId] = useState('');

  // Campos Transferencia Internacional USD
  const [usdIntlBankName, setUsdIntlBankName] = useState('');
  const [usdIntlAccountNumber, setUsdIntlAccountNumber] = useState('');
  const [usdIntlSwiftOrAba, setUsdIntlSwiftOrAba] = useState('');
  const [usdIntlBankAddressOrCountry, setUsdIntlBankAddressOrCountry] = useState('');
  const [usdIntlAccountTypeOrNotes, setUsdIntlAccountTypeOrNotes] = useState('');

  // Campos Zelle
  const [zelleEmailOrPhone, setZelleEmailOrPhone] = useState('');
  const [zelleName, setZelleName] = useState('');

  // Campos Efectivo
  const [cashReceiver, setCashReceiver] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const resolveDefaultAccountForCategory = (cat: ServiceCategory): string => {
    const targetCode = ACCOUNT_CODE_BY_CATEGORY[cat] || '5.1.04.001';
    const matched = cuentasMovimiento.find((c: any) => c.codigo === targetCode);
    return matched ? String(matched.id) : cuentasMovimiento[0] ? String(cuentasMovimiento[0].id) : '';
  };

  useEffect(() => {
    if (!isOpen) return;

    setConfirmingDelete(false);
    setErrorMsg('');

    if (editingBeneficiary) {
      const details = editingBeneficiary.bank_details || ({} as any);
      const method: PaymentMethodType = details.payment_method || 'transferencia_bs';
      const cat: ServiceCategory = editingBeneficiary.category || 'hospedaje';

      setName(editingBeneficiary.name || '');
      setRif(editingBeneficiary.rif || details.rif || details.pago_movil_ci || '');
      setCategory(cat);
      setPaymentMethod(method);

      const matchedAcc =
        cuentasMovimiento.find(
          (c: any) =>
            (details.default_account_id && String(c.id) === String(details.default_account_id)) ||
            (details.default_account_code && c.codigo === details.default_account_code)
        ) || cuentasMovimiento.find((c: any) => c.codigo === ACCOUNT_CODE_BY_CATEGORY[cat]);
      setDefaultAccountId(
        matchedAcc
          ? String(matchedAcc.id)
          : details.default_account_id || resolveDefaultAccountForCategory(cat)
      );

      setBank(details.bank || 'BANESCO');
      setAccountNumber(details.account_number || '');
      setAccountType(details.account_type || 'Corriente');
      setPagoMovilPhone(details.pago_movil_phone || '');

      const bEmail = (details.binance_email || '').trim();
      const bId = (details.binance_pay_id || '').trim();
      if (bEmail && bId) {
        setBinanceEmailOrId(`${bEmail} | Pay ID: ${bId}`);
      } else {
        setBinanceEmailOrId(bEmail || bId || '');
      }

      if (method === 'transferencia_usd') {
        setUsdIntlBankName(details.bank || '');
        setUsdIntlAccountNumber(details.account_number || '');
        setUsdIntlSwiftOrAba(details.swift_or_aba || '');
        setUsdIntlBankAddressOrCountry(details.bank_country_or_address || '');
        setUsdIntlAccountTypeOrNotes(details.intermediary_bank_or_notes || details.notes || '');
      } else {
        setUsdIntlBankName('');
        setUsdIntlAccountNumber('');
        setUsdIntlSwiftOrAba('');
        setUsdIntlBankAddressOrCountry('');
        setUsdIntlAccountTypeOrNotes('');
      }

      setZelleEmailOrPhone(details.zelle_email || '');
      setZelleName(details.zelle_name || editingBeneficiary.name || '');
      setCashReceiver(details.cash_receiver || '');
      setNotes(details.notes || '');
    } else {
      setName('');
      setRif('');
      setCategory('hospedaje');
      setPaymentMethod('transferencia_bs');
      setDefaultAccountId(resolveDefaultAccountForCategory('hospedaje'));
      setBank('BANESCO');
      setAccountNumber('');
      setAccountType('Corriente');
      setPagoMovilPhone('');
      setBinanceEmailOrId('');
      setUsdIntlBankName('');
      setUsdIntlAccountNumber('');
      setUsdIntlSwiftOrAba('');
      setUsdIntlBankAddressOrCountry('');
      setUsdIntlAccountTypeOrNotes('');
      setZelleEmailOrPhone('');
      setZelleName('');
      setCashReceiver('');
      setNotes('');
    }
  }, [editingBeneficiary, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: ServiceCategory) => {
    setCategory(cat);
    const nextAccId = resolveDefaultAccountForCategory(cat);
    if (nextAccId) {
      setDefaultAccountId(nextAccId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('⚠️ Por favor ingresa el nombre o razón social del beneficiario.');
      return;
    }

    const upperName = name.trim().toUpperCase();
    let finalRif = rif.trim().toUpperCase();
    let finalBank = bank.trim().toUpperCase();
    let finalAccountNumber = '';
    let finalPagoMovilPhone = '';
    let finalPagoMovilCi = '';
    let finalBinanceEmail = '';
    let finalBinancePayId = '';
    let finalZelleEmail = '';
    let finalZelleName = '';
    let finalCashReceiver = '';
    let finalSwiftOrAba = '';
    let finalBankCountry = '';
    let finalIntermediary = '';
    let finalNotes = notes.trim();

    if (paymentMethod === 'transferencia_bs') {
      if (!finalBank || !accountNumber.trim() || !finalRif) {
        setErrorMsg(
          '⚠️ Para pagos en Bolívares debes ingresar Nombre del Banco, Número de Cuenta Completo y RIF o Cédula.'
        );
        return;
      }
      finalAccountNumber = accountNumber.trim();
    } else if (paymentMethod === 'pago_movil') {
      if (!finalBank || !pagoMovilPhone.trim() || !finalRif) {
        setErrorMsg(
          '⚠️ Para Pago Móvil en Bolívares debes ingresar Nombre del Banco, Teléfono Pago Móvil y RIF o Cédula.'
        );
        return;
      }
      finalPagoMovilPhone = pagoMovilPhone.trim();
      finalPagoMovilCi = finalRif;
      finalAccountNumber = accountNumber.trim();
    } else if (paymentMethod === 'binance') {
      if (!binanceEmailOrId.trim()) {
        setErrorMsg('⚠️ Para Binance Pay ingresa el Correo Electrónico o Binance Pay ID.');
        return;
      }
      const parsed = parseBinanceInput(binanceEmailOrId);
      finalBank = 'BINANCE PAY';
      finalBinanceEmail = parsed.email;
      finalBinancePayId = parsed.payId;
    } else if (paymentMethod === 'transferencia_usd') {
      if (
        !usdIntlBankName.trim() ||
        !usdIntlAccountNumber.trim() ||
        !usdIntlSwiftOrAba.trim()
      ) {
        setErrorMsg(
          '⚠️ Para Transferencia USD ingresa el Banco Internacional, Número de Cuenta y código SWIFT / ABA.'
        );
        return;
      }
      finalBank = usdIntlBankName.trim().toUpperCase();
      finalAccountNumber = usdIntlAccountNumber.trim();
      finalSwiftOrAba = usdIntlSwiftOrAba.trim().toUpperCase();
      finalBankCountry = usdIntlBankAddressOrCountry.trim();
      finalIntermediary = usdIntlAccountTypeOrNotes.trim();
      if (finalIntermediary) {
        finalNotes = finalIntermediary;
      }
    } else if (paymentMethod === 'zelle_usd') {
      if (!zelleEmailOrPhone.trim()) {
        setErrorMsg('⚠️ Para Zelle ingresa el Correo Electrónico o Teléfono Zelle.');
        return;
      }
      finalBank = 'ZELLE (USD)';
      finalZelleEmail = zelleEmailOrPhone.trim();
      finalZelleName = (zelleName.trim() || upperName).toUpperCase();
    } else if (paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') {
      if (!cashReceiver.trim()) {
        setErrorMsg('⚠️ Por favor ingresa el nombre de la persona responsable o receptora del efectivo.');
        return;
      }
      finalBank = 'EFECTIVO';
      finalCashReceiver = cashReceiver.trim().toUpperCase();
    }

    const matchedAcc = cuentasMovimiento.find(
      (c: any) => String(c.id) === String(defaultAccountId)
    );

    try {
      setLoading(true);
      await onSave({
        name: upperName,
        rif: finalRif,
        category,
        bank_details: {
          payment_method: paymentMethod,
          beneficiary: upperName,
          rif: finalRif,
          bank: finalBank,
          account_number: finalAccountNumber,
          account_type: accountType,
          pago_movil_phone: finalPagoMovilPhone,
          pago_movil_ci: finalPagoMovilCi,
          binance_email: finalBinanceEmail,
          binance_pay_id: finalBinancePayId,
          zelle_email: finalZelleEmail,
          zelle_name: finalZelleName,
          cash_receiver: finalCashReceiver,
          swift_or_aba: finalSwiftOrAba || undefined,
          bank_country_or_address: finalBankCountry || undefined,
          intermediary_bank_or_notes: finalIntermediary || undefined,
          default_account_id: matchedAcc ? String(matchedAcc.id) : defaultAccountId || undefined,
          default_account_code: matchedAcc?.codigo || undefined,
          default_account_name: matchedAcc?.nombre || undefined,
          notes: finalNotes
        }
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el beneficiario');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingBeneficiary || !onDelete) return;
    try {
      setLoading(true);
      await onDelete(editingBeneficiary.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el beneficiario');
      setConfirmingDelete(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-modal max-h-[92vh] flex flex-col text-slate-800 my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#00b4a2] flex items-center justify-center border border-teal-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                {editingBeneficiary ? 'Editar Beneficiario' : 'Registrar Nuevo Beneficiario'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Configura los datos bancarios exactos según la moneda y método de pago
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Nombre / Razón Social */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Nombre / Razón Social del Beneficiario <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: HOTEL KARIÑA C.A., COPA AIRLINES, TRANSFERPRO..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2]"
              required
            />
          </div>

          {/* 2. Rubro y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Rubro de Servicio <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as ServiceCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2] cursor-pointer"
              >
                <option value="hospedaje">🏨 Hospedaje / Hotel</option>
                <option value="traslado">🚗 Traslado Ejecutivo</option>
                <option value="vuelos">✈️ Vuelo / Boleto</option>
                <option value="gastos_apoyo">🧾 Gastos de Apoyo</option>
                <option value="viaticos">💼 Solicitud de Viáticos</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Método de Pago Preferido <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full bg-teal-50/70 border-2 border-teal-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-[#00b4a2] cursor-pointer"
              >
                <option value="transferencia_bs">🏦 Pago en Bolívares — Transferencia (Bs)</option>
                <option value="pago_movil">📱 Pago en Bolívares — Pago Móvil (Bs)</option>
                <option value="binance">💰 Binance Pay (USDT)</option>
                <option value="transferencia_usd">🌎 Transferencia USD (Banco Internacional)</option>
                <option value="zelle_usd">💵 Zelle (USD)</option>
                <option value="efectivo_usd">💵 Efectivo (USD / Bs)</option>
              </select>
            </div>
          </div>

          {/* Datalist de bancos populares */}
          <datalist id="tp-common-banks-list">
            {COMMON_BANKS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>

          {/* 3. Formulario Bancario Dinámico según el Método Seleccionado */}
          {(paymentMethod === 'transferencia_bs' || paymentMethod === 'pago_movil') && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
                  <span>
                    Datos Bancarios para Pago en Bolívares (
                    {paymentMethod === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'})
                  </span>
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  🇻🇪 Requiere Banco, Cuenta y RIF/Cédula
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombre del Banco <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="tp-common-banks-list"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="Ej: BANESCO, MERCANTIL, BDV, BNC, PROVINCIAL"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Número de RIF o Cédula <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="Ej: J-40128940-1 o V-15432100"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2]"
                    required
                  />
                </div>
              </div>

              {paymentMethod === 'transferencia_bs' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Número de Cuenta Completo (20 dígitos){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                      placeholder="Ej: 0134-0347-3334-7104-3582"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00b4a2]"
                    >
                      <option value="Corriente">Corriente</option>
                      <option value="Ahorro">Ahorro</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Teléfono Pago Móvil <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pagoMovilPhone}
                      onChange={(e) => setPagoMovilPhone(e.target.value.replace(/[^0-9-]/g, ''))}
                      placeholder="Ej: 0414-1234567"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Número de Cuenta Completo (Opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                      placeholder="0134-..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'binance' && (
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-black text-amber-950 uppercase flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  <span>Datos de Pago Binance Pay (USDT)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                  💰 Solo Correo o Pay ID
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Correo Electrónico o Binance Pay ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={binanceEmailOrId}
                  onChange={(e) => setBinanceEmailOrId(e.target.value)}
                  placeholder="Ej: pagos@proveedor.com o Pay ID: 520889150"
                  className="w-full bg-white border-2 border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-amber-800 font-medium mt-1">
                  Para pagos por Binance solo es necesario indicar el correo electrónico o el ID de Binance.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'transferencia_usd' && (
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[11px] font-black text-emerald-950 uppercase flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Datos de Banco Internacional (Transferencia USD)</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                  🌎 Transferencia Internacional USD
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Nombre del Banco Internacional <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={usdIntlBankName}
                    onChange={(e) => setUsdIntlBankName(e.target.value)}
                    placeholder="Ej: Banesco Panamá, Bank of America, Chase"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Número de Cuenta Internacional / IBAN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={usdIntlAccountNumber}
                    onChange={(e) => setUsdIntlAccountNumber(e.target.value)}
                    placeholder="Ej: 201000489102 / US893704..."
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Código SWIFT / BIC o ABA Routing <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={usdIntlSwiftOrAba}
                    onChange={(e) => setUsdIntlSwiftOrAba(e.target.value)}
                    placeholder="Ej: SWIFT: BANSPAPA / ABA: 026009593"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    País / Dirección del Banco / Tipo de Cuenta
                  </label>
                  <input
                    type="text"
                    value={usdIntlBankAddressOrCountry}
                    onChange={(e) => setUsdIntlBankAddressOrCountry(e.target.value)}
                    placeholder="Ej: Ciudad de Panamá • Checking USD"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    RIF / Tax ID / Identificación del Beneficiario
                  </label>
                  <input
                    type="text"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="Ej: J-30491822-1 / Tax ID"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Banco Intermediario / Instrucciones (Opcional)
                  </label>
                  <input
                    type="text"
                    value={usdIntlAccountTypeOrNotes}
                    onChange={(e) => setUsdIntlAccountTypeOrNotes(e.target.value)}
                    placeholder="Ej: Débito automático BSP / Citibank NY"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'zelle_usd' && (
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-indigo-950 uppercase">
                  💵 Datos de Cuenta Zelle (USD)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Correo Electrónico o Teléfono Zelle <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={zelleEmailOrPhone}
                    onChange={(e) => setZelleEmailOrPhone(e.target.value)}
                    placeholder="Ej: tesoreria@empresa.com o +1..."
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Titular Registrado en Zelle
                  </label>
                  <input
                    type="text"
                    value={zelleName}
                    onChange={(e) => setZelleName(e.target.value)}
                    placeholder="Ej: Travel Point LLC"
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {(paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <span className="text-[11px] font-black text-slate-800 uppercase block">
                💵 Datos de Entrega en Efectivo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Persona Responsable / Receptor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cashReceiver}
                    onChange={(e) => setCashReceiver(e.target.value)}
                    placeholder="Nombre de la persona que recibe"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Notas / Lugar de Entrega (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Oficina Principal / Taquilla"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notas opcionales para otros métodos */}
          {paymentMethod !== 'transferencia_usd' &&
            paymentMethod !== 'efectivo_usd' &&
            paymentMethod !== 'efectivo_bs' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Notas / Observaciones Bancarias (Opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Solo transferencias antes de las 3pm, cuenta jurídica..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                />
              </div>
            )}

          {/* Cuenta Contable Predeterminada (Solo visible para Administradores) */}
          {currentUser?.role === 'admin' && cuentasMovimiento.length > 0 && (
            <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1">
              <label className="block text-[11px] font-black text-teal-950 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00b4a2]" />
                <span>Cuenta Contable Predeterminada del Proveedor</span>
              </label>
              <select
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
                className="w-full bg-white border border-teal-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#00b4a2]"
              >
                {cuentasMovimiento.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.codigo} — {acc.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Confirmación inline de eliminación si se presionó Eliminar */}
          {confirmingDelete && editingBeneficiary && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>¿Eliminar permanentemente a "{editingBeneficiary.name}"?</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px]"
                >
                  No
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleConfirmDelete()}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px]"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div>
              {editingBeneficiary && onDelete && !confirmingDelete && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setConfirmingDelete(true)}
                  className="active-press px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="active-press px-5 py-2 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-black text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Guardando...'
                    : editingBeneficiary
                    ? 'Guardar Cambios'
                    : 'Registrar Beneficiario'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
