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
  X,
  Percent
} from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts';
import StatCard from '../common/StatCard';
import { formatVND, formatVNDCompact } from '../../utils/formatters';
import ContractCostGroupChart from '../common/ContractCostGroupChart';

export default function DashboardView({ 
  data, 
  selectedProjectId = '',
  setSelectedProjectId,
  setActiveTab, 
  onNewContract, 
  onNewPayment,
  onSelectCostGroup
}) {
  const { 
    totals = {}, 
    projects = [], 
    contracts = [], 
    filteredContracts = [],
    filteredPayments = [], 
    filteredProjects = [], 
    inPeriodPayments = [], 
    periodLabel = 'Tất cả thời gian' 
  } = data;

  const activeContractsList = filteredContracts || [];

  // Active Payments for Charts: Use filteredPayments from Single Source of Truth
  const activePaymentsForScope = useMemo(() => {
    return filteredPayments || [];
  }, [filteredPayments]);

  // Selected Project Object (if any)
  const selectedProjectObj = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => String(p.id) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  // 1. Prepare Combo Chart Data (Bar for Monthly Disbursement + Line for Cumulative + Reference Line Average)
  const { comboCashFlowData, avgMonthlyDisbursement } = useMemo(() => {
    const monthlyMap = {};
    activePaymentsForScope.forEach(pm => {
      if (!pm.payment_date) return;
      const mStr = pm.payment_date.substring(0, 7); // YYYY-MM
      monthlyMap[mStr] = (monthlyMap[mStr] || 0) + Number(pm.amount_after_vat || 0);
    });

    const sortedMonths = Object.keys(monthlyMap).sort();
    let runningSum = 0;
    let totalDisbursedInBillions = 0;

    const result = sortedMonths.map(m => {
      const parts = m.split('-');
      const valInBillions = Math.round((monthlyMap[m] / 1_000_000_000) * 100) / 100;
      runningSum = Math.round((runningSum + valInBillions) * 100) / 100;
      totalDisbursedInBillions += valInBillions;

      return {
        month: `Thg ${parts[1]}/${parts[0]}`,
        'Giải ngân (Tỷ VNĐ)': valInBillions,
        'Lũy kế (Tỷ VNĐ)': runningSum,
      };
    });

    const avg = sortedMonths.length > 0 
      ? Math.round((totalDisbursedInBillions / sortedMonths.length) * 100) / 100 
      : 0;

    return { comboCashFlowData: result, avgMonthlyDisbursement: avg };
  }, [activePaymentsForScope]);

  // 2. Prepare Allocation Chart (By Project if all projects, or by Contractor if specific project selected)
  const projectAllocationData = useMemo(() => {
    const allocationMap = {};
    
    activePaymentsForScope.forEach(pm => {
      const contract = contracts.find(c => String(c.id) === String(pm.contract_id));
      let key = 'Chưa phân loại';
      
      if (selectedProjectId) {
        key = contract && contract.contractor ? contract.contractor : (contract ? contract.contract_number : 'Khác');
      } else {
        key = contract ? contract.projectName : 'Chưa phân loại';
      }
      
      allocationMap[key] = (allocationMap[key] || 0) + Number(pm.amount_after_vat || 0);
    });

    return Object.keys(allocationMap).map(name => ({
      name: name,
      fullName: name,
      value: Math.round((allocationMap[name] / 1_000_000_000) * 100) / 100,
    }));
  }, [activePaymentsForScope, contracts, selectedProjectId]);

  // Calculate total allocation sum in billions for inner text and percentage
  const totalAllocationValue = useMemo(() => {
    const sum = projectAllocationData.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
    return (Math.round(sum * 100) / 100).toFixed(2);
  }, [projectAllocationData]);

  // Calculate overall disbursement ratio (%) for KPI Card
  const disbursementRatio = useMemo(() => {
    const totalContract = totals.totalContractValueAfterVAT || totals.totalContractValue || 0;
    const totalPaid = totals.totalPaidAfterVAT || totals.totalPaidValueAllTime || 0;
    if (totalContract <= 0) return 0;
    const pct = (totalPaid / totalContract) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
  }, [totals]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

  // Projects list: use filteredProjects from Single Source of Truth
  const displayProjectsList = useMemo(() => {
    if (filteredProjects && filteredProjects.length > 0) return filteredProjects;
    return projects;
  }, [filteredProjects, projects]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Time & Project Analytics Scope Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
              📅 KỲ PHÂN TÍCH: {(periodLabel || 'TẤT CẢ THỜI GIAN').toUpperCase()}
            </span>

            {/* Global Project Scope Badge */}
            {selectedProjectObj ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/30 text-xs font-bold">
                <span>🏢 DỰ ÁN: {selectedProjectObj.name}</span>
                {setSelectedProjectId && (
                  <button 
                    onClick={() => setSelectedProjectId('')}
                    className="p-0.5 hover:bg-success/20 rounded-full transition cursor-pointer text-emerald-300 ml-1"
                    title="Bỏ lọc dự án (Xem tất cả)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <span className="px-3 py-1 rounded-full bg-muted text-foreground border border-border text-xs font-bold">
                🏢 TẤT CẢ DỰ ÁN
              </span>
            )}

            {totals.hasPrevPeriod && totals.prevPeriodLabel && totals.periodGrowthPct !== null && !isNaN(totals.periodGrowthPct) && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                totals.periodGrowthPct >= 0 
                  ? 'bg-success/10 text-success border-success/20' 
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                {totals.periodGrowthPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {totals.periodGrowthPct >= 0 ? `+${totals.periodGrowthPct}%` : `${totals.periodGrowthPct}%`} so với {totals.prevPeriodLabel}
              </span>
            )}

            {!totals.hasPrevPeriod && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-foreground bg-muted border border-border">
                ♾️ Lũy kế toàn thời gian
              </span>
            )}
          </div>

          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight mt-2 flex items-center gap-2">
            📊 Phân Tích Dòng Tiền & Tiến Độ Giải Ngân
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Số liệu tài chính được lọc đồng thời theo dự án <span className="text-primary font-semibold">{selectedProjectObj ? selectedProjectObj.name : 'Tất cả dự án'}</span> và phạm vi thời gian <span className="text-primary font-semibold">{periodLabel || 'Tất cả thời gian'}</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={onNewContract}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/20 transition flex justify-center items-center gap-2"
          >
            + Nhập Hợp Đồng Mới
          </button>
          <button
            onClick={onNewPayment}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-success hover:bg-success/90 text-success-foreground text-xs font-semibold shadow-lg shadow-success/20 transition flex justify-center items-center gap-2"
          >
            + Nhập Thanh Toán Đợt
          </button>
        </div>
      </div>

      {/* KPI CARDS (COMPACT FLEX/GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        
        <StatCard
          title={`Chi Trả Trong Kỳ`}
          value={formatVNDCompact(totals.totalPaidInPeriodAfterVAT || totals.totalPaidInPeriod || 0)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalPaidInPeriodBeforeVAT || 0)} | VAT: ${formatVNDCompact(totals.totalPaidInPeriodVAT || 0)}`}
          icon={Calendar}
          color="emerald"
          badge={
            <div className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
              {periodLabel || 'Tất cả thời gian'}
            </div>
          }
        />

        <StatCard
          title="Lượt Chi Trong Kỳ"
          value={`${totals.inPeriodTransactionsCount || 0} Đợt`}
          subtext={`Số đợt giải ngân phát sinh`}
          icon={Layers}
          color="cyan"
        />

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
                : `Kỳ trước: 0 VNĐ`
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
            title="TỶ LỆ GIẢI NGÂN"
            value={`${disbursementRatio.toFixed(1)}%`}
            subtext={`Lũy kế: ${formatVNDCompact(totals.totalPaidAfterVAT || totals.totalPaidValueAllTime || 0)} / ${formatVNDCompact(totals.totalContractValueAfterVAT || totals.totalContractValue || 0)}`}
            icon={Percent}
            color="purple"
            progress={disbursementRatio}
          />
        )}

        <StatCard
          title="Tổng Giá Trị HĐ (Sau VAT)"
          value={formatVNDCompact(totals.totalContractValueAfterVAT || totals.totalContractValue)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalContractValueBeforeVAT)} | VAT: ${formatVNDCompact(totals.totalContractVAT)}`}
          icon={FileText}
          color="blue"
        />

        <StatCard
          title="Lũy Kế Đã Chi (Sau VAT)"
          value={formatVNDCompact(totals.totalPaidAfterVAT || totals.totalPaidValueAllTime)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalPaidBeforeVAT)} | VAT: ${formatVNDCompact(totals.totalPaidVAT)}`}
          icon={CheckCircle2}
          color="emerald"
          progress={totals.totalContractValueAfterVAT > 0 ? Math.round((totals.totalPaidAfterVAT / totals.totalContractValueAfterVAT) * 100) : 0}
        />

        <StatCard
          title="Còn Lại Chưa Chi (Sau VAT)"
          value={formatVNDCompact(totals.totalRemainingAfterVAT || totals.totalRemainingValue)}
          subtext={`Trước VAT: ${formatVNDCompact(totals.totalRemainingBeforeVAT)} | VAT: ${formatVNDCompact(totals.totalRemainingVAT)}`}
          icon={Clock}
          color="amber"
        />

      </div>

      {/* ROW 1 (TOP): 2 DONUT CHARTS (50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Row 1 - Left Chart (50% Width): "Giá trị hợp đồng theo nhóm chi phí" */}
        <div className="h-full">
          <ContractCostGroupChart
            contracts={activeContractsList}
            title="Giá trị hợp đồng theo nhóm chi phí"
            subtitle={selectedProjectObj ? `Dự án: ${selectedProjectObj.name}` : "Tất cả hợp đồng đã ký trong hệ thống"}
            onSelectCostGroup={(costGroup) => {
              if (onSelectCostGroup) onSelectCostGroup(costGroup);
            }}
          />
        </div>

        {/* Row 1 - Right Chart (50% Width): "Phân bổ chi trả trong kỳ" */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-primary" />
                {selectedProjectObj ? `Phân Bổ Chi Trả Theo Nhà Thầu` : `Phân Bổ Chi Trả Trong Kỳ`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedProjectObj 
                  ? `Tỷ trọng giải ngân từng nhà thầu thuộc ${selectedProjectObj.name}`
                  : `Tỷ trọng giải ngân từng dự án trong ${periodLabel}`}
              </p>
            </div>
          </div>

          {/* Container Flexbox: 45% Donut Graphic (Left) | 55% Legend (Right) */}
          {projectAllocationData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 flex-1 w-full">
              
              {/* Left Side (~45% Width): Centered Donut Graphic with Overlay Text */}
              <div className="w-full md:w-[45%] shrink-0 relative h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      className="outline-none"
                    >
                      {projectAllocationData.map((entry, index) => (
                        <Cell key={`alloc-cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition cursor-pointer" />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val) => [`${val} Tỷ VNĐ`, 'Chi trong kỳ']} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Perfect Center Inner Text (Centered Vertically & Horizontally) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 select-none">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
                    TỔNG CHI
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground font-mono leading-tight mt-0.5">
                    {totalAllocationValue} Tỷ
                  </span>
                </div>
              </div>

              {/* Right Side (~55% Width): Legend List without Text Truncation */}
              <div className="w-full md:w-[55%] flex-1 flex flex-col justify-center gap-1.5 max-h-60 overflow-y-auto pl-1 pr-1">
                {projectAllocationData.map((item, idx) => {
                  const numVal = Number(item.value) || 0;
                  const totalSum = Number(totalAllocationValue) || 1;
                  const pct = totalSum > 0 ? (numVal / totalSum) * 100 : 0;
                  const itemColor = COLORS[idx % COLORS.length];

                  return (
                    <div
                      key={item.name}
                      title={`${item.fullName} - ${item.value} Tỷ VNĐ (${pct.toFixed(1)}%)`}
                      className="p-2 rounded-xl bg-background/60 border border-border/80 hover:border-primary/50 hover:bg-muted/50 transition cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span 
                          className="w-3 h-3 rounded-md shrink-0 shadow-sm mt-0.5" 
                          style={{ backgroundColor: itemColor }} 
                        />
                        <span className="text-xs font-semibold text-foreground whitespace-normal break-words leading-snug group-hover:text-primary transition">
                          {item.fullName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                        <span className="font-bold text-foreground">
                          {item.value} Tỷ
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-primary border border-border min-w-[44px] text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="h-56 w-full flex items-center justify-center text-xs text-muted-foreground italic">
              Chưa có phát sinh chi trong kỳ này
            </div>
          )}
        </div>

      </div>

      {/* ROW 2 (BOTTOM): 100% WIDTH COMBO CHART (BAR + LINE + DATA LABELS + MULTI-LAYER TOOLTIP + REF LINE) */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-success" />
              Dòng Tiền Giải Ngân Theo Thời Gian ({periodLabel})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Biểu đồ kết hợp Chi trả hàng tháng (Cột) & Giá trị Lũy kế cộng dồn (Đường) cho <strong className="text-emerald-300">{selectedProjectObj ? selectedProjectObj.name : 'Tất cả dự án'}</strong> (Tỷ VNĐ)
            </p>
          </div>

          {avgMonthlyDisbursement > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono self-start md:self-auto">
              <span className="px-2.5 py-1 rounded-full bg-muted text-foreground border border-border font-semibold">
                📊 Trung bình tháng: <strong className="text-success">{avgMonthlyDisbursement} Tỷ</strong>
              </span>
            </div>
          )}
        </div>

        <div className="h-80 w-full pt-2 overflow-x-auto overflow-y-hidden hide-scrollbar">
          {comboCashFlowData.length > 0 ? (
            <div className="min-w-[600px] h-full">
              <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboCashFlowData} margin={{ top: 25, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                
                {/* X-Axis */}
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                
                {/* Left Y-Axis for Monthly Disbursement Bars */}
                <YAxis 
                  yAxisId="left"
                  stroke="#94a3b8" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(val) => `${val} Tỷ`}
                />

                {/* Right Y-Axis for Cumulative Line */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#f59e0b" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(val) => `${val} Tỷ`}
                />

                {/* Multi-Layer Tooltip */}
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const monthVal = payload.find(p => p.dataKey === 'Giải ngân (Tỷ VNĐ)')?.value || 0;
                    const cumulativeVal = payload.find(p => p.dataKey === 'Lũy kế (Tỷ VNĐ)')?.value || 0;

                    return (
                      <div className="p-3 rounded-xl bg-popover border border-border shadow-2xl text-xs space-y-1.5 z-50">
                        <div className="font-bold text-popover-foreground flex items-center justify-between border-b border-border pb-1.5 gap-4">
                          <span>📅 {label}</span>
                          <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/20 font-mono">
                            Kỳ thanh toán
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-0.5">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-success inline-block" />
                            Chi trả trong tháng:
                          </span>
                          <strong className="text-success font-mono">{monthVal} Tỷ VNĐ</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                            Giá trị Lũy kế cộng dồn:
                          </span>
                          <strong className="text-warning font-mono">{cumulativeVal} Tỷ VNĐ</strong>
                        </div>
                        {avgMonthlyDisbursement > 0 && (
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border text-[11px] text-muted-foreground">
                            <span>Mức chi trung bình tháng:</span>
                            <span className="font-mono text-foreground">{avgMonthlyDisbursement} Tỷ VNĐ</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />

                {/* Reference Line for Average Monthly Disbursement */}
                {avgMonthlyDisbursement > 0 && (
                  <ReferenceLine 
                    yAxisId="left"
                    y={avgMonthlyDisbursement} 
                    stroke="#cbd5e1" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Trung bình: ${avgMonthlyDisbursement} Tỷ`, 
                      fill: '#cbd5e1', 
                      fontSize: 10, 
                      position: 'insideTopRight',
                      fontWeight: 'bold'
                    }} 
                  />
                )}

                {/* Series 1: Emerald Bars with Top Data Labels */}
                <Bar 
                  yAxisId="left"
                  dataKey="Giải ngân (Tỷ VNĐ)" 
                  name="Chi trả trong tháng"
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={36}
                >
                  <LabelList 
                    dataKey="Giải ngân (Tỷ VNĐ)" 
                    position="top" 
                    formatter={(val) => `${val} Tỷ`} 
                    style={{ fontSize: '10px', fill: '#6ee7b7', fontWeight: 'bold' }} 
                  />
                </Bar>

                {/* Series 2: Amber Line for Cumulative Sum with Point Markers */}
                <Line 
                  yAxisId="right"
                  type="monotone"
                  dataKey="Lũy kế (Tỷ VNĐ)" 
                  name="Giá trị Lũy kế"
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#facc15' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              Không có phát sinh chi cho {selectedProjectObj ? selectedProjectObj.name : 'phạm vi này'} trong {periodLabel}.
            </div>
          )}
        </div>
      </div>

      {/* Projects Progress Table */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Bảng Tiến Độ Chi Trả Chi Tiết Các Dự Án
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Thống kê chi trả trong kỳ <span className="text-success font-semibold">{periodLabel}</span> và tổng lũy kế toàn thời gian
            </p>
          </div>

          <button
            onClick={() => setActiveTab('projects')}
            className="text-xs font-semibold text-primary hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Quản lý tất cả dự án <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-muted-foreground min-w-[850px]">
            <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4">Tên Dự Án</th>
                <th className="py-3 px-4 text-center">Số HĐ</th>
                <th className="py-3 px-4 text-right">GIÁ TRỊ KÝ (Tỷ VNĐ)</th>
                <th className="py-3 px-4 text-right">CHI TRẢ TRONG KỲ (Tỷ VNĐ)</th>
                <th className="py-3 px-4 text-right">LŨY KẾ ĐÃ CHI (Tỷ VNĐ)</th>
                <th className="py-3 px-4 text-right">CÒN LẠI (Tỷ VNĐ)</th>
                <th className="py-3 px-4 w-44">Tiến Độ Lũy Kế</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {displayProjectsList.map((proj) => {
                const isSelected = selectedProjectId && String(proj.id) === String(selectedProjectId);
                return (
                  <tr 
                    key={proj.id} 
                    className={`transition ${isSelected ? 'bg-success/10 border-l-4 border-success' : 'hover:bg-muted/50'}`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-success animate-pulse' : 'bg-primary'}`} />
                        <span className={isSelected ? 'text-success font-bold' : ''}>{proj.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-success/10 text-success border border-success/40 font-mono">
                            🟢 Đang lọc
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-[11px] font-normal text-muted-foreground line-clamp-1 ml-4 mt-0.5">
                          {proj.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                        {proj.contractsCount} HĐ
                      </span>
                    </td>

                    {/* GIÁ TRỊ KÝ (Tỷ VNĐ) */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                      {((Number(proj.totalContractValue) || 0) / 1_000_000_000).toFixed(2)}
                    </td>

                    {/* CHI TRẢ TRONG KỲ (Tỷ VNĐ) */}
                    <td className="py-3.5 px-4 text-right font-mono text-success font-bold bg-success/5">
                      {((Number(proj.totalPaidInPeriod) || 0) / 1_000_000_000).toFixed(2)}
                    </td>

                    {/* LŨY KẾ ĐÃ CHI (Tỷ VNĐ) */}
                    <td className="py-3.5 px-4 text-right font-mono text-primary font-semibold">
                      {((Number(proj.totalPaid) || 0) / 1_000_000_000).toFixed(2)}
                    </td>

                    {/* CÒN LẠI (Tỷ VNĐ) */}
                    <td className="py-3.5 px-4 text-right font-mono text-warning font-medium">
                      {((Number(proj.totalRemaining) || 0) / 1_000_000_000).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Đã chi</span>
                          <span className="font-bold text-foreground">{proj.paidPercentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
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
                        className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[11px] font-medium border border-border transition cursor-pointer"
                      >
                        Xem Hợp Đồng
                      </button>
                    </td>
                  </tr>
                );
              })}

              {displayProjectsList.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-muted-foreground">
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
