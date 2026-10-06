// ==============================================================================
// MODAL DE ESTADO Y CONFIGURACIÓN DE NOTIFICACIONES PUSH
// TP PAGOS PRO - Notificaciones 24/7 en segundo plano
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { notificationService } from '../services/notificationService';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Smartphone,
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';

interface NotificationDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const NotificationDiagnosticsModal: React.FC<NotificationDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [isSecure, setIsSecure] = useState(false);
  const [hasSW, setHasSW] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [dbSubCount, setDbSubCount] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsSecure(window.isSecureContext);
    setHasSW('serviceWorker' in navigator);
    setPermission(notificationService.getPermission());

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id');
        setDbSubCount(data ? data.length : 0);
      } catch (e) {
        setDbSubCount(null);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResync = async () => {
    setSyncing(true);
    setStatusMsg('Sincronizando este dispositivo con Supabase...');
    try {
      const res = await notificationService.subscribeAdminToPush(currentUser);
      await checkStatus();
      setStatusMsg(res.success ? '✅ Dispositivo sincronizado correctamente con Google FCM.' : `⚠️ ${res.message}`);
    } catch (e: any) {
      setStatusMsg(`❌ Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const isAllReady = isSecure && hasSW && permission === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">Notificaciones Push</h2>
              <p className="text-[11px] text-slate-300">Alertas 24/7 en segundo plano y pagos en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
            isAllReady
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            {isAllReady ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-xs">
                {isAllReady ? 'Notificaciones Push Activas 24/7' : 'Notificaciones Pendientes de Activación'}
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAllReady
                  ? 'Recibirás avisos en tu teléfono incluso con la app cerrada o en segundo plano.'
                  : 'Toca el botón sincronizar para activar las alertas en este teléfono.'}
              </p>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>Permiso en este Teléfono</span>
              </span>
              <span className={`font-bold flex items-center gap-1 ${permission === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {permission === 'granted' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {permission === 'granted' ? 'Permitido' : 'Pendiente'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-medium">Dispositivos Vinculados (Push)</span>
              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                {dbSubCount !== null ? `${dbSubCount} dispositivo(s)` : 'Activo'}
              </span>
            </div>
          </div>

          {/* Haptic & Sound Tester */}
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#00b4a2]" />
                <span>Prueba de Respuesta Táctil (Háptica)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Android / PWA</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  notificationService.triggerHaptic('success');
                  notificationService.playChime('paid');
                }}
                className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold flex items-center justify-center gap-1 active-press transition-colors shadow-2xs"
                title="Vibración suave ascendente + tono armónico"
              >
                <span>✨ Pago Liquidado</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  notificationService.triggerHaptic('urgent');
                  notificationService.playChime('urgent');
                }}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold flex items-center justify-center gap-1 active-press transition-colors shadow-2xs"
                title="Doble pulso insistente de alarma"
              >
                <span>🔥 Alerta Urgente</span>
              </button>
            </div>
          </div>

          {statusMsg && (
            <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs font-mono border border-slate-800 animate-fade-in">
              {statusMsg}
            </div>
          )}

          {/* Resync Button */}
          <button
            onClick={handleResync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors active-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar / Renovar este Teléfono'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
