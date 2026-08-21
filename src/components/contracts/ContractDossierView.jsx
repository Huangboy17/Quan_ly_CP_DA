import React, { useState } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Building2, 
  Calendar, 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  ShieldCheck,
  Paperclip,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Info,
  Lock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatVND, formatDisplayDate, calcEndDate, calcDaysBetween, cleanVND } from '../../utils/formatters';
import { isContractFinalized } from '../../services/storage';

export default function ContractDossierView({
  contractId,
  data,
  onBackToContracts,
  onBackToProjectOverview,
  onEditContract,
  onOpenAddAppendix,
  onEditAppendix,
  onDeleteAppendix,
  onOpenAddPayment,
  onEditPayment,
  onDeletePayment
}) {
  const { contracts = [], payments = [], projects = [] } = data || {};
  const [showCharts, setShowCharts] = useState(false);
  const [activeTab, setActiveTab] = useState('value_breakdown');

  // Presentation helper for short currency format
  const formatShortVND = (value) => {
    const num = Number(value || 0);
    if (num >= 1e9) {
      return `${(num / 1e9).toLocaleString('vi-VN', {
        maximumFractionDigits: 2
      })} tỷ đ`;
    }
    if (num >= 1e6) {
      return `${(num / 1e6).toLocaleString('vi-VN', {
        maximumFractionDigits: 1
      })} triệu đ`;
    }
    return `${num.toLocaleString('vi-VN')} đ`;
  };

  // 1. Locate target contract using unique contractId (Robust Lookup)
  const contract = contracts.find(c => String(c.id) === String(contractId));

  // ERROR HANDLING: If contract not found, display clean error notice with Back button
  if (!contract) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-3 animate-fade-in my-6">
        <div className="w-12 h-12 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto text-warning">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Không tìm thấy thông tin hợp đồng.</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Hợp đồng được chọn không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
        <button
          onClick={onBackToContracts}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition cursor-pointer"
        >
          ← Quay lại Quản lý hợp đồng
        </button>
      </div>
    );
  }

  // Related project object
  const projectObj = projects.find(p => String(p.id) === String(contract.project_id));
  const projectCode = projectObj ? (projectObj.code || projectObj.id) : (contract.project_id || 'N/A');
  const projectName = projectObj ? projectObj.name : (contract.projectName || 'Chưa xác định');

  // Appendices list
  const appendicesList = Array.isArray(contract.appendices) ? contract.appendices : [];

  // Financial Values (Safe Number parsing)
  const beforeVat = cleanVND(contract.contractValueBeforeVAT || contract.contract_value || 0);
  const rawVatRate = Number(contract.vatRate !== undefined ? contract.vatRate : 10);
  const afterVat = cleanVND(contract.contractValueAfterVAT || contract.contract_value || beforeVat);
  
  // Normalize VAT Rate if it is wrongly stored as 100 in database
  let vatRate = rawVatRate;
  let vatAmount = cleanVND(contract.vatAmount !== undefined ? contract.vatAmount : (afterVat - beforeVat));
  
  if (beforeVat > 0) {
    const calculatedRate = Math.round(((afterVat - beforeVat) / beforeVat) * 100);
    if (rawVatRate === 100 && calculatedRate >= 0 && calculatedRate <= 25) {
      vatRate = calculatedRate;
      vatAmount = afterVat - beforeVat;
    }
  }
  
  if (vatAmount <= 0) {
    vatAmount = Math.round(beforeVat * vatRate / 100);
  }

  const initialValueAfterVat = cleanVND(contract.initialContractValueAfterVAT || afterVat);
  const initialValueBeforeVat = cleanVND(contract.initialContractValueBeforeVAT || (contract.contractValueBeforeVAT || 0));
  const initialVatAmt = cleanVND(contract.initialVatAmount || (initialValueAfterVat - initialValueBeforeVat));
  const totalAppendicesBeforeVat = cleanVND(contract.totalAppendicesBeforeVAT || 0);
  const totalAppendicesVat = cleanVND(contract.totalAppendicesVAT || 0);
  const totalAppendicesAfterVat = cleanVND(contract.totalAppendicesAfterVAT || 0);
  const currentContractValueAfterVat = cleanVND(contract.contractValueAfterVAT || contract.contract_value || afterVat);

  // Sort appendices strictly by appendix_number (PL01, PL02) or signed_date
  const sortedAppendices = [...appendicesList].sort((a, b) => {
    const numA = a.appendix_number ? parseInt(String(a.appendix_number).replace(/\D/g, ''), 10) : NaN;
    const numB = b.appendix_number ? parseInt(String(b.appendix_number).replace(/\D/g, ''), 10) : NaN;
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    if (a.appendix_number && b.appendix_number && a.appendix_number !== b.appendix_number) {
      return String(a.appendix_number).localeCompare(String(b.appendix_number));
    }
    const d1 = a.signed_date || '1970-01-01';
    const d2 = b.signed_date || '1970-01-01';
    return d1.localeCompare(d2);
  });

  // Compute running cumulative contract value after each appendix in sequence
  let runningContractValDossier = initialValueAfterVat;
  const appendixProgression = sortedAppendices.map((app) => {
    const changeAmt = cleanVND(app.amount_after_vat !== undefined ? app.amount_after_vat : (app.amount_before_vat || 0));
    runningContractValDossier = cleanVND(runningContractValDossier + changeAmt);
    return {
      ...app,
      changeAmt,
      valueAfterAppendix: runningContractValDossier,
    };
  });

  // estimatedSettlement — computed after totalPaidAfterVat is calculated (see below line ~214)
  const isSettled = isContractFinalized(contract);

  // Duration & Execution Date Calculations
  const signingDate = contract.signing_date || '';
  const executionDays = Number(contract.execution_days || 0);
  const exactEndDate = signingDate && executionDays > 0 
    ? calcEndDate(signingDate, executionDays)
    : (contract.end_date || '');

  const todayStr = new Date().toISOString().split('T')[0];
  let isOverdue = false;
  let daysOverdue = 0;
  let daysRemaining = 0;

  if (exactEndDate) {
    if (todayStr > exactEndDate) {
      isOverdue = true;
      daysOverdue = calcDaysBetween(exactEndDate, todayStr);
    } else {
      daysRemaining = calcDaysBetween(todayStr, exactEndDate);
    }
  }

  let deadlineStatusBadge = null;
  if (isSettled) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/30">
        🔵 Đã quyết toán
      </span>
    );
  } else if (isOverdue) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/30 font-mono">
        🔴 Quá hạn {daysOverdue}d
      </span>
    );
  } else if (daysRemaining <= 30) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/30 font-mono">
        🟠 Còn {daysRemaining}d
      </span>
    );
  } else {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/30 font-mono">
        🟢 Còn {daysRemaining}d
      </span>
    );
  }

  // Filter payments strictly by matching contract_id
  const sortedPayments = [...payments]
    .filter(p => String(p.contract_id) === String(contract.id))
    .sort((a, b) => {
      const d1 = a.payment_date || '1970-01-01';
      const d2 = b.payment_date || '1970-01-01';
      if (d1 !== d2) return d1.localeCompare(d2);
      return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
    });

  // Calculate Cumulative Sum in Chronological Order
  let runningCumulative = 0;
  let runningExecutionCumulative = 0;
  let runningAcceptanceCumulative = 0;

  const paymentsWithCumulative = sortedPayments.map((pm, idx) => {
    const pmBeforeVAT = cleanVND(pm.amount_before_vat);
    const pmVatRate = Number(pm.vat_rate || 0);
    const pmVatAmount = cleanVND(pm.vat_amount !== undefined ? pm.vat_amount : (pmBeforeVAT * pmVatRate / 100));
    const pmAfterVAT = cleanVND(pm.amount_after_vat !== undefined ? pm.amount_after_vat : (pmBeforeVAT + pmVatAmount));
    
    const execVal = pm.execution_value !== undefined && pm.execution_value !== null ? Number(pm.execution_value) : 0;
    const accVal = pm.acceptance_value !== undefined && pm.acceptance_value !== null ? Number(pm.acceptance_value) : 0;
    const isAdvancePayment = pm.payment_type === 'Tạm ứng';

    if (!isAdvancePayment) {
      runningExecutionCumulative = cleanVND(runningExecutionCumulative + execVal);
      runningAcceptanceCumulative = cleanVND(runningAcceptanceCumulative + accVal);
    }

    runningCumulative = cleanVND(runningCumulative + pmAfterVAT);

    const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT' || pm.payment_type === 'Quyết toán';
    const phaseName = isSettlementPhase 
      ? 'Quyết toán' 
      : (pm.payment_type === 'Tạm ứng' ? 'Tạm ứng' : (typeof pm.payment_phase === 'number' ? `Đợt ${pm.payment_phase}` : (pm.payment_phase || `Đợt ${idx + 1}`)));
    const paymentCategory = isSettlementPhase 
      ? 'Quyết toán' 
      : (pm.payment_type === 'Tạm ứng' || String(pm.note || '').toLowerCase().includes('tạm ứng') ? 'Tạm ứng' : 'Thanh toán');

    return {
      ...pm,
      stt: idx + 1,
      phaseName,
      paymentCategory,
      amount_before_vat: pmBeforeVAT,
      vat_rate: pmVatRate,
      vat_amount: pmVatAmount,
      amount_after_vat: pmAfterVAT,
      execution_value: pm.execution_value !== undefined && pm.execution_value !== null ? Number(pm.execution_value) : null,
      acceptance_value: pm.acceptance_value !== undefined && pm.acceptance_value !== null ? Number(pm.acceptance_value) : null,
      cumulativeAfterVAT: runningCumulative,
      cumulativeExecution: runningExecutionCumulative,
      cumulativeAcceptance: runningAcceptanceCumulative,
      displayDate: formatDisplayDate(pm.payment_date),
    };
  });

  const totalPaidAfterVat = runningCumulative;
  // Dự kiến quyết toán:
  // - Chưa quyết toán → Giá trị HĐ hiện tại (sau phụ lục)
  // - Đã quyết toán → Tổng lũy kế thanh toán thực tế (bao gồm đợt quyết toán)
  const estimatedSettlement = isSettled ? totalPaidAfterVat : currentContractValueAfterVat;
  const remainingToPay = Math.max(0, cleanVND(currentContractValueAfterVat - totalPaidAfterVat));
  const paidRatio = currentContractValueAfterVat > 0 ? (totalPaidAfterVat / currentContractValueAfterVat) * 100 : 0;
  const remainingRatio = Math.max(0, 100 - paidRatio);

  // 3-tier progress values (clamped 0 -> 100)
  const getSafePct = (val, total) => {
    if (!total || total <= 0) return 0;
    const p = (Number(val || 0) / Number(total)) * 100;
    return isNaN(p) || !isFinite(p) ? 0 : Math.max(0, Math.min(100, p));
  };
  const getSafeDisplayPct = (val, total) => {
    if (!total || total <= 0) return '0';
    const p = (Number(val || 0) / Number(total)) * 100;
    return isNaN(p) || !isFinite(p) ? '0' : (Math.round(p * 10) / 10).toString();
  };

  const executionPct = getSafePct(contract.totalExecutionValue || 0, currentContractValueAfterVat);
  const executionPctStr = getSafeDisplayPct(contract.totalExecutionValue || 0, currentContractValueAfterVat);

  const acceptancePct = getSafePct(contract.totalAcceptanceValue || 0, currentContractValueAfterVat);
  const acceptancePctStr = getSafeDisplayPct(contract.totalAcceptanceValue || 0, currentContractValueAfterVat);

  const paymentPct = getSafePct(totalPaidAfterVat, currentContractValueAfterVat);
  const paymentPctStr = getSafeDisplayPct(totalPaidAfterVat, currentContractValueAfterVat);

  const remainingPct = Math.max(0, 100 - paymentPct);
  const remainingPctStr = (Math.round(remainingPct * 10) / 10).toString();

  // Donut chart data using Recharts Pie
  const isZeroValue = totalPaidAfterVat === 0 && remainingToPay === 0;
  const chartDataDonut = isZeroValue
    ? [{ name: 'Đã thanh toán', value: 0 }, { name: 'Còn phải trả', value: 1 }]
    : [
        { name: 'Đã thanh toán', value: totalPaidAfterVat || 0 },
        { name: 'Còn phải trả', value: remainingToPay || 0 }
      ];

  // Time progress bar timeline calculations
  let totalDays = 0;
  let elapsedDays = 0;
  let timeProgress = 0;
  let timelineLabel = '';
  let timeError = false;

  if (signingDate && exactEndDate) {
    totalDays = calcDaysBetween(signingDate, exactEndDate);
    if (totalDays < 0) {
      timeError = true;
    } else {
      const clampedTotalDays = totalDays === 0 ? 1 : totalDays;
      if (todayStr < signingDate) {
        elapsedDays = 0;
        timeProgress = 0;
        timelineLabel = `Hợp đồng chưa bắt đầu (Dự kiến trong ${calcDaysBetween(todayStr, signingDate)} ngày)`;
      } else if (todayStr > exactEndDate) {
        elapsedDays = totalDays;
        timeProgress = 100;
        timelineLabel = isSettled
          ? `Hợp đồng đã quyết toán | Tổng thời gian: ${totalDays} ngày`
          : `Hợp đồng đã quá hạn ${calcDaysBetween(exactEndDate, todayStr)} ngày`;
      } else {
        elapsedDays = calcDaysBetween(signingDate, todayStr);
        timeProgress = Math.max(0, Math.min(100, (elapsedDays / clampedTotalDays) * 100));
        timelineLabel = `Đã sử dụng ${Math.round(timeProgress * 10) / 10}% thời gian | Còn lại ${daysRemaining} ngày`;
      }
    }
  } else {
    timeError = true;
  }

  // Chart Data for Cumulative Disbursement
  const chartData = paymentsWithCumulative.map(pm => ({
    name: pm.phaseName,
    date: pm.displayDate,
    amount: pm.amount_after_vat,
    cumulative: pm.cumulativeAfterVAT,
  }));

  // Real-data Status Alerts
  const statusAlerts = [];
  if (totalPaidAfterVat > currentContractValueAfterVat) {
    statusAlerts.push({
      level: 'danger',
      title: 'Giá trị thanh toán vượt giá trị hợp đồng',
      desc: `Tổng đã thanh toán (${formatVND(totalPaidAfterVat)}) vượt Giá trị HĐ (${formatVND(currentContractValueAfterVat)}) số tiền ${formatVND(totalPaidAfterVat - currentContractValueAfterVat)}!`
    });
  }
  if (isOverdue && !isSettled) {
    statusAlerts.push({
      level: 'danger',
      title: 'Hợp đồng đã quá hạn nhưng chưa quyết toán',
      desc: `Thời hạn hoàn thành ngày ${formatDisplayDate(exactEndDate)} đã trôi qua ${daysOverdue} ngày.`
    });
  } else if (daysRemaining <= 30 && !isSettled) {
    statusAlerts.push({
      level: 'warning',
      title: 'Hợp đồng sắp hết hạn',
      desc: `Hợp đồng sắp đến hạn hoàn thành vào ngày ${formatDisplayDate(exactEndDate)} (Còn ${daysRemaining} ngày).`
    });
  }

  return (
    <div className="space-y-3.5 animate-fade-in pb-8">
      
      {/* 1. COMPACT STREAMLINED HEADER BAR (SaaS 4-line Layout) */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3">
        {/* Dòng 1: Nút back nhỏ gọn */}
        <div className="flex items-center">
          <button
            onClick={onBackToContracts}
            className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
          >
            <ArrowLeft className="w-3 h-3" /> Quay lại danh sách
          </button>
        </div>

        {/* Dòng 2: Mã hợp đồng lớn + Badge trạng thái */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-mono flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            {contract.contract_number}
          </h2>
          {deadlineStatusBadge}
        </div>

        {/* Dòng 3: Metadata Subtitle (Dự án • Nhà thầu • Nhóm chi phí • Nội dung HĐ) */}
        <div className="text-xs text-muted-foreground flex flex-col space-y-1">
          <div className="flex items-center gap-2 flex-wrap font-medium">
            {onBackToProjectOverview ? (
              <button
                onClick={() => onBackToProjectOverview(contract.project_id)}
                className="font-bold text-primary hover:underline flex items-center gap-0.5 text-left group"
              >
                <span>Dự án: {projectName}</span>
                <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ) : (
              <span className="font-bold text-foreground">Dự án: {projectName}</span>
            )}
            <span>•</span>
            <span className="font-semibold text-foreground/80">Nhà thầu: {contract.contractor || 'Chưa rõ'}</span>
            <span>•</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/10 text-info border border-info/20">
              {contract.costGroup || 'Chưa phân loại'}
            </span>
            <span>•</span>
            <span className="font-mono">Ngày ký: {formatDisplayDate(signingDate)}</span>
            <span>•</span>
            <span className="font-mono">Thời hạn: {executionDays} ngày</span>
          </div>
          {contract.content && (
            <p className="text-[11px] text-muted-foreground leading-normal italic pl-1 border-l-2 border-border/80 max-w-4xl">
              Nội dung: {contract.content}
            </p>
          )}
        </div>

        {/* Dòng 4: Khối nút chức năng căn phải */}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2.5">
          {isSettled ? (
            <span
              className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold border border-border flex items-center gap-1 cursor-not-allowed opacity-60"
              title="Hợp đồng đã quyết toán, không thể ghi nhận thêm thanh toán."
            >
              <Plus className="w-3.5 h-3.5" /> + Thanh toán
            </span>
          ) : (
            <button
              onClick={() => onOpenAddPayment(contract.id)}
              className="px-2.5 py-1 rounded-lg bg-success hover:bg-success/90 text-success-foreground text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + Thanh toán
            </button>
          )}
          
          {contract.status === 'settled' ? (
            <span
              className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-semibold border border-border flex items-center gap-1 cursor-not-allowed opacity-60"
              title="Hợp đồng đã quyết toán, không thể thêm phụ lục mới."
            >
              <Lock className="w-3.5 h-3.5" /> Đã khóa
            </span>
          ) : (
            <button
              onClick={() => onOpenAddAppendix(contract.id)}
              className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-success text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + Phụ lục
            </button>
          )}
          
          <button
            onClick={() => onEditContract(contract)}
            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-semibold border border-primary/20 transition cursor-pointer flex items-center gap-1"
          >
            <Edit className="w-3.5 h-3.5" /> Sửa HĐ
          </button>
        </div>
      </div>

      {/* 2. KPI ROW — 4 CARD BẰNG NHAU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* KPI 1: TỔNG GIÁ TRỊ HỢP ĐỒNG */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between h-full min-h-[110px]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            TỔNG GIÁ TRỊ HỢP ĐỒNG
          </span>
          <div className="my-2">
            <div className="text-xl font-black text-foreground tracking-normal whitespace-nowrap">
              {formatShortVND(currentContractValueAfterVat)}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono font-semibold mt-0.5">
              {formatVND(currentContractValueAfterVat)}
            </div>
          </div>
          <span className="text-[9px] font-bold text-primary/80 uppercase block">
            Đã bao gồm VAT ({vatRate}%)
          </span>
        </div>

        {/* KPI 2: LŨY KẾ THI CÔNG */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between h-full min-h-[110px]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            LŨY KẾ THI CÔNG
          </span>
          <div className="my-2">
            <div className="text-xl font-black text-blue-600 font-mono tracking-tight">
              {executionPctStr}%
            </div>
            <div className="text-[10px] text-muted-foreground font-mono font-semibold mt-0.5">
              {formatShortVND(contract.totalExecutionValue || 0)}
            </div>
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase block">
            Lũy kế khối lượng thi công
          </span>
        </div>

        {/* KPI 3: LŨY KẾ NGHIỆM THU */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between h-full min-h-[110px]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            LŨY KẾ NGHIỆM THU
          </span>
          <div className="my-2">
            <div className="text-xl font-black text-purple-600 font-mono tracking-tight">
              {acceptancePctStr}%
            </div>
            <div className="text-[10px] text-muted-foreground font-mono font-semibold mt-0.5">
              {formatShortVND(contract.totalAcceptanceValue || 0)}
            </div>
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase block">
            Lũy kế giá trị nghiệm thu
          </span>
        </div>

        {/* KPI 4: THANH TOÁN */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between h-full min-h-[110px]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            THANH TOÁN
          </span>
          <div className="my-1.5 space-y-1 text-[11px] font-semibold text-foreground/90 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-sans font-normal flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                Đã trả ({paymentPctStr}%)
              </span>
              <span>{formatShortVND(totalPaidAfterVat)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-sans font-normal flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                Còn lại ({remainingPctStr}%)
              </span>
              <span>{formatShortVND(remainingToPay)}</span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-success uppercase block">
            Tiến độ giải ngân hợp đồng
          </span>
        </div>

      </div>

      {/* 3. ANALYTICS GRID 8 / 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* LEFT CARD — lg:col-span-8: TIMELINE & PROGRESS BARS */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-5 h-full">
          {/* Section 1: TIMELINE */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-border pb-2">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tiến độ thời gian
              </span>
            </div>

            {timeError ? (
              <div className="py-4 text-center text-muted-foreground italic text-xs">
                ⚠️ Chưa đủ hoặc sai lệch dữ liệu thời gian hợp đồng để hiển thị timeline
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>Ngày ký: {formatDisplayDate(signingDate)}</span>
                  <span>Ngày kết thúc: {formatDisplayDate(exactEndDate)}</span>
                </div>

                {/* SVG Timeline Container */}
                <div className="py-4">
                  {/* SVG Timeline */}
                  <div className="relative pt-1.5 pb-3 px-1">
                    {/* Trục đường line ngang */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative border border-border/40">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${timeProgress}%` }}
                      ></div>
                    </div>

                    {/* Các mốc chấm tròn */}
                    <div className="absolute top-[2px] left-0 right-0 flex justify-between pointer-events-none">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background -ml-0.5" title="Ngày ký"></div>
                      
                      {/* Kim chỉ Hôm nay */}
                      {timeProgress > 0 && timeProgress < 100 && (
                        <div 
                          className="absolute top-[-8px] flex flex-col items-center pointer-events-auto"
                          style={{ left: `calc(${timeProgress}% - 6px)` }}
                          title={`Hôm nay (Đã trôi qua ${elapsedDays}/${totalDays} ngày)`}
                        >
                          <span className="text-[9px] font-black text-primary leading-none mb-[2px]">▲</span>
                          <span className="text-[8px] font-bold text-primary bg-primary/10 border border-primary/20 px-1 py-0.2 rounded whitespace-nowrap shadow-sm font-sans">
                            Hôm nay
                          </span>
                        </div>
                      )}

                      <div className={`w-2.5 h-2.5 rounded-full border-2 border-background -mr-0.5 ${timeProgress >= 100 ? 'bg-primary' : 'bg-muted-foreground/45'}`} title="Ngày kết thúc"></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-semibold gap-1">
                  <span className="text-foreground/80">{timelineLabel}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: 3 PROGRESS BARS */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-1.5 border-b border-border pb-2">
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tiến độ thực hiện
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Thi công */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/85">
                  <span className="flex items-center gap-1">🛠️ Thi công thực tế</span>
                  <span className="font-mono text-xs">{executionPctStr}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40 relative">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${executionPct}%` }}
                    title={`Giá trị thực hiện: ${formatVND(contract.totalExecutionValue || 0)}`}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Khối lượng thi công: {formatVND(contract.totalExecutionValue || 0)} (trước VAT)</span>
                </div>
              </div>

              {/* Nghiệm thu */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/85">
                  <span className="flex items-center gap-1">📋 Nghiệm thu lũy kế</span>
                  <span className="font-mono text-xs">{acceptancePctStr}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40 relative">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                    style={{ width: `${acceptancePct}%` }}
                    title={`Giá trị nghiệm thu: ${formatVND(contract.totalAcceptanceValue || 0)}`}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Giá trị nghiệm thu: {formatVND(contract.totalAcceptanceValue || 0)} (trước VAT)</span>
                </div>
              </div>

              {/* Giải ngân */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/85">
                  <span className="flex items-center gap-1">💰 Đã thanh toán</span>
                  <span className="font-mono text-xs">{paymentPctStr}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40 relative">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500" 
                    style={{ width: `${paymentPct}%` }}
                    title={`Đã thanh toán: ${formatVND(totalPaidAfterVat)}`}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Giá trị thanh toán: {formatVND(totalPaidAfterVat)} (sau VAT)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD — lg:col-span-4: DONUT GIẢI NGÂN */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between h-full min-h-[300px]">
          <div className="flex items-center gap-1.5 border-b border-border pb-2 shrink-0">
            <Wallet className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Giải ngân
            </span>
          </div>

          <div className="w-full max-w-[170px] aspect-square relative flex items-center justify-center mx-auto my-4 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDataDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={58}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell key="cell-0" fill={isZeroValue ? '#e2e8f0' : '#22c55e'} />
                  <Cell key="cell-1" fill={isZeroValue ? '#cbd5e1' : '#f59e0b'} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[18px] font-black font-mono text-foreground leading-none">
                {paymentPctStr}%
              </span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1 tracking-wider">
                Giải ngân
              </span>
            </div>
          </div>

          {/* Donut Legend 2 cột */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3 w-full shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded bg-green-500 inline-block shrink-0" />
                Đã thanh toán
              </span>
              <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-1 whitespace-nowrap">
                {formatVND(totalPaidAfterVat)}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded bg-amber-500 inline-block shrink-0" />
                Còn phải trả
              </span>
              <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-1 whitespace-nowrap">
                {formatVND(remainingToPay)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. DETAILS AREA — EXECUTIVE TABS */}
      <div className="space-y-4 pt-1.5">
        
        {/* Tab Buttons */}
        <div className="flex border-b border-border gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('value_breakdown')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'value_breakdown'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 Cấu thành giá trị
          </button>
          
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'payments'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            💰 Lịch sử thanh toán & Biểu đồ
          </button>

          <button
            onClick={() => setActiveTab('acceptance')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'acceptance'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            🛠️ Tiến độ nghiệm thu
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          
          {/* TAB 1: CẤU THÀNH GIÁ TRỊ HỢP ĐỒNG */}
          {activeTab === 'value_breakdown' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              
              {/* Bảng Cấu thành giá trị (lg:col-span-2) */}
              <div className="lg:col-span-2 p-3.5 rounded-xl bg-card border border-border shadow-md space-y-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 border-b border-border pb-2 shrink-0">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Cấu thành giá trị hợp đồng
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-[11px] min-w-[500px]">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground uppercase border-b border-border/80">
                        <th className="pb-1.5 pr-2 font-semibold text-left" style={{minWidth:'150px'}}>Thành phần</th>
                        <th className="pb-1.5 pr-2 font-semibold text-left" style={{minWidth:'80px'}}>Ngày ký</th>
                        <th className="pb-1.5 pr-2 font-semibold text-right" style={{minWidth:'130px'}}>Trước VAT</th>
                        <th className="pb-1.5 pr-2 font-semibold text-right" style={{minWidth:'100px'}}>VAT</th>
                        <th className="pb-1.5 pr-2 font-semibold text-right" style={{minWidth:'130px'}}>Sau VAT</th>
                        <th className="pb-1.5 font-semibold text-left" style={{minWidth:'140px'}}>Diễn giải</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* Dòng: Hợp đồng gốc */}
                      <tr className="bg-muted/40">
                        <td className="py-2 pr-2 font-bold text-foreground flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                          Hợp đồng gốc
                        </td>
                        <td className="py-2 pr-2 font-mono text-foreground/80">{formatDisplayDate(contract.signing_date)}</td>
                        <td className="py-2 pr-2 font-mono font-bold text-foreground text-right">{formatVND(initialValueBeforeVat)}</td>
                        <td className="py-2 pr-2 font-mono text-muted-foreground text-right">{formatVND(initialVatAmt)}</td>
                        <td className="py-2 pr-2 font-mono font-bold text-foreground text-right">{formatVND(initialValueAfterVat)}</td>
                        <td className="py-2 text-muted-foreground">Giá trị theo hợp đồng ký ban đầu</td>
                      </tr>

                      {/* Dòng: Từng phụ lục */}
                      {appendixProgression.map((app, idx) => {
                        const appBeforeVat = cleanVND(app.amount_before_vat || 0);
                        const appVatAmt = cleanVND(app.vat_amount !== undefined ? app.vat_amount : 0);
                        const appAfterVat = app.changeAmt;
                        const isPositive = appAfterVat >= 0;
                        const signCls = isPositive ? 'text-success' : 'text-destructive';
                        const fmtSign = (v) => (v >= 0 ? '+' : '') + formatVND(v);
                        return (
                          <tr key={app.id || idx}>
                            <td className="py-1.5 pr-2 text-foreground/80 pl-4">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                  PL {app.appendix_number || String(idx + 1).padStart(2, '0')}
                                </span>
                              </span>
                            </td>
                            <td className="py-1.5 pr-2 font-mono text-muted-foreground">
                              {app.signed_date ? formatDisplayDate(app.signed_date) : '—'}
                            </td>
                            <td className={`py-1.5 pr-2 font-mono font-bold text-right ${signCls}`}>{fmtSign(appBeforeVat)}</td>
                            <td className={`py-1.5 pr-2 font-mono text-right ${signCls}`}>{fmtSign(appVatAmt)}</td>
                            <td className={`py-1.5 pr-2 font-mono font-bold text-right ${signCls}`}>{fmtSign(appAfterVat)}</td>
                            <td className="py-1.5 text-muted-foreground truncate max-w-[200px]" title={app.content || app.note || ''}>
                              {app.content || app.note || 'Điều chỉnh giá trị theo phụ lục'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Dòng tổng kết */}
                    {sortedAppendices.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border/80">
                          <td className="pt-2.5 pr-2 font-bold text-primary text-[11px]">= Tổng giá trị hiện tại</td>
                          <td className="pt-2.5 pr-2"></td>
                          <td className="pt-2.5 pr-2 font-mono font-black text-foreground text-right">{formatVND(beforeVat)}</td>
                          <td className="pt-2.5 pr-2 font-mono font-bold text-foreground/80 text-right">{formatVND(vatAmount)}</td>
                          <td className="pt-2.5 pr-2 font-mono font-black text-foreground text-right">{formatVND(currentContractValueAfterVat)}</td>
                          <td className="pt-2.5 text-muted-foreground text-[10px]">
                            HĐ gốc {totalAppendicesAfterVat >= 0 ? '+' : '−'} {sortedAppendices.length} phụ lục
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Box Lịch sử phụ lục hợp đồng (lg:col-span-1) */}
              <div className="p-3.5 rounded-xl bg-card border border-border shadow-md flex flex-col justify-between h-full space-y-2.5">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      PHỤ LỤC HỢP ĐỒNG ({appendicesList.length})
                    </h3>
                    {contract.status === 'settled' ? (
                      <span
                        className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 cursor-not-allowed opacity-60"
                        title="Hợp đồng đã quyết toán, không thể thêm phụ lục mới."
                      >
                        <Lock className="w-3.5 h-3" /> Đã khóa
                      </span>
                    ) : (
                      <button
                        onClick={() => onOpenAddAppendix(contract.id)}
                        className="text-[10px] font-bold text-success hover:text-success/80 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3" /> Thêm
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-2 flex-1 max-h-64 overflow-y-auto pr-1">
                    {appendixProgression.map((app) => (
                      <div key={app.id} className="p-2 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground text-[11px]">{app.appendix_number || '—'}</span>
                            {app.signed_date && (
                              <span className="text-[9px] text-muted-foreground font-mono">({formatDisplayDate(app.signed_date)})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{app.content || '—'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono font-bold text-xs ${app.changeAmt >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {app.changeAmt >= 0 ? `+${formatVND(app.changeAmt)}` : formatVND(app.changeAmt)}
                          </div>
                          <div className="text-[9px] text-primary/80 font-mono font-semibold">
                            Sau PL: {formatVND(app.valueAfterAppendix)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {appendixProgression.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground italic">
                        Chưa phát sinh phụ lục điều chỉnh giá trị.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border text-xs flex items-center justify-between shrink-0 font-semibold font-mono">
                  <span className="text-muted-foreground text-[11px] font-sans">Tổng phụ lục:</span>
                  <span className={`font-mono font-bold text-xs ${totalAppendicesAfterVat >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LỊCH SỬ THANH TOÁN & BIỂU ĐỒ */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              
              {/* Real-data Status Alerts */}
              {statusAlerts.length > 0 && (
                <div className="space-y-1.5">
                  {statusAlerts.map((alt, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg border flex items-center gap-2.5 text-xs shadow-sm ${
                      alt.level === 'danger'
                        ? 'bg-destructive/10 border-destructive/30 text-destructive'
                        : 'bg-warning/10 border-warning/30 text-warning'
                    }`}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <div>
                        <span className="font-bold text-foreground">{alt.title}: </span>
                        <span>{alt.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Settlement Note */}
              {isSettled && contract.settlement_note && (
                <div className="p-3 rounded-xl bg-info/10 border border-info/30 flex items-start gap-2.5 text-xs">
                  <span className="text-info mt-0.5 shrink-0">📝</span>
                  <div>
                    <span className="font-bold text-info uppercase tracking-wider text-[10px] block mb-0.5">Ghi chú quyết toán</span>
                    <span className="text-foreground/80 whitespace-pre-wrap">{contract.settlement_note}</span>
                  </div>
                </div>
              )}

              {/* Bảng danh sách đợt thanh toán */}
              <div className="p-3.5 rounded-xl bg-card border border-border shadow-md space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-success shrink-0" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      DANH SÁCH CÁC KHOẢN THANH TOÁN ({paymentsWithCumulative.length} đợt)
                    </h3>
                  </div>

                  <div className="flex w-full sm:w-auto items-center justify-end gap-2 self-start sm:self-auto shrink-0">
                    {isSettled ? (
                      <span
                        className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold border border-border flex items-center gap-1 cursor-not-allowed"
                        title="Hợp đồng đã quyết toán, không thể ghi nhận thêm thanh toán."
                      >
                        <Lock className="w-3.5 h-3.5" /> Đã khóa
                      </span>
                    ) : (
                      <button
                        onClick={() => onOpenAddPayment(contract.id)}
                        className="px-3 py-1.5 rounded-lg bg-success hover:bg-success/90 text-success-foreground text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Thêm đợt thanh toán
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border border-border rounded-lg shadow-inner max-h-64 overflow-y-auto hide-scrollbar">
                  <table className="w-full text-left text-xs text-foreground/80 min-w-[850px] relative">
                    <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b border-border sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">STT</th>
                        <th className="py-2.5 px-3">ĐỢT THANH TOÁN</th>
                        <th className="py-2.5 px-3 text-center w-24">LOẠI</th>
                        <th className="py-2.5 px-3">NGÀY THANH TOÁN</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-foreground/80">THỰC HIỆN (TRƯỚC VAT)</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-foreground/80">NGHIỆM THU (TRƯỚC VAT)</th>
                        <th className="py-2.5 px-3 text-right font-bold text-success">GIÁ TRỊ (SAU VAT)</th>
                        <th className="py-2.5 px-3 text-right font-bold text-primary">LŨY KẾ ĐÃ CHI</th>
                        <th className="py-2.5 px-3 text-center w-20">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background/60">
                      {paymentsWithCumulative.map((pm) => (
                        <tr key={pm.id} className="hover:bg-muted/60 transition">
                          <td className="py-2 px-3 text-center font-mono font-semibold text-muted-foreground">{pm.stt}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">
                            <span className="font-mono text-success font-bold">{pm.phaseName}</span>
                            {pm.note && <span className="text-[10px] font-normal text-muted-foreground ml-2 italic">({pm.note})</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                              pm.paymentCategory === 'Quyết toán'
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : pm.paymentCategory === 'Tạm ứng'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : 'bg-success/10 text-success border-success/30'
                            }`}>
                              {pm.paymentCategory}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-foreground/80">{pm.displayDate}</td>
                          
                          {/* Thực hiện */}
                          <td className="py-2 px-3 text-right font-mono">
                            {pm.paymentCategory === 'Tạm ứng' ? (
                              <span className="text-muted-foreground/60">—</span>
                            ) : (
                              <>
                                <div className="font-bold text-foreground/85">{formatVND(pm.execution_value || 0)}</div>
                                <div className="text-[10px] text-muted-foreground font-semibold">LK: {formatVND(pm.cumulativeExecution || 0)}</div>
                              </>
                            )}
                          </td>

                          {/* Nghiệm thu */}
                          <td className="py-2 px-3 text-right font-mono">
                            {pm.paymentCategory === 'Tạm ứng' ? (
                              <span className="text-muted-foreground/60">—</span>
                            ) : (
                              <>
                                <div className="font-bold text-foreground/85">{formatVND(pm.acceptance_value || 0)}</div>
                                <div className="text-[10px] text-muted-foreground font-semibold">LK: {formatVND(pm.cumulativeAcceptance || 0)}</div>
                              </>
                            )}
                          </td>

                          <td className="py-2 px-3 text-right font-mono font-bold text-success text-xs bg-success/5">
                            {formatVND(pm.amount_after_vat)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-primary text-xs bg-muted/40">
                            {formatVND(pm.cumulativeAfterVAT)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditPayment(pm)}
                                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                                title="Sửa đợt thanh toán"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc muốn xóa ${pm.phaseName}?`)) {
                                    onDeletePayment(pm.id);
                                  }
                                }}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition cursor-pointer"
                                title="Xóa đợt thanh toán"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {paymentsWithCumulative.length === 0 && (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-muted-foreground">
                            <p className="font-semibold text-foreground/80">Chưa có dữ liệu thanh toán.</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Nhấn nút "+ Thêm đợt thanh toán" ở trên để ghi nhận khoản giải ngân đầu tiên.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Combo Chart (Biểu đồ tăng trưởng giải ngân lũy kế) */}
              <div className="p-3.5 rounded-xl bg-card border border-border shadow-md space-y-2 flex flex-col justify-between mt-4">
                <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                    BIỂU ĐỒ TĂNG TRƯỞNG LŨY KẾ THANH TOÁN
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Theo đợt & ngày phát sinh</span>
                </div>

                {chartData.length > 0 ? (
                  <div className="h-56 w-full pt-1 flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar">
                    <div className="min-w-[500px] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                        <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} />
                        
                        {/* Left Y-Axis for Thanh toán trong kỳ */}
                        <YAxis 
                          yAxisId="left"
                          stroke="var(--color-muted-foreground)" 
                          fontSize={10}
                          tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)} Tỷ`}
                        />

                        {/* Right Y-Axis for Lũy kế giải ngân */}
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="var(--color-success)" 
                          fontSize={10}
                          tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)} Tỷ`}
                        />

                        <Legend 
                          verticalAlign="top" 
                          height={32} 
                          wrapperStyle={{ fontSize: '10px', paddingBottom: '5px' }}
                        />

                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;
                            const itemAmt = payload.find(p => p.dataKey === 'amount')?.value || 0;
                            const itemCum = payload.find(p => p.dataKey === 'cumulative')?.value || 0;
                            const dateStr = payload[0]?.payload?.date || '';

                            return (
                              <div className="p-3 rounded-xl bg-card border border-border shadow-2xl text-xs space-y-1.5 z-50 font-sans">
                                <div className="font-bold text-foreground border-b border-border pb-1 flex items-center justify-between gap-4">
                                  <span>📅 {label} (Ngày {dateStr})</span>
                                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 font-mono">
                                    Hồ sơ đợt
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-0.5">
                                  <span className="text-foreground/80 flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                                    Thanh toán đợt này:
                                  </span>
                                  <strong className="text-primary font-mono">
                                    {((Number(itemAmt) || 0) / 1_000_000_000).toFixed(2)} Tỷ VNĐ
                                  </strong>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-foreground/80 flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                                    Lũy kế giải ngân:
                                  </span>
                                  <strong className="text-success font-mono">
                                    {((Number(itemCum) || 0) / 1_000_000_000).toFixed(2)} Tỷ VNĐ
                                  </strong>
                                </div>
                              </div>
                            );
                          }}
                        />

                        {/* Series 1: Thanh toán trong đợt (Bar - Blue) */}
                        <Bar 
                          yAxisId="left"
                          dataKey="amount" 
                          name="Thanh toán trong kỳ" 
                          fill="var(--color-primary)" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={32}
                        />

                        {/* Series 2: Lũy kế giải ngân (Line - Green) */}
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="cumulative" 
                          name="Lũy kế giải ngân" 
                          stroke="var(--color-success)" 
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: 'var(--color-success)', stroke: 'var(--color-background)', strokeWidth: 2 }}
                          activeDot={{ r: 5.5, fill: 'var(--color-success)' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-muted-foreground text-xs italic bg-background/40 rounded-lg border border-border flex-1">
                    Chưa có phát sinh thanh toán để vẽ biểu đồ.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: TIẾN ĐỘ NGHIỆM THU */}
          {activeTab === 'acceptance' && (
            <div className="p-8 rounded-xl bg-card border border-border shadow-md text-center text-muted-foreground italic text-xs">
              🛠️ Tiến độ nghiệm thu chi tiết đang được xây dựng và sẽ bổ sung sau.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
