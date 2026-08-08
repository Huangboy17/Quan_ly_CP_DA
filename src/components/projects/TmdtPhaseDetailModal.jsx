import React from 'react';
import { X, Calendar, FileText, DollarSign, Edit, CheckCircle2, Paperclip, Sparkles } from 'lucide-react';
import { formatVND, formatDisplayDate, numberToWordsVN } from '../../utils/formatters';

export default function TmdtPhaseDetailModal({ 
  isOpen, 
  onClose, 
  project, 
  phase, 
  onEditPhase 
}) {
  if (!isOpen || !project || !phase) return null;

  const history = Array.isArray(project.tmdt_history) ? project.tmdt_history : [];
  const phaseIdx = history.findIndex(h => h.id === phase.id);
  const prevPhase = phaseIdx > 0 ? history[phaseIdx - 1] : null;

  const prevAmount = prevPhase ? Number(prevPhase.amount) : 0;
  const currentAmount = Number(phase.amount || 0);
  const diffAmount = prevPhase ? currentAmount - prevAmount : 0;
  const isLatest = phaseIdx === history.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold font-mono text-sm">
              Lần {phase.phase_number || (phaseIdx + 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">THÔNG TIN LẦN ĐIỀU CHỈNH TMĐT</h3>
                {isLatest && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    🔵 TMĐT Hiện Tại
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-300 font-medium truncate max-w-xs">{project.name}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Main Money Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">TMĐT Trước Điều Chỉnh</span>
              <span className="font-mono font-bold text-slate-200 text-xs mt-0.5 block">
                {prevPhase ? formatVND(prevAmount) : '--- (Ban đầu)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">TMĐT Sau Điều Chỉnh</span>
              <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
                {formatVND(currentAmount)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tăng / Giảm Chênh Lệch</span>
              <span className={`font-mono font-bold text-xs mt-0.5 block ${
                !prevPhase ? 'text-slate-400' : (diffAmount >= 0 ? 'text-blue-400' : 'text-rose-400')
              }`}>
                {!prevPhase ? '-' : (diffAmount >= 0 ? `+${formatVND(diffAmount)}` : formatVND(diffAmount))}
              </span>
            </div>
          </div>

          {/* Amount In Words */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-0.5">
            <span className="text-[11px] text-emerald-400 font-sans italic flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Số tiền bằng chữ: {numberToWordsVN(currentAmount)}
            </span>
          </div>

          {/* Metadata Table */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-700/60">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Số Quyết Định Phê Duyệt:</span>
                <span className="font-mono font-bold text-white text-xs">{phase.decision_number || 'Chưa nhập số QĐ'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Ngày Phê Duyệt:</span>
                <span className="font-mono font-bold text-slate-200 text-xs">{formatDisplayDate(phase.date)}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Nội Dung Phê Duyệt / Điều Chỉnh:</span>
              <span className="text-slate-200 font-medium text-xs block mt-0.5">{phase.content || 'N/A'}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Lý Do Điều Chỉnh:</span>
              <span className="text-slate-300 text-xs block mt-0.5 leading-relaxed">{phase.reason || 'Chưa ghi nhận lý do'}</span>
            </div>

            {phase.note && (
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Ghi Chú Đính Kèm:</span>
                <span className="text-slate-400 text-xs block mt-0.5">{phase.note}</span>
              </div>
            )}

            {phase.file_name && (
              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-blue-400">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="font-mono text-xs truncate underline cursor-pointer">{phase.file_name}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onEditPhase(phase);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Edit className="w-3.5 h-3.5" /> Chỉnh Sửa Thông Tin
          </button>

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
