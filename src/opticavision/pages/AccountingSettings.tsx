import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { dbResetToFullDemoCuentas } from '../services/db';
import BackButton from '../components/common/BackButton';
import CuentaContableModal from '../components/common/CuentaContableModal';
import CuentaSelectorTrigger from '../components/common/CuentaSelectorTrigger';

interface AccountingSettingsProps {
  configContable: any;
  cuentasContables: any[];
  onSave: (collection: string, item: any) => Promise<void> | void;
  showToast: (msg: string, type?: string) => void;
}

interface ParsedAccountRow {
  rowNumber: number;
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: 'Título General' | 'Título de Cuenta Movimiento' | 'Movimiento';
  grupo: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Egresos';
  naturaleza: 'Deudora' | 'Acreedora';
  areaFlujoCaja?: string;
  saldo: number;
  saldoActual: number;
  isUpdate: boolean;
}

interface ModalSelectorState {
  field: string;
  title: string;
  subtitle: string;
  defaultGroup: string;
}

function stripAccents(val: string): string {
  return String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeaderKey(raw: string): string {
  return stripAccents(String(raw || '').toLowerCase()).replace(/[^a-z0-9]/g, '');
}

function normalizeAccountType(
  raw: string
): 'Título General' | 'Título de Cuenta Movimiento' | 'Movimiento' {
  const clean = stripAccents(String(raw || '').trim().toLowerCase());
  if (!clean) return 'Movimiento';
  if (
    clean.includes('titulo de cuenta') ||
    clean.includes('titulo movimiento') ||
    clean.includes('subtitulo') ||
    clean === 'grupo'
  ) {
    return 'Título de Cuenta Movimiento';
  }
  if (
    clean.includes('titulo general') ||
    clean === 'titulo' ||
    clean === 'encabezado'
  ) {
    return 'Título General';
  }
  return 'Movimiento';
}

function inferAccountGroup(
  codigo: string,
  rawGroup?: string
): 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Egresos' {
  const clean = stripAccents(String(rawGroup || '').trim().toLowerCase());
  if (clean.includes('activo')) return 'Activo';
  if (clean.includes('pasivo')) return 'Pasivo';
  if (clean.includes('patrimonio') || clean.includes('capital')) return 'Patrimonio';
  if (clean.includes('ingreso')) return 'Ingresos';
  if (
    clean.includes('egreso') ||
    clean.includes('gasto') ||
    clean.includes('costo')
  ) {
    return 'Egresos';
  }

  const firstChar = String(codigo || '').trim().charAt(0);
  if (firstChar === '2') return 'Pasivo';
  if (firstChar === '3') return 'Patrimonio';
  if (firstChar === '4') return 'Ingresos';
  if (firstChar === '5' || firstChar === '6') return 'Egresos';
  return 'Activo';
}

function inferAccountNature(
  grupo: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Egresos',
  rawNature?: string
): 'Deudora' | 'Acreedora' {
  const clean = stripAccents(String(rawNature || '').trim().toLowerCase());
  if (clean.startsWith('d') || clean.includes('deud')) return 'Deudora';
  if (clean.startsWith('a') || clean.startsWith('c') || clean.includes('acre')) {
    return 'Acreedora';
  }
  if (grupo === 'Pasivo' || grupo === 'Patrimonio' || grupo === 'Ingresos') {
    return 'Acreedora';
  }
  return 'Deudora';
}

function detectDelimiter(headerLine: string): string {
  const countChar = (ch: string) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < headerLine.length; i++) {
      const c = headerLine[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (!inQuotes && c === ch) count++;
    }
    return count;
  };
  const semicolons = countChar(';');
  const commas = countChar(',');
  const tabs = countChar('\t');
  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsvText(rawText: string): Record<string, any>[] {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter);
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitDelimitedLine(lines[i], delimiter);
    if (values.every((v) => v === '')) continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = values[idx] ?? '';
    });
    rows.push(obj);
  }
  return rows;
}

const SAMPLE_TEMPLATE_ROWS = [
  { codigo: '1', nombre: 'ACTIVO', tipo: 'Título General', naturaleza: 'Deudora', grupo: 'Activo', areaFlujoCaja: '' },
  { codigo: '1.1', nombre: 'Activo Corriente', tipo: 'Título de Cuenta Movimiento', naturaleza: 'Deudora', grupo: 'Activo', areaFlujoCaja: '' },
  { codigo: '1.1.01.001', nombre: 'Caja Principal USD', tipo: 'Movimiento', naturaleza: 'Deudora', grupo: 'Activo', areaFlujoCaja: '' },
  { codigo: '3.1.03.001', nombre: 'Utilidades Retenidas de Ejercicios Anteriores', tipo: 'Movimiento', naturaleza: 'Acreedora', grupo: 'Patrimonio', areaFlujoCaja: '' },
  { codigo: '4.1.01.001', nombre: 'Ingresos por Servicios Turísticos', tipo: 'Movimiento', naturaleza: 'Acreedora', grupo: 'Ingresos', areaFlujoCaja: 'cobranzas' },
  { codigo: '5.1.01.001', nombre: 'Costos Operativos de Boletos y Hoteles', tipo: 'Movimiento', naturaleza: 'Deudora', grupo: 'Egresos', areaFlujoCaja: 'proveedores_real' }
];

export default function AccountingSettings({
  configContable,
  cuentasContables = [],
  onSave,
  showToast
}: AccountingSettingsProps) {
  const { workingYear, setWorkingYear } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'import' ? 'import' : 'closing-config';
  const [activeTab, setActiveTab] = useState<'closing-config' | 'import'>(initialTab);

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab === 'import') {
      setActiveTab('import');
    } else if (paramTab === 'closing-config') {
      setActiveTab('closing-config');
    }
  }, [searchParams]);

  const switchTab = (tab: 'closing-config' | 'import') => {
    setActiveTab(tab);
    setSearchParams(tab === 'import' ? { tab: 'import' } : {});
  };

  // --- TAB 1: CONFIGURACIÓN DE CIERRE DE PERÍODO & CUENTAS ---
  const [form, setForm] = useState<any>(() => ({
    ...(configContable || {}),
    workingYear: String(configContable?.workingYear || workingYear || new Date().getFullYear())
  }));
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [modalSelector, setModalSelector] = useState<ModalSelectorState | null>(null);

  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      ...(configContable || {}),
      workingYear: String(configContable?.workingYear || workingYear || prev.workingYear || new Date().getFullYear())
    }));
  }, [configContable, workingYear]);

  const availableYears = useMemo(() => {
    const base = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const current = parseInt(String(form.workingYear || workingYear), 10);
    if (!Number.isNaN(current) && !base.includes(current)) {
      base.push(current);
      base.sort((a, b) => a - b);
    }
    return base;
  }, [form.workingYear, workingYear]);

  const mappedClosingAccount = useMemo(() => {
    const target = form.cuentaUtilidadAnteriores;
    if (!target) return null;
    return cuentasContables.find(
      (c) => String(c.id) === String(target) || String(c.codigo) === String(target)
    );
  }, [form.cuentaUtilidadAnteriores, cuentasContables]);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSavingConfig) return;
    setIsSavingConfig(true);
    try {
      const nextYear = String(form.workingYear || workingYear || new Date().getFullYear());
      const payload = { ...form, workingYear: nextYear };
      if (onSave) {
        await onSave('configuracionContable', payload);
      }
      setWorkingYear(nextYear);
      showToast('Configuración contable guardada con éxito.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar la configuración contable.', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // --- TAB 2: CARGA MASIVA DEL PLAN DE CUENTAS ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedAccountRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [previewSearch, setPreviewSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isResettingBase, setIsResettingBase] = useState(false);

  const existingByCode = useMemo(() => {
    const map = new Map<string, any>();
    cuentasContables.forEach((c) => {
      if (c?.codigo) map.set(String(c.codigo).trim().toLowerCase(), c);
    });
    return map;
  }, [cuentasContables]);

  const processRawRecords = (rawRows: Record<string, any>[], fileName: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dedupMap = new Map<string, ParsedAccountRow>();

    if (!rawRows || rawRows.length === 0) {
      setParsedRows([]);
      setParseErrors(['El archivo está vacío o no contiene filas de datos reconocibles.']);
      setParseWarnings([]);
      setUploadedFileName(fileName);
      return;
    }

    rawRows.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const normalizedEntries = new Map<string, any>();
      Object.keys(rawRow || {}).forEach((k) => {
        normalizedEntries.set(normalizeHeaderKey(k), rawRow[k]);
      });

      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          const val = normalizedEntries.get(k);
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
        return '';
      };

      const codigo = getVal('codigo', 'code', 'cod', 'nro', 'cuentacodigo', 'codigocuenta');
      const nombre = getVal('nombre', 'descripcion', 'cuenta', 'name', 'denominacion', 'nombrecuenta');

      if (!codigo && !nombre) return;
      if (!codigo) {
        errors.push(`Fila ${rowNum}: falta el código de la cuenta ("${nombre}").`);
        return;
      }
      if (!nombre) {
        errors.push(`Fila ${rowNum}: falta el nombre/descripción para el código "${codigo}".`);
        return;
      }

      const rawTipo = getVal('tipo', 'type', 'clase');
      const rawGrupo = getVal('grupo', 'group', 'rubro');
      const rawNaturaleza = getVal('naturaleza', 'nature', 'saldonormal');
      const rawFlujo = getVal('areaflujocaja', 'flujocaja', 'areaflujo');

      const tipo = normalizeAccountType(rawTipo);
      const grupo = inferAccountGroup(codigo, rawGrupo);
      const naturaleza = inferAccountNature(grupo, rawNaturaleza);
      const nivel = Math.max(1, codigo.split('.').filter(Boolean).length || 1);
      const existing = existingByCode.get(codigo.toLowerCase());

      if (dedupMap.has(codigo.toLowerCase())) {
        warnings.push(`Fila ${rowNum}: código "${codigo}" repetido en el archivo; se usará la última definición.`);
      }

      dedupMap.set(codigo.toLowerCase(), {
        rowNumber: rowNum,
        id: existing?.id ? String(existing.id) : codigo,
        codigo,
        nombre,
        nivel,
        tipo,
        grupo,
        naturaleza,
        ...(rawFlujo ? { areaFlujoCaja: rawFlujo } : existing?.areaFlujoCaja ? { areaFlujoCaja: existing.areaFlujoCaja } : {}),
        saldo: Number(existing?.saldo) || 0,
        saldoActual: Number(existing?.saldoActual) || 0,
        isUpdate: Boolean(existing)
      });
    });

    const sortedRows = Array.from(dedupMap.values()).sort((a, b) =>
      a.codigo.localeCompare(b.codigo)
    );

    setUploadedFileName(fileName);
    setParsedRows(sortedRows);
    setParseErrors(errors);
    setParseWarnings(warnings);
    setPreviewSearch('');

    if (sortedRows.length > 0) {
      showToast(`Se procesaron ${sortedRows.length} cuentas listas para revisar.`, 'success');
    } else {
      showToast('No se detectaron cuentas válidas en el archivo.', 'error');
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    try {
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          showToast('El libro de Excel no contiene hojas.', 'error');
          return;
        }
        const sheet = workbook.Sheets[firstSheet];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        processRawRecords(jsonRows, file.name);
      } else {
        const text = await file.text();
        const csvRows = parseCsvText(text);
        processRawRecords(csvRows, file.name);
      }
    } catch (err: any) {
      console.error('[AccountingSettings] Error leyendo archivo:', err);
      showToast(err?.message || 'Error al leer el archivo seleccionado.', 'error');
    }
  };

  const previewSummary = useMemo(() => {
    const newCount = parsedRows.filter((r) => !r.isUpdate).length;
    const updateCount = parsedRows.filter((r) => r.isUpdate).length;
    return {
      total: parsedRows.length,
      newCount,
      updateCount
    };
  }, [parsedRows]);

  const filteredPreviewRows = useMemo(() => {
    const q = previewSearch.trim().toLowerCase();
    const list = q
      ? parsedRows.filter(
          (r) =>
            r.codigo.toLowerCase().includes(q) ||
            r.nombre.toLowerCase().includes(q) ||
            r.grupo.toLowerCase().includes(q) ||
            r.tipo.toLowerCase().includes(q)
        )
      : parsedRows;
    return list.slice(0, 100);
  }, [parsedRows, previewSearch]);

  const handleConfirmImport = async () => {
    if (isImporting || parsedRows.length === 0) return;

    if (
      importMode === 'replace' &&
      !window.confirm(
        `¿Estás seguro de REEMPLAZAR todo el Plan de Cuentas actual (${cuentasContables.length} cuentas) por las ${parsedRows.length} cuentas importadas?`
      )
    ) {
      return;
    }

    setIsImporting(true);
    try {
      const cleanedImported = parsedRows.map(({ rowNumber: _r, isUpdate: _u, ...acc }) => acc);
      let finalAccounts: any[] = [];

      if (importMode === 'replace') {
        finalAccounts = cleanedImported;
      } else {
        const mergedMap = new Map<string, any>();
        cuentasContables.forEach((existing) => {
          if (existing?.codigo) {
            mergedMap.set(String(existing.codigo).trim().toLowerCase(), existing);
          }
        });
        cleanedImported.forEach((imp) => {
          const key = imp.codigo.trim().toLowerCase();
          const prev = mergedMap.get(key);
          mergedMap.set(key, prev ? { ...prev, ...imp, id: prev.id || imp.id } : imp);
        });
        finalAccounts = Array.from(mergedMap.values()).sort((a, b) =>
          String(a.codigo || '').localeCompare(String(b.codigo || ''))
        );
      }

      if (onSave) {
        await onSave('cuentasContables', {
          _bulk: true,
          replaceAll: importMode === 'replace',
          items: finalAccounts
        });
      }

      showToast(
        importMode === 'replace'
          ? `Plan de cuentas reemplazado exitosamente (${finalAccounts.length} cuentas activas).`
          : `Importación completada: ${previewSummary.newCount} nuevas y ${previewSummary.updateCount} actualizadas.`,
        'success'
      );
      setParsedRows([]);
      setParseErrors([]);
      setParseWarnings([]);
      setUploadedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast(err?.message || 'Error al importar el plan de cuentas.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplateExcel = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan_Cuentas');
    XLSX.writeFile(wb, 'Plantilla_Plan_Cuentas_NIIF.xlsx');
    showToast('Plantilla Excel descargada.', 'success');
  };

  const handleDownloadTemplateCsv = () => {
    const headers = ['codigo', 'nombre', 'tipo', 'naturaleza', 'grupo', 'areaFlujoCaja'];
    const lines = [
      headers.join(','),
      ...SAMPLE_TEMPLATE_ROWS.map((r) =>
        [r.codigo, `"${r.nombre}"`, `"${r.tipo}"`, r.naturaleza, r.grupo, r.areaFlujoCaja].join(',')
      )
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Plan_Cuentas_NIIF.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Plantilla CSV descargada.', 'success');
  };

  const handleExportCurrentPlan = () => {
    const sorted = [...cuentasContables]
      .sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || '')))
      .map((c) => ({
        codigo: c.codigo || '',
        nombre: c.nombre || '',
        tipo: c.tipo || 'Movimiento',
        naturaleza: c.naturaleza || 'Deudora',
        grupo: c.grupo || 'Activo',
        areaFlujoCaja: c.areaFlujoCaja || ''
      }));
    const ws = XLSX.utils.json_to_sheet(sorted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan_de_Cuentas');
    XLSX.writeFile(wb, `Plan_Cuentas_TP_PAGOS_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast(`Plan exportado (${sorted.length} cuentas).`, 'success');
  };

  const handleResetToBasePlan = async () => {
    if (isResettingBase) return;
    if (
      !window.confirm(
        '¿Restaurar el Plan de Cuentas NIIF Base del sistema? Esto reemplazará el catálogo actual por las cuentas predeterminadas.'
      )
    ) {
      return;
    }
    setIsResettingBase(true);
    try {
      const baseAccounts = await dbResetToFullDemoCuentas();
      if (onSave) {
        await onSave('cuentasContables', {
          _bulk: true,
          replaceAll: true,
          items: baseAccounts
        });
      }
      setParsedRows([]);
      setParseErrors([]);
      setParseWarnings([]);
      setUploadedFileName('');
      showToast(`Plan NIIF base restaurado (${baseAccounts.length} cuentas).`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al restaurar el plan base.', 'error');
    } finally {
      setIsResettingBase(false);
    }
  };

  const clearPreview = () => {
    setParsedRows([]);
    setParseErrors([]);
    setParseWarnings([]);
    setUploadedFileName('');
    setPreviewSearch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderAccountField = (
    field: string,
    label: string,
    description: string,
    defaultGroup: string,
    requiredForClose = false
  ) => (
    <div key={field} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <span>{label}</span>
            {requiredForClose && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Requerida Cierre
              </span>
            )}
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        </div>
        {form[field] && (
          <button
            type="button"
            onClick={() => setForm((prev: any) => ({ ...prev, [field]: '' }))}
            title="Limpiar selección"
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <CuentaSelectorTrigger
        value={form[field]}
        cuentasContables={cuentasContables}
        onClick={() =>
          setModalSelector({
            field,
            title: `Seleccionar: ${label}`,
            subtitle: description,
            defaultGroup
          })
        }
      />
    </div>
  );

  return (
    <div className="px-3 sm:px-6 pt-1 pb-8 max-w-6xl mx-auto animate-in fade-in duration-300 space-y-5">
      {/* Top Breadcrumb & Quick Info */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton to="/accounting" label="Volver a Contabilidad" />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ejercicio Fiscal Activo: {form.workingYear || workingYear}</span>
          </span>
          <Link
            to="/accounting/closing"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Ir a Cierre Fiscal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Configuración Contable
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Parámetros de cierre de período, cuentas NIIF y carga masiva del plan de cuentas
            </p>
          </div>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="w-full lg:w-auto grid grid-cols-2 lg:flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => switchTab('closing-config')}
            className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'closing-config'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Cierre de Período</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('import')}
            className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Carga Masiva Plan</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CONFIGURACIÓN DE CUENTAS PARA CIERRE DE PERÍODO */}
      {activeTab === 'closing-config' && (
        <form onSubmit={handleSaveConfig} className="space-y-5 animate-in fade-in duration-200">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              mappedClosingAccount
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {mappedClosingAccount ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-black">
                  {mappedClosingAccount
                    ? 'Listo para Cierre Fiscal Anual'
                    : 'Falta asignar la Cuenta de Utilidad / Pérdida de Ejercicios Anteriores'}
                </p>
                <p className="opacity-85 mt-0.5">
                  {mappedClosingAccount
                    ? `Las cuentas nominales (Ingresos, Costos y Gastos) del año ${form.workingYear || workingYear} cerrarán contra "${mappedClosingAccount.codigo} - ${mappedClosingAccount.nombre}".`
                    : 'Selecciona una cuenta patrimonial (Grupo 3) para habilitar el asiento automático en Cierre de Ejercicio Fiscal.'}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 text-[11px] font-black uppercase px-3 py-1 rounded-full border ${
                mappedClosingAccount
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {mappedClosingAccount ? 'Configurado' : 'Pendiente'}
            </span>
          </div>

          {/* Card 1: Período Fiscal Activo */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">1. Período Fiscal Activo</h2>
                <p className="text-xs text-slate-500">
                  Año contable habilitado para asientos, movimientos bancarios y cierre de ejercicio
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Ejercicio Fiscal de Trabajo
                </label>
                <select
                  value={String(form.workingYear || workingYear)}
                  onChange={(e) => setForm({ ...form, workingYear: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-black text-slate-800 outline-none transition-all cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      Ejercicio Fiscal {yr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                Al ejecutar el cierre de período, el sistema liquidará los movimientos entre el{' '}
                <strong className="text-slate-900">01/01/{form.workingYear || workingYear}</strong> y el{' '}
                <strong className="text-slate-900">31/12/{form.workingYear || workingYear}</strong> y avanzará automáticamente al siguiente año fiscal.
              </div>
            </div>
          </div>

          {/* Card 2: Cuentas Contables para el Cierre de Período */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  2. Cuentas Contables para el Cierre de Período (NIIF)
                </h2>
                <p className="text-xs text-slate-500">
                  Asigna las cuentas patrimoniales de resultado y diferencial cambiario utilizadas en el cierre anual
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField(
                'cuentaUtilidadAnteriores',
                'Utilidad / Pérdida de Ejercicios Anteriores',
                'Cuenta patrimonial (Grupo 3) que recibe el Resultado Neto al liquidar ingresos, costos y gastos en el Cierre Anual.',
                '3',
                true
              )}
              {renderAccountField(
                'cuentaResultadoEjercicio',
                'Resultado del Ejercicio Actual',
                'Cuenta patrimonial (Grupo 3) de referencia para reflejar la utilidad o pérdida neta en reportes financieros.',
                '3'
              )}
              {renderAccountField(
                'cuentaGananciaDiferencialCambiario',
                'Ganancia en Diferencial Cambiario (SAPS / FX)',
                'Cuenta de ingresos (Grupo 4) para ganancias cambiarias al revalorizar saldos en bolívares antes del cierre.',
                '4'
              )}
              {renderAccountField(
                'cuentaPerdidaDiferencialCambiario',
                'Pérdida en Diferencial Cambiario (SAPS / FX)',
                'Cuenta de egresos (Grupo 5) para pérdidas cambiarias en ajustes SAPS / diferencial FX.',
                '5'
              )}
            </div>
          </div>

          {/* Card 3: Cuentas de Integración Operativa */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#009b8b] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  3. Cuentas Base de Tesorería e Integración Contable
                </h2>
                <p className="text-xs text-slate-500">
                  Cuentas predeterminadas para asientos automáticos de tesorería, pagos y cuarentena
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField(
                'cuentaBancos',
                'Bancos / Tesorería General',
                'Cuenta de activo por defecto para cuentas bancarias sin enlace específico.',
                '1'
              )}
              {renderAccountField(
                'cuentaCaja',
                'Caja Efectivo Principal',
                'Cuenta contable predeterminada para movimientos en cajas de efectivo.',
                '1'
              )}
              {renderAccountField(
                'cuentaIngresos',
                'Ingresos Operativos Principales',
                'Cuenta de ingresos predeterminada para asientos de facturación / ingresos.',
                '4'
              )}
              {renderAccountField(
                'cuentaPagosPorIdentificar',
                'Pagos en Cuarentena por Identificar',
                'Cuenta transitoria utilizada al enviar ingresos bancarios a Cuarentena.',
                '2'
              )}
              {renderAccountField(
                'cuentaCxc',
                'Cuentas por Cobrar Clientes',
                'Cuenta de activo corriente para conciliación de cobranzas.',
                '1'
              )}
              {renderAccountField(
                'cuentaCxp',
                'Cuentas por Pagar Proveedores',
                'Cuenta de pasivo corriente para liquidación de proveedores y servicios.',
                '2'
              )}
              {renderAccountField(
                'cuentaAnticipoRecibido',
                'Anticipos Recibidos de Clientes',
                'Cuenta de pasivo para excedentes o anticipos aplicados en cobranzas.',
                '2'
              )}
              {renderAccountField(
                'cuentaAnticipoOtorgado',
                'Anticipos a Proveedores',
                'Cuenta de activo para pagos anticipados a hoteles, aerolíneas y aliados.',
                '1'
              )}
            </div>
          </div>

          {/* Save Button Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">
              Catálogo disponible: <strong className="text-slate-800">{cuentasContables.length} cuentas</strong> cargadas actualmente.
            </span>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00b4a2] to-[#009b8b] hover:from-[#009b8b] hover:to-teal-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSavingConfig ? 'Guardando...' : 'Guardar Configuración Contable'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: CARGA MASIVA DEL PLAN DE CUENTAS */}
      {activeTab === 'import' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          {/* Action Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Importación Masiva del Plan de Cuentas (Excel / CSV)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carga archivos <code className="font-mono bg-slate-100 px-1 rounded">.xlsx</code>,{' '}
                  <code className="font-mono bg-slate-100 px-1 rounded">.xls</code>,{' '}
                  <code className="font-mono bg-slate-100 px-1 rounded">.csv</code> o{' '}
                  <code className="font-mono bg-slate-100 px-1 rounded">.txt</code> (separados por coma{' '}
                  <code className="font-mono">,</code> o punto y coma <code className="font-mono">;</code>).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Plantilla Excel</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Plantilla CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportCurrentPlan}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span>Exportar ({cuentasContables.length})</span>
              </button>

              <button
                type="button"
                onClick={handleResetToBasePlan}
                disabled={isResettingBase}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${isResettingBase ? 'animate-spin' : ''}`} />
                <span>Plan NIIF Base</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Area + Column Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileSelected(file);
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFileSelected(file);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#00b4a2] bg-teal-50/70 scale-[0.99]'
                    : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/30'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-black text-slate-800">
                  {uploadedFileName
                    ? `Archivo cargado: ${uploadedFileName}`
                    : 'Arrastra aquí tu archivo Excel o CSV, o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos soportados: <strong>.xlsx, .xls, .csv, .txt</strong> • Detección automática de delimitadores y estructura NIIF
                </p>
              </div>

              {/* Import Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setImportMode('merge')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    importMode === 'merge'
                      ? 'border-[#00b4a2] bg-teal-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-1 accent-[#00b4a2]"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Combinar / Actualizar (Recomendado)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Actualiza nombres y atributos de códigos existentes (conservando IDs y saldos) e inserta los códigos nuevos.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setImportMode('replace')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    importMode === 'replace'
                      ? 'border-rose-500 bg-rose-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-1 accent-rose-600"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Reemplazar Todo el Plan
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Sustituye por completo el Plan de Cuentas actual ({cuentasContables.length} cuentas) con las cuentas del archivo.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Format Reference Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Columnas Reconocidas</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                    codigo
                  </span>
                  <span>Obligatorio. Ej: <code className="font-mono">1.1.01.001</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                    nombre
                  </span>
                  <span>Obligatorio. Nombre o descripción de la cuenta.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    tipo
                  </span>
                  <span>Opcional: <em>Título General</em>, <em>Subtítulo / Grupo</em> o <em>Movimiento</em>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    naturaleza
                  </span>
                  <span>Opcional: <em>Deudora</em> o <em>Acreedora</em> (se infiere si falta).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    grupo
                  </span>
                  <span>Opcional: <em>Activo, Pasivo, Patrimonio, Ingresos, Egresos</em> (se infiere por dígito inicial).</span>
                </li>
              </ul>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Plan actual:</span>
                <Link
                  to="/accounting/accounts"
                  className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>Ver {cuentasContables.length} cuentas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Errors / Warnings */}
          {(parseErrors.length > 0 || parseWarnings.length > 0) && (
            <div className="space-y-2">
              {parseErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Filas omitidas por datos incompletos ({parseErrors.length}):</span>
                  </p>
                  <ul className="list-disc pl-5 max-h-28 overflow-y-auto space-y-0.5">
                    {parseErrors.slice(0, 20).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parseWarnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Advertencias ({parseWarnings.length}):</span>
                  </p>
                  <ul className="list-disc pl-5 max-h-24 overflow-y-auto space-y-0.5">
                    {parseWarnings.slice(0, 15).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

              {/* Live Preview Panel */}
          {parsedRows.length > 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden animate-in slide-in-from-bottom-2">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900">
                    Vista Previa de Importación ({uploadedFileName})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Leídas: {previewSummary.total}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Nuevas: {previewSummary.newCount}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      A actualizar: {previewSummary.updateCount}
                    </span>
                    {parseErrors.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Omitidas: {parseErrors.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Filtrar vista previa..."
                      className="w-full sm:w-52 pl-8 pr-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearPreview}
                      disabled={isImporting}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Cancelar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#00b4a2] to-[#009b8b] hover:from-[#009b8b] hover:to-teal-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                      )}
                      <span className="truncate">
                        {isImporting
                          ? 'Importando...'
                          : `Importar (${parsedRows.length})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Código</th>
                      <th className="py-2.5 px-4">Nombre</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Naturaleza</th>
                      <th className="py-2.5 px-3">Grupo</th>
                      <th className="py-2.5 px-3 text-center">Nivel</th>
                      <th className="py-2.5 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewRows.map((row) => (
                      <tr key={row.codigo} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                          {row.codigo}
                        </td>
                        <td className="py-2 px-4 font-semibold text-slate-800">{row.nombre}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">{row.tipo}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">{row.naturaleza}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">{row.grupo}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-500">{row.nivel}</td>
                        <td className="py-2 px-4 text-center whitespace-nowrap">
                          {importMode === 'replace' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Reemplazo
                            </span>
                          ) : row.isUpdate ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Actualizar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Nueva
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 100 && !previewSearch && (
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                  Mostrando las primeras 100 cuentas de {parsedRows.length} en la vista previa. Usa el filtro si deseas inspeccionar códigos específicos antes de confirmar.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Selector de Cuenta NIIF */}
      <CuentaContableModal
        isOpen={Boolean(modalSelector)}
        onClose={() => setModalSelector(null)}
        onSelect={(cuenta) => {
          if (modalSelector) {
            setForm((prev: any) => ({
              ...prev,
              [modalSelector.field]: String(cuenta.id || cuenta.codigo)
            }));
          }
          setModalSelector(null);
        }}
        cuentasContables={cuentasContables}
        selectedCuentaId={modalSelector ? String(form[modalSelector.field] || '') : ''}
        title={modalSelector?.title || 'Seleccionar Cuenta Contable'}
        subtitle={modalSelector?.subtitle}
        defaultGroup={modalSelector?.defaultGroup || 'todos'}
      />
    </div>
  );
}
