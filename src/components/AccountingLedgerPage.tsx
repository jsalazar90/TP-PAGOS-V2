import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Landmark, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface AccountingLedgerPageProps {
  globalSearch?: string;
}

const mainModules = [
  {
    name: 'Tesorería',
    tag: 'Bancos & Cajas',
    description:
      'Gestión de cuentas bancarias, cajas de efectivo, saldos, mayor analítico, movimientos, traspasos y ajustes cambiarios SAPS.',
    icon: Landmark,
    gradient: 'from-sky-500 to-blue-700',
    shadow: 'shadow-sky-500/20',
    hoverBorder: 'hover:border-sky-400 hover:shadow-sky-500/10',
    hoverText: 'group-hover:text-sky-600',
    path: '/banks/cuentas'
  },
  {
    name: 'Contabilidad',
    tag: 'Finanzas & Libros NIIF',
    description:
      'Plan de cuentas NIIF, comprobantes de diario, situación financiera, activos fijos y cierre fiscal.',
    icon: FileSpreadsheet,
    gradient: 'from-violet-600 to-purple-600',
    shadow: 'shadow-violet-500/20',
    hoverBorder: 'hover:border-violet-400 hover:shadow-violet-500/10',
    hoverText: 'group-hover:text-violet-600',
    path: '/accounting'
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 25 }
  }
};

export const AccountingLedgerPage: React.FC<AccountingLedgerPageProps> = () => {
  return (
    <div className="w-full min-h-[calc(100vh-2.5rem)] relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-3xl border border-slate-200/80 shadow-2xs">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full z-10 space-y-5">
        {/* Cabecera alineada a la izquierda ocupando todo el ancho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
          <div>
            <span className="badge-modern-neutral mb-1.5">
              Módulo Financiero &amp; Contable
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cuentas &amp; Mayor
            </h1>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Selecciona el módulo al que deseas ingresar: Tesorería o Contabilidad
            </p>
          </div>
        </div>

        {/* Módulos compactos alineados a la izquierda */}
        <motion.div
          variants={container as any}
          initial="hidden"
          animate="show"
          className="flex flex-wrap items-stretch gap-3.5"
        >
          {mainModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.name}
                variants={item as any}
                className="w-full sm:w-[250px]"
              >
                <Link
                  to={mod.path}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className={`group flex flex-col justify-between h-full p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 ${mod.hoverBorder} shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${mod.gradient} shadow-md ${mod.shadow} group-hover:scale-105 transition-all duration-200 ease-out shrink-0`}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 mix-blend-overlay" />
                      <Icon
                        size={20}
                        strokeWidth={2}
                        className="text-white relative z-10"
                      />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                      {mod.tag}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h2
                      className={`text-base font-black text-slate-900 ${mod.hoverText} transition-colors leading-tight`}
                    >
                      {mod.name}
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium leading-snug line-clamp-2">
                      {mod.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                    <span>Ingresar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="z-10 shrink-0 pt-6 text-[11px] font-semibold text-slate-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-500" />
        <span className="w-2 h-2 rounded-full bg-violet-500" />
        <span>TP PAGOS PRO • Tesorería &amp; Contabilidad General</span>
      </div>
    </div>
  );
};
