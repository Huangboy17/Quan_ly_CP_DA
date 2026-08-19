import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import GlobalTimeFilter from './components/common/GlobalTimeFilter';
import DashboardView from './components/dashboard/DashboardView';
import ContractsView from './components/contracts/ContractsView';
import ContractModal from './components/contracts/ContractModal';
import ContractDetailModal from './components/contracts/ContractDetailModal';
import ContractAppendixModal from './components/contracts/ContractAppendixModal';
import ContractDossierView from './components/contracts/ContractDossierView';
import PaymentsView from './components/payments/PaymentsView';
import PaymentModal from './components/payments/PaymentModal';
import ProjectsView from './components/projects/ProjectsView';
import ProjectModal from './components/projects/ProjectModal';
import ExcelImportModal from './components/common/ExcelImportModal';
import LoginView from './components/auth/LoginView';
import ResetPasswordView from './components/auth/ResetPasswordView';
import AdminDashboard from './components/admin/AdminDashboard';
import { ShieldAlert, Clock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { 
  getAggregatedData, 
  syncFromSupabase,
  saveContract, 
  deleteContract, 
  savePayment, 
  deletePayment, 
  saveProject, 
  deleteProject,
  deleteAllProjects,
  getSavedSettings,
  saveSettings,
  settleContract,
  addTmdtAdjustmentPhase,
  updateTmdtAdjustmentPhase,
  deleteTmdtAdjustmentPhase,
  saveContractAppendix,
  deleteContractAppendix,
  fetchUserProfile
} from './services/storage';

export default function App() {
  const [data, setData] = useState({
    projects: [],
    contracts: [],
    payments: [],
    inPeriodPayments: [],
    totals: {},
    periodLabel: 'Tất cả thời gian',
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');

  // Supabase Auth State
  const [userSession, setUserSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  
  // Mobile Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check URL on initial mount for /reset-password
  useEffect(() => {
    if (window.location.pathname === '/reset-password') {
      setIsPasswordRecovery(true);
    }
    // Supabase will automatically parse the hash if it's a recovery link
    if (window.location.hash.includes('type=recovery')) {
      setIsPasswordRecovery(true);
    }
  }, []);

  // Handle Supabase Auth Session
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Chỉ cập nhật session khi có thay đổi thực sự (đăng nhập, đăng xuất, cập nhật user).
      // Bỏ qua TOKEN_REFRESHED vì nó tự phát khi tab regain focus (Alt+Tab),
      // gây re-render cascading và reset form đang mở.
      if (_event === 'TOKEN_REFRESHED') return;
      
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setHasRecoverySession(true);
      }

      setUserSession(session);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userSession?.user?.id) {
      fetchUserProfile(userSession.user.id).then(profile => {
        setUserProfile(profile);
      });
    } else {
      setUserProfile(null);
    }
  }, [userSession]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUserSession(null);
      setUserProfile(null);
    }
  };

  // Global Time & Project Filter State
  const [timeFilter, setTimeFilter] = useState(() => {
    const saved = getSavedSettings();
    return saved?.timeFilter || {
      year: 'all',
      quarter: 'all',
      month: 'all',
      customStartDate: '',
      customEndDate: '',
      project_id: '',
    };
  });

  // SINGLE SOURCE OF TRUTH: selectedProjectId is derived from timeFilter.project_id
  const selectedProjectId = timeFilter.project_id || '';

  const handleSetSelectedProjectId = useCallback((pId) => {
    setTimeFilter(prev => ({ ...prev, project_id: pId || '' }));
  }, []);

  // Autosave timeFilter settings
  useEffect(() => {
    saveSettings({ timeFilter });
  }, [timeFilter]);

  // Modals state
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const [isContractDetailModalOpen, setIsContractDetailModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);

  const [isAppendixModalOpen, setIsAppendixModalOpen] = useState(false);
  const [appendixInitialContractId, setAppendixInitialContractId] = useState('');
  const [appendixToEdit, setAppendixToEdit] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentInitialContractId, setPaymentInitialContractId] = useState('');

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [excelImportInitialType, setExcelImportInitialType] = useState('projects');

  const handleOpenExcelImport = (type = 'projects') => {
    setExcelImportInitialType(type);
    setIsExcelImportModalOpen(true);
  };

  // Load and refresh state directly from Supabase & Local Data Engine
  const refreshData = useCallback(async () => {
    if (isAuthLoading) return;

    const currentUserId = userSession?.user?.id;
    if (isSupabaseConfigured && currentUserId) {
      await syncFromSupabase(currentUserId);
    }
    const agg = getAggregatedData(timeFilter, Boolean(currentUserId));
    setData(agg);
  }, [timeFilter, userSession, isAuthLoading]);

  useEffect(() => {
    if (!isAuthLoading) {
      refreshData();
    }
  }, [isAuthLoading, refreshData]);

  // Keep viewingContract updated if data changes
  useEffect(() => {
    if (viewingContract) {
      const updated = data.contracts.find(c => String(c.id) === String(viewingContract.id));
      if (updated) setViewingContract(updated);
    }
  }, [data, viewingContract]);

  const currentUserId = userSession?.user?.id;

  // Handlers for Contracts
  const handleOpenNewContract = () => {
    setEditingContract(null);
    setIsContractModalOpen(true);
  };

  const handleOpenEditContract = (contract) => {
    setEditingContract(contract);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = async (contractData) => {
    await saveContract(contractData, currentUserId);
    await refreshData();
  };

  const handleDeleteContract = async (contractId) => {
    await deleteContract(contractId, currentUserId);
    if (selectedContractId && String(selectedContractId) === String(contractId)) {
      setSelectedContractId('');
      if (activeTab === 'contract-dossier') {
        setActiveTab('contracts');
      }
    }
    await refreshData();
  };

  // Standardized Contract Detail Navigation
  const handleViewContractDossier = (contractOrId) => {
    const cId = typeof contractOrId === 'object' && contractOrId !== null ? contractOrId.id : contractOrId;
    if (cId) {
      setSelectedContractId(cId);
      setActiveTab('contract-dossier');
    }
  };

  const handleViewContractDetail = handleViewContractDossier;

  // Handlers for Contract Appendices
  const handleOpenAppendixModal = (cId = '') => {
    // Guard: block adding appendix if contract is settled
    if (cId) {
      const contract = data.contracts.find(c => c.id === cId);
      if (contract && contract.status === 'settled') {
        alert('Hợp đồng đã quyết toán, không thể thêm phụ lục mới.');
        return;
      }
    }
    setAppendixToEdit(null);
    setAppendixInitialContractId(typeof cId === 'string' ? cId : '');
    setIsAppendixModalOpen(true);
  };

  const handleOpenEditAppendixModal = (cId, appObj) => {
    setAppendixToEdit(appObj);
    setAppendixInitialContractId(cId);
    setIsAppendixModalOpen(true);
  };

  const handleSaveContractAppendix = async (cId, appendixData) => {
    // Guard: block saving new appendix if contract is settled
    const contract = data.contracts.find(c => c.id === cId);
    if (contract && contract.status === 'settled' && !appendixData.id) {
      alert('Hợp đồng đã quyết toán, không thể thêm phụ lục mới.');
      return;
    }
    await saveContractAppendix(cId, appendixData, currentUserId);
    await refreshData();
  };

  const handleDeleteContractAppendix = async (cId, appId) => {
    await deleteContractAppendix(cId, appId, currentUserId);
    await refreshData();
  };

  // Handlers for Payments
  const handleOpenNewPayment = (initialContractId = '') => {
    setEditingPayment(null);
    setPaymentInitialContractId(typeof initialContractId === 'string' ? initialContractId : '');
    setIsPaymentModalOpen(true);
  };

  const handleAddPaymentForContract = (contract) => {
    setEditingPayment(null);
    setPaymentInitialContractId(contract.id);
    setIsPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentInitialContractId(payment.contract_id);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (paymentData) => {
    await savePayment(paymentData, currentUserId);
    await refreshData();
  };

  const handleDeletePayment = async (paymentId) => {
    await deletePayment(paymentId, currentUserId);
    await refreshData();
  };

  // Handlers for Projects
  const handleOpenNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (projectData) => {
    await saveProject(projectData, currentUserId);
    await refreshData();
  };

  const handleDeleteProject = async (projectId) => {
    const result = await deleteProject(projectId, currentUserId);
    if (selectedProjectId === projectId) {
      handleSetSelectedProjectId('');
    }
    await refreshData();
    return result;
  };

  const handleDeleteAllProjects = async () => {
    const result = await deleteAllProjects(currentUserId);
    handleSetSelectedProjectId('');
    await refreshData();
    return result;
  };

  const handleSettleContract = async (contractId, settlementData) => {
    await settleContract(contractId, settlementData, currentUserId);
    await refreshData();
  };

  const handleSelectCostGroupFilter = useCallback((groupName, projectId = null) => {
    setTimeFilter(prev => ({
      ...prev,
      cost_group: groupName || '',
      project_id: projectId !== null ? projectId : prev.project_id
    }));
    setActiveTab('contracts');
  }, []);

  // Render Loading Spinner while checking Auth session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Đang kiểm tra kết nối Supabase...</span>
        </div>
      </div>
    );
  }

  // Handle Password Recovery Routing
  if (isPasswordRecovery) {
    return (
      <ResetPasswordView 
        hasRecoverySession={hasRecoverySession || !!userSession}
        onBackToLogin={() => {
          setIsPasswordRecovery(false);
          setHasRecoverySession(false);
          window.history.replaceState({}, document.title, '/');
        }}
      />
    );
  }

  // Require user authentication before accessing financial management system
  if (isSupabaseConfigured && !userSession) {
    return (
      <LoginView 
        onLoginSuccess={(session) => {
          setUserSession(session);
          refreshData();
        }} 
      />
    );
  }

  // Handle Admin Approval Flow - Block access if pending or blocked
  if (userSession && userProfile) {
    if (userProfile.status === 'pending') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center font-sans p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl text-center">
            <Clock className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Tài khoản đang chờ duyệt</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Tài khoản của bạn đã được ghi nhận và đang chờ Quản trị viên phê duyệt. Vui lòng quay lại sau.
            </p>
            <button onClick={handleLogout} className="px-6 py-2 bg-muted hover:bg-border text-foreground rounded-lg font-semibold transition cursor-pointer">
              Đăng xuất
            </button>
          </div>
        </div>
      );
    }
    if (userProfile.status === 'blocked') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center font-sans p-6 transition-colors">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl text-center border-t-4 border-t-warning">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Tài khoản đã bị khóa</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên. Bạn không thể truy cập vào hệ thống lúc này.
            </p>
            <button onClick={handleLogout} className="px-6 py-2 bg-muted hover:bg-border text-foreground rounded-lg font-semibold transition cursor-pointer">
              Đăng xuất
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      
      {/* Top Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewContract={handleOpenNewContract}
        onNewPayment={() => handleOpenNewPayment()}
        onOpenExcelImport={handleOpenExcelImport}
        onDataChange={refreshData}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        userSession={userSession}
        userProfile={userProfile}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Sticky Global Time & Project Filter Header Bar */}
      <GlobalTimeFilter
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        projects={data.projects}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-full px-2 sm:px-4 lg:px-6 overflow-hidden">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false); // Close sidebar on mobile when navigating
          }}
          counts={{
            projectsCount: data.projects.length,
            contractsCount: data.contracts.length,
            paymentsCount: data.payments.length,
          }}
          onNewProject={() => {
            handleOpenNewProject();
            setIsMobileMenuOpen(false);
          }}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Right Main Screen View */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-w-0 w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              data={data}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={handleSetSelectedProjectId}
              setActiveTab={setActiveTab}
              onNewContract={handleOpenNewContract}
              onNewPayment={() => handleOpenNewPayment()}
              onSelectCostGroup={(costGroup) => handleSelectCostGroupFilter(costGroup)}
            />
          )}

          {activeTab === 'admin' && ['admin', 'super_admin', 'level_1'].includes(userProfile?.role) && (
            <AdminDashboard userSession={userSession} />
          )}

          {activeTab === 'contracts' && (
            <ContractsView
              data={data}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={handleSetSelectedProjectId}
              onNewContract={handleOpenNewContract}
              onEditContract={handleOpenEditContract}
              onDeleteContract={handleDeleteContract}
              onViewContractDetail={handleViewContractDetail}
              onViewContractDossier={handleViewContractDossier}
              onAddPaymentForContract={handleAddPaymentForContract}
              onOpenAppendixModal={handleOpenAppendixModal}
              onOpenExcelImport={handleOpenExcelImport}
              globalSearch={globalSearch}
            />
          )}

          {activeTab === 'contract-dossier' && (
            <ContractDossierView
              contractId={selectedContractId}
              data={data}
              onBackToContracts={() => setActiveTab('contracts')}
              onBackToProjectOverview={(pId) => {
                handleSetSelectedProjectId(pId);
                setActiveTab('projects');
              }}
              onEditContract={handleOpenEditContract}
              onOpenAddAppendix={handleOpenAppendixModal}
              onEditAppendix={handleOpenEditAppendixModal}
              onDeleteAppendix={handleDeleteContractAppendix}
              onOpenAddPayment={handleOpenNewPayment}
              onEditPayment={handleOpenEditPayment}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              data={data}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={handleSetSelectedProjectId}
              onNewPayment={() => handleOpenNewPayment()}
              onEditPayment={handleOpenEditPayment}
              onDeletePayment={handleDeletePayment}
              onOpenExcelImport={handleOpenExcelImport}
              globalSearch={globalSearch}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              data={data}
              userSession={userSession}
              onNewProject={handleOpenNewProject}
              onEditProject={handleOpenEditProject}
              onDeleteProject={handleDeleteProject}
              onDeleteAllProjects={handleDeleteAllProjects}
              onAddTmdtPhase={async (projectId, phaseData) => {
                await addTmdtAdjustmentPhase(projectId, phaseData, currentUserId);
                await refreshData();
              }}
              onUpdateTmdtPhase={async (projectId, phaseId, phaseData) => {
                await updateTmdtAdjustmentPhase(projectId, phaseId, phaseData, currentUserId);
                await refreshData();
              }}
              onDeleteTmdtPhase={async (projectId, phaseId) => {
                await deleteTmdtAdjustmentPhase(projectId, phaseId, currentUserId);
                await refreshData();
              }}
              onOpenExcelImport={handleOpenExcelImport}
              onViewContractDetail={handleViewContractDetail}
              onViewContractDossier={handleViewContractDossier}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={handleSetSelectedProjectId}
              setActiveTab={setActiveTab}
              onSelectCostGroup={(costGroup, projId) => handleSelectCostGroupFilter(costGroup, projId)}
              globalSearch={globalSearch}
            />
          )}
        </main>

      </div>

      {/* Modals Layer */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onSaveContract={handleSaveContract}
        projects={data.projects}
        editingContract={editingContract}
        onOpenNewProjectModal={handleOpenNewProject}
      />

      <ContractDetailModal
        isOpen={isContractDetailModalOpen}
        onClose={() => setIsContractDetailModalOpen(false)}
        contract={viewingContract}
        payments={data.payments}
        onAddPaymentForContract={handleAddPaymentForContract}
        onEditPayment={handleOpenEditPayment}
        onDeletePayment={handleDeletePayment}
        onOpenAddAppendix={handleOpenAppendixModal}
        onEditAppendix={handleOpenEditAppendixModal}
        onDeleteAppendix={handleDeleteContractAppendix}
      />

      <ContractAppendixModal
        isOpen={isAppendixModalOpen}
        onClose={() => setIsAppendixModalOpen(false)}
        contracts={data.contracts}
        projects={data.projects}
        initialContractId={appendixInitialContractId}
        appendixToEdit={appendixToEdit}
        onSave={handleSaveContractAppendix}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSavePayment={handleSavePayment}
        onSettleContract={handleSettleContract}
        contracts={data.contracts}
        payments={data.payments}
        editingPayment={editingPayment}
        initialContractId={paymentInitialContractId}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaveProject={handleSaveProject}
        editingProject={editingProject}
      />

      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        initialType={excelImportInitialType}
        onSuccess={refreshData}
        userId={currentUserId}
      />

    </div>
  );
}
