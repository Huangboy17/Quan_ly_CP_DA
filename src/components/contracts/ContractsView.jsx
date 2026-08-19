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
  X,
  MoreVertical
} from 'lucide-react';
import { formatVND, formatDisplayDate, formatCurrencyByUnit } from '../../utils/formatters';
import { exportContractsExcel, exportContractsPdf } from '../../utils/export/contractExport';
import PdfPreviewModal from '../common/PdfPreviewModal';
import { COST_GROUP_OPTIONS } from './ContractModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';


export default function ContractsView({
  data,
  currentUserRole,
  userSession,
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
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [displayUnit, setDisplayUnit] = useState(() => localStorage.getItem('contractListDisplayUnit') || 'vnd');
  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf_preview' | 'pdf_download' | null

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfFilename, setPreviewPdfFilename] = useState(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState(null);

  React.useEffect(() => {
    localStorage.setItem('contractListDisplayUnit', displayUnit);
  }, [displayUnit]);

  // Cleanup Blob URL when unmounting
  React.useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  // Close action menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Quản Lý Hợp Đồng & Nhập Liệu
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Nhấn vào bất kỳ dòng hợp đồng nào để mở <strong className="text-primary font-semibold">Chi tiết hợp đồng</strong>. Thống kê chi trả trong kỳ <span className="text-success font-semibold">{periodLabel}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('contracts')}
            className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-success hover:text-success/90 text-xs font-semibold border border-border transition cursor-pointer flex items-center gap-1.5"
          >
            📥 Import Excel HĐ
          </button>
          <button
            onClick={onNewContract}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> + Thêm Hợp Đồng Mới
          </button>
        </div>
      </div>

      
      {/* --- DASHBOARD SECTION --- */}
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="w-4 h-4" /> <span className="text-xs font-semibold uppercase">Tổng số hợp đồng</span></div>
          <div className="text-xl font-bold text-foreground">{kpiTotalContracts}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Building2 className="w-4 h-4 text-primary" /> <span className="text-xs font-semibold uppercase">Tổng giá trị HĐ</span></div>
          <div className="text-xl font-bold text-primary font-mono">{formatVND(kpiTotalValue)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Activity className="w-4 h-4 text-success" /> <span className="text-xs font-semibold uppercase">Đang thực hiện</span></div>
          <div className="text-xl font-bold text-success">{kpiInProgress} <span className="text-xs text-muted-foreground font-normal">hợp đồng</span></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle className="w-4 h-4 text-primary/80" /> <span className="text-xs font-semibold uppercase">Đã quyết toán</span></div>
          <div className="text-xl font-bold text-primary/80">{kpiSettled} <span className="text-xs text-muted-foreground font-normal">hợp đồng</span></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertCircle className="w-4 h-4 text-destructive" /> <span className="text-xs font-semibold uppercase">Quá hạn</span></div>
          <div className="text-xl font-bold text-destructive">{kpiOverdue} <span className="text-xs text-muted-foreground font-normal">hợp đồng</span></div>
        </div>
      </div>

      {isChartFiltered && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl p-3">
          <div className="text-xs text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Đang áp dụng bộ lọc từ Biểu đồ.
          </div>
          <button onClick={clearChartFilters} className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
            <X className="w-3.5 h-3.5" /> Xóa bộ lọc biểu đồ
          </button>
        </div>
      )}

      {/* 2. Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        
        {/* Chart 1: Cost Group */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl flex flex-col min-h-[320px] h-full">
          <h3 className="text-xs font-bold text-foreground uppercase mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Cơ cấu Giá Trị / Nhóm CP
          </h3>
          <div className="flex-1 w-full">
            {costGroupData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costGroupData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{fill: 'var(--color-muted-foreground)', fontSize: 10}} tickFormatter={v => `${v} Tỷ`} />
                  <YAxis dataKey="name" type="category" width={80} tick={{fill: 'var(--color-foreground)', fontSize: 10}} />
                  <RechartsTooltip cursor={{fill: 'var(--color-muted)'}} contentStyle={{backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', fontSize: '11px'}} formatter={(val) => [`${val} Tỷ`, 'Giá trị']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => setChartCostGroupFilter(chartCostGroupFilter === data.name ? '' : data.name)} className="cursor-pointer hover:opacity-80 transition">
                    {costGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartCostGroupFilter === entry.name ? '#f59e0b' : CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v)=>`${v} Tỷ`} style={{fill: 'var(--color-foreground)', fontSize: '10px'}} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Chart 2: Status */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl flex flex-col min-h-[320px] h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-foreground uppercase flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary/80" /> Cơ Cấu Trạng Thái
            </h3>
            <div className="flex bg-muted p-0.5 rounded-lg shrink-0 ml-2 border border-border">
              <button onClick={() => setStatusChartMetric('count')} className={`px-2 py-1 text-[10px] rounded-md font-semibold transition cursor-pointer ${statusChartMetric === 'count' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Số HĐ</button>
              <button onClick={() => setStatusChartMetric('value')} className={`px-2 py-1 text-[10px] rounded-md font-semibold transition cursor-pointer ${statusChartMetric === 'value' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Giá trị</button>
            </div>
          </div>
          <div className="flex-1 w-full flex items-center justify-between gap-2 mt-2">
            {/* Donut Graphic */}
            <div className="w-[50%] h-full relative min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={statusData} 
                    cx="50%" cy="50%" 
                    innerRadius={55} outerRadius={85} 
                    paddingAngle={2} 
                    dataKey={statusChartMetric}
                    onClick={(data) => setChartStatusFilter(chartStatusFilter === data.name ? '' : data.name)}
                    className="cursor-pointer outline-none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartStatusFilter === entry.name ? '#f59e0b' : (entry.name === 'Đã quyết toán' ? '#06b6d4' : '#3b82f6')} className="hover:opacity-80 transition" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', fontSize: '11px'}} formatter={(val, name, props) => {
                     const total = statusChartMetric === 'count' ? kpiTotalContracts : kpiTotalValue;
                     const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                     return [statusChartMetric === 'count' ? `${val} HĐ (${pct}%)` : `${val} Tỷ (${pct}%)`, statusChartMetric === 'count' ? 'Số lượng' : 'Giá trị'];
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng HĐ</span>
                <span className="text-sm font-bold text-foreground font-mono leading-none mt-0.5">{kpiTotalContracts}</span>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="w-[50%] flex flex-col gap-2 justify-center pl-2">
              {statusData.map((item, idx) => {
                 const pct = kpiTotalContracts > 0 ? ((item.count / kpiTotalContracts) * 100).toFixed(1) : 0;
                 const color = item.name === 'Đã quyết toán' ? '#06b6d4' : '#3b82f6';
                 const isActive = chartStatusFilter === item.name;
                 return (
                   <div 
                     key={item.name} 
                     onClick={() => setChartStatusFilter(chartStatusFilter === item.name ? '' : item.name)}
                     className={`flex flex-col p-1.5 rounded-lg border text-[10px] cursor-pointer transition ${isActive ? 'bg-warning/10 border-warning/50' : 'bg-muted/50 border-border/50 hover:border-border'}`}
                   >
                     <div className="flex items-center justify-between mb-0.5">
                       <div className="flex items-center gap-1.5">
                         <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isActive ? '#f59e0b' : color }}></span>
                         <span className={`font-semibold ${isActive ? 'text-warning' : 'text-foreground/90'}`}>{item.name}</span>
                       </div>
                       <span className="font-mono text-foreground font-bold">{item.count} HĐ</span>
                     </div>
                     <div className="flex items-center justify-between pl-4">
                       <span className="text-muted-foreground">{item.value} tỷ</span>
                       <span className="text-success font-mono font-semibold">{pct}%</span>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: Schedule */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl flex flex-col min-h-[320px] h-full">
          <h3 className="text-xs font-bold text-foreground uppercase mb-3 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-success" /> Tình Trạng Tiến Độ
          </h3>
          <div className="flex-1 w-full flex flex-col justify-between mt-2 gap-2">
            <div className="flex-1 flex items-center justify-between gap-2">
              {/* Donut Graphic */}
              <div className="w-[50%] h-full relative min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={scheduleData} 
                      cx="50%" cy="50%" 
                      innerRadius={55} outerRadius={85} 
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
                      contentStyle={{backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', color: 'var(--color-popover-foreground)', fontSize: '11px'}} 
                      formatter={(val) => {
                        const pct = kpiTotalContracts > 0 ? ((val / kpiTotalContracts) * 100).toFixed(1) : 0;
                        return [`${val} HĐ (${pct}%)`, 'Tiến độ'];
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng HĐ</span>
                  <span className="text-xs font-bold text-foreground font-mono leading-none mt-0.5">{kpiTotalContracts}</span>
                </div>
              </div>
              {/* Custom Legend */}
              <div className="w-[50%] flex flex-col gap-1.5 justify-center pl-2">
                {scheduleData.map((item, idx) => {
                   const pct = kpiTotalContracts > 0 ? ((item.count / kpiTotalContracts) * 100).toFixed(1) : 0;
                   const isActive = chartScheduleFilter === item.name;
                   return (
                     <div 
                       key={item.name} 
                       onClick={() => setChartScheduleFilter(chartScheduleFilter === item.name ? '' : item.name)}
                       className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] cursor-pointer transition ${isActive ? 'bg-destructive/10 border-destructive' : 'bg-muted/50 border-border/50 hover:border-border'}`}
                     >
                       <div className="flex items-center gap-1 min-w-0">
                         <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? '#ec4899' : item.fill }}></span>
                         <span className={`font-semibold truncate ${isActive ? 'text-destructive' : 'text-foreground'}`}>{item.name}</span>
                       </div>
                       <div className="flex items-center gap-1 shrink-0 font-mono">
                         <span className="text-muted-foreground">{item.count}</span>
                         <span className="text-success font-semibold w-7 text-right">{pct}%</span>
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
                   <div className="mt-0.5 pt-1 border-t border-border text-[11px] font-semibold text-destructive flex items-center justify-center gap-1.5 bg-destructive/10 py-1.5 rounded-lg">
                     <AlertTriangle className="w-3.5 h-3.5" /> HĐ cần chú ý: {warningCount}
                   </div>
                 );
               }
               return (
                 <div className="mt-0.5 pt-1 border-t border-border text-[11px] font-semibold text-success flex items-center justify-center gap-1.5 bg-success/10 py-1.5 rounded-lg">
                   <CheckCircle className="w-3.5 h-3.5" /> Không có HĐ cần chú ý
                 </div>
               );
            })()}
          </div>
        </div>

      </div>

      {/* --- END DASHBOARD SECTION --- */}

      {/* Streamlined Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-card border border-border shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo số HĐ, nội dung, nhà thầu, nhóm chi phí..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Contractor Filter */}
          <div className="relative shrink-0">
            <select
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="bg-background border border-border text-foreground rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
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
              className="bg-background border border-border text-foreground rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
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
              className="bg-background border border-border text-foreground rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">-- Tất cả Trạng thái --</option>
              <option value="in_progress">🟢 Đang thực hiện</option>
              <option value="settled">🔵 Đã quyết toán</option>
            </select>
          </div>

          {/* Unit Selector */}
          <div className="relative shrink-0 flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-xl border border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Đơn vị:</span>
            <select
              value={displayUnit}
              onChange={(e) => setDisplayUnit(e.target.value)}
              className="bg-background border border-border text-foreground rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="vnd">Đồng</option>
              <option value="million">Triệu đồng</option>
              <option value="billion">Tỷ đồng</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="relative shrink-0 flex items-center gap-1.5">
            <button
              disabled={exporting === 'excel' || filteredContracts.length === 0}
              onClick={async () => {
                setExporting('excel');
                try {
                  const selectedProj = projects.find(p => String(p.id) === String(selectedProjectId));
                  await exportContractsExcel(filteredContracts, {
                    selectedProjectName: selectedProj?.name || '',
                    contractorFilter,
                    costGroupFilter,
                    statusFilter,
                    displayUnit,
                    periodLabel,
                  }, displayUnit);
                } catch (err) {
                  alert(err.message || 'Không thể xuất báo cáo. Vui lòng thử lại.');
                } finally {
                  setExporting(null);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-success border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'excel' ? 'Đang xuất...' : '📊 Xuất Excel'}
            </button>
            <button
              disabled={exporting === 'pdf_preview' || filteredContracts.length === 0}
              onClick={async () => {
                setExporting('pdf_preview');
                try {
                  const selectedProj = projects.find(p => String(p.id) === String(selectedProjectId));
                  const blob = await exportContractsPdf(filteredContracts, {
                    selectedProjectName: selectedProj?.name || '',
                    contractorFilter,
                    costGroupFilter,
                    statusFilter,
                    displayUnit,
                    periodLabel,
                  }, displayUnit, 'blob');
                  
                  if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
                  
                  const url = URL.createObjectURL(blob);
                  setPreviewPdfBlob(blob);
                  setPreviewPdfUrl(url);
                  setPreviewPdfFilename(`Bao_cao_theo_doi_hop_dong_${new Date().toISOString().slice(0, 10)}.pdf`);
                } catch (err) {
                  console.error(err);
                  alert(err.message || 'Không thể tạo bản xem trước PDF. Vui lòng thử lại.');
                } finally {
                  setExporting(null);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf_preview' ? 'Đang tạo...' : <><Eye className="w-3.5 h-3.5" /> Xem trước PDF</>}
            </button>
            <button
              disabled={exporting === 'pdf_download' || filteredContracts.length === 0}
              onClick={async () => {
                setExporting('pdf_download');
                try {
                  const selectedProj = projects.find(p => String(p.id) === String(selectedProjectId));
                  await exportContractsPdf(filteredContracts, {
                    selectedProjectName: selectedProj?.name || '',
                    contractorFilter,
                    costGroupFilter,
                    statusFilter,
                    displayUnit,
                    periodLabel,
                  }, displayUnit, 'download');
                } catch (err) {
                  alert(err.message || 'Không thể xuất báo cáo. Vui lòng thử lại.');
                } finally {
                  setExporting(null);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-destructive border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf_download' ? 'Đang tạo...' : '📄 Xuất PDF'}
            </button>
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
              className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-warning border border-border text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Đặt lại tìm kiếm
            </button>
          )}

        </div>

        <div className="text-muted-foreground font-mono text-[11px]">
          Hiển thị: <strong className="text-foreground">{filteredContracts.length}</strong> / {contracts.length} HĐ
        </div>
      </div>

      {/* Contracts Data Table */}
      <div className="rounded-2xl bg-card border border-border shadow-xl overflow-hidden flex flex-col relative z-0">
        <div className="overflow-x-auto overflow-y-auto w-full max-h-[70vh] table-responsive-container custom-scrollbar">
          <table className="w-full text-left text-xs text-muted-foreground border-collapse" style={{ minWidth: 'max-content' }}>
            <thead className="text-muted-foreground uppercase text-[11px] font-semibold whitespace-nowrap sticky top-0 z-30 shadow-sm bg-muted">
              <tr>
                <th className="py-3.5 px-4 w-[120px] min-w-[120px] max-w-[120px] sticky left-0 z-40 bg-muted border-b border-border shadow-[1px_0_0_0_var(--color-border)]">Số HĐ / Ngày Ký</th>
                <th className="py-3.5 px-4 w-[240px] min-w-[240px] max-w-[240px] sticky left-[120px] z-40 bg-muted border-b border-border shadow-[1px_0_0_0_var(--color-border)]">Tên HĐ & Nhà Thầu</th>
                <th className="py-3.5 px-4 w-[100px] bg-muted border-b border-border">Nhóm Chi Phí</th>
                <th className="py-3 px-2.5 text-right bg-muted border-b border-border leading-tight">
                  Giá Trị HĐ<br/>
                  <span className="text-[9px] font-mono lowercase opacity-80 inline-block">({displayUnit === 'billion' ? 'tỷ đ' : displayUnit === 'million' ? 'tr đ' : 'vnđ'})</span>
                </th>
                <th className="py-3 px-2.5 text-right bg-muted border-b border-border leading-tight">
                  Chi Trả Kỳ<br/>
                  <span className="text-[9px] font-mono lowercase opacity-80 inline-block">({displayUnit === 'billion' ? 'tỷ đ' : displayUnit === 'million' ? 'tr đ' : 'vnđ'})</span>
                </th>
                <th className="py-3 px-2.5 text-right bg-muted border-b border-border leading-tight">
                  Lũy Kế<br/>
                  <span className="text-[9px] font-mono lowercase opacity-80 inline-block">({displayUnit === 'billion' ? 'tỷ đ' : displayUnit === 'million' ? 'tr đ' : 'vnđ'})</span>
                </th>
                <th className="py-3 px-2.5 text-right bg-muted border-b border-border leading-tight">
                  Còn Lại<br/>
                  <span className="text-[9px] font-mono lowercase opacity-80 inline-block">({displayUnit === 'billion' ? 'tỷ đ' : displayUnit === 'million' ? 'tr đ' : 'vnđ'})</span>
                </th>
                <th className="py-3.5 px-4 text-center bg-muted border-b border-border whitespace-nowrap w-[110px]">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center bg-muted border-b border-border whitespace-nowrap w-[80px]">Thao Tác</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-border/80">
              {filteredContracts.map((c) => {
                const appendicesCount = Array.isArray(c.appendices) ? c.appendices.length : 0;
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => handleRowClick(c.id)}
                    className="hover:bg-muted/50 transition cursor-pointer group"
                    title="Click để xem chi tiết hợp đồng"
                  >
                    
                    {/* Số HĐ / Ngày Ký */}
                    <td className="py-3.5 px-4 font-mono sticky left-0 z-20 bg-card group-hover:bg-muted/50 shadow-[1px_0_0_0_var(--color-border)] align-top whitespace-nowrap overflow-hidden text-ellipsis">
                      <div className="font-bold text-foreground text-xs group-hover:text-primary transition truncate">{c.contract_number}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{formatDisplayDate(c.signing_date)}</div>
                      {appendicesCount > 0 && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold">
                          +{appendicesCount} Phụ lục
                        </span>
                      )}
                    </td>

                    {/* Tên HĐ & Nhà Thầu */}
                    <td 
                      className="py-3.5 px-4 sticky left-[120px] z-20 bg-card group-hover:bg-muted/50 shadow-[1px_0_0_0_var(--color-border)] align-top overflow-hidden text-ellipsis" 
                      title={`${c.content}\nNhà thầu: ${c.contractor || 'Chưa cập nhật'}`}
                    >
                      <div className="font-bold text-foreground text-xs truncate group-hover:text-primary transition">{c.content}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                        <span className="text-foreground/80 font-medium truncate">{c.contractor || 'Chưa cập nhật'}</span>
                        <span className="text-muted-foreground shrink-0">•</span>
                        <span className="text-primary font-semibold shrink-0">{c.projectName}</span>
                      </div>
                    </td>

                    {/* Nhóm Chi Phí */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      {c.costGroup ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary border border-primary/30 inline-block">
                            {c.costGroup}
                          </span>
                          {c.costGroup === 'Khác' && c.costGroupNote && (
                            <span className="text-[10px] text-primary italic font-mono truncate max-w-[120px]" title={c.costGroupNote}>
                              ({c.costGroupNote})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border inline-block font-mono">
                          Chưa phân loại
                        </span>
                      )}
                    </td>

                    {/* Giá trị HĐ sau VAT */}
                    <td className="py-3.5 px-2.5 text-right font-mono font-bold text-foreground whitespace-nowrap align-top">
                      {formatCurrencyByUnit(c.contractValueAfterVAT || c.contract_value, displayUnit)}
                    </td>

                    {/* Chi trả trong kỳ */}
                    <td className="py-3.5 px-2.5 text-right font-mono font-bold text-success bg-success/5 whitespace-nowrap align-top">
                      {formatCurrencyByUnit(c.inPeriodPaidAfterVAT || 0, displayUnit)}
                    </td>

                    {/* Lũy kế đã chi */}
                    <td className="py-3.5 px-2.5 text-right font-mono font-semibold text-primary whitespace-nowrap align-top">
                      {formatCurrencyByUnit(c.totalPaidAfterVAT || c.totalPaid || 0, displayUnit)}
                    </td>

                    {/* Còn lại */}
                    {(() => {
                      const remainingVal = c.remainingAfterVAT || c.remainingValue || 0;
                      const isZeroRemaining = remainingVal <= 0;
                      return (
                        <td className={`py-3.5 px-2.5 text-right font-mono font-medium whitespace-nowrap align-top ${isZeroRemaining ? 'text-success/70' : 'text-warning'}`}>
                          {formatCurrencyByUnit(remainingVal, displayUnit)}
                        </td>
                      );
                    })()}

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap align-top">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${
                        c.status === 'settled'
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-success/10 text-success border-success/30'
                      }`}>
                        {c.status === 'settled' ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center relative whitespace-nowrap align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleRowClick(c.id)}
                          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/30 text-primary border border-primary/20 transition cursor-pointer"
                          title="Xem Chi Tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === c.id ? null : c.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            title="Thêm thao tác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openActionMenuId === c.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(null);
                                  onEditContract(c);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-primary" /> Sửa hợp đồng
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(null);
                                  onDeleteContract(c.id);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted hover:text-destructive transition flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" /> Xóa hợp đồng
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-muted-foreground">
                    Không tìm thấy hợp đồng nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={!!previewPdfUrl}
        pdfUrl={previewPdfUrl}
        filename={previewPdfFilename}
        title="Xem trước Báo cáo Hợp đồng"
        onClose={() => {
          if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
          setPreviewPdfBlob(null);
        }}
        onDownload={() => {
          if (previewPdfBlob && previewPdfFilename) {
            const url = URL.createObjectURL(previewPdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = previewPdfFilename;
            a.click();
            URL.revokeObjectURL(url);
          }
        }}
      />
    </div>
  );
}
