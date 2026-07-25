import React, { useState } from 'react';
import { PaymentRequest } from '../types';
import { StatusBadge } from './StatusBadge';
import { History, Search, Download, Eye, FileCheck, Landmark, Calendar } from 'lucide-react';

interface HistoryViewProps {
  requests: PaymentRequest[];
  onOpenDetails: (request: PaymentRequest) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  requests,
  onOpenDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const historyRequests = requests.filter(r => r.status === 'realizado');

  const filteredHistory = historyRequests.filter(r => {
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

  const totalUSD = historyRequests.reduce((acc, r) => acc + (r.amount_usd || 0), 0);
  const totalBS = historyRequests.reduce((acc, r) => acc + (r.amount_bs || 0), 0);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatBS = (val: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-3.5 pb-16 md:pb-6">
      {/* Header Banner */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Historial y Archivo de Pagos</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {historyRequests.length} realizados
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro histórico de solicitudes de pago concretadas y comprobantes adjuntos.
          </p>
        </div>

        {/* Stats Summary Card */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pagado ($)</span>
            <span className="text-emerald-700 font-extrabold text-sm sm:text-base">
              {formatUSD(totalUSD)}
            </span>
          </div>
          <div className="border-l border-slate-200 pl-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pagado (BS)</span>
            <span className="text-indigo-700 font-extrabold text-sm sm:text-base">
              BS {formatBS(totalBS)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar en el historial por Cliente, Huésped, C.I., Hotel, LOC..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
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

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-2.5">
          {filteredHistory.map((req) => (
            <div
              key={req.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-card hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Left Column Info */}
              <div className="space-y-1 sm:max-w-md">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    LOC: #{req.locator}
                  </span>
                  <StatusBadge status="realizado" size="sm" />
                  <span className="text-xs text-slate-500 font-medium">Cliente: {req.client}</span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm leading-snug">{req.title}</h3>
                <p className="text-xs text-slate-600">
                  Huésped: <strong className="text-slate-800">{req.guest_name}</strong> ({req.guest_ci}) | Hotel:{' '}
                  <strong className="text-slate-800">{req.hotel_name}</strong>
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> {req.nights_dates}
                  </span>
                  <span className="flex items-center gap-1">
                    <Landmark className="w-3 h-3 text-slate-400" /> {req.bank_details.bank}
                  </span>
                </div>
              </div>

              {/* Middle Amounts */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-right sm:min-w-[150px]">
                <div className="text-xs sm:text-sm font-extrabold text-emerald-700">
                  {formatUSD(req.amount_usd)}
                </div>
                <div className="text-xs font-bold text-indigo-700">
                  BS {formatBS(req.amount_bs)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Tasa: BS {req.bcv_rate}
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-1.5 shrink-0 sm:flex-col sm:items-end">
                <button
                  onClick={() => onOpenDetails(req)}
                  className="active-press px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 border border-slate-200"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ver Ficha</span>
                </button>

                {req.receipt_file_url ? (
                  <a
                    href={req.receipt_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="active-press px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1 border border-emerald-200"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Comprobante</span>
                    <Download className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400">Sin archivo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 shadow-card space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Historial vacío</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? `No se encontraron pagos completados para "${searchQuery}".`
              : 'Las solicitudes en estado "Realizado" se mostrarán archivadas aquí.'}
          </p>
        </div>
      )}
    </div>
  );
};
