import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { TPLogo } from './TPLogo';
import {
  History,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Bell,
  BellRing,
  Building2,
  UserCog,
  ChevronDown
} from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface NavbarProps {
  currentUser: UserProfile;
  activeTab: 'dashboard' | 'history' | 'beneficiaries' | 'users';
  setActiveTab: (tab: 'dashboard' | 'history' | 'beneficiaries' | 'users') => void;
  onOpenNewRequest?: () => void;
  onOpenDiagnostics: () => void;
  onLogout: () => void;
  pendingCount?: number;
  urgentCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenDiagnostics,
  onLogout,
  pendingCount = 0,
  urgentCount = 0,
}) => {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return notificationService.getPermission();
  });
  const [isPushActive, setIsPushActive] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (notificationService.isSupported()) {
        setNotifPermission(notificationService.getPermission());
      }
      if (notificationService.isPushSupported()) {
        const active = await notificationService.isPushSubscribed(currentUser);
        setIsPushActive(active);
      }
    };
    checkStatus();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleToggleNotifications = async () => {
    onOpenDiagnostics();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs print:hidden">
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
              {pendingCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-black rounded-full text-white text-center shadow-2xs transition-colors ${
                    urgentCount > 0
                      ? 'bg-rose-500 animate-pulse'
                      : activeTab === 'dashboard'
                      ? 'bg-[#00b4a2]'
                      : 'bg-slate-700'
                  }`}
                  title={`${pendingCount} solicitudes activas (${urgentCount} urgentes)`}
                >
                  {pendingCount}
                </span>
              )}
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
              <span>Historial</span>
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

          {/* Right Action: User Profile Banner Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`active-press flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl border transition-all ${
                isUserMenuOpen
                  ? 'bg-white border-[#00b4a2] shadow-sm ring-2 ring-teal-500/20'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200/90'
              }`}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              title="Menú de usuario y configuración"
            >
              <div className="w-7 h-7 rounded-xl bg-teal-100/90 text-teal-700 flex items-center justify-center shrink-0">
                {currentUser.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                ) : currentUser.role === 'operador' ? (
                  <UserCog className="w-4 h-4 text-teal-700" />
                ) : (
                  <UserCheck className="w-4 h-4 text-teal-700" />
                )}
              </div>

              <div className="text-left hidden sm:block">
                <p className="font-bold text-slate-900 leading-tight text-xs max-w-[130px] sm:max-w-[160px] truncate">
                  {currentUser.full_name}
                </p>
                <p className="text-[10px] text-slate-500 font-medium capitalize">
                  {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'operador' ? 'Operador' : 'Solicitante'}
                </p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isUserMenuOpen ? 'rotate-180 text-teal-600' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Modal */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in divide-y divide-slate-100">
                {/* 1. Header con Información y Rol */}
                <div className="p-2.5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                      {currentUser.role === 'admin' ? (
                        <ShieldCheck className="w-5 h-5 text-teal-600" />
                      ) : currentUser.role === 'operador' ? (
                        <UserCog className="w-5 h-5 text-teal-600" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs truncate">
                        {currentUser.full_name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        @{currentUser.username}
                      </p>
                    </div>
                  </div>

                  {/* Rol Badge */}
                  <div className="mt-2.5 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">Rol de Cuenta:</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        currentUser.role === 'admin'
                          ? 'bg-teal-100 text-teal-800 border border-teal-200'
                          : currentUser.role === 'operador'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {currentUser.role === 'admin'
                        ? 'Administrador'
                        : currentUser.role === 'operador'
                        ? 'Operador'
                        : 'Solicitante'}
                    </span>
                  </div>
                </div>

                {/* 2. Botón de Activar / Configurar Notificaciones */}
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleToggleNotifications();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg border ${
                          (currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted')
                            ? 'bg-teal-50 text-[#00b4a2] border-teal-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}
                      >
                        {(currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted') ? (
                          <BellRing className="w-4 h-4 text-[#00b4a2]" />
                        ) : (
                          <Bell className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                          Notificaciones y Alertas
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {(currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted')
                            ? 'Activas en este dispositivo'
                            : 'Toca para activar o configurar'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        (currentUser.role === 'admin' ? isPushActive : notifPermission === 'granted')
                          ? 'bg-emerald-500'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Botón de Cerrar Sesión (Salir) */}
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors font-bold text-xs group"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 group-hover:bg-rose-100 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span>Cerrar Sesión (Salir)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Ultra Accessible on Phones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`relative flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'dashboard' ? 'text-[#00b4a2] bg-teal-50/80' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-4 h-4" />
            {pendingCount > 0 && (
              <span
                className={`absolute -top-1.5 -right-2.5 px-1 min-w-[15px] h-3.5 flex items-center justify-center text-[9px] font-black rounded-full text-white shadow-xs ${
                  urgentCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-[#00b4a2]'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </div>
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
