import React, { useState } from 'react';
import { UserProfile } from '../types';
import { TPLogo } from './TPLogo';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { authenticateUser } from '../services/dataService';
import { isSupabaseConfigured } from '../services/supabase';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  availableUsers: UserProfile[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = async (loginUser: string, loginPass: string) => {
    setErrorMsg('');

    if (!loginUser.trim() || !loginPass) {
      setErrorMsg('Por favor introduce tu nombre de usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      // Limpiar sesión de auditor previa
      sessionStorage.removeItem('tp_super_auditor_user');
      sessionStorage.removeItem('tp_super_auditor_session');

      const result = await authenticateUser(loginUser, loginPass);

      if (!result.success || !result.user) {
        setErrorMsg(result.error || '⚠️ Error al autenticar usuario.');
        setLoading(false);
        return;
      }

      if (result.user.id === 'super-user-jhoansg') {
        sessionStorage.setItem('tp_super_auditor_user', 'jhoansg');
      }

      onLoginSuccess(result.user);
    } catch (err: any) {
      setErrorMsg(err.message || '⚠️ Error de conexión al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const handleQuickTestLogin = async () => {
    setUsername('prueba');
    setPassword('1234');
    await performLogin('prueba', '1234');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <TPLogo size="lg" showSubtitle={true} />
          <p className="text-xs text-slate-500 font-medium pt-1">
            Sistema Administrativo de Control y Gestión de Pagos
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-card space-y-4 text-slate-800">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500">Ingresa tu usuario y contraseña para acceder</p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nombre de Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej. admin, maria, josmary..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="active-press w-full py-2.5 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Ingresando...' : 'Entrar al Sistema'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {!isSupabaseConfigured && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00b4a2] shrink-0" />
                    <span>Modo Local de Prueba (Sin Supabase)</span>
                  </span>
                </div>
                <p className="text-[11px] text-teal-800">
                  Usuario: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-teal-200">prueba</strong> · Contraseña: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-teal-200">1234</strong> <span className="text-teal-700 font-semibold">(Admin)</span>
                </p>
                <p className="text-[10px] text-slate-600">
                  También disponibles: <code className="font-mono">admin</code>/<code className="font-mono">admin</code>, <code className="font-mono">maria</code>/<code className="font-mono">1234</code> (Solicitante), <code className="font-mono">operador</code>/<code className="font-mono">1234</code> (Operador).
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickTestLogin}
                disabled={loading}
                className="active-press w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Entrar con usuario de prueba</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
