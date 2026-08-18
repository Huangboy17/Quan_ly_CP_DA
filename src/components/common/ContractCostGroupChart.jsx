import React, { useMemo } from 'react';
import { PieChart as PieIcon, ArrowRight } from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { formatVND, formatVNDCompact } from '../../utils/formatters';

const COST_GROUP_COLORS = {
  'Xây dựng - Thiết bị': 'var(--primary)', 
  'Chi phí QLDA': '#06b6d4',       
  'Tư vấn': 'var(--success)',             
  'Chi phí khác': '#8b5cf6',       
  'Lãi vay': 'var(--warning)',             
  'Khác': 'var(--destructive)',                
  'Chưa phân loại': 'var(--muted-foreground)',     
};

const PALETTE = ['var(--primary)', '#06b6d4', 'var(--success)', '#8b5cf6', 'var(--warning)', 'var(--destructive)', 'var(--muted-foreground)', '#14b8a6', '#6366f1'];

export default function ContractCostGroupChart({ 
  contracts = [], 
  title = "Giá trị hợp đồng theo nhóm chi phí",
  subtitle = "",
  onSelectCostGroup 
}) {
  
  // Aggregate contract value after VAT grouped by costGroup
  const chartData = useMemo(() => {
    if (!contracts || contracts.length === 0) return [];

    const groupMap = {};
    let totalVal = 0;

    contracts.forEach(c => {
      const val = Number(c.contractValueAfterVAT !== undefined && c.contractValueAfterVAT !== null 
        ? c.contractValueAfterVAT 
        : (c.contract_value || 0));
      
      const groupKey = (c.costGroup && c.costGroup.trim()) ? c.costGroup : 'Chưa phân loại';

      groupMap[groupKey] = (groupMap[groupKey] || 0) + val;
      totalVal += val;
    });

    if (totalVal <= 0) return [];

    const items = Object.keys(groupMap).map((name, idx) => {
      const val = groupMap[name];
      const pct = totalVal > 0 ? (val / totalVal) * 100 : 0;
      const color = COST_GROUP_COLORS[name] || PALETTE[idx % PALETTE.length];
      return {
        name,
        value: val,
        pct,
        color,
      };
    });

    // Sort descending by value
    return items.sort((a, b) => b.value - a.value);
  }, [contracts]);

  const grandTotalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  // Click handler: Navigates to ContractsView filtered by costGroup
  const handleItemClick = (groupName) => {
    if (onSelectCostGroup) {
      onSelectCostGroup(groupName === 'Chưa phân loại' ? 'unassigned' : groupName);
    }
  };

  // EMPTY STATE
  if (!contracts || contracts.length === 0 || chartData.length === 0 || grandTotalValue === 0) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-primary" />
              {title}
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="h-60 w-full flex flex-col items-center justify-center text-center space-y-2 p-4">
          <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
            <PieIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Chưa có dữ liệu hợp đồng để phân tích
          </span>
          <span className="text-[11px] text-muted-foreground max-w-xs">
            Khởi tạo hợp đồng mới và phân loại Nhóm chi phí để xem biểu đồ cơ cấu.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-xl space-y-4 flex flex-col justify-between h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subtitle || `Cơ cấu giá trị sau VAT theo nhóm chi phí (${chartData.length} nhóm)`}
          </p>
        </div>
        <span className="text-[10px] text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded font-mono">
          Click xem HD
        </span>
      </div>

      {/* Container Flexbox Layout: 45% Graphic (Left) | 55% Legend (Right) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 flex-1 w-full">
        
        {/* Left Side (~45% Width): Centered Donut Graphic with Overlay Text */}
        <div className="w-full md:w-[45%] shrink-0 relative h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
                onClick={(data) => handleItemClick(data.name)}
                className="cursor-pointer outline-none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cost-group-cell-${index}`} 
                    fill={entry.color} 
                    className="hover:opacity-80 transition cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="p-3 rounded-xl bg-popover border border-border shadow-2xl text-xs space-y-1 z-50">
                      <div className="font-bold text-popover-foreground flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                      <div className="text-muted-foreground font-mono pt-1">
                        Giá trị: <strong className="text-primary">{formatVNDCompact(d.value)}</strong> ({formatVND(d.value)})
                      </div>
                      <div className="text-muted-foreground font-mono">
                        Tỷ trọng: <strong className="text-success">{d.pct.toFixed(2)}%</strong>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Perfect Center Inner Text (Centered Vertically & Horizontally) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 select-none">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
              TỔNG GIÁ TRỊ
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground font-mono leading-tight mt-0.5">
              {formatVNDCompact(grandTotalValue)}
            </span>
          </div>
        </div>

        {/* Right Side (~55% Width): Legend List without Text Truncation */}
        <div className="w-full md:w-[55%] flex-1 flex flex-col justify-center gap-1.5 max-h-60 overflow-y-auto pl-1 pr-1">
          {chartData.map((item) => (
            <div
              key={item.name}
              onClick={() => handleItemClick(item.name)}
              title={`${item.name} - ${formatVND(item.value)} (${item.pct.toFixed(2)}%)`}
              className="p-2 rounded-xl bg-background/60 border border-border/80 hover:border-primary/50 hover:bg-muted/50 transition cursor-pointer flex items-center justify-between gap-2 group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span 
                  className="w-3 h-3 rounded-md shrink-0 shadow-sm mt-0.5" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-xs font-semibold text-foreground whitespace-normal break-words leading-snug group-hover:text-primary transition">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono">
                <span className="font-bold text-foreground">
                  {formatVNDCompact(item.value)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-primary border border-border min-w-[48px] text-right">
                  {item.pct.toFixed(1)}%
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" />
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
