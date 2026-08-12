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
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { formatVND, formatVNDCompact, formatDisplayDate, cleanVND, calcEndDate, calcDaysBetween } from '../../utils/formatters';
import TmdtHistoryModal from './TmdtHistoryModal';
import TmdtFormModal from './TmdtFormModal';
import TmdtPhaseDetailModal from './TmdtPhaseDetailModal';
import DeleteProjectModal from './DeleteProjectModal';
import DeleteAllProjectsModal from './DeleteAllProjectsModal';

export default function ProjectsView({ 
  data, 
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

  // Modals State
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
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg('')} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <FolderKanban className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Chưa có dữ liệu dự án trong hệ thống</h3>
          <p className="text-xs text-slate-400">Vui lòng khởi tạo dự án đầu tiên hoặc Import từ Excel để bắt đầu xem Tổng quan dự án.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold cursor-pointer"
            >
              📥 Import Excel
            </button>
            <button
              onClick={onNewProject}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 cursor-pointer"
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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* HEADER DỰ ÁN COMPACT */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        
        {/* Row 1: Action Buttons & Project Title Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DỰ ÁN ĐANG QUẢN TRỊ TÀI CHÍNH</span>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                {activeProj.name}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              📥 Import Excel
            </button>
            <button
              onClick={() => onEditProject(activeProj)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5 text-blue-400" /> Chỉnh sửa dự án
            </button>
            <button
              onClick={() => handleOpenTmdtHistory(activeProj)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> Lịch sử TMĐT
            </button>
            <button
              onClick={() => handleOpenDeleteModal(activeProj)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-500/40 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Xóa DA
            </button>
            <button
              onClick={onNewProject}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> + Thêm dự án
            </button>
          </div>
        </div>

        {/* Global Filter Project Status Banner */}
        {selectedProjectId ? (
          <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🟢 Đang hiển thị chi tiết theo dự án chọn trên Header: <strong className="text-white font-bold">{activeProj.name}</strong></span>
          </div>
        ) : (
          <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ℹ️ Bạn đang chọn "Tất cả dự án" trên Header. Đang hiển thị chi tiết dự án đầu tiên: <strong className="text-white font-bold">{activeProj.name}</strong></span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Chọn 1 dự án trên Header để xem cụ thể</span>
          </div>
        )}

        {/* Row 2: Project Identification & Metadata Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {activeProj.name}
            </h1>
            {activeProj.code && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold">
                Mã: {activeProj.code}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {activeProj.status || 'Đang triển khai'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-1">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Chủ Đầu Tư:</span>
              <span className="font-semibold text-slate-200 truncate block" title={activeProj.investor || activeProj.manager || 'N/A'}>
                {activeProj.investor || activeProj.manager || 'Ban QLDA'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Địa Chỉ:</span>
              <span className="font-semibold text-slate-200 truncate block" title={formattedAddress}>
                {formattedAddress}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ngày Khởi Tạo:</span>
              <span className="font-mono font-bold text-slate-200 block">
                {formatDisplayDate(activeProj.created_at || activeProj.start_date)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Thời Gian Thực Hiện:</span>
              <span className="font-semibold text-slate-200 truncate block">
                {activeProj.execution_time || activeProj.timeline || 'Chưa cập nhật'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">TMĐT Gần Nhất:</span>
              <span className="font-mono font-bold text-emerald-400 truncate block">
                {formatVND(currentTmdt)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tổng Hợp Đồng:</span>
              <span className="font-mono font-bold text-cyan-300 block">
                {projContracts.length} Hợp đồng
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 6 KPI TÀI CHÍNH CỐT LÕI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" />
            6 CHỈ TIÊU TÀI CHÍNH CỐT LÕI ({periodLabel})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Bấm vào card để chuyển sang module chi tiết</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* KPI 1: TMĐT */}
          <div 
            onClick={() => handleOpenTmdtHistory(activeProj)}
            className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 transition cursor-pointer space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">1. TỔNG MỨC ĐẦU TƯ (TMĐT)</span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                {activeProj.latestPhaseLabel || 'Hiện tại'}
              </span>
            </div>

            <div className="text-xl font-black text-white font-mono group-hover:text-emerald-300 transition">
              {formatVND(currentTmdt)}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] font-mono">Hạn mức ngân sách phê duyệt</span>
              <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                Lịch sử TMĐT <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 2: GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ */}
          <div 
            onClick={navigateToContractsWithFilter}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition cursor-pointer space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">2. GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ</span>
              <FileText className="w-4 h-4" />
            </div>

            <div className="text-xl font-black text-blue-300 font-mono group-hover:text-blue-200 transition">
              {formatVND(signedContracts)}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px]">{projContracts.length} HĐ đã ký</span>
              <span className="text-blue-400 font-bold text-[11px]">{signedRatio.toFixed(1)}% TMĐT</span>
            </div>
          </div>

          {/* KPI 3: ĐÃ THANH TOÁN THỰC TẾ */}
          <div 
            onClick={navigateToPaymentsWithFilter}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                3. {isTimeRangeFilterActive ? `CHI TRẢ TRONG KỲ` : `ĐÃ THANH TOÁN THỰC TẾ`}
              </span>
              <CreditCard className="w-4 h-4" />
            </div>

            <div className="text-xl font-black text-emerald-400 font-mono group-hover:text-emerald-300 transition">
              {formatVND(isTimeRangeFilterActive ? totalPaidInPeriod : totalPaidAllTime)}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px]">
                {isTimeRangeFilterActive ? `Lũy kế all-time: ${formatVNDCompact(totalPaidAllTime)}` : `${projAllPayments.length} đợt phát sinh`}
              </span>
              <span className="text-emerald-400 font-bold text-[11px]">{paidTmdtRatio.toFixed(1)}% TMĐT</span>
            </div>
          </div>

          {/* KPI 4: DỰ KIẾN QUYẾT TOÁN */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">4. DỰ KIẾN QUYẾT TOÁN</span>
              <TrendingUp className="w-4 h-4" />
            </div>

            <div className="text-xl font-black text-purple-300 font-mono">
              {formatVND(estimatedSettlement)}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px]">Dự toán sau cùng</span>
              <span className="text-purple-300 font-bold text-[11px]">{settlementRatio.toFixed(1)}% TMĐT</span>
            </div>
          </div>

          {/* KPI 5: CÒN PHẢI THANH TOÁN */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">5. CÒN PHẢI THANH TOÁN</span>
              <CreditCard className="w-4 h-4 text-amber-400" />
            </div>

            <div className="text-xl font-black text-amber-400 font-mono">
              {formatVND(remainingToPay)}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px]">Dự kiến QT − Đã TT</span>
              <span className="text-amber-400 font-bold text-[11px]">Dư nợ cam kết</span>
            </div>
          </div>

          {/* KPI 6: NGÂN SÁCH CÒN LẠI */}
          <div className={`p-4 rounded-xl bg-slate-900 border space-y-1.5 shadow-md ${
            remainingBudget < 0 
              ? 'border-rose-500/80 bg-rose-950/20' 
              : 'border-emerald-500/50 bg-emerald-950/20'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">6. NGÂN SÁCH CÒN LẠI</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                remainingBudget < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {remainingBudget < 0 ? '⚠️ Vượt ngân sách' : '🟢 An toàn'}
              </span>
            </div>

            <div className={`text-xl font-black font-mono ${
              remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-300'
            }`}>
              {remainingBudget < 0 ? `Vượt ${formatVND(Math.abs(remainingBudget))}` : formatVND(remainingBudget)}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px]">TMĐT − Dự kiến QT</span>
              <span className={`font-bold text-[11px] ${remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {currentTmdt > 0 ? (remainingBudget / currentTmdt * 100).toFixed(1) : 0}% TMĐT
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* CƠ CẤU NGÂN SÁCH & TÌNH HÌNH HỢP ĐỒNG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CƠ CẤU NGÂN SÁCH DỰ ÁN */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              CƠ CẤU NGÂN SÁCH DỰ ÁN
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Phân bổ chi phí vs TMĐT</span>
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
              <span className="text-[10px] text-slate-400 uppercase font-semibold">TỔNG TMĐT</span>
              <span className="text-xs font-black text-white font-mono">{formatVNDCompact(currentTmdt)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            <div 
              onClick={navigateToPaymentsWithFilter}
              className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Đã thanh toán:
              </div>
              <div className="font-mono font-bold text-emerald-400 text-xs mt-0.5">{formatVND(totalPaidAllTime)}</div>
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Còn phải thanh toán:
              </div>
              <div className="font-mono font-bold text-amber-400 text-xs mt-0.5">{formatVND(remainingToPay)}</div>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Ngân sách còn lại:
              </div>
              <div className={`font-mono font-bold text-xs ${remainingBudget < 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                {formatVND(remainingBudget)}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: TÌNH HÌNH HỢP ĐỒNG */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              TÌNH HÌNH HỢP ĐỒNG
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Tổng cộng: <strong className="text-white">{projContracts.length}</strong> hợp đồng</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            
            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Đang thực hiện</span>
                <span className="font-mono font-bold text-blue-400 text-sm mt-0.5 block">{countInExecution} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Đang giải ngân</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">{countDisbursing} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Đã quyết toán</span>
                <span className="font-mono font-bold text-cyan-300 text-sm mt-0.5 block">{countSettled} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Chưa giải ngân</span>
                <span className="font-mono font-bold text-amber-400 text-sm mt-0.5 block">{countNotDisbursed} HĐ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </div>

            <div 
              onClick={navigateToContractsWithFilter}
              className="col-span-2 p-3 rounded-xl bg-slate-950/60 border border-rose-500/40 hover:border-rose-500 cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div>
                  <span className="text-[11px] text-slate-300 font-bold block">Quá hạn chưa quyết toán</span>
                  <span className="text-[10px] text-slate-400">Đã quá ngày hoàn thành hợp đồng</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-rose-400 text-sm">{countOverdue} HĐ</span>
                <ArrowRight className="w-4 h-4 text-rose-400" />
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={navigateToContractsWithFilter}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
            >
              Quản lý hợp đồng chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* BIỂU ĐỒ DÒNG TIỀN THEO THỜI GIAN */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            DÒNG TIỀN DỰ ÁN (GIẢI NGÂN THEO THỜI GIAN - {periodLabel})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Bấm vào điểm dữ liệu để chuyển sang Quản lý Thanh toán</span>
        </div>

        {cashflowChartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={cashflowChartData} 
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onClick={(chartData) => {
                  if (chartData && chartData.activePayload && chartData.activePayload.length > 0) {
                    navigateToPaymentsWithFilter();
                  }
                }}
              >
                <defs>
                  <linearGradient id="colorCashflowCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCashflowPeriod" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(value, name) => [
                    formatVND(value), 
                    name === 'cumulativeVal' ? 'Lũy kế giải ngân' : 'Thanh toán trong kỳ'
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Area type="monotone" dataKey="cumulativeVal" name="cumulativeVal" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCashflowCumulative)" />
                <Area type="monotone" dataKey="periodVal" name="periodVal" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.5} fill="url(#colorCashflowPeriod)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
            <div className="text-center">
              <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-400">Chưa đủ dữ liệu thanh toán trong phạm vi chọn để vẽ biểu đồ dòng tiền.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Vui lòng chọn phạm vi thời gian khác hoặc nhập đợt thanh toán cho dự án này.</p>
            </div>
          </div>
        )}
      </div>

      {/* SỨC KHỎE TÀI CHÍNH & KHU VỰC CẦN QUAN TÂM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: SỨC KHỎE TÀI CHÍNH DỰ ÁN */}
        <div className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between space-y-4 ${
          healthStatus === 'DANGER'
            ? 'bg-slate-900 border-rose-500/60'
            : healthStatus === 'WARNING'
            ? 'bg-slate-900 border-amber-500/60'
            : 'bg-slate-900 border-emerald-500/60'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                SỨC KHỎE TÀI CHÍNH DỰ ÁN
              </h3>

              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                healthStatus === 'DANGER'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : healthStatus === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              }`}>
                {healthStatus === 'DANGER' ? '🔴 NGUY CƠ VƯỢT TMĐT' : healthStatus === 'WARNING' ? '🟠 CẦN THEO DÕI' : '🟢 TRONG NGÂN SÁCH'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đã thanh toán / TMĐT</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">{paidTmdtRatio.toFixed(1)}%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Giá trị HĐ đã ký / TMĐT</span>
                <span className="font-mono font-bold text-blue-400 text-sm mt-0.5 block">{signedRatio.toFixed(1)}%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dự kiến quyết toán / TMĐT</span>
                <span className="font-mono font-bold text-purple-300 text-sm mt-0.5 block">{settlementRatio.toFixed(1)}%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ngân sách còn lại</span>
                <span className={`font-mono font-bold text-sm mt-0.5 block ${remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-300'}`}>
                  {formatVNDCompact(remainingBudget)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Tiến độ sử dụng ngân sách dự kiến:</span>
                <span className="font-bold text-white">{settlementRatio.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    settlementRatio > 100 ? 'bg-rose-500' : settlementRatio >= 95 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, settlementRatio)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: CẦN QUAN TÂM */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                CẦN QUAN TÂM ({detailedRiskAlerts.length} Cảnh báo & Vấn đề)
              </h3>

              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
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
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-200 hover:border-rose-400'
                      : alt.level === 'warning'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200 hover:border-amber-400'
                      : 'bg-blue-950/30 border-blue-500/40 text-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-2 pr-2">
                    <span className="font-bold text-[11px] truncate">{alt.title}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-70" />
                </div>
              ))}

              {detailedRiskAlerts.length === 0 && (
                <div className="py-8 text-center text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Không phát sinh vấn đề rủi ro. Tất cả hợp đồng đều an toàn.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* TÓM TẮT THANH TOÁN */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              TÌNH HÌNH THANH TOÁN TỔNG HỢP ({periodLabel})
            </h3>
            <p className="text-[11px] text-slate-400">Tóm tắt tiến độ giải ngân của dự án trong phạm vi lọc đã chọn</p>
          </div>

          <button
            onClick={navigateToPaymentsWithFilter}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            Quản Lý Thanh Toán Chi Tiết <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-semibold block mb-0.5">Số Đợt Chi Trong Kỳ</span>
            <span className="font-bold text-white text-sm">{activePaymentsForScope.length} đợt</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-semibold block mb-0.5">Chi Trả Trong Kỳ</span>
            <span className="font-bold text-emerald-400 text-sm">{formatVND(totalPaidInPeriod)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-semibold block mb-0.5">HĐ Đã Giải Ngân</span>
            <span className="font-bold text-blue-300 text-sm">{contractsWithPaymentsCount} / {projContracts.length} HĐ</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-semibold block mb-0.5">HĐ Chưa Giải Ngân</span>
            <span className="font-bold text-amber-400 text-sm">{projContracts.length - contractsWithPaymentsCount} HĐ</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-semibold block mb-0.5">Thanh Toán Gần Nhất</span>
            <span className="font-bold text-cyan-300 text-sm">
              {latestPayment ? `${formatVNDCompact(latestPayment.amount_after_vat)} (${formatDisplayDate(latestPayment.payment_date)})` : 'Chưa có'}
            </span>
          </div>
        </div>
      </div>

      {/* ALL ALERTS MODAL */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Danh Sách Cảnh Báo & Vấn Đề Cần Quan Tâm</h3>
              </div>
              <button onClick={() => setIsAlertModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
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
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 hover:border-rose-400'
                      : alt.level === 'warning'
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 hover:border-amber-400'
                      : 'bg-blue-950/30 border-blue-500/50 text-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{alt.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-900 border border-slate-700">
                      {alt.badge}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{alt.desc}</p>
                </div>
              ))}

              {detailedRiskAlerts.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  Không ghi nhận cảnh báo nào.
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Tổng số: {detailedRiskAlerts.length} ghi nhận</span>
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
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
        onConfirmDeleteAll={() => {
          if (onDeleteAllProjects) {
            onDeleteAllProjects();
            if (setSelectedProjectId) setSelectedProjectId('');
            setToastMsg('Đã xóa tất cả dự án thành công.');
            setTimeout(() => setToastMsg(''), 6000);
          }
        }}
      />

    </div>
  );
}
