import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  Hash,
  AlignLeft,
  Layers,
  Edit2,
  Trash2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import BackButton from "../components/common/BackButton";
import {
  validateChartAccount,
  canDeleteChartAccount,
} from "../utils/accountValidation";

const ITEMS_PER_PAGE = 15;

export const AREAS_FLUJO = [
  { id: "cobranzas", nombre: "1. Ingresos por Cobranzas (+)" },
  { id: "recibidos", nombre: "2. Ingresos por Préstamos Recibidos (+)" },
  { id: "gastos_er", nombre: "3. Gastos Pagados (Estado de Resultado) (-)" },
  { id: "proveedores_real", nombre: "4. Pagos a Proveedores / Cuentas por Pagar (Cuentas Reales) (-)" },
  { id: "prestamos_ot", nombre: "5. Préstamos Otorgados (-)" },
  { id: "seniat", nombre: "6. Pagos Realizados Cajas SENIAT / Tributos (-)" },
  { id: "directivos", nombre: "7. Pagos a Directivos / Socios (-)" },
  { id: "traspasos", nombre: "8. Traspasos Internos (+/-)" },
];

export default function ChartOfAccounts({
  cuentasContables = [],
  onSave,
  showToast,
}: {
  cuentasContables?: any[];
  onSave?: any;
  showToast?: any;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    tipo: "Movimiento",
    naturaleza: "Deudora",
    grupo: "Activo",
    areaFlujoCaja: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  const filteredAccounts = cuentasContables
    .filter((cuenta) => {
      const matchesSearch =
        (cuenta.codigo || "")
          .toLowerCase()
          .includes((searchQuery || "").toLowerCase()) ||
        (cuenta.nombre || "")
          .toLowerCase()
          .includes((searchQuery || "").toLowerCase());

      const matchesFilter = filterType === "all" || cuenta.tipo === filterType;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) =>
      (a.codigo || "").localeCompare(b.codigo || "", undefined, {
        numeric: true,
      }),
    );

  const validation = useMemo(
    () => validateChartAccount(form, cuentasContables, editingId),
    [form, cuentasContables, editingId],
  );

  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleOpenModal = (cuenta?: any) => {
    setHasAttemptedSubmit(false);
    if (cuenta) {
      setEditingId(cuenta.id);
      setForm({
        codigo: cuenta.codigo || "",
        nombre: cuenta.nombre || "",
        tipo: cuenta.tipo || "Movimiento",
        naturaleza: cuenta.naturaleza || "Deudora",
        grupo: cuenta.grupo || "Activo",
        areaFlujoCaja: cuenta.areaFlujoCaja || "",
      });
    } else {
      setEditingId(null);
      setForm({
        codigo: "",
        nombre: "",
        tipo: "Movimiento",
        naturaleza: "Deudora",
        grupo: "Activo",
        areaFlujoCaja: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setHasAttemptedSubmit(false);
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);

    if (!validation.isValid) {
      showToast?.(validation.summaryMessage, "error");
      return;
    }

    const newAccount = {
      id: editingId || crypto.randomUUID(),
      ...form,
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      nivel: validation.level,
    };

    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave("cuentasContables", newAccount);
      }
      showToast?.(
        `Cuenta "${newAccount.codigo} - ${newAccount.nombre}" ${editingId ? "actualizada" : "creada"} exitosamente`,
        "success",
      );
      handleCloseModal();
    } catch (error: any) {
      console.error("[ChartOfAccounts] Error al guardar cuenta:", error);
      showToast?.(
        error?.message || "No se pudo guardar la cuenta contable en la base de datos.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (cuenta: any) => {
    if (deletingId) return;
    const delCheck = canDeleteChartAccount(cuenta, cuentasContables);
    if (!delCheck.allowed) {
      showToast?.(
        delCheck.reason || "No se puede eliminar una cuenta con subcuentas.",
        "error",
      );
      return;
    }
    if (
      !window.confirm(
        `¿Está seguro de eliminar permanentemente la cuenta contable "${cuenta.codigo} - ${cuenta.nombre}"?`,
      )
    ) {
      return;
    }
    setDeletingId(cuenta.id);
    try {
      if (onSave) {
        await onSave("cuentasContables", { id: cuenta.id, _delete: true });
      }
      showToast?.("Cuenta contable eliminada exitosamente.", "success");
    } catch (error: any) {
      console.error("[ChartOfAccounts] Error al eliminar cuenta:", error);
      showToast?.(
        error?.message || "No se pudo eliminar la cuenta contable.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-6 lg:px-8 pt-1 pb-6">
      {/* Header */}
      <div className="mb-3.5">
        <div className="mb-2.5">
          <BackButton to="/accounting" label="Volver a Contabilidad" />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Cuentas Contables
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
              Gestiona el plan de cuentas de tu empresa
            </p>
          </div>
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
            <Link
              to="/accounting/config?tab=import"
              className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Upload size={15} />
              <span>Carga Masiva</span>
            </Link>
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus size={16} />
              <span>Nueva Cuenta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${filterType === "all" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterType("Título General")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${filterType === "Título General" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            Títulos Generales
          </button>
          <button
            onClick={() => setFilterType("Título de Cuenta Movimiento")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${filterType === "Título de Cuenta Movimiento" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            Títulos Movimiento
          </button>
          <button
            onClick={() => setFilterType("Movimiento")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none whitespace-nowrap cursor-pointer ${filterType === "Movimiento" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700"}`}
          >
            De Movimiento
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por código o nombre..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile Cards View (< md) */}
        <div className="md:hidden divide-y divide-slate-100 bg-white">
          {paginatedAccounts.map((cuenta) => {
            const flowName = cuenta.areaFlujoCaja
              ? AREAS_FLUJO.find((a) => a.id === cuenta.areaFlujoCaja)?.nombre ||
                cuenta.areaFlujoCaja
              : null;
            return (
              <div key={cuenta.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-xs">
                      <Hash className="w-3 h-3 text-indigo-400" />
                      {cuenta.codigo}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        cuenta.tipo === "Título General"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : cuenta.tipo === "Título de Cuenta Movimiento"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {cuenta.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(cuenta)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                      title="Editar cuenta"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(cuenta)}
                      disabled={deletingId === cuenta.id}
                      className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200/80 transition-colors cursor-pointer disabled:opacity-50"
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p
                  className={`leading-snug ${
                    cuenta.tipo === "Título General"
                      ? "text-slate-900 font-black text-sm"
                      : cuenta.tipo === "Título de Cuenta Movimiento"
                        ? "text-slate-800 font-bold text-xs"
                        : "text-slate-700 font-semibold text-xs"
                  }`}
                >
                  {cuenta.nombre}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>
                    Naturaleza: <strong className="text-slate-700">{cuenta.naturaleza || "Deudora"}</strong>
                  </span>
                  {flowName && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {flowName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {paginatedAccounts.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
              <p className="text-base font-bold text-slate-900 mb-1">
                No se encontraron cuentas
              </p>
              <p className="text-xs">Ajusta los filtros o intenta con otra búsqueda.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider select-none">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre de la Cuenta</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Naturaleza</th>
                <th className="px-4 py-3">Mapeo Flujo de Caja</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedAccounts.map((cuenta) => (
                <tr
                  key={cuenta.id}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-slate-700 text-xs">
                        {cuenta.codigo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`font-semibold ${cuenta.tipo === "Título General" ? "text-slate-900 font-black text-sm" : cuenta.tipo === "Título de Cuenta Movimiento" ? "text-slate-800 font-bold text-xs pl-3" : "text-slate-600 text-xs pl-6"}`}
                    >
                      {cuenta.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        cuenta.tipo === "Título General"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : cuenta.tipo === "Título de Cuenta Movimiento"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {cuenta.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs font-medium">
                    {cuenta.naturaleza || "Deudora"}
                  </td>
                  <td className="px-4 py-2.5">
                    {cuenta.areaFlujoCaja ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {AREAS_FLUJO.find(a => a.id === cuenta.areaFlujoCaja)?.nombre || cuenta.areaFlujoCaja}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Automático</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(cuenta)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar cuenta"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(cuenta)}
                        disabled={deletingId === cuenta.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedAccounts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-slate-900 mb-1">
                      No se encontraron cuentas
                    </p>
                    <p>Ajusta los filtros o intenta con otra búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50">
            <span className="text-xs sm:text-sm text-slate-500">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                filteredAccounts.length,
              )}{" "}
              de {filteredAccounts.length} cuentas
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-200 bg-white rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center p-1"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 mx-2">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Página {currentPage}
                </span>
                <span className="text-xs sm:text-sm text-slate-500">
                  de {totalPages}
                </span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-200 bg-white rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center p-1"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nueva/Editar Cuenta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Editar Cuenta" : "Nueva Cuenta Contable"}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Código de Cuenta *
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
                      (hasAttemptedSubmit || form.codigo.trim().length > 0) &&
                      validation.errors.some((err) => err.field === "codigo")
                        ? "bg-rose-50/40 border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        : "bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                    placeholder={
                      form.tipo === "Título General"
                        ? "Ej. 6"
                        : form.tipo === "Título de Cuenta Movimiento"
                          ? "Ej. 1.1.02"
                          : `Ej. ${validation.maskExample}`
                    }
                    value={form.codigo}
                    onChange={(e) =>
                      setForm({ ...form, codigo: e.target.value })
                    }
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Estructura NIIF: 1 (Título General) → 1.1 / 1.1.01 (Título Movimiento) →{" "}
                    {validation.maskExample} (Movimiento)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nombre de la Cuenta *
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                      hasAttemptedSubmit &&
                      validation.errors.some((err) => err.field === "nombre")
                        ? "bg-rose-50/40 border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        : "bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                    placeholder="Ej. Banco Nacional"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tipo
                    </label>
                    <select
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                        (hasAttemptedSubmit || form.codigo.trim().length > 0) &&
                        validation.errors.some((err) => err.field === "tipo")
                          ? "bg-rose-50/40 border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                          : "bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                      }`}
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                    >
                      <option value="Título General">Título General</option>
                      <option value="Título de Cuenta Movimiento">
                        Título de Cuenta Movimiento
                      </option>
                      <option value="Movimiento">Cuenta de Movimiento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Naturaleza
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.naturaleza}
                      onChange={(e) =>
                        setForm({ ...form, naturaleza: e.target.value })
                      }
                    >
                      <option value="Deudora">Deudora</option>
                      <option value="Acreedora">Acreedora</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Grupo
                  </label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                      (hasAttemptedSubmit || form.codigo.trim().length > 0) &&
                      validation.errors.some((err) => err.field === "grupo")
                        ? "bg-rose-50/40 border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        : "bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                    value={form.grupo}
                    onChange={(e) =>
                      setForm({ ...form, grupo: e.target.value })
                    }
                  >
                    <option value="Activo">Activo</option>
                    <option value="Pasivo">Pasivo</option>
                    <option value="Patrimonio">Patrimonio</option>
                    <option value="Ingresos">Ingresos</option>
                    <option value="Egresos">Egresos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Área del Flujo de Caja (Mapeo Manual)
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={form.areaFlujoCaja}
                    onChange={(e) =>
                      setForm({ ...form, areaFlujoCaja: e.target.value })
                    }
                  >
                    <option value="">-- Automático (Clasificación por Código) --</option>
                    {AREAS_FLUJO.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Selecciona un área específica para anular la detección automática y forzar este movimiento al rubro indicado del Flujo de Caja.
                  </p>
                </div>

                {!validation.isValid &&
                  (hasAttemptedSubmit || form.codigo.trim().length > 0) && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-rose-900 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertCircle size={16} className="shrink-0 text-rose-600" />
                        <span>
                          No se puede {editingId ? "guardar" : "crear"} la cuenta (
                          {validation.errors.length}{" "}
                          {validation.errors.length === 1 ? "motivo" : "motivos"}):
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs pl-5 list-disc text-rose-800">
                        {validation.errors.map((err, idx) => (
                          <li key={`${err.field}-${idx}`}>
                            <span className="font-bold">{err.title}:</span>{" "}
                            <span>{err.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {validation.isValid && form.codigo.trim().length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-emerald-900 flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-emerald-600 mt-0.5"
                    />
                    <div className="text-xs leading-snug">
                      <p className="font-bold text-emerald-800">
                        Validación correcta (Nivel {validation.level})
                      </p>
                      <p className="text-emerald-700 mt-0.5">
                        {validation.parentAccount
                          ? `Depende de: ${validation.parentAccount.codigo} · ${validation.parentAccount.nombre} (${validation.parentAccount.tipo})`
                          : `Título General raíz del grupo ${form.grupo}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : editingId
                      ? "Guardar Cambios"
                      : "Crear Cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
