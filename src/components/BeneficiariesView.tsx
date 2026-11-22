import React, { useState, useMemo } from 'react';
import { Beneficiary, ServiceCategory, UserProfile } from '../types';
import { notificationService } from '../services/notificationService';
import { useCompany } from '../opticavision/context/CompanyContext';
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Hotel,
  Car,
  Plane,
  Receipt,
  Briefcase,
  Zap,
  AlertTriangle,
  X,
  BookOpen
} from 'lucide-react';

interface BeneficiariesViewProps {
  beneficiaries: Beneficiary[];
  currentUser?: UserProfile | null;
  onOpenCreate: () => void;
  onOpenEdit: (b: Beneficiary) => void;
  onDelete: (id: string) => Promise<void>;
  onUseInRequest?: (b: Beneficiary) => void;
}

export const BeneficiariesView: React.FC<BeneficiariesViewProps> = ({
  beneficiaries,
  currentUser,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onUseInRequest
}) => {
  const { cuentasContables } = useCompany();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<Beneficiary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cuentasMovimiento = useMemo(() => {
    return (cuentasContables || [])
      .filter((c: any) => c.tipo === 'Movimiento' || !c.tipo)
      .sort((a: any, b: any) => (a.codigo || '').localeCompare(b.codigo || ''));
  }, [cuentasContables]);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
      if (!matchesCat) return false;

      if (accountFilter) {
        const bd = b.bank_details;
        const matchesAcc =
          String(bd.default_account_id || '') === String(accountFilter) ||
          String(bd.default_account_code || '') === String(accountFilter);
        if (!matchesAcc) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const bd = b.bank_details;

      return (
        b.name.toLowerCase().includes(q) ||
        (b.rif || '').toLowerCase().includes(q) ||
        (bd.bank || '').toLowerCase().includes(q) ||
        (bd.account_number || '').toLowerCase().includes(q) ||
        (bd.pago_movil_phone || '').toLowerCase().includes(q) ||
        (bd.binance_email || '').toLowerCase().includes(q) ||
        (bd.binance_pay_id || '').toLowerCase().includes(q) ||
        (bd.zelle_email || '').toLowerCase().includes(q) ||
        (bd.zelle_name || '').toLowerCase().includes(q) ||
        (bd.swift_or_aba || '').toLowerCase().includes(q) ||
        (bd.bank_country_or_address || '').toLowerCase().includes(q) ||
        (bd.default_account_code || '').toLowerCase().includes(q) ||
        (bd.default_account_name || '').toLowerCase().includes(q)
      );
    });
  }, [beneficiaries, searchQuery, selectedCategory, accountFilter]);

  const handleCopyAccount = (b: Beneficiary) => {
    const bd = b.bank_details;
    let textToCopy = `Beneficiario: ${b.name}`;
    if (b.rif) textToCopy += `\nRIF/CI: ${b.rif}`;
    if (bd.bank) textToCopy += `\nBanco: ${bd.bank}`;
    if (bd.account_number) textToCopy += `\nCuenta: ${bd.account_number}`;
    if (bd.swift_or_aba) textToCopy += `\nSWIFT/ABA: ${bd.swift_or_aba}`;
    if (bd.bank_country_or_address) textToCopy += `\nPaís/Dir: ${bd.bank_country_or_address}`;
    if (bd.intermediary_bank_or_notes) textToCopy += `\nIntermediario: ${bd.intermediary_bank_or_notes}`;
    if (bd.pago_movil_phone) textToCopy += `\nPago Móvil: ${bd.pago_movil_phone}`;
    if (bd.binance_email) textToCopy += `\nBinance Email: ${bd.binance_email}`;
    if (bd.binance_pay_id) textToCopy += `\nBinance Pay ID: ${bd.binance_pay_id}`;
    if (bd.zelle_email) textToCopy += `\nZelle: ${bd.zelle_email}`;
    if (bd.zelle_name) textToCopy += `\nTitular Zelle: ${bd.zelle_name}`;
    if (bd.cash_receiver) textToCopy += `\nReceptor: ${bd.cash_receiver}`;
    if (bd.default_account_code) textToCopy += `\nCta Contable: ${bd.default_account_code}`;

    navigator.clipboard.writeText(textToCopy);
    notificationService.triggerHaptic('light');
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (cat?: ServiceCategory) => {
    switch (cat) {
      case 'traslado':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Car className="w-3 h-3 text-emerald-600" /> Traslado
          </span>
        );
      case 'vuelos':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
            <Plane className="w-3 h-3 text-sky-600" /> Vuelos
          </span>
        );
      case 'gastos_apoyo':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
            <Receipt className="w-3 h-3 text-purple-600" /> Gastos
          </span>
        );
      case 'viaticos':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-amber-700" /> Viáticos
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <Hotel className="w-3 h-3 text-indigo-600" /> Hospedaje
          </span>
        );
    }
  };

  const getChannelBadge = (method?: string) => {
    switch (method) {
      case 'binance':
        return '💰 Binance Pay (USDT)';
      case 'transferencia_usd':
        return '🌎 Transferencia USD';
      case 'zelle_usd':
        return '💵 Zelle (USD)';
      case 'pago_movil':
        return '📱 Pago Móvil (Bs)';
      case 'efectivo_usd':
      case 'efectivo_bs':
        return '💵 Efectivo';
      default:
        return '🏦 Transferencia (Bs)';
    }
  };

  const handleConfirmDelete = async () => {
    if (!beneficiaryToDelete) return;
    try {
      setDeleting(true);
      await onDelete(beneficiaryToDelete.id);
      setBeneficiaryToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#00b4a2]" />
            <span>Directorio de Beneficiarios</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {filteredBeneficiaries.length} registrados
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Base de datos de proveedores, hoteles, aerolíneas y personas con sus datos bancarios según su modalidad de pago (Bolívares, Binance, Transferencia Internacional USD o Zelle).
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="active-press flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-black text-xs shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Beneficiario</span>
        </button>
      </div>

      {/* Filter Tabs, Account Filter & Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap lg:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Nombre, RIF/Cédula, Banco, SWIFT, Correo Binance o N° de Cuenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00b4a2] shadow-2xs font-medium"
            />
          </div>

          {/* Admin Accounting Account Filter */}
          {currentUser?.role === 'admin' && cuentasMovimiento.length > 0 && (
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:border-[#00b4a2] cursor-pointer"
            >
              <option value="">📊 Todas las Cuentas Contables</option>
              {cuentasMovimiento.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.codigo} — {String(acc.nombre || '').slice(0, 26)}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'hospedaje', label: '🏨 Hospedaje' },
              { id: 'traslado', label: '🚗 Traslado' },
              { id: 'vuelos', label: '✈️ Vuelos' },
              { id: 'gastos_apoyo', label: '🧾 Gastos' },
              { id: 'viaticos', label: '💼 Viáticos' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as ServiceCategory | 'all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Beneficiaries Grid */}
      {filteredBeneficiaries.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">No se encontraron beneficiarios</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || accountFilter
              ? 'No hay registros que coincidan con los criterios de búsqueda o cuenta contable seleccionados.'
              : 'Aún no hay beneficiarios registrados en este rubro.'}
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-[#009b8b] hover:bg-teal-100 border border-teal-200 rounded-xl font-bold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar el Primero</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBeneficiaries.map((b) => {
            const bd = b.bank_details || ({} as any);
            const method = bd.payment_method || 'transferencia_bs';
            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCategoryBadge(b.category)}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {getChannelBadge(method)}
                      </span>
                      {currentUser?.role === 'admin' && bd.default_account_code && (
                        <span
                          title={bd.default_account_name || bd.default_account_code}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 inline-flex items-center gap-1"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          {bd.default_account_code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenEdit(b)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                        title="Editar datos bancarios del beneficiario"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeneficiaryToDelete(b)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Eliminar beneficiario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Beneficiary Name & RIF */}
                  <div>
                    <h3 className="font-black text-slate-900 text-sm uppercase leading-snug">
                      {b.name}
                    </h3>
                    {b.rif && method !== 'binance' && (
                      <span className="text-xs font-mono font-bold text-slate-500 block mt-0.5">
                        RIF / CI: {b.rif}
                      </span>
                    )}
                  </div>

                  {/* Bank Details Container */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                    {bd.bank && (
                      <div className="flex items-center justify-between text-slate-700 gap-2">
                        <span className="text-slate-400 font-semibold">
                          {method === 'binance'
                            ? 'Plataforma:'
                            : method === 'transferencia_usd'
                            ? 'Banco Internacional:'
                            : 'Banco:'}
                        </span>
                        <span className="font-bold text-slate-800 text-right">{bd.bank}</span>
                      </div>
                    )}

                    {bd.account_number && (
                      <div className="text-[#009b8b] font-mono font-bold select-all break-all pt-0.5 border-t border-slate-200/60">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] uppercase block">
                          {method === 'transferencia_usd'
                            ? 'N° Cuenta Internacional / IBAN:'
                            : 'N° de Cuenta:'}
                        </span>
                        <span className="text-[11px]">{bd.account_number}</span>
                      </div>
                    )}

                    {method === 'transferencia_usd' && bd.swift_or_aba && (
                      <div className="text-emerald-900 font-mono font-bold pt-0.5">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] uppercase block">
                          SWIFT / BIC / ABA:
                        </span>
                        <span className="text-[11px]">{bd.swift_or_aba}</span>
                      </div>
                    )}

                    {method === 'transferencia_usd' && bd.bank_country_or_address && (
                      <div className="text-slate-700 font-semibold pt-0.5 text-[11px]">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          País / Dirección / Tipo:
                        </span>
                        <span>{bd.bank_country_or_address}</span>
                      </div>
                    )}

                    {method === 'transferencia_usd' && bd.intermediary_bank_or_notes && (
                      <div className="text-slate-600 font-medium pt-0.5 text-[11px]">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Intermediario / Nota:
                        </span>
                        <span>{bd.intermediary_bank_or_notes}</span>
                      </div>
                    )}

                    {bd.pago_movil_phone && (
                      <div className="text-teal-900 font-mono font-bold pt-0.5 border-t border-slate-200/60">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] uppercase block">
                          Pago Móvil:
                        </span>
                        <span className="text-[11px]">
                          {bd.pago_movil_phone}{' '}
                          {bd.pago_movil_ci || b.rif ? `(CI/RIF: ${bd.pago_movil_ci || b.rif})` : ''}
                        </span>
                      </div>
                    )}

                    {bd.binance_email && (
                      <div className="text-amber-900 font-mono font-bold pt-0.5 truncate border-t border-slate-200/60">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] uppercase block">
                          Correo Binance:
                        </span>
                        <span className="truncate text-[11px]">{bd.binance_email}</span>
                      </div>
                    )}

                    {bd.binance_pay_id && (
                      <div className="text-amber-900 font-mono font-bold pt-0.5">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] uppercase block">
                          Binance Pay ID:
                        </span>
                        <span className="text-[11px]">{bd.binance_pay_id}</span>
                      </div>
                    )}

                    {bd.zelle_email && (
                      <div className="text-emerald-900 font-mono font-bold pt-0.5 truncate border-t border-slate-200/60">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] uppercase block">
                          Zelle:
                        </span>
                        <span className="truncate text-[11px]">
                          {bd.zelle_email} {bd.zelle_name ? `(${bd.zelle_name})` : ''}
                        </span>
                      </div>
                    )}

                    {bd.cash_receiver && (
                      <div className="text-indigo-900 font-bold pt-0.5 border-t border-slate-200/60">
                        <span className="text-slate-400 font-semibold text-[10px] uppercase block">
                          Receptor Efectivo:
                        </span>
                        <span className="text-[11px]">{bd.cash_receiver}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {onUseInRequest ? (
                    <button
                      type="button"
                      onClick={() => onUseInRequest(b)}
                      className="text-[11px] font-bold text-[#009b8b] hover:underline flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Usar en Solicitud</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Autocompleta en Solicitudes
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyAccount(b)}
                    className="active-press flex items-center gap-1 text-xs font-bold text-[#009b8b] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors"
                  >
                    {copiedId === b.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-extrabold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Datos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Beneficiario */}
      {beneficiaryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 p-5 shadow-modal space-y-4 text-xs text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    Eliminar Beneficiario
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Esta acción removerá al proveedor del directorio activo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBeneficiaryToDelete(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
              <p className="font-black text-slate-900 text-xs uppercase">
                {beneficiaryToDelete.name}
              </p>
              <p className="font-mono text-[11px] text-slate-600">
                {beneficiaryToDelete.rif ? `RIF / CI: ${beneficiaryToDelete.rif} • ` : ''}
                {beneficiaryToDelete.bank_details?.bank || 'SIN BANCO'}
              </p>
              <p className="font-mono text-[11px] text-slate-500 truncate">
                {beneficiaryToDelete.bank_details?.account_number ||
                  beneficiaryToDelete.bank_details?.pago_movil_phone ||
                  beneficiaryToDelete.bank_details?.binance_email ||
                  beneficiaryToDelete.bank_details?.binance_pay_id ||
                  beneficiaryToDelete.bank_details?.zelle_email ||
                  beneficiaryToDelete.bank_details?.cash_receiver ||
                  ''}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setBeneficiaryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="active-press px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Eliminando...' : 'Sí, Eliminar Beneficiario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
