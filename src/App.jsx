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
  deleteContractAppendix
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
      setUserSession(session);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUserSession(null);
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
    if (isSupabaseConfigured) {
      await syncFromSupabase();
    }
    const agg = getAggregatedData(timeFilter);
    setData(agg);
  }, [timeFilter]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Keep viewingContract updated if data changes
  useEffect(() => {
    if (viewingContract) {
      const updated = data.contracts.find(c => String(c.id) === String(viewingContract.id));
      if (updated) setViewingContract(updated);
    }
  }, [data, viewingContract]);

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
    saveContract(contractData);
    await refreshData();
  };

  const handleDeleteContract = async (contractId) => {
    deleteContract(contractId);
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
    saveContractAppendix(cId, appendixData);
    await refreshData();
  };

  const handleDeleteContractAppendix = async (cId, appId) => {
    deleteContractAppendix(cId, appId);
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
    savePayment(paymentData);
    await refreshData();
  };

  const handleDeletePayment = async (paymentId) => {
    deletePayment(paymentId);
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
    saveProject(projectData);
    await refreshData();
  };

  const handleDeleteProject = async (projectId) => {
    const result = deleteProject(projectId);
    if (selectedProjectId === projectId) {
      handleSetSelectedProjectId('');
    }
    await refreshData();
    return result;
  };

  const handleDeleteAllProjects = async () => {
    const result = deleteAllProjects();
    handleSetSelectedProjectId('');
    await refreshData();
    return result;
  };

  const handleSettleContract = async (contractId, settlementData) => {
    settleContract(contractId, settlementData);
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Đang kiểm tra kết nối Supabase...</span>
        </div>
      </div>
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
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
        onLogout={handleLogout}
      />

      {/* Sticky Global Time & Project Filter Header Bar */}
      <GlobalTimeFilter
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        projects={data.projects}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-full px-2 sm:px-4 lg:px-6">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={{
            projectsCount: data.projects.length,
            contractsCount: data.contracts.length,
            paymentsCount: data.payments.length,
          }}
          onNewProject={handleOpenNewProject}
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
              onNewProject={handleOpenNewProject}
              onEditProject={handleOpenEditProject}
              onDeleteProject={handleDeleteProject}
              onDeleteAllProjects={handleDeleteAllProjects}
              onAddTmdtPhase={async (projectId, phaseData) => {
                addTmdtAdjustmentPhase(projectId, phaseData);
                await refreshData();
              }}
              onUpdateTmdtPhase={async (projectId, phaseId, phaseData) => {
                updateTmdtAdjustmentPhase(projectId, phaseId, phaseData);
                await refreshData();
              }}
              onDeleteTmdtPhase={async (projectId, phaseId) => {
                deleteTmdtAdjustmentPhase(projectId, phaseId);
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
      />

    </div>
  );
}
