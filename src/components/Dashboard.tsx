import React, { useState, useMemo } from 'react';
import { PaymentRequest, ServiceCategory, UserProfile } from '../types';
import { RequestCard } from './RequestCard';
import { calculateFinancialSummary, exportRequestsToCSV } from '../services/dataService';
import {
  Search,
  RefreshCw,
  Plus,
  Inbox,
  ListFilter,
  DollarSign,
  Flame,
  Clock,
  Wallet,
  Download,
  X,
  Building2
} from 'lucide-react';

interface DashboardProps {
  requests: PaymentRequest[];
  currentUser: UserProfile;
  onOpenDetails: (request: PaymentRequest) => void;
  onOpenStatusModal: (request: PaymentRequest) => void;
  onOpenNewRequest: () => void;
  onOpenBeneficiaries?: () => void;
  onRefresh: () => void;
  onEditRequest?: (request: PaymentRequest) => void;
  onDeleteRequest?: (request: PaymentRequest) => void;
  onRequestModification?: (request: PaymentRequest) => void;
  onCancelModification?: (request: PaymentRequest) => void;
  onRequestCancellation?: (request: PaymentRequest) => void;
  onCancelCancellation?: (request: PaymentRequest) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  requests,
  currentUser,
  onOpenDetails,
  onOpenStatusModal,
  onOpenNewRequest,
  onOpenBeneficiaries,
  onRefresh,
  onEditRequest,
  onDeleteRequest,
  onRequestModification,
  onCancelModification,
  onRequestCancellation,
  onCancelCancellation,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'en_proceso' | 'urgente'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'amount_desc' | 'urgent_first'>('urgent_first');

  const summary = useMemo(() => calculateFinancialSummary(requests), [requests]);

  const activeRequests = useMemo(() => {
    return requests.filter(r => r.status !== 'realizado' && r.status !== 'anulado');
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return activeRequests
      .filter(r => {
        if (activeFilter !== 'all' && r.status !== activeFilter) return false;
        if (selectedCategory !== 'all' && (r.category || 'hospedaje') !== selectedCategory) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = (r.title || '').toLowerCase().includes(q);
          const matchesHotel = (r.hotel_name || '').toLowerCase().includes(q);
          const matchesGuest = (r.guest_name || '').toLowerCase().includes(q);
          const matchesCI = (r.guest_ci || '').toLowerCase().includes(q);
          const matchesLoc = (r.locator || '').toLowerCase().includes(q);
          const matchesClient = (r.client || '').toLowerCase().includes(q);
          const matchesRoute = (r.route_from_to || r.flight_route || '').toLowerCase().includes(q);
          const matchesConcept = (r.expense_concept || '').toLowerCase().includes(q);
          const matchesCreator = (r.creator_name || '').toLowerCase().includes(q);

          return (
            matchesTitle ||
            matchesHotel ||
            matchesGuest ||
            matchesCI ||
            matchesLoc ||
            matchesClient ||
            matchesRoute ||
            matchesConcept ||
            matchesCreator
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'urgent_first') {
          if (a.status === 'urgente' && b.status !== 'urgente') return -1;
          if (a.status !== 'urgente' && b.status === 'urgente') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'amount_desc') {
          return (b.amount_usd || 0) - (a.amount_usd || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activeRequests, activeFilter, selectedCategory, searchQuery, sortBy]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Financial KPI Cards Grid */}
      <div className={`grid ${currentUser.role === 'admin' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'} gap-2.5 sm:gap-3.5`}>
        {/* Card 1: Total Pendiente USD (Solo Admin) */}
        {currentUser.role === 'admin' && (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Pendiente USD
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                ${formatCurrency(summary.totalPendingUsd)}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {activeRequests.length} solicitudes activas
              </p>
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          </div>
        )}

        {/* Card 2: Total Pendiente Bs. (Solo Admin) */}
        {currentUser.role === 'admin' && (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Pendiente Bs.
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                Bs. {formatCurrency(summary.totalPendingBs)}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Calculado a tasa oficial
              </p>
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-400" />
          </div>
        )}

        {/* Card 3: Solicitudes Urgentes */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'urgente' ? 'all' : 'urgente')}
          className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
            activeFilter === 'urgente'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
              Urgentes
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
              {summary.countUrgente}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-rose-600 leading-tight">
              {summary.countUrgente}
            </p>
            <p className="text-[11px] font-semibold text-rose-500 mt-0.5">
              {summary.countUrgente > 0 ? '¡Requieren atención inmediata!' : 'Sin urgencias pendientes'}
            </p>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-400" />
        </div>

        {/* Card 4: En Proceso */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              En Proceso
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {summary.countEnProceso}
              </p>
              <p className="text-[10px] font-semibold text-blue-600">Gestión Activa</p>
            </div>
            {summary.countCancellationRequested > 0 && (
              <div className="bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl text-right">
                <p className="text-xs font-black text-rose-700">
                  {summary.countCancellationRequested}
                </p>
                <p className="text-[9px] font-bold text-rose-600">🚫 Anulación Pedida</p>
              </div>
            )}
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-teal-300" />
        </div>
      </div>

      {/* Header Controls Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-[#00b4a2]" />
            <span>Bandeja de Solicitudes</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#009b8b] border border-teal-200">
              {filteredRequests.length} de {activeRequests.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role === 'admin'
              ? 'Administra, procesa y liquida las órdenes de pago activas.'
              : 'Monitorea el estado y avance de tus solicitudes de pago.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => exportRequestsToCSV(activeRequests, 'TP_PAGOS_ACTIVAS')}
            title="Exportar solicitudes activas a CSV/Excel"
            className="p-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 active-press transition-colors text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
          <button
            onClick={onRefresh}
            title="Refrescar lista"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 active-press transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onOpenBeneficiaries && (
            <button
              onClick={onOpenBeneficiaries}
              title="Directorio y base de datos de beneficiarios"
              className="p-2 sm:px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 active-press transition-colors text-xs font-bold flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-[#00b4a2]" />
              <span className="hidden sm:inline">Beneficiarios</span>
            </button>
          )}
          <button
            onClick={onOpenNewRequest}
            className="active-press flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#00b4a2] hover:bg-[#009b8b] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-2xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      {/* Clean Unified Toolbar (Buscador, Rubro, Orden y Estados en 1 sola tarjeta elegante) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        {/* Top: Buscador + Selectores */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Título, Huésped, C.I., Hotel, Ruta, LOC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00b4a2] transition-colors font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selectores de Rubro y Orden */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Rubro Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e: any) => setSelectedCategory(e.target.value)}
              className="w-1/2 sm:w-auto bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#00b4a2] text-xs cursor-pointer shadow-2xs"
            >
              <option value="all">📂 Todos los Rubros</option>
              <option value="hospedaje">🏨 Hospedajes</option>
              <option value="traslado">🚗 Traslados</option>
              <option value="vuelos">✈️ Vuelos</option>
              <option value="gastos_apoyo">🧾 Gastos de Apoyo</option>
              <option value="viaticos">💼 Viáticos</option>
            </select>

            {/* Orden Dropdown */}
            <div className="relative w-1/2 sm:w-auto">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#00b4a2] text-xs cursor-pointer shadow-2xs"
              >
                <option value="urgent_first">⚡ Más Urgentes</option>
                <option value="recent">🕒 Más Recientes</option>
                <option value="amount_desc">💲 Mayor Monto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom: Segmented Status Pills + Reset */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Todos los Estados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {activeRequests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('urgente')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'urgente'
                  ? 'bg-rose-600 text-white shadow-2xs animate-pulse'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Urgentes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'urgente' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {summary.countUrgente}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('en_proceso')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'en_proceso'
                  ? 'bg-[#00b4a2] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En Proceso</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'en_proceso' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {summary.countEnProceso}
              </span>
            </button>
          </div>

          {/* Reset Filters Shortcut */}
          {(selectedCategory !== 'all' || activeFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              currentUser={currentUser}
              onOpenDetails={onOpenDetails}
              onOpenStatusModal={onOpenStatusModal}
              onEditRequest={onEditRequest}
              onDeleteRequest={onDeleteRequest}
              onRequestModification={onRequestModification}
              onCancelModification={onCancelModification}
              onRequestCancellation={onRequestCancellation}
              onCancelCancellation={onCancelCancellation}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00b4a2] flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No hay solicitudes que coincidan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No encontramos resultados para "${searchQuery}". Intenta con otro término o limpia los filtros.`
                : 'No tienes solicitudes pendientes en la vista seleccionada.'}
            </p>
          </div>
          <button
            onClick={onOpenNewRequest}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white text-xs font-bold shadow-2xs active-press transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Crear Nueva Solicitud</span>
          </button>
        </div>
      )}
    </div>
  );
};
