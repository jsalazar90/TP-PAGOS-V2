// ==============================================================================
// MODAL DE BÚSQUEDA Y SELECCIÓN DE BENEFICIARIOS
// TP PAGOS PRO - Reemplazo del selector largo por una ventana interactiva con buscador rápido
// ==============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Beneficiary, ServiceCategory } from '../types';
import {
  Search,
  X,
  Building2,
  Hotel,
  Car,
  Plane,
  Receipt,
  Briefcase,
  CheckCircle2,
  Smartphone,
  QrCode,
  DollarSign,
  Landmark,
  Banknote,
  ArrowRight
} from 'lucide-react';

interface BeneficiaryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: Beneficiary[];
  selectedBeneficiaryId?: string;
  onSelect: (beneficiaryId: string) => void;
}

export const BeneficiaryPickerModal: React.FC<BeneficiaryPickerModalProps> = ({
  isOpen,
  onClose,
  beneficiaries,
  selectedBeneficiaryId,
  onSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries
      .filter((b) => {
        if (selectedCategory !== 'all' && (b.category || 'hospedaje') !== selectedCategory) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (b.name || '').toLowerCase().includes(q);
          const rifMatch = (b.rif || b.bank_details?.rif || '').toLowerCase().includes(q);
          const bankMatch = (b.bank_details?.bank || '').toLowerCase().includes(q);
          const accountMatch = (b.bank_details?.account_number || '').toLowerCase().includes(q);
          const phoneMatch = (b.bank_details?.pago_movil_phone || '').toLowerCase().includes(q);
          const binanceMatch = (b.bank_details?.binance_email || b.bank_details?.binance_pay_id || '').toLowerCase().includes(q);
          const zelleMatch = (b.bank_details?.zelle_email || b.bank_details?.zelle_name || '').toLowerCase().includes(q);
          const categoryMatch = (b.category || '').toLowerCase().includes(q);

          return (
            nameMatch ||
            rifMatch ||
            bankMatch ||
            accountMatch ||
            phoneMatch ||
            binanceMatch ||
            zelleMatch ||
            categoryMatch
          );
        }

        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [beneficiaries, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleSelect = (benId: string) => {
    onSelect(benId);
    onClose();
  };

  const getCategoryBadge = (cat?: ServiceCategory) => {
    const category = cat || 'hospedaje';
    if (category === 'traslado') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <Car className="w-3 h-3 text-emerald-600" /> Traslado
        </span>
      );
    }
    if (category === 'vuelos') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
          <Plane className="w-3 h-3 text-sky-600" /> Vuelos
        </span>
      );
    }
    if (category === 'gastos_apoyo') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
          <Receipt className="w-3 h-3 text-purple-600" /> Gastos
        </span>
      );
    }
    if (category === 'viaticos') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
          <Briefcase className="w-3 h-3 text-amber-700" /> Viáticos
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
        <Hotel className="w-3 h-3 text-indigo-600" /> Hospedaje
      </span>
    );
  };

  const getPaymentMethodBadge = (b: Beneficiary) => {
    const details = b.bank_details;
    const method = details?.payment_method;

    if (method === 'binance' || details?.binance_email) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
          <QrCode className="w-3 h-3 text-amber-700" /> Binance Pay
        </span>
      );
    }
    if (method === 'pago_movil') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-300 flex items-center gap-1">
          <Smartphone className="w-3 h-3 text-teal-700" /> Pago Móvil
        </span>
      );
    }
    if (method === 'zelle_usd' || details?.zelle_email) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-emerald-700" /> Zelle USD
        </span>
      );
    }
    if (method === 'efectivo_usd' || method === 'efectivo_bs') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
          <Banknote className="w-3 h-3 text-slate-600" /> Efectivo
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
        <Landmark className="w-3 h-3 text-blue-700" /> {details?.bank || 'Transferencia'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Seleccionar Beneficiario</span>
                <span className="text-[11px] font-normal bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full">
                  {beneficiaries.length} registrados
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Busca y autocompleta el servicio, RIF y datos de pago
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Live Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, RIF, banco, número de cuenta, zelle o teléfono..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              Todos ({beneficiaries.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('hospedaje')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'hospedaje'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Hotel className="w-3 h-3" /> Hospedaje
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('traslado')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'traslado'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Car className="w-3 h-3" /> Traslado
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('vuelos')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'vuelos'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Plane className="w-3 h-3" /> Vuelos
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('gastos_apoyo')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'gastos_apoyo'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Receipt className="w-3 h-3" /> Gastos
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('viaticos')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'viaticos'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Briefcase className="w-3 h-3" /> Viáticos
            </button>
          </div>
        </div>

        {/* Beneficiaries List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1 bg-slate-100/50">
          {filteredBeneficiaries.length > 0 ? (
            filteredBeneficiaries.map((b) => {
              const isSelected = selectedBeneficiaryId === b.id;
              const details = b.bank_details || {};

              return (
                <div
                  key={b.id}
                  onClick={() => handleSelect(b.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm'
                      : 'bg-white hover:bg-teal-50/40 border-slate-200 hover:border-teal-300 shadow-2xs'
                  }`}
                >
                  {/* Info Left */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCategoryBadge(b.category)}
                      {getPaymentMethodBadge(b)}
                      {b.rif && (
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {b.rif}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate group-hover:text-teal-800 transition-colors">
                      {b.name}
                    </h3>

                    {/* Bank / Account details snippet */}
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {details.bank && (
                        <span className="font-semibold text-slate-700">
                          {details.bank}
                        </span>
                      )}
                      {details.account_number && (
                        <span className="font-mono text-slate-500 font-bold">
                          {details.account_number}
                        </span>
                      )}
                      {details.pago_movil_phone && (
                        <span className="font-mono text-teal-700 font-semibold">
                          PM: {details.pago_movil_phone}
                        </span>
                      )}
                      {details.binance_email && (
                        <span className="font-mono text-amber-800 font-semibold truncate max-w-[200px]">
                          Binance: {details.binance_email}
                        </span>
                      )}
                      {details.zelle_email && (
                        <span className="font-mono text-emerald-800 font-semibold truncate max-w-[200px]">
                          Zelle: {details.zelle_email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Select Action Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isSelected ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Seleccionado</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(b.id);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-50 group-hover:bg-[#00b4a2] text-teal-800 group-hover:text-white font-bold text-xs border border-teal-200 group-hover:border-transparent flex items-center gap-1 transition-all shadow-2xs active-press"
                      >
                        <span>Seleccionar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                No se encontraron beneficiarios
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}".`
                  : 'No hay beneficiarios en esta categoría.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-1 text-xs font-bold text-teal-700 hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Mostrando <strong>{filteredBeneficiaries.length}</strong> de {beneficiaries.length} beneficiarios
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
