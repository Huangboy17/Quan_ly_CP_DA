import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Filter, Plus, Edit, Trash2, Building2, Calendar, FileText, X, AlertTriangle, Layers } from 'lucide-react';
import { formatVND, formatDisplayDate, isDateInBounds, getTimeRangeBounds } from '../../utils/formatters';

export default function PaymentsView({ 
  data, 
  selectedProjectId = '',
  setSelectedProjectId,
  onNewPayment, 
  onEditPayment, 
  onDeletePayment,
  globalSearch 
}) {
  const { payments = [], contracts = [], projects = [], periodLabel, timeFilter } = data;

  const [contractFilter, setContractFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState(selectedProjectId || '');
  const [localSearch, setLocalSearch] = useState('');

  // Keep projectFilter synced with selectedProjectId prop
  useEffect(() => {
    setProjectFilter(selectedProjectId || '');
  }, [selectedProjectId]);

  const { startDate, endDate } = getTimeRangeBounds(timeFilter);

  // Active Project object if filtered
  const activeProjectObj = projects.find(p => p.id === projectFilter);

  // Enrich payments with project and contract info
  const enrichedPayments = payments.map(pm => {
    const contract = contracts.find(c => c.id === pm.contract_id);
    const project = contract ? projects.find(p => p.id === contract.project_id) : null;

    return {
      ...pm,
      contractNumber: contract ? contract.contract_number : 'N/A',
      contractor: contract ? contract.contractor : 'Chưa xác định',
      projectName: project ? project.name : 'N/A',
      projectId: contract ? contract.project_id : null,
    };
  });

  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  // Filter payments by contract, project, local search, AND global time bounds
  const filteredPayments = enrichedPayments.filter(pm => {
    // Global time bounds filter
    if (!isDateInBounds(pm.payment_date, startDate, endDate)) return false;

    if (contractFilter && pm.contract_id !== contractFilter) return false;
    if (projectFilter && pm.projectId !== projectFilter) return false;

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

  // Calculate Running Cumulative Sum After VAT for filtered payments chronologically
  const sortedPaymentsForCumulative = [...filteredPayments].sort((a, b) => {
    if (a.payment_date !== b.payment_date) {
      return (a.payment_date || '').localeCompare(b.payment_date || '');
    }
    return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
  });

  let runningSum = 0;
  const cumulativeMap = {};
  sortedPaymentsForCumulative.forEach(pm => {
    runningSum += Number(pm.amount_after_vat || 0);
    cumulativeMap[pm.id] = runningSum;
  });

  const finalPaymentsList = filteredPayments.map(pm => ({
    ...pm,
    cumulativeAfterVat: cumulativeMap[pm.id] || Number(pm.amount_after_vat || 0)
  }));

  // Calculate totals for filtered list
  const totalBeforeVat = filteredPayments.reduce((sum, p) => sum + Number(p.amount_before_vat || 0), 0);
  const totalVat = filteredPayments.reduce((sum, p) => sum + Number(p.vat_amount || 0), 0);
  const totalAfterVat = filteredPayments.reduce((sum, p) => sum + Number(p.amount_after_vat || 0), 0);

  // Over-Settlement Alert Calculation (Đã thanh toán vượt dự kiến quyết toán)
  let projEstimatedSettlement = 0;
  if (projectFilter) {
    const projContractsList = contracts.filter(c => c.project_id === projectFilter);
    projEstimatedSettlement = projContractsList.reduce((sum, c) => {
      const val = Number(c.estimated_settlement_value !== undefined && c.estimated_settlement_value !== null ? c.estimated_settlement_value : c.contractValueAfterVAT || c.contract_value || 0);
      return sum + val;
    }, 0);
  }

  const isOverSettlement = projectFilter && projEstimatedSettlement > 0 && totalAfterVat > projEstimatedSettlement;
  const excessAmount = isOverSettlement ? totalAfterVat - projEstimatedSettlement : 0;

  const handleClearFilters = () => {
    setProjectFilter('');
    setContractFilter('');
    setLocalSearch('');
    if (setSelectedProjectId) {
      setSelectedProjectId('');
    }
  };

  const handleProjectSelectChange = (pId) => {
    setProjectFilter(pId);
    setContractFilter('');
    if (setSelectedProjectId) {
      setSelectedProjectId(pId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Quản Lý Thanh Toán Từng Đợt
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lịch sử giải ngân trong kỳ <span className="text-emerald-400 font-semibold">{periodLabel}</span>. Tự động tính VAT, lũy kế và phát hiện cảnh báo rủi ro.
          </p>
        </div>

        <button
          onClick={onNewPayment}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Nhập Thanh Toán Mới
        </button>
      </div>

      {/* PROMINENT ACTIVE PROJECT FILTER BADGE BAR */}
      {projectFilter && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 text-blue-300 font-medium">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Đang lọc thanh toán theo dự án:</span>
              <span className="text-white font-bold text-sm">{activeProjectObj ? activeProjectObj.name : 'Dự án đã chọn'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 font-mono ml-1">
              📁 {filteredPayments.length} Đợt phát sinh
            </span>
          </div>

          <button
            onClick={handleClearFilters}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1 self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" /> Xóa bộ lọc dự án
          </button>
        </div>
      )}

      {/* DYNAMIC RISK WARNING BANNER (KHI ĐÃ THANH TOÁN VƯỢT DỰ KIẾN QUYẾT TOÁN) */}
      {isOverSettlement && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-sm text-white block">
                🔴 CẢNH BÁO: Đã thanh toán vượt giá trị dự kiến quyết toán!
              </span>
              <span className="text-rose-200 text-xs mt-0.5 block leading-relaxed">
                Dự án "{activeProjectObj?.name}": Tổng thanh toán sau VAT ({formatVND(totalAfterVat)}) đã vượt giá trị dự kiến quyết toán ({formatVND(projEstimatedSettlement)}) một khoản <strong className="text-rose-400 font-mono">{formatVND(excessAmount)}</strong>!
              </span>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-mono font-bold shrink-0 border border-rose-500/40 self-start sm:self-auto">
            Vượt +{formatVND(excessAmount)}
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, nhà thầu, ghi chú..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div>
          <select
            value={projectFilter}
            onChange={(e) => handleProjectSelectChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
          >
            <option value="">-- Tất cả Dự án --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-mono"
          >
            <option value="">-- Tất cả Hợp đồng --</option>
            {contracts
              .filter(c => !projectFilter || c.project_id === projectFilter)
              .map(c => (
                <option key={c.id} value={c.id}>{c.contract_number} ({c.contractor})</option>
              ))
            }
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(projectFilter || contractFilter || localSearch) && (
            <button
              onClick={handleClearFilters}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
          <div className="text-xs text-slate-400 text-right ml-auto self-center font-mono">
            Hiển thị: <span className="font-bold text-white">{filteredPayments.length}</span> đợt
          </div>
        </div>
      </div>

      {/* 4 SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: TỔNG ĐỢT THANH TOÁN */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">1. TỔNG ĐỢT THANH TOÁN</span>
          <div className="text-xl font-bold text-white font-mono flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            {filteredPayments.length} <span className="text-xs font-normal text-slate-400 font-sans">đợt phát sinh</span>
          </div>
        </div>

        {/* KPI 2: ĐÃ THANH TOÁN TRƯỚC VAT */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">2. ĐÃ THANH TOÁN TRƯỚC VAT</span>
          <div className="text-lg font-bold text-slate-200 font-mono">{formatVND(totalBeforeVat)}</div>
        </div>

        {/* KPI 3: TIỀN THUẾ VAT */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">3. TIỀN THUẾ VAT</span>
          <div className="text-lg font-bold text-blue-400 font-mono">{formatVND(totalVat)}</div>
        </div>

        {/* KPI 4: TỔNG ĐÃ THANH TOÁN SAU VAT (NỔI BẬT NHẤT) */}
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/50 shadow-lg relative overflow-hidden">
          <span className="text-[11px] font-extrabold text-emerald-400 uppercase block mb-1">4. TỔNG ĐÃ THANH TOÁN SAU VAT</span>
          <div className="text-xl font-black text-emerald-300 font-mono">{formatVND(totalAfterVat)}</div>
        </div>

      </div>

      {/* Payments History Data Table (11 Columns Standard) */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3">Hợp Đồng</th>
                <th className="py-3 px-3">Nhà Thầu</th>
                <th className="py-3 px-3 text-center">Đợt Thanh Toán</th>
                <th className="py-3 px-3">Ngày Thanh Toán</th>
                <th className="py-3 px-3 text-right">Trước VAT</th>
                <th className="py-3 px-3 text-center">Mức VAT</th>
                <th className="py-3 px-3 text-right">Tiền VAT</th>
                <th className="py-3 px-3 text-right font-bold text-emerald-400">Sau VAT</th>
                <th className="py-3 px-3 text-right font-bold text-cyan-400">Lũy Kế Sau VAT</th>
                <th className="py-3 px-3">Ghi Chú</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {finalPaymentsList.map((pm) => {
                const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT';
                return (
                  <tr key={pm.id} className="hover:bg-slate-700/40 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-mono font-bold text-white text-xs">{pm.contractNumber}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-200 max-w-xs truncate">{pm.contractor}</div>
                    </td>

                    <td className="py-3.5 px-3 text-center font-semibold text-white">
                      {isSettlementPhase ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-[11px]">
                          🔵 Quyết toán
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-emerald-400 text-[11px]">
                          Đợt {pm.payment_phase}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-300">
                      {formatDisplayDate(pm.payment_date)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-200 font-medium">
                      {formatVND(pm.amount_before_vat)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[11px] border border-blue-500/20">
                        {pm.vat_rate}%
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                      {formatVND(pm.vat_amount)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 text-xs bg-emerald-500/5">
                      {formatVND(pm.amount_after_vat)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-cyan-300 text-xs bg-slate-900/60">
                      {formatVND(pm.cumulativeAfterVat)}
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                      {pm.note || '---'}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditPayment(pm)}
                          className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition"
                          title="Chỉnh Sửa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa đợt thanh toán ${pm.payment_phase} của HĐ ${pm.contractNumber}?`)) {
                              onDeletePayment(pm.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {finalPaymentsList.length === 0 && (
                <tr>
                  <td colSpan="11" className="py-10 text-center text-slate-400">
                    {projectFilter 
                      ? `Chưa có thanh toán nào phát sinh cho dự án "${activeProjectObj?.name || 'đã chọn'}".` 
                      : `Không có thanh toán nào phát sinh trong khoảng thời gian ${periodLabel}.`}
                  </td>
                </tr>
              )}
            </tbody>

            {finalPaymentsList.length > 0 && (
              <tfoot className="bg-slate-900/90 font-bold border-t border-slate-700 text-slate-200">
                <tr>
                  <td colSpan="4" className="py-3 px-3 uppercase text-[11px] text-slate-400">
                    Tổng Phát Sinh ({finalPaymentsList.length} đợt)
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">{formatVND(totalBeforeVat)}</td>
                  <td className="py-3 px-3 text-center">---</td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400">{formatVND(totalVat)}</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm bg-emerald-500/10">{formatVND(totalAfterVat)}</td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-400 text-sm bg-slate-900">{formatVND(totalAfterVat)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}
