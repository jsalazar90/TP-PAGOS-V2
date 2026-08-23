import React, { useState, useMemo, useEffect } from 'react';
import { PaymentRequest, UserProfile } from '../types';
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
  ChevronsRight,
  Printer,
  XCircle,
  X
} from 'lucide-react';

interface HistoryViewProps {
  requests: PaymentRequest[];
  currentUser?: UserProfile | null;
  onOpenDetails: (request: PaymentRequest) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  requests,
  currentUser,
  onOpenDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Predeterminado el filtro de este mes
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const historyRequests = useMemo(() => {
    return requests.filter(r => r.status === 'realizado' || r.status === 'anulado');
  }, [requests]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return historyRequests
      .filter(r => {
        const itemTime = new Date(r.updated_at || r.created_at).getTime();

        // Filtro por rango manual Desde - Hasta
        if (startDate) {
          const startMs = new Date(startDate + 'T00:00:00').getTime();
          if (itemTime < startMs) return false;
        }
        if (endDate) {
          const endMs = new Date(endDate + 'T23:59:59.999').getTime();
          if (itemTime > endMs) return false;
        }

        // Filtro rápido por períodos preestablecidos (si no hay rango manual)
        if (!startDate && !endDate) {
          if (dateFilter === 'today' && itemTime < startOfToday) return false;
          if (dateFilter === 'week' && itemTime < startOfWeek) return false;
          if (dateFilter === 'month' && itemTime < startOfMonth) return false;
        }

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
  }, [historyRequests, dateFilter, startDate, endDate, searchQuery]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, startDate, endDate, searchQuery, pageSize]);

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredHistory.length);

  const paginatedRequests = useMemo(() => {
    return filteredHistory.slice(startIndex, startIndex + pageSize);
  }, [filteredHistory, startIndex, pageSize]);

  const totalUSD = useMemo(() => {
    return filteredHistory.reduce((acc, r) => {
      if (r.status === 'anulado') return acc; // Saldo en 0
      return acc + (r.amount_usd || 0);
    }, 0);
  }, [filteredHistory]);

  const totalBS = useMemo(() => {
    return filteredHistory.reduce((acc, r) => {
      if (r.status === 'anulado') return acc; // Saldo en 0
      const bs =
        r.amount_bs ||
        (r.currency === 'USD' || !r.bcv_rate ? 0 : (r.amount_usd || 0) * (r.bcv_rate || 0));
      return acc + bs;
    }, 0);
  }, [filteredHistory]);

  // Segmentación calibrada: 22 líneas en Hoja 1 y 26 líneas en hojas siguientes
  const printPages = useMemo(() => {
    if (filteredHistory.length === 0) return [];
    const pages: PaymentRequest[][] = [];
    const PAGE_1_SIZE = 22;
    const OTHER_PAGES_SIZE = 26;

    pages.push(filteredHistory.slice(0, PAGE_1_SIZE));
    let idx = PAGE_1_SIZE;

    while (idx < filteredHistory.length) {
      pages.push(filteredHistory.slice(idx, idx + OTHER_PAGES_SIZE));
      idx += OTHER_PAGES_SIZE;
    }
    return pages;
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
    <>
      {/* Vista interactiva para Pantalla */}
      <div className="space-y-4 pb-20 md:pb-8 print:hidden">
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

        {/* Stats Summary & Export (Solo para Administradores) */}
        {currentUser?.role === 'admin' && (
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
              title="Descargar listado en formato Excel / CSV"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => window.print()}
              disabled={filteredHistory.length === 0}
              className="active-press flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
              title="Imprimir reporte contable organizado"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Reporte</span>
            </button>
          </div>
        )}
      </div>

      {/* Date Filter Tabs & Search Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Cliente, Huésped, C.I., Hotel, Ruta o LOC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-14 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#00b4a2] font-medium transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Date Range: Desde - Hasta */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setDateFilter('month');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
                title="Limpiar rango de fechas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 shrink-0 text-xs overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDateFilter('all');
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                dateFilter === 'all' && !startDate && !endDate
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDateFilter('today');
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                dateFilter === 'today' && !startDate && !endDate
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDateFilter('week');
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                dateFilter === 'week' && !startDate && !endDate
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDateFilter('month');
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                dateFilter === 'month' && !startDate && !endDate
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
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
                    <StatusBadge status={req.status} size="sm" />

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
                    {req.status === 'anulado' ? (
                      <span className="text-slate-600 font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-slate-500" /> Anulado el{' '}
                        {new Date(req.updated_at || req.created_at).toLocaleDateString()} {new Date(req.updated_at || req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Liquidado el{' '}
                        {new Date(req.updated_at || req.created_at).toLocaleDateString()} {new Date(req.updated_at || req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Amounts */}
                {req.status === 'anulado' ? (
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-right md:min-w-[170px] shrink-0">
                    <div className="text-sm sm:text-base font-black text-slate-400 leading-tight">
                      $0.00
                    </div>
                    <div className="text-xs font-bold text-slate-400 mt-0.5">
                      Bs. 0,00
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">
                      Solicitud Anulada
                    </div>
                  </div>
                ) : (
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
                )}

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

      {/* ========================================================================= */}
      {/* PLANTILLA DE IMPRESIÓN OFICIAL TIPO CARTA (PORTRAIT)                      */}
      {/* ========================================================================= */}
      <div
        className="hidden print:block text-slate-950 bg-white"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {printPages.map((pageRequests, pIdx) => {
          const isFirstPage = pIdx === 0;
          const isLastPage = pIdx === printPages.length - 1;

          // Subtotales de esta página específica (anuladas suman 0)
          const pageSubtotalUSD = pageRequests.reduce((acc, r) => {
            if (r.status === 'anulado') return acc;
            return acc + (r.amount_usd || 0);
          }, 0);
          const pageSubtotalBS = pageRequests.reduce((acc, r) => {
            if (r.status === 'anulado') return acc;
            const bs =
              r.amount_bs ||
              (r.currency === 'USD' || !r.bcv_rate
                ? 0
                : (r.amount_usd || 0) * (r.bcv_rate || 0));
            return acc + bs;
          }, 0);

          // Totales acumulados progresivos exactos (Hojas 1 hasta la actual)
          let itemsUntilNow = 0;
          for (let i = 0; i <= pIdx; i++) {
            itemsUntilNow += printPages[i].length;
          }
          const accumulatedRequests = filteredHistory.slice(0, itemsUntilNow);
          const accumulatedUSD = accumulatedRequests.reduce((acc, r) => {
            if (r.status === 'anulado') return acc;
            return acc + (r.amount_usd || 0);
          }, 0);
          const accumulatedBS = accumulatedRequests.reduce((acc, r) => {
            if (r.status === 'anulado') return acc;
            const bs =
              r.amount_bs ||
              (r.currency === 'USD' || !r.bcv_rate
                ? 0
                : (r.amount_usd || 0) * (r.bcv_rate || 0));
            return acc + bs;
          }, 0);

          return (
            <div
              key={`print-sheet-${pIdx}`}
              className="print-page-sheet text-slate-950 bg-white"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            >
              {/* Cabecera Corporativa del Reporte */}
              <div className="border-b border-slate-900 pb-1.5 mb-1.5 flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-slate-950">
                      TRAVEL POINT
                    </span>
                    <span className="text-[7.5pt] bg-slate-900 text-white font-mono font-bold px-1.5 py-0.5 rounded">
                      TP PAGOS PRO
                    </span>
                  </div>
                  <h1 className="text-[10pt] font-black uppercase text-slate-900 tracking-wide">
                    Reporte Contable de Pagos Liquidados
                  </h1>
                  <p className="text-[7.5pt] text-slate-700">
                    Registro oficial de transacciones y pagos emitidos con comprobantes bancarios verificados.
                  </p>
                </div>

                <div className="text-right text-[7.5pt] space-y-0.5 text-slate-800 font-medium">
                  <p className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded inline-block border border-slate-300">
                    Hoja {pIdx + 1} de {printPages.length}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p>
                    <strong>Período:</strong>{' '}
                    {startDate && endDate
                      ? `${startDate} al ${endDate}`
                      : dateFilter === 'today'
                      ? 'Hoy'
                      : dateFilter === 'week'
                      ? 'Esta Semana'
                      : dateFilter === 'month'
                      ? 'Este Mes'
                      : 'Historial Completo'}
                  </p>
                  <p>
                    <strong>Emisor:</strong> {currentUser?.full_name || 'Administrador'}
                  </p>
                </div>
              </div>

              {/* Resumen Financiero Superior (Solo en la primera hoja) */}
              {isFirstPage && (
                <div className="grid grid-cols-3 gap-2 mb-2 bg-slate-50 border border-slate-300 p-1.5 rounded-lg text-center print-avoid-break">
                  <div className="border-r border-slate-300">
                    <span className="text-[7.5pt] uppercase font-bold text-slate-600 block">
                      Total Transacciones
                    </span>
                    <span className="text-[9.5pt] font-black text-slate-950">
                      {filteredHistory.length} registros
                    </span>
                  </div>
                  <div className="border-r border-slate-300">
                    <span className="text-[7.5pt] uppercase font-bold text-slate-600 block">
                      Total Liquidado en Divisas ($)
                    </span>
                    <span className="text-[9.5pt] font-black text-emerald-900 whitespace-nowrap">
                      {formatUSD(totalUSD)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5pt] uppercase font-bold text-slate-600 block">
                      Total Liquidado en Bolívares (Bs.)
                    </span>
                    <span className="text-[9.5pt] font-black text-slate-950 whitespace-nowrap">
                      Bs. {formatBS(totalBS)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tabla Detallada de Transacciones de esta Hoja */}
              <table className="w-full border-collapse text-[8pt] border border-slate-300">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-left border border-slate-900">
                    <th className="py-1 px-1.5 border-r border-slate-700 w-14 text-[8pt]"># LOC</th>
                    <th className="py-1 px-1.5 border-r border-slate-700 w-14 text-[8pt]">Fecha</th>
                    <th className="py-1 px-1.5 border-r border-slate-700 text-[8pt]">Cliente / Servicio</th>
                    <th className="py-1 px-1.5 border-r border-slate-700 text-[8pt]">Huésped</th>
                    <th className="py-1 px-1.5 border-r border-slate-700 text-[8pt]">Beneficiario y Banco</th>
                    <th className="py-1 px-1.5 border-r border-slate-700 w-24 text-[8pt]">Banco Emisor y Tasa</th>
                    <th className="py-1 px-1.5 border-r border-slate-700 text-right w-20 text-[8pt]">Monto ($)</th>
                    <th className="py-1 px-1.5 text-right w-28 text-[8pt]">Monto en Bs.</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRequests.map((req, idx) => {
                    const isAnulado = req.status === 'anulado';
                    const reqBs = isAnulado
                      ? 0
                      : req.amount_bs ||
                        (req.currency === 'USD' || !req.bcv_rate
                          ? 0
                          : (req.amount_usd || 0) * (req.bcv_rate || 0));
                    const reqUsd = isAnulado ? 0 : (req.amount_usd || 0);
                    const destInfo =
                      req.bank_details?.beneficiary || req.hotel_name || req.title || 'N/A';
                    const bankName =
                      req.bank_details?.bank || req.bank_details?.payment_method || 'N/A';
                    const isEven = idx % 2 === 0;

                    return (
                      <tr
                        key={req.id}
                        className={`border-b border-slate-300 ${
                          isAnulado
                            ? 'bg-rose-50/40 text-slate-600'
                            : isEven
                            ? 'bg-white'
                            : 'bg-slate-50/90'
                        }`}
                      >
                        <td className="py-1 px-1.5 font-mono font-bold text-slate-950 border-r border-slate-200 text-[8pt]">
                          #{req.locator}
                          {isAnulado && (
                            <span className="block text-[6pt] font-sans font-black text-rose-700 uppercase">
                              [ANULADO]
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-1.5 text-slate-800 border-r border-slate-200 whitespace-nowrap text-[7.5pt]">
                          {new Date(req.updated_at || req.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 max-w-[110px]">
                          <strong className="block text-slate-950 leading-tight text-[8pt] truncate">
                            {req.client}
                          </strong>
                          <span className="text-[6.5pt] text-slate-600 uppercase block leading-none truncate">
                            {req.category || 'HOSPEDAJE'}
                          </span>
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 max-w-[125px]">
                          <span className="text-slate-950 font-semibold block leading-tight text-[8pt] truncate">
                            {req.guest_name || req.expense_concept || req.title}
                          </span>
                          {req.guest_ci && (
                            <span className="text-[6.5pt] text-slate-600 font-mono block leading-none truncate mt-0.5">
                              CI: {req.guest_ci.replace(/\n/g, ' ').replace(/\s*\/\s*/g, ' / ')}
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 max-w-[125px]">
                          <strong className="text-slate-950 block leading-tight text-[8pt] truncate">{destInfo}</strong>
                          <span className="text-[6.5pt] text-slate-700 block leading-none truncate">{bankName}</span>
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 max-w-[110px]">
                          {isAnulado ? (
                            <span className="text-[7pt] font-bold text-rose-700 uppercase block">
                              ANULADO
                            </span>
                          ) : (
                            <>
                              <strong className="text-slate-950 block text-[8pt] leading-tight truncate">
                                {req.origin_bank || 'No especificado'}
                              </strong>
                              {req.bcv_rate ? (
                                <span className="text-[6.5pt] font-mono text-slate-700 font-bold block leading-none">
                                  Tasa: Bs. {formatBS(req.bcv_rate)}
                                </span>
                              ) : req.currency === 'USD' ? (
                                <span className="text-[6.5pt] font-mono text-emerald-900 font-bold block leading-none">
                                  Pago Directo ($)
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-950 border-r border-slate-200 whitespace-nowrap text-[8pt]">
                          {formatUSD(reqUsd)}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-950 whitespace-nowrap text-[8pt]">
                          Bs. {formatBS(reqBs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {/* Fila 1: Subtotal de esta Hoja específica */}
                  <tr className="border-t-2 border-slate-700 bg-slate-100 font-bold text-slate-950">
                    <td colSpan={6} className="py-1 px-2 text-right uppercase text-[7.5pt]">
                      Subtotal de esta Hoja #{pIdx + 1} ({pageRequests.length} registros):
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-[8pt] text-emerald-950 border-r border-slate-300 font-bold whitespace-nowrap">
                      {formatUSD(pageSubtotalUSD)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-[8pt] text-slate-950 font-bold whitespace-nowrap">
                      Bs. {formatBS(pageSubtotalBS)}
                    </td>
                  </tr>

                  {/* Fila 2: Total Acumulado Progresivo (Hojas 1 a N) */}
                  <tr className="border-t border-slate-400 bg-slate-200 font-black text-slate-950">
                    <td colSpan={6} className="py-1.5 px-2 text-right uppercase text-[8pt]">
                      {isLastPage
                        ? `TOTAL GENERAL CONSOLIDADO DEL REPORTE:`
                        : `TOTAL ACUMULADO A LA FECHA (HOJAS 1 A ${pIdx + 1}):`}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-[8pt] text-emerald-950 border-r border-slate-400 font-black whitespace-nowrap">
                      {formatUSD(accumulatedUSD)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-[8pt] text-slate-950 font-black whitespace-nowrap">
                      Bs. {formatBS(accumulatedBS)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Firmas de Control y Auditoría (Solo en la última hoja) */}
              {isLastPage && (
                <div className="mt-4 pt-2 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-[8pt] print-avoid-break">
                  <div className="space-y-3">
                    <div className="border-b border-slate-500 w-40 mx-auto" />
                    <p className="font-bold text-slate-950 leading-none">
                      Elaborado por (Administración / Pagos)
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="border-b border-slate-500 w-40 mx-auto" />
                    <p className="font-bold text-slate-950 leading-none">
                      Revisado / Aprobado (Auditoría Contable)
                    </p>
                  </div>
                </div>
              )}

              {/* Pie de página oficial de cada hoja */}
              <div className="mt-2 pt-1 border-t border-slate-300 flex justify-between text-[7pt] text-slate-600">
                <span>
                  TP PAGOS PRO • Registro oficial emitido electrónicamente con comprobantes bancarios archivados.
                </span>
                <span className="font-bold text-slate-900">
                  Hoja {pIdx + 1} de {printPages.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
