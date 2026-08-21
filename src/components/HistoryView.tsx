import React, { useState, useMemo, useEffect } from 'react';
import { PaymentRequest } from '../types';
import { StatusBadge } from './StatusBadge';
import { exportRequestsToCSV } from '../services/dataService';
import {
  History,
  Search,
  Download,
  Eye,
  FileCheck,
  Calendar,
  Car,
  Plane,
  Receipt,
  Hotel,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface HistoryViewProps {
  requests: PaymentRequest[];
  onOpenDetails: (request: PaymentRequest) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  requests,
  onOpenDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // Predeterminado el filtro de este mes
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const historyRequests = useMemo(() => {
    return requests.filter(r => r.status === 'realizado');
  }, [requests]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return historyRequests
      .filter(r => {
        const itemTime = new Date(r.updated_at || r.created_at).getTime();

        if (dateFilter === 'today' && itemTime < startOfToday) return false;
        if (dateFilter === 'week' && itemTime < startOfWeek) return false;
        if (dateFilter === 'month' && itemTime < startOfMonth) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (r.title || '').toLowerCase().includes(q) ||
            (r.hotel_name || '').toLowerCase().includes(q) ||
            (r.guest_name || '').toLowerCase().includes(q) ||
            (r.guest_ci || '').toLowerCase().includes(q) ||
            (r.locator || '').toLowerCase().includes(q) ||
            (r.client || '').toLowerCase().includes(q) ||
            (r.route_from_to || '').toLowerCase().includes(q) ||
            (r.creator_name || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  }, [historyRequests, dateFilter, searchQuery]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchQuery, pageSize]);

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredHistory.length);

  const paginatedRequests = useMemo(() => {
    return filteredHistory.slice(startIndex, startIndex + pageSize);
  }, [filteredHistory, startIndex, pageSize]);

  const totalUSD = useMemo(() => {
    return filteredHistory.reduce((acc, r) => acc + (r.amount_usd || 0), 0);
  }, [filteredHistory]);

  const totalBS = useMemo(() => {
    return filteredHistory.reduce((acc, r) => {
      const bs =
        r.amount_bs ||
        (r.currency === 'USD' || !r.bcv_rate ? 0 : (r.amount_usd || 0) * (r.bcv_rate || 0));
      return acc + bs;
    }, 0);
  }, [filteredHistory]);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      val
    );

  // Generar números de página visibles
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Historial y Archivo de Pagos</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {historyRequests.length} realizados
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro contable de pagos liquidados con comprobantes bancarios verificados.
          </p>
        </div>

        {/* Stats Summary & Export */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 sm:px-4 rounded-2xl border border-slate-200 text-xs shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Pagado ($)
              </span>
              <span className="text-emerald-700 font-black text-sm sm:text-base">
                {formatUSD(totalUSD)}
              </span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Pagado (Bs)
              </span>
              <span className="text-[#00b4a2] font-black text-sm sm:text-base">
                Bs. {formatBS(totalBS)}
              </span>
            </div>
          </div>

          <button
            onClick={() => exportRequestsToCSV(filteredHistory, 'TP_PAGOS_HISTORIAL')}
            disabled={filteredHistory.length === 0}
            className="active-press flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Date Filter Tabs & Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Cliente, Huésped, C.I., Hotel, Ruta o LOC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-20 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00b4a2] shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                dateFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                dateFilter === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                dateFilter === 'week'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                dateFilter === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Este Mes
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-2.5">
          {paginatedRequests.map((req) => {
            const category = req.category || 'hospedaje';
            return (
              <div
                key={req.id}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Left Column Info */}
                <div className="space-y-1 md:max-w-md">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      LOC: #{req.locator}
                    </span>
                    <StatusBadge status="realizado" size="sm" />

                    {category === 'traslado' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Car className="w-3 h-3 text-emerald-600" /> Traslado
                      </span>
                    ) : category === 'vuelos' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                        <Plane className="w-3 h-3 text-sky-600" /> Vuelos
                      </span>
                    ) : category === 'gastos_apoyo' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-purple-600" /> Gastos
                      </span>
                    ) : category === 'viaticos' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-amber-700" /> Viáticos
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <Hotel className="w-3 h-3 text-indigo-600" /> Hospedaje
                      </span>
                    )}

                    <span className="text-xs text-slate-500 font-medium ml-1">
                      Cliente: <strong className="text-slate-800">{req.client}</strong>
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{req.title}</h3>
                  {category === 'gastos_apoyo' ? (
                    <p className="text-xs text-slate-600 font-medium">
                      Concepto: <strong className="text-slate-800">{req.expense_concept || req.hotel_name || req.title}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 font-medium">
                      {category === 'viaticos' ? 'Usuario Responsable: ' : 'Huésped / Pasajero: '}
                      <strong className="text-slate-800">{req.guest_name}</strong>{' '}
                      {req.guest_ci ? `(${req.guest_ci})` : ''} •{' '}
                      {category === 'vuelos' ? (req.airline || req.hotel_name) : category === 'traslado' ? (req.hotel_name || req.route_from_to) : req.hotel_name}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    {req.nights_dates && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400" /> {req.nights_dates}
                      </span>
                    )}
                    {req.origin_bank && (
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Origen: {req.origin_bank}
                      </span>
                    )}
                    {req.bank_details.bank && (
                      <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Destino: {req.bank_details.bank}
                      </span>
                    )}
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Liquidado el{' '}
                      {new Date(req.updated_at || req.created_at).toLocaleDateString()} {new Date(req.updated_at || req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Middle Amounts */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-right md:min-w-[170px] shrink-0">
                  <div className="text-sm sm:text-base font-black text-emerald-600 leading-tight">
                    {formatUSD(req.amount_usd)}
                  </div>
                  <div className="text-xs font-bold text-[#00b4a2] mt-0.5">
                    Bs.{' '}
                    {formatBS(
                      req.amount_bs ||
                        (req.currency === 'USD' || !req.bcv_rate
                          ? 0
                          : (req.amount_usd || 0) * (req.bcv_rate || 0))
                    )}
                  </div>
                  {req.bcv_rate > 0 && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      Tasa: Bs. {req.bcv_rate}
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5 shrink-0 md:flex-col md:items-end">
                  <button
                    onClick={() => onOpenDetails(req)}
                    className="active-press px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 border border-slate-200"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Ficha</span>
                  </button>

                  {req.receipt_file_url ? (
                    <a
                      href={req.receipt_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="active-press px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Comprobante</span>
                      <Download className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Sin adjunto</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination Footer */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Info & Page Size Selector */}
            <div className="flex items-center gap-3 text-slate-600 font-medium flex-wrap justify-center sm:justify-start">
              <span>
                Mostrando <strong>{filteredHistory.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> de <strong>{filteredHistory.length}</strong> solicitudes
              </span>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-slate-400">Mostrar por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#00b4a2] cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[30px] h-[30px] rounded-xl font-bold text-xs transition-all ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Historial vacío o sin coincidencias</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No se encontraron pagos completados para "${searchQuery}".`
              : 'No hay solicitudes liquidadas para el período seleccionado.'}
          </p>
        </div>
      )}
    </div>
  );
};
