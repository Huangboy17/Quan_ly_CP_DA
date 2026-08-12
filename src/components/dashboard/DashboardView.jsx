import React, { useMemo } from 'react';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  X
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
  Cell
} from 'recharts';
import StatCard from '../common/StatCard';
import { formatVND, formatVNDCompact } from '../../utils/formatters';

export default function DashboardView({ 
  data, 
  selectedProjectId = '',
  setSelectedProjectId,
  setActiveTab, 
  onNewContract, 
  onNewPayment 
}) {
  const { 
    totals = {}, 
    projects = [], 
    contracts = [], 
    filteredPayments = [], 
    filteredProjects = [], 
    inPeriodPayments = [], 
    periodLabel = 'Tất cả thời gian' 
  } = data;

  // Active Payments for Charts: Use filteredPayments from Single Source of Truth
  const activePaymentsForScope = useMemo(() => {
    if (filteredPayments && filteredPayments.length > 0) return filteredPayments;
    return inPeriodPayments;
  }, [filteredPayments, inPeriodPayments]);

  // Selected Project Object (if any)
  const selectedProjectObj = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => String(p.id) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  // 1. Prepare Monthly Cash Flow Chart for the selected time scope & project
  const monthlyCashFlowData = useMemo(() => {
    const monthlyMap = {};
    activePaymentsForScope.forEach(pm => {
      if (!pm.payment_date) return;
      const mStr = pm.payment_date.substring(0, 7); // YYYY-MM
      monthlyMap[mStr] = (monthlyMap[mStr] || 0) + Number(pm.amount_after_vat || 0);
    });

    const sortedMonths = Object.keys(monthlyMap).sort();
    return sortedMonths.map(m => {
      const parts = m.split('-');
      return {
        month: `Thg ${parts[1]}/${parts[0]}`,
        'Giải ngân (Tỷ VNĐ)': Math.round((monthlyMap[m] / 1_000_000_000) * 100) / 100,
      };
    });
  }, [activePaymentsForScope]);

  // 2. Prepare Allocation Chart (By Project if all projects, or by Contractor if specific project selected)
  const projectAllocationData = useMemo(() => {
    const allocationMap = {};
    
    activePaymentsForScope.forEach(pm => {
      const contract = contracts.find(c => String(c.id) === String(pm.contract_id));
      let key = 'Chưa phân loại';
      
      if (selectedProjectId) {
        // If a specific project is selected, group by Contractor / Nhà thầu
        key = contract && contract.contractor ? contract.contractor : (contract ? contract.contract_number : 'Khác');
      } else {
        // If All Projects selected, group by Project Name
        key = contract ? contract.projectName : 'Chưa phân loại';
      }
      
      allocationMap[key] = (allocationMap[key] || 0) + Number(pm.amount_after_vat || 0);
    });

    return Object.keys(allocationMap).map(name => ({
      name: name.length > 18 ? name.substring(0, 16) + '...' : name,
      fullName: name,
      value: Math.round((allocationMap[name] / 1_000_000_000) * 100) / 100,
    }));
  }, [activePaymentsForScope, contracts, selectedProjectId]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

  // Projects list: use filteredProjects from Single Source of Truth
  const displayProjectsList = useMemo(() => {
    if (filteredProjects && filteredProjects.length > 0) return filteredProjects;
    return projects;
  }, [filteredProjects, projects]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Time & Project Analytics Scope Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold font-mono">
              📅 KỲ PHÂN TÍCH: {(periodLabel || 'TẤT CẢ THỜI GIAN').toUpperCase()}
            </span>

            {/* Global Project Scope Badge */}
            {selectedProjectObj ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                <span>🏢 DỰ ÁN: {selectedProjectObj.name}</span>
                {setSelectedProjectId && (
                  <button 
                    onClick={() => setSelectedProjectId('')}
                    className="p-0.5 hover:bg-emerald-500/20 rounded-full transition cursor-pointer text-emerald-300 ml-1"
                    title="Bỏ lọc dự án (Xem tất cả)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                🏢 TẤT CẢ DỰ ÁN
              </span>
            )}

            {totals.hasPrevPeriod && totals.prevPeriodLabel && totals.periodGrowthPct !== null && !isNaN(totals.periodGrowthPct) && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                totals.periodGrowthPct >= 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {totals.periodGrowthPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {totals.periodGrowthPct >= 0 ? `+${totals.periodGrowthPct}%` : `${totals.periodGrowthPct}%`} so với {totals.prevPeriodLabel}
              </span>
            )}

            {!totals.hasPrevPeriod && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700">
                ♾️ Lũy kế toàn thời gian
              </span>
            )}
          </div>

          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-2 flex items-center gap-2">
            📊 Phân Tích Dòng Tiền & Tiến Độ Giải Ngân
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Số liệu tài chính được lọc đồng thời theo dự án <span className="text-emerald-300 font-semibold">{selectedProjectObj ? selectedProjectObj.name : 'Tất cả dự án'}</span> và phạm vi thời gian <span className="text-blue-300 font-semibold">{periodLabel || 'Tất cả thời gian'}</span>.
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

      {/* KPI Cards Grid - 3-Value VAT Model & Scope Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: In-Period Total Payment (3-Tier) */}
        <StatCard
          title={`Chi Trả Trong Kỳ`}
          value={formatVNDCompact(totals.totalPaidInPeriodAfterVAT || totals.totalPaidInPeriod || 0)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalPaidInPeriodBeforeVAT || 0)} | VAT: ${formatVNDCompact(totals.totalPaidInPeriodVAT || 0)}`}
          icon={Calendar}
          color="emerald"
          badge={
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {periodLabel || 'Tất cả thời gian'}
            </div>
          }
        />

        {/* Card 2: In-Period Transaction Count */}
        <StatCard
          title="Lượt Chi Trong Kỳ"
          value={`${totals.inPeriodTransactionsCount || 0} Đợt`}
          subtext={`Số đợt giải ngân phát sinh`}
          icon={Layers}
          color="cyan"
        />

        {/* Card 3: Period over Period Growth or All Time Scope */}
        {totals.hasPrevPeriod && totals.prevPeriodLabel ? (
          <StatCard
            title={`So Với ${totals.prevPeriodLabel}`}
            value={
              totals.prevPeriodPaid > 0 && totals.periodGrowthPct !== null && !isNaN(totals.periodGrowthPct)
                ? `${totals.periodGrowthPct >= 0 ? '+' : ''}${totals.periodGrowthPct}%`
                : totals.totalPaidInPeriod > 0
                ? '+100%'
                : '—'
            }
            subtext={
              totals.prevPeriodPaid > 0
                ? `Kỳ trước: ${formatVNDCompact(totals.prevPeriodPaid)}`
                : `Kỳ trước: 0 VNĐ (Không có dữ liệu so sánh)`
            }
            icon={
              totals.periodGrowthPct !== null && totals.periodGrowthPct < 0
                ? TrendingDown
                : TrendingUp
            }
            color={
              totals.periodGrowthPct !== null && totals.periodGrowthPct < 0
                ? 'amber'
                : 'purple'
            }
          />
        ) : (
          <StatCard
            title="Phạm Vi Phân Tích"
            value="Tất Cả Thời Gian"
            subtext="Tổng lũy kế từ trước đến nay"
            icon={Calendar}
            color="purple"
          />
        )}

        {/* Card 4: All-Time Contract Value (3-Tier) */}
        <StatCard
          title="Tổng Giá Trị HĐ (Sau VAT)"
          value={formatVNDCompact(totals.totalContractValueAfterVAT || totals.totalContractValue)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalContractValueBeforeVAT)} | VAT: ${formatVNDCompact(totals.totalContractVAT)}`}
          icon={FileText}
          color="blue"
        />

        {/* Card 5: All-Time Cumulative Paid (3-Tier) */}
        <StatCard
          title="Lũy Kế Đã Chi (Sau VAT)"
          value={formatVNDCompact(totals.totalPaidAfterVAT || totals.totalPaidValueAllTime)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalPaidBeforeVAT)} | VAT: ${formatVNDCompact(totals.totalPaidVAT)}`}
          icon={CheckCircle2}
          color="emerald"
          progress={totals.totalContractValueAfterVAT > 0 ? Math.round((totals.totalPaidAfterVAT / totals.totalContractValueAfterVAT) * 100) : 0}
        />

        {/* Card 6: Total Remaining (3-Tier) */}
        <StatCard
          title="Còn Lại Chưa Chi (Sau VAT)"
          value={formatVNDCompact(totals.totalRemainingAfterVAT || totals.totalRemainingValue)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalRemainingBeforeVAT)} | VAT: ${formatVNDCompact(totals.totalRemainingVAT)}`}
          icon={Clock}
          color="amber"
        />

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Cash Flow Chart in Selected Period & Scope */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Dòng Tiền Giải Ngân Theo Thời Gian ({periodLabel})
              </h3>
              <p className="text-xs text-slate-400">
                Tổng chi trả thực tế theo từng tháng cho <strong className="text-emerald-300">{selectedProjectObj ? selectedProjectObj.name : 'Tất cả dự án'}</strong> trong {periodLabel} (Tỷ VNĐ)
              </p>
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
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Không có phát sinh chi cho {selectedProjectObj ? selectedProjectObj.name : 'phạm vi này'} trong {periodLabel}.
              </div>
            )}
          </div>
        </div>

        {/* Disbursement Allocation Pie Chart (By Project or By Contractor) */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-purple-400" />
                {selectedProjectObj ? `Phân Bổ Chi Trả Theo Nhà Thầu` : `Phân Bổ Chi Trả Trong Kỳ`}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedProjectObj 
                  ? `Tỷ trọng giải ngân từng nhà thầu thuộc ${selectedProjectObj.name}`
                  : `Tỷ trọng giải ngân từng dự án trong ${periodLabel}`}
              </p>
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
              <div className="text-xs text-slate-400 italic">Chưa có phát sinh chi trong kỳ này</div>
            )}
          </div>
        </div>

      </div>

      {/* Projects Progress Table */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Bảng Tiến Độ Chi Trả Chi Tiết Các Dự Án
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Thống kê chi trả trong kỳ <span className="text-emerald-400 font-semibold">{periodLabel}</span> và tổng lũy kế toàn thời gian
            </p>
          </div>

          <button
            onClick={() => setActiveTab('projects')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Quản lý tất cả dự án <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300 min-w-[800px]">
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
              {displayProjectsList.map((proj) => {
                const isSelected = selectedProjectId && String(proj.id) === String(selectedProjectId);
                return (
                  <tr 
                    key={proj.id} 
                    className={`transition ${isSelected ? 'bg-emerald-950/30 border-l-4 border-emerald-500' : 'hover:bg-slate-700/40'}`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-blue-500'}`} />
                        <span className={isSelected ? 'text-emerald-300 font-bold' : ''}>{proj.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                            🟢 Đang lọc
                          </span>
                        )}
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
                          if (setSelectedProjectId) setSelectedProjectId(proj.id);
                          setActiveTab('contracts');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium transition cursor-pointer"
                      >
                        Xem Hợp Đồng
                      </button>
                    </td>
                  </tr>
                );
              })}

              {displayProjectsList.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Chưa có dự án nào thuộc bộ lọc này.
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
