import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Wallet, 
  Building2, 
  Clock,
  Calendar
} from 'lucide-react';
import { formatVND, formatDisplayDate } from '../../utils/formatters';

export default function ContractsView({ 
  data, 
  selectedProjectId, 
  setSelectedProjectId, 
  onNewContract, 
  onEditContract, 
  onDeleteContract, 
  onViewContractDetail,
  onAddPaymentForContract,
  globalSearch
}) {
  const { contracts = [], projects = [], periodLabel } = data;

  const [contractorFilter, setContractorFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  const contractorsList = Array.from(new Set(contracts.map(c => c.contractor).filter(Boolean)));
  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  const filteredContracts = contracts.filter(c => {
    if (selectedProjectId && c.project_id !== selectedProjectId) return false;
    if (contractorFilter && c.contractor !== contractorFilter) return false;
    if (searchQuery) {
      const matchNum = c.contract_number?.toLowerCase().includes(searchQuery);
      const matchContent = c.content?.toLowerCase().includes(searchQuery);
      const matchContractor = c.contractor?.toLowerCase().includes(searchQuery);
      const matchProject = c.projectName?.toLowerCase().includes(searchQuery);
      return matchNum || matchContent || matchContractor || matchProject;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Quản Lý Hợp Đồng & Nhập Liệu
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý hợp đồng thi công, theo dõi giá trị giải ngân lũy kế và phát sinh chi trong kỳ <span className="text-emerald-400 font-semibold">{periodLabel}</span>.
          </p>
        </div>

        <button
          onClick={onNewContract}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Tạo Hợp Đồng Mới
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, nội dung, nhà thầu..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">-- Tất cả Dự án --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={contractorFilter}
            onChange={(e) => setContractorFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">-- Tất cả Nhà thầu --</option>
            {contractorsList.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(selectedProjectId || contractorFilter || localSearch) && (
            <button
              onClick={() => {
                setSelectedProjectId('');
                setContractorFilter('');
                setLocalSearch('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
          <div className="text-xs text-slate-400 text-right ml-auto self-center font-mono">
            Số HĐ: <span className="font-bold text-white">{filteredContracts.length}</span>
          </div>
        </div>

      </div>

      {/* Contracts Data Table */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 shadow-lg space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3">Số HĐ / Dự Án</th>
                <th className="py-3 px-3">Nhà Thầu & Nội Dung</th>
                <th className="py-3 px-3 text-right">Trước VAT</th>
                <th className="py-3 px-3 text-center">VAT</th>
                <th className="py-3 px-3 text-right font-bold text-white">Sau VAT</th>
                <th className="py-3 px-3 text-right text-emerald-400">Lũy Kế Đã Chi</th>
                <th className="py-3 px-3 text-right text-amber-400">Còn Lại (Dư Nợ)</th>
                <th className="py-3 px-3 text-right">Dự Kiến Quyết Toán</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredContracts.map((c) => {
                const variance = (c.estimated_settlement_value || c.contractValueAfterVAT || c.contract_value) - (c.contractValueAfterVAT || c.contract_value);
                return (
                  <tr key={c.id} className="hover:bg-slate-700/40 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                        {c.contract_number}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold border ${
                          c.status === 'settled'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {c.status === 'settled' ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-400 font-medium mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {c.projectName}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="font-semibold text-slate-200">{c.contractor}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.content || 'N/A'}</div>
                    </td>

                    {/* 3-VALUE VAT MODEL COLUMNS */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                      {formatVND(c.contractValueBeforeVAT)}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/30 text-[11px]">
                        {c.vatRate !== undefined ? c.vatRate : 10}%
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white bg-slate-900/40">
                      {formatVND(c.contractValueAfterVAT || c.contract_value)}
                    </td>

                    {/* All Time Cumulative Paid (After VAT + Subtext Before VAT) */}
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                      <div className="font-bold">{formatVND(c.totalPaidAfterVAT || c.totalPaid)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Trước VAT: {formatVND(c.totalPaidBeforeVAT)}</div>
                    </td>

                    {/* Remaining Balance (After VAT + Subtext Before VAT) */}
                    <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                      <div className="font-bold">{formatVND(c.remainingAfterVAT || c.remainingValue)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Trước VAT: {formatVND(c.remainingBeforeVAT)}</div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-semibold">
                      <span className="text-purple-300">{formatVND(c.estimated_settlement_value || c.contractValueAfterVAT)}</span>
                      {variance !== 0 && (
                        <div className={`text-[10px] ${variance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {variance > 0 ? `+${formatVND(variance)}` : formatVND(variance)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                      <div>{c.execution_days} ngày</div>
                      <div className="text-[10px] text-amber-300">Đến {formatDisplayDate(c.end_date)}</div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewContractDetail(c)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                          title="Xem Chi Tiết & Lịch Sử TT"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (c.status === 'settled') {
                              alert('Hợp đồng này đã được quyết toán, không thể tạo thêm đợt thanh toán.');
                            } else {
                              onAddPaymentForContract(c);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            c.status === 'settled'
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white'
                          }`}
                          title={c.status === 'settled' ? 'Hợp đồng đã quyết toán, không thể tạo thêm đợt thanh toán' : 'Thêm Đợt Thanh Toán'}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditContract(c)}
                          className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition"
                          title="Chỉnh Sửa HĐ"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa hợp đồng ${c.contract_number}?`)) {
                              onDeleteContract(c.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                          title="Xóa HĐ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">
                    Không tìm thấy hợp đồng nào phù hợp.
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
