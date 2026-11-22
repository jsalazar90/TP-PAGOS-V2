-- ==============================================================================
-- TP PAGOS PRO - SCRIPT DE ACTUALIZACIÓN SUPABASE (POSTGRESQL)
-- Mejoras en Beneficiarios, Gestionar Pago (Multi-Banco + Asiento NIIF)
-- y Módulo Cuentas & Mayor (Tesorería Bancos/Cajas + Contabilidad General NIIF)
-- Ejecuta este script completo en el SQL Editor de tu panel de Supabase.
-- ==============================================================================

-- ==============================================================================
-- 1. ACTUALIZACIÓN DE TABLA DE BENEFICIARIOS (public.beneficiaries)
-- Soporta Transferencia Internacional USD (SWIFT/ABA, País, Intermediario),
-- Binance Pay unificado y Cuenta Contable NIIF predeterminada por proveedor.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rif TEXT,
  category TEXT DEFAULT 'hospedaje',
  bank_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS default_account_id TEXT,
  ADD COLUMN IF NOT EXISTS default_account_code TEXT,
  ADD COLUMN IF NOT EXISTS default_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_beneficiaries_category ON public.beneficiaries(category);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_bank_details_gin ON public.beneficiaries USING GIN (bank_details);

-- ==============================================================================
-- 2. ACTUALIZACIÓN DE SOLICITUDES DE PAGO (public.payment_requests)
-- Soporta liquidación multi-banco de Tesorería, fecha de ejecución,
-- cuenta contable NIIF de gasto, referencias bancarias y múltiples comprobantes.
-- ==============================================================================
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS origin_bank TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS support_files JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS receipt_files JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accounting_account_id TEXT,
  ADD COLUMN IF NOT EXISTS accounting_account_code TEXT,
  ADD COLUMN IF NOT EXISTS accounting_account_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_execution_reference TEXT,
  ADD COLUMN IF NOT EXISTS bank_allocations JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_payment_requests_paid_at ON public.payment_requests(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_origin_bank ON public.payment_requests(origin_bank);
CREATE INDEX IF NOT EXISTS idx_payment_requests_bank_details_gin ON public.payment_requests USING GIN (bank_details);

-- ==============================================================================
-- 3. MÓDULO CUENTAS & MAYOR — PLAN DE CUENTAS NIIF (public.cuentas_contables)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cuentas_contables (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  nivel INT DEFAULT 4,
  tipo TEXT DEFAULT 'Movimiento',
  grupo TEXT DEFAULT 'Activo',
  naturaleza TEXT DEFAULT 'Deudora',
  area_flujo_caja TEXT,
  saldo NUMERIC(18, 2) DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuentas_contables_codigo ON public.cuentas_contables(codigo);

-- Semilla inicial del Plan de Cuentas NIIF (No sobrescribe cuentas ya editadas)
INSERT INTO public.cuentas_contables (id, codigo, nombre, nivel, tipo, grupo, naturaleza, area_flujo_caja, saldo, payload)
VALUES
  ('1', '1', 'ACTIVO', 1, 'Título General', 'Activo', 'Deudora', NULL, 0, '{"id":"1","codigo":"1","nombre":"ACTIVO","nivel":1,"tipo":"Título General","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.1', '1.1', 'Activo Corriente', 2, 'Título de Cuenta Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1","codigo":"1.1","nombre":"Activo Corriente","nivel":2,"tipo":"Título de Cuenta Movimiento","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.1.01', '1.1.01', 'Efectivo y Equivalentes de Efectivo', 3, 'Título de Cuenta Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01","codigo":"1.1.01","nombre":"Efectivo y Equivalentes de Efectivo","nivel":3,"tipo":"Título de Cuenta Movimiento","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.1.01.001', '1.1.01.001', 'Caja Chica Administración (USD)', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.001","codigo":"1.1.01.001","nombre":"Caja Chica Administración (USD)","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.01.002', '1.1.01.002', 'Caja Principal Efectivo (Bs / USD)', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.002","codigo":"1.1.01.002","nombre":"Caja Principal Efectivo (Bs / USD)","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.01.003', '1.1.01.003', 'Banesco Banco Universal (Cuenta Corriente Bs)', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.003","codigo":"1.1.01.003","nombre":"Banesco Banco Universal (Cuenta Corriente Bs)","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.01.004', '1.1.01.004', 'Banco Mercantil (Cuenta Corriente Bs)', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.004","codigo":"1.1.01.004","nombre":"Banco Mercantil (Cuenta Corriente Bs)","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.01.005', '1.1.01.005', 'Banesco Panamá / Zelle Corporativo (USD)', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.005","codigo":"1.1.01.005","nombre":"Banesco Panamá / Zelle Corporativo (USD)","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.01.006', '1.1.01.006', 'Binance Pay Tesorería (USDT)', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.006","codigo":"1.1.01.006","nombre":"Binance Pay Tesorería (USDT)","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.01.007', '1.1.01.007', 'Puntos de Venta (POS) por Liquidar', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.01.007","codigo":"1.1.01.007","nombre":"Puntos de Venta (POS) por Liquidar","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.03', '1.1.03', 'Deudores Comerciales y Cuentas por Cobrar', 3, 'Título de Cuenta Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.03","codigo":"1.1.03","nombre":"Deudores Comerciales y Cuentas por Cobrar","nivel":3,"tipo":"Título de Cuenta Movimiento","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.1.03.001', '1.1.03.001', 'Cuentas por Cobrar Clientes Nacionales', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.03.001","codigo":"1.1.03.001","nombre":"Cuentas por Cobrar Clientes Nacionales","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.03.006', '1.1.03.006', 'Anticipos a Proveedores, Hoteles y Aerolíneas', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.03.006","codigo":"1.1.03.006","nombre":"Anticipos a Proveedores, Hoteles y Aerolíneas","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.05', '1.1.05', 'Activos Fiscales y Pagos Anticipados', 3, 'Título de Cuenta Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.05","codigo":"1.1.05","nombre":"Activos Fiscales y Pagos Anticipados","nivel":3,"tipo":"Título de Cuenta Movimiento","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.1.05.001', '1.1.05.001', 'Crédito Fiscal IVA por Compensar', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.05.001","codigo":"1.1.05.001","nombre":"Crédito Fiscal IVA por Compensar","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.05.002', '1.1.05.002', 'Retenciones de IVA Soportadas en Ventas', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.05.002","codigo":"1.1.05.002","nombre":"Retenciones de IVA Soportadas en Ventas","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.1.05.003', '1.1.05.003', 'Anticipos y Retenciones de ISLR', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.1.05.003","codigo":"1.1.05.003","nombre":"Anticipos y Retenciones de ISLR","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.2', '1.2', 'Activo No Corriente', 2, 'Título de Cuenta Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.2","codigo":"1.2","nombre":"Activo No Corriente","nivel":2,"tipo":"Título de Cuenta Movimiento","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.2.01', '1.2.01', 'Propiedad, Mobiliario y Equipos (Activos Fijos)', 3, 'Título de Cuenta Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.2.01","codigo":"1.2.01","nombre":"Propiedad, Mobiliario y Equipos (Activos Fijos)","nivel":3,"tipo":"Título de Cuenta Movimiento","grupo":"Activo","naturaleza":"Deudora"}'::jsonb),
  ('1.2.01.008', '1.2.01.008', 'Equipos de Computación, Redes y Servidores', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.2.01.008","codigo":"1.2.01.008","nombre":"Equipos de Computación, Redes y Servidores","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.2.01.009', '1.2.01.009', 'Depreciación Acumulada Equipos de Computación', 4, 'Movimiento', 'Activo', 'Acreedora', NULL, 0, '{"id":"1.2.01.009","codigo":"1.2.01.009","nombre":"Depreciación Acumulada Equipos de Computación","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.2.01.010', '1.2.01.010', 'Mobiliario y Equipos de Oficina', 4, 'Movimiento', 'Activo', 'Deudora', NULL, 0, '{"id":"1.2.01.010","codigo":"1.2.01.010","nombre":"Mobiliario y Equipos de Oficina","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('1.2.01.011', '1.2.01.011', 'Depreciación Acumulada de Mobiliario', 4, 'Movimiento', 'Activo', 'Acreedora', NULL, 0, '{"id":"1.2.01.011","codigo":"1.2.01.011","nombre":"Depreciación Acumulada de Mobiliario","nivel":4,"tipo":"Movimiento","grupo":"Activo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('2', '2', 'PASIVO', 1, 'Título General', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2","codigo":"2","nombre":"PASIVO","nivel":1,"tipo":"Título General","grupo":"Pasivo","naturaleza":"Acreedora"}'::jsonb),
  ('2.1', '2.1', 'Pasivo Corriente', 2, 'Título de Cuenta Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1","codigo":"2.1","nombre":"Pasivo Corriente","nivel":2,"tipo":"Título de Cuenta Movimiento","grupo":"Pasivo","naturaleza":"Acreedora"}'::jsonb),
  ('2.1.01', '2.1.01', 'Cuentas y Obligaciones Comerciales por Pagar', 3, 'Título de Cuenta Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.01","codigo":"2.1.01","nombre":"Cuentas y Obligaciones Comerciales por Pagar","nivel":3,"tipo":"Título de Cuenta Movimiento","grupo":"Pasivo","naturaleza":"Acreedora"}'::jsonb),
  ('2.1.01.001', '2.1.01.001', 'Cuentas por Pagar Proveedores, Hoteles y Aerolíneas', 4, 'Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.01.001","codigo":"2.1.01.001","nombre":"Cuentas por Pagar Proveedores, Hoteles y Aerolíneas","nivel":4,"tipo":"Movimiento","grupo":"Pasivo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('2.1.01.002', '2.1.01.002', 'Tarjetas de Crédito Corporativas por Pagar (BSP)', 4, 'Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.01.002","codigo":"2.1.01.002","nombre":"Tarjetas de Crédito Corporativas por Pagar (BSP)","nivel":4,"tipo":"Movimiento","grupo":"Pasivo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('2.1.01.003', '2.1.01.003', 'Pagos en Cuarentena por Identificar', 4, 'Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.01.003","codigo":"2.1.01.003","nombre":"Pagos en Cuarentena por Identificar","nivel":4,"tipo":"Movimiento","grupo":"Pasivo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('2.1.03', '2.1.03', 'Tributos e Impuestos por Pagar', 3, 'Título de Cuenta Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.03","codigo":"2.1.03","nombre":"Tributos e Impuestos por Pagar","nivel":3,"tipo":"Título de Cuenta Movimiento","grupo":"Pasivo","naturaleza":"Acreedora"}'::jsonb),
  ('2.1.03.001', '2.1.03.001', 'Débito Fiscal IVA por Pagar', 4, 'Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.03.001","codigo":"2.1.03.001","nombre":"Débito Fiscal IVA por Pagar","nivel":4,"tipo":"Movimiento","grupo":"Pasivo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('2.1.03.002', '2.1.03.002', 'Retenciones de IVA por Enterar SENIAT', 4, 'Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.03.002","codigo":"2.1.03.002","nombre":"Retenciones de IVA por Enterar SENIAT","nivel":4,"tipo":"Movimiento","grupo":"Pasivo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('2.1.03.003', '2.1.03.003', 'Retenciones de ISLR por Enterar SENIAT', 4, 'Movimiento', 'Pasivo', 'Acreedora', NULL, 0, '{"id":"2.1.03.003","codigo":"2.1.03.003","nombre":"Retenciones de ISLR por Enterar SENIAT","nivel":4,"tipo":"Movimiento","grupo":"Pasivo","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('3', '3', 'PATRIMONIO', 1, 'Título General', 'Patrimonio', 'Acreedora', NULL, 0, '{"id":"3","codigo":"3","nombre":"PATRIMONIO","nivel":1,"tipo":"Título General","grupo":"Patrimonio","naturaleza":"Acreedora"}'::jsonb),
  ('3.1', '3.1', 'Patrimonio Neto y Reservas', 2, 'Título de Cuenta Movimiento', 'Patrimonio', 'Acreedora', NULL, 0, '{"id":"3.1","codigo":"3.1","nombre":"Patrimonio Neto y Reservas","nivel":2,"tipo":"Título de Cuenta Movimiento","grupo":"Patrimonio","naturaleza":"Acreedora"}'::jsonb),
  ('3.1.01.001', '3.1.01.001', 'Capital Social Suscrito y Pagado', 4, 'Movimiento', 'Patrimonio', 'Acreedora', NULL, 0, '{"id":"3.1.01.001","codigo":"3.1.01.001","nombre":"Capital Social Suscrito y Pagado","nivel":4,"tipo":"Movimiento","grupo":"Patrimonio","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('3.1.03.001', '3.1.03.001', 'Utilidades Retenidas de Ejercicios Anteriores', 4, 'Movimiento', 'Patrimonio', 'Acreedora', NULL, 0, '{"id":"3.1.03.001","codigo":"3.1.03.001","nombre":"Utilidades Retenidas de Ejercicios Anteriores","nivel":4,"tipo":"Movimiento","grupo":"Patrimonio","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('3.1.03.003', '3.1.03.003', 'Resultado del Ejercicio Actual (Utilidad Neta)', 4, 'Movimiento', 'Patrimonio', 'Acreedora', NULL, 0, '{"id":"3.1.03.003","codigo":"3.1.03.003","nombre":"Resultado del Ejercicio Actual (Utilidad Neta)","nivel":4,"tipo":"Movimiento","grupo":"Patrimonio","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('4', '4', 'INGRESOS', 1, 'Título General', 'Ingresos', 'Acreedora', NULL, 0, '{"id":"4","codigo":"4","nombre":"INGRESOS","nivel":1,"tipo":"Título General","grupo":"Ingresos","naturaleza":"Acreedora"}'::jsonb),
  ('4.1', '4.1', 'Ingresos por Servicios Turísticos y Operaciones', 2, 'Título de Cuenta Movimiento', 'Ingresos', 'Acreedora', NULL, 0, '{"id":"4.1","codigo":"4.1","nombre":"Ingresos por Servicios Turísticos y Operaciones","nivel":2,"tipo":"Título de Cuenta Movimiento","grupo":"Ingresos","naturaleza":"Acreedora"}'::jsonb),
  ('4.1.01.001', '4.1.01.001', 'Ingresos por Emisión de Boletos, Hoteles y Servicios', 4, 'Movimiento', 'Ingresos', 'Acreedora', 'cobranzas', 0, '{"id":"4.1.01.001","codigo":"4.1.01.001","nombre":"Ingresos por Emisión de Boletos, Hoteles y Servicios","nivel":4,"tipo":"Movimiento","grupo":"Ingresos","naturaleza":"Acreedora","saldo":0,"saldoActual":0,"areaFlujoCaja":"cobranzas"}'::jsonb),
  ('4.1.01.002', '4.1.01.002', 'Ganancia en Diferencial Cambiario (SAPS)', 4, 'Movimiento', 'Ingresos', 'Acreedora', NULL, 0, '{"id":"4.1.01.002","codigo":"4.1.01.002","nombre":"Ganancia en Diferencial Cambiario (SAPS)","nivel":4,"tipo":"Movimiento","grupo":"Ingresos","naturaleza":"Acreedora","saldo":0,"saldoActual":0}'::jsonb),
  ('5', '5', 'COSTOS Y GASTOS OPERATIVOS', 1, 'Título General', 'Egresos', 'Deudora', NULL, 0, '{"id":"5","codigo":"5","nombre":"COSTOS Y GASTOS OPERATIVOS","nivel":1,"tipo":"Título General","grupo":"Egresos","naturaleza":"Deudora"}'::jsonb),
  ('5.1', '5.1', 'Costos Directos de Operación (Boletos, Hoteles, Traslados)', 2, 'Título de Cuenta Movimiento', 'Egresos', 'Deudora', NULL, 0, '{"id":"5.1","codigo":"5.1","nombre":"Costos Directos de Operación (Boletos, Hoteles, Traslados)","nivel":2,"tipo":"Título de Cuenta Movimiento","grupo":"Egresos","naturaleza":"Deudora"}'::jsonb),
  ('5.1.01.001', '5.1.01.001', 'Costo de Emisión Boletos Aéreos (BSP / Consolidadores)', 4, 'Movimiento', 'Egresos', 'Deudora', 'proveedores_real', 0, '{"id":"5.1.01.001","codigo":"5.1.01.001","nombre":"Costo de Emisión Boletos Aéreos (BSP / Consolidadores)","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"proveedores_real"}'::jsonb),
  ('5.1.01.002', '5.1.01.002', 'Costo de Remisiones y Penalidades Aéreas', 4, 'Movimiento', 'Egresos', 'Deudora', 'proveedores_real', 0, '{"id":"5.1.01.002","codigo":"5.1.01.002","nombre":"Costo de Remisiones y Penalidades Aéreas","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"proveedores_real"}'::jsonb),
  ('5.1.02.001', '5.1.02.001', 'Costo de Reservas y Emisión de Hoteles (Hospedaje)', 4, 'Movimiento', 'Egresos', 'Deudora', 'proveedores_real', 0, '{"id":"5.1.02.001","codigo":"5.1.02.001","nombre":"Costo de Reservas y Emisión de Hoteles (Hospedaje)","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"proveedores_real"}'::jsonb),
  ('5.1.03.001', '5.1.03.001', 'Costo de Traslados Ejecutivos y Transporte Terrestre', 4, 'Movimiento', 'Egresos', 'Deudora', 'proveedores_real', 0, '{"id":"5.1.03.001","codigo":"5.1.03.001","nombre":"Costo de Traslados Ejecutivos y Transporte Terrestre","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"proveedores_real"}'::jsonb),
  ('5.1.04.001', '5.1.04.001', 'Compras Directas por Página Web / Gastos de Apoyo', 4, 'Movimiento', 'Egresos', 'Deudora', 'gastos_er', 0, '{"id":"5.1.04.001","codigo":"5.1.04.001","nombre":"Compras Directas por Página Web / Gastos de Apoyo","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"gastos_er"}'::jsonb),
  ('5.2.01.001', '5.2.01.001', 'Comisiones Bancarias y Puntos de Venta (POS)', 4, 'Movimiento', 'Egresos', 'Deudora', 'gastos_er', 0, '{"id":"5.2.01.001","codigo":"5.2.01.001","nombre":"Comisiones Bancarias y Puntos de Venta (POS)","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"gastos_er"}'::jsonb),
  ('5.2.01.002', '5.2.01.002', 'Pérdida en Diferencial Cambiario (SAPS)', 4, 'Movimiento', 'Egresos', 'Deudora', NULL, 0, '{"id":"5.2.01.002","codigo":"5.2.01.002","nombre":"Pérdida en Diferencial Cambiario (SAPS)","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0}'::jsonb),
  ('6.1.01.001', '6.1.01.001', 'Viáticos y Gastos Operativos de Personal', 4, 'Movimiento', 'Egresos', 'Deudora', 'gastos_er', 0, '{"id":"6.1.01.001","codigo":"6.1.01.001","nombre":"Viáticos y Gastos Operativos de Personal","nivel":4,"tipo":"Movimiento","grupo":"Egresos","naturaleza":"Deudora","saldo":0,"saldoActual":0,"areaFlujoCaja":"gastos_er"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. MÓDULO TESORERÍA — BANCOS Y CAJAS (public.bancos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bancos (
  id TEXT PRIMARY KEY,
  banco TEXT NOT NULL,
  cuenta TEXT,
  numero_cuenta TEXT,
  tipo TEXT DEFAULT 'Corriente',
  tipo_cuenta TEXT DEFAULT 'nacional',
  moneda TEXT DEFAULT 'USD',
  tasa NUMERIC(18, 4) DEFAULT 1,
  saldo NUMERIC(18, 2) DEFAULT 0,
  es_caja BOOLEAN DEFAULT false,
  cuenta_contable_id TEXT,
  activo BOOLEAN DEFAULT true,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Si la tabla bancos había sido creada previamente con otra estructura, asegurar columnas:
ALTER TABLE public.bancos
  ADD COLUMN IF NOT EXISTS cuenta TEXT,
  ADD COLUMN IF NOT EXISTS numero_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Corriente',
  ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT DEFAULT 'nacional',
  ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tasa NUMERIC(18, 4) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS saldo NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_caja BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cuenta_contable_id TEXT,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Semilla inicial de Bancos y Cajas de Tesorería (Solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bancos LIMIT 1) THEN
    INSERT INTO public.bancos (id, banco, cuenta, numero_cuenta, tipo, tipo_cuenta, moneda, tasa, saldo, es_caja, cuenta_contable_id, activo, payload)
    VALUES
      (
        'bco-1',
        'BANESCO BANCO UNIVERSAL',
        '0134-0347-3334-7104-3582',
        '0134-0347-3334-7104-3582',
        'Corriente',
        'nacional',
        'Bolivares',
        919.8227,
        0,
        false,
        '1.1.01.003',
        true,
        '{"id":"bco-1","banco":"BANESCO BANCO UNIVERSAL","cuenta":"0134-0347-3334-7104-3582","numero_cuenta":"0134-0347-3334-7104-3582","numeroCuenta":"0134-0347-3334-7104-3582","tipo":"Corriente","tipo_cuenta":"nacional","moneda":"Bolivares","tasa":919.8227,"saldo":0,"es_caja":false,"cuenta_contable_id":"1.1.01.003","cuentaContableId":"1.1.01.003","activo":true}'::jsonb
      ),
      (
        'bco-2',
        'ZELLE CORPORATIVO TRAVEL POINT',
        'pagos@travelpoint.com',
        'pagos@travelpoint.com',
        'Corriente',
        'internacional',
        'USD',
        1,
        0,
        false,
        '1.1.01.005',
        true,
        '{"id":"bco-2","banco":"ZELLE CORPORATIVO TRAVEL POINT","cuenta":"pagos@travelpoint.com","numero_cuenta":"pagos@travelpoint.com","numeroCuenta":"pagos@travelpoint.com","tipo":"Corriente","tipo_cuenta":"internacional","moneda":"USD","tasa":1,"saldo":0,"es_caja":false,"cuenta_contable_id":"1.1.01.005","cuentaContableId":"1.1.01.005","activo":true}'::jsonb
      ),
      (
        'bco-3',
        'BINANCE PAY TESORERÍA USDT',
        'PayID: 520889150',
        'PayID: 520889150',
        'Custodia',
        'internacional',
        'USD',
        1,
        0,
        false,
        '1.1.01.006',
        true,
        '{"id":"bco-3","banco":"BINANCE PAY TESORERÍA USDT","cuenta":"PayID: 520889150","numero_cuenta":"PayID: 520889150","numeroCuenta":"PayID: 520889150","tipo":"Custodia","tipo_cuenta":"internacional","moneda":"USD","tasa":1,"saldo":0,"es_caja":false,"cuenta_contable_id":"1.1.01.006","cuentaContableId":"1.1.01.006","activo":true}'::jsonb
      ),
      (
        'bco-4',
        'CAJA PRINCIPAL EFECTIVO USD',
        'CAJA-USD-01',
        'CAJA-USD-01',
        'Caja General',
        'internacional',
        'USD',
        1,
        0,
        true,
        '1.1.01.001',
        true,
        '{"id":"bco-4","banco":"CAJA PRINCIPAL EFECTIVO USD","cuenta":"CAJA-USD-01","numero_cuenta":"CAJA-USD-01","numeroCuenta":"CAJA-USD-01","tipo":"Caja General","tipo_cuenta":"internacional","moneda":"USD","tasa":1,"saldo":0,"es_caja":true,"cuenta_contable_id":"1.1.01.001","cuentaContableId":"1.1.01.001","activo":true}'::jsonb
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si la columna id en una tabla previa era UUID, ignorar semilla con IDs de texto
  NULL;
END $$;

-- ==============================================================================
-- 5. MÓDULO TESORERÍA — MOVIMIENTOS BANCARIOS (public.movimientos_bancos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.movimientos_bancos (
  id TEXT PRIMARY KEY,
  banco_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  ref TEXT,
  descripcion TEXT NOT NULL,
  tipo TEXT NOT NULL,
  monto NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tasa NUMERIC(18, 4) DEFAULT 1,
  monto_bs NUMERIC(18, 2),
  estado TEXT DEFAULT 'activo',
  cuenta_contrapartida TEXT,
  comprobante_id TEXT,
  solicitud_id TEXT,
  soporte_imagen TEXT,
  usuario TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.movimientos_bancos
  ADD COLUMN IF NOT EXISTS cuenta_contrapartida TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_id TEXT,
  ADD COLUMN IF NOT EXISTS solicitud_id TEXT,
  ADD COLUMN IF NOT EXISTS soporte_imagen TEXT,
  ADD COLUMN IF NOT EXISTS usuario TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_movimientos_bancos_banco_id ON public.movimientos_bancos(banco_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_bancos_fecha ON public.movimientos_bancos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_bancos_solicitud_id ON public.movimientos_bancos(solicitud_id);

-- ==============================================================================
-- 6. MÓDULO CONTABILIDAD — COMPROBANTES DE DIARIO (public.comprobantes_diario)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comprobantes_diario (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL,
  fecha TEXT NOT NULL,
  tipo TEXT DEFAULT 'Diario',
  descripcion TEXT,
  referencia TEXT,
  total NUMERIC(18, 2) DEFAULT 0,
  estado TEXT DEFAULT 'Contabilizado',
  movimiento_banco_id TEXT,
  lineas JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_diario_fecha ON public.comprobantes_diario(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_comprobantes_diario_mov_banco ON public.comprobantes_diario(movimiento_banco_id);

-- ==============================================================================
-- 7. MÓDULO CONTABILIDAD — CONFIGURACIÓN CONTABLE Y AUXILIARES ERP
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.configuracion_contable (
  id TEXT PRIMARY KEY DEFAULT 'default',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.configuracion_contable (id, payload)
VALUES (
  'default',
  '{
    "cuentaCxc": "1.1.03.001",
    "cuentaCxp": "2.1.01.001",
    "cuentaCaja": "1.1.01.001",
    "cuentaBancos": "1.1.01.003",
    "cuentaAnticipoRecibido": "2.1.04.004",
    "cuentaAnticipoOtorgado": "1.1.03.006",
    "cuentaDebitoFiscal": "2.1.03.001",
    "cuentaCreditoFiscal": "1.1.05.001",
    "cuentaIvaRetenidoVentas": "1.1.05.002",
    "cuentaIslrRetenidoVentas": "1.1.05.003",
    "cuentaIvaRetenidoCompras": "2.1.03.002",
    "cuentaIslrRetenidoCompras": "2.1.03.003",
    "cuentaGananciaDiferencialCambiario": "4.1.01.002",
    "cuentaPerdidaDiferencialCambiario": "5.2.01.002",
    "cuentaIngresos": "4.1.01.001",
    "retencionIvaPorcentaje": 75,
    "retencionIslrPorcentaje": 2
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.activos_fijos (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  codigo TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categorias_activos (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.depreciaciones (
  id TEXT PRIMARY KEY,
  fecha TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.terminales_pos (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  banco_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lotes_pos (
  id TEXT PRIMARY KEY,
  terminal_id TEXT,
  fecha TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cuentas_cobrar_cxc (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cuentas_pagar_cxp (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cobranzas (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pagos_realizados (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. SEGURIDAD POR FILAS (RLS) Y POLÍTICAS DE ACCESO
-- ==============================================================================
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_contable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminales_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_cobrar_cxc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_pagar_cxp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_realizados ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cuentas_contables',
    'bancos',
    'movimientos_bancos',
    'comprobantes_diario',
    'configuracion_contable',
    'activos_fijos',
    'categorias_activos',
    'depreciaciones',
    'terminales_pos',
    'lotes_pos',
    'cuentas_cobrar_cxc',
    'cuentas_pagar_cxp',
    'cobranzas',
    'pagos_realizados'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acceso total a %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Acceso total a %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- ==============================================================================
-- 9. PUBLICACIÓN REALTIME PARA TESORERÍA Y CONTABILIDAD
-- ==============================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'beneficiaries',
    'payment_requests',
    'cuentas_contables',
    'bancos',
    'movimientos_bancos',
    'comprobantes_diario'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;

-- 10. Recargar esquema de PostgREST inmediatamente
NOTIFY pgrst, 'reload schema';
