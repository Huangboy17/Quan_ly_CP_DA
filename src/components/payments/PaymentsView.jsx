import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  RotateCcw, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Building2, 
  FileText, 
  X, 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  Layers, 
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  LabelList,
  ReferenceLine,
  Legend
} from 'recharts';
import { formatVND, formatVNDCompact, formatDisplayDate, cleanVND, calcEndDate, calcDaysBetween } from '../../utils/formatters';

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
  const { 
    payments = [], 
    contracts = [], 
    projects = [], 
    filteredPayments: centralFilteredPayments = [],
    inPeriodPayments = [], 
    periodLabel = 'Tất cả thời gian',
    timeFilter = {} 
  } = data;

  const [contractFilter, setContractFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
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

  // Check if a time scope filter (Year, Quarter, Month, Custom Date Range) is active on Global Header
  const isTimeRangeFilterActive = Boolean(
    (timeFilter.year && timeFilter.year !== 'all') ||
    (timeFilter.quarter && timeFilter.quarter !== 'all') ||
    (timeFilter.month && timeFilter.month !== 'all') ||
    timeFilter.customStartDate ||
    timeFilter.customEndDate
  );

  // Single Source of Truth Base Payments list
  const basePaymentsList = useMemo(() => {
    if (centralFilteredPayments && centralFilteredPayments.length > 0) {
      return centralFilteredPayments;
    }
    if (isTimeRangeFilterActive) {
      return inPeriodPayments;
    }
    return payments;
  }, [centralFilteredPayments, isTimeRangeFilterActive, inPeriodPayments, payments]);

  // Reset page & local contract filter when selectedProjectId or timeFilter changes on Global Header
  useEffect(() => {
    setCurrentPage(1);
    setContractFilter('');
  }, [selectedProjectId, timeFilter]);

  // Unique contractors list for filter dropdown
  const uniqueContractors = useMemo(() => {
    return Array.from(
      new Set(contracts.map(c => c.contractor).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [contracts]);

  // CALCULATE PER-CONTRACT CUMULATIVE MAP ACROSS ENTIRE DATABASE (FOR HISTORICAL ACCURACY)
  const perContractCumulativeMap = useMemo(() => {
    const paymentsByContract = {};
    payments.forEach(pm => {
      if (!paymentsByContract[pm.contract_id]) {
        paymentsByContract[pm.contract_id] = [];
      }
      paymentsByContract[pm.contract_id].push(pm);
    });

    const cumulativeMap = {};

    Object.keys(paymentsByContract).forEach(cId => {
      const cPayments = paymentsByContract[cId].sort((a, b) => {
        const d1 = a.payment_date || '1970-01-01';
        const d2 = b.payment_date || '1970-01-01';
        if (d1 !== d2) return d1.localeCompare(d2);
        return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
      });

      let runningContractSum = 0;
      cPayments.forEach(pm => {
        const amt = cleanVND(pm.amount_after_vat || (cleanVND(pm.amount_before_vat) + cleanVND(pm.vat_amount)));
        runningContractSum += amt;
        cumulativeMap[pm.id] = runningContractSum;
      });
    });

    return cumulativeMap;
  }, [payments]);

  // Enrich payments with project, contract & cumulative info
  const enrichedBasePayments = useMemo(() => {
    return basePaymentsList.map(pm => {
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
  }, [basePaymentsList, contracts, projects, perContractCumulativeMap]);

  // COMBINED FILTERING (Filtered by Global selectedProjectId + Local filters + Global Search)
  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  const filteredPayments = useMemo(() => {
    return enrichedBasePayments.filter(pm => {
      if (selectedProjectId && String(pm.projectId) !== String(selectedProjectId)) return false;
      if (contractFilter && String(pm.contract_id) !== String(contractFilter)) return false;
      if (contractorFilter && pm.contractor !== contractorFilter) return false;

      if (searchQuery) {
        const matchNum = pm.contractNumber?.toLowerCase().includes(searchQuery);
        const matchNote = pm.note?.toLowerCase().includes(searchQuery);
        const matchContractor = pm.contractor?.toLowerCase().includes(searchQuery);
        const matchProject = pm.projectName?.toLowerCase().includes(searchQuery);
        return matchNum || matchNote || matchContractor || matchProject;
      }
      return true;
    });
  }, [enrichedBasePayments, selectedProjectId, contractFilter, contractorFilter, searchQuery]);

  // CHRONOLOGICAL SORTING & SECONDARY SORT
  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (sortColumn === 'payment_date') {
        valA = valA || '1970-01-01';
        valB = valB || '1970-01-01';
        if (valA !== valB) {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        // Secondary sort: payment_phase
        return sortDirection === 'asc' 
          ? Number(a.payment_phase || 0) - Number(b.payment_phase || 0)
          : Number(b.payment_phase || 0) - Number(a.payment_phase || 0);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = (valA || '').toString().toLowerCase();
      const strB = (valB || '').toString().toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredPayments, sortColumn, sortDirection]);

  // PAGINATION
  const totalPages = Math.ceil(sortedPayments.length / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPayments.slice(start, start + pageSize);
  }, [sortedPayments, currentPage, pageSize]);

  // KPI STATS (Calculated over sortedPayments)
  const kpiStats = useMemo(() => {
    const totalTransactions = sortedPayments.length;
    const sumBeforeVAT = sortedPayments.reduce((sum, p) => sum + cleanVND(p.amount_before_vat), 0);
    const sumVAT = sortedPayments.reduce((sum, p) => sum + cleanVND(p.vat_amount), 0);
    const sumAfterVAT = sortedPayments.reduce((sum, p) => sum + cleanVND(p.amount_after_vat), 0);

    return {
      totalTransactions,
      sumBeforeVAT,
      sumVAT,
      sumAfterVAT,
    };
  }, [sortedPayments]);

  // RECHARTS COMBO DATA PREPARATION (Bar for Monthly Disbursement + Line for Cumulative + Avg Reference Line)
  const { comboMonthlyBarData, avgMonthlyDisbursementInPayments } = useMemo(() => {
    const monthlyMap = {};
    sortedPayments.forEach(pm => {
      if (!pm.payment_date) return;
      const mKey = pm.payment_date.substring(0, 7); // YYYY-MM
      monthlyMap[mKey] = (monthlyMap[mKey] || 0) + cleanVND(pm.amount_after_vat);
    });

    const sortedKeys = Object.keys(monthlyMap).sort();
    let runningSum = 0;
    let totalSumInBillions = 0;

    const result = sortedKeys.map(k => {
      const [y, m] = k.split('-');
      const valInBillions = Math.round((monthlyMap[k] / 1_000_000_000) * 100) / 100;
      runningSum = Math.round((runningSum + valInBillions) * 100) / 100;
      totalSumInBillions += valInBillions;

      return {
        month: `Thg ${m}/${y}`,
        'Giải ngân (Tỷ VNĐ)': valInBillions,
        'Lũy kế (Tỷ VNĐ)': runningSum,
      };
    });

    const avg = sortedKeys.length > 0 ? Math.round((totalSumInBillions / sortedKeys.length) * 100) / 100 : 0;

    return { comboMonthlyBarData: result, avgMonthlyDisbursementInPayments: avg };
  }, [sortedPayments]);

  const contractorDonutData = useMemo(() => {
    const map = {};
    sortedPayments.forEach(pm => {
      const contractorName = pm.contractor || 'Chưa xác định';
      map[contractorName] = (map[contractorName] || 0) + cleanVND(pm.amount_after_vat);
    });

    return Object.keys(map).map(cName => ({
      name: cName,
      fullName: cName,
      value: Math.round((map[cName] / 1_000_000_000) * 100) / 100,
      rawVal: map[cName]
    })).sort((a, b) => b.value - a.value);
  }, [sortedPayments]);

  const totalContractorPaidSum = useMemo(() => {
    const sum = contractorDonutData.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
    return (Math.round(sum * 100) / 100).toFixed(2);
  }, [contractorDonutData]);

  const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

  // RISK ALERT SYSTEM
  const todayStr = new Date().toISOString().substring(0, 10);
  const activeContractsList = useMemo(() => {
    if (selectedProjectId) {
      return contracts.filter(c => String(c.project_id) === String(selectedProjectId));
    }
    return contracts;
  }, [contracts, selectedProjectId]);

  const allAlertItems = useMemo(() => {
    const alerts = [];

    activeContractsList.forEach(c => {
      const cPayments = payments.filter(p => p.contract_id === c.id);
      const totalPaidForContract = cPayments.reduce((s, p) => s + cleanVND(p.amount_after_vat), 0);
      const contractVal = cleanVND(c.contractValueAfterVAT || c.contract_value || 0);

      const signingDate = c.signing_date || '';
      const executionDays = Number(c.execution_days || 0);
      const exactEndDate = signingDate && executionDays > 0 ? calcEndDate(signingDate, executionDays) : (c.end_date || '');

      // 1. Quá hạn hợp đồng nhưng chưa hoàn tất thanh toán quyết toán
      if (exactEndDate && todayStr > exactEndDate && c.status !== 'settled') {
        const daysOverdue = calcDaysBetween(exactEndDate, todayStr);
        alerts.push({
          id: `overdue_${c.id}`,
          type: 'OVERDUE',
          level: 'danger',
          title: `HĐ ${c.contract_number} (${c.contractor || 'Nhà thầu'}) đã quá hạn ${daysOverdue} ngày`,
          desc: `Hạn hoàn thành: ${formatDisplayDate(exactEndDate)}. Đã chi: ${formatVND(totalPaidForContract)} / ${formatVND(contractVal)}.`,
          contractId: c.id
        });
      }

      // 2. Thanh toán vượt giá trị hợp đồng
      if (totalPaidForContract > contractVal && contractVal > 0) {
        alerts.push({
          id: `exceed_${c.id}`,
          type: 'EXCEED_VALUE',
          level: 'danger',
          title: `HĐ ${c.contract_number} vượt giá trị hợp đồng được duyệt`,
          desc: `Đã chi: ${formatVND(totalPaidForContract)} > Giá trị HĐ: ${formatVND(contractVal)} (Vượt ${formatVND(totalPaidForContract - contractVal)}).`,
          contractId: c.id
        });
      }

      // 3. Tần suất thanh toán bất thường (> 2 đợt / tháng)
      const monthlyFreq = {};
      cPayments.forEach(p => {
        if (!p.payment_date) return;
        const mKey = p.payment_date.substring(0, 7);
        monthlyFreq[mKey] = (monthlyFreq[mKey] || 0) + 1;
      });

      Object.keys(monthlyFreq).forEach(mKey => {
        if (monthlyFreq[mKey] >= 3) {
          const [y, m] = mKey.split('-');
          alerts.push({
            id: `freq_${c.id}_${mKey}`,
            type: 'HIGH_FREQUENCY',
            level: 'warning',
            title: `HĐ ${c.contract_number} có ${monthlyFreq[mKey]} đợt thanh toán trong Tháng ${m}/${y}`,
            desc: `Tần suất thanh toán dày đặc bất thường. Cần kiểm tra hồ sơ nghiệm thu khối lượng.`,
            contractId: c.id
          });
        }
      });

      // 4. Hợp đồng đã ký nhưng chưa phát sinh giải ngân
      if (cPayments.length === 0) {
        alerts.push({
          id: `nodisburse_${c.id}`,
          type: 'NO_DISBURSEMENT',
          level: 'info',
          title: `HĐ ${c.contract_number} chưa có đợt thanh toán nào`,
          desc: `Ngày ký: ${formatDisplayDate(c.signing_date)}. Giá trị: ${formatVND(contractVal)}.`,
          contractId: c.id
        });
      }
    });

    return alerts;
  }, [activeContractsList, payments, todayStr]);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const selectedProjectObj = projects.find(p => String(p.id) === String(selectedProjectId));

  return (
    <div className="space-y-5 animate-fade-in pb-12">

      {/* HEADER COMPACT */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 min-h-[64px]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              QUẢN LÝ THANH TOÁN TỪNG ĐỢT
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-semibold border border-slate-700">
                {sortedPayments.length} đợt phát sinh
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Phạm vi: <strong className="text-emerald-400 font-semibold">{periodLabel}</strong> {selectedProjectObj ? `• Dự án: ${selectedProjectObj.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('payments')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
          >
            📥 Import Excel
          </button>
          <button
            onClick={onNewPayment}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1"
          >
            + Nhập Thanh Toán Mới
          </button>
        </div>
      </div>

      {/* COMPACT KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tổng Số Đợt Phát Sinh</span>
          <div className="text-lg font-black text-white font-mono">{kpiStats.totalTransactions} Đợt</div>
          <span className="text-[10px] text-slate-400 block font-mono">Đã lọc theo điều kiện chọn</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Chi Trả Trước VAT</span>
          <div className="text-lg font-black text-blue-400 font-mono">{formatVND(kpiStats.sumBeforeVAT)}</div>
          <span className="text-[10px] text-slate-400 block font-mono">Nguyên giá trước thuế</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tổng Thuế VAT</span>
          <div className="text-lg font-black text-amber-400 font-mono">{formatVND(kpiStats.sumVAT)}</div>
          <span className="text-[10px] text-slate-400 block font-mono">Thuế GTGT khấu trừ</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 space-y-1 shadow-md">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Tổng Chi Trả Sau VAT</span>
          <div className="text-lg font-black text-emerald-400 font-mono">{formatVND(kpiStats.sumAfterVAT)}</div>
          <span className="text-[10px] text-emerald-300/80 block font-mono">Tổng giải ngân trong kỳ ({periodLabel})</span>
        </div>
      </div>

      {/* COMPACT RISK ALERTS CONTAINER */}
      <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 shadow-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-amber-300 shrink-0">KIỂM SOÁT RỦI RO:</span>
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-[11px] py-0.5">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
              🔴 Quá hạn: {allAlertItems.filter(a => a.type === 'OVERDUE').length} HĐ
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
              ⚠️ Vượt HĐ: {allAlertItems.filter(a => a.type === 'EXCEED_VALUE').length} HĐ
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
              🟠 Tần suất cao: {allAlertItems.filter(a => a.type === 'HIGH_FREQUENCY').length} HĐ
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsAlertDrawerOpen(true)}
          className="px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shrink-0 cursor-pointer"
        >
          Chi tiết rủi ro ({allAlertItems.length})
        </button>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Local Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo đợt, nội dung thanh toán, nhà thầu..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Contract Select Filter */}
          <div className="relative shrink-0">
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Tất cả Hợp đồng --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.contract_number} ({c.contractor})</option>
              ))}
            </select>
          </div>

          {/* Contractor Filter */}
          <div className="relative shrink-0">
            <select
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Tất cả Nhà thầu --</option>
              {uniqueContractors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(contractFilter || contractorFilter || localSearch) && (
            <button
              onClick={() => {
                setContractFilter('');
                setContractorFilter('');
                setLocalSearch('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Đặt lại local filter
            </button>
          )}
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Hiển thị: <strong className="text-white">{sortedPayments.length}</strong> / {payments.length} đợt
        </div>
      </div>

      {/* DENSE & READABLE PAYMENTS TABLE */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300 min-w-[1050px]">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5 text-center w-14">STT</th>
                <th className="py-3 px-3.5 w-32 cursor-pointer hover:text-white" onClick={() => handleSort('payment_date')}>
                  <div className="flex items-center gap-1">
                    Ngày Thanh Toán
                    {sortColumn === 'payment_date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                  </div>
                </th>
                <th className="py-3 px-3.5 w-36">Dự Án</th>
                <th className="py-3 px-3.5 w-40">Số HĐ / Nhà Thầu</th>
                <th className="py-3 px-3.5 text-center w-20">Đợt TT</th>
                <th className="py-3 px-3.5 text-right w-36">Trước VAT</th>
                <th className="py-3 px-3.5 text-center w-20">VAT (%)</th>
                <th className="py-3 px-3.5 text-right w-36">Thuế VAT</th>
                <th className="py-3 px-3.5 text-right w-36 font-bold text-emerald-400">Sau VAT</th>
                <th className="py-3 px-3.5 text-right w-40 font-bold text-blue-300">Lũy Kế HĐ</th>
                <th className="py-3 px-3.5 text-center w-24">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {paginatedPayments.map((pm, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={pm.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3.5 text-center font-mono text-slate-400">{globalIndex}</td>
                    
                    <td className="py-3 px-3.5 font-mono text-slate-200 font-semibold">
                      {formatDisplayDate(pm.payment_date)}
                    </td>

                    <td className="py-3 px-3.5 font-semibold text-slate-200">
                      <div className="line-clamp-1">{pm.projectName}</div>
                    </td>

                    <td className="py-3 px-3.5 font-mono">
                      <div className="font-bold text-white">{pm.contractNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{pm.contractor}</div>
                      {pm.costGroup && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-sans">
                          {pm.costGroup} {pm.costGroup === 'Khác' && pm.costGroupNote ? `(${pm.costGroupNote})` : ''}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold border border-slate-700">
                        Đợt {pm.payment_phase || 1}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono text-slate-300 font-medium">
                      {formatVND(pm.amount_before_vat)}
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                      {pm.vat_rate}%
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono text-amber-400/90 font-medium">
                      {formatVND(pm.vat_amount)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-emerald-400 bg-emerald-500/5">
                      {formatVND(pm.amount_after_vat)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-300">
                      {formatVND(pm.cumulativeAfterVat)}
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditPayment(pm)}
                          className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Chỉnh sửa đợt thanh toán"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        <button
                          onClick={() => onDeletePayment(pm.id)}
                          className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Xóa đợt thanh toán"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedPayments.length === 0 && (
                <tr>
                  <td colSpan="11" className="py-10 text-center text-slate-400">
                    Không tìm thấy đợt thanh toán nào thỏa mãn điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span>Hiển thị trang {currentPage} / {totalPages} (Tổng {sortedPayments.length} bản ghi)</span>
            <div className="flex items-center gap-1">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs cursor-pointer font-mono"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span>dòng / trang</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pNum = currentPage - 2 + i;
                if (pNum > totalPages) pNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                    currentPage === pNum
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ANALYTICS CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left (7 Cols): Monthly Combo Chart (Bar + Line + Data Labels + Multi-layer Tooltip + Ref Line) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between h-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Biểu Đồ Giải Ngân Theo Tháng Trong Kỳ ({periodLabel})
            </h3>
            {avgMonthlyDisbursementInPayments > 0 && (
              <span className="text-[11px] text-slate-300 font-mono bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                TB tháng: <strong className="text-emerald-400">{avgMonthlyDisbursementInPayments} Tỷ</strong>
              </span>
            )}
          </div>

          <div className="h-64 w-full pt-2 flex-1">
            {comboMonthlyBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={comboMonthlyBarData} margin={{ top: 25, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
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
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-xs space-y-1.5 z-50">
                          <div className="font-bold text-white flex items-center justify-between border-b border-slate-800 pb-1.5 gap-4">
                            <span>📅 {label}</span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                              Kỳ thanh toán
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-0.5">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                              Chi trả trong tháng:
                            </span>
                            <strong className="text-emerald-400 font-mono">{monthVal} Tỷ VNĐ</strong>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                              Giá trị Lũy kế cộng dồn:
                            </span>
                            <strong className="text-amber-400 font-mono">{cumulativeVal} Tỷ VNĐ</strong>
                          </div>
                          {avgMonthlyDisbursementInPayments > 0 && (
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                              <span>Mức chi trung bình tháng:</span>
                              <span className="font-mono text-slate-200">{avgMonthlyDisbursementInPayments} Tỷ VNĐ</span>
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
                  {avgMonthlyDisbursementInPayments > 0 && (
                    <ReferenceLine 
                      yAxisId="left"
                      y={avgMonthlyDisbursementInPayments} 
                      stroke="#cbd5e1" 
                      strokeDasharray="4 4" 
                      label={{ 
                        value: `TB: ${avgMonthlyDisbursementInPayments} Tỷ`, 
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
                    maxBarSize={32}
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
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Không có dữ liệu chi trả theo tháng trong phạm vi chọn.
              </div>
            )}
          </div>
        </div>

        {/* Right (5 Cols): Contractor Donut Chart with Flexbox 2-part Layout (40% Graphic | 60% Legend) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              PHÂN BỔ TỶ TRỌNG THEO NHÀ THẦU
            </h3>
            <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
              {contractorDonutData.length} Nhà thầu
            </span>
          </div>

          {contractorDonutData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 flex-1 w-full">
              
              {/* Left Side (~40% Width): Centered Donut Graphic with Donut Inner Text */}
              <div className="w-full md:w-[40%] shrink-0 relative h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contractorDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      className="outline-none"
                    >
                      {contractorDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} className="hover:opacity-80 transition cursor-pointer" />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val) => [`${val} Tỷ VNĐ`, 'Tổng giải ngân']} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Inner Center Text: TỔNG & Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 select-none">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">
                    TỔNG CHI
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white font-mono leading-tight mt-0.5">
                    {totalContractorPaidSum} Tỷ
                  </span>
                </div>
              </div>

              {/* Right Side (~60% Width): Legend Panel with Full Name, Percentage & Value without Text Truncation */}
              <div className="w-full md:w-[60%] flex-1 flex flex-col justify-center gap-1.5 max-h-56 overflow-y-auto pl-1 pr-1">
                {contractorDonutData.map((item, idx) => {
                  const numVal = Number(item.value) || 0;
                  const totalSum = Number(totalContractorPaidSum) || 1;
                  const pct = totalSum > 0 ? (numVal / totalSum) * 100 : 0;
                  const itemColor = DONUT_COLORS[idx % DONUT_COLORS.length];

                  return (
                    <div
                      key={item.name}
                      title={`${item.fullName} - ${item.value} Tỷ VNĐ (${pct.toFixed(1)}%)`}
                      className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span 
                          className="w-3 h-3 rounded-md shrink-0 shadow-sm mt-0.5" 
                          style={{ backgroundColor: itemColor }} 
                        />
                        <span className="text-xs font-semibold text-slate-200 whitespace-normal break-words leading-snug group-hover:text-purple-300 transition">
                          {item.fullName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                        <span className="font-bold text-white">
                          {item.value} Tỷ
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-purple-300 border border-slate-700 min-w-[44px] text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 italic">
              Chưa có dữ liệu nhà thầu trong phạm vi chọn.
            </div>
          )}
        </div>

      </div>

      {/* RISK CONTROL MODAL DRAWER */}
      {isAlertDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Kiểm Soát Rủi Ro & Bất Thường</h3>
              </div>
              <button onClick={() => setIsAlertDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setAlertDrawerTab('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertDrawerTab === 'ALL' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Tất cả ({allAlertItems.length})
                </button>
                <button
                  onClick={() => setAlertDrawerTab('OVERDUE')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertDrawerTab === 'OVERDUE' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Quá hạn ({allAlertItems.filter(a => a.type === 'OVERDUE').length})
                </button>
                <button
                  onClick={() => setAlertDrawerTab('EXCEED_VALUE')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertDrawerTab === 'EXCEED_VALUE' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Vượt HĐ ({allAlertItems.filter(a => a.type === 'EXCEED_VALUE').length})
                </button>
              </div>

              <div className="space-y-2.5">
                {allAlertItems
                  .filter(a => alertDrawerTab === 'ALL' || a.type === alertDrawerTab)
                  .map(alt => (
                    <div 
                      key={alt.id}
                      className={`p-3.5 rounded-xl border space-y-1 transition ${
                        alt.level === 'danger'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : alt.level === 'warning'
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                          : 'bg-blue-950/30 border-blue-500/40 text-blue-200'
                      }`}
                    >
                      <div className="font-bold text-white text-xs">{alt.title}</div>
                      <div className="text-slate-300 leading-relaxed text-[11px]">{alt.desc}</div>
                    </div>
                  ))}

                {allAlertItems.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    Không ghi nhận rủi ro nào trong hệ thống.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Tổng số: {allAlertItems.length} ghi nhận</span>
              <button
                onClick={() => setIsAlertDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
