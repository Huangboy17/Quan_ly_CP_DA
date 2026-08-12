import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Building2, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Tag
} from 'lucide-react';
import { formatVND, formatDisplayDate } from '../../utils/formatters';
import { COST_GROUP_OPTIONS } from './ContractModal';

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
  const [localSearch, setLocalSearch] = useState('');

  const contractorsList = Array.from(new Set(baseContracts.map(c => c.contractor).filter(Boolean))).sort();
  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  // Filter baseContracts by local contractor, cost group dropdown & search query
  const filteredContracts = baseContracts.filter(c => {
    if (contractorFilter && c.contractor !== contractorFilter) return false;
    if (costGroupFilter) {
      if (costGroupFilter === 'unassigned') {
        if (c.costGroup && c.costGroup.trim() !== '') return false;
      } else if (c.costGroup !== costGroupFilter) {
        return false;
      }
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

  const isLocalFiltered = Boolean(contractorFilter || costGroupFilter || localSearch);

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

          {/* Reset Local Filters */}
          {isLocalFiltered && (
            <button
              onClick={() => {
                setContractorFilter('');
                setCostGroupFilter('');
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
