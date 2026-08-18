import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export default function DeleteAllProjectsModal({
  isOpen,
  onClose,
  projectsCount = 0,
  contractsCount = 0,
  paymentsCount = 0,
  onConfirmDeleteAll,
}) {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim() === 'XOA';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed) return;

    onConfirmDeleteAll();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-fade-in">
      <div className="bg-card border border-destructive/40 rounded-2xl max-w-lg w-full shadow-2xl shadow-rose-950/50 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-rose-950/40 border-b border-destructive/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 border border-destructive/40 flex items-center justify-center text-destructive shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground tracking-wide uppercase">
                XÓA TẤT CẢ DỰ ÁN?
              </h3>
              <p className="text-xs text-rose-300/80">Cảnh báo hành động nguy hiểm không thể hoàn tác</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Main Warning Box */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-destructive/30 space-y-2 text-foreground/80">
            <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Cảnh báo dữ liệu hệ thống
            </div>
            <p className="text-foreground/80 leading-relaxed font-medium">
              Thao tác này sẽ xóa toàn bộ dữ liệu dự án hiện tại, bao gồm:
            </p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80 pl-1 font-medium">
              <li>Danh sách dự án ({projectsCount} dự án)</li>
              <li>Hợp đồng thuộc các dự án ({contractsCount} hợp đồng)</li>
              <li>Các đợt thanh toán thuộc các hợp đồng ({paymentsCount} đợt thanh toán)</li>
              <li>Các dữ liệu liên quan đến dự án</li>
            </ul>
            <div className="pt-2 text-destructive font-extrabold flex items-center gap-1.5 border-t border-destructive/20">
              ⚠️ Thao tác này không thể hoàn tác.
            </div>
          </div>

          {/* Current Projects Count Badge */}
          <div className="p-3 rounded-xl bg-muted/80 border border-border/80 flex items-center justify-between text-foreground/80">
            <span className="font-semibold text-muted-foreground">Tổng số lượng dự án sẽ bị xóa:</span>
            <span className="font-mono font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg border border-destructive/30 text-sm">
              Bạn hiện có {projectsCount} dự án
            </span>
          </div>

          {/* 2-Step Confirmation Input Box */}
          <div className="space-y-2 pt-1">
            <label className="block text-foreground font-bold">
              Vui lòng nhập <span className="text-destructive font-mono font-extrabold underline">XOA</span> để xác nhận:
            </label>
            <input
              type="text"
              placeholder="Nhập XOA để xác nhận..."
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono font-bold text-destructive placeholder:text-slate-600 focus:outline-none focus:border-destructive focus:ring-1 focus:ring-rose-500 transition"
              autoFocus
            />
            {confirmText && !isConfirmed && (
              <p className="text-[11px] text-warning font-mono">
                Chưa khớp từ khóa. Vui lòng nhập chính xác từ "XOA" (chữ in hoa).
              </p>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isConfirmed}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isConfirmed
                  ? 'bg-destructive hover:bg-destructive text-foreground shadow-lg shadow-rose-600/30 cursor-pointer'
                  : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Xóa tất cả
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
