import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileSpreadsheet,
  FileText,
  ListTree,
  Lock,
  Building2,
  Scale,
  Settings,
  ChevronRight
} from 'lucide-react';
import BackButton from '../components/common/BackButton';

const accountingModules = [
  {
    name: 'Plan de Cuentas',
    description: 'Catálogo de cuentas contables y estructura financiera NIIF',
    icon: ListTree,
    gradient: 'from-violet-600 to-purple-600',
    shadow: 'shadow-violet-500/20',
    path: '/accounting/accounts'
  },
  {
    name: 'Comprobantes de Diario',
    description: 'Asientos manuales, libro diario y registros contables',
    icon: FileText,
    gradient: 'from-blue-600 to-indigo-600',
    shadow: 'shadow-blue-500/20',
    path: '/accounting/entries'
  },
  {
    name: 'Situación Financiera',
    description: 'Balance General NIIF, Masas Patrimoniales y Ratios de Liquidez',
    icon: Scale,
    gradient: 'from-indigo-600 to-cyan-600',
    shadow: 'shadow-indigo-500/20',
    path: '/reports?tab=contables'
  },
  {
    name: 'Activos Fijos',
    description: 'Registro, depreciación y control de bienes patrimoniales',
    icon: Building2,
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
    path: '/accounting/fixed-assets'
  },
  {
    name: 'Cierre de Ejercicio Fiscal',
    description: 'Liquidación de cuentas nominales, resultado anual y nuevo período',
    icon: Lock,
    gradient: 'from-emerald-600 to-teal-700',
    shadow: 'shadow-emerald-500/20',
    path: '/accounting/closing'
  },
  {
    name: 'Configuración',
    description: 'Carga masiva del plan de cuentas y cuentas contables para cierre de período',
    icon: Settings,
    gradient: 'from-slate-700 to-slate-900',
    shadow: 'shadow-slate-500/20',
    path: '/accounting/config'
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const item = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 25 }
  }
};

export default function Accounting() {
  return (
    <div className="w-full relative overflow-hidden flex flex-col p-3.5 sm:p-5 bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full z-10 space-y-4">
        {/* Top Bar Navigation */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 shrink-0">
          <BackButton to="/accounting-ledger" label="Volver a Cuentas & Mayor" />
          <span className="badge-modern-neutral">Finanzas &amp; Libros</span>
        </div>

        {/* Header alineado a la izquierda */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm shadow-violet-500/20 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={18} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Contabilidad General
            </h1>
            <p className="text-slate-500 text-xs font-medium">
              Plan contable, asientos de diario, balance y configuración financiera
            </p>
          </div>
        </div>

        {/* Compact Single-Row Modules Grid */}
        <motion.div
          variants={container as any}
          initial="hidden"
          animate="show"
          className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5"
        >
          {accountingModules.map((app) => {
            const Icon = app.icon;
            return (
              <motion.div key={app.name} variants={item as any} className="w-full">
                <Link
                  to={app.path}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50/90 border border-slate-200/85 hover:border-violet-400/80 shadow-2xs hover:shadow-md hover:shadow-violet-500/5 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer h-full select-none"
                >
                  <div
                    className={`relative w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${app.gradient} shadow-sm ${app.shadow} group-hover:scale-105 transition-transform duration-150 ease-out shrink-0`}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 mix-blend-overlay" />
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className="text-white relative z-10"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-slate-800 group-hover:text-violet-600 transition-colors leading-snug">
                      {app.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500 font-medium leading-snug line-clamp-2">
                      {app.description}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="z-10 shrink-0 pt-4 mt-5 border-t border-slate-100 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-violet-500" />
        <span>TP PAGOS PRO • Gestión Contable &amp; Financiera</span>
      </div>
    </div>
  );
}
