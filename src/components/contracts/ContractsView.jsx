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
  Calendar,
  FolderOpen,
  MoreVertical
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
  onViewContractDossier,
  onAddPaymentForContract,
  onOpenAppendixModal,
  onOpenExcelImport,
  globalSearch
}) {
  const { contracts = [], projects = [], periodLabel } = data;

  const [contractorFilter, setContractorFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

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

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('contracts')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 shadow-md transition cursor-pointer flex items-center gap-1.5"
            title="Import danh sách Hợp đồng từ Excel"
          >
            📥 Import Excel
          </button>
          <button
            onClick={() => onOpenAppendixModal && onOpenAppendixModal()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white text-xs font-semibold border border-slate-700 shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            + Thêm Phụ Lục
          </button>
          <button
            onClick={onNewContract}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + Tạo Hợp Đồng Mới
          </button>
        </div>
      </div>

      {/* PROMINENT ACTIVE PROJECT FILTER BADGE BAR */}
      {selectedProjectId && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 text-blue-300 font-medium">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Đang lọc hợp đồng theo dự án:</span>
              <span className="text-white font-bold text-sm">
                {projects.find(p => p.id === selectedProjectId)?.name || 'Dự án đã chọn'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 font-mono ml-1">
              📁 {filteredContracts.length} Hợp đồng
            </span>
          </div>

          <button
            onClick={() => {
              if (setSelectedProjectId) setSelectedProjectId('');
              setContractorFilter('');
              setLocalSearch('');
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1 self-start sm:self-auto"
          >
            ✕ Xóa bộ lọc dự án
          </button>
        </div>
      )}

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
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300 min-w-[1100px]">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3">Số HĐ / Dự Án</th>
                <th className="py-3 px-3">Nhà Thầu & Nội Dung</th>
                <th className="py-3 px-3 text-right">Trước VAT</th>
                <th className="py-3 px-3 text-center">VAT</th>
                <th className="py-3 px-3 text-right font-bold text-white">Sau VAT</th>
                <th className="py-3 px-3 text-right text-emerald-400">ĐÃ THANH TOÁN</th>
                <th className="py-3 px-3 text-right text-amber-400">CÒN PHẢI THANH TOÁN</th>
                <th className="py-3 px-3 text-right">Dự Kiến Quyết Toán</th>
                <th className="py-3 px-3 text-center">Thời Hạn</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredContracts.map((c) => {
                const variance = (c.estimated_settlement_value || c.contractValueAfterVAT || c.contract_value) - (c.contractValueAfterVAT || c.contract_value);
                return (
                  <tr key={c.id} className="hover:bg-slate-700/40 transition">
                    
                    {/* CLICKABLE SỐ HĐ / DỰ ÁN CELL */}
                    <td 
                      className="py-3.5 px-3 cursor-pointer group"
                      onClick={() => onViewContractDossier ? onViewContractDossier(c.id) : onViewContractDetail(c)}
                      title="Bấm để mở Hồ sơ Hợp đồng"
                    >
                      <div className="font-mono font-bold text-blue-400 group-hover:text-blue-300 group-hover:underline text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{c.contract_number}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold border ${
                          c.status === 'settled'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {c.status === 'settled' ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 group-hover:text-blue-300 transition mt-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="line-clamp-1">{c.projectName}</span>
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
                      <div className="text-xs text-blue-300 font-bold">{formatVND(c.contractValueAfterVAT || c.contract_value)}</div>
                      {c.totalAppendicesAfterVAT ? (
                        <div className={`text-[10px] font-semibold mt-0.5 ${c.totalAppendicesAfterVAT >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Gốc: {formatVND(c.initialContractValueAfterVAT)} ({c.totalAppendicesAfterVAT >= 0 ? `+${formatVND(c.totalAppendicesAfterVAT)}` : formatVND(c.totalAppendicesAfterVAT)})
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-normal">Chưa có phụ lục</div>
                      )}
                    </td>

                    {/* All Time Cumulative Paid (ĐÃ THANH TOÁN) */}
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                      <div className="font-bold">{formatVND(c.totalPaidAfterVAT || c.totalPaid)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Trước VAT: {formatVND(c.totalPaidBeforeVAT)}</div>
                    </td>

                    {/* Remaining Balance (CÒN PHẢI THANH TOÁN) */}
                    <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                      <div className="font-bold">{formatVND(c.remainingAfterVAT || c.remainingValue)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Trước VAT: {formatVND(c.remainingBeforeVAT)}</div>
                    </td>

                    {/* Estimated Settlement Value */}
                    <td className="py-3.5 px-3 text-right font-mono font-semibold">
                      <span className="text-purple-300">{formatVND(c.estimated_settlement_value || c.contractValueAfterVAT)}</span>
                      {variance !== 0 && (
                        <div className={`text-[10px] ${variance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {variance > 0 ? `+${formatVND(variance)}` : formatVND(variance)}
                        </div>
                      )}
                    </td>

                    {/* Compact Duration Column */}
                    <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-400">
                      <div>{c.execution_days ? `${c.execution_days} ngày` : '---'}</div>
                      <div className="text-[10px] text-amber-300 font-sans font-medium mt-0.5">
                        Hết hạn: {formatDisplayDate(c.end_date)}
                      </div>
                    </td>

                    {/* STREAMLINED ACTION COLUMN: [ Hồ sơ HĐ ] [ Thanh toán ] [ ⋮ ] */}
                    <td className="py-3.5 px-3 text-center relative">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewContractDossier ? onViewContractDossier(c.id) : onViewContractDetail(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold transition flex items-center gap-1 text-[11px] cursor-pointer shrink-0"
                          title="Mở Hồ Sơ Hợp Đồng"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Hồ sơ HĐ
                        </button>
                        <button
                          onClick={() => {
                            if (c.status === 'settled') {
                              alert('Hợp đồng này đã được quyết toán, không thể tạo thêm đợt thanh toán.');
                            } else {
                              onAddPaymentForContract(c);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-lg transition flex items-center gap-1 text-[11px] cursor-pointer shrink-0 ${
                            c.status === 'settled'
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                              : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-medium'
                          }`}
                          title={c.status === 'settled' ? 'Hợp đồng đã quyết toán, không thể tạo thêm đợt thanh toán' : 'Thêm Đợt Thanh Toán'}
                        >
                          <Wallet className="w-3.5 h-3.5" /> Thanh toán
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === c.id ? null : c.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Thao tác khác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === c.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActiveMenuId(null)} 
                              />
                              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 text-xs text-left animate-fade-in">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onEditContract(c);
                                  }}
                                  className="w-full px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-400" />
                                  Sửa hợp đồng
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    if (onOpenAppendixModal) onOpenAppendixModal(c.id);
                                  }}
                                  className="w-full px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                  Thêm phụ lục
                                </button>
                                <div className="my-1 border-t border-slate-800" />
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    if (window.confirm(`Bạn có chắc muốn xóa hợp đồng ${c.contract_number}?`)) {
                                      onDeleteContract(c.id);
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Xóa hợp đồng
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-slate-400">
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

