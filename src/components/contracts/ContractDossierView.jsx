import React from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
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
  const { contracts = [], payments = [], projects = [] } = data;

  // 1. Locate target contract using contractId
  const contract = contracts.find(c => c.id === contractId);

  if (!contract) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 animate-fade-in">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Không tìm thấy thông tin Hồ sơ Hợp đồng</h3>
        <p className="text-xs text-slate-400">Hợp đồng có mã "{contractId}" không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button
          onClick={onBackToContracts}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          ← Quay lại Quản lý Hợp đồng
        </button>
      </div>
    );
  }

  // Related project object
  const projectObj = projects.find(p => p.id === contract.project_id);

  // Appendices list
  const appendicesList = Array.isArray(contract.appendices) ? contract.appendices : [];

  // Contract 3-Tier Financial values (Clean VND)
  const initialValueAfterVat = cleanVND(contract.initialContractValueAfterVAT || contract.contractValueAfterVAT || contract.contract_value || 0);
  const totalAppendicesAfterVat = cleanVND(contract.totalAppendicesAfterVAT || 0);
  const currentContractValueAfterVat = cleanVND(contract.contractValueAfterVAT || contract.contract_value || 0);
  const estimatedSettlement = cleanVND(contract.estimated_settlement_value !== undefined && contract.estimated_settlement_value !== null ? contract.estimated_settlement_value : currentContractValueAfterVat);
  const isSettled = contract.status === 'settled';

  // SECTION III & X: Accurate End Date & Independent Deadline Evaluation
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
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
        🔵 Đã quyết toán
      </span>
    );
  } else if (isOverdue) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
        🔴 Đã quá hạn {daysOverdue} ngày
      </span>
    );
  } else if (daysRemaining <= 30) {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
        🟠 Còn {daysRemaining} ngày
      </span>
    );
  } else {
    deadlineStatusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
        🟢 Còn {daysRemaining} ngày
      </span>
    );
  }

  // SECTION VII: SORT PAYMENTS STRICTLY BY PAYMENT DATE ASCENDING
  const sortedPayments = [...payments]
    .filter(p => p.contract_id === contractId)
    .sort((a, b) => {
      const d1 = a.payment_date || '1970-01-01';
      const d2 = b.payment_date || '1970-01-01';
      if (d1 !== d2) return d1.localeCompare(d2);
      return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
    });

  // SECTION VIII: CALCULATE CUMULATIVE SUM STRICTLY IN CHRONOLOGICAL ORDER
  let runningCumulative = 0;
  const paymentsWithCumulative = sortedPayments.map(pm => {
    const beforeVAT = cleanVND(pm.amount_before_vat);
    const vatRate = Number(pm.vat_rate || 0);
    const vatAmount = cleanVND(pm.vat_amount !== undefined ? pm.vat_amount : (beforeVAT * vatRate / 100));
    const afterVAT = cleanVND(pm.amount_after_vat !== undefined ? pm.amount_after_vat : (beforeVAT + vatAmount));
    
    runningCumulative = cleanVND(runningCumulative + afterVAT);

    return {
      ...pm,
      amount_before_vat: beforeVAT,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_after_vat: afterVAT,
      cumulativeAfterVAT: runningCumulative,
      displayDate: formatDisplayDate(pm.payment_date),
    };
  });

  const totalPaidAfterVat = runningCumulative;
  const remainingToPay = Math.max(0, cleanVND(currentContractValueAfterVat - totalPaidAfterVat));
  const paidRatio = currentContractValueAfterVat > 0 ? (totalPaidAfterVat / currentContractValueAfterVat) * 100 : 0;

  // SECTION XI: Chart Data for Cumulative Disbursement Over Time
  const chartData = paymentsWithCumulative.map(pm => {
    const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT';
    const phaseLabel = isSettlementPhase ? 'Quyết toán' : (typeof pm.payment_phase === 'number' ? `Đợt ${pm.payment_phase}` : (pm.payment_phase || 'Đợt thanh toán'));
    return {
      name: phaseLabel,
      date: pm.displayDate,
      amount: pm.amount_after_vat,
      cumulative: pm.cumulativeAfterVAT,
    };
  });

  // SECTION XI: Donut Chart Data for Paid vs Remaining
  const pieData = [
    { name: 'Đã thanh toán', value: Math.max(0, totalPaidAfterVat), color: '#10b981' },
    { name: 'Còn phải thanh toán', value: Math.max(0, remainingToPay), color: '#f59e0b' },
  ];

  // SECTION XI: Time Progress Percentage
  let timeProgressPct = null;
  if (signingDate && exactEndDate) {
    const start = new Date(signingDate).getTime();
    const end = new Date(exactEndDate).getTime();
    const now = new Date().getTime();

    if (end > start) {
      const totalDuration = end - start;
      const elapsed = Math.max(0, now - start);
      timeProgressPct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    }
  }

  // SECTION XV: REAL-DATA ANOMALY ALERTS
  const statusAlerts = [];
  if (totalPaidAfterVat > currentContractValueAfterVat) {
    statusAlerts.push({
      level: 'danger',
      title: 'Giá trị thanh toán vượt giá trị hợp đồng',
      desc: `Tổng đã thanh toán (${formatVND(totalPaidAfterVat)}) vượt Giá trị HĐ hiện tại (${formatVND(currentContractValueAfterVat)}) số tiền ${formatVND(totalPaidAfterVat - currentContractValueAfterVat)}!`
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
    <div className="space-y-6 animate-fade-in">
      
      {/* II. HEADER */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToContracts}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Quản lý Hợp đồng
          </button>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              HỒ SƠ HỢP ĐỒNG: <span className="font-mono text-blue-300">{contract.contract_number}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hồ sơ điện tử tổng hợp thông tin, tiến độ giải ngân & phân tích của hợp đồng.
            </p>
          </div>
        </div>

        {/* Priority order: 1. + Thanh toán (Primary) -> 2. + Phụ lục -> 3. Chỉnh sửa HĐ */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenAddPayment(contract.id)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> + Thanh toán
          </button>
          <button
            onClick={() => onOpenAddAppendix(contract.id)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> + Phụ lục
          </button>
          <button
            onClick={() => onEditContract(contract)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" /> Chỉnh sửa HĐ
          </button>
        </div>
      </div>

      {/* III. KHỐI 1 - THÔNG TIN HỢP ĐỒNG */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            THÔNG TIN HỢP ĐỒNG
          </h3>
        </div>

        {/* HÀNG 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">SỐ HỢP ĐỒNG</span>
            <span className="font-mono font-extrabold text-white text-base mt-0.5 block">{contract.contract_number}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">NỘI DUNG / GÓI THẦU</span>
            <span className="font-semibold text-slate-200 text-xs mt-0.5 block leading-relaxed">{contract.content || 'N/A'}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">NHÀ THẦU THỰC HIỆN</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5 block truncate">{contract.contractor}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">DỰ ÁN</span>
            <button
              onClick={() => onBackToProjectOverview(contract.project_id)}
              className="font-bold text-blue-400 hover:text-blue-300 text-sm mt-0.5 flex items-center gap-1 transition cursor-pointer group"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{contract.projectName}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* HÀNG 2 */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">NGÀY KÝ HỢP ĐỒNG</span>
            <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">{formatDisplayDate(signingDate)}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">THỜI HẠN THỰC HIỆN</span>
            <span className="font-mono font-bold text-white text-sm mt-0.5 block">{executionDays} ngày</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">NGÀY HẾT HẠN</span>
            <span className="font-mono font-bold text-amber-300 text-sm mt-0.5 block">{formatDisplayDate(exactEndDate)}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider mb-1">TRẠNG THÁI & THỜI HẠN</span>
            <div className="space-y-1">
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isSettled
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isSettled ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                </span>
              </div>
              <div>{deadlineStatusBadge}</div>
            </div>
          </div>
        </div>
      </div>

      {/* IV. KHỐI 2 - GIÁ TRỊ HỢP ĐỒNG (3 CARDS) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-400" />
          GIÁ TRỊ HỢP ĐỒNG
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">GIÁ TRỊ HĐ BAN ĐẦU</span>
            <div className="text-xl font-bold text-slate-200 font-mono">{formatVND(initialValueAfterVat)}</div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Sau VAT (Gốc ký ban đầu)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TỔNG GIÁ TRỊ PHỤ LỤC</span>
            <div className={`text-xl font-bold font-mono ${totalAppendicesAfterVat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">{appendicesList.length} đợt phụ lục điều chỉnh</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/40 shadow-md bg-blue-950/20">
            <span className="text-[10px] font-bold text-blue-300 uppercase block mb-1">GIÁ TRỊ HĐ HIỆN TẠI</span>
            <div className="text-xl font-black text-white font-mono">{formatVND(currentContractValueAfterVat)}</div>
            <span className="text-[10px] text-blue-300/80 font-mono mt-1 block">= Giá trị ban đầu + Phụ lục</span>
          </div>
        </div>
      </div>

      {/* V. KHỐI 3 - TÌNH HÌNH THANH TOÁN (3 CARDS) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          TÌNH HÌNH THANH TOÁN
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ĐÃ THANH TOÁN</span>
            <div className="text-xl font-black text-emerald-400 font-mono">{formatVND(totalPaidAfterVat)}</div>
            <span className="text-[10px] text-emerald-500/80 font-mono mt-1 block">Tổng tất cả các lần thanh toán sau VAT</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CÒN PHẢI THANH TOÁN</span>
            <div className="text-xl font-black font-mono text-amber-400">{formatVND(remainingToPay)}</div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">= Giá trị HĐ hiện tại - Đã thanh toán</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TỶ LỆ THANH TOÁN</span>
            <div className="text-xl font-black text-cyan-400 font-mono">{paidRatio.toFixed(1)}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, paidRatio)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* XV. REAL-DATA STATUS ALERTS */}
      {statusAlerts.length > 0 && (
        <div className="space-y-2">
          {statusAlerts.map((alt, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs shadow-md ${
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

      {/* VI. KHỐI 4 - LỊCH SỬ THANH TOÁN (CENTRAL / MOST IMPORTANT SECTION) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              LỊCH SỬ THANH TOÁN
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Các đợt thanh toán được sắp xếp theo ngày phát sinh tăng dần. Lũy kế được tính theo thứ tự thời gian.
            </p>
          </div>

          <button
            onClick={() => onOpenAddPayment(contract.id)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> + Thêm Thanh Toán
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-left text-xs text-slate-300 min-w-[900px]">
            <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4 text-center">ĐỢT / LOẠI THANH TOÁN</th>
                <th className="py-3 px-4">NGÀY THANH TOÁN</th>
                <th className="py-3 px-4 text-right">TRƯỚC VAT</th>
                <th className="py-3 px-4 text-center">VAT</th>
                <th className="py-3 px-4 text-right">TIỀN VAT</th>
                <th className="py-3 px-4 text-right font-bold text-emerald-400">SAU VAT</th>
                <th className="py-3 px-4 text-right font-bold text-blue-300">LŨY KẾ THANH TOÁN</th>
                <th className="py-3 px-4">GHI CHÚ</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {paymentsWithCumulative.map((pm) => {
                const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT';
                return (
                  <tr key={pm.id} className="hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4 text-center font-semibold">
                      {isSettlementPhase ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold text-[11px] inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Quyết toán
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono font-bold">
                          {typeof pm.payment_phase === 'number' ? `Đợt ${pm.payment_phase}` : (pm.payment_phase || 'Đợt chi')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {pm.displayDate}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">
                      {formatVND(pm.amount_before_vat)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/30 text-[11px]">
                        {pm.vat_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {formatVND(pm.vat_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-xs bg-emerald-500/5">
                      {formatVND(pm.amount_after_vat)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-300 text-xs bg-slate-950/60">
                      {formatVND(pm.cumulativeAfterVAT)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {pm.note || '---'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditPayment(pm)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                          title="Sửa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Xóa đợt thanh toán ${pm.payment_phase}?`)) {
                              onDeletePayment(pm.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paymentsWithCumulative.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    Chưa có đợt thanh toán nào cho hợp đồng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* XI. CHARTS & TIME PROGRESS SECTION (AFTER PAYMENT HISTORY TABLE) */}
      
      {/* 1. BIỂU ĐỒ LŨY KẾ THANH TOÁN THEO THỜI GIAN */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            1. BIỂU ĐỒ LŨY KẾ THANH TOÁN THEO THỜI GIAN
          </h3>
          <span className="text-xs text-slate-400 font-mono">Dữ liệu theo đúng thứ tự ngày thanh toán</span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCumulativeDossierV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(value) => [formatVND(value), 'Lũy kế sau VAT']}
                  labelFormatter={(label, items) => `${label} - Ngày ${items[0]?.payload?.date || ''}`}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulativeDossierV2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
            Chưa phát sinh thanh toán cho hợp đồng này.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. BIỂU ĐỒ CƠ CẤU GIÁ TRỊ HỢP ĐỒNG (1 Col) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-400" />
            2. BIỂU ĐỒ CƠ CẤU GIÁ TRỊ HỢP ĐỒNG
          </h3>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(value) => [formatVND(value), 'Giá trị']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-white font-mono">{paidRatio.toFixed(1)}%</span>
              <span className="text-[10px] text-slate-400">Đã chi</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đã thanh toán:
              </span>
              <span className="font-mono font-bold text-emerald-400">{formatVND(totalPaidAfterVat)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Còn lại phải trả:
              </span>
              <span className="font-mono font-bold text-amber-400">{formatVND(remainingToPay)}</span>
            </div>
          </div>
        </div>

        {/* 3. TIẾN ĐỘ THỜI GIAN HỢP ĐỒNG (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                3. TIẾN ĐỘ THỜI GIAN HỢP ĐỒNG
              </h3>
              <div>{deadlineStatusBadge}</div>
            </div>

            {timeProgressPct !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Tiến độ thời gian:</span>
                  <span className="font-bold text-white">{timeProgressPct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isOverdue && !isSettled ? 'bg-rose-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, timeProgressPct)}%` }} 
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-3 border-t border-slate-800">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Ngày ký</span>
              <span className="font-bold text-white">{formatDisplayDate(signingDate)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Thời hạn</span>
              <span className="font-bold text-white">{executionDays} ngày</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Ngày hết hạn</span>
              <span className="font-bold text-amber-300">{formatDisplayDate(exactEndDate)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Tình trạng</span>
              <span className={`font-bold ${isOverdue && !isSettled ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isSettled ? 'Đã quyết toán' : isOverdue ? `Quá hạn ${daysOverdue}d` : `Còn ${daysRemaining}d`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* XII. KHỐI LỊCH SỬ PHỤ LỤC (AFTER CHARTS) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-400" />
            LỊCH SỬ PHỤ LỤC HỢP ĐỒNG ({appendicesList.length} phụ lục)
          </h3>

          <button
            onClick={() => onOpenAddAppendix(contract.id)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> + Thêm Phụ lục
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
            <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Số Phụ Lục</th>
                <th className="py-3 px-4">Ngày Ký Phụ Lục</th>
                <th className="py-3 px-4">Nội Dung Điều Chỉnh</th>
                <th className="py-3 px-4 text-right">Giá Trị Phụ Lục (Sau VAT)</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {appendicesList.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {app.appendix_number}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {formatDisplayDate(app.signed_date)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-sm leading-relaxed">
                    <div className="font-semibold text-slate-200">{app.content}</div>
                    {app.note && <div className="text-[10px] text-slate-400 italic">Căn cứ: {app.note}</div>}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold text-xs ${app.amount_after_vat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {app.amount_after_vat >= 0 ? `+${formatVND(app.amount_after_vat)}` : formatVND(app.amount_after_vat)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditAppendix(contract.id, app)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                        title="Sửa Phụ Lục"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa phụ lục ${app.appendix_number}?`)) {
                            onDeleteAppendix(contract.id, app.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Xóa Phụ Lục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {appendicesList.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    Hợp đồng này chưa phát sinh phụ lục điều chỉnh nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
