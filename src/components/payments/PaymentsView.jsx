import React, { useState } from 'react';
import { CreditCard, Search, Filter, Plus, Edit, Trash2, Building2, Calendar, FileText } from 'lucide-react';
import { formatVND, formatDisplayDate, isDateInBounds, getTimeRangeBounds } from '../../utils/formatters';

export default function PaymentsView({ 
  data, 
  onNewPayment, 
  onEditPayment, 
  onDeletePayment,
  globalSearch 
}) {
  const { payments = [], contracts = [], projects = [], periodLabel, timeFilter } = data;

  const [contractFilter, setContractFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  const { startDate, endDate } = getTimeRangeBounds(timeFilter);

  // Enrich payments
  const enrichedPayments = payments.map(pm => {
    const contract = contracts.find(c => c.id === pm.contract_id);
    const project = contract ? projects.find(p => p.id === contract.project_id) : null;

    return {
      ...pm,
      contractNumber: contract ? contract.contract_number : 'N/A',
      contractor: contract ? contract.contractor : 'N/A',
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

  // Calculate totals for filtered list
  const totalBeforeVat = filteredPayments.reduce((sum, p) => sum + Number(p.amount_before_vat || 0), 0);
  const totalVat = filteredPayments.reduce((sum, p) => sum + Number(p.vat_amount || 0), 0);
  const totalAfterVat = filteredPayments.reduce((sum, p) => sum + Number(p.amount_after_vat || 0), 0);

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
            Lịch sử giải ngân trong kỳ <span className="text-emerald-400 font-semibold">{periodLabel}</span>. Tự động tính VAT và tổng sau VAT.
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, ghi chú, đợt..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setContractFilter('');
            }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
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
              onClick={() => {
                setProjectFilter('');
                setContractFilter('');
                setLocalSearch('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
          <div className="text-xs text-slate-400 text-right ml-auto self-center font-mono">
            Tổng đợt trong kỳ: <span className="font-bold text-white">{filteredPayments.length}</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Bar for filtered payments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Trước VAT ({periodLabel})</span>
          <div className="text-lg font-bold text-white font-mono mt-1">{formatVND(totalBeforeVat)}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tiền Thuế VAT ({periodLabel})</span>
          <div className="text-lg font-bold text-blue-400 font-mono mt-1">{formatVND(totalVat)}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng Thanh Toán Sau VAT</span>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{formatVND(totalAfterVat)}</div>
        </div>
      </div>

      {/* Payments History Data Table */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3">Hợp Đồng / Dự Án</th>
                <th className="py-3 px-3 text-center">Đợt TT</th>
                <th className="py-3 px-3">Ngày Thanh Toán</th>
                <th className="py-3 px-3 text-right">Trước VAT</th>
                <th className="py-3 px-3 text-center">Mức VAT</th>
                <th className="py-3 px-3 text-right">Tiền VAT</th>
                <th className="py-3 px-3 text-right">Sau VAT</th>
                <th className="py-3 px-3">Ghi Chú</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredPayments.map((pm) => (
                <tr key={pm.id} className="hover:bg-slate-700/40 transition">
                  <td className="py-3.5 px-3">
                    <div className="font-mono font-bold text-white text-xs">{pm.contractNumber}</div>
                    <div className="text-[11px] text-blue-400 font-medium mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {pm.projectName}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-semibold text-white">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-emerald-400">
                      Đợt {pm.payment_phase}
                    </span>
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

                  <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 text-xs">
                    {formatVND(pm.amount_after_vat)}
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
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">
                    Không có thanh toán nào phát sinh trong khoảng thời gian {periodLabel}.
                  </td>
                </tr>
              )}
            </tbody>

            {filteredPayments.length > 0 && (
              <tfoot className="bg-slate-900/90 font-bold border-t border-slate-700 text-slate-200">
                <tr>
                  <td colSpan="3" className="py-3 px-3 uppercase text-[11px] text-slate-400">Tổng Phát Sinh Trong Kỳ ({periodLabel})</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">{formatVND(totalBeforeVat)}</td>
                  <td className="py-3 px-3 text-center">---</td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400">{formatVND(totalVat)}</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">{formatVND(totalAfterVat)}</td>
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
