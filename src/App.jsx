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
import { 
  getAggregatedData, 
  saveContract, 
  deleteContract, 
  savePayment, 
  deletePayment, 
  saveProject, 
  deleteProject,
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
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');

  // Global Time Filter State - Restored from LocalStorage if available
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

  // Autosave timeFilter settings to LocalStorage whenever modified
  useEffect(() => {
    saveSettings({ timeFilter });
  }, [timeFilter]);

  // Sync selectedProjectId with timeFilter if set
  const handleSetSelectedProjectId = (pId) => {
    setSelectedProjectId(pId);
    setTimeFilter(prev => ({ ...prev, project_id: pId }));
  };

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

  // Load and refresh state directly from LocalStorage Repository
  const refreshData = useCallback(() => {
    const agg = getAggregatedData(timeFilter);
    setData(agg);
  }, [timeFilter]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Keep viewingContract updated if data changes
  useEffect(() => {
    if (viewingContract) {
      const updated = data.contracts.find(c => c.id === viewingContract.id);
      if (updated) setViewingContract(updated);
    }
  }, [data, viewingContract]);

  // Handlers for Contracts (Autosaved to LocalStorage)
  const handleOpenNewContract = () => {
    setEditingContract(null);
    setIsContractModalOpen(true);
  };

  const handleOpenEditContract = (contract) => {
    setEditingContract(contract);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = (contractData) => {
    saveContract(contractData);
    refreshData();
  };

  const handleDeleteContract = (contractId) => {
    deleteContract(contractId);
    if (viewingContract && viewingContract.id === contractId) {
      setIsContractDetailModalOpen(false);
      setViewingContract(null);
    }
    refreshData();
  };

  const handleViewContractDetail = (contract) => {
    setViewingContract(contract);
    setIsContractDetailModalOpen(true);
  };

  const handleViewContractDossier = (contractId) => {
    setSelectedContractId(contractId);
    setActiveTab('contract-dossier');
  };

  // Handlers for Contract Appendices (Phụ Lục Hợp Đồng)
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

  const handleSaveContractAppendix = (cId, appendixData) => {
    saveContractAppendix(cId, appendixData);
    refreshData();
  };

  const handleDeleteContractAppendix = (cId, appId) => {
    deleteContractAppendix(cId, appId);
    refreshData();
  };

  // Handlers for Payments (Autosaved to LocalStorage)
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

  const handleSavePayment = (paymentData) => {
    savePayment(paymentData);
    refreshData();
  };

  const handleDeletePayment = (paymentId) => {
    deletePayment(paymentId);
    refreshData();
  };

  // Handlers for Projects (Autosaved to LocalStorage)
  const handleOpenNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (projectData) => {
    saveProject(projectData);
    refreshData();
  };

  const handleDeleteProject = (projectId) => {
    const result = deleteProject(projectId);
    if (selectedProjectId === projectId) {
      handleSetSelectedProjectId('');
    }
    refreshData();
    return result;
  };

  const handleSettleContract = (contractId, settlementData) => {
    settleContract(contractId, settlementData);
    refreshData();
  };

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
      />

      {/* Sticky Global Time-Based Filter Toolbar */}
      <GlobalTimeFilter
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        projects={data.projects}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        
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
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              data={data}
              setActiveTab={setActiveTab}
              setSelectedProjectId={handleSetSelectedProjectId}
              onNewContract={handleOpenNewContract}
              onNewPayment={() => handleOpenNewPayment()}
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
              onAddTmdtPhase={(projectId, phaseData) => {
                addTmdtAdjustmentPhase(projectId, phaseData);
                refreshData();
              }}
              onUpdateTmdtPhase={(projectId, phaseId, phaseData) => {
                updateTmdtAdjustmentPhase(projectId, phaseId, phaseData);
                refreshData();
              }}
              onDeleteTmdtPhase={(projectId, phaseId) => {
                deleteTmdtAdjustmentPhase(projectId, phaseId);
                refreshData();
              }}
              onOpenExcelImport={handleOpenExcelImport}
              setSelectedProjectId={handleSetSelectedProjectId}
              setActiveTab={setActiveTab}
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
