import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  Calendar, 
  FileText, 
  X, 
  AlertTriangle, 
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowRight,
  CheckCircle2
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
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { formatVND, formatDisplayDate, cleanVND, calcEndDate, calcDaysBetween } from '../../utils/formatters';

export default function PaymentsView({ 
  data, 
  selectedProjectId = '',
  setSelectedProjectId,
  onNewPayment, 
  onEditPayment, 
  onDeletePayment,
  onOpenExcelImport,
  globalSearch 
}) {
  const { payments = [], contracts = [], projects = [] } = data;

  const [projectFilter, setProjectFilter] = useState(selectedProjectId || '');
  const [contractFilter, setContractFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  
  // Sort State (Default: payment_date ASC)
  const [sortColumn, setSortColumn] = useState('payment_date');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination State (Default: 100 rows / page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Drawer / Modal for Risk Control Details
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [alertDrawerTab, setAlertDrawerTab] = useState('ALL');

  // Sync projectFilter with selectedProjectId prop
  useEffect(() => {
    setProjectFilter(selectedProjectId || '');
  }, [selectedProjectId]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, contractFilter, contractorFilter, fromDate, toDate, localSearch]);

  // Unique contractors list for filter dropdown
  const uniqueContractors = Array.from(
    new Set(contracts.map(c => c.contractor).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // SECTION XIV: CALCULATE PER-CONTRACT CUMULATIVE MAP ACROSS ENTIRE DATABASE
  // Group payments by contract_id, sort chronologically, sum cumulative, reset sum when switching contracts!
  const paymentsByContract = {};
  payments.forEach(pm => {
    if (!paymentsByContract[pm.contract_id]) {
      paymentsByContract[pm.contract_id] = [];
    }
    paymentsByContract[pm.contract_id].push(pm);
  });

  const perContractCumulativeMap = {};

  Object.keys(paymentsByContract).forEach(cId => {
    const cPayments = paymentsByContract[cId].sort((a, b) => {
      const d1 = a.payment_date || '1970-01-01';
      const d2 = b.payment_date || '1970-01-01';
      if (d1 !== d2) return d1.localeCompare(d2);
      return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
    });

    let runningContractSum = 0;
    cPayments.forEach(pm => {
      const beforeVAT = cleanVND(pm.amount_before_vat);
      const vatRate = Number(pm.vat_rate || 0);
      const vatAmount = cleanVND(pm.vat_amount !== undefined ? pm.vat_amount : (beforeVAT * vatRate / 100));
      const afterVAT = cleanVND(pm.amount_after_vat !== undefined ? pm.amount_after_vat : (beforeVAT + vatAmount));

      runningContractSum = cleanVND(runningContractSum + afterVAT);
      perContractCumulativeMap[pm.id] = runningContractSum;
    });
  });

  // Enrich payments with project, contract & cumulative info
  const enrichedPayments = payments.map(pm => {
    const contract = contracts.find(c => c.id === pm.contract_id);
    const project = contract ? projects.find(p => p.id === contract.project_id) : null;
    const beforeVAT = cleanVND(pm.amount_before_vat);
    const vatRate = Number(pm.vat_rate || 0);
    const vatAmount = cleanVND(pm.vat_amount !== undefined ? pm.vat_amount : (beforeVAT * vatRate / 100));
    const afterVAT = cleanVND(pm.amount_after_vat !== undefined ? pm.amount_after_vat : (beforeVAT + vatAmount));

    return {
      ...pm,
      amount_before_vat: beforeVAT,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_after_vat: afterVAT,
      cumulativeAfterVat: perContractCumulativeMap[pm.id] || afterVAT,
      contractNumber: contract ? contract.contract_number : 'N/A',
      contractor: contract ? contract.contractor : 'Chưa xác định',
      projectName: project ? project.name : 'N/A',
      projectId: contract ? contract.project_id : null,
    };
  });

  // COMBINED FILTERING
  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  const filteredPayments = enrichedPayments.filter(pm => {
    if (projectFilter && pm.projectId !== projectFilter) return false;
    if (contractFilter && pm.contract_id !== contractFilter) return false;
    if (contractorFilter && pm.contractor !== contractorFilter) return false;

    const pmDate = pm.payment_date || '';
    if (fromDate && pmDate < fromDate) return false;
    if (toDate && pmDate > toDate) return false;

    if (searchQuery) {
      const matchNum = pm.contractNumber?.toLowerCase().includes(searchQuery);
      const matchContractor = pm.contractor?.toLowerCase().includes(searchQuery);
      const matchProject = pm.projectName?.toLowerCase().includes(searchQuery);
      const matchNote = pm.note?.toLowerCase().includes(searchQuery);
      const matchPhase = `đợt ${pm.payment_phase}`.includes(searchQuery);
      return matchNum || matchContractor || matchProject || matchNote || matchPhase;
    }
    return true;
  });

  // SORTING MECHANISM
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let valA = a[sortColumn];
    let valB = b[sortColumn];

    if (sortColumn === 'contractNumber') {
      valA = a.contractNumber || '';
      valB = b.contractNumber || '';
    } else if (sortColumn === 'contractor') {
      valA = a.contractor || '';
      valB = b.contractor || '';
    } else if (sortColumn === 'payment_phase') {
      valA = Number(a.payment_phase || 0);
      valB = Number(b.payment_phase || 0);
    } else if (sortColumn === 'payment_date') {
      valA = a.payment_date || '1970-01-01';
      valB = b.payment_date || '1970-01-01';
    } else if (sortColumn === 'amount_before_vat') {
      valA = cleanVND(a.amount_before_vat);
      valB = cleanVND(b.amount_before_vat);
    } else if (sortColumn === 'amount_after_vat') {
      valA = cleanVND(a.amount_after_vat);
      valB = cleanVND(b.amount_after_vat);
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;

    const d1 = a.payment_date || '';
    const d2 = b.payment_date || '';
    if (d1 !== d2) return d1.localeCompare(d2);
    return String(a.id).localeCompare(String(b.id));
  });

  // DYNAMIC KPI RE-CALCULATION BASED ON FILTERED SUBSET
  const totalCount = filteredPayments.length;
  const totalBeforeVat = filteredPayments.reduce((sum, p) => sum + cleanVND(p.amount_before_vat), 0);
  const totalVat = filteredPayments.reduce((sum, p) => sum + cleanVND(p.vat_amount), 0);
  const totalAfterVat = filteredPayments.reduce((sum, p) => sum + cleanVND(p.amount_after_vat), 0);

  // PAGINATION CALCULATION
  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedPayments.length);
  const paginatedPayments = sortedPayments.slice(startIndex, endIndex);

  // DETAILED RISK ALERTS GENERATION
  const todayStr = new Date().toISOString().split('T')[0];
  const allAlertItems = [];

  contracts.forEach(c => {
    const cPayments = payments.filter(p => p.contract_id === c.id);
    const totalPaid = cPayments.reduce((s, p) => s + cleanVND(p.amount_after_vat), 0);
    const currentVal = cleanVND(c.contractValueAfterVAT || c.contract_value || 0);
    const excessVal = cleanVND(totalPaid - currentVal);

    const signingDate = c.signing_date || '';
    const executionDays = Number(c.execution_days || 0);
    const exactEndDate = signingDate && executionDays > 0 ? calcEndDate(signingDate, executionDays) : (c.end_date || '');

    // A. THANH TOÁN VƯỢT GIÁ TRỊ HỢP ĐỒNG (NO ALERT WHEN excessVal <= 0!)
    if (currentVal > 0 && excessVal > 0) {
      allAlertItems.push({
        id: `over_val_${c.id}`,
        type: 'EXCEED_VALUE',
        level: 'danger',
        badge: '🔴 Vượt giá trị HĐ',
        contractNumber: c.contract_number,
        contractor: c.contractor,
        title: `🔴 ${c.contract_number}: Thanh toán vượt giá trị hợp đồng`,
        totalPaid,
        currentVal,
        excessVal,
        paymentCount: cPayments.length,
        desc: `Đã thanh toán ${formatVND(totalPaid)} vượt Giá trị HĐ (${formatVND(currentVal)}) một khoản ${formatVND(excessVal)}!`
      });
    }

    // B. HỢP ĐỒNG QUÁ HẠN CHƯA QUYẾT TOÁN
    if (exactEndDate && todayStr > exactEndDate && c.status !== 'settled') {
      const daysOverdue = calcDaysBetween(exactEndDate, todayStr);
      const remainingVal = Math.max(0, cleanVND(currentVal - totalPaid));
      allAlertItems.push({
        id: `overdue_${c.id}`,
        type: 'OVERDUE',
        level: 'warning',
        badge: '🟡 Quá hạn chưa quyết toán',
        contractNumber: c.contract_number,
        contractor: c.contractor,
        title: `🟡 ${c.contract_number}: Hợp đồng đã quá hạn nhưng chưa quyết toán`,
        exactEndDate,
        daysOverdue,
        currentVal,
        totalPaid,
        remainingVal,
        desc: `Ngày hết hạn ${formatDisplayDate(exactEndDate)} đã quá hạn ${daysOverdue} ngày (Còn phải trả ${formatVND(remainingVal)}).`
      });
    }

    // C. THANH TOÁN PHÁT SINH SAU NGÀY HẾT HẠN
    if (exactEndDate) {
      cPayments.forEach(pm => {
        if (pm.payment_date && pm.payment_date > exactEndDate) {
          const daysAfter = calcDaysBetween(exactEndDate, pm.payment_date);
          allAlertItems.push({
            id: `post_date_${pm.id}`,
            type: 'POST_EXPIRATION',
            level: 'warning',
            badge: '🟠 Chi sau ngày hết hạn',
            contractNumber: c.contract_number,
            contractor: c.contractor,
            title: `🟠 ${c.contract_number}: Thanh toán đợt ${pm.payment_phase} phát sinh sau thời hạn hợp đồng`,
            paymentPhase: pm.payment_phase,
            paymentDate: pm.payment_date,
            exactEndDate,
            daysAfter,
            amount: cleanVND(pm.amount_after_vat),
            desc: `Đợt thanh toán ${formatVND(pm.amount_after_vat)} thực hiện ngày ${formatDisplayDate(pm.payment_date)}, trễ ${daysAfter} ngày so với mốc hết hạn ${formatDisplayDate(exactEndDate)}.`
          });
        }
      });
    }

    // D. HỢP ĐỒNG THANH TOÁN TRÊN 90% GIÁ TRỊ
    if (currentVal > 0 && totalPaid <= currentVal) {
      const paidRatio = (totalPaid / currentVal) * 100;
      if (paidRatio >= 90) {
        const remainingVal = Math.max(0, cleanVND(currentVal - totalPaid));
        allAlertItems.push({
          id: `ratio_90_${c.id}`,
          type: 'HIGH_RATIO',
          level: 'info',
          badge: '🔵 Giải ngân > 90%',
          contractNumber: c.contract_number,
          contractor: c.contractor,
          title: `🔵 ${c.contract_number}: Hợp đồng đã thanh toán ${paidRatio.toFixed(1)}% giá trị`,
          paidRatio,
          currentVal,
          totalPaid,
          remainingVal,
          desc: `Đã giải ngân ${formatVND(totalPaid)} / ${formatVND(currentVal)} (Tỷ lệ ${paidRatio.toFixed(1)}%, còn ${formatVND(remainingVal)}).`
        });
      }
    }
  });

  // Summary Counts
  const countExceedValue = allAlertItems.filter(i => i.type === 'EXCEED_VALUE').length;
  const countOverdue = allAlertItems.filter(i => i.type === 'OVERDUE').length;
  const countPostExpiration = allAlertItems.filter(i => i.type === 'POST_EXPIRATION').length;
  const countHighRatio = allAlertItems.filter(i => i.type === 'HIGH_RATIO').length;

  const drawerAlertItems = allAlertItems.filter(item => {
    if (alertDrawerTab === 'EXCEED_VALUE') return item.type === 'EXCEED_VALUE';
    if (alertDrawerTab === 'OVERDUE') return item.type === 'OVERDUE';
    if (alertDrawerTab === 'POST_EXPIRATION') return item.type === 'POST_EXPIRATION';
    if (alertDrawerTab === 'HIGH_RATIO') return item.type === 'HIGH_RATIO';
    return true;
  });

  // CHARTS DATA PREPARATION (Placed below table!)
  const chartDataCumulative = sortedPayments.map(pm => ({
    name: pm.contractNumber,
    date: formatDisplayDate(pm.payment_date),
    phase: typeof pm.payment_phase === 'number' ? `Đợt ${pm.payment_phase}` : pm.payment_phase,
    cumulative: pm.cumulativeAfterVat,
    amount: pm.amount_after_vat,
  }));

  const grandContractValue = contracts.reduce((sum, c) => sum + cleanVND(c.contractValueAfterVAT || c.contract_value || 0), 0);
  const grandTotalPaid = payments.reduce((sum, p) => sum + cleanVND(p.amount_after_vat), 0);
  const grandRemaining = Math.max(0, cleanVND(grandContractValue - grandTotalPaid));

  const pieDataStructure = [
    { name: 'Đã thanh toán', value: grandTotalPaid, color: '#10b981' },
    { name: 'Còn lại phải trả', value: grandRemaining, color: '#f59e0b' },
  ];

  const monthlyDisbursementMap = {};
  sortedPayments.forEach(pm => {
    const monthKey = pm.payment_date ? pm.payment_date.substring(0, 7) : 'Chưa ngày';
    monthlyDisbursementMap[monthKey] = cleanVND((monthlyDisbursementMap[monthKey] || 0) + pm.amount_after_vat);
  });

  const barDataMonthly = Object.keys(monthlyDisbursementMap)
    .sort()
    .map(mKey => ({
      month: mKey === 'Chưa ngày' ? 'Khác' : `T${mKey.split('-')[1]}/${mKey.split('-')[0]}`,
      amount: monthlyDisbursementMap[mKey],
    }));

  const handleResetFilters = () => {
    setProjectFilter('');
    setContractFilter('');
    setContractorFilter('');
    setFromDate('');
    setToDate('');
    setLocalSearch('');
    setSortColumn('payment_date');
    setSortDirection('asc');
    setCurrentPage(1);
    if (setSelectedProjectId) {
      setSelectedProjectId('');
    }
  };

  const handleSortToggle = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 inline-block ml-1" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-emerald-400 inline-block ml-1" />
      : <ArrowDown className="w-3 h-3 text-emerald-400 inline-block ml-1" />;
  };

  const isAnyFilterActive = Boolean(
    projectFilter || contractFilter || contractorFilter || fromDate || toDate || localSearch
  );

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* 1. HEADER COMPACT (~64px height - Section 1) */}
      <div className="py-3 px-5 rounded-xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              QUẢN LÝ THANH TOÁN TỪNG ĐỢT
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              <span className="font-bold text-emerald-400">{totalCount}</span> lượt phát sinh · <span className="font-bold text-white">{formatVND(totalAfterVat)}</span> sau VAT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('payments')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            title="Import Excel"
          >
            📥 Import Excel
          </button>
          <button
            onClick={onNewPayment}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Nhập Thanh Toán Mới
          </button>
        </div>
      </div>

      {/* 2. KPI COMPACT DASHBOARD (~70px height - Section 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* KPI 1: TỔNG LƯỢT THANH TOÁN */}
        <div className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">1. LƯỢT THANH TOÁN</span>
            <div className="text-base font-extrabold text-white font-mono mt-0.5">{totalCount} lượt</div>
          </div>
          <Layers className="w-5 h-5 text-blue-400 opacity-60" />
        </div>

        {/* KPI 2: ĐÃ THANH TOÁN TRƯỚC VAT */}
        <div className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">2. TRƯỚC VAT</span>
            <div className="text-base font-extrabold text-slate-200 font-mono mt-0.5">{formatVND(totalBeforeVat)}</div>
          </div>
        </div>

        {/* KPI 3: TIỀN THUẾ VAT */}
        <div className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">3. TIỀN THUẾ VAT</span>
            <div className="text-base font-extrabold text-blue-400 font-mono mt-0.5">{formatVND(totalVat)}</div>
          </div>
        </div>

        {/* KPI 4: TỔNG ĐÃ THANH TOÁN SAU VAT (HIGHLIGHTED GREEN) */}
        <div className="py-2.5 px-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase block">4. SAU VAT (TỔNG CHÍNH)</span>
            <div className="text-base font-black text-emerald-300 font-mono mt-0.5">{formatVND(totalAfterVat)}</div>
          </div>
        </div>

      </div>

      {/* 3. CẢNH BÁO COMPACT TOOLBAR (~50px height - Section 3 & 4) */}
      <div className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>CẢNH BÁO & KIỂM SOÁT</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-mono border border-slate-700">
              {allAlertItems.length} ghi nhận
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />

          {/* Inline Clickable Risk Counters */}
          <div className="flex items-center gap-3 text-[11px]">
            <button 
              onClick={() => { setAlertDrawerTab('EXCEED_VALUE'); setIsAlertDrawerOpen(true); }}
              className="hover:underline font-mono text-slate-300 transition"
            >
              <span className={countExceedValue > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                🔴 Vượt giá trị HĐ: {countExceedValue} HĐ
              </span>
            </button>

            <button 
              onClick={() => { setAlertDrawerTab('OVERDUE'); setIsAlertDrawerOpen(true); }}
              className="hover:underline font-mono text-slate-300 transition"
            >
              <span className={countOverdue > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                🟡 Quá hạn chưa quyết toán: {countOverdue} HĐ
              </span>
            </button>

            <button 
              onClick={() => { setAlertDrawerTab('POST_EXPIRATION'); setIsAlertDrawerOpen(true); }}
              className="hover:underline font-mono text-slate-300 transition"
            >
              <span className={countPostExpiration > 0 ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                🟠 Chi sau hết hạn: {countPostExpiration} đợt
              </span>
            </button>

            <button 
              onClick={() => { setAlertDrawerTab('HIGH_RATIO'); setIsAlertDrawerOpen(true); }}
              className="hover:underline font-mono text-slate-300 transition"
            >
              <span className={countHighRatio > 0 ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                🔵 Giải ngân &gt; 90%: {countHighRatio} HĐ
              </span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsAlertDrawerOpen(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer self-end md:self-auto shrink-0"
        >
          <span>Xem tất cả cảnh báo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. BỘ LỌC COMPACT (~60px height - Section 5) */}
      <div className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs items-center">
          
          {/* Filter 1: Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="🔎 Tìm số HĐ, nhà thầu..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Filter 2: Project */}
          <div>
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setContractFilter('');
                if (setSelectedProjectId) setSelectedProjectId(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
            >
              <option value="">Tất cả Dự án ▼</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Contract */}
          <div>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-mono"
            >
              <option value="">Tất cả Hợp đồng ▼</option>
              {contracts
                .filter(c => !projectFilter || c.project_id === projectFilter)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.contract_number}</option>
                ))
              }
            </select>
          </div>

          {/* Filter 4: Contractor */}
          <div>
            <select
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
            >
              <option value="">Tất cả Nhà thầu ▼</option>
              {uniqueContractors.map((ctor, i) => (
                <option key={i} value={ctor}>{ctor}</option>
              ))}
            </select>
          </div>

          {/* Filter 5: From Date */}
          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              title="Từ ngày thanh toán"
              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Filter 6: To Date */}
          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="Đến ngày thanh toán"
              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Filter 7: Reset Button */}
          <div>
            <button
              onClick={handleResetFilters}
              disabled={!isAnyFilterActive}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                isAnyFilterActive
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> ↻ Đặt lại
            </button>
          </div>

        </div>
      </div>

      {/* 6. BẢNG THANH TOÁN (Xuất hiện sớm trên màn hình - Section 6 & 7) */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        
        {/* Table Header Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
          <div className="text-xs text-slate-400 font-mono">
            Hiển thị: <span className="font-bold text-white">{sortedPayments.length > 0 ? `${startIndex + 1}-${endIndex}` : '0'}</span> / <span className="font-bold text-emerald-400">{sortedPayments.length}</span> lượt phát sinh
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Xem mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
              <option value={200}>200 / trang</option>
            </select>
          </div>
        </div>

        {/* 11 Columns Standard Table */}
        <div className="overflow-x-auto w-full border border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-left text-xs text-slate-300 min-w-[1050px]">
            <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th 
                  onClick={() => handleSortToggle('contractNumber')}
                  className="py-3 px-4 min-w-[160px] cursor-pointer select-none hover:text-white transition"
                >
                  HỢP ĐỒNG {renderSortIcon('contractNumber')}
                </th>

                <th 
                  onClick={() => handleSortToggle('contractor')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-white transition"
                >
                  NHÀ THẦU {renderSortIcon('contractor')}
                </th>

                <th 
                  onClick={() => handleSortToggle('payment_phase')}
                  className="py-3 px-3 text-center cursor-pointer select-none hover:text-white transition"
                >
                  ĐỢT / LOẠI THANH TOÁN {renderSortIcon('payment_phase')}
                </th>

                <th 
                  onClick={() => handleSortToggle('payment_date')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-white transition"
                >
                  NGÀY THANH TOÁN {renderSortIcon('payment_date')}
                </th>

                <th 
                  onClick={() => handleSortToggle('amount_before_vat')}
                  className="py-3 px-3 text-right cursor-pointer select-none hover:text-white transition"
                >
                  TRƯỚC VAT {renderSortIcon('amount_before_vat')}
                </th>

                <th className="py-3 px-3 text-center">
                  VAT
                </th>

                <th className="py-3 px-3 text-right">
                  TIỀN VAT
                </th>

                <th 
                  onClick={() => handleSortToggle('amount_after_vat')}
                  className="py-3 px-3 text-right font-bold text-emerald-400 cursor-pointer select-none hover:text-emerald-300 transition"
                >
                  SAU VAT {renderSortIcon('amount_after_vat')}
                </th>

                <th className="py-3 px-3 text-right font-bold text-cyan-300">
                  LŨY KẾ SAU VAT
                </th>

                <th className="py-3 px-3">
                  GHI CHÚ
                </th>

                <th className="py-3 px-3 text-center">
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {paginatedPayments.map((pm) => {
                const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT';
                return (
                  <tr key={pm.id} className="hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                      {pm.contractNumber}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-200 max-w-xs truncate">
                      {pm.contractor}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold">
                      {isSettlementPhase ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold text-[11px] inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Quyết toán
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono font-bold">
                          Đợt {pm.payment_phase}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300">
                      {formatDisplayDate(pm.payment_date)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-200">
                      {formatVND(pm.amount_before_vat)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/30 text-[11px]">
                        {pm.vat_rate}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {formatVND(pm.vat_amount)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-xs bg-emerald-500/5">
                      {formatVND(pm.amount_after_vat)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300 text-xs bg-slate-950/60">
                      {formatVND(pm.cumulativeAfterVat)}
                    </td>

                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {pm.note || '---'}
                    </td>

                    <td className="py-3 px-3 text-center">
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
                            if (window.confirm(`Xóa đợt thanh toán ${pm.payment_phase} của HĐ ${pm.contractNumber}?`)) {
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

              {paginatedPayments.length === 0 && (
                <tr>
                  <td colSpan="11" className="py-10 text-center text-slate-400">
                    Không tìm thấy đợt thanh toán nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Summary Row */}
            {sortedPayments.length > 0 && (
              <tfoot className="bg-slate-900/90 font-bold border-t border-slate-700 text-slate-200">
                <tr>
                  <td colSpan="4" className="py-2.5 px-4 uppercase text-[11px] text-slate-400 font-sans">
                    TỔNG CỘNG PHÁT SINH ({sortedPayments.length} đợt)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatVND(totalBeforeVat)}</td>
                  <td className="py-2.5 px-3 text-center text-slate-500">---</td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-400">{formatVND(totalVat)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-sm bg-emerald-500/10">{formatVND(totalAfterVat)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-cyan-400 text-sm bg-slate-950 font-sans text-[10px] text-slate-500">
                    Lũy kế theo HĐ
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
            <div className="text-slate-400 font-mono">
              Hiển thị <span className="text-white font-bold">{startIndex + 1}-{endIndex}</span> / <span className="text-emerald-400 font-bold">{sortedPayments.length}</span> lượt phát sinh
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2 font-mono">
                <span className="font-bold text-white">{safePage}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{totalPages}</span>
              </div>

              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* CHARTS & ANALYSIS (Placed BELOW table!) */}
      <div className="space-y-6 pt-4">
        
        {/* Row 1: Line Chart Cumulative Disbursement */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              1. LŨY KẾ THANH TOÁN THEO THỜI GIAN
            </h3>
            <span className="text-xs text-slate-400 font-mono">Phân tích dòng tiền lũy kế</span>
          </div>

          {chartDataCumulative.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataCumulative} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumulativePaymentsViewCompact" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(value) => [formatVND(value), 'Lũy kế sau VAT']}
                    labelFormatter={(label, items) => `${items[0]?.payload?.name || ''} (${items[0]?.payload?.phase || ''}) - Ngày ${label}`}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulativePaymentsViewCompact)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
              Không có dữ liệu thanh toán phù hợp để hiển thị biểu đồ.
            </div>
          )}
        </div>

        {/* Row 2: Donut Chart + Monthly Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Donut Chart: Cơ cấu giá trị */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-blue-400" />
              2. CƠ CẤU GIÁ TRỊ HỢP ĐỒNG
            </h3>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataStructure}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieDataStructure.map((entry, index) => (
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
                <span className="text-[10px] text-slate-400">Đã chi</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {grandContractValue > 0 ? ((grandTotalPaid / grandContractValue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đã thanh toán:
                </span>
                <span className="font-mono font-bold text-emerald-400">{formatVND(grandTotalPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Còn lại phải trả:
                </span>
                <span className="font-mono font-bold text-amber-400">{formatVND(grandRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Bar Chart: Thanh toán theo tháng */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                3. GIẢI NGÂN THANH TOÁN THEO THÁNG
              </h3>
              <span className="text-xs text-slate-400 font-mono">Thống kê từng tháng</span>
            </div>

            {barDataMonthly.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataMonthly} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11}
                      tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(value) => [formatVND(value), 'Thanh toán sau VAT']}
                    />
                    <Bar dataKey="amount" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
                Chưa có dữ liệu thanh toán theo tháng.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* DRAWER / MODAL CẢNH BÁO CHI TIẾT */}
      {isAlertDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full shadow-2xl flex flex-col">
            
            {/* Drawer Header */}
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Hệ Thống Cảnh Báo & Kiểm Soát Rủi Ro</h3>
                  <p className="text-xs text-slate-400">Danh sách tổng hợp các ghi nhận bất thường tài chính & tiến độ</p>
                </div>
              </div>

              <button 
                onClick={() => setIsAlertDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Filter Tabs */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setAlertDrawerTab('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  alertDrawerTab === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({allAlertItems.length})
              </button>

              <button
                onClick={() => setAlertDrawerTab('EXCEED_VALUE')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  alertDrawerTab === 'EXCEED_VALUE' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-rose-300 hover:text-white'
                }`}
              >
                🔴 Vượt giá trị ({countExceedValue})
              </button>

              <button
                onClick={() => setAlertDrawerTab('OVERDUE')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  alertDrawerTab === 'OVERDUE' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-amber-300 hover:text-white'
                }`}
              >
                🟡 Quá hạn chưa QT ({countOverdue})
              </button>

              <button
                onClick={() => setAlertDrawerTab('POST_EXPIRATION')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  alertDrawerTab === 'POST_EXPIRATION' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-800 text-orange-300 hover:text-white'
                }`}
              >
                🟠 Chi sau hết hạn ({countPostExpiration})
              </button>

              <button
                onClick={() => setAlertDrawerTab('HIGH_RATIO')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  alertDrawerTab === 'HIGH_RATIO' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-blue-300 hover:text-white'
                }`}
              >
                🔵 Giải ngân &gt; 90% ({countHighRatio})
              </button>
            </div>

            {/* Drawer Body Items List */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {drawerAlertItems.map((item) => (
                <div 
                  key={item.id}
                  className={`p-4 rounded-xl border shadow-md space-y-2 ${
                    item.level === 'danger'
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                      : item.level === 'warning'
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                      : 'bg-blue-950/30 border-blue-500/50 text-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{item.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                      item.level === 'danger'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : item.level === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{item.desc}</p>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>Nhà thầu: <span className="text-white font-sans">{item.contractor}</span></div>
                    {item.currentVal !== undefined && (
                      <div>Giá trị HĐ: <span className="text-white">{formatVND(item.currentVal)}</span></div>
                    )}
                    {item.totalPaid !== undefined && (
                      <div>Đã thanh toán: <span className="text-emerald-400">{formatVND(item.totalPaid)}</span></div>
                    )}
                    {item.excessVal !== undefined && (
                      <div className="text-rose-400 font-bold">Vượt: +{formatVND(item.excessVal)}</div>
                    )}
                    {item.daysOverdue !== undefined && (
                      <div className="text-amber-400 font-bold">Quá hạn: {item.daysOverdue} ngày</div>
                    )}
                    {item.daysAfter !== undefined && (
                      <div className="text-orange-400 font-bold">Trễ: {item.daysAfter} ngày</div>
                    )}
                  </div>
                </div>
              ))}

              {drawerAlertItems.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="font-semibold text-white">Không ghi nhận bất thường nào thuộc nhóm này.</p>
                  <p className="text-xs text-slate-500">Tất cả dữ liệu hợp đồng đều nằm trong hạn định & ngân sách cho phép.</p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Tổng số: {drawerAlertItems.length} mục</span>
              <button
                onClick={() => setIsAlertDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
              >
                Đóng Cửa Sổ Cảnh Báo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
