import React, { useMemo } from 'react';
import { PieChart as PieIcon, ArrowRight, Tag } from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { formatVND, formatVNDCompact } from '../../utils/formatters';

const COST_GROUP_COLORS = {
  'Xây dựng - Thiết bị': '#06b6d4', // Cyan
  'Chi phí QLDA': '#3b82f6',       // Blue
  'Tư vấn': '#10b981',             // Emerald
  'Chi phí khác': '#8b5cf6',       // Purple
  'Lãi vay': '#f59e0b',             // Amber
  'Khác': '#ec4899',                // Pink
  'Chưa phân loại': '#64748b',     // Slate
};

const PALETTE = ['#06b6d4', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b', '#14b8a6', '#6366f1'];

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
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-cyan-400" />
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="h-60 w-full flex flex-col items-center justify-center text-center space-y-2 p-4">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
            <PieIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Chưa có dữ liệu hợp đồng để phân tích
          </span>
          <span className="text-[11px] text-slate-500 max-w-xs">
            Khởi tạo hợp đồng mới và phân loại Nhóm chi phí để xem biểu đồ cơ cấu.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-cyan-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle || `Cơ cấu giá trị sau VAT theo nhóm chi phí (${chartData.length} nhóm)`}
          </p>
        </div>
        <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
          Click để xem chi tiết
        </span>
      </div>

      {/* Doughnut Chart & Side Legend Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Doughnut Graphic (Center Text Overlay) */}
        <div className="md:col-span-5 relative h-56 w-full flex items-center justify-center">
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
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-xs space-y-1 z-50">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                      <div className="text-slate-300 font-mono pt-1">
                        Giá trị: <strong className="text-cyan-300">{formatVNDCompact(d.value)}</strong> ({formatVND(d.value)})
                      </div>
                      <div className="text-slate-300 font-mono">
                        Tỷ trọng: <strong className="text-emerald-400">{d.pct.toFixed(2)}%</strong>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Overlay Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Tổng giá trị HĐ
            </span>
            <span className="text-xs font-black text-white font-mono mt-0.5">
              {formatVNDCompact(grandTotalValue)}
            </span>
          </div>
        </div>

        {/* Legend Panel beside Doughnut Chart */}
        <div className="md:col-span-7 space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {chartData.map((item) => (
            <div
              key={item.name}
              onClick={() => handleItemClick(item.name)}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span 
                  className="w-3 h-3 rounded-md shrink-0 shadow-sm" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                <span className="font-bold text-white">
                  {formatVNDCompact(item.value)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700 min-w-[48px] text-right">
                  {item.pct.toFixed(1)}%
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
