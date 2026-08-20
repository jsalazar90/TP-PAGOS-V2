import React from 'react';
import { RequestStatus } from '../types';
import { Wallet, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    px_fondos: {
      label: 'PxFondos',
      bg: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
      icon: Wallet,
      dotBg: 'bg-amber-500',
    },
    en_proceso: {
      label: 'En Proceso',
      bg: 'bg-blue-50 text-blue-800 border-blue-300 font-semibold',
      icon: RefreshCw,
      dotBg: 'bg-blue-500',
    },
    urgente: {
      label: 'URGENTE',
      bg: 'bg-rose-100 text-rose-900 border-rose-400 font-black shadow-2xs',
      icon: AlertTriangle,
      dotBg: 'bg-rose-600',
    },
    realizado: {
      label: 'Realizado',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
      icon: CheckCircle2,
      dotBg: 'bg-emerald-500',
    },
  };

  const currentConfig = config[status] || config.px_fondos;
  const { label, bg, icon: Icon, dotBg } = currentConfig;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs ${bg} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotBg} animate-pulse`} />
      <Icon className="w-3 h-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
};
