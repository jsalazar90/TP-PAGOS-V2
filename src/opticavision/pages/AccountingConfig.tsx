import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Lock, CheckCircle2, AlertCircle, ArrowLeft, BookOpen, 
  Settings as SettingsIcon, TrendingUp, TrendingDown, Scale, 
  Calendar, Check, ShieldCheck, RefreshCw, FileText
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { dbSaveConfiguracionContable } from '../services/db';
import BackButton from '../components/common/BackButton';

interface AccountingConfigProps {
  configContable: any;
  cuentasContables: any[];
  comprobantes?: any[];
  onSave: (collection: string, item: any) => void;
  showToast: (msg: string, type: string) => void;
}

export default function AccountingConfig({ 
  configContable, 
  cuentasContables, 
  comprobantes = [], 
  onSave, 
  showToast 
}: AccountingConfigProps) {
  const { workingYear, setWorkingYear, activeCompanyId } = useCompany();
  const config = configContable || {};

  const [showClosureReview, setShowClosureReview] = useState(false);
  const [closureLines, setClosureLines] = useState<any[]>([]);
  const [closureTotalIngresos, setClosureTotalIngresos] = useState(0);
  const [closureTotalEgresos, setClosureTotalEgresos] = useState(0);
  const [closureNetResult, setClosureNetResult] = useState(0);
  const [isExecutingClosure, setIsExecutingClosure] = useState(false);

  // Calcular cuentas nominales y saldos en el período activo
  const nominalSummary = useMemo(() => {
    const startDate = `${workingYear}-01-01`;
    const endDate = `${workingYear}-12-31`;

    // Cuentas de tipo Movimiento pertenecientes a Ingresos, Costos o Gastos (4, 5, 6)
    const nominalAccounts = cuentasContables.filter(c => 
      (c.tipo === 'Movimiento' || !c.tipo) && 
      (
        c.codigo?.startsWith('4') || 
        c.codigo?.startsWith('5') || 
        c.codigo?.startsWith('6') ||
        ['Ingresos', 'Ingreso', 'Egresos', 'Egreso', 'Gastos', 'Gasto', 'Costos', 'Costo'].includes(c.grupo)
      )
    );

    let sumIngresos = 0;
    let sumEgresos = 0;
    const accountBalances: Array<{
      cuenta: any;
      saldo: number;
      isIncome: boolean;
      debeCierre: number;
      haberCierre: number;
    }> = [];

    nominalAccounts.forEach(c => {
      let debe = 0;
      let haber = 0;

      // Calcular a partir de comprobantes contabilizados del año
      comprobantes.forEach(comp => {
        if (comp.estado !== 'Anulado' && comp.fecha >= startDate && comp.fecha <= endDate && Array.isArray(comp.lineas)) {
          comp.lineas.forEach((l: any) => {
            if (l.cuentaId === c.id || l.cuentaId === c.codigo) {
              debe += Number(l.debe || 0);
              haber += Number(l.haber || 0);
            }
          });
        }
      });

      const isIncome = c.codigo?.startsWith('4') || ['Ingresos', 'Ingreso'].includes(c.grupo);
      const saldo = isIncome ? (haber - debe) : (debe - haber);

      if (Math.abs(saldo) > 0.009) {
        if (isIncome) {
          sumIngresos += saldo;
          accountBalances.push({
            cuenta: c,
            saldo,
            isIncome: true,
            debeCierre: saldo > 0 ? saldo : 0,
            haberCierre: saldo < 0 ? Math.abs(saldo) : 0
          });
        } else {
          sumEgresos += saldo;
          accountBalances.push({
            cuenta: c,
            saldo,
            isIncome: false,
            debeCierre: saldo < 0 ? Math.abs(saldo) : 0,
            haberCierre: saldo > 0 ? saldo : 0
          });
        }
      }
    });

    return {
      sumIngresos,
      sumEgresos,
      netResult: sumIngresos - sumEgresos,
      accountBalances
    };
  }, [workingYear, cuentasContables, comprobantes]);

  const cuentaDestinoPatrimonial = useMemo(() => {
    const destId = config.cuentaUtilidadAnteriores;
    return cuentasContables.find(c => c.id === destId || c.codigo === destId);
  }, [config.cuentaUtilidadAnteriores, cuentasContables]);

  const prepareClosure = () => {
    if (!config.cuentaUtilidadAnteriores) {
      showToast('Debe configurar la "Cuenta de Utilidad/Pérdida de Ejercicios Anteriores" en Configuración del Sistema antes de cerrar el período.', 'error');
      return;
    }

    if (nominalSummary.accountBalances.length === 0) {
      showToast(`No existen saldos pendientes por liquidar en las cuentas nominales para el período fiscal ${workingYear}.`, 'info');
      return;
    }

    const lines: any[] = [];
    let sumDebe = 0;
    let sumHaber = 0;

    nominalSummary.accountBalances.forEach(item => {
      lines.push({
        id: `line-cierre-${item.cuenta.id}`,
        cuentaId: item.cuenta.id,
        descripcion: `Liquidación saldo ${item.cuenta.nombre} - Cierre fiscal ${workingYear}`,
        debe: item.debeCierre,
        haber: item.haberCierre
      });
      sumDebe += item.debeCierre;
      sumHaber += item.haberCierre;
    });

    // Contrapartida patrimonial
    const diff = sumDebe - sumHaber;
    const isProfit = diff > 0;
    const balancingAmount = Math.abs(diff);

    if (balancingAmount > 0.009) {
      lines.push({
        id: `line-utilidad-cierre`,
        cuentaId: config.cuentaUtilidadAnteriores,
        descripcion: isProfit 
          ? `Cierre período ${workingYear} - Utilidad del Ejercicio traspasada a Resultados Acumulados`
          : `Cierre período ${workingYear} - Pérdida del Ejercicio traspasada a Resultados Acumulados`,
        debe: isProfit ? 0 : Number(balancingAmount.toFixed(2)),
        haber: isProfit ? Number(balancingAmount.toFixed(2)) : 0
      });

      if (isProfit) sumHaber += balancingAmount;
      else sumDebe += balancingAmount;
    }

    setClosureLines(lines);
    setClosureTotalIngresos(nominalSummary.sumIngresos);
    setClosureTotalEgresos(nominalSummary.sumEgresos);
    setClosureNetResult(nominalSummary.netResult);
    setShowClosureReview(true);
  };

  const executeClosure = async () => {
    if (isExecutingClosure) return;
    setIsExecutingClosure(true);

    try {
      const closingEntry = {
        id: crypto.randomUUID(),
        fecha: `${workingYear}-12-31`,
        numero: `CIERRE-${workingYear}`,
        tipo: 'Diario',
        descripcion: `ASIENTO DE CIERRE CONTABLE ANUAL - NOMINALES PERÍODO FISCAL ${workingYear}`,
        referencia: `Cierre anual automatizado NIIF`,
        total: Number(closureLines.reduce((acc, l) => acc + (l.debe || 0), 0).toFixed(2)),
        estado: 'Contabilizado',
        lineas: closureLines.map(l => ({
          ...l,
          id: crypto.randomUUID()
        }))
      };

      if (onSave) {
        await onSave('comprobantes', closingEntry);
      }

      const closedYear = workingYear;
      const nextYear = String(parseInt(closedYear, 10) + 1);

      if (activeCompanyId) {
        await dbSaveConfiguracionContable({ ...config, workingYear: nextYear }, activeCompanyId);
      }

      setWorkingYear(nextYear);
      showToast(
        `¡Cierre fiscal del año ${closedYear} contabilizado con éxito en PostgreSQL! Se ha aperturado el nuevo ejercicio fiscal ${nextYear}.`,
        'success'
      );
      setShowClosureReview(false);
    } catch (error: any) {
      console.error('[AccountingConfig] Error ejecutando cierre anual:', error);
      showToast(
        error?.message || 'Error al registrar el asiento de cierre anual en PostgreSQL.',
        'error'
      );
    } finally {
      setIsExecutingClosure(false);
    }
  };

  return (
    <div className="px-1 sm:px-6 pt-1 pb-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Top Breadcrumb & Status */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <BackButton to="/accounting" label="Volver a Contabilidad" />
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ejercicio Fiscal Activo: {workingYear}</span>
        </span>
      </div>

      {/* Main Header Toolbar */}
      <div className="mb-5 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            Cierre de Ejercicio Fiscal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Liquidación de cuentas nominales, determinación del resultado neto y traspaso patrimonial
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={prepareClosure}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 h-10 px-5 cursor-pointer active:scale-95"
          >
            <Lock size={15} /> 
            <span>Ejecutar Cierre del Año {workingYear}</span>
          </button>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5 sm:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 font-medium leading-relaxed">
            <span className="font-bold text-slate-900">¿Cómo funciona el Cierre Fiscal NIIF?</span> Al ejecutar el cierre, el sistema calcula los saldos acumulados de todas las cuentas de Ingresos, Costos y Gastos del año <strong className="text-slate-900">{workingYear}</strong>, saldándolas a cero y transfiriendo el Resultado Neto a la cuenta de <strong className="text-slate-900">Utilidad/Pérdida de Ejercicios Anteriores</strong>.
          </div>
        </div>
        <Link 
          to="/accounting/config"
          className="shrink-0 w-full sm:w-auto justify-center text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 sm:py-1.5 rounded-xl border border-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <SettingsIcon size={13} />
          <span>Ajustes en Configuración Global</span>
        </Link>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-8">
        {/* Total Ingresos */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Ingresos</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={13} />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 font-mono truncate">
            ${nominalSummary.sumIngresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 hidden sm:block">Saldos acreedores del ejercicio</span>
        </div>

        {/* Total Gastos & Costos */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Egresos</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown size={13} />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 font-mono truncate">
            ${nominalSummary.sumEgresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-rose-600 font-bold mt-1 hidden sm:block">Saldos deudores del ejercicio</span>
        </div>

        {/* Resultado Neto */}
        <div className={`p-3.5 sm:p-5 rounded-2xl border shadow-xs ${
          nominalSummary.netResult >= 0 
            ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950' 
            : 'bg-rose-50/50 border-rose-200/80 text-rose-950'
        }`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider opacity-70">Resultado Neto</span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
              nominalSummary.netResult >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <Scale size={13} />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black font-mono truncate">
            ${Math.abs(nominalSummary.netResult).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-1 block">
            {nominalSummary.netResult >= 0 ? '🟢 Utilidad Neta' : '🔴 Pérdida Neta'}
          </span>
        </div>

        {/* Cuenta de Traspaso */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Cuenta Destino</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={13} />
            </div>
          </div>
          {cuentaDestinoPatrimonial ? (
            <div>
              <span className="font-mono text-[11px] sm:text-xs font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block mb-1">
                {cuentaDestinoPatrimonial.codigo}
              </span>
              <span className="text-[11px] sm:text-xs font-black text-slate-800 truncate block" title={cuentaDestinoPatrimonial.nombre}>
                {cuentaDestinoPatrimonial.nombre}
              </span>
            </div>
          ) : (
            <span className="text-xs font-bold text-rose-500">No asignada</span>
          )}
        </div>
      </div>

      {/* Tabla de Cuentas Nominales a Liquidar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900">Cuentas Nominales del Período {workingYear}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Saldos pendientes de cancelación al cierre anual.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {nominalSummary.accountBalances.length} cuentas con movimiento
          </span>
        </div>

        {nominalSummary.accountBalances.length > 0 ? (
          <>
            {/* Mobile Nominal Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {nominalSummary.accountBalances.map((item, idx) => (
                <div key={item.cuenta.id || idx} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                        {item.cuenta.codigo}
                      </span>
                      <span className="font-black text-xs text-slate-800 truncate">{item.cuenta.nombre}</span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {item.isIncome ? 'Ingreso' : 'Egreso'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Saldo</span>
                      <span className="font-bold text-slate-900">${Math.abs(item.saldo).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Debe Cierre</span>
                      <span className="font-bold text-emerald-600">{item.debeCierre > 0 ? `$${item.debeCierre.toFixed(2)}` : '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Haber Cierre</span>
                      <span className="font-bold text-rose-600">{item.haberCierre > 0 ? `$${item.haberCierre.toFixed(2)}` : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Nominal Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Código & Cuenta</th>
                    <th className="py-3 px-4">Tipo / Naturaleza</th>
                    <th className="py-3 px-4 text-right">Saldo Acumulado</th>
                    <th className="py-3 px-4 text-right">Debe (Cierre)</th>
                    <th className="py-3 px-5 text-right">Haber (Cierre)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {nominalSummary.accountBalances.map((item, idx) => (
                    <tr key={item.cuenta.id || idx} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {item.cuenta.codigo}
                          </span>
                          <span className="font-black text-slate-800">{item.cuenta.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {item.isIncome ? 'Ingreso (Acreedora)' : 'Egreso / Costo (Deudora)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${Math.abs(item.saldo).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {item.debeCierre > 0 ? `$${item.debeCierre.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-rose-600">
                        {item.haberCierre > 0 ? `$${item.haberCierre.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 sm:p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-slate-600">No hay cuentas nominales pendientes por cerrar</p>
            <p className="text-[11px] text-slate-400 mt-0.5">El ejercicio fiscal {workingYear} se encuentra liquidado o no tiene movimientos asentados.</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmación y Previsualización del Asiento */}
      {showClosureReview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2.5 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">Previsualización del Asiento de Cierre Anual</h3>
                  <p className="text-xs text-slate-500 font-medium">Comprobante de Diario: CIERRE-{workingYear}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
              {/* Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Ingresos</span>
                  <span className="text-base font-black text-emerald-900">${closureTotalIngresos.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Gastos & Costos</span>
                  <span className="text-base font-black text-rose-900">${closureTotalEgresos.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">Resultado Neto</span>
                  <span className="text-base font-black text-indigo-900">${Math.abs(closureNetResult).toFixed(2)}</span>
                </div>
              </div>

              {/* Detalle de Líneas */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full min-w-[540px] text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500">
                      <th className="py-2.5 px-4">Cuenta</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-right">Debe</th>
                      <th className="py-2.5 px-4 text-right">Haber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {closureLines.map((l, idx) => {
                      const acc = cuentasContables.find(c => c.id === l.cuentaId || c.codigo === l.cuentaId);
                      return (
                        <tr key={l.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {acc?.codigo || l.cuentaId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 truncate max-w-[220px]">
                            {l.descripcion}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                            {l.debe > 0 ? `$${l.debe.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            {l.haber > 0 ? `$${l.haber.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Al confirmar el cierre, se registrará el comprobante <strong className="font-mono">CIERRE-{workingYear}</strong> con fecha 31/12/{workingYear} y el sistema avanzará automáticamente al ejercicio <strong className="font-bold">{parseInt(workingYear) + 1}</strong>.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setShowClosureReview(false)}
                disabled={isExecutingClosure}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={executeClosure}
                disabled={isExecutingClosure}
                className="w-full sm:w-auto justify-center px-5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Check size={14} />
                <span>{isExecutingClosure ? 'Contabilizando Cierre...' : 'Confirmar y Asentar Cierre'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
