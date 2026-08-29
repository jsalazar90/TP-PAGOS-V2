import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Power,
  X,
  Check,
  AtSign,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  UserCog
} from 'lucide-react';

interface UserManagementViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onCreateUser: (userData: Omit<UserProfile, 'id' | 'created_at'>) => Promise<void>;
  onToggleUserActive: (userId: string) => Promise<void>;
  onUpdatePassword: (userId: string, newPassword: string) => Promise<void>;
  onUpdateRole?: (userId: string, newRole: UserRole) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onCreateUser,
  onToggleUserActive,
  onUpdatePassword,
  onUpdateRole,
}) => {
  const visibleUsers = users.filter(u => (u.username || '').toLowerCase() !== 'jhoansg');
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('solicitante');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Change Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Role Change Modal State
  const [roleModalUser, setRoleModalUser] = useState<UserProfile | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('solicitante');

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-700 space-y-1 shadow-card">
        <h2 className="text-base font-bold">Acceso Restringido</h2>
        <p className="text-xs">Solo los usuarios con rol de Administrador pueden acceder a este módulo.</p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim().toLowerCase();
    if (!fullName || !cleanUsername || !password) {
      setErrorMsg('Por favor completa todos los campos requeridos (*), incluyendo la Contraseña');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      setLoading(true);
      await onCreateUser({
        username: cleanUsername,
        full_name: fullName,
        email: `${cleanUsername}@tppagos.com`,
        role: role,
        password: password,
        is_active: true,
      });
      setSuccessMsg(`Usuario "${fullName}" (@${cleanUsername}) creado exitosamente con su contraseña de acceso.`);
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('solicitante');
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passwordModalUser) return;

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    try {
      setLoading(true);
      await onUpdatePassword(passwordModalUser.id, newPassword);
      setSuccessMsg(`Contraseña actualizada con éxito para @${passwordModalUser.username}.`);
      setPasswordModalUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!roleModalUser || !onUpdateRole) return;

    try {
      setLoading(true);
      await onUpdateRole(roleModalUser.id, selectedNewRole);
      setSuccessMsg(`Rol actualizado con éxito a "${selectedNewRole.toUpperCase()}" para @${roleModalUser.username}.`);
      setRoleModalUser(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-16 md:pb-6">
      {/* Header Banner */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00b4a2]" />
            <span>Gestión de Usuarios</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#009b8b] border border-teal-200">
              {visibleUsers.length} registrados
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Panel exclusivo de administración para dar de alta usuarios, asignar contraseña y definir roles.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="active-press flex items-center justify-center gap-1.5 bg-[#00b4a2] hover:bg-[#009b8b] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-2xs shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {visibleUsers.map((u) => (
          <div
            key={u.id}
            className={`bg-white p-3.5 rounded-2xl border shadow-card transition-all flex flex-col justify-between ${
              u.is_active ? 'border-slate-200/80 hover:border-slate-300' : 'border-rose-200 opacity-60'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-sm flex items-center justify-center border border-indigo-100">
                    {u.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{u.full_name}</h3>
                    <p className="text-[11px] text-indigo-700 font-mono font-bold flex items-center gap-0.5">
                      <AtSign className="w-3 h-3 text-indigo-500" />
                      <span>{u.username || u.email.split('@')[0]}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                    u.role === 'admin'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : u.role === 'operador'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {u.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3 h-3" /> Administrador
                    </>
                  ) : u.role === 'operador' ? (
                    <>
                      <UserCog className="w-3 h-3" /> Operador
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3" /> Solicitante
                    </>
                  )}
                </span>

                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {u.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
              {onUpdateRole && (
                <button
                  onClick={() => {
                    setRoleModalUser(u);
                    setSelectedNewRole(u.role);
                    setErrorMsg('');
                  }}
                  className="active-press px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors shadow-2xs"
                  title="Cambiar rol o permisos de este usuario"
                >
                  <UserCog className="w-3 h-3 text-indigo-600" />
                  <span>Cambiar Rol</span>
                </button>
              )}

              <button
                onClick={() => {
                  setPasswordModalUser(u);
                  setNewPassword('');
                  setConfirmPassword('');
                  setErrorMsg('');
                  setShowNewPassword(false);
                }}
                className="active-press px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors shadow-2xs"
                title="Cambiar contraseña de este usuario"
              >
                <KeyRound className="w-3 h-3 text-amber-600" />
                <span>Cambiar Clave</span>
              </button>

              {u.id !== currentUser.id && (
                <button
                  onClick={() => onToggleUserActive(u.id)}
                  className={`active-press px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    u.is_active
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{u.is_active ? 'Desactivar' : 'Activar'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Creating New User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-4 shadow-modal space-y-3 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Crear Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Cerrar modal"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Nombre de Usuario (Login) *</label>
                <div className="relative">
                  <span className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 font-bold font-mono">@</span>
                  <input
                    type="text"
                    placeholder="Ej. maria, admin, alejandro"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Nombre Completo *</label>
                <input
                  type="text"
                  placeholder="Ej. María Delgado"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Contraseña de Acceso *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 4 caracteres..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-16 py-1.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 text-[10px] font-bold bg-slate-200/80 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Ver
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-0.5">Rol del Sistema *</label>
                <select
                  aria-label="Rol del sistema"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="solicitante">Solicitante (Crear y consultar solicitudes generales)</option>
                  <option value="operador">Operador (Limitado: solo sus propias solicitudes y pagos recibidos)</option>
                  <option value="admin">Administrador (Acceso total, gestión de estados e historial)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="active-press px-4 py-2 rounded-xl bg-[#00b4a2] hover:bg-[#009b8b] text-white font-bold text-xs shadow-2xs disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Changing User Password */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-modal space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Cambiar Contraseña</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Usuario: <strong className="text-slate-800">@{passwordModalUser.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                aria-label="Cerrar modal"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nueva Contraseña *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 4 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2] font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Confirmar Nueva Contraseña *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#00b4a2] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="active-press bg-[#00b4a2] hover:bg-[#009b8b] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{loading ? 'Guardando...' : 'Actualizar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Changing User Role */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-modal space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Modificar Rol de Usuario</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Usuario: <strong className="text-slate-800">@{roleModalUser.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                aria-label="Cerrar modal"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveNewRole} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Seleccionar Nuevo Rol *</label>
                <select
                  aria-label="Nuevo rol"
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="solicitante">Solicitante (Crear y consultar solicitudes generales)</option>
                  <option value="operador">Operador (Limitado: solo sus propias solicitudes y pagos recibidos)</option>
                  <option value="admin">Administrador (Acceso total, gestión de estados e historial)</option>
                </select>
              </div>

              {roleModalUser.id === currentUser.id && selectedNewRole !== 'admin' && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                  ⚠️ Atención: Si cambias tu propio rol a no-administrador, perderás el acceso a este panel de administración.
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedNewRole === roleModalUser.role}
                  className="active-press bg-[#00b4a2] hover:bg-[#009b8b] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  <span>{loading ? 'Guardando...' : 'Actualizar Rol'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
