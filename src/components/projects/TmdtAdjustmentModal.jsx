import React, { useState } from 'react';
import { X, TrendingUp, DollarSign, Calendar, FileText, Sparkles } from 'lucide-react';
import { formatVND, numberToWordsVN } from '../../utils/formatters';

export default function TmdtAdjustmentModal({ isOpen, onClose, project, onSaveAdjustment }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
  });

  if (!isOpen || !project) return null;

  const currentTmdt = project.currentTmdt || 0;
  const newAmountNum = Number(formData.amount || 0);
  const delta = newAmountNum > 0 ? newAmountNum - currentTmdt : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert('Vui lòng nhập giá trị TMĐT mới hợp lệ!');
      return;
    }
    if (!formData.reason.trim()) {
      alert('Vui lòng nhập lý do / nội dung điều chỉnh TMĐT!');
      return;
    }

    onSaveAdjustment(project.id, {
      date: formData.date,
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
    });

    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      reason: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Điều Chỉnh Tổng Mức Đầu Tư (TMĐT)</h3>
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

        {/* Current TMĐT Reference Banner */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">TMĐT Hiện Tại:</span>
            <span className="font-mono font-bold text-white text-sm">{formatVND(currentTmdt)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">Lần điều chỉnh gần nhất:</span>
            <span className="font-mono text-emerald-400">
              {project.tmdt_history?.length || 1} đợt
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Ngày Điều Chỉnh <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Giá Trị TMĐT Mới Mới Phê Duyệt (VNĐ) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="Ví dụ: 520000000000..."
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-3.5 pr-14 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition"
                required
                min="0"
                step="1000000"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                VNĐ
              </span>
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 font-medium">Gợi ý nhanh:</span>
              {[10_000_000_000, 20_000_000_000, 50_000_000_000, 100_000_000_000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: (currentTmdt + val).toString() })}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-emerald-400 font-mono font-semibold transition cursor-pointer"
                >
                  +{val / 1_000_000_000} Tỷ
                </button>
              ))}
            </div>

            {/* Difference & Words */}
            {newAmountNum > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Biến động so với TMĐT hiện tại:</span>
                  <span className={`font-mono font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {delta >= 0 ? `+${formatVND(delta)}` : formatVND(delta)}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-300 italic flex items-center gap-1 font-sans">
                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                  Bằng chữ: {numberToWordsVN(newAmountNum)}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-400" /> Lý Do / Nội Dung Điều Chỉnh <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows="3"
              placeholder="Ví dụ: Điều chỉnh lần 2 theo Quyết định số 198/QĐ-UBND ngày 15/05/2026..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              Lưu Điều Chỉnh TMĐT
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
