import React, { useState } from 'react';
import { 
  AlertCircle,
  Activity,
  Target,
  AlertTriangle,
  BarChart3,
  FileText, 
  Search, 
  Building2, 
  RotateCcw, 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  Clock as ClockIcon,
  PieChart as PieIcon,
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Tag,
  X
} from 'lucide-react';
import { formatVND, formatDisplayDate } from '../../utils/formatters';
import { COST_GROUP_OPTIONS } from './ContractModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';


export default function ContractsView({
  data,
  selectedProjectId = '',
  setSelectedProjectId,
  onNewContract,
  onEditContract,
  onDeleteContract,
  onViewContractDetail,
  onViewContractDossier,
  onAddPaymentForContract,
  onOpenAppendixModal,
  onOpenExcelImport,
  globalSearch
}) {
  const { contracts = [], filteredContracts: centralFilteredContracts = [], projects = [], periodLabel } = data;

  const baseContracts = centralFilteredContracts.length > 0 || selectedProjectId ? centralFilteredContracts : contracts;

  const [contractorFilter, setContractorFilter] = useState('');
  const [costGroupFilter, setCostGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [chartCostGroupFilter, setChartCostGroupFilter] = useState('');
  const [chartStatusFilter, setChartStatusFilter] = useState('');
  const [chartScheduleFilter, setChartScheduleFilter] = useState('');
  const [statusChartMetric, setStatusChartMetric] = useState('count'); // 'count' or 'value'


  const contractorsList = Array.from(new Set(baseContracts.map(c => c.contractor).filter(Boolean))).sort();
  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  // Filter baseContracts by local contractor, cost group, status dropdown & search query
  const dashboardSourceContracts = baseContracts.filter(c => {
    if (contractorFilter && c.contractor !== contractorFilter) return false;
    if (costGroupFilter) {
      if (costGroupFilter === 'unassigned') {
        if (c.costGroup && c.costGroup.trim() !== '') return false;
      } else if (c.costGroup !== costGroupFilter) {
        return false;
      }
    }
    if (statusFilter) {
      if (statusFilter === 'settled' && c.status !== 'settled') return false;
      if (statusFilter === 'in_progress' && c.status === 'settled') return false;
    }
    if (searchQuery) {
      const matchNum = c.contract_number?.toLowerCase().includes(searchQuery);
      const matchContent = c.content?.toLowerCase().includes(searchQuery);
      const matchContractor = c.contractor?.toLowerCase().includes(searchQuery);
      const matchProject = c.projectName?.toLowerCase().includes(searchQuery);
      const matchGroup = c.costGroup?.toLowerCase().includes(searchQuery);
      const matchGroupNote = c.costGroupNote?.toLowerCase().includes(searchQuery);
      return matchNum || matchContent || matchContractor || matchProject || matchGroup || matchGroupNote;
    }
    return true;
  });

  
  // Function to determine schedule status
  const getScheduleStatus = (c) => {
    if (c.status === 'settled') return 'Đã hoàn thành';
    if (!c.end_date) return 'Đúng tiến độ'; // No end date = no deadline

    const now = new Date();
    // Reset time to start of day for accurate comparison
    now.setHours(0,0,0,0);
    const endDate = new Date(c.end_date);
    endDate.setHours(0,0,0,0);

    if (now > endDate) return 'Quá hạn';
    
    const diffTime = Math.abs(endDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return 'Sắp hết hạn';
    return 'Đúng tiến độ';
  };

  const filteredContracts = dashboardSourceContracts.filter(c => {
    if (chartCostGroupFilter) {
      const cg = c.costGroup || 'Chưa phân loại';
      if (cg !== chartCostGroupFilter) return false;
    }
    if (chartStatusFilter) {
      const st = c.status === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện';
      if (st !== chartStatusFilter) return false;
    }
    if (chartScheduleFilter) {
      if (getScheduleStatus(c) !== chartScheduleFilter) return false;
    }
    return true;
  });

  const isLocalFiltered = Boolean(contractorFilter || costGroupFilter || statusFilter || localSearch);
  const isChartFiltered = Boolean(chartCostGroupFilter || chartStatusFilter || chartScheduleFilter);

  const clearChartFilters = () => {
    setChartCostGroupFilter('');
    setChartStatusFilter('');
    setChartScheduleFilter('');
  };

  // KPI Calculations
  const kpiTotalContracts = dashboardSourceContracts.length;
  const kpiTotalValue = dashboardSourceContracts.reduce((sum, c) => sum + (Number(c.contractValueAfterVAT) || 0), 0);
  const kpiInProgress = dashboardSourceContracts.filter(c => c.status !== 'settled').length;
  const kpiSettled = dashboardSourceContracts.filter(c => c.status === 'settled').length;
  const kpiOverdue = dashboardSourceContracts.filter(c => getScheduleStatus(c) === 'Quá hạn').length;

  // Chart 1: Cost Group Data
  const costGroupMap = {};
  dashboardSourceContracts.forEach(c => {
    const cg = c.costGroup || 'Chưa phân loại';
    if (!costGroupMap[cg]) costGroupMap[cg] = 0;
    costGroupMap[cg] += (Number(c.contractValueAfterVAT) || 0);
  });
  const costGroupData = Object.keys(costGroupMap).map(key => ({
    name: key,
    value: Number((costGroupMap[key] / 1000000000).toFixed(2)) // Tỷ VNĐ
  })).sort((a,b) => b.value - a.value);

  // Chart 2: Status Data
  const statusMap = { 'Đang thực hiện': { count: 0, value: 0 }, 'Đã quyết toán': { count: 0, value: 0 } };
  dashboardSourceContracts.forEach(c => {
    const st = c.status === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện';
    statusMap[st].count += 1;
    statusMap[st].value += (Number(c.contractValueAfterVAT) || 0);
  });
  const statusData = [
    { name: 'Đang thực hiện', count: statusMap['Đang thực hiện'].count, value: Number((statusMap['Đang thực hiện'].value / 1000000000).toFixed(2)) },
    { name: 'Đã quyết toán', count: statusMap['Đã quyết toán'].count, value: Number((statusMap['Đã quyết toán'].value / 1000000000).toFixed(2)) }
  ];

  // Chart 3: Schedule Data
  const scheduleMap = { 'Đúng tiến độ': 0, 'Sắp hết hạn': 0, 'Quá hạn': 0, 'Đã hoàn thành': 0 };
  dashboardSourceContracts.forEach(c => {
    const s = getScheduleStatus(c);
    scheduleMap[s] += 1;
  });
  const scheduleData = [
    { name: 'Đúng tiến độ', count: scheduleMap['Đúng tiến độ'], fill: '#10b981' }, // emerald
    { name: 'Sắp hết hạn', count: scheduleMap['Sắp hết hạn'], fill: '#f59e0b' }, // amber
    { name: 'Quá hạn', count: scheduleMap['Quá hạn'], fill: '#ef4444' }, // red
    { name: 'Đã hoàn thành', count: scheduleMap['Đã hoàn thành'], fill: '#3b82f6' } // blue
  ];

  const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#64748b'];



  const handleRowClick = (contractId) => {
    if (onViewContractDossier) {
      onViewContractDossier(contractId);
    } else if (onViewContractDetail) {
      onViewContractDetail(contractId);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Quản Lý Hợp Đồng & Nhập Liệu
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Nhấn vào bất kỳ dòng hợp đồng nào để mở <strong className="text-blue-300">Chi tiết hợp đồng</strong>. Thống kê chi trả trong kỳ <span className="text-emerald-400 font-semibold">{periodLabel}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('contracts')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            📥 Import Excel HĐ
          </button>
          <button
            onClick={onNewContract}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> + Thêm Hợp Đồng Mới
          </button>
        </div>
      </div>

      
      {/* --- DASHBOARD SECTION --- */}
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1"><Target className="w-4 h-4" /> <span className="text-xs font-semibold uppercase">Tổng số hợp đồng</span></div>
          <div className="text-xl font-bold text-white">{kpiTotalContracts}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1"><Building2 className="w-4 h-4 text-blue-400" /> <span className="text-xs font-semibold uppercase">Tổng giá trị HĐ</span></div>
          <div className="text-xl font-bold text-blue-400 font-mono">{formatVND(kpiTotalValue)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1"><Activity className="w-4 h-4 text-emerald-400" /> <span className="text-xs font-semibold uppercase">Đang thực hiện</span></div>
          <div className="text-xl font-bold text-emerald-400">{kpiInProgress} <span className="text-xs text-slate-500 font-normal">hợp đồng</span></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1"><CheckCircle className="w-4 h-4 text-cyan-400" /> <span className="text-xs font-semibold uppercase">Đã quyết toán</span></div>
          <div className="text-xl font-bold text-cyan-400">{kpiSettled} <span className="text-xs text-slate-500 font-normal">hợp đồng</span></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1"><AlertCircle className="w-4 h-4 text-rose-400" /> <span className="text-xs font-semibold uppercase">Quá hạn</span></div>
          <div className="text-xl font-bold text-rose-400">{kpiOverdue} <span className="text-xs text-slate-500 font-normal">hợp đồng</span></div>
        </div>
      </div>

      {isChartFiltered && (
        <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
          <div className="text-xs text-blue-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Đang áp dụng bộ lọc từ Biểu đồ.
          </div>
          <button onClick={clearChartFilters} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
            <X className="w-3.5 h-3.5" /> Xóa bộ lọc biểu đồ
          </button>
        </div>
      )}

      {/* 2. Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        
        {/* Chart 1: Cost Group */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-72">
          <h3 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" /> Cơ cấu Giá Trị / Nhóm CP
          </h3>
          <div className="flex-1 w-full">
            {costGroupData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costGroupData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={v => `${v} Tỷ`} />
                  <YAxis dataKey="name" type="category" width={80} tick={{fill: '#cbd5e1', fontSize: 10}} />
                  <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px'}} formatter={(val) => [`${val} Tỷ`, 'Giá trị']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => setChartCostGroupFilter(chartCostGroupFilter === data.name ? '' : data.name)} className="cursor-pointer hover:opacity-80 transition">
                    {costGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartCostGroupFilter === entry.name ? '#f59e0b' : CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v)=>`${v} Tỷ`} style={{fill: '#cbd5e1', fontSize: '10px'}} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Chart 2: Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-72">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" /> Cơ Cấu Trạng Thái
            </h3>
            <div className="flex bg-slate-800 p-0.5 rounded-lg shrink-0 ml-2">
              <button onClick={() => setStatusChartMetric('count')} className={`px-2 py-1 text-[10px] rounded-md font-semibold transition cursor-pointer ${statusChartMetric === 'count' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>Số HĐ</button>
              <button onClick={() => setStatusChartMetric('value')} className={`px-2 py-1 text-[10px] rounded-md font-semibold transition cursor-pointer ${statusChartMetric === 'value' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>Giá trị</button>
            </div>
          </div>
          <div className="flex-1 w-full flex items-center justify-between gap-2 mt-2">
            {/* Donut Graphic */}
            <div className="w-[45%] h-full relative min-h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={statusData} 
                    cx="50%" cy="50%" 
                    innerRadius={35} outerRadius={55} 
                    paddingAngle={2} 
                    dataKey={statusChartMetric}
                    onClick={(data) => setChartStatusFilter(chartStatusFilter === data.name ? '' : data.name)}
                    className="cursor-pointer outline-none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartStatusFilter === entry.name ? '#f59e0b' : (entry.name === 'Đã quyết toán' ? '#06b6d4' : '#3b82f6')} className="hover:opacity-80 transition" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px'}} formatter={(val, name, props) => {
                     const total = statusChartMetric === 'count' ? kpiTotalContracts : kpiTotalValue;
                     const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                     return [statusChartMetric === 'count' ? `${val} HĐ (${pct}%)` : `${val} Tỷ (${pct}%)`, statusChartMetric === 'count' ? 'Số lượng' : 'Giá trị'];
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Tổng HĐ</span>
                <span className="text-sm font-bold text-white font-mono leading-none mt-0.5">{kpiTotalContracts}</span>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="w-[55%] flex flex-col gap-1.5 justify-center">
              {statusData.map((item, idx) => {
                 const pct = kpiTotalContracts > 0 ? ((item.count / kpiTotalContracts) * 100).toFixed(1) : 0;
                 const color = item.name === 'Đã quyết toán' ? '#06b6d4' : '#3b82f6';
                 const isActive = chartStatusFilter === item.name;
                 return (
                   <div 
                     key={item.name} 
                     onClick={() => setChartStatusFilter(chartStatusFilter === item.name ? '' : item.name)}
                     className={`flex flex-col p-1.5 rounded-lg border text-[10px] cursor-pointer transition ${isActive ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500'}`}
                   >
                     <div className="flex items-center justify-between mb-0.5">
                       <div className="flex items-center gap-1.5">
                         <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isActive ? '#f59e0b' : color }}></span>
                         <span className={`font-semibold ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>{item.name}</span>
                       </div>
                       <span className="font-mono text-slate-300 font-bold">{item.count} HĐ</span>
                     </div>
                     <div className="flex items-center justify-between pl-4">
                       <span className="text-slate-400">{item.value} tỷ</span>
                       <span className="text-emerald-400 font-mono font-semibold">{pct}%</span>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: Schedule */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-72">
          <h3 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-emerald-400" /> Tình Trạng Tiến Độ
          </h3>
          <div className="flex-1 w-full flex flex-col justify-between mt-2 gap-2">
            <div className="flex-1 flex items-center justify-between gap-2">
              {/* Donut Graphic */}
              <div className="w-[45%] h-full relative min-h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={scheduleData} 
                      cx="50%" cy="50%" 
                      innerRadius={30} outerRadius={48} 
                      paddingAngle={2} 
                      dataKey="count"
                      onClick={(data) => setChartScheduleFilter(chartScheduleFilter === data.name ? '' : data.name)}
                      className="cursor-pointer outline-none"
                    >
                      {scheduleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartScheduleFilter === entry.name ? '#ec4899' : entry.fill} className="hover:opacity-80 transition" />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px'}} 
                      formatter={(val) => {
                        const pct = kpiTotalContracts > 0 ? ((val / kpiTotalContracts) * 100).toFixed(1) : 0;
                        return [`${val} HĐ (${pct}%)`, 'Tiến độ'];
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Tổng HĐ</span>
                  <span className="text-xs font-bold text-white font-mono leading-none mt-0.5">{kpiTotalContracts}</span>
                </div>
              </div>
              {/* Custom Legend */}
              <div className="w-[55%] flex flex-col gap-1 justify-center">
                {scheduleData.map((item, idx) => {
                   const pct = kpiTotalContracts > 0 ? ((item.count / kpiTotalContracts) * 100).toFixed(1) : 0;
                   const isActive = chartScheduleFilter === item.name;
                   return (
                     <div 
                       key={item.name} 
                       onClick={() => setChartScheduleFilter(chartScheduleFilter === item.name ? '' : item.name)}
                       className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] cursor-pointer transition ${isActive ? 'bg-pink-500/10 border-pink-500/50' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500'}`}
                     >
                       <div className="flex items-center gap-1 min-w-0">
                         <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? '#ec4899' : item.fill }}></span>
                         <span className={`font-semibold truncate ${isActive ? 'text-pink-400' : 'text-slate-200'}`}>{item.name}</span>
                       </div>
                       <div className="flex items-center gap-1 shrink-0 font-mono">
                         <span className="text-slate-300">{item.count}</span>
                         <span className="text-emerald-400 font-semibold w-7 text-right">{pct}%</span>
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
            
            {/* Warning Footer */}
            {(() => {
               const warningCount = (scheduleMap['Sắp hết hạn'] || 0) + (scheduleMap['Quá hạn'] || 0);
               if (warningCount > 0) {
                 return (
                   <div className="mt-0.5 pt-1 border-t border-slate-800 text-[11px] font-semibold text-rose-400 flex items-center justify-center gap-1.5 bg-rose-950/20 py-1.5 rounded-lg">
                     <AlertTriangle className="w-3.5 h-3.5" /> HĐ cần chú ý: {warningCount}
                   </div>
                 );
               }
               return (
                 <div className="mt-0.5 pt-1 border-t border-slate-800 text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1.5 bg-emerald-950/20 py-1.5 rounded-lg">
                   <CheckCircle className="w-3.5 h-3.5" /> Không có HĐ cần chú ý
                 </div>
               );
            })()}
          </div>
        </div>

      </div>

      {/* --- END DASHBOARD SECTION --- */}

      {/* Streamlined Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo số HĐ, nội dung, nhà thầu, nhóm chi phí..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Contractor Filter */}
          <div className="relative shrink-0">
            <select
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Tất cả Nhà thầu ({contractorsList.length}) --</option>
              {contractorsList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Cost Group Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={costGroupFilter}
              onChange={(e) => setCostGroupFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="">-- Tất cả Nhóm Chi Phí --</option>
              <option value="unassigned">Chưa phân loại</option>
              {COST_GROUP_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Tất cả Trạng thái --</option>
              <option value="in_progress">🟢 Đang thực hiện</option>
              <option value="settled">🔵 Đã quyết toán</option>
            </select>
          </div>

          {/* Reset Local Filters */}
          {isLocalFiltered && (
            <button
              onClick={() => {
                setContractorFilter('');
                setCostGroupFilter('');
                setStatusFilter('');
                setLocalSearch('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Đặt lại tìm kiếm
            </button>
          )}

        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Hiển thị: <strong className="text-white">{filteredContracts.length}</strong> / {contracts.length} HĐ
        </div>
      </div>

      {/* Contracts Data Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300 min-w-[1050px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-36">Số HĐ / Ngày Ký</th>
                <th className="py-3.5 px-4">Tên HĐ & Nhà Thầu</th>
                <th className="py-3.5 px-4 w-40">Nhóm Chi Phí</th>
                <th className="py-3.5 px-4 text-right w-36">Giá Trị HĐ (Sau VAT)</th>
                <th className="py-3.5 px-4 text-right w-36">Chi Trả Trong Kỳ</th>
                <th className="py-3.5 px-4 text-right w-36">Lũy Kế Đã Chi</th>
                <th className="py-3.5 px-4 text-right w-36">Còn Lại</th>
                <th className="py-3.5 px-4 text-center w-28">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center w-36">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredContracts.map((c) => {
                const appendicesCount = Array.isArray(c.appendices) ? c.appendices.length : 0;
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => handleRowClick(c.id)}
                    className="hover:bg-slate-800/70 transition cursor-pointer group"
                    title="Click để xem chi tiết hợp đồng"
                  >
                    
                    {/* Số HĐ / Ngày Ký */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-white text-xs group-hover:text-blue-300 transition">{c.contract_number}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{formatDisplayDate(c.signing_date)}</div>
                      {appendicesCount > 0 && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                          +{appendicesCount} Phụ lục
                        </span>
                      )}
                    </td>

                    {/* Tên HĐ & Nhà Thầu */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100 text-xs line-clamp-1 group-hover:text-blue-300 transition">{c.content}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-300 font-medium">{c.contractor || 'Chưa cập nhật'}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-blue-400 font-semibold">{c.projectName}</span>
                      </div>
                    </td>

                    {/* Nhóm Chi Phí */}
                    <td className="py-3.5 px-4">
                      {c.costGroup ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 inline-block">
                            {c.costGroup}
                          </span>
                          {c.costGroup === 'Khác' && c.costGroupNote && (
                            <span className="text-[10px] text-purple-300 italic font-mono">
                              ({c.costGroupNote})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 inline-block font-mono">
                          Chưa phân loại
                        </span>
                      )}
                    </td>

                    {/* Giá trị HĐ sau VAT */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {formatVND(c.contractValueAfterVAT || c.contract_value)}
                    </td>

                    {/* Chi trả trong kỳ */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 bg-emerald-500/5">
                      {formatVND(c.inPeriodPaidAfterVAT || 0)}
                    </td>

                    {/* Lũy kế đã chi */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-300">
                      {formatVND(c.totalPaidAfterVAT || c.totalPaid || 0)}
                    </td>

                    {/* Còn lại */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-amber-400">
                      {formatVND(c.remainingAfterVAT || c.remainingValue || 0)}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${
                        c.status === 'settled'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {c.status === 'settled' ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleRowClick(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[11px] font-semibold border border-blue-500/30 transition cursor-pointer flex items-center gap-1"
                          title="Xem Chi Tiết Hợp Đồng"
                        >
                          <Eye className="w-3.5 h-3.5" /> Chi tiết
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditContract(c);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Sửa hợp đồng"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteContract(c.id);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Xóa hợp đồng"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">
                    Không tìm thấy hợp đồng nào phù hợp với bộ lọc đã chọn.
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
