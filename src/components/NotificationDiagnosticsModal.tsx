// ==============================================================================
// MODAL DE DIAGNÓSTICO Y PRUEBAS EN VIVO DE NOTIFICACIONES
// Permite verificar el estado exacto de Android, HTTPS, Service Worker y Google FCM
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { notificationService } from '../services/notificationService';
import { broadcastPushToAdmins } from '../services/pushSender';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Smartphone,
  RefreshCw,
  X,
  Send
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
  const [hasPush, setHasPush] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [dbSubCount, setDbSubCount] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  const checkAll = async () => {
    setIsSecure(window.isSecureContext);
    setHasSW('serviceWorker' in navigator);
    setHasPush('PushManager' in window);
    setPermission(notificationService.getPermission());

    const sub = await notificationService.getPushSubscription();
    if (sub) {
      setEndpoint(sub.endpoint);
    } else {
      setEndpoint(null);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_role', 'admin');
        setDbSubCount(data ? data.length : 0);
      } catch (e) {
        setDbSubCount(null);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAll();
      setLog(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestLocal = async () => {
    setTesting(true);
    setLog('Probando notificación local inmediata...');
    try {
      const res = await notificationService.sendNotification('🔔 Notificación Local de Prueba', {
        body: 'Si ves esto, tu navegador y Android tienen los permisos visuales correctos.',
        soundType: 'new_request'
      });
      if (res) {
        setLog('✅ Notificación local disparada con éxito. ¿Vibró o apareció en pantalla?');
      } else {
        setLog('❌ Error: El navegador no pudo mostrar la notificación. Revisa que las notificaciones de Chrome no estén bloqueadas en Ajustes de Android.');
      }
    } catch (e: any) {
      setLog(`❌ Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestRemotePush = async () => {
    setTesting(true);
    setLog('Despachando Web Push a Google FCM...');
    try {
      await broadcastPushToAdmins({
        title: '🔥 PRUEBA PUSH REMOTA - TP PAGOS PRO',
        body: '¡Esta notificación fue enviada a través de Google FCM a tu teléfono!',
        urgent: true
      });
      setLog('✅ Paquete Push enviado a Google FCM. Revisa la barra de estado de Android en 2 segundos.');
    } catch (e: any) {
      setLog(`❌ Error en envío remoto: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleResync = async () => {
    setTesting(true);
    setLog('Renovando y sincronizando suscripción en Supabase...');
    try {
      const res = await notificationService.subscribeAdminToPush(currentUser);
      await checkAll();
      setLog(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
    } catch (e: any) {
      setLog(`❌ Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Diagnóstico de Notificaciones</h2>
              <p className="text-xs text-slate-300">Verificador de Android, HTTPS y Google FCM</p>
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
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Warning if not HTTPS */}
          {!isSecure && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 text-xs text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">⚠️ Conexión Insegura (HTTP detectado)</p>
                <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                  Google Chrome y Android <strong>bloquean las notificaciones en segundo plano</strong> si la URL empieza por <code className="bg-white px-1 py-0.5 rounded font-mono">http://</code> en red local.
                  Para que funcionen al 100% en el teléfono, la app debe estar en un dominio seguro <code className="bg-white px-1 py-0.5 rounded font-mono">https://</code> (como Vercel) o en <code className="bg-white px-1 py-0.5 rounded font-mono">localhost</code>.
                </p>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-medium text-slate-700">1. Contexto Seguro (HTTPS / Localhost)</span>
              <span className={`font-bold flex items-center gap-1 ${isSecure ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isSecure ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {isSecure ? 'HTTPS Válido' : 'HTTP Inseguro'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-medium text-slate-700">2. Service Worker y Push API</span>
              <span className={`font-bold flex items-center gap-1 ${hasSW && hasPush ? 'text-emerald-600' : 'text-rose-600'}`}>
                {hasSW && hasPush ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {hasSW && hasPush ? 'Soportado' : 'No soportado'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-medium text-slate-700">3. Permiso en el Teléfono</span>
              <span className={`font-bold flex items-center gap-1 ${permission === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {permission === 'granted' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {permission === 'granted' ? 'Permitido' : permission === 'denied' ? 'Bloqueado' : 'Sin solicitar'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-medium text-slate-700">4. Registro en Supabase (Admins)</span>
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                {dbSubCount !== null ? `${dbSubCount} dispositivo(s)` : 'Consultando...'}
              </span>
            </div>
          </div>

          {/* Endpoint Snippet */}
          {endpoint && (
            <div className="p-3 bg-slate-100 rounded-2xl text-[10px] text-slate-600 font-mono break-all">
              <span className="font-bold text-slate-800">Endpoint FCM: </span>
              {endpoint.substring(0, 70)}...
            </div>
          )}

          {/* Action Log Result */}
          {log && (
            <div className="p-3 bg-slate-900 text-white rounded-2xl text-xs font-mono border border-slate-800 animate-fade-in">
              {log}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleTestLocal}
              disabled={testing}
              className="flex items-center justify-center gap-2 p-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-2xl text-xs font-bold transition-all active:scale-95"
            >
              <Bell className="w-4 h-4 text-teal-600" />
              <span>Probar Alerta Local</span>
            </button>

            <button
              onClick={handleTestRemotePush}
              disabled={testing}
              className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Probar Push Remoto (FCM)</span>
            </button>
          </div>

          <button
            onClick={handleResync}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Re-sincronizar y Renovar Teléfono</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
