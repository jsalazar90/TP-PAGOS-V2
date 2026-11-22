import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './index.css';

// Registrar Service Worker de PWA con soporte Push en segundo plano
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nueva versión disponible, actualizando...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] Aplicación lista para trabajar sin conexión.');
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      registration.update().catch(() => {});
    }
  }
});

// Recuperación automática si ocurre un error de carga de módulos dinámicos tras un redeploy
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const RELOAD_KEY = 'tp_asset_reload_once';
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    // ignore sessionStorage error
  }

  const cleanupTasks: Promise<unknown>[] = [];
  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
    cleanupTasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => {})
    );
  }
  if ('caches' in window && window.caches.keys) {
    cleanupTasks.push(
      window.caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
        .catch(() => {})
    );
  }

  Promise.all(cleanupTasks).finally(() => {
    window.location.reload();
  });
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React App:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h1 className="text-xl font-bold text-rose-400">Ocurrió un error inesperado</h1>
            <p className="text-xs text-slate-300">
              {this.state.error?.message || 'Error al iniciar la aplicación.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-4 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-semibold text-white"
              >
                Recargar Página
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200"
              >
                Limpiar Datos y Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

try {
  sessionStorage.removeItem('tp_asset_reload_once');
} catch {
  // ignore sessionStorage error
}

