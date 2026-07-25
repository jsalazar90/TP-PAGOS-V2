import React from 'react';
import { UserProfile } from '../types';
import { TPLogo } from './TPLogo';
import { History, Users, LogOut, ShieldCheck, UserCheck, Plus, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile;
  activeTab: 'dashboard' | 'history' | 'users';
  setActiveTab: (tab: 'dashboard' | 'history' | 'users') => void;
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
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo */}
          <div className="cursor-pointer py-1" onClick={() => setActiveTab('dashboard')}>
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
          <div className="flex items-center gap-2">
            {/* New Request Button */}
            <button
              onClick={onOpenNewRequest}
              className="active-press flex items-center gap-1.5 bg-[#00b4a2] hover:bg-[#009b8b] text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold text-xs shadow-2xs transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Solicitud</span>
            </button>



            {/* User Profile info */}
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

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors active-press"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'dashboard' ? 'text-[#00b4a2] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Bandeja</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'history' ? 'text-[#00b4a2] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial</span>
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
              activeTab === 'users' ? 'text-[#00b4a2] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </button>
        )}
      </div>
    </header>
  );
};
