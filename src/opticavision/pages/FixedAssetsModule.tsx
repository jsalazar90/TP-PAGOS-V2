import React, { useState } from 'react';
import { ChevronLeft, ArrowLeft, Building2, Calculator, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import FixedAssetsList from '../components/accounting/FixedAssetsList';
import Depreciations from '../components/accounting/Depreciations';
import FixedAssetParameters from '../components/accounting/FixedAssetParameters';

type ViewState = 'menu' | 'activos_fijos' | 'depreciaciones' | 'parametros';

interface FixedAssetsModuleProps {
  activosFijos: any[];
  categoriasActivos: any[];
  depreciaciones: any[];
  cuentasContables: any[];
  proveedores: any[];
  configContable: any;
  comprobantes?: any[];
  cxp?: any[];
  cxc?: any[];
  onSave: (collection: string, data: any) => void;
  showToast: (msg: string, type: string) => void;
}

export default function FixedAssetsModule({ 
  activosFijos, 
  categoriasActivos, 
  depreciaciones, 
  cuentasContables, 
  proveedores, 
  configContable, 
  comprobantes = [],
  cxp = [],
  cxc = [],
  onSave, 
  showToast 
}: FixedAssetsModuleProps) {
  const [view, setView] = useState<ViewState>('menu');

  const renderContent = () => {
    switch (view) {
      case 'activos_fijos':
        return (
          <FixedAssetsList 
            activosFijos={activosFijos} 
            categoriasActivos={categoriasActivos} 
            proveedores={proveedores} 
            cuentasContables={cuentasContables} 
            configContable={configContable} 
            comprobantes={comprobantes}
            cxp={cxp}
            cxc={cxc}
            depreciaciones={depreciaciones}
            onSave={onSave} 
            showToast={showToast} 
          />
        );
      case 'depreciaciones':
        return (
          <Depreciations 
            depreciaciones={depreciaciones} 
            activosFijos={activosFijos} 
            categoriasActivos={categoriasActivos} 
            cuentasContables={cuentasContables}
            comprobantes={comprobantes}
            onSave={onSave} 
            showToast={showToast} 
          />
        );
      case 'parametros':
        return <FixedAssetParameters categoriasActivos={categoriasActivos} cuentasContables={cuentasContables} onSave={onSave} showToast={showToast} />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'activos_fijos': return 'Activos Fijos';
      case 'depreciaciones': return 'Depreciaciones';
      case 'parametros': return 'Parámetros de Activo Fijo';
      default: return '';
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-6 lg:px-8 pt-1 pb-6">
      {view === 'menu' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 mb-4">
            <div className="self-start">
              <BackButton to="/accounting" label="Volver a Contabilidad" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Módulo de Activos Fijos</h1>
              <p className="text-slate-500 mt-0.5 text-xs sm:text-base">Gestión, depreciación y configuración de activos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 max-w-5xl mx-auto mt-4">
            <button 
              onClick={() => setView('activos_fijos')}
              className="group bg-white p-4 sm:p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex sm:flex-col items-center sm:items-start gap-3.5 sm:gap-5 relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="p-3 sm:p-3.5 bg-blue-50 text-blue-600 rounded-xl w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shrink-0">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Activos Fijos</h3>
                <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">
                  Registro y control del inventario de activos fijos de la empresa.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setView('depreciaciones')}
              className="group bg-white p-4 sm:p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left flex sm:flex-col items-center sm:items-start gap-3.5 sm:gap-5 relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="p-3 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shrink-0">
                <Calculator className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Depreciaciones</h3>
                <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">
                  Cálculo, ejecución y registro contable de la depreciación.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setView('parametros')}
              className="group bg-white p-4 sm:p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-left flex sm:flex-col items-center sm:items-start gap-3.5 sm:gap-5 relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="p-3 sm:p-3.5 bg-slate-100 text-slate-600 rounded-xl w-fit group-hover:bg-slate-600 group-hover:text-white transition-colors duration-300 shrink-0">
                <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">Parámetros de Activo Fijo</h3>
                <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">
                  Configuración de categorías, métodos y cuentas contables.
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
              <BackButton onClick={() => setView('menu')} label="Volver al Menú Activos" />
              <div>
                <h2 className="text-base sm:text-xl font-bold text-slate-800">{getTitle()}</h2>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[320px] flex items-start justify-center">
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}
