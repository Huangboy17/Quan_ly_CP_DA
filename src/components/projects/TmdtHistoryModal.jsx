import React, { useState } from 'react';
import { X, Clock, Calendar, FileText, Plus, Edit, Trash2, ShieldCheck, Eye, TrendingUp } from 'lucide-react';
import { formatVND, formatDisplayDate } from '../../utils/formatters';

export default function TmdtHistoryModal({ 
  isOpen, 
  onClose, 
  project,
  onOpenAddNewPhase,
  onOpenEditPhase,
  onOpenViewPhaseDetail,
  onDeletePhase
}) {
  if (!isOpen || !project) return null;

  const history = Array.isArray(project.tmdt_history) && project.tmdt_history.length > 0
    ? project.tmdt_history
    : [];

  const initialAmount = history.length > 0 ? Number(history[0].amount) : 0;
  const currentAmount = project.currentTmdt || (history.length > 0 ? Number(history[history.length - 1].amount) : 0);
  const totalDelta = currentAmount - initialAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Lịch Sử Phê Duyệt & Điều Chỉnh Tổng Mức Đầu Tư (TMĐT)</h3>
              <p className="text-xs text-blue-300 font-medium truncate max-w-md">{project.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAddNewPhase(project)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> + Thêm Lần Điều Chỉnh TMĐT
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">TMĐT Phê Duyệt Ban Đầu (Lần 1)</span>
              <span className="font-mono font-bold text-slate-200 text-sm">{formatVND(initialAmount)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">TMĐT Hiện Tại (Lần {history.length})</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{formatVND(currentAmount)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Tổng Chênh Lệch Điều Chỉnh</span>
              <span className={`font-mono font-bold text-sm ${totalDelta >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {totalDelta >= 0 ? `+${formatVND(totalDelta)}` : formatVND(totalDelta)}
              </span>
            </div>
          </div>

          {/* History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Danh Sách Chi Tiết Chuỗi Lần Phê Duyệt TMĐT ({history.length} lần)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                TMĐT Hiện tại = Lần mới nhất
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-3 text-center">Lần</th>
                    <th className="py-3 px-3">Ngày Phê Duyệt</th>
                    <th className="py-3 px-3">Nội Dung Điều Chỉnh</th>
                    <th className="py-3 px-3 text-right">TMĐT Sau Điều Chỉnh</th>
                    <th className="py-3 px-3 text-right">Tăng / Giảm</th>
                    <th className="py-3 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {history.map((item, index) => {
                    const isLatest = index === history.length - 1;
                    const diff = item.diff_amount || 0;
                    return (
                      <tr 
                        key={item.id || index} 
                        className={`hover:bg-slate-800/70 transition ${isLatest ? 'bg-emerald-500/5' : ''}`}
                      >
                        <td className="py-3 px-3 text-center font-semibold">
                          <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${
                            isLatest 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            Lần {item.phase_number || (index + 1)}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-200">
                          {formatDisplayDate(item.date)}
                        </td>

                        <td className="py-3 px-3 text-slate-200 max-w-xs">
                          <div className="font-semibold text-white truncate">{item.content}</div>
                          {item.decision_number && (
                            <div className="text-[10px] text-purple-300 font-mono mt-0.5">
                              Số QĐ: {item.decision_number}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          <div className="font-bold text-white text-xs">{formatVND(item.amount)}</div>
                          {isLatest && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-bold border border-emerald-500/20">
                              🔵 TMĐT Hiện Tại
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {index === 0 ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {diff >= 0 ? `+${formatVND(diff)}` : formatVND(diff)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenViewPhaseDetail(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenEditPhase(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {history.length > 1 && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc muốn xóa đợt điều chỉnh TMĐT Lần ${item.phase_number}?`)) {
                                    onDeletePhase(project.id, item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="Xóa đợt điều chỉnh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        Chưa có lịch sử điều chỉnh TMĐT cho dự án này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
}
