// ==============================================================================
// VISTA PRINCIPAL DE BITÁCORA Y AUDITORÍA DE SEGURIDAD (/auditor)
// TP PAGOS PRO - Super Usuario: jhoansg (1709)
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { AuditLogEntry, AuditActionType, fetchAuditLogs, exportAuditLogsToCSV } from '../services/auditService';
import { TPLogo } from './TPLogo';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  RefreshCw,
  LogOut,
  Clock,
  User,
  Activity,
  PlusCircle,
  Edit3,
  CheckCircle2,
  Trash2,
  Building2,
  KeyRound,
  AlertTriangle,
  Ban,
  X,
  RotateCcw
} from 'lucide-react';

interface AuditorViewProps {
  onLogout: () => void;
  onGoToMain: () => void;
}

export const AuditorView: React.FC<AuditorViewProps> = ({
  onLogout,
  onGoToMain
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Lista única de usuarios registrados en los logs
  const actorsList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.username) set.add(l.username);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtro de logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return logs.filter((log) => {
      const itemTime = new Date(log.created_at).getTime();

      // Filtro por fecha
      if (dateFilter === 'today' && itemTime < startOfToday) return false;
      if (dateFilter === 'week' && itemTime < startOfWeek) return false;
      if (dateFilter === 'month' && itemTime < startOfMonth) return false;

      // Filtro por tipo de acción
      if (selectedAction !== 'all') {
        if (selectedAction === 'requests' && !['create_request', 'update_request', 'restore_request'].includes(log.action_type)) return false;
        if (selectedAction === 'modifications' && !['request_modification', 'cancel_modification'].includes(log.action_type)) return false;
        if (selectedAction === 'status' && log.action_type !== 'status_change') return false;
        if (selectedAction === 'deletes' && log.action_type !== 'delete_request') return false;
        if (selectedAction === 'beneficiaries' && !['create_beneficiary', 'update_beneficiary', 'delete_beneficiary'].includes(log.action_type)) return false;
        if (selectedAction === 'users' && !['create_user', 'change_password', 'toggle_user_status', 'login'].includes(log.action_type)) return false;
      }

      // Filtro por actor
      if (selectedUser !== 'all' && log.username !== selectedUser) return false;

      // Buscador
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (log.username || '').toLowerCase().includes(q) ||
          (log.details || '').toLowerCase().includes(q) ||
          (log.target_id || '').toLowerCase().includes(q) ||
          (log.target_title || '').toLowerCase().includes(q) ||
          (log.user_role || '').toLowerCase().includes(q) ||
          (log.action_type || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [logs, dateFilter, selectedAction, selectedUser, searchQuery]);

  // KPIs de métricas
  const metrics = useMemo(() => {
    return {
      total: logs.length,
      creates: logs.filter((l) => l.action_type === 'create_request').length,
      modifications: logs.filter((l) => ['request_modification', 'update_request'].includes(l.action_type)).length,
      statusChanges: logs.filter((l) => l.action_type === 'status_change').length,
      deletions: logs.filter((l) => l.action_type === 'delete_request').length,
      beneficiaries: logs.filter((l) => ['create_beneficiary', 'update_beneficiary', 'delete_beneficiary'].includes(l.action_type)).length,
      userChanges: logs.filter((l) => ['create_user', 'change_password', 'toggle_user_status'].includes(l.action_type)).length,
    };
  }, [logs]);

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'create_request':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <PlusCircle className="w-3 h-3 text-emerald-600" /> Creación de Pago
          </span>
        );
      case 'request_modification':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-700" /> Petición de Modificación
          </span>
        );
      case 'request_cancellation':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-900 border border-rose-300 flex items-center gap-1">
            <Ban className="w-3 h-3 text-rose-600" /> Solicitud de Anulación
          </span>
        );
      case 'cancel_cancellation':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <X className="w-3 h-3 text-slate-500" /> Anulación Cancelada
          </span>
        );
      case 'cancel_modification':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <X className="w-3 h-3 text-slate-500" /> Modificación Cancelada
          </span>
        );
      case 'update_request':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-purple-600" /> Modificado por Admin
          </span>
        );
      case 'status_change':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Cambio de Estado / Pago
          </span>
        );
      case 'restore_request':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-sky-600" /> Solicitud Restaurada
          </span>
        );
      case 'delete_request':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 animate-pulse-subtle">
            <Trash2 className="w-3 h-3 text-rose-700" /> Solicitud Eliminada
          </span>
        );
      case 'create_beneficiary':
      case 'update_beneficiary':
      case 'delete_beneficiary':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-teal-600" /> Beneficiarios
          </span>
        );
      case 'create_user':
      case 'change_password':
      case 'toggle_user_status':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-indigo-600" /> Gestión de Usuarios
          </span>
        );
      case 'login':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-500" /> Inicio de Sesión
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo & Module Title */}
            <div className="flex items-center gap-3">
              <div className="cursor-pointer" onClick={onGoToMain}>
                <TPLogo size="md" showSubtitle={false} />
              </div>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-none text-white flex items-center gap-2">
                    <span>Módulo de Auditoría</span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono border border-teal-500/40">
                      /auditor
                    </span>
                  </h1>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Super Usuario: <strong className="text-teal-400">jhoansg</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Right */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadLogs}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Recargar bitácora"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => exportAuditLogsToCSV(filteredLogs)}
                disabled={filteredLogs.length === 0}
                className="active-press px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>

              <button
                onClick={onGoToMain}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Ir a Pagos
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors"
                title="Cerrar sesión de auditor"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-teal-400" /> Total Movimientos
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block font-mono">
              {metrics.total}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <PlusCircle className="w-3 h-3 text-emerald-400" /> Pagos Creados
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 block font-mono">
              {metrics.creates}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-purple-400" /> Modificaciones
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-400 block font-mono">
              {metrics.modifications}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-400" /> Estados / Pagos
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-400 block font-mono">
              {metrics.statusChanges}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-rose-900/40 rounded-2xl space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
              <Trash2 className="w-3 h-3 text-rose-400" /> Eliminaciones
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 block font-mono">
              {metrics.deletions}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-xl">
          <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
            {/* Live Search */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en la bitácora por actor, localizador, detalle o acción..."
                className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Actor Filter */}
              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900">Todos los Usuarios</option>
                  {actorsList.map((user) => (
                    <option key={user} value={user} className="bg-slate-900">
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    dateFilter === 'all' ? 'bg-teal-600 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todo
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    dateFilter === 'today' ? 'bg-teal-600 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setDateFilter('week')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    dateFilter === 'week' ? 'bg-teal-600 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    dateFilter === 'month' ? 'bg-teal-600 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mes
                </button>
              </div>
            </div>
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-1 border-t border-slate-800/80">
            <button
              onClick={() => setSelectedAction('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedAction === 'all'
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todos los Eventos ({logs.length})
            </button>
            <button
              onClick={() => setSelectedAction('requests')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedAction === 'requests'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <PlusCircle className="w-3 h-3" /> Solicitudes ({metrics.creates})
            </button>
            <button
              onClick={() => setSelectedAction('modifications')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedAction === 'modifications'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> Modificaciones ({metrics.modifications})
            </button>
            <button
              onClick={() => setSelectedAction('status')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedAction === 'status'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> Estados & Pagos ({metrics.statusChanges})
            </button>
            <button
              onClick={() => setSelectedAction('deletes')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedAction === 'deletes'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Trash2 className="w-3 h-3" /> Eliminaciones ({metrics.deletions})
            </button>
            <button
              onClick={() => setSelectedAction('beneficiaries')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedAction === 'beneficiaries'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Building2 className="w-3 h-3" /> Beneficiarios ({metrics.beneficiaries})
            </button>
            <button
              onClick={() => setSelectedAction('users')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedAction === 'users'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <KeyRound className="w-3 h-3" /> Usuarios ({metrics.userChanges})
            </button>
          </div>
        </div>

        {/* Timeline Log Entries Feed */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Cargando registros de auditoría...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                  log.action_type === 'delete_request'
                    ? 'bg-rose-950/20 border-rose-800/60 shadow-md'
                    : log.action_type === 'request_modification'
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : log.action_type === 'create_request'
                    ? 'bg-emerald-950/20 border-emerald-800/40'
                    : 'bg-slate-900/80 border-slate-800/90'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getActionBadge(log.action_type)}

                    {log.target_id && (
                      <span className="font-mono text-xs font-black text-teal-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        LOC: #{log.target_id}
                      </span>
                    )}

                    {log.target_title && (
                      <span className="text-xs font-bold text-slate-200 truncate max-w-xs">
                        {log.target_title}
                      </span>
                    )}
                  </div>

                  {/* Timestamp & Actor */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1 font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      <User className="w-3 h-3 text-teal-400" />
                      <span>{log.username}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({log.user_role})</span>
                    </span>

                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>
                        {new Date(log.created_at).toLocaleDateString()} • {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Details Content */}
                <div className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  {log.details}
                </div>

                {/* Metadata Tags if any */}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                    {Object.entries(log.metadata).map(([key, val]) => (
                      <span
                        key={key}
                        className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/80 font-mono"
                      >
                        <strong className="text-slate-500">{key}:</strong> {String(val)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">
                No hay movimientos registrados con los filtros seleccionados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No encontramos registros para "${searchQuery}".`
                  : 'Aún no se han producido eventos en este período.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
