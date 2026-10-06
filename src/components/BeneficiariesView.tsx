import React, { useState, useMemo } from 'react';
import { Beneficiary, ServiceCategory } from '../types';
import { notificationService } from '../services/notificationService';
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
  Briefcase
} from 'lucide-react';

interface BeneficiariesViewProps {
  beneficiaries: Beneficiary[];
  onOpenCreate: () => void;
  onOpenEdit: (b: Beneficiary) => void;
  onDelete: (id: string) => Promise<void>;
}

export const BeneficiariesView: React.FC<BeneficiariesViewProps> = ({
  beneficiaries,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      return (
        b.name.toLowerCase().includes(q) ||
        (b.rif || '').toLowerCase().includes(q) ||
        (b.bank_details.bank || '').toLowerCase().includes(q) ||
        (b.bank_details.account_number || '').includes(q) ||
        (b.bank_details.pago_movil_phone || '').includes(q) ||
        (b.bank_details.binance_email || '').toLowerCase().includes(q) ||
        (b.bank_details.zelle_email || '').toLowerCase().includes(q)
      );
    });
  }, [beneficiaries, searchQuery, selectedCategory]);

  const handleCopyAccount = (b: Beneficiary) => {
    let textToCopy = `Beneficiario: ${b.name}`;
    if (b.rif) textToCopy += `\nRIF/CI: ${b.rif}`;
    if (b.bank_details.bank) textToCopy += `\nBanco: ${b.bank_details.bank}`;
    if (b.bank_details.account_number) textToCopy += `\nCuenta: ${b.bank_details.account_number}`;
    if (b.bank_details.pago_movil_phone) textToCopy += `\nPago Móvil: ${b.bank_details.pago_movil_phone}`;
    if (b.bank_details.binance_email) textToCopy += `\nBinance Email: ${b.bank_details.binance_email}`;
    if (b.bank_details.binance_pay_id) textToCopy += `\nBinance Pay ID: ${b.bank_details.binance_pay_id}`;
    if (b.bank_details.zelle_email) textToCopy += `\nZelle Email: ${b.bank_details.zelle_email}`;

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

  return (
    <div className="space-y-4 pb-20 md:pb-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#00b4a2]" />
            <span>Directorio de Beneficiarios</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {beneficiaries.length} registrados
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Base de datos de proveedores, hoteles y personas para autocompletar pagos automáticamente.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="active-press flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-black text-xs shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Beneficiario</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Nombre, RIF, Banco, N° de Cuenta o Teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00b4a2] shadow-2xs font-medium"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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
            {searchQuery
              ? 'No hay registros que coincidan con los criterios de búsqueda ingresados.'
              : 'Aún no hay beneficiarios registrados en este rubro.'}
          </p>
          <button
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
            const method = b.bank_details.payment_method || 'transferencia_bs';
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
                        {method === 'binance'
                          ? '💰 Binance Pay'
                          : method === 'zelle_usd'
                          ? '💵 Zelle'
                          : method === 'pago_movil'
                          ? '📱 Pago Móvil'
                          : method === 'efectivo_usd' || method === 'efectivo_bs'
                          ? '💵 Efectivo'
                          : '🏦 Transferencia'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEdit(b)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar datos del beneficiario"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar a "${b.name}" del directorio?`)) {
                            onDelete(b.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar beneficiario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Beneficiary Name & RIF */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {b.name}
                    </h3>
                    {b.rif && (
                      <span className="text-[11px] font-mono font-bold text-slate-500 block mt-0.5">
                        RIF / CI: {b.rif}
                      </span>
                    )}
                  </div>

                  {/* Bank Details Container */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
                    {b.bank_details.bank && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-sans text-slate-400 font-semibold text-[10px]">Banco:</span>
                        <span className="font-bold">{b.bank_details.bank}</span>
                      </div>
                    )}

                    {b.bank_details.account_number && (
                      <div className="text-[#009b8b] font-bold select-all break-all pt-0.5">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] block">N° de Cuenta:</span>
                        <span>{b.bank_details.account_number}</span>
                      </div>
                    )}

                    {b.bank_details.pago_movil_phone && (
                      <div className="text-teal-900 font-bold pt-0.5">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] block">Pago Móvil:</span>
                        <span>{b.bank_details.pago_movil_phone} {b.bank_details.pago_movil_ci ? `(CI: ${b.bank_details.pago_movil_ci})` : ''}</span>
                      </div>
                    )}

                    {b.bank_details.binance_email && (
                      <div className="text-amber-900 font-bold pt-0.5 truncate">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] block">Binance:</span>
                        <span className="truncate">{b.bank_details.binance_email}</span>
                      </div>
                    )}

                    {b.bank_details.binance_pay_id && (
                      <div className="text-amber-900 font-bold">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] block">Pay ID:</span>
                        <span>{b.bank_details.binance_pay_id}</span>
                      </div>
                    )}

                    {b.bank_details.zelle_email && (
                      <div className="text-emerald-900 font-bold pt-0.5 truncate">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] block">Zelle:</span>
                        <span className="truncate">{b.bank_details.zelle_email}</span>
                      </div>
                    )}

                    {b.bank_details.cash_receiver && (
                      <div className="text-indigo-900 font-bold pt-0.5">
                        <span className="font-sans text-slate-400 font-semibold text-[10px] block">Receptor:</span>
                        <span>{b.bank_details.cash_receiver}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Copy Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Autocompleta en Solicitudes</span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(b)}
                    className="active-press flex items-center gap-1 text-[11px] font-bold text-[#00b4a2] hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-xl border border-teal-200 transition-colors"
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
    </div>
  );
};
