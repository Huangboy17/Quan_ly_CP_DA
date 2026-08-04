import React from 'react';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import StatCard from '../common/StatCard';
import { formatVND, formatVNDCompact, formatDisplayDate } from '../../utils/formatters';

export default function DashboardView({ 
  data, 
  setActiveTab, 
  setSelectedProjectId, 
  onNewContract, 
  onNewPayment 
}) {
  const { totals, projects, contracts, payments, inPeriodPayments, periodLabel, timeFilter } = data;

  // 1. Prepare Monthly Cash Flow Chart for the selected time scope
  const monthlyMap = {};
  inPeriodPayments.forEach(pm => {
    if (!pm.payment_date) return;
    const mStr = pm.payment_date.substring(0, 7); // YYYY-MM
    monthlyMap[mStr] = (monthlyMap[mStr] || 0) + Number(pm.amount_after_vat || 0);
  });

  const sortedMonths = Object.keys(monthlyMap).sort();
  const monthlyCashFlowData = sortedMonths.map(m => {
    const parts = m.split('-');
    return {
      month: `Thg ${parts[1]}/${parts[0]}`,
      'Giải ngân (Tỷ VNĐ)': Math.round((monthlyMap[m] / 1_000_000_000) * 100) / 100,
    };
  });

  // 2. Prepare In-Period Allocation by Project Chart
  const projectInPeriodMap = {};
  inPeriodPayments.forEach(pm => {
    const contract = contracts.find(c => c.id === pm.contract_id);
    const projName = contract ? contract.projectName : 'Chưa phân loại';
    projectInPeriodMap[projName] = (projectInPeriodMap[projName] || 0) + Number(pm.amount_after_vat || 0);
  });

  const projectAllocationData = Object.keys(projectInPeriodMap).map(name => ({
    name: name.length > 18 ? name.substring(0, 16) + '...' : name,
    fullName: name,
    value: Math.round((projectInPeriodMap[name] / 1_000_000_000) * 100) / 100,
  }));

  // 3. Prepare All-Time vs In-Period Comparison Bar Chart for Projects
  const projectComparisonData = projects.map(p => ({
    name: p.name.length > 16 ? p.name.substring(0, 14) + '...' : p.name,
    fullName: p.name,
    'Giải ngân trong kỳ': Math.round((p.totalPaidInPeriod / 1_000_000_000) * 100) / 100,
    'Lũy kế toàn thời gian': Math.round((p.totalPaid / 1_000_000_000) * 100) / 100,
    'Giá trị HĐ': Math.round((p.totalContractValue / 1_000_000_000) * 100) / 100,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 z-50">
          <p className="font-semibold text-slate-200">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">{entry.value} Tỷ VNĐ</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Time Analytics Scope Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold font-mono">
              📅 KỲ PHÂN TÍCH: {periodLabel.toUpperCase()}
            </span>
            {totals.periodGrowthPct !== 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                totals.periodGrowthPct > 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {totals.periodGrowthPct > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {totals.periodGrowthPct > 0 ? `+${totals.periodGrowthPct}%` : `${totals.periodGrowthPct}%`} so với {totals.prevPeriodLabel}
              </span>
            )}
          </div>

          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-2 flex items-center gap-2">
            📊 Phân Tích Dòng Tiền & Tiến Độ Giải Ngân
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Số liệu tài chính được lọc chính xác theo khoảng thời gian <span className="text-blue-300 font-semibold">{periodLabel}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewContract}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer flex items-center gap-2"
          >
            + Nhập Hợp Đồng Mới
          </button>
          <button
            onClick={onNewPayment}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
          >
            + Nhập Thanh Toán Đợt
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Time-Based Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: In-Period Total Payment */}
        <StatCard
          title={`Chi Trả Trong Kỳ`}
          value={formatVNDCompact(totals.totalPaidInPeriod)}
          subtext={formatVND(totals.totalPaidInPeriod)}
          icon={Calendar}
          color="emerald"
          badge={
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {periodLabel}
            </div>
          }
        />

        {/* Card 2: In-Period Transaction Count */}
        <StatCard
          title="Lượt Chi Trong Kỳ"
          value={`${totals.inPeriodTransactionsCount} Đợt`}
          subtext={`Số đợt giải ngân phát sinh`}
          icon={Layers}
          color="cyan"
        />

        {/* Card 3: Period over Period Growth */}
        <StatCard
          title={`So Với ${totals.prevPeriodLabel}`}
          value={`${totals.periodGrowthPct >= 0 ? '+' : ''}${totals.periodGrowthPct}%`}
          subtext={`Kỳ trước: ${formatVNDCompact(totals.prevPeriodPaid)}`}
          icon={totals.periodGrowthPct >= 0 ? TrendingUp : TrendingDown}
          color={totals.periodGrowthPct >= 0 ? 'purple' : 'amber'}
        />

        {/* Card 4: All-Time Contract Value */}
        <StatCard
          title="Tổng Giá Trị Ký"
          value={formatVNDCompact(totals.totalContractValue)}
          subtext={formatVND(totals.totalContractValue)}
          icon={FileText}
          color="blue"
        />

        {/* Card 5: All-Time Cumulative Paid */}
        <StatCard
          title="Lũy Kế Đã Chi"
          value={formatVNDCompact(totals.totalPaidValueAllTime)}
          subtext={`Toàn bộ thời gian`}
          icon={CheckCircle2}
          color="emerald"
          progress={totals.totalContractValue > 0 ? Math.round((totals.totalPaidValueAllTime / totals.totalContractValue) * 100) : 0}
        />

        {/* Card 6: Total Remaining */}
        <StatCard
          title="Còn Lại Chưa Chi"
          value={formatVNDCompact(totals.totalRemainingValue)}
          subtext={`Dư nợ hợp đồng còn lại`}
          icon={Clock}
          color="amber"
        />

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Cash Flow Chart in Selected Period */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Dòng Tiền Giải Ngân Theo Thời Gian ({periodLabel})
              </h3>
              <p className="text-xs text-slate-400">Tổng chi trả thực tế theo từng tháng trong khoảng thời gian đang lọc (Tỷ VNĐ)</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {monthlyCashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(val) => [`${val} Tỷ VNĐ`, 'Giải ngân']} />
                  <Bar dataKey="Giải ngân (Tỷ VNĐ)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Không có giao dịch thanh toán nào phát sinh trong {periodLabel}.
              </div>
            )}
          </div>
        </div>

        {/* Project Disbursement Allocation in Period */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-purple-400" />
                Phân Bổ Chi Trả Trong Kỳ
              </h3>
              <p className="text-xs text-slate-400">Tỷ trọng giải ngân từng dự án trong {periodLabel}</p>
            </div>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {projectAllocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {projectAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val) => [`${val} Tỷ VNĐ`, 'Chi trong kỳ']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Chưa có phát sinh chi trong kỳ này</div>
            )}
          </div>
        </div>

      </div>

      {/* Comparison Chart: In-Period vs All-Time Project Disbursement */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              So Sánh Chi Trả Trong Kỳ vs Lũy Kế Toàn Thời Gian
            </h3>
            <p className="text-xs text-slate-400">So sánh mức độ tập trung vốn trong kỳ {periodLabel} với tổng ngân sách dự án (Tỷ VNĐ)</p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
              <Bar dataKey="Giải ngân trong kỳ" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lũy kế toàn thời gian" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Giá trị HĐ" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projects Progress Table - Including In-Period Disbursement */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Bảng Tiến Độ Chi Trả Chi Tiết Các Dự Án
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Thống kê chi trả trong kỳ <span className="text-emerald-400 font-semibold">{periodLabel}</span> và tổng lũy kế toàn thời gian</p>
          </div>

          <button
            onClick={() => setActiveTab('projects')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Quản lý tất cả dự án <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Tên Dự Án</th>
                <th className="py-3 px-4 text-center">Số HĐ</th>
                <th className="py-3 px-4 text-right">Giá Trị Ký</th>
                <th className="py-3 px-4 text-right">Chi Trả Trong Kỳ</th>
                <th className="py-3 px-4 text-right">Lũy Kế Đã Chi</th>
                <th className="py-3 px-4 text-right">Còn Lại</th>
                <th className="py-3 px-4 w-44">Tiến Độ Lũy Kế</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {projects.map((proj) => (
                <tr key={proj.id} className="hover:bg-slate-700/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span>{proj.name}</span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] font-normal text-slate-400 line-clamp-1 ml-4 mt-0.5">
                        {proj.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      {proj.contractsCount} HĐ
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                    {formatVND(proj.totalContractValue)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold bg-emerald-500/5">
                    {formatVND(proj.totalPaidInPeriod)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-300 font-semibold">
                    {formatVND(proj.totalPaid)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-400 font-medium">
                    {formatVND(proj.totalRemaining)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Đã chi</span>
                        <span className="font-bold text-slate-200">{proj.paidPercentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${proj.paidPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setActiveTab('contracts');
                      }}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium transition cursor-pointer"
                    >
                      Xem Hợp Đồng
                    </button>
                  </td>
                </tr>
              ))}

              {projects.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Chưa có dự án nào trong hệ thống.
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
