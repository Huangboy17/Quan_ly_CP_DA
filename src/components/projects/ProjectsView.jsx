import React, { useState } from 'react';
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
  DollarSign, 
  ShieldAlert,
  CheckCircle2,
  PieChart as PieIcon,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Calendar,
  UserCheck,
  MapPin,
  Tag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { formatVND, formatVNDCompact, formatDisplayDate } from '../../utils/formatters';
import TmdtHistoryModal from './TmdtHistoryModal';
import TmdtFormModal from './TmdtFormModal';
import TmdtPhaseDetailModal from './TmdtPhaseDetailModal';
import DeleteProjectModal from './DeleteProjectModal';

export default function ProjectsView({ 
  data, 
  onNewProject, 
  onEditProject, 
  onDeleteProject, 
  onAddTmdtPhase,
  onUpdateTmdtPhase,
  onDeleteTmdtPhase,
  onOpenExcelImport,
  setSelectedProjectId, 
  setActiveTab,
  globalSearch 
}) {
  const { projects = [], contracts = [], payments = [] } = data;

  // Selected Project State - Default to first project if available
  const [currentProjId, setCurrentProjId] = useState(() => {
    return projects.length > 0 ? projects[0].id : '';
  });

  // Keep currentProjId synced if projects list changes and current selection is missing
  const activeProj = projects.find(p => p.id === currentProjId) || (projects.length > 0 ? projects[0] : null);

  // Modals State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProject, setHistoryProject] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formProject, setFormProject] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);

  const [isPhaseDetailModalOpen, setIsPhaseDetailModalOpen] = useState(false);
  const [viewingPhaseProject, setViewingPhaseProject] = useState(null);
  const [viewingPhase, setViewingPhase] = useState(null);

  // Delete Project Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);

  const handleOpenDeleteModal = (proj) => {
    setDeletingProject(proj);
    setIsDeleteModalOpen(true);
  };

  // Handlers
  const handleSelectProject = (pId) => {
    setCurrentProjId(pId);
    if (setSelectedProjectId) {
      setSelectedProjectId(pId);
    }
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

  if (!activeProj) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <FolderKanban className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-white">Chưa có dữ liệu dự án trong hệ thống</h3>
        <p className="text-xs text-slate-400">Vui lòng khởi tạo dự án đầu tiên để bắt đầu xem Dashboard tổng quan.</p>
        <button
          onClick={onNewProject}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          + Thêm Dự Án Mới
        </button>
      </div>
    );
  }

  // Active Project Data Metrics
  const projContracts = contracts.filter(c => c.project_id === activeProj.id);
  const projContractIds = projContracts.map(c => c.id);
  const projPayments = payments.filter(pm => projContractIds.includes(pm.contract_id));

  const currentTmdt = activeProj.currentTmdt || 0;
  const initialTmdt = activeProj.initial_tmdt || 0;
  const signedContracts = activeProj.totalContractValueAfterVAT || 0;
  const totalPaid = activeProj.totalPaidAfterVAT || 0;
  const estimatedSettlement = activeProj.projEstimatedSettlement || 0;
  const remainingToPay = activeProj.remainingToPay || 0;
  const remainingBudget = activeProj.remainingProjectBudget || 0;
  const unallocatedTmdt = activeProj.unallocatedTmdt || 0;

  // Percentage Ratios vs TMĐT
  const signedRatio = activeProj.signedContractsRatio || 0;
  const paidTmdtRatio = currentTmdt > 0 ? Math.round((totalPaid / currentTmdt) * 1000) / 10 : 0;
  const paidSettlementRatio = activeProj.paymentProgressRatio || 0;
  const settlementRatio = activeProj.settlementTmdtRatio || 0;
  const remainingToPayTmdtRatio = currentTmdt > 0 ? Math.round((remainingToPay / currentTmdt) * 1000) / 10 : 0;
  const remainingBudgetRatio = currentTmdt > 0 ? Math.round((remainingBudget / currentTmdt) * 1000) / 10 : 0;

  // Contract Breakdown Statuses
  const settledContractsCount = projContracts.filter(c => c.status === 'settled' || c.paidPercentage >= 100).length;
  const inProgressPayingContractsCount = projContracts.filter(c => c.status !== 'settled' && c.totalPaidAfterVAT > 0).length;
  const unpaidContractsCount = projContracts.filter(c => c.totalPaidAfterVAT === 0).length;

  // Risk Alerts Detection Engine
  const alerts = [];
  if (currentTmdt > 0 && estimatedSettlement > currentTmdt) {
    alerts.push({
      id: 'settlement-exceeds-tmdt',
      level: 'danger',
      title: '🔴 Dự kiến quyết toán vượt Tổng mức đầu tư (TMĐT)',
      desc: `Tổng giá trị dự kiến quyết toán các hợp đồng (${formatVND(estimatedSettlement)}) đã vượt quá TMĐT hiện tại (${formatVND(currentTmdt)}) một khoản ${formatVND(estimatedSettlement - currentTmdt)}!`
    });
  }

  if (remainingBudget < 0) {
    alerts.push({
      id: 'negative-budget',
      level: 'danger',
      title: '🔴 Cảnh báo ngân sách còn lại bị âm',
      desc: `Ngân sách còn lại của dự án đang bị âm ${formatVND(Math.abs(remainingBudget))}. Dự án đang đối mặt với rủi ro thiếu vạch vốn đầu tư.`
    });
  }

  if (totalPaid > estimatedSettlement && estimatedSettlement > 0) {
    alerts.push({
      id: 'paid-exceeds-settlement',
      level: 'danger',
      title: '🔴 Đã thanh toán thực tế vượt giá trị dự kiến quyết toán',
      desc: `Tổng tiền thanh toán thực tế (${formatVND(totalPaid)}) đã vượt giá trị dự kiến quyết toán (${formatVND(estimatedSettlement)})!`
    });
  }

  if (currentTmdt > 0 && signedContracts > currentTmdt) {
    alerts.push({
      id: 'contracts-exceed-tmdt',
      level: 'warning',
      title: '🟠 Giá trị hợp đồng đã ký vượt TMĐT',
      desc: `Tổng giá trị HĐ đã ký (${formatVND(signedContracts)}) đang cao hơn TMĐT hiện tại (${formatVND(currentTmdt)}).`
    });
  }

  if (unpaidContractsCount > 0) {
    alerts.push({
      id: 'unpaid-contracts',
      level: 'info',
      title: '🟡 Một số hợp đồng chưa phát sinh đợt thanh toán',
      desc: `Hiện có ${unpaidContractsCount} hợp đồng đã ký nhưng chưa thực hiện đợt giải ngân / tạm ứng nào.`
    });
  }

  if (activeProj.tmdt_history?.length > 1) {
    const latestPhase = activeProj.tmdt_history[activeProj.tmdt_history.length - 1];
    alerts.push({
      id: 'tmdt-adjusted',
      level: 'info',
      title: `🟡 TMĐT dự án đã qua ${activeProj.tmdt_history.length} lần điều chỉnh`,
      desc: `Điều chỉnh mới nhất (${latestPhase.phase_label}) được ghi nhận ngày ${formatDisplayDate(latestPhase.date)} với giá trị ${formatVND(latestPhase.amount)}.`
    });
  }

  // Monthly Payment Disbursements Data Chart Generator
  const monthlyMap = {};
  projPayments.forEach(pm => {
    if (!pm.payment_date) return;
    const monthKey = pm.payment_date.substring(0, 7); // YYYY-MM
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(pm.amount_after_vat || 0);
  });

  const chartData = Object.keys(monthlyMap).sort().map(m => {
    const [y, mStr] = m.split('-');
    return {
      month: `T${mStr}/${y.substring(2)}`,
      amount: monthlyMap[m],
      amountInBillion: Math.round((monthlyMap[m] / 1_000_000_000) * 100) / 100
    };
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ================================================== */}
      {/* 1 & 2. PROJECT SELECTOR TOOLBAR (CỐ ĐỊNH Ở ĐẦU DSHBOARD) */}
      {/* ================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CHỌN DỰ ÁN ĐỂ XEM TỔNG QUAN ({projects.length} Dự án)
            </label>
            
            <div className="relative">
              <select
                value={activeProj.id}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="appearance-none w-full sm:w-80 px-4 py-2.5 pr-10 bg-slate-800 border border-blue-500/50 hover:border-blue-400 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition cursor-pointer shadow-lg"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white font-medium py-1">
                    {p.name} ({formatVNDCompact(p.currentTmdt || 0)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            title="Import danh sách Dự án từ Excel"
          >
            📥 Import Excel
          </button>

          <button
            onClick={() => onEditProject(activeProj)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            title="Chỉnh sửa thông tin dự án"
          >
            <Edit className="w-3.5 h-3.5 text-blue-400" />
            Thông Tin Dự Án
          </button>

          <button
            onClick={() => handleOpenDeleteModal(activeProj)}
            className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-500/40 transition cursor-pointer flex items-center gap-1.5"
            title="Xóa vĩnh viễn dự án này"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Xóa Dự Án
          </button>

          <button
            onClick={onNewProject}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Thêm Dự Án
          </button>
        </div>

      </div>

      {/* ================================================== */}
      {/* 3. PHẦN THÔNG TIN ĐẦU TRANG (HEADER METADATA DỰ ÁN) */}
      {/* ================================================== */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {activeProj.name}
              </h1>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Đang triển khai
              </span>
            </div>
            {activeProj.description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                {activeProj.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenTmdtHistory(activeProj)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              Lịch Sử TMĐT ({activeProj.tmdt_history?.length || 1} lần)
            </button>
          </div>
        </div>

        {/* Project Properties List */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold uppercase flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Ngày Khởi Tạo
            </span>
            <span className="font-mono font-bold text-slate-200 mt-0.5 block">
              {formatDisplayDate(activeProj.created_at)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-semibold uppercase flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Chủ Đầu Tư / Ban QLDA
            </span>
            <span className="font-medium text-slate-200 mt-0.5 block truncate">
              {activeProj.investor || activeProj.manager || 'Ban Quản Lý Dự Án Nội Bộ'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-semibold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> Địa Điểm / Hạng Mục
            </span>
            <span className="font-medium text-slate-200 mt-0.5 block truncate" title={activeProj.location || activeProj.address || 'Chưa cập nhật'}>
              {activeProj.location || activeProj.address || 'Chưa cập nhật'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-semibold uppercase flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Phê Duyệt Gần Nhất
            </span>
            <span className="font-mono font-bold text-emerald-400 mt-0.5 block">
              {formatDisplayDate(activeProj.latestApprovalDate)} ({activeProj.latestPhaseLabel})
            </span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 4. 6 KPI QUAN TRỌNG NHẤT CHO DỰ ÁN ĐANG CHỌN */}
      {/* ================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" />
            6 CHỈ TIÊU TÀI CHÍNH CỐT LÕI (KPI DỰ ÁN)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Giá trị quy đổi VNĐ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* KPI 1: TỔNG MỨC ĐẦU TƯ (TMĐT) */}
          <div 
            onClick={() => handleOpenTmdtHistory(activeProj)}
            className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 transition cursor-pointer space-y-2 group shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-extrabold uppercase tracking-wider">1. TỔNG MỨC ĐẦU TƯ (TMĐT)</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono">
                {activeProj.latestPhaseLabel}
              </span>
            </div>

            <div className="text-2xl font-black text-white font-mono group-hover:text-emerald-300 transition">
              {formatVND(currentTmdt)}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">Lần phê duyệt mới nhất</span>
              <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-1 text-[11px]">
                Xem lịch sử TMĐT <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 2: GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ */}
          <div 
            onClick={() => {
              if (setSelectedProjectId) setSelectedProjectId(activeProj.id);
              setActiveTab('contracts');
            }}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition cursor-pointer space-y-2 group shadow-xl"
          >
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-extrabold uppercase tracking-wider">2. GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ</span>
              <FileText className="w-4 h-4" />
            </div>

            <div className="text-2xl font-black text-blue-300 font-mono group-hover:text-blue-200 transition">
              {formatVND(signedContracts)}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{projContracts.length} Hợp đồng</span>
              <span className="text-blue-400 font-bold">Ký / TMĐT: {signedRatio}%</span>
            </div>
          </div>

          {/* KPI 3: ĐÃ THANH TOÁN */}
          <div 
            onClick={() => {
              if (setSelectedProjectId) setSelectedProjectId(activeProj.id);
              setActiveTab('payments');
            }}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer space-y-2 group shadow-xl"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-extrabold uppercase tracking-wider">3. ĐÃ THANH TOÁN THỰC TẾ</span>
              <CreditCard className="w-4 h-4" />
            </div>

            <div className="text-2xl font-black text-emerald-400 font-mono group-hover:text-emerald-300 transition">
              {formatVND(totalPaid)}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>TT / TMĐT: {paidTmdtRatio}%</span>
              <span className="text-emerald-400 font-bold">TT / Quyết toán: {paidSettlementRatio}%</span>
            </div>
          </div>

          {/* KPI 4: DỰ KIẾN QUYẾT TOÁN */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-xs font-extrabold uppercase tracking-wider">4. DỰ KIẾN QUYẾT TOÁN</span>
              <TrendingUp className="w-4 h-4" />
            </div>

            <div className="text-2xl font-black text-purple-300 font-mono">
              {formatVND(estimatedSettlement)}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Quy mô HĐ dự kiến</span>
              <span className="text-purple-300 font-bold">Dự kiến / TMĐT: {settlementRatio}%</span>
            </div>
          </div>

          {/* KPI 5: CÒN PHẢI THANH TOÁN */}
          <div className={`p-5 rounded-2xl bg-slate-900 border space-y-2 shadow-xl ${
            remainingToPay < 0 ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-extrabold uppercase tracking-wider">5. CÒN PHẢI THANH TOÁN</span>
              {remainingToPay < 0 && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            </div>

            <div className={`text-2xl font-black font-mono ${remainingToPay < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
              {formatVND(remainingToPay)}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Dự kiến QT − Đã TT</span>
              <span className="text-amber-400 font-bold">{remainingToPayTmdtRatio}% TMĐT</span>
            </div>
          </div>

          {/* KPI 6: NGÂN SÁCH CÒN LẠI */}
          <div className={`p-5 rounded-2xl bg-slate-900 border space-y-2 shadow-xl ${
            remainingBudget < 0 ? 'border-rose-500/90 bg-rose-950/30' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-cyan-400">
              <span className="text-xs font-extrabold uppercase tracking-wider">6. NGÂN SÁCH CÒN LẠI</span>
              {remainingBudget < 0 && <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">⚠️ VƯỢT NGÂN SÁCH</span>}
            </div>

            <div className={`text-2xl font-black font-mono ${remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-300'}`}>
              {formatVND(remainingBudget)}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>TMĐT − Dự kiến QT</span>
              <span className={`font-bold ${remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {remainingBudgetRatio}% TMĐT
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ================================================== */}
      {/* 5. PHẦN "TÌNH HÌNH THỰC HIỆN" (PROGRESS BARS) & 6. TỔNG HỢP HỢP ĐỒNG */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TÌNH HÌNH THỰC HIỆN (TIẾN ĐỘ TÀI CHÍNH) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              TÌNH HÌNH THỰC HIỆN (TIẾN ĐỘ TÀI CHÍNH)
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">So với TMĐT</span>
          </div>

          <div className="space-y-4">
            
            {/* Progress 1: HĐ Đã ký / TMĐT */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">HĐ ĐÃ KÝ / TMĐT HIỆN TẠI</span>
                <span className={`font-mono font-bold ${signedRatio > 100 ? 'text-rose-400' : 'text-blue-400'}`}>
                  {signedRatio}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    signedRatio > 100 ? 'bg-rose-500' : signedRatio > 90 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, signedRatio)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Đã ký: {formatVNDCompact(signedContracts)}</span>
                <span>TMĐT: {formatVNDCompact(currentTmdt)}</span>
              </div>
            </div>

            {/* Progress 2: Đã thanh toán / TMĐT */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">ĐÃ THANH TOÁN THỰC TẾ / TMĐT</span>
                <span className={`font-mono font-bold ${paidTmdtRatio > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {paidTmdtRatio}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    paidTmdtRatio > 100 ? 'bg-rose-500' : paidTmdtRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, paidTmdtRatio)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Đã giải ngân: {formatVNDCompact(totalPaid)}</span>
                <span>TMĐT: {formatVNDCompact(currentTmdt)}</span>
              </div>
            </div>

            {/* Progress 3: Dự kiến quyết toán / TMĐT */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">DỰ KIẾN QUYẾT TOÁN / TMĐT</span>
                <span className={`font-mono font-bold ${settlementRatio > 100 ? 'text-rose-400' : 'text-purple-400'}`}>
                  {settlementRatio}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    settlementRatio > 100 ? 'bg-rose-500' : settlementRatio > 90 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, settlementRatio)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Dự kiến QT: {formatVNDCompact(estimatedSettlement)}</span>
                <span>TMĐT: {formatVNDCompact(currentTmdt)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* TỔNG HỢP HỢP ĐỒNG (CONTRACT BREAKDOWN) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                TỔNG HỢP HỢP ĐỒNG ĐÃ KÝ ({projContracts.length} HĐ)
              </h3>
              <span className="text-[11px] font-mono text-blue-400 font-bold">
                {formatVND(signedContracts)}
              </span>
            </div>

            {/* Distribution Stats Row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Đã Quyết Toán / Xong</span>
                <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">{settledContractsCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Đang Thanh Toán</span>
                <span className="text-lg font-black text-blue-400 font-mono mt-0.5 block">{inProgressPayingContractsCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Chưa Thanh Toán</span>
                <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">{unpaidContractsCount}</span>
              </div>
            </div>

            {/* Visual Distribution Segmented Bar */}
            {projContracts.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Phân bổ tình trạng hợp đồng</span>
                  <span className="font-mono text-slate-300">100% ({projContracts.length} HĐ)</span>
                </div>
                <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-700/60">
                  <div 
                    className="h-full bg-emerald-500 transition-all" 
                    style={{ width: `${(settledContractsCount / projContracts.length) * 100}%` }}
                    title={`Đã quyết toán: ${settledContractsCount} HĐ`}
                  />
                  <div 
                    className="h-full bg-blue-500 transition-all" 
                    style={{ width: `${(inProgressPayingContractsCount / projContracts.length) * 100}%` }}
                    title={`Đang thanh toán: ${inProgressPayingContractsCount} HĐ`}
                  />
                  <div 
                    className="h-full bg-amber-500 transition-all" 
                    style={{ width: `${(unpaidContractsCount / projContracts.length) * 100}%` }}
                    title={`Chưa thanh toán: ${unpaidContractsCount} HĐ`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                if (setSelectedProjectId) setSelectedProjectId(activeProj.id);
                setActiveTab('contracts');
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              Xem Tất Cả Hợp Đồng Thuộc Dự Án Này <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ================================================== */}
      {/* 7. PHẦN CẢNH BÁO & RỦI RO DỮ LIỆU THỰC TẾ */}
      {/* ================================================== */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            CẢNH BÁO & LƯU Ý RỦI RO QUẢN LÝ DỰ ÁN ({alerts.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Tự động phát hiện từ dữ liệu thực tế</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map(alt => (
            <div 
              key={alt.id} 
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                alt.level === 'danger' 
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-300' 
                  : alt.level === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                  : 'bg-blue-950/20 border-blue-500/40 text-blue-300'
              }`}
            >
              <div className="font-bold text-xs flex items-center gap-1.5">
                <span>{alt.title}</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed font-sans">{alt.desc}</p>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="col-span-full py-6 text-center text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Không phát hiện bất kỳ cảnh báo hay rủi ro tài chính nào cho dự án này.
            </div>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* 8. PHẦN LỊCH SỬ TMĐT & 9. TIẾN ĐỘ THANH TOÁN THEO THỜI GIAN */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BIẾN ĐỘNG TMĐT TIMELINE WIDGET */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                BIẾN ĐỘNG TMĐT THEO THỜI GIAN ({activeProj.tmdt_history?.length || 1} đợt)
              </h3>
              <button
                onClick={() => handleOpenTmdtHistory(activeProj)}
                className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
              >
                Xem tất cả lịch sử TMĐT <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of recent TMĐT timeline phases */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeProj.tmdt_history?.map((phase, idx) => {
                const isCurrent = idx === activeProj.tmdt_history.length - 1;
                const diff = phase.diff_amount || 0;
                return (
                  <div 
                    key={phase.id || idx} 
                    onClick={() => handleOpenPhaseDetail(activeProj, phase)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent 
                        ? 'bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-400' 
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0 ${
                        isCurrent ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {phase.phase_label || `Lần ${idx + 1}`}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                          {phase.content || 'Phê duyệt TMĐT'}
                          {isCurrent && (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.2 rounded">
                              🔵 TMĐT Hiện tại
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ngày: {formatDisplayDate(phase.date)} {phase.decision_number && `• ${phase.decision_number}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="font-bold text-white text-xs">{formatVND(phase.amount)}</div>
                      {idx > 0 && (
                        <div className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {diff >= 0 ? `+${formatVND(diff)}` : formatVND(diff)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => handleOpenAddNewPhase(activeProj)}
            className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> + Thêm Lần Điều Chỉnh TMĐT Mới
          </button>
        </div>

        {/* TIẾN ĐỘ THANH TOÁN THEO THỜI GIAN (RECHARTS BAR CHART) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-400" />
              TIẾN ĐỘ GIẢI NGÂN THANH TOÁN THEO THỜI GIAN
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Đơn vị: Tỷ VNĐ</span>
          </div>

          {chartData.length > 0 ? (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} Tỷ VNĐ`, 'Giá trị giải ngân']}
                  />
                  <Bar dataKey="amountInBillion" fill="#10b981" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs bg-slate-800/40 rounded-xl">
              Chưa có dữ liệu giao dịch thanh toán nào được phát sinh cho dự án này.
            </div>
          )}
        </div>

      </div>

      {/* ================================================== */}
      {/* MODALS LAYER */}
      {/* ================================================== */}
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
            // Switch selection if active project was deleted
            const remaining = projects.filter(p => p.id !== projId);
            if (remaining.length > 0) {
              handleSelectProject(remaining[0].id);
            } else {
              handleSelectProject('');
            }
            return result;
          }}
        />
      )}

    </div>
  );
}
