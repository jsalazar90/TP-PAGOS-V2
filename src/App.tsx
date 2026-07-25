import { useState, useEffect } from 'react';
import { PaymentRequest, UserProfile, RequestStatus, CreatePaymentRequestInput } from './types';
import {
  fetchPaymentRequests,
  createPaymentRequest,
  updateRequestStatus,
  fetchUsers,
  createNewUser,
  toggleUserActiveStatus
} from './services/dataService';
import { isSupabaseConfigured } from './services/supabase';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { HistoryView } from './components/HistoryView';
import { UserManagementView } from './components/UserManagementView';
import { LoginView } from './components/LoginView';
import { NewRequestModal } from './components/NewRequestModal';
import { StatusChangeModal } from './components/StatusChangeModal';
import { RequestDetailModal } from './components/RequestDetailModal';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'users'>('dashboard');

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedRequestForStatus, setSelectedRequestForStatus] = useState<PaymentRequest | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<PaymentRequest | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load users and initial data
  useEffect(() => {
    const loadInitialUsers = async () => {
      try {
        const uList = await fetchUsers();
        setUsersList(uList);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialUsers();
  }, []);

  // Fetch payment requests when currentUser changes
  const loadRequests = async (user: UserProfile) => {
    try {
      setLoading(true);
      const data = await fetchPaymentRequests(user);
      setRequests(data);
    } catch (err: any) {
      showToast(`Error al cargar solicitudes: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    loadRequests(user);
    showToast(`Bienvenido(a), ${user.full_name}`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setRequests([]);
    setActiveTab('dashboard');
    showToast('Sesión cerrada correctamente', 'success');
  };



  // Create payment request handler
  const handleCreateRequest = async (input: CreatePaymentRequestInput) => {
    if (!currentUser) return;
    try {
      const newReq = await createPaymentRequest(input, currentUser);
      setRequests(prev => [newReq, ...prev]);
      showToast(`Solicitud LOC: #${newReq.locator} creada exitosamente`, 'success');
    } catch (err: any) {
      showToast(`Error al crear la solicitud: ${err.message}`, 'error');
      throw err;
    }
  };

  // Status change handler
  const handleConfirmStatusChange = async (
    requestId: string,
    newStatus: RequestStatus,
    receiptFile?: File | null
  ) => {
    try {
      const updatedReq = await updateRequestStatus(requestId, newStatus, receiptFile);
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

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} availableUsers={usersList} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRequest={() => setIsNewRequestOpen(true)}
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
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
                onRefresh={() => loadRequests(currentUser)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                requests={requests}
                onOpenDetails={(req) => setSelectedRequestForDetail(req)}
              />
            )}

            {activeTab === 'users' && (
              <UserManagementView
                users={usersList}
                currentUser={currentUser}
                onCreateUser={handleCreateUser}
                onToggleUserActive={handleToggleUserActive}
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
        onClose={() => setIsNewRequestOpen(false)}
        onSubmit={handleCreateRequest}
      />

      <StatusChangeModal
        request={selectedRequestForStatus}
        isOpen={Boolean(selectedRequestForStatus)}
        onClose={() => setSelectedRequestForStatus(null)}
        onConfirmStatusChange={handleConfirmStatusChange}
      />

      <RequestDetailModal
        request={selectedRequestForDetail}
        isOpen={Boolean(selectedRequestForDetail)}
        onClose={() => setSelectedRequestForDetail(null)}
      />
    </div>
  );
}
