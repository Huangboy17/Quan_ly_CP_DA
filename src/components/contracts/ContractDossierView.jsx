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
import { formatVND, formatDisplayDate } from '../../utils/formatters';

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

  // Locate the target contract using contractId
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

  // Contract 3-Tier Financial values
  const initialValueAfterVat = Number(contract.initialContractValueAfterVAT || contract.contractValueAfterVAT || contract.contract_value || 0);
  const totalAppendicesAfterVat = Number(contract.totalAppendicesAfterVAT || 0);
  const currentContractValueAfterVat = Number(contract.contractValueAfterVAT || contract.contract_value || 0);

  // Contract Payments
  const contractPayments = payments
    .filter(p => p.contract_id === contractId)
    .sort((a, b) => {
      if (a.payment_date !== b.payment_date) {
        return (a.payment_date || '').localeCompare(b.payment_date || '');
      }
      return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
    });

  // Calculate Running Cumulative Sum for Payment History and Chart
  let runningSum = 0;
  const paymentsWithCumulative = contractPayments.map(pm => {
    runningSum += Number(pm.amount_after_vat || 0);
    return {
      ...pm,
      cumulativeAfterVAT: runningSum,
      displayDate: formatDisplayDate(pm.payment_date),
    };
  });

  const totalPaidAfterVat = runningSum;
  const remainingToPay = currentContractValueAfterVat - totalPaidAfterVat;
  const estimatedSettlement = Number(contract.estimated_settlement_value !== undefined && contract.estimated_settlement_value !== null ? contract.estimated_settlement_value : currentContractValueAfterVat);
  const paidRatio = currentContractValueAfterVat > 0 ? (totalPaidAfterVat / currentContractValueAfterVat) * 100 : 0;
  const isSettled = contract.status === 'settled';

  // Chart Data for Cumulative Disbursement Over Time
  const chartData = paymentsWithCumulative.map(pm => ({
    name: `Đợt ${pm.payment_phase}`,
    date: pm.displayDate,
    amount: pm.amount_after_vat,
    cumulative: pm.cumulativeAfterVAT,
  }));

  // Pie Chart / Structure Donut Data
  const pieData = [
    { name: 'Đã thanh toán', value: Math.max(0, totalPaidAfterVat), color: '#10b981' },
    { name: 'Còn lại phải trả', value: Math.max(0, remainingToPay), color: '#f59e0b' },
  ];

  // Time Execution Progress Calculation
  let timeProgressPct = null;
  let daysRemaining = null;
  if (contract.signing_date && contract.end_date) {
    const start = new Date(contract.signing_date).getTime();
    const end = new Date(contract.end_date).getTime();
    const now = new Date('2026-08-08').getTime(); // Current system time

    if (end > start) {
      const totalDuration = end - start;
      const elapsed = Math.max(0, now - start);
      timeProgressPct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }
  }

  // Dynamic Risk & Anomaly Warning Detector
  const riskWarnings = [];
  if (totalPaidAfterVat > currentContractValueAfterVat) {
    riskWarnings.push({
      type: 'PAID_EXCEEDS_CONTRACT',
      level: 'danger',
      title: 'Đã thanh toán vượt giá trị hợp đồng hiện tại',
      message: `Tổng đã thanh toán (${formatVND(totalPaidAfterVat)}) vượt Giá trị HĐ hiện tại (${formatVND(currentContractValueAfterVat)}) một khoản ${formatVND(totalPaidAfterVat - currentContractValueAfterVat)}!`
    });
  }
  if (totalPaidAfterVat > estimatedSettlement && estimatedSettlement > 0) {
    riskWarnings.push({
      type: 'PAID_EXCEEDS_SETTLEMENT',
      level: 'danger',
      title: 'Đã thanh toán vượt giá trị dự kiến quyết toán',
      message: `Tổng đã thanh toán (${formatVND(totalPaidAfterVat)}) vượt giá trị Dự kiến quyết toán (${formatVND(estimatedSettlement)}) một khoản ${formatVND(totalPaidAfterVat - estimatedSettlement)}!`
    });
  }
  if (initialValueAfterVat > 0 && Math.abs(totalAppendicesAfterVat) / initialValueAfterVat > 0.3) {
    riskWarnings.push({
      type: 'LARGE_APPENDIX_ADJUSTMENT',
      level: 'warning',
      title: 'Biến động phụ lục hợp đồng lớn (>30%)',
      message: `Tổng giá trị phụ lục điều chỉnh (${formatVND(totalAppendicesAfterVat)}) chiếm ${((Math.abs(totalAppendicesAfterVat) / initialValueAfterVat) * 100).toFixed(1)}% so với Giá trị ký ban đầu!`
    });
  }
  if (remainingToPay < 0) {
    riskWarnings.push({
      type: 'NEGATIVE_REMAINING',
      level: 'danger',
      title: 'Số tiền còn lại phải thanh toán bị âm',
      message: `Cảnh báo bất thường: Dư nợ còn phải trả đang ghi nhận giá trị âm (${formatVND(remainingToPay)})!`
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. TOP NAVIGATION & HEADER ACTION BAR */}
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
              Dashboard điều hành toàn diện tình hình hợp đồng, lịch sử phụ lục & tiến độ giải ngân.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onEditContract(contract)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
          >
            <Edit className="w-3.5 h-3.5" /> Chỉnh sửa HĐ
          </button>
          <button
            onClick={() => onOpenAddAppendix(contract.id)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Phụ Lục
          </button>
          <button
            onClick={() => onOpenAddPayment(contract.id)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Thanh Toán
          </button>
        </div>
      </div>

      {/* 2. SECTION OVERVIEW INFO CARD */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">Số Hợp Đồng:</span>
            <span className="font-mono font-extrabold text-white text-base mt-0.5 block">{contract.contract_number}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">Nhà Thầu Thực Hiện:</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5 block truncate">{contract.contractor}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">Thuộc Dự Án:</span>
            <button
              onClick={() => onBackToProjectOverview(contract.project_id)}
              className="font-bold text-blue-400 hover:text-blue-300 text-sm mt-0.5 flex items-center gap-1 transition cursor-pointer group"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{contract.projectName}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px] tracking-wider">Trạng Thái Thực Hiện:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mt-1 ${
              isSettled
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {isSettled ? <ShieldCheck className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isSettled ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <span className="text-slate-400 block uppercase font-semibold text-[10px]">Nội dung / Gói thầu:</span>
            <p className="text-slate-300 font-medium leading-relaxed mt-0.5">{contract.content || 'Chưa cập nhật chi tiết nội dung gói thầu.'}</p>
          </div>
          <div>
            <span className="text-slate-400 block uppercase font-semibold text-[10px]">Thời Gian Ký & Thực Hiện:</span>
            <div className="text-slate-200 font-mono mt-0.5">
              <span>Ký ngày: {formatDisplayDate(contract.signing_date)}</span>
              <div className="text-amber-300 font-sans text-[11px] mt-0.5">
                Thời hạn: {contract.execution_days} ngày (Đến {formatDisplayDate(contract.end_date)})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION 3-TIER VALUE BREAKDOWN BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-500/30 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">GIÁ TRỊ KÝ BAN ĐẦU (GỐC)</span>
          <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{formatVND(initialValueAfterVat)}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">TỔNG PHỤ LỤC ({appendicesList.length} đợt)</span>
          <div className={`text-lg font-bold font-mono mt-0.5 ${totalAppendicesAfterVat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-900/40 border border-blue-500/50 shadow-md">
          <span className="text-[10px] uppercase font-extrabold text-blue-300 block">GIÁ TRỊ HỢP ĐỒNG HIỆN TẠI</span>
          <div className="text-xl font-black text-white font-mono mt-0.5">{formatVND(currentContractValueAfterVat)}</div>
        </div>
      </div>

      {/* 4. SECTION 6 FINANCIAL KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: GIÁ TRỊ HĐ HIỆN TẠI */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">1. GIÁ TRỊ HỢP ĐỒNG HIỆN TẠI</span>
          <div className="text-xl font-black text-blue-400 font-mono">{formatVND(currentContractValueAfterVat)}</div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Gốc: {formatVND(initialValueAfterVat)}</span>
        </div>

        {/* KPI 2: TỔNG ĐÃ THANH TOÁN */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">2. TỔNG ĐÃ THANH TOÁN</span>
          <div className="text-xl font-black text-emerald-400 font-mono">{formatVND(totalPaidAfterVat)}</div>
          <span className="text-[10px] text-emerald-500/80 font-mono mt-1 block">{contractPayments.length} đợt giải ngân</span>
        </div>

        {/* KPI 3: CÒN PHẢI THANH TOÁN */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">3. CÒN PHẢI THANH TOÁN</span>
          <div className={`text-xl font-black font-mono ${remainingToPay < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {formatVND(remainingToPay)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Dư nợ thực tế</span>
        </div>

        {/* KPI 4: DỰ KIẾN QUYẾT TOÁN */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">4. DỰ KIẾN QUYẾT TOÁN</span>
          <div className="text-xl font-bold text-purple-300 font-mono">{formatVND(estimatedSettlement)}</div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Dự toán sau cùng</span>
        </div>

        {/* KPI 5: TỔNG GIÁ TRỊ PHỤ LỤC */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">5. TỔNG GIÁ TRỊ PHỤ LỤC</span>
          <div className={`text-xl font-bold font-mono ${totalAppendicesAfterVat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">{appendicesList.length} phụ lục điều chỉnh</span>
        </div>

        {/* KPI 6: TỶ LỆ THANH TOÁN */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">6. TỶ LỆ THANH TOÁN HỢP ĐỒNG</span>
          <div className="text-xl font-black text-cyan-400 font-mono">{paidRatio.toFixed(1)}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, paidRatio)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 5. DYNAMIC RISK & ANOMALY ALERT SECTION */}
      {riskWarnings.length > 0 ? (
        <div className="space-y-3">
          {riskWarnings.map((w, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-md ${
                w.level === 'danger'
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
                  : 'bg-amber-950/40 border-amber-500/60 text-amber-300'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">🔴 {w.title}</h4>
                <p className="text-xs leading-relaxed mt-0.5">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>✓ Hợp đồng đang trong trạng thái an toàn, không ghi nhận bất thường tài chính.</span>
        </div>
      )}

      {/* 6. CHARTS GRID (LŨY KẾ THANH TOÁN & CƠ CẤU HỢP ĐỒNG) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DISBURSEMENT CUMULATIVE CHART (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Lũy Kế Thanh Toán Theo Thời Gian
            </h3>
            <span className="text-xs text-slate-400 font-mono">Đơn vị: VNĐ</span>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
              Chưa phát sinh thanh toán cho hợp đồng này.
            </div>
          )}
        </div>

        {/* DONUT CONTRACT STRUCTURE CHART (1 Col) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-400" />
            Cơ Cấu Giá Trị Hợp Đồng
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

      </div>

      {/* 7. SECTION TIME PROGRESS BAR */}
      {timeProgressPct !== null && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Tiến Độ Thời Gian Thực Hiện Hợp Đồng
            </span>
            <span className="font-mono text-amber-300 font-semibold">
              Đã trôi qua: {timeProgressPct}% (Còn {daysRemaining} ngày)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, timeProgressPct)}%` }} 
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Khởi tạo: {formatDisplayDate(contract.signing_date)}</span>
            <span>Hạn hoàn thành: {formatDisplayDate(contract.end_date)}</span>
          </div>
        </div>
      )}

      {/* 8. SECTION LỊCH SỬ PHỤ LỤC HỢP ĐỒNG */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-400" />
            Lịch Sử Phụ Lục Hợp Đồng ({appendicesList.length} phụ lục)
          </h3>

          <button
            onClick={() => onOpenAddAppendix(contract.id)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> + Thêm Phụ Lục
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Số Phụ Lục</th>
                <th className="py-3 px-4">Ngày Ký Phụ Lục</th>
                <th className="py-3 px-4">Nội Dung Điều Chỉnh Chi Tiết</th>
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

      {/* 9. SECTION LỊCH SỬ THANH TOÁN */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Lịch Sử Thanh Toán Chi Tiết ({contractPayments.length} đợt)
          </h3>

          <button
            onClick={() => onOpenAddPayment(contract.id)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> + Thêm Thanh Toán
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4 text-center">Đợt Thanh Toán</th>
                <th className="py-3 px-4">Ngày Thanh Toán</th>
                <th className="py-3 px-4 text-right">Trước VAT</th>
                <th className="py-3 px-4 text-center">Mức VAT</th>
                <th className="py-3 px-4 text-right">Tiền VAT</th>
                <th className="py-3 px-4 text-right font-bold text-emerald-400">Sau VAT</th>
                <th className="py-3 px-4 text-right font-bold text-blue-300">Lũy Kế Sau VAT</th>
                <th className="py-3 px-4">Ghi Chú</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
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
                        <span className="text-emerald-400 font-mono font-bold">Đợt {pm.payment_phase}</span>
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

    </div>
  );
}
