import React from 'react';
import { Navigate } from 'react-router-dom';

export default function BanksMenu() {
  return <Navigate to="/banks/cuentas" replace />;
}
