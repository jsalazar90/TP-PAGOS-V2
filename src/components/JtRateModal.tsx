import React, { useState, useEffect, useMemo } from 'react';
import { JtRate } from '../types';
import { formatSpanishNumber, roundToDecimals } from '../services/dataService';
import {
  X,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  TrendingUp,
  History,
  AlertCircle
} from 'lucide-react';

interface JtRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  jtRates: JtRate[];
  onSaveRate: (dateStr: string, rate: number) => Promise<void>;
}

export const JtRateModal: React.FC<JtRateModalProps> = ({
  isOpen,
  onClose,
  jtRates,
  onSaveRate
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [rateInput, setRateInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Buscar si ya existe tasa para la fecha seleccionada
  const existingRateForDate = useMemo(() => {
    return jtRates.find(r => r.rate_date === selectedDate) || null;
  }, [jtRates, selectedDate]);

  // Al abrir o cambiar fecha, auto-completar el input si ya existe una tasa
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setShowConfirmUpdate(false);
      if (existingRateForDate) {
        setRateInput(existingRateForDate.rate.toString());
      } else {
        if (!rateInput) {
          setRateInput('');
        }
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate);
    const existing = jtRates.find(r => r.rate_date === newDate);
    if (existing) {
      setRateInput(existing.rate.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedRate = roundToDecimals(parseFloat(rateInput.replace(',', '.')), 2);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setErrorMessage('Por favor ingresa un monto de tasa JT válido y mayor a cero.');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('Por favor selecciona una fecha válida.');
      return;
    }

    // Si ya existe tasa para esta fecha, pedir confirmación explícita
    if (existingRateForDate) {
      setShowConfirmUpdate(true);
      return;
    }

    // Si es nueva tasa, guardar directo
    executeSave(parsedRate);
  };

  const executeSave = async (rateToSave: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSaveRate(selectedDate, rateToSave);
      setShowConfirmUpdate(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la tasa JT.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Gestión de Tasa JT</h2>
              <p className="text-xs text-blue-200/80">Configura la tasa de cambio real para el reporte de diferencial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active-press transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulario de Registro / Actualización */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>{existingRateForDate ? 'Actualizar Tasa Existente' : 'Registrar Nueva Tasa JT'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Selector de Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Fecha de la Tasa JT
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={e => handleSelectDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Monto de la Tasa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  Tasa JT (Bs. por USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Bs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ej. 80.00"
                    required
                    value={rateInput}
                    onChange={e => setRateInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Aviso en tiempo real si ya existe una tasa */}
            {existingRateForDate && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Aviso:</span> Ya existe una tasa registrada para este día:
                  <strong className="ml-1 text-slate-900">Bs. {formatSpanishNumber(existingRateForDate.rate, 2)}</strong>.
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Al presionar guardar se actualizará el valor para todos los cálculos de esta fecha.
                  </p>
                </div>
              </div>
            )}

            {/* Botón Guardar */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active-press disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{existingRateForDate ? 'Actualizar Tasa JT' : 'Guardar Tasa JT'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Historial de Tasas Registradas */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Historial de Tasas JT Registradas ({jtRates.length})</span>
              </h3>
            </div>

            {jtRates.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No hay tasas JT registradas aún. Ingresa la primera tasa arriba.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5">Fecha</th>
                        <th className="px-3.5 py-2.5 text-right">Tasa JT (Bs.)</th>
                        <th className="px-3.5 py-2.5 hidden sm:table-cell">Registrado Por</th>
                        <th className="px-3.5 py-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jtRates.map(rateItem => {
                        const isSelected = rateItem.rate_date === selectedDate;
                        const dateFormatted = new Date(`${rateItem.rate_date}T12:00:00`).toLocaleDateString('es-VE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });

                        return (
                          <tr
                            key={rateItem.id || rateItem.rate_date}
                            className={`hover:bg-blue-50/50 transition-colors ${
                              isSelected ? 'bg-blue-50/70 font-semibold text-blue-900' : 'text-slate-700'
                            }`}
                          >
                            <td className="px-3.5 py-2.5">
                              <span className="font-medium">{dateFormatted}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">{rateItem.rate_date}</span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                              Bs. {formatSpanishNumber(rateItem.rate, 2)}
                            </td>
                            <td className="px-3.5 py-2.5 hidden sm:table-cell text-slate-500 text-[11px]">
                              {rateItem.created_by || 'Admin'}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectDate(rateItem.rate_date)}
                                className="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-100 active-press text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                title="Seleccionar para editar"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active-press text-slate-700 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Confirmación de Actualización (cuando la tasa ya existe) */}
      {showConfirmUpdate && existingRateForDate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">¿Deseas actualizar la tasa?</h4>
                <p className="text-xs text-slate-500">Ya para este día existe una tasa registrada</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span className="font-bold text-slate-800">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tasa anterior:</span>
                <span className="font-semibold text-slate-600">Bs. {formatSpanishNumber(existingRateForDate.rate, 2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-700 font-semibold">Nueva tasa:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  Bs. {formatSpanishNumber(parseFloat(rateInput.replace(',', '.')), 2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Al confirmar, todas las solicitudes liquidadas o reportadas para esta fecha recalcularán su diferencial con este nuevo valor.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmUpdate(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active-press text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeSave(roundToDecimals(parseFloat(rateInput.replace(',', '.')), 2))}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active-press disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Actualizando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sí, Actualizar Tasa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
