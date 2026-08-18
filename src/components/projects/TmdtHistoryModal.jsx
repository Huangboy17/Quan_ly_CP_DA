import React from 'react';
import { createPortal } from 'react-dom';
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
        className="bg-card border border-border rounded-3xl max-w-4xl w-[92vw] max-h-[88vh] shadow-2xl flex flex-col overflow-hidden"
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
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Lịch Sử Phê Duyệt & Điều Chỉnh Tổng Mức Đầu Tư (TMĐT)</h3>
              <p className="text-xs text-blue-300 font-medium truncate max-w-md">{project.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAddNewPhase(project)}
              className="px-3.5 py-1.5 rounded-lg bg-success hover:bg-success text-foreground text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> + Thêm Lần Điều Chỉnh TMĐT
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">TMĐT Phê Duyệt Ban Đầu (Lần 1)</span>
              <span className="font-mono font-bold text-foreground text-sm">{formatVND(initialAmount)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">TMĐT Hiện Tại (Lần {history.length})</span>
              <span className="font-mono font-bold text-success text-sm">{formatVND(currentAmount)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Tổng Chênh Lệch Điều Chỉnh</span>
              <span className={`font-mono font-bold text-sm ${totalDelta >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {totalDelta >= 0 ? `+${formatVND(totalDelta)}` : formatVND(totalDelta)}
              </span>
            </div>
          </div>

          {/* History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-success" />
                Danh Sách Chi Tiết Chuỗi Lần Phê Duyệt TMĐT ({history.length} lần)
              </h4>
              <span className="text-[11px] text-muted-foreground font-mono">
                TMĐT Hiện tại = Lần mới nhất
              </span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs text-foreground/80">
                <thead className="bg-muted/90 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-3 text-center">Lần</th>
                    <th className="py-3 px-3">Ngày Phê Duyệt</th>
                    <th className="py-3 px-3">Nội Dung Điều Chỉnh</th>
                    <th className="py-3 px-3 text-right">TMĐT Sau Điều Chỉnh</th>
                    <th className="py-3 px-3 text-right">Tăng / Giảm</th>
                    <th className="py-3 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-card/60">
                  {history.map((item, index) => {
                    const isLatest = index === history.length - 1;
                    const diff = item.diff_amount || 0;
                    return (
                      <tr 
                        key={item.id || index} 
                        className={`hover:bg-muted/70 transition ${isLatest ? 'bg-success/5' : ''}`}
                      >
                        <td className="py-3 px-3 text-center font-semibold">
                          <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${
                            isLatest 
                              ? 'bg-success/10 text-success border-success/30' 
                              : 'bg-muted text-foreground/80 border-border'
                          }`}>
                            Lần {item.phase_number || (index + 1)}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-foreground">
                          {formatDisplayDate(item.date)}
                        </td>

                        <td className="py-3 px-3 text-foreground max-w-xs">
                          <div className="font-semibold text-foreground truncate">{item.content}</div>
                          {item.decision_number && (
                            <div className="text-[10px] text-purple-300 font-mono mt-0.5">
                              Số QĐ: {item.decision_number}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          <div className="font-bold text-foreground text-xs">{formatVND(item.amount)}</div>
                          {isLatest && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-success/10 text-success text-[10px] font-sans font-bold border border-success/20">
                              🔵 TMĐT Hiện Tại
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {index === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className={diff >= 0 ? 'text-success' : 'text-destructive'}>
                              {diff >= 0 ? `+${formatVND(diff)}` : formatVND(diff)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenViewPhaseDetail(item)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-300 hover:bg-muted transition cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenEditPhase(item)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-300 hover:bg-muted transition cursor-pointer"
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
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition cursor-pointer"
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
                      <td colSpan="6" className="py-8 text-center text-muted-foreground">
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
        <div className="px-6 py-3.5 bg-muted/90 border-t border-border/80 flex items-center justify-end shrink-0">
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
