import React, { useState } from 'react';
import { PaymentRequest, UserProfile } from '../types';
import { RequestCard } from './RequestCard';
import { Search, RefreshCw, Plus, Inbox, ListFilter } from 'lucide-react';

interface DashboardProps {
  requests: PaymentRequest[];
  currentUser: UserProfile;
  onOpenDetails: (request: PaymentRequest) => void;
  onOpenStatusModal: (request: PaymentRequest) => void;
  onOpenNewRequest: () => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  requests,
  currentUser,
  onOpenDetails,
  onOpenStatusModal,
  onOpenNewRequest,
  onRefresh,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'px_fondos' | 'en_proceso' | 'urgente'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeRequests = requests.filter(r => r.status !== 'realizado');

  const filteredRequests = activeRequests.filter(r => {
    if (activeFilter !== 'all' && r.status !== activeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.hotel_name.toLowerCase().includes(q) ||
        r.guest_name.toLowerCase().includes(q) ||
        r.guest_ci.toLowerCase().includes(q) ||
        r.locator.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const countPxFondos = activeRequests.filter(r => r.status === 'px_fondos').length;
  const countEnProceso = activeRequests.filter(r => r.status === 'en_proceso').length;
  const countUrgente = activeRequests.filter(r => r.status === 'urgente').length;

  return (
    <div className="space-y-3.5 pb-16 md:pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-card">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-indigo-600" />
            <span>Bandeja de Solicitudes</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {activeRequests.length} activas
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role === 'admin'
              ? 'Vista en lista de solicitudes PxFondos, En Proceso y Urgentes.'
              : 'Tus solicitudes de pago activas y estado de procesamiento.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Refrescar lista"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 active-press transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewRequest}
            className="active-press flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Solicitud</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search bar */}
      <div className="space-y-2.5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Título, Huésped, C.I., Hotel, Cliente o LOC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Quick Filter Status Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>Todas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {activeRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('px_fondos')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'px_fondos'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
            }`}
          >
            <span>PxFondos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
              {countPxFondos}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('en_proceso')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'en_proceso'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <span>En Proceso</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {countEnProceso}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('urgente')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'urgente'
                ? 'bg-rose-600 text-white shadow-xs font-extrabold animate-pulse'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold'
            }`}
          >
            <span>🚨 Urgente</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-900 font-bold">
              {countUrgente}
            </span>
          </button>
        </div>
      </div>

      {/* List Format View (Horizontal Rows in Stack) */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-2.5">
          {filteredRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              currentUser={currentUser}
              onOpenDetails={onOpenDetails}
              onOpenStatusModal={onOpenStatusModal}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-white/90 rounded-2xl border border-slate-200 shadow-card space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No hay solicitudes en la lista</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? `No se encontraron resultados para "${searchQuery}".`
              : 'No hay solicitudes pendientes o en proceso en esta vista.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenNewRequest}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs active-press"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Solicitud</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
