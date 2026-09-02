import { useState, useEffect } from 'react';
import { PaymentRequest, UserProfile, UserRole, RequestStatus, CreatePaymentRequestInput, Beneficiary, AttachedFile } from './types';
import {
  fetchPaymentRequests,
  normalizePaymentRequest,
  createPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  updateRequestStatus,
  updateRequestSupportFile,
  updateRequestReceiptFile,
  requestModification,
  cancelModificationRequest,
  requestCancellation,
  cancelCancellationRequest,
  fetchUsers,
  createNewUser,
  toggleUserActiveStatus,
  updateUserPassword,
  updateUserRole,
  fetchBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
} from './services/dataService';
import { isSupabaseConfigured, supabase } from './services/supabase';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { HistoryView } from './components/HistoryView';
import { BeneficiariesView } from './components/BeneficiariesView';
import { BeneficiaryModal } from './components/BeneficiaryModal';
import { UserManagementView } from './components/UserManagementView';
import { LoginView } from './components/LoginView';
import { NewRequestModal } from './components/NewRequestModal';
import { StatusChangeModal } from './components/StatusChangeModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { ModificationRequestModal } from './components/ModificationRequestModal';
import { CancellationRequestModal } from './components/CancellationRequestModal';
import { NotificationDiagnosticsModal } from './components/NotificationDiagnosticsModal';
import { AuditorLoginView } from './components/AuditorLoginView';
import { AuditorView } from './components/AuditorView';
import { logAuditEvent } from './services/auditService';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { notificationService } from './services/notificationService';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const SESSION_STORAGE_KEY = 'jt_pagos_current_user_v1';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [beneficiariesList, setBeneficiariesList] = useState<Beneficiary[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'beneficiaries' | 'users'>('dashboard');
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PaymentRequest | null>(null);
  const [selectedRequestForStatus, setSelectedRequestForStatus] = useState<PaymentRequest | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<PaymentRequest | null>(null);
  const [modificationModalRequest, setModificationModalRequest] = useState<PaymentRequest | null>(null);
  const [cancellationModalRequest, setCancellationModalRequest] = useState<PaymentRequest | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Auditor Module State (/auditor)
  const [isAuditorRoute, setIsAuditorRoute] = useState<boolean>(() => {
    return window.location.pathname.toLowerCase().startsWith('/auditor') ||
           window.location.search.includes('view=auditor');
  });
  const [isAuditorLoggedIn, setIsAuditorLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('tp_super_auditor_user') === 'jhoansg';
  });

  useEffect(() => {
    const checkRoute = () => {
      const isAuditor = window.location.pathname.toLowerCase().startsWith('/auditor') ||
                        window.location.search.includes('view=auditor');
      setIsAuditorRoute(isAuditor);
      // Re-validar credencial exclusiva de super usuario al cambiar de ruta
      setIsAuditorLoggedIn(sessionStorage.getItem('tp_super_auditor_user') === 'jhoansg');
    };
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  const handleGoToMainFromAuditor = () => {
    window.history.pushState({}, '', '/');
    setIsAuditorRoute(false);
  };

  const handleAuditorLogout = () => {
    sessionStorage.removeItem('tp_super_auditor_user');
    sessionStorage.removeItem('tp_super_auditor_session');
    setIsAuditorLoggedIn(false);
  };

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load users and initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const uList = await fetchUsers();
        setUsersList(uList);

        const savedUserJson = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedUserJson) {
          try {
            const savedUser: UserProfile = JSON.parse(savedUserJson);
            const matchedUser = uList.find(u => u.id === savedUser.id || u.username === savedUser.username);
            if (matchedUser && matchedUser.is_active) {
              setCurrentUser(matchedUser);
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(matchedUser));
              const data = await fetchPaymentRequests(matchedUser);
              setRequests(data);
            } else if (!matchedUser && savedUser) {
              setCurrentUser(savedUser);
              const data = await fetchPaymentRequests(savedUser);
              setRequests(data);
            } else {
              setCurrentUser(null);
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          } catch (e) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Realtime Supabase Subscription & State Synchronization (Zero Polling, Minimal Egress)
  useEffect(() => {
    if (!currentUser) return;

    let channel: any = null;

    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('realtime_payment_requests_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payment_requests' },
          (payload: any) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setRequests(prev => prev.filter(r => r.id !== deletedId));
              }
            } else if (payload.eventType === 'INSERT') {
              const newRaw = payload.new;
              if (!newRaw) return;

              // RESTRICTION: Operador solo recibe sus propias solicitudes
              if (currentUser.role === 'operador' && newRaw.created_by !== currentUser.id) {
                return;
              }

              const normalized = normalizePaymentRequest(newRaw, undefined, currentUser);

              if (currentUser.role === 'admin') {
                const isUrgent = normalized.status === 'urgente';
                const notifTitle = isUrgent
                  ? `🔥 NUEVA SOLICITUD URGENTE #${normalized.locator || ''}`
                  : `🔔 Nueva Solicitud de Pago #${normalized.locator || ''}`;
                const notifBody = `${normalized.title || 'Servicio'} • Cliente: ${normalized.client || 'N/A'} • Monto: $${normalized.amount_usd || 0} USD`;

                notificationService.sendNotification(notifTitle, {
                  body: notifBody,
                  soundType: isUrgent ? 'urgent' : 'new_request',
                  tag: `new-req-${normalized.id}`
                });

                showToast(notifTitle, isUrgent ? 'error' : 'success');
              }

              // Actualizar estado local directamente (SIN descargar toda la BD)
              setRequests(prev => [normalized, ...prev.filter(r => r.id !== normalized.id)]);
            } else if (payload.eventType === 'UPDATE') {
              const updatedRaw = payload.new;
              const prevReq = payload.old;
              if (!updatedRaw) return;

              // RESTRICTION: Operador solo procesa sus propias solicitudes
              if (currentUser.role === 'operador' && updatedRaw.created_by !== currentUser.id) {
                setRequests(prev => prev.filter(r => r.id !== updatedRaw.id));
                return;
              }

              const normalized = normalizePaymentRequest(updatedRaw, undefined, currentUser);

              // 1. Alerta de Modificación Solicitada (para Administradores)
              if (
                normalized.modification_requested &&
                !prevReq?.modification_requested &&
                currentUser.role === 'admin'
              ) {
                const modTitle = `⚠️ Modificación Solicitada #${normalized.locator || ''}`;
                const modBody = `${normalized.modification_requested_by || 'Solicitante'}: ${normalized.modification_reason || 'Revisar detalles requeridos'}`;

                notificationService.sendNotification(modTitle, {
                  body: modBody,
                  soundType: 'modification',
                  tag: `mod-req-${normalized.id}`
                });

                showToast(modTitle, 'error');
              }

              // 2. Alerta de Solicitud Pagada / Liquidada (Para todos los usuarios y solicitantes)
              if (
                normalized.status === 'realizado' &&
                prevReq?.status !== 'realizado'
              ) {
                const isOwner = currentUser.id === normalized.created_by || currentUser.username === normalized.created_by;
                const paidTitle = `✅ ¡Solicitud Pagada #${normalized.locator || ''}!`;
                const paidBody = `${normalized.title || 'Servicio'} • Cliente: ${normalized.client || 'N/A'} • Monto: $${normalized.amount_usd || 0} USD ha sido liquidada con éxito.`;

                notificationService.sendNotification(paidTitle, {
                  body: paidBody,
                  soundType: 'paid',
                  tag: `paid-req-${normalized.id}`
                });

                showToast(
                  isOwner
                    ? `🎉 ¡Tu solicitud #${normalized.locator || ''} ha sido PAGADA con éxito!`
                    : `✅ Solicitud #${normalized.locator || ''} marcada como PAGADA`,
                  'success'
                );
              }

              // 3. Alerta de Solicitud Anulada
              if (
                normalized.status === 'anulado' &&
                prevReq?.status !== 'anulado'
              ) {
                const cancelTitle = `❌ Solicitud Anulada #${normalized.locator || ''}`;
                const cancelBody = `${normalized.title || 'Servicio'} • Cliente: ${normalized.client || 'N/A'} ha sido anulada.`;

                notificationService.sendNotification(cancelTitle, {
                  body: cancelBody,
                  soundType: 'modification',
                  tag: `cancel-req-${normalized.id}`
                });

                showToast(cancelTitle, 'error');
              }

              // Actualizar estado local directamente (SIN descargar toda la BD)
              setRequests(prev =>
                prev.map(r => (r.id === normalized.id ? { ...r, ...normalized } : r))
              );

              // Si está abierto el modal de detalles de esta solicitud, actualizarlo
              setSelectedRequestForDetail(prev =>
                prev && prev.id === normalized.id ? { ...prev, ...normalized } : prev
              );
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'beneficiaries' },
          (payload: any) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setBeneficiariesList(prev => prev.filter(b => b.id !== deletedId));
              }
            } else if (payload.eventType === 'INSERT') {
              if (payload.new) {
                setBeneficiariesList(prev => [payload.new, ...prev.filter(b => b.id !== payload.new.id)]);
              }
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new) {
                setBeneficiariesList(prev =>
                  prev.map(b => (b.id === payload.new.id ? { ...b, ...payload.new } : b))
                );
              }
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser]);

  // Función para abrir automáticamente la ficha de solicitud (Deep Link desde Push o URL)
  const openRequestById = async (reqId: string, user: UserProfile) => {
    if (!reqId) return;

    // 1. Buscar en la lista actual cargada
    let target = requests.find(r => r.id === reqId || r.locator === reqId);

    // 2. Si no está en memoria, consultar la lista fresca de Supabase
    if (!target) {
      try {
        const freshList = await fetchPaymentRequests(user);
        setRequests(freshList);
        target = freshList.find(r => r.id === reqId || r.locator === reqId);
      } catch (e) {
        console.warn('Error buscando solicitud para detalle:', e);
      }
    }

    if (target) {
      setActiveTab(target.status === 'realizado' ? 'history' : 'dashboard');
      setSelectedRequestForDetail(target);
    }
  };

  // Manejar apertura automática al hacer clic en notificación (URL ?request=ID)
  useEffect(() => {
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const reqParam = params.get('request') || params.get('requestId') || params.get('id') || params.get('locator');

    if (reqParam) {
      openRequestById(reqParam, currentUser);
      // Limpiar parámetro de la URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser]);

  // Escuchar mensaje del Service Worker cuando la app ya estaba abierta en segundo plano
  useEffect(() => {
    if (!currentUser) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OPEN_REQUEST_DETAIL' && event.data.requestId) {
        openRequestById(event.data.requestId, currentUser);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [currentUser, requests]);

  // Fetch payment requests and beneficiaries when currentUser changes
  const loadRequests = async (user: UserProfile) => {
    try {
      setLoading(true);
      const [data, bens] = await Promise.all([
        fetchPaymentRequests(user),
        fetchBeneficiaries()
      ]);
      setRequests(data);
      setBeneficiariesList(bens);
    } catch (err: any) {
      showToast(`Error al cargar solicitudes: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateBeneficiary = () => {
    setEditingBeneficiary(null);
    setIsBeneficiaryModalOpen(true);
  };

  const handleOpenEditBeneficiary = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setIsBeneficiaryModalOpen(true);
  };

  const handleSaveBeneficiary = async (data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingBeneficiary) {
        const updated = await updateBeneficiary(editingBeneficiary.id, data);
        setBeneficiariesList(prev => prev.map(b => b.id === editingBeneficiary.id ? updated : b));
        showToast(`Beneficiario "${updated.name}" actualizado con éxito`, 'success');
      } else {
        const created = await createBeneficiary(data);
        setBeneficiariesList(prev => [created, ...prev]);
        showToast(`Beneficiario "${created.name}" registrado con éxito`, 'success');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleDeleteBeneficiary = async (id: string) => {
    const ben = beneficiariesList.find(b => b.id === id);
    try {
      await deleteBeneficiary(id);
      setBeneficiariesList(prev => prev.filter(b => b.id !== id));
      showToast('Beneficiario eliminado del directorio', 'success');

      logAuditEvent({
        action_type: 'delete_beneficiary',
        user: currentUser,
        target_id: id,
        target_title: ben?.name || 'Beneficiario',
        details: `El usuario ${currentUser?.full_name || 'Admin'} eliminó al beneficiario "${ben?.name || id}" del directorio.`,
        metadata: { name: ben?.name, rif: ben?.rif }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);

    // Si no es el super usuario jhoansg, aislar y borrar credencial de auditor
    if (user.username?.toLowerCase() !== 'jhoansg') {
      sessionStorage.removeItem('tp_super_auditor_user');
      sessionStorage.removeItem('tp_super_auditor_session');
      setIsAuditorLoggedIn(false);
    } else {
      sessionStorage.setItem('tp_super_auditor_user', 'jhoansg');
      setIsAuditorLoggedIn(true);
    }

    loadRequests(user);
    showToast(`Bienvenido(a), ${user.full_name}`, 'success');

    logAuditEvent({
      action_type: 'login',
      user: user,
      details: `Inicio de sesión exitoso: ${user.full_name} (@${user.username}) con rol ${user.role.toUpperCase()}.`,
      metadata: { username: user.username, role: user.role }
    }).catch(console.warn);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem('tp_super_auditor_user');
    sessionStorage.removeItem('tp_super_auditor_session');
    setIsAuditorLoggedIn(false);
    setCurrentUser(null);
    setRequests([]);
    setActiveTab('dashboard');
    showToast('Sesión cerrada correctamente', 'success');
  };

  // Create or Update payment request handler
  const handleSaveRequest = async (input: CreatePaymentRequestInput) => {
    if (!currentUser) return;
    try {
      if (editingRequest) {
        const updated = await updatePaymentRequest(editingRequest.id, input, currentUser);
        setRequests(prev => prev.map(r => r.id === editingRequest.id ? updated : r));
        showToast(`Solicitud LOC: #${updated.locator} actualizada exitosamente`, 'success');

        logAuditEvent({
          action_type: 'update_request',
          user: currentUser,
          target_id: updated.locator,
          target_title: updated.title,
          details: `El administrador ${currentUser.full_name} modificó los datos de la solicitud #${updated.locator} (Cliente: ${updated.client}, Monto: $${updated.amount_usd} USD).`,
          metadata: { locator: updated.locator, client: updated.client, amount_usd: updated.amount_usd, category: updated.category }
        }).catch(console.warn);
      } else {
        const newReq = await createPaymentRequest(input, currentUser);
        setRequests(prev => [newReq, ...prev]);
        showToast(`Solicitud LOC: #${newReq.locator} creada exitosamente`, 'success');

        logAuditEvent({
          action_type: 'create_request',
          user: currentUser,
          target_id: newReq.locator,
          target_title: newReq.title,
          details: `Solicitud #${newReq.locator} creada por ${currentUser.full_name} para el cliente "${newReq.client}" (${newReq.category?.toUpperCase() || 'HOSPEDAJE'}). Monto: $${newReq.amount_usd} USD / Bs. ${newReq.amount_bs || 0}.`,
          metadata: { locator: newReq.locator, client: newReq.client, category: newReq.category, amount_usd: newReq.amount_usd, status: newReq.status }
        }).catch(console.warn);
      }
      setEditingRequest(null);
    } catch (err: any) {
      showToast(`Error al guardar la solicitud: ${err.message}`, 'error');
      throw err;
    }
  };

  // Delete payment request handler
  const handleDeleteRequest = async (request: PaymentRequest) => {
    if (!currentUser) return;
    try {
      await deletePaymentRequest(request.id, currentUser);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      showToast(`Solicitud LOC: #${request.locator} eliminada`, 'success');

      logAuditEvent({
        action_type: 'delete_request',
        user: currentUser,
        target_id: request.locator,
        target_title: request.title,
        details: `ALERTA DE SEGURIDAD: El administrador ${currentUser.full_name} eliminó permanentemente la solicitud #${request.locator} (Cliente: "${request.client}", Monto: $${request.amount_usd} USD).`,
        metadata: { locator: request.locator, client: request.client, amount_usd: request.amount_usd, category: request.category }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error al eliminar solicitud: ${err.message}`, 'error');
    }
  };

  // Status change handler
  const handleConfirmStatusChange = async (
    requestId: string,
    newStatus: RequestStatus,
    receiptFiles?: (File | AttachedFile)[] | File | null,
    originBank?: string
  ) => {
    try {
      const updatedReq = await updateRequestStatus(requestId, newStatus, receiptFiles, originBank);
      setRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
      
      const statusLabels: Record<RequestStatus, string> = {
        urgente: 'URGENTE',
        en_proceso: 'En Proceso',
        realizado: 'Realizado (Enviado a Historial)',
        anulado: 'Anulado (Enviado a Historial con Saldo $0)'
      };

      showToast(`Estado actualizado a "${statusLabels[newStatus]}"`, 'success');

      logAuditEvent({
        action_type: 'status_change',
        user: currentUser,
        target_id: updatedReq.locator,
        target_title: updatedReq.title,
        details: `Estado de la solicitud #${updatedReq.locator} cambiado a "${statusLabels[newStatus]}" por ${currentUser?.full_name || 'Admin'}.${originBank ? ` Banco Emisor: ${originBank}.` : ''}${receiptFiles ? ' Con comprobante(s) adjunto(s).' : ''}`,
        metadata: { locator: updatedReq.locator, new_status: newStatus, origin_bank: originBank }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  // Create user handler
  const handleCreateUser = async (userData: Omit<UserProfile, 'id' | 'created_at'>) => {
    try {
      const newUser = await createNewUser(userData);
      setUsersList(prev => [newUser, ...prev]);
      showToast(`Usuario "${newUser.full_name}" registrado con éxito`, 'success');

      logAuditEvent({
        action_type: 'create_user',
        user: currentUser,
        target_id: newUser.username,
        target_title: newUser.full_name,
        details: `El administrador ${currentUser?.full_name || 'Admin'} registró un nuevo usuario: "${newUser.full_name}" (@${newUser.username}) con rol ${newUser.role.toUpperCase()}.`,
        metadata: { username: newUser.username, role: newUser.role }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error al registrar usuario: ${err.message}`, 'error');
      throw err;
    }
  };

  // Toggle user active handler
  const handleToggleUserActive = async (userId: string) => {
    try {
      const updated = await toggleUserActiveStatus(userId);
      setUsersList(prev => prev.map(u => u.id === userId ? updated : u));
      showToast(`Estado del usuario actualizado`, 'success');

      logAuditEvent({
        action_type: 'toggle_user_status',
        user: currentUser,
        target_id: updated.username,
        target_title: updated.full_name,
        details: `El administrador ${currentUser?.full_name || 'Admin'} cambió el estado del usuario "${updated.full_name}" a ${updated.is_active ? 'ACTIVO' : 'INACTIVO'}.`,
        metadata: { username: updated.username, is_active: updated.is_active }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Update user password handler
  const handleUpdateUserPassword = async (userId: string, newPass: string) => {
    try {
      const updated = await updateUserPassword(userId, newPass);
      setUsersList(prev => prev.map(u => (u.id === userId ? updated : u)));
      showToast(`Contraseña actualizada con éxito para "${updated.full_name}".`, 'success');

      logAuditEvent({
        action_type: 'change_password',
        user: currentUser,
        target_id: updated.username,
        target_title: updated.full_name,
        details: `El administrador ${currentUser?.full_name || 'Admin'} actualizó la contraseña del usuario "${updated.full_name}" (@${updated.username}).`,
        metadata: { username: updated.username }
      }).catch(console.warn);
    } catch (e: any) {
      showToast(e.message || 'Error al cambiar la contraseña', 'error');
      throw e;
    }
  };

  // Update user role handler
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsersList(prev => prev.map(u => (u.id === userId ? updated : u)));
      if (currentUser?.id === userId) {
        setCurrentUser(updated);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      }
      showToast(`Rol actualizado a "${newRole.toUpperCase()}" para "${updated.full_name}".`, 'success');

      logAuditEvent({
        action_type: 'create_user',
        user: currentUser,
        target_id: updated.username,
        target_title: updated.full_name,
        details: `El administrador ${currentUser?.full_name || 'Admin'} modificó el rol del usuario "${updated.full_name}" a ${newRole.toUpperCase()}.`,
        metadata: { username: updated.username, new_role: newRole }
      }).catch(console.warn);
    } catch (e: any) {
      showToast(e.message || 'Error al cambiar el rol del usuario', 'error');
      throw e;
    }
  };

  // Request Modification handler
  const handleRequestModification = (request: PaymentRequest) => {
    setModificationModalRequest(request);
  };

  const handleConfirmModification = async (requestId: string, reason: string) => {
    if (!currentUser) return;
    try {
      const updated = await requestModification(requestId, reason, currentUser);
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      if (selectedRequestForDetail?.id === requestId) {
        setSelectedRequestForDetail(updated);
      }
      showToast(`Solicitud de modificación enviada al administrador`, 'success');

      logAuditEvent({
        action_type: 'request_modification',
        user: currentUser,
        target_id: updated.locator,
        target_title: updated.title,
        details: `El solicitante ${currentUser.full_name} solicitó modificar la solicitud #${updated.locator}. Observación: "${reason}".`,
        metadata: { locator: updated.locator, reason }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleCancelModification = async (request: PaymentRequest) => {
    if (!currentUser) return;
    try {
      const updated = await cancelModificationRequest(request.id);
      setRequests(prev => prev.map(r => r.id === request.id ? updated : r));
      if (selectedRequestForDetail?.id === request.id) {
        setSelectedRequestForDetail(updated);
      }
      showToast(`Solicitud de modificación cancelada / descartada`, 'success');

      logAuditEvent({
        action_type: 'cancel_modification',
        user: currentUser,
        target_id: request.locator,
        target_title: request.title,
        details: `El usuario ${currentUser.full_name} canceló/descartó la petición de modificación para la solicitud #${request.locator}.`,
        metadata: { locator: request.locator }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Request Cancellation handler
  const handleRequestCancellation = (request: PaymentRequest) => {
    setCancellationModalRequest(request);
  };

  const handleConfirmCancellation = async (requestId: string, reason: string) => {
    if (!currentUser) return;
    try {
      const updated = await requestCancellation(requestId, reason, currentUser);
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      if (selectedRequestForDetail?.id === requestId) {
        setSelectedRequestForDetail(updated);
      }
      showToast(`Solicitud de anulación enviada al administrador`, 'success');

      logAuditEvent({
        action_type: 'request_cancellation',
        user: currentUser,
        target_id: updated.locator,
        target_title: updated.title,
        details: `El solicitante ${currentUser.full_name} solicitó ANULAR la solicitud #${updated.locator}. Motivo: "${reason}".`,
        metadata: { locator: updated.locator, reason }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleCancelCancellation = async (request: PaymentRequest) => {
    if (!currentUser) return;
    try {
      const updated = await cancelCancellationRequest(request.id);
      setRequests(prev => prev.map(r => r.id === request.id ? updated : r));
      if (selectedRequestForDetail?.id === request.id) {
        setSelectedRequestForDetail(updated);
      }
      showToast(`Solicitud de anulación cancelada / descartada`, 'success');

      logAuditEvent({
        action_type: 'cancel_cancellation',
        user: currentUser,
        target_id: request.locator,
        target_title: request.title,
        details: `El usuario ${currentUser.full_name} descartó la petición de anulación para la solicitud #${request.locator}.`,
        metadata: { locator: request.locator }
      }).catch(console.warn);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Update Support File handler
  const handleUpdateSupportFile = async (requestId: string, file: File) => {
    if (!currentUser) return;
    try {
      const updated = await updateRequestSupportFile(requestId, file, currentUser);
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      if (selectedRequestForDetail?.id === requestId) {
        setSelectedRequestForDetail(updated);
      }
      showToast(`Soporte de pago actualizado con éxito`, 'success');
    } catch (err: any) {
      showToast(`Error al actualizar soporte: ${err.message}`, 'error');
      throw err;
    }
  };

  // Update Receipt File handler
  const handleUpdateReceiptFile = async (requestId: string, file: File) => {
    if (!currentUser) return;
    try {
      const updated = await updateRequestReceiptFile(requestId, file, currentUser);
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      if (selectedRequestForDetail?.id === requestId) {
        setSelectedRequestForDetail(updated);
      }
      showToast(`Comprobante de pago actualizado con éxito`, 'success');
    } catch (err: any) {
      showToast(`Error al actualizar comprobante: ${err.message}`, 'error');
      throw err;
    }
  };

  // Render Auditor Sub-Page (/auditor)
  if (isAuditorRoute) {
    if (!isAuditorLoggedIn) {
      return (
        <AuditorLoginView
          onLoginSuccess={() => setIsAuditorLoggedIn(true)}
          onGoToMain={handleGoToMainFromAuditor}
        />
      );
    }
    return (
      <AuditorView
        onLogout={handleAuditorLogout}
        onGoToMain={handleGoToMainFromAuditor}
      />
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} availableUsers={usersList} />;
  }

  const handleOpenNewRequest = () => {
    setEditingRequest(null);
    setIsNewRequestOpen(true);
  };

  const handleOpenEditRequest = (request: PaymentRequest) => {
    setEditingRequest(request);
    setIsNewRequestOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRequest={handleOpenNewRequest}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Supabase Status Banner Indicator if not configured */}
      {!isSupabaseConfigured && (
        <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-1.5 text-center text-[11px] text-indigo-700 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            <strong>Modo Local de Pruebas Activo</strong> • Para conectar Supabase en producción, agrega tus variables <code className="bg-white border border-indigo-200 px-1 py-0.5 rounded text-indigo-800 font-mono">VITE_SUPABASE_URL</code> en <code className="bg-white border border-indigo-200 px-1 py-0.5 rounded text-indigo-800 font-mono">.env</code>.
          </span>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5">
        <PWAInstallBanner />
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
            <span>Cargando sistema TP PAGOS PRO...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                requests={requests}
                currentUser={currentUser}
                onOpenDetails={(req) => setSelectedRequestForDetail(req)}
                onOpenStatusModal={(req) => setSelectedRequestForStatus(req)}
                onOpenNewRequest={handleOpenNewRequest}
                onOpenBeneficiaries={() => setActiveTab('beneficiaries')}
                onEditRequest={handleOpenEditRequest}
                onDeleteRequest={currentUser.role === 'admin' ? handleDeleteRequest : undefined}
                onRequestModification={handleRequestModification}
                onCancelModification={handleCancelModification}
                onRequestCancellation={handleRequestCancellation}
                onCancelCancellation={handleCancelCancellation}
                onRefresh={() => loadRequests(currentUser)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                requests={requests}
                currentUser={currentUser}
                onOpenDetails={(req) => setSelectedRequestForDetail(req)}
              />
            )}

            {activeTab === 'beneficiaries' && (
              <BeneficiariesView
                beneficiaries={beneficiariesList}
                onOpenCreate={handleOpenCreateBeneficiary}
                onOpenEdit={handleOpenEditBeneficiary}
                onDelete={handleDeleteBeneficiary}
              />
            )}

            {activeTab === 'users' && (
              <UserManagementView
                users={usersList}
                currentUser={currentUser}
                onCreateUser={handleCreateUser}
                onToggleUserActive={handleToggleUserActive}
                onUpdatePassword={handleUpdateUserPassword}
                onUpdateRole={handleUpdateUserRole}
              />
            )}
          </>
        )}
      </main>

      {/* Toast Notification Floating Alert */}
      {toast && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-900/30'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-900/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewRequestModal
        isOpen={isNewRequestOpen}
        editingRequest={editingRequest}
        beneficiaries={beneficiariesList}
        onClose={() => {
          setIsNewRequestOpen(false);
          setEditingRequest(null);
        }}
        onSubmit={handleSaveRequest}
      />

      <StatusChangeModal
        request={selectedRequestForStatus}
        isOpen={Boolean(selectedRequestForStatus)}
        onClose={() => setSelectedRequestForStatus(null)}
        onConfirmStatusChange={handleConfirmStatusChange}
      />

      <RequestDetailModal
        request={selectedRequestForDetail}
        currentUser={currentUser}
        isOpen={Boolean(selectedRequestForDetail)}
        onClose={() => setSelectedRequestForDetail(null)}
        onEditRequest={handleOpenEditRequest}
        onRequestModification={handleRequestModification}
        onCancelModification={handleCancelModification}
        onRequestCancellation={handleRequestCancellation}
        onCancelCancellation={handleCancelCancellation}
        onUpdateSupportFile={handleUpdateSupportFile}
        onUpdateReceiptFile={handleUpdateReceiptFile}
      />

      <ModificationRequestModal
        request={modificationModalRequest}
        isOpen={Boolean(modificationModalRequest)}
        onClose={() => setModificationModalRequest(null)}
        onConfirm={handleConfirmModification}
      />

      <CancellationRequestModal
        request={cancellationModalRequest}
        isOpen={Boolean(cancellationModalRequest)}
        onClose={() => setCancellationModalRequest(null)}
        onConfirm={handleConfirmCancellation}
      />

      <BeneficiaryModal
        isOpen={isBeneficiaryModalOpen}
        editingBeneficiary={editingBeneficiary}
        onClose={() => {
          setIsBeneficiaryModalOpen(false);
          setEditingBeneficiary(null);
        }}
        onSave={handleSaveBeneficiary}
      />

      <NotificationDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
