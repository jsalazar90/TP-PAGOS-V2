import React, { useState, useEffect } from 'react';
import { Download, Share, X, Smartphone, Monitor } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isAppleIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isAppleIOS);

    // Chrome / Edge / Android install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS and not installed, show option after a slight delay
    if (isAppleIOS && !isStandaloneMode) {
      const dismissedIOS = localStorage.getItem('tp_pagos_pwa_ios_dismissed');
      if (!dismissedIOS) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (isIOS) {
      localStorage.setItem('tp_pagos_pwa_ios_dismissed', 'true');
    }
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-3.5 py-2.5 rounded-2xl shadow-lg border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/90 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 shadow-xs">
          {isIOS ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
            <span>¡Instala TP PAGOS como App!</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-400/30">
              PWA Móvil y PC
            </span>
          </h4>
          <p className="text-[11px] text-indigo-200 mt-0.5">
            Accede más rápido desde tu escritorio en Windows, Android o iOS con soporte offline.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          onClick={handleInstallClick}
          className="active-press bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs"
        >
          {isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          <span>{isIOS ? 'Cómo Instalar en iOS' : 'Instalar App'}</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Descartar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal / Dialog Instructions for iOS Safari */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm text-slate-800">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full space-y-3 border border-slate-200 shadow-modal">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" /> Instalar en iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-600 pl-1">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline text-indigo-600" /> en la barra inferior de Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Desplázate hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Toca <strong>"Añadir"</strong> en la esquina superior derecha.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-indigo-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
