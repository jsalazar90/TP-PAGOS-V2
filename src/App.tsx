import { useState, useEffect } from 'react';
import { PaymentRequest, UserProfile, RequestStatus, CreatePaymentRequestInput, Beneficiary } from './types';
import {
  fetchPaymentRequests,
  createPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  updateRequestStatus,
  updateRequestSupportFile,
  updateRequestReceiptFile,
  requestModification,
  cancelModificationRequest,
  fetchUsers,
  createNewUser,
  toggleUserActiveStatus,
  updateUserPassword,
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
import { NotificationDiagnosticsModal } from './components/NotificationDiagnosticsModal';
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
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

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

  // Realtime Supabase Subscription & Visibility Sync
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
              const newReq = payload.new;
              if (currentUser.role === 'admin') {
                const isUrgent = newReq?.status === 'urgente';
                const notifTitle = isUrgent
                  ? `🔥 NUEVA SOLICITUD URGENTE #${newReq?.locator || ''}`
                  : `🔔 Nueva Solicitud de Pago #${newReq?.locator || ''}`;
                const notifBody = `${newReq?.title || 'Servicio'} • Cliente: ${newReq?.client || 'N/A'} • Monto: $${newReq?.amount_usd || 0} USD`;

                notificationService.sendNotification(notifTitle, {
                  body: notifBody,
                  soundType: isUrgent ? 'urgent' : 'new_request',
                  tag: `new-req-${newReq?.id}`
                });

                showToast(notifTitle, isUrgent ? 'error' : 'success');
              }
              fetchPaymentRequests(currentUser).then(data => {
                setRequests(data);
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedReq = payload.new;
              const prevReq = payload.old;

              // Si se solicitó una nueva modificación y el usuario es admin
              if (
                updatedReq?.modification_requested &&
                !prevReq?.modification_requested &&
                currentUser.role === 'admin'
              ) {
                const modTitle = `⚠️ Modificación Solicitada #${updatedReq?.locator || ''}`;
                const modBody = `${updatedReq?.modification_requested_by || 'Solicitante'}: ${updatedReq?.modification_reason || 'Revisar detalles requeridos'}`;

                notificationService.sendNotification(modTitle, {
                  body: modBody,
                  soundType: 'modification',
                  tag: `mod-req-${updatedReq?.id}`
                });

                showToast(modTitle, 'error');
              }

              fetchPaymentRequests(currentUser).then(data => {
                setRequests(data);
              });
            } else {
              fetchPaymentRequests(currentUser).then(data => {
                setRequests(data);
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'beneficiaries' },
          () => {
            fetchBeneficiaries().then(bens => {
              setBeneficiariesList(bens);
            });
          }
        )
        .subscribe();
    }

    // Auto sync on tab focus or screen unlock
    const handleSync = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        fetchPaymentRequests(currentUser).then(data => {
          setRequests(data);
        });
        fetchBeneficiaries().then(bens => {
          setBeneficiariesList(bens);
        });
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // Heartbeat poll every 20 seconds as fallback
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && currentUser) {
        fetchPaymentRequests(currentUser).then(data => {
          setRequests(data);
        });
        fetchBeneficiaries().then(bens => {
          setBeneficiariesList(bens);
        });
      }
    }, 20000);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      clearInterval(interval);
    };
  }, [currentUser]);

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
    try {
      await deleteBeneficiary(id);
      setBeneficiariesList(prev => prev.filter(b => b.id !== id));
      showToast('Beneficiario eliminado del directorio', 'success');
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    loadRequests(user);
    showToast(`Bienvenido(a), ${user.full_name}`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
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
      } else {
        const newReq = await createPaymentRequest(input, currentUser);
        setRequests(prev => [newReq, ...prev]);
        showToast(`Solicitud LOC: #${newReq.locator} creada exitosamente`, 'success');
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
    } catch (err: any) {
      showToast(`Error al eliminar solicitud: ${err.message}`, 'error');
    }
  };

  // Status change handler
  const handleConfirmStatusChange = async (
    requestId: string,
    newStatus: RequestStatus,
    receiptFile?: File | null,
    originBank?: string
  ) => {
    try {
      const updatedReq = await updateRequestStatus(requestId, newStatus, receiptFile, originBank);
      setRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
      
      const statusLabels: Record<RequestStatus, string> = {
        px_fondos: 'PxFondos',
        en_proceso: 'En Proceso',
        urgente: 'URGENTE',
        realizado: 'Realizado (Enviado a Historial)'
      };

      showToast(`Estado actualizado a "${statusLabels[newStatus]}"`, 'success');
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
    } catch (e: any) {
      showToast(e.message || 'Error al cambiar la contraseña', 'error');
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
                onDeleteRequest={handleDeleteRequest}
                onRequestModification={handleRequestModification}
                onCancelModification={handleCancelModification}
                onRefresh={() => loadRequests(currentUser)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                requests={requests}
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
        onUpdateSupportFile={handleUpdateSupportFile}
        onUpdateReceiptFile={handleUpdateReceiptFile}
      />

      <ModificationRequestModal
        request={modificationModalRequest}
        isOpen={Boolean(modificationModalRequest)}
        onClose={() => setModificationModalRequest(null)}
        onConfirm={handleConfirmModification}
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
