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
  ChevronUp
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
  Legend
} from 'recharts';
import { formatVND, formatDisplayDate, calcEndDate, calcDaysBetween, cleanVND } from '../../utils/formatters';

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

  // 1. Locate target contract using unique contractId (Robust Lookup)
  const contract = contracts.find(c => String(c.id) === String(contractId));

  // ERROR HANDLING: If contract not found, display clean error notice with Back button
  if (!contract) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 animate-fade-in my-6">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Không tìm thấy thông tin hợp đồng.</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Hợp đồng được chọn không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
        <button
          onClick={onBackToContracts}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
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
  const vatRate = Number(contract.vatRate !== undefined ? contract.vatRate : 10);
  const vatAmount = cleanVND(contract.vatAmount !== undefined ? contract.vatAmount : (beforeVat * vatRate / 100));
  const afterVat = cleanVND(contract.contractValueAfterVAT || contract.contract_value || (beforeVat + vatAmount));

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
  const isSettled = contract.status === 'settled';

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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
        🔵 Đã quyết toán
      </span>
    );
  } else if (isOverdue) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
        🔴 Quá hạn {daysOverdue}d
      </span>
    );
  } else if (daysRemaining <= 30) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
        🟠 Còn {daysRemaining}d
      </span>
    );
  } else {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
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
  const paymentsWithCumulative = sortedPayments.map((pm, idx) => {
    const pmBeforeVAT = cleanVND(pm.amount_before_vat);
    const pmVatRate = Number(pm.vat_rate || 0);
    const pmVatAmount = cleanVND(pm.vat_amount !== undefined ? pm.vat_amount : (pmBeforeVAT * pmVatRate / 100));
    const pmAfterVAT = cleanVND(pm.amount_after_vat !== undefined ? pm.amount_after_vat : (pmBeforeVAT + pmVatAmount));
    
    runningCumulative = cleanVND(runningCumulative + pmAfterVAT);

    const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT';
    const phaseName = isSettlementPhase 
      ? 'Quyết toán' 
      : (typeof pm.payment_phase === 'number' ? `Đợt ${pm.payment_phase}` : (pm.payment_phase || `Đợt ${idx + 1}`));
    const paymentCategory = isSettlementPhase 
      ? 'Quyết toán' 
      : (pm.payment_type === 'ADVANCE' || String(pm.note || '').toLowerCase().includes('tạm ứng') ? 'Tạm ứng' : 'Thanh toán');

    return {
      ...pm,
      stt: idx + 1,
      phaseName,
      paymentCategory,
      amount_before_vat: pmBeforeVAT,
      vat_rate: pmVatRate,
      vat_amount: pmVatAmount,
      amount_after_vat: pmAfterVAT,
      cumulativeAfterVAT: runningCumulative,
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
      
      {/* 1. COMPACT STREAMLINED HEADER BAR (Minimal height, all actions on right) */}
      <div className="p-3 px-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToContracts}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 font-mono">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                {contract.contract_number}
              </h2>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-semibold text-slate-200 truncate">{contract.content}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-300 truncate">{contract.contractor}</span>
              {deadlineStatusBadge}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenAddPayment(contract.id)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Thanh toán
          </button>
          <button
            onClick={() => onOpenAddAppendix(contract.id)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Phụ lục
          </button>
          <button
            onClick={() => onEditContract(contract)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold border border-blue-500/30 transition cursor-pointer flex items-center gap-1"
          >
            <Edit className="w-3.5 h-3.5" /> Sửa HĐ
          </button>
        </div>
      </div>

      {/* 2. NHÓM 1: CẤU TRÚC ĐỊNH DANH HỢP ĐỒNG (GRID 4 COLS X 2 ROWS - HORIZONTAL EFFICIENCY) */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            THÔNG TIN NHẬN DIỆN & TIẾN ĐỘ THỜI GIAN
          </span>
          <span className="text-[10px] font-mono text-slate-500">Mã HĐ: {contract.id}</span>
        </div>

        {/* 4 Columns Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">MÃ DỰ ÁN</span>
            <span className="font-mono font-bold text-blue-300 text-xs">{projectCode}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">SỐ HỢP ĐỒNG</span>
            <span className="font-mono font-extrabold text-white text-xs">{contract.contract_number}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">NHÀ THẦU THỰC HIỆN</span>
            <span className="font-bold text-slate-200 text-xs truncate block">{contract.contractor || 'Chưa cập nhật'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">NHÓM CHI PHÍ</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 inline-block">
              {contract.costGroup || 'Chưa phân loại'}
            </span>
          </div>
        </div>

        {/* 4 Columns Row 2 */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">NGÀY KÝ HỢP ĐỒNG</span>
            <span className="font-mono font-bold text-slate-200 text-xs">{formatDisplayDate(signingDate)}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">THỜI HẠN THỰC HIỆN</span>
            <span className="font-mono font-bold text-white text-xs">{executionDays} ngày</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">NGÀY KẾT THÚC HỢP ĐỒNG</span>
            <span className="font-mono font-bold text-amber-300 text-xs">{formatDisplayDate(exactEndDate)}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">TÊN DỰ ÁN LIÊN QUAN</span>
            {onBackToProjectOverview ? (
              <button
                onClick={() => onBackToProjectOverview(contract.project_id)}
                className="font-bold text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition cursor-pointer group text-left truncate max-w-full"
              >
                <span className="truncate">{projectName}</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ) : (
              <span className="font-bold text-slate-200 text-xs truncate block">{projectName}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 NỘI DUNG HỢP ĐỒNG */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-1.5 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nội dung hợp đồng</span>
        </div>
        {contract.content ? (
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" title="Nhấn để xem đầy đủ">
            {contract.content}
          </p>
        ) : (
          <p className="text-xs text-slate-500 italic">Chưa cập nhật nội dung hợp đồng.</p>
        )}
      </div>

      {/* 3. NHÓM 2: KHU VỰC CÁC KPI GIÁ TRỊ CỐT LÕI (DÀN HÀNG NGANG SINGLE ROW ON DESKTOP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* KPI 1: Giá trị trước VAT */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">TRƯỚC VAT</span>
          <div className="text-xs sm:text-sm font-bold text-slate-200 font-mono mt-0.5">{formatVND(beforeVat)}</div>
        </div>

        {/* KPI 2: Thuế VAT (%) */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">THUẾ VAT ({vatRate}%)</span>
          <div className="text-xs sm:text-sm font-bold text-slate-400 font-mono mt-0.5">{formatVND(vatAmount)}</div>
        </div>

        {/* KPI 3: Giá trị sau VAT */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-blue-500/40 bg-blue-950/20 shadow-md">
          <span className="text-[10px] font-bold text-blue-300 uppercase block">GIÁ TRỊ HỢP ĐỒNG</span>
          <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">{formatVND(currentContractValueAfterVat)}</div>
        </div>

        {/* KPI 4: Đã thanh toán (Lũy kế) */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/20 shadow-md">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">ĐÃ THANH TOÁN</span>
          <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">{formatVND(totalPaidAfterVat)}</div>
        </div>

        {/* KPI 5: Còn phải thanh toán */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 bg-amber-950/20 shadow-md">
          <span className="text-[10px] font-bold text-amber-400 uppercase block">CÒN LẠI PHẢI TRẢ</span>
          <div className="text-xs sm:text-sm font-black text-amber-400 font-mono mt-0.5">{formatVND(remainingToPay)}</div>
        </div>

        {/* KPI 6: Quyết toán — label thay đổi theo trạng thái */}
        <div className={`p-2.5 rounded-xl bg-slate-900 border shadow-md ${
          isSettled 
            ? 'border-blue-500/40 bg-blue-950/20' 
            : 'border-purple-500/30'
        }`}>
          <span className={`text-[10px] font-bold uppercase block ${
            isSettled ? 'text-blue-300' : 'text-purple-300'
          }`}>
            {isSettled ? 'GIÁ TRỊ QUYẾT TOÁN' : 'DỰ KIẾN QUYẾT TOÁN'}
          </span>
          <div className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
            isSettled ? 'text-blue-200' : 'text-purple-300'
          }`}>
            {formatVND(estimatedSettlement)}
          </div>
        </div>

      </div>

      {/* 3.5 CẤU THÀNH GIÁ TRỊ HỢP ĐỒNG */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md text-[11px]">
        <div className="flex items-center gap-1.5 mb-2 border-b border-slate-800 pb-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Cấu thành giá trị hợp đồng
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase">
                <th className="pb-1.5 pr-2 font-semibold" style={{minWidth:'140px'}}>Thành phần</th>
                <th className="pb-1.5 pr-2 font-semibold" style={{minWidth:'80px'}}>Ngày ký</th>
                <th className="pb-1.5 pr-2 font-semibold text-right" style={{minWidth:'130px'}}>Trước VAT</th>
                <th className="pb-1.5 pr-2 font-semibold text-right" style={{minWidth:'110px'}}>VAT</th>
                <th className="pb-1.5 pr-2 font-semibold text-right" style={{minWidth:'130px'}}>Sau VAT</th>
                <th className="pb-1.5 font-semibold" style={{minWidth:'150px'}}>Diễn giải</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* Dòng: Hợp đồng gốc */}
              <tr>
                <td className="py-1.5 pr-2 font-semibold text-slate-200">Hợp đồng gốc</td>
                <td className="py-1.5 pr-2 font-mono text-slate-400">{formatDisplayDate(contract.signing_date)}</td>
                <td className="py-1.5 pr-2 font-mono font-bold text-slate-300 text-right">{formatVND(initialValueBeforeVat)}</td>
                <td className="py-1.5 pr-2 font-mono text-slate-400 text-right">{formatVND(initialVatAmt)}</td>
                <td className="py-1.5 pr-2 font-mono font-bold text-slate-200 text-right">{formatVND(initialValueAfterVat)}</td>
                <td className="py-1.5 text-slate-500">Giá trị theo hợp đồng ký ban đầu</td>
              </tr>

              {/* Dòng: Từng phụ lục */}
              {appendixProgression.map((app, idx) => {
                const appBeforeVat = cleanVND(app.amount_before_vat || 0);
                const appVatAmt = cleanVND(app.vat_amount !== undefined ? app.vat_amount : 0);
                const appAfterVat = app.changeAmt;
                const isPositive = appAfterVat >= 0;
                const signCls = isPositive ? 'text-emerald-400' : 'text-rose-400';
                const fmtSign = (v) => (v >= 0 ? '+' : '') + formatVND(v);
                return (
                  <tr key={app.id || idx}>
                    <td className="py-1.5 pr-2 font-semibold text-slate-300">
                      Phụ lục {app.appendix_number || String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-slate-400">
                      {app.signed_date ? formatDisplayDate(app.signed_date) : '—'}
                    </td>
                    <td className={`py-1.5 pr-2 font-mono font-bold text-right ${signCls}`}>{fmtSign(appBeforeVat)}</td>
                    <td className={`py-1.5 pr-2 font-mono text-right ${signCls}`}>{fmtSign(appVatAmt)}</td>
                    <td className={`py-1.5 pr-2 font-mono font-bold text-right ${signCls}`}>{fmtSign(appAfterVat)}</td>
                    <td className="py-1.5 text-slate-500 truncate max-w-[200px]" title={app.content || app.note || ''}>
                      {app.content || app.note || 'Điều chỉnh giá trị theo phụ lục'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Dòng tổng kết */}
            <tfoot>
              <tr className="border-t border-slate-700">
                <td className="pt-2 pr-2 font-bold text-blue-300">Tổng giá trị hiện tại</td>
                <td className="pt-2 pr-2"></td>
                <td className="pt-2 pr-2 font-mono font-black text-white text-right">{formatVND(beforeVat)}</td>
                <td className="pt-2 pr-2 font-mono font-bold text-slate-300 text-right">{formatVND(vatAmount)}</td>
                <td className="pt-2 pr-2 font-mono font-black text-white text-right">{formatVND(currentContractValueAfterVat)}</td>
                <td className="pt-2 text-slate-500 text-[10px]">
                  {sortedAppendices.length > 0 
                    ? `= HĐ gốc ${totalAppendicesAfterVat >= 0 ? '+' : '−'} ${sortedAppendices.length} phụ lục`
                    : 'Chưa có phụ lục điều chỉnh'
                  }
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. NHÓM 3: TIẾN ĐỘ THANH TOÁN (SLIM PROGRESS BAR COMPACT) */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5 text-xs">
        <div className="flex items-center justify-between font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã thanh toán: <strong className="text-white">{paidRatio.toFixed(1)}%</strong> ({formatVND(totalPaidAfterVat)})
          </span>
          <span className="text-amber-400 font-bold text-xs">
            Còn lại: <strong className="text-white">{remainingRatio.toFixed(1)}%</strong> ({formatVND(remainingToPay)})
          </span>
        </div>

        {/* Slim Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700 flex">
          <div 
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500" 
            style={{ width: `${Math.min(100, paidRatio)}%` }} 
          />
          <div 
            className="bg-amber-500/80 h-full transition-all duration-500" 
            style={{ width: `${Math.min(100, remainingRatio)}%` }} 
          />
        </div>
      </div>

      {/* REAL-DATA STATUS ALERTS */}
      {statusAlerts.length > 0 && (
        <div className="space-y-1.5">
          {statusAlerts.map((alt, idx) => (
            <div key={idx} className={`p-2.5 rounded-lg border flex items-center gap-2.5 text-xs shadow-sm ${
              alt.level === 'danger'
                ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
                : 'bg-amber-950/40 border-amber-500/60 text-amber-300'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold text-white">{alt.title}: </span>
                <span>{alt.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SETTLEMENT NOTE — show only when settled and note exists */}
      {isSettled && contract.settlement_note && (
        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-700/40 flex items-start gap-2.5 text-xs">
          <span className="text-blue-400 mt-0.5 shrink-0">📝</span>
          <div>
            <span className="font-bold text-blue-300 uppercase tracking-wider text-[10px] block mb-0.5">Ghi chú quyết toán</span>
            <span className="text-slate-200 whitespace-pre-wrap">{contract.settlement_note}</span>
          </div>
        </div>
      )}

      {/* 5. NHÓM 4: BẢNG CHI TIẾT CÁC LẦN THANH TOÁN (COMPACT INTERNAL SCROLLABLE TABLE) */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              DANH SÁCH CÁC KHOẢN THANH TOÁN ({paymentsWithCumulative.length} đợt)
            </h3>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
            >
              {showCharts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showCharts ? 'Ẩn biểu đồ & phụ lục' : 'Xem biểu đồ & phụ lục'}
            </button>

            <button
              onClick={() => onOpenAddPayment(contract.id)}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + Thêm đợt thanh toán
            </button>
          </div>
        </div>

        {/* Compact Internal Scrollable Table Container (max-h-60 overflow-y-auto) */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg shadow-inner max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-300 min-w-[850px] relative">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">STT</th>
                <th className="py-2.5 px-3">ĐỢT THANH TOÁN</th>
                <th className="py-2.5 px-3 text-center">LOẠI</th>
                <th className="py-2.5 px-3">NGÀY THANH TOÁN</th>
                <th className="py-2.5 px-3 text-right">GIÁ TRỊ (TRƯỚC VAT)</th>
                <th className="py-2.5 px-3 text-center">VAT</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-400">GIÁ TRỊ (SAU VAT)</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-300">LŨY KẾ ĐÃ CHI</th>
                <th className="py-2.5 px-3 text-center w-20">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {paymentsWithCumulative.map((pm) => (
                <tr key={pm.id} className="hover:bg-slate-800/60 transition">
                  <td className="py-2 px-3 text-center font-mono font-semibold text-slate-400">{pm.stt}</td>
                  <td className="py-2 px-3 font-semibold text-white">
                    <span className="font-mono text-emerald-400 font-bold">{pm.phaseName}</span>
                    {pm.note && <span className="text-[10px] font-normal text-slate-400 ml-2 italic">({pm.note})</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                      pm.paymentCategory === 'Quyết toán'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : pm.paymentCategory === 'Tạm ứng'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {pm.paymentCategory}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-300">{pm.displayDate}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-200">{formatVND(pm.amount_before_vat)}</td>
                  <td className="py-2 px-3 text-center font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/30 text-[10px]">
                      {pm.vat_rate}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 text-xs bg-emerald-500/5">
                    {formatVND(pm.amount_after_vat)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-blue-300 text-xs bg-slate-950/60">
                    {formatVND(pm.cumulativeAfterVAT)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditPayment(pm)}
                        className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition cursor-pointer"
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
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
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
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-300">Chưa có dữ liệu thanh toán.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Nhấn nút "+ Thêm đợt thanh toán" ở trên để ghi nhận khoản giải ngân đầu tiên.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CHARTS & APPENDICES EXPANDABLE SECTION (Level 3 Detail) */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch animate-fade-in pt-1">
          
          {/* Cumulative Growth Chart (2 Cols) - Combo Chart Bar + Line */}
          <div className="lg:col-span-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                BIỂU ĐỒ TĂNG TRƯỞNG LŨY KẾ THANH TOÁN
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Theo đợt & ngày phát sinh</span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-48 w-full pt-1 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    
                    {/* Left Y-Axis for Thanh toán trong kỳ */}
                    <YAxis 
                      yAxisId="left"
                      stroke="#94a3b8" 
                      fontSize={10}
                      tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)} Tỷ`}
                    />

                    {/* Right Y-Axis for Lũy kế giải ngân */}
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#10b981" 
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
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-xs space-y-1.5 z-50 font-sans">
                            <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                              <span>📅 {label} (Ngày {dateStr})</span>
                              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
                                Hồ sơ đợt
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-0.5">
                              <span className="text-slate-300 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                                Thanh toán đợt này:
                              </span>
                              <strong className="text-blue-400 font-mono">
                                {((Number(itemAmt) || 0) / 1_000_000_000).toFixed(2)} Tỷ VNĐ
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-300 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                Lũy kế giải ngân:
                              </span>
                              <strong className="text-emerald-400 font-mono">
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
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={32}
                    />

                    {/* Series 2: Lũy kế giải ngân (Line - Green) */}
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Lũy kế giải ngân" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                      activeDot={{ r: 5.5, fill: '#34d399' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-lg border border-slate-800 flex-1">
                Chưa có phát sinh thanh toán để vẽ biểu đồ.
              </div>
            )}
          </div>

          {/* Contract Appendices History Box */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between h-full space-y-2">
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                  PHỤ LỤC HỢP ĐỒNG ({appendicesList.length})
                </h3>
                <button
                  onClick={() => onOpenAddAppendix(contract.id)}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Thêm
                </button>
              </div>

              <div className="space-y-1.5 mt-2 flex-1 max-h-40 overflow-y-auto pr-1">
                {appendixProgression.map((app) => (
                  <div key={app.id} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white text-[11px]">{app.appendix_number || '—'}</span>
                        {app.signed_date && (
                          <span className="text-[9px] text-slate-400 font-mono">({formatDisplayDate(app.signed_date)})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{app.content || '—'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-xs ${app.changeAmt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {app.changeAmt >= 0 ? `+${formatVND(app.changeAmt)}` : formatVND(app.changeAmt)}
                      </div>
                      <div className="text-[9px] text-blue-300 font-mono font-semibold">
                        Sau PL: {formatVND(app.valueAfterAppendix)}
                      </div>
                    </div>
                  </div>
                ))}
                {appendixProgression.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-500 italic">
                    Chưa phát sinh phụ lục điều chỉnh giá trị.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between shrink-0">
              <span className="text-slate-400 text-[11px]">Tổng phụ lục:</span>
              <span className={`font-mono font-bold text-xs ${totalAppendicesAfterVat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)}
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
