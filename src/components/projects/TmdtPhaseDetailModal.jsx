import React from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-md cursor-pointer"
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Main Centered Modal Window */}
      <div 
        className="bg-card border border-border rounded-3xl max-w-lg w-[92vw] max-h-[88vh] shadow-2xl flex flex-col overflow-hidden"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-muted/90 border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold font-mono text-sm">
              Lần {phase.phase_number || (phaseIdx + 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">THÔNG TIN LẦN ĐIỀU CHỈNH TMĐT</h3>
                {isLatest && (
                  <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/30 text-[10px] font-bold">
                    🔵 TMĐT Hiện Tại
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-300 font-medium truncate max-w-xs">{project.name}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0 text-xs">
          
          {/* Main Money Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">TMĐT Trước Điều Chỉnh</span>
              <span className="font-mono font-bold text-foreground text-xs mt-0.5 block">
                {prevPhase ? formatVND(prevAmount) : '--- (Ban đầu)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">TMĐT Sau Điều Chỉnh</span>
              <span className="font-mono font-bold text-success text-xs mt-0.5 block">
                {formatVND(currentAmount)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Tăng / Giảm Chênh Lệch</span>
              <span className={`font-mono font-bold text-xs mt-0.5 block ${
                !prevPhase ? 'text-muted-foreground' : (diffAmount >= 0 ? 'text-primary' : 'text-destructive')
              }`}>
                {!prevPhase ? '-' : (diffAmount >= 0 ? `+${formatVND(diffAmount)}` : formatVND(diffAmount))}
              </span>
            </div>
          </div>

          {/* Amount In Words */}
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-emerald-300 text-xs space-y-0.5">
            <span className="text-[11px] text-success font-sans italic flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-success shrink-0" />
              Số tiền bằng chữ: {numberToWordsVN(currentAmount)}
            </span>
          </div>

          {/* Metadata Table */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/60 space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/60">
              <div>
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Số Quyết Định Phê Duyệt:</span>
                <span className="font-mono font-bold text-foreground text-xs">{phase.decision_number || 'Chưa nhập số QĐ'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Ngày Phê Duyệt:</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatDisplayDate(phase.date)}</span>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Nội Dung Phê Duyệt / Điều Chỉnh:</span>
              <span className="text-foreground font-medium text-xs block mt-0.5">{phase.content || 'N/A'}</span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Lý Do Điều Chỉnh:</span>
              <span className="text-foreground/80 text-xs block mt-0.5 leading-relaxed">{phase.reason || 'Chưa ghi nhận lý do'}</span>
            </div>

            {phase.note && (
              <div>
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Ghi Chú Đính Kèm:</span>
                <span className="text-muted-foreground text-xs block mt-0.5">{phase.note}</span>
              </div>
            )}

            {phase.file_name && (
              <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-primary">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="font-mono text-xs truncate underline cursor-pointer">{phase.file_name}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-muted/90 border-t border-border/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onEditPhase(phase);
            }}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-foreground text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Edit className="w-3.5 h-3.5" /> Chỉnh Sửa Thông Tin
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-muted hover:bg-slate-600 text-foreground text-xs font-semibold transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
