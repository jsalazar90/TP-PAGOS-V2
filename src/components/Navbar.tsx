import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { TPLogo } from './TPLogo';
import {
  History,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck,
  Plus,
  LayoutDashboard,
  Bell,
  BellRing,
  BellOff,
  Building2
} from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface NavbarProps {
  currentUser: UserProfile;
  activeTab: 'dashboard' | 'history' | 'beneficiaries' | 'users';
  setActiveTab: (tab: 'dashboard' | 'history' | 'beneficiaries' | 'users') => void;
  onOpenNewRequest: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenNewRequest,
  onLogout,
}) => {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return notificationService.getPermission();
  });
  const [isPushActive, setIsPushActive] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (notificationService.isSupported()) {
        setNotifPermission(notificationService.getPermission());
      }
      if (currentUser.role === 'admin' && notificationService.isPushSupported()) {
        const active = await notificationService.isPushSubscribed();
        setIsPushActive(active);
      }
    };
    checkStatus();
  }, [currentUser]);

  const handleToggleNotifications = async () => {
    if (isSubscribing) return;

    if (!notificationService.isSupported()) {
      alert('Tu navegador o dispositivo no soporta notificaciones web.');
      return;
    }

    if (currentUser.role === 'admin' && notificationService.isPushSupported()) {
      setIsSubscribing(true);
      try {
        if (!isPushActive) {
          const res = await notificationService.subscribeAdminToPush(currentUser);
          if (res.success) {
            setIsPushActive(true);
            setNotifPermission('granted');
            notificationService.sendNotification('🔔 Notificaciones de Fondo Activadas', {
              body: '¡Excelente! Recibirás alertas incluso cuando la app esté cerrada.',
              soundType: 'new_request'
            });
          } else {
            alert(res.message);
          }
        } else {
          // Ya está suscrito: reproducir tono de prueba y enviar notificación
          notificationService.sendNotification('🔔 Alertas Push Activas', {
            body: 'El sistema de notificaciones en segundo plano está conectado y listo.',
            soundType: 'new_request'
          });
        }
      } catch (e: any) {
        console.error('Error al gestionar notificaciones push:', e);
      } finally {
        setIsSubscribing(false);
      }
      return;
    }

    // Para usuarios solicitantes / operadores
    if (notifPermission !== 'granted') {
      const res = await notificationService.requestPermission();
      setNotifPermission(res);
      if (res === 'granted') {
        notificationService.sendNotification('🔔 Notificaciones Activadas', {
          body: 'Recibirás alertas en tiempo real al crearse o actualizarse solicitudes.',
          soundType: 'new_request'
        });
      }
    } else {
      notificationService.sendNotification('🔔 Notificaciones Activas', {
        body: 'Sistema de alertas funcionando correctamente en este dispositivo.',
        soundType: 'new_request'
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo */}
          <div className="cursor-pointer py-1 shrink-0" onClick={() => setActiveTab('dashboard')}>
            <TPLogo size="md" showSubtitle={true} />
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#00b4a2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Bandeja Entrada</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-[#00b4a2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial (Archivo)</span>
            </button>

            <button
              onClick={() => setActiveTab('beneficiaries')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'beneficiaries'
                  ? 'bg-white text-[#00b4a2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Beneficiarios</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'users'
                    ? 'bg-white text-[#00b4a2] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gestión Usuarios</span>
              </button>
            )}
          </nav>

          {/* Right Action Tools & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notification Alert Bell Button */}
            <button
              onClick={handleToggleNotifications}
              disabled={isSubscribing}
              title={
                currentUser.role === 'admin'
                  ? isPushActive
                    ? 'Notificaciones Push en segundo plano activas (toca para probar)'
                    : 'Activar Notificaciones Push en segundo plano en este teléfono'
                  : notifPermission === 'granted'
                  ? 'Notificaciones activas'
                  : 'Activar notificaciones'
              }
              className={`active-press p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                isSubscribing
                  ? 'bg-slate-100 text-slate-400 border-slate-200 animate-pulse'
                  : (currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted')
                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 shadow-2xs'
                  : notifPermission === 'denied'
                  ? 'bg-rose-50 text-rose-500 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse-subtle'
              }`}
            >
              {(currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted') ? (
                <>
                  <BellRing className="w-4 h-4 text-[#00b4a2]" />
                  <span className="hidden xl:inline text-[11px] font-semibold text-teal-800">
                    {currentUser.role === 'admin' ? 'Push 24/7 Activo' : 'Alertas ON'}
                  </span>
                </>
              ) : notifPermission === 'denied' ? (
                <BellOff className="w-4 h-4 text-rose-400" />
              ) : (
                <>
                  <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span className="hidden sm:inline text-amber-900 font-bold">
                    {currentUser.role === 'admin' ? 'Activar Push Móvil' : 'Activar Alertas'}
                  </span>
                </>
              )}
            </button>

            {/* New Request Button */}
            <button
              onClick={onOpenNewRequest}
              className="active-press flex items-center gap-1.5 bg-[#00b4a2] hover:bg-[#009b8b] text-white px-2.5 py-2 sm:px-3.5 sm:py-2 rounded-xl font-bold text-xs shadow-2xs transition-all shrink-0"
              title="Crear Nueva Solicitud de Pago"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Nueva Solicitud</span>
            </button>

            {/* User Profile info (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 px-3 py-1 rounded-xl border border-slate-200">
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-teal-600" />
              ) : (
                <UserCheck className="w-4 h-4 text-teal-600" />
              )}
              <div className="text-left text-xs">
                <p className="font-bold text-slate-800 leading-tight">{currentUser.full_name}</p>
                <p className="text-[10px] text-slate-500 font-medium capitalize">
                  {currentUser.role === 'admin' ? 'Administrador' : 'Solicitante'}
                </p>
              </div>
            </div>

            {/* Logout button (Header) */}
            <button
              onClick={onLogout}
              title="Cerrar Sesión (Salir)"
              aria-label="Cerrar Sesión"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200/80 transition-colors active-press shrink-0 flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Ultra Accessible on Phones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'dashboard' ? 'text-[#00b4a2] bg-teal-50/80' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Bandeja</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'history' ? 'text-[#00b4a2] bg-teal-50/80' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial</span>
        </button>

        <button
          onClick={() => setActiveTab('beneficiaries')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'beneficiaries' ? 'text-[#00b4a2] bg-teal-50/80' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Beneficiarios</span>
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
              activeTab === 'users' ? 'text-[#00b4a2] bg-teal-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </button>
        )}

        {/* Mobile Notifications Button in Bottom Bar */}
        <button
          onClick={handleToggleNotifications}
          disabled={isSubscribing}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            (currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted')
              ? 'text-teal-700 hover:bg-teal-50'
              : 'text-amber-700 bg-amber-50 animate-pulse'
          }`}
          title="Activar o probar alertas"
        >
          {(currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted') ? (
            <BellRing className="w-4 h-4 text-[#00b4a2]" />
          ) : (
            <Bell className="w-4 h-4 text-amber-600" />
          )}
          <span>
            {currentUser.role === 'admin'
              ? isPushActive
                ? 'Push 24/7'
                : 'Activar'
              : notifPermission === 'granted'
              ? 'Alertas'
              : 'Activar'}
          </span>
        </button>

        {/* Mobile Logout Button in Bottom Bar */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
};
