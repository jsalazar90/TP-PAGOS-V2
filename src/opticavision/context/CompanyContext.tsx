import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { loadFromStorage, saveToStorage } from '../../core/utils/storage';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import {
  ERP_STORAGE_KEYS,
  SAMPLE_FULL_BALANCE_CUENTAS,
  dbBulkSaveCuentasContables,
  deleteErpRowFromSupabase,
  ensureBaseHierarchyTitles,
  normalizeErpRow,
  syncErpTableFromSupabase,
  upsertErpRowToSupabase
} from '../services/db';

const INITIAL_BANCOS = [
  {
    id: 'bco-1',
    banco: 'BANESCO BANCO UNIVERSAL',
    cuenta: '0134-0347-3334-7104-3582',
    numero_cuenta: '0134-0347-3334-7104-3582',
    numeroCuenta: '0134-0347-3334-7104-3582',
    tipo: 'Corriente',
    tipo_cuenta: 'nacional',
    moneda: 'Bolivares',
    tasa: 919.8227,
    saldo: 0,
    es_caja: false,
    cuenta_contable_id: '1.1.01.003',
    cuentaContableId: '1.1.01.003',
    activo: true
  },
  {
    id: 'bco-2',
    banco: 'ZELLE CORPORATIVO TRAVEL POINT',
    cuenta: 'pagos@travelpoint.com',
    numero_cuenta: 'pagos@travelpoint.com',
    numeroCuenta: 'pagos@travelpoint.com',
    tipo: 'Corriente',
    tipo_cuenta: 'internacional',
    moneda: 'USD',
    tasa: 1,
    saldo: 0,
    es_caja: false,
    cuenta_contable_id: '1.1.01.005',
    cuentaContableId: '1.1.01.005',
    activo: true
  },
  {
    id: 'bco-3',
    banco: 'BINANCE PAY TESORERÍA USDT',
    cuenta: 'PayID: 520889150',
    numero_cuenta: 'PayID: 520889150',
    numeroCuenta: 'PayID: 520889150',
    tipo: 'Custodia',
    tipo_cuenta: 'internacional',
    moneda: 'USD',
    tasa: 1,
    saldo: 0,
    es_caja: false,
    cuenta_contable_id: '1.1.01.006',
    cuentaContableId: '1.1.01.006',
    activo: true
  },
  {
    id: 'bco-4',
    banco: 'CAJA PRINCIPAL EFECTIVO USD',
    cuenta: 'CAJA-USD-01',
    numero_cuenta: 'CAJA-USD-01',
    numeroCuenta: 'CAJA-USD-01',
    tipo: 'Caja General',
    tipo_cuenta: 'internacional',
    moneda: 'USD',
    tasa: 1,
    saldo: 0,
    es_caja: true,
    cuenta_contable_id: '1.1.01.001',
    cuentaContableId: '1.1.01.001',
    activo: true
  }
];

const INITIAL_CONFIG_CONTABLE = {
  cuentaCxc: '1.1.03.001',
  cuentaCxp: '2.1.01.001',
  cuentaCaja: '1.1.01.001',
  cuentaBancos: '1.1.01.003',
  cuentaAnticipoRecibido: '2.1.04.004',
  cuentaAnticipoOtorgado: '1.1.03.006',
  cuentaDebitoFiscal: '2.1.03.001',
  cuentaCreditoFiscal: '1.1.05.001',
  cuentaIvaRetenidoVentas: '1.1.05.002',
  cuentaIslrRetenidoVentas: '1.1.05.003',
  cuentaIvaRetenidoCompras: '2.1.03.002',
  cuentaIslrRetenidoCompras: '2.1.03.003',
  cuentaGananciaDiferencialCambiario: '4.1.01.002',
  cuentaPerdidaDiferencialCambiario: '5.2.01.002',
  cuentaIngresos: '4.1.01.001',
  cuentaUtilidadAnteriores: '3.1.03.001',
  cuentaResultadoEjercicio: '3.1.03.003',
  cuentaPagosPorIdentificar: '2.1.01.003',
  workingYear: String(new Date().getFullYear()),
  retencionIvaPorcentaje: 75,
  retencionIslrPorcentaje: 2
};

export interface ErpCompanyContextValue {
  activeCompanyId: string;
  availableCompanies: any[];
  userRole: string;
  currentUser: any;
  workingYear: string;
  setWorkingYear: (y: string) => void;
  empresa: any;
  bancos: any[];
  movimientosBancos: any[];
  cuentasContables: any[];
  comprobantes: any[];
  configContable: any;
  activosFijos: any[];
  categoriasActivos: any[];
  depreciaciones: any[];
  cxc: any[];
  cxp: any[];
  cobranzas: any[];
  pagosRealizados: any[];
  handleSave: (collectionName: string, data: any) => Promise<void>;
  erpShowToast: (msg: string, type?: string) => void;
}

const CompanyContext = createContext<ErpCompanyContextValue | undefined>(undefined);

export const ErpCompanyProvider: React.FC<{
  currentUser: UserProfile | null;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  children: React.ReactNode;
}> = ({ currentUser, onShowToast, children }) => {

  const [workingYear, setWorkingYear] = useState<string>(() => {
    const savedCfg = loadFromStorage<any>(ERP_STORAGE_KEYS.CONFIG_CONTABLE, INITIAL_CONFIG_CONTABLE);
    return String(savedCfg?.workingYear || new Date().getFullYear());
  });

  const [cuentasContables, setCuentasContables] = useState<any[]>(() => {
    const loaded = loadFromStorage(ERP_STORAGE_KEYS.CUENTAS, SAMPLE_FULL_BALANCE_CUENTAS);
    const repaired = ensureBaseHierarchyTitles(loaded);
    if (repaired !== loaded) {
      saveToStorage(ERP_STORAGE_KEYS.CUENTAS, repaired);
    }
    return repaired;
  });
  const [bancos, setBancos] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.BANCOS, INITIAL_BANCOS)
  );
  const [movimientosBancos, setMovimientosBancos] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.MOVIMIENTOS_BANCOS, [])
  );
  const [comprobantes, setComprobantes] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.COMPROBANTES, [])
  );
  const [configContable, setConfigContable] = useState<any>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.CONFIG_CONTABLE, INITIAL_CONFIG_CONTABLE)
  );
  const [activosFijos, setActivosFijos] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.ACTIVOS_FIJOS, [])
  );
  const [categoriasActivos, setCategoriasActivos] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.CATEGORIAS_ACTIVOS, [])
  );
  const [depreciaciones, setDepreciaciones] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.DEPRECIACIONES, [])
  );
  const [cxc, setCxc] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.CXC, [])
  );
  const [cxp, setCxp] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.CXP, [])
  );
  const [cobranzas, setCobranzas] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.COBRANZAS, [])
  );
  const [pagosRealizados, setPagosRealizados] = useState<any[]>(() =>
    loadFromStorage(ERP_STORAGE_KEYS.PAGOS, [])
  );

  // Sincronización automática en segundo plano con Supabase si está configurado
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    const hydrateFromSupabase = async () => {
      try {
        const [
          remCuentas,
          remBancos,
          remMovs,
          remComps,
          remActivos,
          remCats,
          remDeps,
          remCxc,
          remCxp,
          remCob,
          remPag
        ] = await Promise.all([
          syncErpTableFromSupabase('cuentas_contables', ERP_STORAGE_KEYS.CUENTAS, SAMPLE_FULL_BALANCE_CUENTAS),
          syncErpTableFromSupabase('bancos', ERP_STORAGE_KEYS.BANCOS, INITIAL_BANCOS),
          syncErpTableFromSupabase('movimientos_bancos', ERP_STORAGE_KEYS.MOVIMIENTOS_BANCOS, []),
          syncErpTableFromSupabase('comprobantes_diario', ERP_STORAGE_KEYS.COMPROBANTES, []),
          syncErpTableFromSupabase('activos_fijos', ERP_STORAGE_KEYS.ACTIVOS_FIJOS, []),
          syncErpTableFromSupabase('categorias_activos', ERP_STORAGE_KEYS.CATEGORIAS_ACTIVOS, []),
          syncErpTableFromSupabase('depreciaciones', ERP_STORAGE_KEYS.DEPRECIACIONES, []),
          syncErpTableFromSupabase('cuentas_cobrar_cxc', ERP_STORAGE_KEYS.CXC, []),
          syncErpTableFromSupabase('cuentas_pagar_cxp', ERP_STORAGE_KEYS.CXP, []),
          syncErpTableFromSupabase('cobranzas', ERP_STORAGE_KEYS.COBRANZAS, []),
          syncErpTableFromSupabase('pagos_realizados', ERP_STORAGE_KEYS.PAGOS, [])
        ]);

        if (!active) return;
        const normalizedRemCuentas = ensureBaseHierarchyTitles(remCuentas);
        if (normalizedRemCuentas !== remCuentas) {
          saveToStorage(ERP_STORAGE_KEYS.CUENTAS, normalizedRemCuentas);
        }
        setCuentasContables(normalizedRemCuentas);
        setBancos(remBancos);
        setMovimientosBancos(remMovs);
        setComprobantes(remComps);
        setActivosFijos(remActivos);
        setCategoriasActivos(remCats);
        setDepreciaciones(remDeps);
        setCxc(remCxc);
        setCxp(remCxp);
        setCobranzas(remCob);
        setPagosRealizados(remPag);

        const { data: cfgData, error: cfgErr } = await supabase
          .from('configuracion_contable')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();

        if (!cfgErr && cfgData && active) {
          const normalizedCfg = {
            ...INITIAL_CONFIG_CONTABLE,
            ...normalizeErpRow(cfgData)
          };
          setConfigContable(normalizedCfg);
          if (normalizedCfg.workingYear) {
            setWorkingYear(String(normalizedCfg.workingYear));
          }
          saveToStorage(ERP_STORAGE_KEYS.CONFIG_CONTABLE, normalizedCfg);
        }
      } catch (err) {
        console.warn('[CompanyContext] Error hidratando datos ERP desde Supabase:', err);
      }
    };

    void hydrateFromSupabase();
    return () => {
      active = false;
    };
  }, []);

  const empresa = {
    id: 'emp-jt-pagos-pro',
    name: 'TP PAGOS PRO C.A.',
    nombre: 'TP PAGOS PRO C.A.',
    taxId: 'J-40128940-1',
    rif: 'J-40128940-1',
    direccion: 'Centro Financiero Corporativo, Venezuela',
    telefono: '+58 212 555 0000',
    email: 'administracion@jtpagos.com',
    monedaPrincipal: 'USD',
    monedaSecundaria: 'VES',
    tipoContribuyente: 'especial',
    tipoEmpresa: 'servicios'
  };

  const updateCollection = (
    storageKey: string,
    setter: React.Dispatch<React.SetStateAction<any[]>>,
    itemData: any,
    supabaseTable?: string,
    buildExtraCols?: (item: any) => Record<string, any>
  ) => {
    setter((prev) => {
      if (Array.isArray(itemData)) {
        saveToStorage(storageKey, itemData);
        if (supabaseTable) {
          itemData.forEach((it) => {
            if (it?.id) {
              void upsertErpRowToSupabase(
                supabaseTable,
                it,
                buildExtraCols ? buildExtraCols(it) : {}
              );
            }
          });
        }
        return itemData;
      }
      if (!itemData) return prev;
      let next: any[];
      if (itemData._delete || itemData._deleteId) {
        const delId = itemData._deleteId || itemData.id;
        next = prev.filter((i) => String(i.id) !== String(delId));
        if (supabaseTable && delId) {
          void deleteErpRowFromSupabase(supabaseTable, String(delId));
        }
      } else {
        const id = itemData.id || crypto.randomUUID();
        const withId = { ...itemData, id };
        const idx = prev.findIndex((i) => String(i.id) === String(id));
        if (idx >= 0) {
          next = [...prev];
          next[idx] = { ...next[idx], ...withId };
        } else {
          next = [...prev, withId];
        }
        const savedItem = idx >= 0 ? next[idx] : withId;
        if (supabaseTable) {
          void upsertErpRowToSupabase(
            supabaseTable,
            savedItem,
            buildExtraCols ? buildExtraCols(savedItem) : {}
          );
        }
      }
      saveToStorage(storageKey, next);
      return next;
    });
  };

  const handleSave = async (collectionName: string, data: any) => {
    switch (collectionName) {
      case 'bancos':
        updateCollection(
          ERP_STORAGE_KEYS.BANCOS,
          setBancos,
          data,
          'bancos',
          (b) => ({
            banco: b.banco || '',
            cuenta: b.cuenta || b.numero_cuenta || b.numeroCuenta || '',
            numero_cuenta: b.numero_cuenta || b.cuenta || b.numeroCuenta || '',
            tipo: b.tipo || 'Corriente',
            tipo_cuenta: b.tipo_cuenta || 'nacional',
            moneda: b.moneda || 'USD',
            tasa: Number(b.tasa) || 1,
            saldo: Number(b.saldo) || 0,
            es_caja: Boolean(b.es_caja),
            cuenta_contable_id: b.cuenta_contable_id || b.cuentaContableId || null,
            activo: b.activo !== false
          })
        );
        break;
      case 'movimientosBancos':
      case 'movimientos_bancos':
        updateCollection(
          ERP_STORAGE_KEYS.MOVIMIENTOS_BANCOS,
          setMovimientosBancos,
          data,
          'movimientos_bancos',
          (m) => ({
            banco_id: String(m.banco_id || m.bancoId || ''),
            fecha: m.fecha || '',
            ref: m.ref || '',
            descripcion: m.descripcion || '',
            tipo: m.tipo || 'egreso',
            monto: Number(m.monto) || 0,
            tasa: Number(m.tasa) || 1,
            monto_bs: m.montoBs !== undefined && m.montoBs !== null && m.montoBs !== '' ? Number(m.montoBs) : null,
            estado: m.estado || 'activo',
            cuenta_contrapartida: m.cuentaContrapartida || m.cuenta_contrapartida || null,
            comprobante_id: m.comprobanteId || m.comprobante_id || null,
            solicitud_id: m.solicitudId || m.solicitud_id || null,
            soporte_imagen: m.soporteImagen || m.soporte_imagen || null,
            usuario: m.usuario || null
          })
        );
        break;
      case 'cuentasContables':
      case 'cuentas_contables':
        if (data && typeof data === 'object' && !Array.isArray(data) && data._bulk && Array.isArray(data.items)) {
          setCuentasContables(data.items);
          await dbBulkSaveCuentasContables(data.items, Boolean(data.replaceAll));
        } else if (Array.isArray(data)) {
          setCuentasContables(data);
          await dbBulkSaveCuentasContables(data, false);
        } else {
          updateCollection(
            ERP_STORAGE_KEYS.CUENTAS,
            setCuentasContables,
            data,
            'cuentas_contables',
            (c) => ({
              codigo: c.codigo || '',
              nombre: c.nombre || '',
              nivel: Number(c.nivel) || 4,
              tipo: c.tipo || 'Movimiento',
              grupo: c.grupo || 'Activo',
              naturaleza: c.naturaleza || 'Deudora',
              area_flujo_caja: c.areaFlujoCaja || c.area_flujo_caja || null,
              saldo: Number(c.saldo ?? c.saldoActual) || 0
            })
          );
        }
        break;
      case 'comprobantes':
      case 'comprobantes_diario':
        updateCollection(
          ERP_STORAGE_KEYS.COMPROBANTES,
          setComprobantes,
          data,
          'comprobantes_diario',
          (cp) => ({
            numero: cp.numero || '',
            fecha: cp.fecha || '',
            tipo: cp.tipo || 'Diario',
            descripcion: cp.descripcion || '',
            referencia: cp.referencia || '',
            total: Number(cp.total) || 0,
            estado: cp.estado || 'Contabilizado',
            movimiento_banco_id: cp.movimientoBancoId || cp.movimiento_banco_id || null,
            lineas: Array.isArray(cp.lineas) ? cp.lineas : []
          })
        );
        break;
      case 'accounting-config':
      case 'configContable':
      case 'configuracionContable':
      case 'configuracion_contable': {
        const merged = { ...configContable, ...data };
        setConfigContable(merged);
        if (merged?.workingYear) {
          setWorkingYear(String(merged.workingYear));
        }
        saveToStorage(ERP_STORAGE_KEYS.CONFIG_CONTABLE, merged);
        void upsertErpRowToSupabase('configuracion_contable', { ...merged, id: 'default' });
        break;
      }
      case 'activosFijos':
        updateCollection(
          ERP_STORAGE_KEYS.ACTIVOS_FIJOS,
          setActivosFijos,
          data,
          'activos_fijos',
          (a) => ({ nombre: a.nombre || '', codigo: a.codigo || '' })
        );
        break;
      case 'categoriasActivos':
        updateCollection(
          ERP_STORAGE_KEYS.CATEGORIAS_ACTIVOS,
          setCategoriasActivos,
          data,
          'categorias_activos',
          (c) => ({ nombre: c.nombre || '' })
        );
        break;
      case 'depreciaciones':
        updateCollection(
          ERP_STORAGE_KEYS.DEPRECIACIONES,
          setDepreciaciones,
          data,
          'depreciaciones',
          (d) => ({ fecha: d.fecha || '' })
        );
        break;
      case 'cxc':
      case 'cuentas_cobrar_cxc':
        updateCollection(ERP_STORAGE_KEYS.CXC, setCxc, data, 'cuentas_cobrar_cxc');
        break;
      case 'cxp':
      case 'cuentas_pagar_cxp':
        updateCollection(ERP_STORAGE_KEYS.CXP, setCxp, data, 'cuentas_pagar_cxp');
        break;
      case 'cobranzas':
      case 'cobranza':
        updateCollection(ERP_STORAGE_KEYS.COBRANZAS, setCobranzas, data, 'cobranzas');
        break;
      case 'pagos-realizados':
      case 'pagosRealizados':
      case 'pagos_realizados':
        updateCollection(ERP_STORAGE_KEYS.PAGOS, setPagosRealizados, data, 'pagos_realizados');
        break;
      default:
        break;
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  const erpShowToast = (msg: string, type?: string) => {
    onShowToast(msg, type === 'error' ? 'error' : 'success');
  };

  const value: ErpCompanyContextValue = {
    activeCompanyId: empresa.id,
    availableCompanies: [empresa],
    userRole: isAdmin ? 'Master' : 'Operador',
    currentUser: {
      id: currentUser?.id || 'admin',
      email: currentUser?.email || '',
      name: currentUser?.full_name || 'Administrador',
      role: isAdmin ? 'Master' : 'Operador'
    },
    workingYear,
    setWorkingYear,
    empresa,
    bancos,
    movimientosBancos,
    cuentasContables,
    comprobantes,
    configContable,
    activosFijos,
    categoriasActivos,
    depreciaciones,
    cxc,
    cxp,
    cobranzas,
    pagosRealizados,
    handleSave,
    erpShowToast
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export function useCompany(): ErpCompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany must be used inside ErpCompanyProvider');
  }
  return ctx;
}
