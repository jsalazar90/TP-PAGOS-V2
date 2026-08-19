import React, { useState } from 'react';
import { UserProfile } from '../types';
import { TPLogo } from './TPLogo';
import { User, Lock, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  availableUsers: UserProfile[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, availableUsers }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !password) {
      setErrorMsg('Por favor introduce tu nombre de usuario y contraseña');
      return;
    }

    const cleanInput = username.trim().toLowerCase();

    setLoading(true);
    setTimeout(() => {
      const foundUser = availableUsers.find(
        (u) =>
          (u.username && u.username.toLowerCase() === cleanInput) ||
          u.email.toLowerCase() === cleanInput ||
          u.email.split('@')[0].toLowerCase() === cleanInput
      );

      if (!foundUser) {
        setErrorMsg('⚠️ Usuario no encontrado. Por favor verifica tu nombre de usuario o solicita tu registro al Administrador.');
        setLoading(false);
        return;
      }

      if (!foundUser.is_active) {
        setErrorMsg('⚠️ Tu cuenta de usuario se encuentra inactiva. Contacta al Administrador.');
        setLoading(false);
        return;
      }

      // Validar Contraseña Estricta
      const userPassword = foundUser.password || (foundUser.username === 'admin' ? 'admin' : '1234');
      if (password !== userPassword) {
        setErrorMsg('⚠️ Contraseña incorrecta. Por favor verifica tu contraseña e intenta nuevamente.');
        setLoading(false);
        return;
      }

      onLoginSuccess(foundUser);
      setLoading(false);
    }, 300);
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
        </div>
      </div>
    </div>
  );
};
