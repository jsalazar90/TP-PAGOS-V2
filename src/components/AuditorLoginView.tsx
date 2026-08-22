// ==============================================================================
// VISTA DE LOGIN EXCLUSIVA PARA EL MÓDULO DE AUDITORÍA (/auditor)
// TP PAGOS PRO - Super Usuario: jhoansg (1709)
// ==============================================================================

import React, { useState } from 'react';
import { TPLogo } from './TPLogo';
import {
  ShieldAlert,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface AuditorLoginViewProps {
  onLoginSuccess: () => void;
  onGoToMain: () => void;
}

export const AuditorLoginView: React.FC<AuditorLoginViewProps> = ({
  onLoginSuccess,
  onGoToMain
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    setTimeout(() => {
      if (cleanUser === 'jhoansg' && cleanPass === '1709') {
        sessionStorage.setItem('tp_super_auditor_user', 'jhoansg');
        onLoginSuccess();
      } else {
        sessionStorage.removeItem('tp_super_auditor_user');
        setErrorMsg('Credenciales no autorizadas para la Bitácora de Auditoría.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
              <TPLogo size="lg" showSubtitle={false} />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-950/80 border border-teal-800 text-teal-400 text-xs font-bold rounded-full mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Módulo de Auditoría & Seguridad</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Bitácora de Movimientos
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Acceso restringido para el Super Usuario de Seguridad
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-bold rounded-2xl flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Super Usuario</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario auditor"
                  autoCapitalize="none"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                <span>Clave de Acceso</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-[#00b4a2] hover:from-teal-600 hover:to-[#009b8b] text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ingresar a la Bitácora</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onGoToMain}
              className="text-xs text-slate-400 hover:text-teal-400 font-semibold transition-colors"
            >
              ← Volver al Sistema Principal de Pagos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
