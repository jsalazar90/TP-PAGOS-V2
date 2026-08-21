import React, { useState, useEffect } from 'react';
import { Beneficiary, PaymentMethodType, ServiceCategory } from '../types';
import {
  X,
  Landmark,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface BeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editingBeneficiary?: Beneficiary | null;
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
  'BANCO CARIBE',
  'OTRO BANCO'
];

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBeneficiary,
}) => {
  const [name, setName] = useState('');
  const [rif, setRif] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('hospedaje');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('transferencia_bs');

  const [bank, setBank] = useState('BANESCO');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('Corriente');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilCi, setPagoMovilCi] = useState('');
  const [binanceEmail, setBinanceEmail] = useState('');
  const [binancePayId, setBinancePayId] = useState('');
  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleName, setZelleName] = useState('');
  const [cashReceiver, setCashReceiver] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingBeneficiary) {
      setName(editingBeneficiary.name);
      setRif(editingBeneficiary.rif || '');
      setCategory(editingBeneficiary.category || 'hospedaje');
      setPaymentMethod(editingBeneficiary.bank_details?.payment_method || 'transferencia_bs');
      setBank(editingBeneficiary.bank_details?.bank || 'BANESCO');
      setAccountNumber(editingBeneficiary.bank_details?.account_number || '');
      setAccountType(editingBeneficiary.bank_details?.account_type || 'Corriente');
      setPagoMovilPhone(editingBeneficiary.bank_details?.pago_movil_phone || '');
      setPagoMovilCi(editingBeneficiary.bank_details?.pago_movil_ci || '');
      setBinanceEmail(editingBeneficiary.bank_details?.binance_email || '');
      setBinancePayId(editingBeneficiary.bank_details?.binance_pay_id || '');
      setZelleEmail(editingBeneficiary.bank_details?.zelle_email || '');
      setZelleName(editingBeneficiary.bank_details?.zelle_name || '');
      setCashReceiver(editingBeneficiary.bank_details?.cash_receiver || '');
      setNotes(editingBeneficiary.bank_details?.notes || '');
    } else {
      setName('');
      setRif('');
      setCategory('hospedaje');
      setPaymentMethod('transferencia_bs');
      setBank('BANESCO');
      setAccountNumber('');
      setAccountType('Corriente');
      setPagoMovilPhone('');
      setPagoMovilCi('');
      setBinanceEmail('');
      setBinancePayId('');
      setZelleEmail('');
      setZelleName('');
      setCashReceiver('');
      setNotes('');
    }
    setErrorMsg('');
  }, [editingBeneficiary, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('⚠️ Por favor ingresa el nombre o razón social del beneficiario.');
      return;
    }

    if (paymentMethod === 'transferencia_bs' && !accountNumber.trim()) {
      setErrorMsg('⚠️ Por favor ingresa el número de cuenta bancaria.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        name: name.trim().toUpperCase(),
        rif: rif.trim().toUpperCase(),
        category,
        bank_details: {
          payment_method: paymentMethod,
          beneficiary: name.trim().toUpperCase(),
          rif: rif.trim().toUpperCase(),
          bank: bank.trim().toUpperCase(),
          account_number: accountNumber.trim(),
          account_type: accountType,
          pago_movil_phone: pagoMovilPhone.trim(),
          pago_movil_ci: pagoMovilCi.trim().toUpperCase(),
          binance_email: binanceEmail.trim(),
          binance_pay_id: binancePayId.trim(),
          zelle_email: zelleEmail.trim(),
          zelle_name: zelleName.trim(),
          cash_receiver: cashReceiver.trim(),
          notes: notes.trim()
        }
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el beneficiario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-modal max-h-[92vh] flex flex-col text-slate-800 my-auto">
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
                Almacena datos bancarios para autocompletar solicitudes al instante
              </p>
            </div>
          </div>
          <button
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

          {/* Nombre y RIF */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nombre / Razón Social <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: HOTEL KARIÑA C.A., JUAN PEREZ"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">RIF / Cédula</label>
              <input
                type="text"
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="J-12345678-9"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2]"
              />
            </div>
          </div>

          {/* Rubro y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rubro de Servicio</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#00b4a2] cursor-pointer"
              >
                <option value="hospedaje">🏨 Hospedaje / Hotel</option>
                <option value="traslado">🚗 Traslado Ejecutivo</option>
                <option value="vuelos">✈️ Vuelo / Boleto</option>
                <option value="gastos_apoyo">🧾 Gastos de Apoyo</option>
                <option value="viaticos">💼 Solicitud de Viáticos</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Método de Pago Preferido</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-teal-900 bg-teal-50/50 focus:bg-white focus:outline-none focus:border-[#00b4a2] cursor-pointer"
              >
                <option value="transferencia_bs">🏦 Transferencia Bancaria (Bs)</option>
                <option value="pago_movil">📱 Pago Móvil (Bs)</option>
                <option value="binance">💰 Binance Pay (USDT)</option>
                <option value="zelle_usd">💵 Zelle (USD)</option>
                <option value="efectivo_usd">💵 Efectivo ($ / Bs)</option>
              </select>
            </div>
          </div>

          {/* Datos Bancarios según método */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-200/80 pb-1">
              <Landmark className="w-3.5 h-3.5 text-[#00b4a2]" />
              <span>Detalles Bancarios / Cuenta</span>
            </h4>

            {/* Transferencia Bancaria */}
            {(paymentMethod === 'transferencia_bs' || paymentMethod === 'pago_movil') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Banco / Entidad</label>
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    {COMMON_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Cuenta</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="Corriente">Cuenta Corriente</option>
                    <option value="Ahorro">Cuenta de Ahorros</option>
                  </select>
                </div>
              </div>
            )}

            {paymentMethod === 'transferencia_bs' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  N° de Cuenta Bancaria (20 Dígitos) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="01340034120341098234"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#009b8b]"
                  required
                />
              </div>
            )}

            {/* Pago Móvil */}
            {paymentMethod === 'pago_movil' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teléfono Pago Móvil</label>
                  <input
                    type="text"
                    value={pagoMovilPhone}
                    onChange={(e) => setPagoMovilPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="04121234567"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cédula / RIF PM</label>
                  <input
                    type="text"
                    value={pagoMovilCi}
                    onChange={(e) => setPagoMovilCi(e.target.value)}
                    placeholder="V-12345678"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Binance */}
            {paymentMethod === 'binance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo Binance</label>
                  <input
                    type="email"
                    value={binanceEmail}
                    onChange={(e) => setBinanceEmail(e.target.value)}
                    placeholder="usuario@binance.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Binance Pay ID</label>
                  <input
                    type="text"
                    value={binancePayId}
                    onChange={(e) => setBinancePayId(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456789"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Zelle */}
            {paymentMethod === 'zelle_usd' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo Electrónico Zelle</label>
                  <input
                    type="email"
                    value={zelleEmail}
                    onChange={(e) => setZelleEmail(e.target.value)}
                    placeholder="pagos@zelle.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre Titular Zelle</label>
                  <input
                    type="text"
                    value={zelleName}
                    onChange={(e) => setZelleName(e.target.value)}
                    placeholder="Nombre Completo Titular"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {/* Efectivo */}
            {(paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs') && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Persona Responsable / Receptor</label>
                <input
                  type="text"
                  value={cashReceiver}
                  onChange={(e) => setCashReceiver(e.target.value)}
                  placeholder="Nombre de la persona que recibe el dinero"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>
            )}

            {/* Notas / Observaciones */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notas / Observaciones (Opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Solo transferencias antes de las 3pm, cuenta jurídica..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
              <span>{loading ? 'Guardando...' : editingBeneficiary ? 'Guardar Cambios' : 'Registrar Beneficiario'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
