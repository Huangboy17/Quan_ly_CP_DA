import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  FolderKanban, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  CreditCard, 
  Clock, 
  TrendingUp, 
  ShieldAlert,
  CheckCircle2,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  UserCheck,
  MapPin,
  Tag,
  Activity,
  X,
  CheckCircle,
  Info,
  Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart,
  Bar,
  Line,
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { formatVND, formatVNDCompact, formatDisplayDate, cleanVND, calcEndDate, calcDaysBetween } from '../../utils/formatters';
import { exportProjectExcel, exportProjectPdf } from '../../utils/export/projectExport';
import TmdtHistoryModal from './TmdtHistoryModal';
import TmdtFormModal from './TmdtFormModal';
import TmdtPhaseDetailModal from './TmdtPhaseDetailModal';
import DeleteProjectModal from './DeleteProjectModal';
import DeleteAllProjectsModal from './DeleteAllProjectsModal';
import ContractCostGroupChart from '../common/ContractCostGroupChart';
import PdfPreviewModal from '../common/PdfPreviewModal';
import ProjectMembersModal from './ProjectMembersModal';

export default function ProjectsView({ data, userSession, currentUserRole,
  onNewProject, 
  onEditProject, 
  onDeleteProject, 
  onDeleteAllProjects,
  onAddTmdtPhase,
  onUpdateTmdtPhase,
  onDeleteTmdtPhase,
  onOpenExcelImport,
  onViewContractDetail,
  onViewContractDossier,
  selectedProjectId = '',
  setSelectedProjectId, 
  setActiveTab,
  onSelectCostGroup,
  globalSearch 
}) {
  const { 
    projects = [], 
    contracts = [], 
    payments = [], 
    filteredPayments = [],
    inPeriodPayments = [],
    periodLabel = 'Tất cả thời gian',
    timeFilter = {},
    isTimeRangeFilterActive = false
  } = data;

  // Active Project: Automatically synced with selectedProjectId from Global Filter Header!
  const activeProj = useMemo(() => {
    if (selectedProjectId) {
      return projects.find(p => String(p.id) === String(selectedProjectId)) || (projects.length > 0 ? projects[0] : null);
    }
    return projects.length > 0 ? projects[0] : null;
  }, [projects, selectedProjectId]);

  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf_preview' | 'pdf_download' | null

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfFilename, setPreviewPdfFilename] = useState(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState(null);

  // Cleanup Blob URL when unmounting
  React.useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  // Modals State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProject, setHistoryProject] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formProject, setFormProject] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);

  const [isPhaseDetailModalOpen, setIsPhaseDetailModalOpen] = useState(false);
  const [viewingPhaseProject, setViewingPhaseProject] = useState(null);
  const [viewingPhase, setViewingPhase] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleOpenDeleteModal = (proj) => {
    setDeletingProject(proj);
    setIsDeleteModalOpen(true);
  };

  const handleOpenTmdtHistory = (proj) => {
    setHistoryProject(proj);
    setIsHistoryModalOpen(true);
  };

  const handleOpenAddNewPhase = (proj) => {
    setFormProject(proj);
    setEditingPhase(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditPhase = (proj, phase) => {
    setFormProject(proj);
    setEditingPhase(phase);
    setIsFormModalOpen(true);
  };

  const handleOpenPhaseDetail = (proj, phase) => {
    setViewingPhaseProject(proj);
    setViewingPhase(phase);
    setIsPhaseDetailModalOpen(true);
  };

  const handleSavePhaseSubmit = (projectId, phaseData) => {
    if (phaseData.id) {
      onUpdateTmdtPhase(projectId, phaseData.id, phaseData);
    } else {
      onAddTmdtPhase(projectId, phaseData);
    }
    if (historyProject && historyProject.id === projectId) {
      const updated = projects.find(p => p.id === projectId);
      if (updated) setHistoryProject(updated);
    }
  };

  // EMPTY STATE
  if (!activeProj) {
    return (
      <div className="space-y-4 animate-fade-in">
        {toastMsg && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg('')} className="text-success hover:text-foreground">✕</button>
          </div>
        )}
        <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-4 shadow-xl">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">Chưa có dữ liệu dự án trong hệ thống</h3>
          <p className="text-xs text-muted-foreground">Vui lòng khởi tạo dự án đầu tiên hoặc Import từ Excel để bắt đầu xem Tổng quan dự án.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-success border border-border text-xs font-semibold cursor-pointer"
            >
              📥 Import Excel
            </button>
            <button
              onClick={onNewProject}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30 cursor-pointer"
            >
              + Thêm Dự Án Mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // DATA CALCULATION FOR ACTIVE PROJECT (SINGLE SOURCE OF TRUTH)
  // ====================================================
  const projContracts = contracts.filter(c => String(c.project_id) === String(activeProj.id));
  const projContractIds = projContracts.map(c => c.id);

  // All-time payments for active project
  const projAllPayments = payments.filter(pm => projContractIds.includes(pm.contract_id));

  // In-period payments for active project based on timeFilter
  const activePaymentsForScope = useMemo(() => {
    if (isTimeRangeFilterActive) {
      const filtered = (inPeriodPayments.length > 0 ? inPeriodPayments : filteredPayments)
        .filter(pm => projContractIds.includes(pm.contract_id));
      return filtered;
    }
    return projAllPayments;
  }, [isTimeRangeFilterActive, inPeriodPayments, filteredPayments, projContractIds, projAllPayments]);

  // 1. TMĐT
  const currentTmdt = cleanVND(activeProj.currentTmdt || activeProj.initial_tmdt || 0);

  // 2. GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ
  const signedContracts = projContracts.reduce((sum, c) => sum + cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0), 0);

  // 3. ĐÃ THANH TOÁN THỰC TẾ (Lũy kế toàn thời gian & Chi trong kỳ)
  const totalPaidAllTime = projAllPayments.reduce((sum, pm) => sum + cleanVND(pm.amount_after_vat || 0), 0);
  const totalPaidInPeriod = activePaymentsForScope.reduce((sum, pm) => sum + cleanVND(pm.amount_after_vat || 0), 0);

  // 4. DỰ KIẾN QUYẾT TOÁN
  const estimatedSettlement = projContracts.reduce((sum, c) => {
    const val = (c.settlement_amount_after_vat !== undefined && c.settlement_amount_after_vat !== null && c.settlement_amount_after_vat !== '')
      ? cleanVND(c.settlement_amount_after_vat)
      : cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0);
    return sum + val;
  }, 0);

  // 5. CÒN PHẢI THANH TOÁN
  const remainingToPay = Math.max(0, cleanVND(estimatedSettlement - totalPaidAllTime));

  // 6. NGÂN SÁCH CÒN LẠI
  const remainingBudget = cleanVND(currentTmdt - estimatedSettlement);

  // Percentage Ratios vs TMĐT
  const signedRatio = currentTmdt > 0 ? (signedContracts / currentTmdt) * 100 : 0;
  const paidTmdtRatio = currentTmdt > 0 ? (totalPaidAllTime / currentTmdt) * 100 : 0;
  const settlementRatio = currentTmdt > 0 ? (estimatedSettlement / currentTmdt) * 100 : 0;

  // SỨC KHỎE TÀI CHÍNH DỰ ÁN
  let healthStatus = 'GOOD';
  if (remainingBudget < 0 || estimatedSettlement > currentTmdt) {
    healthStatus = 'DANGER';
  } else if (signedContracts > currentTmdt || settlementRatio >= 95) {
    healthStatus = 'WARNING';
  } else {
    healthStatus = 'GOOD';
  }

  // TÌNH TRẠNG HỢP ĐỒNG (STATUS BREAKDOWN)
  const todayStr = new Date().toISOString().substring(0, 10);

  let countInExecution = 0;
  let countDisbursing = 0;
  let countSettled = 0;
  let countNotDisbursed = 0;
  let countOverdue = 0;

  projContracts.forEach(c => {
    const cEst = (c.settlement_amount_after_vat !== undefined && c.settlement_amount_after_vat !== null && c.settlement_amount_after_vat !== '')
      ? cleanVND(c.settlement_amount_after_vat)
      : cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0);
    const cPaid = projAllPayments.filter(p => p.contract_id === c.id).reduce((s, p) => s + cleanVND(p.amount_after_vat), 0);

    const signingDate = c.signing_date || '';
    const executionDays = Number(c.execution_days || 0);
    const exactEndDate = signingDate && executionDays > 0 ? calcEndDate(signingDate, executionDays) : (c.end_date || '');
    const isOverdue = exactEndDate && todayStr > exactEndDate && c.status !== 'settled';

    if (c.status === 'settled' || (cEst > 0 && cPaid >= cEst)) {
      countSettled++;
    } else if (cPaid > 0) {
      countDisbursing++;
      if (isOverdue) countOverdue++;
      else countInExecution++;
    } else {
      countNotDisbursed++;
      if (isOverdue) countOverdue++;
      else countInExecution++;
    }
  });

  // BIỂU ĐỒ CƠ CẤU NGÂN SÁCH DỰ ÁN (Pie / Donut Data)
  const budgetStructureData = [
    { name: 'Đã thanh toán', value: totalPaidAllTime, color: '#10b981' },
    { name: 'Còn phải thanh toán', value: remainingToPay, color: '#f59e0b' },
    { name: 'Ngân sách còn lại', value: Math.max(0, remainingBudget), color: '#3b82f6' },
  ];

  // BIỂU ĐỒ DÒNG TIỀN THEO THỜI GIAN
  const monthlyDisbursementMap = {};
  activePaymentsForScope.forEach(pm => {
    if (!pm.payment_date) return;
    const mKey = pm.payment_date.substring(0, 7);
    monthlyDisbursementMap[mKey] = cleanVND((monthlyDisbursementMap[mKey] || 0) + cleanVND(pm.amount_after_vat));
  });

  const sortedMonthKeys = Object.keys(monthlyDisbursementMap).sort();
  let runningCashflowCumulative = 0;

  const cashflowChartData = sortedMonthKeys.map(mKey => {
    const periodVal = monthlyDisbursementMap[mKey];
    runningCashflowCumulative = cleanVND(runningCashflowCumulative + periodVal);
    const [y, mStr] = mKey.split('-');
    return {
      monthKey: mKey,
      label: `Tháng ${mStr}/${y}`,
      periodVal,
      cumulativeVal: runningCashflowCumulative,
    };
  });

  // KHU VỰC CẦN QUAN TÂM (RISK & ALERT SUMMARY)
  const detailedRiskAlerts = [];

  projContracts.forEach(c => {
    const signingDate = c.signing_date || '';
    const executionDays = Number(c.execution_days || 0);
    const exactEndDate = signingDate && executionDays > 0 ? calcEndDate(signingDate, executionDays) : (c.end_date || '');

    if (exactEndDate && todayStr > exactEndDate && c.status !== 'settled') {
      const daysOverdue = calcDaysBetween(exactEndDate, todayStr);
      detailedRiskAlerts.push({
        id: `overdue_${c.id}`,
        level: 'danger',
        badge: '🔴 HĐ Quá hạn',
        title: `HĐ ${c.contract_number} (${c.contractor || 'Nhà thầu'}) đã quá hạn ${daysOverdue} ngày`,
        desc: `Hạn hợp đồng là ngày ${formatDisplayDate(exactEndDate)} nhưng chưa hoàn tất quyết toán.`,
        contractId: c.id
      });
    } else if (exactEndDate && exactEndDate >= todayStr && c.status !== 'settled') {
      const daysDiff = calcDaysBetween(todayStr, exactEndDate);
      if (daysDiff <= 30) {
        detailedRiskAlerts.push({
          id: `expiring_${c.id}`,
          level: 'warning',
          badge: '🟠 Sắp hết hạn',
          title: `HĐ ${c.contract_number} sắp hết hạn trong ${daysDiff} ngày`,
          desc: `Ngày hết hạn: ${formatDisplayDate(exactEndDate)}. Cần kiểm tra hồ sơ nghiệm thu.`,
          contractId: c.id
        });
      }
    }
  });

  if (remainingBudget < 0) {
    detailedRiskAlerts.push({
      id: 'proj_exceed_tmdt',
      level: 'danger',
      badge: '🔴 Vượt TMĐT',
      title: `Dự án vượt Tổng mức đầu tư được duyệt`,
      desc: `Dự kiến quyết toán (${formatVND(estimatedSettlement)}) vượt TMĐT (${formatVND(currentTmdt)}) số tiền ${formatVND(Math.abs(remainingBudget))}.`
    });
  }

  const notDisbursedContracts = projContracts.filter(c => {
    const cPaid = projAllPayments.filter(p => p.contract_id === c.id).reduce((s, p) => s + cleanVND(p.amount_after_vat), 0);
    return cPaid === 0;
  });

  if (notDisbursedContracts.length > 0) {
    detailedRiskAlerts.push({
      id: 'proj_not_disbursed',
      level: 'info',
      badge: '🟡 Chưa giải ngân',
      title: `${notDisbursedContracts.length} hợp đồng chưa phát sinh giải ngân thanh toán`,
      desc: `Các gói thầu đã ký kết nhưng chưa khởi tạo đợt thanh toán nào.`
    });
  }

  // TÓM TẮT THANH TOÁN
  const contractsWithPaymentsCount = new Set(projAllPayments.map(p => p.contract_id)).size;
  const latestPayment = projAllPayments.length > 0 
    ? [...projAllPayments].sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))[0]
    : null;

  const formattedAddress = activeProj.location || activeProj.address || 'Chưa cập nhật';

  // Navigation Helpers
  const navigateToContractsWithFilter = () => {
    if (setSelectedProjectId) setSelectedProjectId(activeProj.id);
    setActiveTab('contracts');
  };

  const navigateToPaymentsWithFilter = () => {
    if (setSelectedProjectId) setSelectedProjectId(activeProj.id);
    setActiveTab('payments');
  };

  // Safe fallback if activeProj is null (0 projects in database)
  if (!activeProj) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {toastMsg && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg('')} className="text-success hover:text-foreground cursor-pointer">✕</button>
          </div>
        )}

        <div className="p-10 rounded-2xl bg-card border border-border text-center space-y-4 shadow-xl my-6">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Chưa có dự án nào trong hệ thống</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Tất cả dữ liệu dự án và các dữ liệu liên quan đã được xóa hoàn toàn. Nhấn nút "+ Thêm dự án mới" để bắt đầu khởi tạo dự án đầu tiên.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onNewProject}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> + Thêm dự án mới
            </button>
            <button
              onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
              className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-success text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1.5"
            >
              📥 Import từ Excel
            </button>
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-destructive/40 transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-destructive" /> 🗑️ Xóa tất cả dự án
            </button>
          </div>
        </div>

        <DeleteAllProjectsModal
          isOpen={isDeleteAllModalOpen}
          onClose={() => setIsDeleteAllModalOpen(false)}
          projectsCount={projects.length}
          contractsCount={contracts.length}
          paymentsCount={payments.length}
          onConfirmDeleteAll={async () => {
            if (onDeleteAllProjects) {
              await onDeleteAllProjects();
              if (setSelectedProjectId) setSelectedProjectId('');
              setToastMsg('Đã xóa toàn bộ dự án và dữ liệu liên quan thành công.');
              setTimeout(() => setToastMsg(''), 6000);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-success hover:text-foreground cursor-pointer">✕</button>
        </div>
      )}

      {/* HEADER DỰ ÁN COMPACT */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 transition-colors">
        
        {/* Row 1: Action Buttons & Project Title Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">DỰ ÁN ĐANG QUẢN TRỊ TÀI CHÍNH</span>
              <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
                {activeProj.name}
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-success hover:text-success/90 text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1"
            >
              📥 Import Excel
            </button>
            <button
              onClick={() => onEditProject(activeProj)}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5 text-primary" /> Chỉnh sửa
            </button>
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-primary" /> Thành viên
            </button>
            <button
              onClick={() => handleOpenTmdtHistory(activeProj)}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-success/90 text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> Lịch sử TMĐT
            </button>
            <button
              onClick={() => handleOpenDeleteModal(activeProj)}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-destructive/40 transition cursor-pointer flex items-center gap-1"
              title="Xóa dự án hiện tại"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" /> Xóa DA
            </button>
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-destructive/50 shadow-sm transition cursor-pointer flex items-center gap-1"
              title="Xóa toàn bộ dự án và các hợp đồng, thanh toán liên quan"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" /> 🗑️ Xóa tất cả dự án
            </button>
            <button
              disabled={exporting === 'excel' || !activeProj}
              onClick={async () => {
                setExporting('excel');
                try {
                  await exportProjectExcel(activeProj, projContracts, activePaymentsForScope, periodLabel);
                } catch (err) {
                  alert(err.message || 'Không thể xuất báo cáo.');
                } finally {
                  setExporting(null);
                }
              }}
              className="w-full sm:w-auto justify-center px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-success border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'excel' ? 'Đang xuất...' : '📊 Xuất Excel'}
            </button>
            <button
              disabled={exporting === 'pdf_preview' || !activeProj}
              onClick={async () => {
                setExporting('pdf_preview');
                try {
                  const blob = await exportProjectPdf(activeProj, projContracts, activePaymentsForScope, periodLabel, 'blob');
                  
                  if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
                  
                  const url = URL.createObjectURL(blob);
                  setPreviewPdfBlob(blob);
                  setPreviewPdfUrl(url);
                  setPreviewPdfFilename(`Bao_cao_du_an_${(activeProj.code || activeProj.id || '').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
                } catch (err) {
                  console.error(err);
                  alert(err.message || 'Không thể tạo bản xem trước PDF. Vui lòng thử lại.');
                } finally {
                  setExporting(null);
                }
              }}
              className="w-full sm:w-auto justify-center px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf_preview' ? 'Đang tạo...' : <><Eye className="w-3.5 h-3.5" /> Xem trước PDF</>}
            </button>
            <button
              disabled={exporting === 'pdf_download' || !activeProj}
              onClick={async () => {
                setExporting('pdf_download');
                try {
                  await exportProjectPdf(activeProj, projContracts, activePaymentsForScope, periodLabel, 'download');
                } catch (err) {
                  alert(err.message || 'Không thể xuất báo cáo.');
                } finally {
                  setExporting(null);
                }
              }}
              className="w-full sm:w-auto justify-center px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-destructive border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf_download' ? 'Đang tạo...' : '📄 Xuất PDF'}
            </button>
            <button
              onClick={onNewProject}
              className="w-full sm:w-auto justify-center px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> + Thêm dự án
            </button>
          </div>
        </div>

        {/* Global Filter Project Status Banner */}
        {selectedProjectId ? (
          <div className="text-[11px] text-emerald-300 bg-success/10 border border-success/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success shrink-0" />
            <span>🟢 Đang hiển thị chi tiết theo dự án chọn trên Header: <strong className="text-foreground font-bold">{activeProj.name}</strong></span>
          </div>
        ) : (
          <div className="text-[11px] text-amber-300 bg-warning/10 border border-warning/30 px-3 py-1.5 rounded-xl font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-warning shrink-0" />
              <span>ℹ️ Bạn đang chọn "Tất cả dự án" trên Header. Đang hiển thị chi tiết dự án đầu tiên: <strong className="text-foreground font-bold">{activeProj.name}</strong></span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Chọn 1 dự án trên Header để xem cụ thể</span>
          </div>
        )}

        {/* Row 2: Project Identification & Metadata Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              {activeProj.name}
            </h1>
            {activeProj.code && (
              <span className="px-2.5 py-0.5 rounded-md bg-muted border border-border text-foreground text-xs font-mono font-bold">
                Mã: {activeProj.code}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/30 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              {activeProj.status || 'Đang triển khai'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-1">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Chủ Đầu Tư:</span>
              <span className="font-semibold text-foreground truncate block" title={activeProj.investor || activeProj.manager || 'N/A'}>
                {activeProj.investor || activeProj.manager || 'Ban QLDA'}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Địa Chỉ:</span>
              <span className="font-semibold text-foreground truncate block" title={formattedAddress}>
                {formattedAddress}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Ngày Khởi Tạo:</span>
              <span className="font-mono font-bold text-foreground block truncate">
                {formatDisplayDate(activeProj.created_at || activeProj.start_date)}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Thời Gian Thực Hiện:</span>
              <span className="font-semibold text-foreground truncate block">
                {(() => {
                  const val = activeProj.execution_time || activeProj.timeline;
                  if (!val) return 'Chưa cập nhật';
                  const num = Number(val);
                  if (!isNaN(num) && String(val).trim() === String(num)) {
                    return `${num.toLocaleString('vi-VN')} Ngày`;
                  }
                  return val;
                })()}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">TMĐT Gần Nhất:</span>
              <span className="font-mono font-bold text-success truncate block">
                {formatVND(currentTmdt)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Tổng Hợp Đồng:</span>
              <span className="font-mono font-bold text-primary block">
                {projContracts.length} Hợp đồng
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 6 KPI TÀI CHÍNH CỐT LÕI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            6 CHỈ TIÊU TÀI CHÍNH CỐT LÕI ({periodLabel})
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Bấm vào card để chuyển sang module chi tiết</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* KPI 1: TMĐT */}
          <div 
            onClick={() => handleOpenTmdtHistory(activeProj)}
            className="p-4 rounded-xl bg-card border border-success/40 hover:border-success transition cursor-pointer space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between text-success">
              <span className="text-[11px] font-bold uppercase tracking-wider">1. TỔNG MỨC ĐẦU TƯ (TMĐT)</span>
              <span className="text-[10px] font-mono text-success bg-success/20 px-2 py-0.5 rounded font-bold">
                {activeProj.latestPhaseLabel || 'Hiện tại'}
              </span>
            </div>

            <div className="text-xl font-black text-foreground font-mono group-hover:text-success/90 transition">
              {formatVND(currentTmdt)}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-[10px] font-mono">Hạn mức ngân sách phê duyệt</span>
              <span className="text-success font-bold text-[10px] flex items-center gap-1">
                Lịch sử TMĐT <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 2: GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ */}
          <div 
            onClick={navigateToContractsWithFilter}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/60 transition cursor-pointer space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between text-primary">
              <span className="text-[11px] font-bold uppercase tracking-wider">2. GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ</span>
              <FileText className="w-4 h-4" />
            </div>

            <div className="text-xl font-black text-primary font-mono group-hover:text-primary/90 transition">
              {formatVND(signedContracts)}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground text-[10px]">{projContracts.length} HĐ đã ký</span>
              <span className="text-primary font-bold text-[11px]">{signedRatio.toFixed(1)}% TMĐT</span>
            </div>
          </div>

          {/* KPI 3: ĐÃ THANH TOÁN THỰC TẾ */}
          <div 
            onClick={navigateToPaymentsWithFilter}
            className="p-4 rounded-xl bg-card border border-border hover:border-success/60 transition cursor-pointer space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between text-success">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                3. {isTimeRangeFilterActive ? `CHI TRẢ TRONG KỲ` : `ĐÃ THANH TOÁN THỰC TẾ`}
              </span>
              <CreditCard className="w-4 h-4" />
            </div>

            <div className="text-xl font-black text-success font-mono group-hover:text-success/90 transition">
              {formatVND(isTimeRangeFilterActive ? totalPaidInPeriod : totalPaidAllTime)}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground text-[10px]">
                {isTimeRangeFilterActive ? `Lũy kế all-time: ${formatVNDCompact(totalPaidAllTime)}` : `${projAllPayments.length} đợt phát sinh`}
              </span>
              <span className="text-success font-bold text-[11px]">{paidTmdtRatio.toFixed(1)}% TMĐT</span>
            </div>
          </div>

          {/* KPI 4: DỰ KIẾN QUYẾT TOÁN */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-primary">
              <span className="text-[11px] font-bold uppercase tracking-wider">4. DỰ KIẾN QUYẾT TOÁN</span>
              <TrendingUp className="w-4 h-4" />
            </div>

            <div className="text-xl font-black text-primary font-mono">
              {formatVND(estimatedSettlement)}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground text-[10px]">Dự toán sau cùng</span>
              <span className="text-primary font-bold text-[11px]">{settlementRatio.toFixed(1)}% TMĐT</span>
            </div>
          </div>

          {/* KPI 5: CÒN PHẢI THANH TOÁN */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-warning">
              <span className="text-[11px] font-bold uppercase tracking-wider">5. CÒN PHẢI THANH TOÁN</span>
              <CreditCard className="w-4 h-4 text-warning" />
            </div>

            <div className="text-xl font-black text-warning font-mono">
              {formatVND(remainingToPay)}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground text-[10px]">Dự kiến QT − Đã TT</span>
              <span className="text-warning font-bold text-[11px]">Dư nợ cam kết</span>
            </div>
          </div>

          {/* KPI 6: NGÂN SÁCH CÒN LẠI */}
          <div className={`p-4 rounded-xl bg-card border space-y-1.5 shadow-md ${
            remainingBudget < 0 
              ? 'border-destructive/80 bg-destructive/20' 
              : 'border-success/50 bg-success/10'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">6. NGÂN SÁCH CÒN LẠI</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                remainingBudget < 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
              }`}>
                {remainingBudget < 0 ? '⚠️ Vượt ngân sách' : '🟢 An toàn'}
              </span>
            </div>

            <div className={`text-xl font-black font-mono ${
              remainingBudget < 0 ? 'text-destructive' : 'text-primary'
            }`}>
              {remainingBudget < 0 ? `Vượt ${formatVND(Math.abs(remainingBudget))}` : formatVND(remainingBudget)}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground text-[10px]">TMĐT − Dự kiến QT</span>
              <span className={`font-bold text-[11px] ${remainingBudget < 0 ? 'text-destructive' : 'text-primary'}`}>
                {currentTmdt > 0 ? (remainingBudget / currentTmdt * 100).toFixed(1) : 0}% TMĐT
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* CƠ CẤU HỢP ĐỒNG, NGÂN SÁCH & TÌNH HÌNH HỢP ĐỒNG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: CƠ CẤU HỢP ĐỒNG THEO NHÓM CHI PHÍ */}
        <div className="lg:col-span-1">
          <ContractCostGroupChart
            contracts={projContracts}
            title="Giá trị hợp đồng theo nhóm chi phí"
            subtitle={`Dự án: ${activeProj.name}`}
            onSelectCostGroup={(costGroup) => {
              if (setSelectedProjectId) setSelectedProjectId(activeProj.id);
              if (onSelectCostGroup) {
                onSelectCostGroup(costGroup, activeProj.id);
              } else {
                setActiveTab('contracts');
              }
            }}
          />
        </div>

        {/* CARD 2: CƠ CẤU NGÂN SÁCH DỰ ÁN */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-success" />
              CƠ CẤU NGÂN SÁCH DỰ ÁN
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Phân bổ chi phí vs TMĐT</span>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetStructureData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {budgetStructureData.map((entry, index) => (
                    <Cell key={`budget-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(value) => [formatVND(value), 'Giá trị']}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">TỔNG TMĐT</span>
              <span className="text-xs font-black text-foreground font-mono">{formatVNDCompact(currentTmdt)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
            <div 
              onClick={navigateToPaymentsWithFilter}
              className="p-2 rounded-lg bg-background/60 border border-border/80 hover:border-success/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <span className="w-2 h-2 rounded-full bg-success inline-block" /> Đã thanh toán:
              </div>
              <div className="font-mono font-bold text-success text-xs mt-0.5">{formatVND(totalPaidAllTime)}</div>
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-2 rounded-lg bg-background/60 border border-border/80 hover:border-warning/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" /> Còn phải thanh toán:
              </div>
              <div className="font-mono font-bold text-warning text-xs mt-0.5">{formatVND(remainingToPay)}</div>
            </div>

            <div className="p-2 rounded-lg bg-background/60 border border-border/80 col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Ngân sách còn lại:
              </div>
              <div className={`font-mono font-bold text-xs ${remainingBudget < 0 ? 'text-destructive' : 'text-primary'}`}>
                {formatVND(remainingBudget)}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: TÌNH HÌNH HỢP ĐỒNG */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              TÌNH HÌNH HỢP ĐỒNG
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Tổng cộng: <strong className="text-foreground">{projContracts.length}</strong> hợp đồng</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            
            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-background/60 border border-border/80 hover:border-primary/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Đang thực hiện</span>
                <span className="font-mono font-bold text-primary text-sm mt-0.5 block">{countInExecution} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-background/60 border border-border/80 hover:border-success/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Đang giải ngân</span>
                <span className="font-mono font-bold text-success text-sm mt-0.5 block">{countDisbursing} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-background/60 border border-border/80 hover:border-primary/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Đã quyết toán</span>
                <span className="font-mono font-bold text-primary text-sm mt-0.5 block">{countSettled} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-background/60 border border-border/80 hover:border-warning/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Chưa giải ngân</span>
                <span className="font-mono font-bold text-warning text-sm mt-0.5 block">{countNotDisbursed} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="col-span-2 p-3 rounded-xl bg-background/60 border border-destructive/40 hover:border-destructive cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <div>
                  <span className="text-[11px] text-foreground font-bold block">Quá hạn chưa quyết toán</span>
                  <span className="text-[10px] text-muted-foreground">Đã quá ngày hoàn thành hợp đồng</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-destructive text-sm">{countOverdue} HĐ</span>
                <ArrowRight className="w-4 h-4 text-destructive" />
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <button
              onClick={navigateToContractsWithFilter}
              className="text-xs font-bold text-primary hover:text-primary/90 flex items-center gap-1 transition cursor-pointer"
            >
              Quản lý hợp đồng chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* BIỂU ĐỒ DÒNG TIỀN THEO THỜI GIAN */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-success" />
            DÒNG TIỀN DỰ ÁN (GIẢI NGÂN THEO THỜI GIAN - {periodLabel})
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Bấm vào điểm dữ liệu để chuyển sang Quản lý Thanh toán</span>
        </div>

        {cashflowChartData.length > 0 ? (
          <div className="h-72 w-full overflow-x-auto overflow-y-hidden hide-scrollbar">
            <div className="min-w-[600px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={cashflowChartData} 
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                onClick={(chartData) => {
                  if (chartData && chartData.activePayload && chartData.activePayload.length > 0) {
                    navigateToPaymentsWithFilter();
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                
                {/* Left Y-Axis for Thanh toán trong kỳ (Bar Chart) */}
                <YAxis 
                  yAxisId="left"
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)} Tỷ`}
                />

                {/* Right Y-Axis for Lũy kế giải ngân (Line Chart) */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981" 
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)} Tỷ`}
                />

                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />

                {/* Multi-layer Tooltip formatted strictly as X.XX Tỷ VNĐ */}
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const pVal = payload.find(p => p.dataKey === 'periodVal')?.value || 0;
                    const cVal = payload.find(p => p.dataKey === 'cumulativeVal')?.value || 0;

                    return (
                      <div className="p-3 rounded-xl bg-popover border border-border shadow-2xl text-xs space-y-1.5 z-50 font-sans">
                        <div className="font-bold text-popover-foreground border-b border-border pb-1.5 flex items-center justify-between gap-4">
                          <span>📅 {label}</span>
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 font-mono">
                            Dòng tiền dự án
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-0.5">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                            Thanh toán trong kỳ:
                          </span>
                          <strong className="text-primary font-mono">
                            {((Number(pVal) || 0) / 1_000_000_000).toFixed(2)} Tỷ VNĐ
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                            Lũy kế giải ngân:
                          </span>
                          <strong className="text-success font-mono">
                            {((Number(cVal) || 0) / 1_000_000_000).toFixed(2)} Tỷ VNĐ
                          </strong>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Series 1: Thanh toán trong kỳ (Bar Chart - Blue) */}
                <Bar 
                  yAxisId="left"
                  dataKey="periodVal" 
                  name="Thanh toán trong kỳ" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={36}
                />

                {/* Series 2: Lũy kế giải ngân (Line Chart - Green) */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="cumulativeVal" 
                  name="Lũy kế giải ngân" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-xs italic bg-background/40 rounded-xl border border-border space-y-2">
            <div className="text-center">
              <CreditCard className="w-8 h-8 text-muted-foreground/50 mx-auto mb-1" />
              <p className="font-semibold text-muted-foreground">Chưa đủ dữ liệu thanh toán trong phạm vi chọn để vẽ biểu đồ dòng tiền.</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">Vui lòng chọn phạm vi thời gian khác hoặc nhập đợt thanh toán cho dự án này.</p>
            </div>
          </div>
        )}
      </div>

      {/* SỨC KHỎE TÀI CHÍNH & KHU VỰC CẦN QUAN TÂM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: SỨC KHỎE TÀI CHÍNH DỰ ÁN */}
        <div className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between space-y-4 ${
          healthStatus === 'DANGER'
            ? 'bg-card border-destructive/60'
            : healthStatus === 'WARNING'
            ? 'bg-card border-warning/60'
            : 'bg-card border-success/60'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-success" />
                SỨC KHỎE TÀI CHÍNH DỰ ÁN
              </h3>

              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                healthStatus === 'DANGER'
                  ? 'bg-destructive/20 text-destructive border-destructive/50'
                  : healthStatus === 'WARNING'
                  ? 'bg-warning/20 text-warning border-warning/50'
                  : 'bg-success/20 text-success border-success/50'
              }`}>
                {healthStatus === 'DANGER' ? '🔴 NGUY CƠ VƯỢT TMĐT' : healthStatus === 'WARNING' ? '🟠 CẦN THEO DÕI' : '🟢 TRONG NGÂN SÁCH'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-background/60 border border-border/80">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Đã thanh toán / TMĐT</span>
                <span className="font-mono font-bold text-success text-sm mt-0.5 block">{paidTmdtRatio.toFixed(1)}%</span>
              </div>

              <div className="p-3 rounded-xl bg-background/60 border border-border/80">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Giá trị HĐ đã ký / TMĐT</span>
                <span className="font-mono font-bold text-primary text-sm mt-0.5 block">{signedRatio.toFixed(1)}%</span>
              </div>

              <div className="p-3 rounded-xl bg-background/60 border border-border/80">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Dự kiến quyết toán / TMĐT</span>
                <span className="font-mono font-bold text-primary text-sm mt-0.5 block">{settlementRatio.toFixed(1)}%</span>
              </div>

              <div className="p-3 rounded-xl bg-background/60 border border-border/80">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Ngân sách còn lại</span>
                <span className={`font-mono font-bold text-sm mt-0.5 block ${remainingBudget < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatVNDCompact(remainingBudget)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-muted-foreground">Tiến độ sử dụng ngân sách dự kiến:</span>
                <span className="font-bold text-foreground">{settlementRatio.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    settlementRatio > 100 ? 'bg-destructive' : settlementRatio >= 95 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(100, settlementRatio)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: CẦN QUAN TÂM */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-warning" />
                CẦN QUAN TÂM ({detailedRiskAlerts.length} Cảnh báo & Vấn đề)
              </h3>

              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="text-xs font-bold text-primary hover:text-primary/90 flex items-center gap-1 transition cursor-pointer"
              >
                Xem tất cả cảnh báo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {detailedRiskAlerts.slice(0, 4).map((alt) => (
                <div 
                  key={alt.id}
                  onClick={navigateToContractsWithFilter}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition shadow-sm ${
                    alt.level === 'danger'
                      ? 'bg-destructive/10 border-destructive/40 text-destructive hover:border-destructive/80'
                      : alt.level === 'warning'
                      ? 'bg-warning/10 border-warning/40 text-warning hover:border-warning/80'
                      : 'bg-primary/10 border-primary/40 text-primary hover:border-primary/80'
                  }`}
                >
                  <div className="flex items-center gap-2 pr-2">
                    <span className="font-bold text-[11px] truncate">{alt.title}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-70" />
                </div>
              ))}

              {detailedRiskAlerts.length === 0 && (
                <div className="py-8 text-center text-success text-xs font-semibold flex items-center justify-center gap-2 bg-success/5 border border-success/20 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Không phát sinh vấn đề rủi ro. Tất cả hợp đồng đều an toàn.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* TÓM TẮT THANH TOÁN */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-success" />
              TÌNH HÌNH THANH TOÁN TỔNG HỢP ({periodLabel})
            </h3>
            <p className="text-[11px] text-muted-foreground">Tóm tắt tiến độ giải ngân của dự án trong phạm vi lọc đã chọn</p>
          </div>

          <button
            onClick={navigateToPaymentsWithFilter}
            className="px-4 py-2 rounded-xl bg-success hover:bg-success/90 text-success-foreground text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            Quản Lý Thanh Toán Chi Tiết <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-background/60 border border-border/80">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-semibold block mb-0.5">Số Đợt Chi Trong Kỳ</span>
            <span className="font-bold text-foreground text-sm">{activePaymentsForScope.length} đợt</span>
          </div>

          <div className="p-3 rounded-xl bg-background/60 border border-border/80">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-semibold block mb-0.5">Chi Trả Trong Kỳ</span>
            <span className="font-bold text-success text-sm">{formatVND(totalPaidInPeriod)}</span>
          </div>

          <div className="p-3 rounded-xl bg-background/60 border border-border/80">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-semibold block mb-0.5">HĐ Đã Giải Ngân</span>
            <span className="font-bold text-primary text-sm">{contractsWithPaymentsCount} / {projContracts.length} HĐ</span>
          </div>

          <div className="p-3 rounded-xl bg-background/60 border border-border/80">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-semibold block mb-0.5">HĐ Chưa Giải Ngân</span>
            <span className="font-bold text-warning text-sm">{projContracts.length - contractsWithPaymentsCount} HĐ</span>
          </div>

          <div className="p-3 rounded-xl bg-background/60 border border-border/80">
            <span className="text-[10px] text-muted-foreground font-sans uppercase font-semibold block mb-0.5">Thanh Toán Gần Nhất</span>
            <span className="font-bold text-primary text-sm">
              {latestPayment ? `${formatVNDCompact(latestPayment.amount_after_vat)} (${formatDisplayDate(latestPayment.payment_date)})` : 'Chưa có'}
            </span>
          </div>
        </div>
      </div>

      {/* ALL ALERTS MODAL */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-warning" />
                <h3 className="text-base font-bold text-foreground">Danh Sách Cảnh Báo & Vấn Đề Cần Quan Tâm</h3>
              </div>
              <button onClick={() => setIsAlertModalOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              {detailedRiskAlerts.map((alt) => (
                <div 
                  key={alt.id}
                  onClick={() => {
                    setIsAlertModalOpen(false);
                    navigateToContractsWithFilter();
                  }}
                  className={`p-4 rounded-xl border space-y-1.5 cursor-pointer transition ${
                    alt.level === 'danger'
                      ? 'bg-destructive/10 border-destructive/50 text-destructive hover:border-destructive'
                      : alt.level === 'warning'
                      ? 'bg-warning/10 border-warning/50 text-warning hover:border-warning'
                      : 'bg-primary/10 border-primary/50 text-primary hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{alt.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-background border border-border">
                      {alt.badge}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{alt.desc}</p>
                </div>
              ))}

              {detailedRiskAlerts.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  Không ghi nhận cảnh báo nào.
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-muted/50 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">Tổng số: {detailedRiskAlerts.length} ghi nhận</span>
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM MODALS LAYER */}
      <TmdtHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        project={historyProject}
        onOpenAddNewPhase={(proj) => handleOpenAddNewPhase(proj)}
        onOpenEditPhase={(phase) => handleOpenEditPhase(historyProject, phase)}
        onOpenViewPhaseDetail={(phase) => handleOpenPhaseDetail(historyProject, phase)}
        onDeletePhase={(projId, phaseId) => onDeleteTmdtPhase(projId, phaseId)}
      />

      <TmdtFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        project={formProject}
        editingPhase={editingPhase}
        onSavePhase={handleSavePhaseSubmit}
      />

      <TmdtPhaseDetailModal
        isOpen={isPhaseDetailModalOpen}
        onClose={() => setIsPhaseDetailModalOpen(false)}
        project={viewingPhaseProject}
        phase={viewingPhase}
        onEditPhase={(phase) => handleOpenEditPhase(viewingPhaseProject, phase)}
      />

      {deletingProject && (
        <DeleteProjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingProject(null);
          }}
          project={deletingProject}
          contractsCount={contracts.filter(c => c.project_id === deletingProject.id).length}
          paymentsCount={payments.filter(pm => {
            const delContractIds = contracts.filter(c => c.project_id === deletingProject.id).map(c => c.id);
            return delContractIds.includes(pm.contract_id);
          }).length}
          onConfirmDelete={(projId) => {
            const result = onDeleteProject(projId);
            const remaining = projects.filter(p => p.id !== projId);
            if (remaining.length > 0 && setSelectedProjectId) {
              setSelectedProjectId(remaining[0].id);
            } else if (setSelectedProjectId) {
              setSelectedProjectId('');
            }
            return result;
          }}
        />
      )}

      <DeleteAllProjectsModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        projectsCount={projects.length}
        contractsCount={contracts.length}
        paymentsCount={payments.length}
        onConfirmDeleteAll={async () => {
          if (onDeleteAllProjects) {
            await onDeleteAllProjects();
            if (setSelectedProjectId) setSelectedProjectId('');
            setToastMsg('Đã xóa toàn bộ dự án và dữ liệu liên quan thành công.');
            setTimeout(() => setToastMsg(''), 6000);
          }
        }}
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={!!previewPdfUrl}
        pdfUrl={previewPdfUrl}
        filename={previewPdfFilename}
        title={`Xem trước Báo cáo Dự án: ${activeProj?.name || ''}`}
        onClose={() => {
          if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
          setPreviewPdfBlob(null);
        }}
        onDownload={() => {
          if (previewPdfBlob && previewPdfFilename) {
            const url = URL.createObjectURL(previewPdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = previewPdfFilename;
            a.click();
            URL.revokeObjectURL(url);
          }
        }}
      />
      
      {/* Manage Members Modal */}
      <ProjectMembersModal 
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        project={activeProj}
        userSession={userSession}
      />
    </div>
  );
}
