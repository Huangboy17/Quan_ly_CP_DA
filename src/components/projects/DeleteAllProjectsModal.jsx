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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-lg w-full shadow-2xl shadow-rose-950/50 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-rose-950/40 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                XÓA TẤT CẢ DỰ ÁN?
              </h3>
              <p className="text-xs text-rose-300/80">Cảnh báo hành động nguy hiểm không thể hoàn tác</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Main Warning Box */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2 text-slate-300">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Cảnh báo dữ liệu hệ thống
            </div>
            <p className="text-slate-300 leading-relaxed font-medium">
              Thao tác này sẽ xóa toàn bộ dữ liệu dự án hiện tại, bao gồm:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 font-medium">
              <li>Danh sách dự án ({projectsCount} dự án)</li>
              <li>Hợp đồng thuộc các dự án ({contractsCount} hợp đồng)</li>
              <li>Các đợt thanh toán thuộc các hợp đồng ({paymentsCount} đợt thanh toán)</li>
              <li>Các dữ liệu liên quan đến dự án</li>
            </ul>
            <div className="pt-2 text-rose-400 font-extrabold flex items-center gap-1.5 border-t border-rose-500/20">
              ⚠️ Thao tác này không thể hoàn tác.
            </div>
          </div>

          {/* Current Projects Count Badge */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-slate-300">
            <span className="font-semibold text-slate-400">Tổng số lượng dự án sẽ bị xóa:</span>
            <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 text-sm">
              Bạn hiện có {projectsCount} dự án
            </span>
          </div>

          {/* 2-Step Confirmation Input Box */}
          <div className="space-y-2 pt-1">
            <label className="block text-slate-200 font-bold">
              Vui lòng nhập <span className="text-rose-400 font-mono font-extrabold underline">XOA</span> để xác nhận:
            </label>
            <input
              type="text"
              placeholder="Nhập XOA để xác nhận..."
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono font-bold text-rose-400 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
              autoFocus
            />
            {confirmText && !isConfirmed && (
              <p className="text-[11px] text-amber-400 font-mono">
                Chưa khớp từ khóa. Vui lòng nhập chính xác từ "XOA" (chữ in hoa).
              </p>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isConfirmed}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isConfirmed
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
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
