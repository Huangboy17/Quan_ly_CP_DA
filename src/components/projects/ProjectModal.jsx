import React, { useState, useEffect } from 'react';
import { X, Building2, DollarSign, Sparkles } from 'lucide-react';
import { formatVND, numberToWordsVN } from '../../utils/formatters';

export default function ProjectModal({ isOpen, onClose, onSaveProject, editingProject = null }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_tmdt: '',
  });

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name || '',
        description: editingProject.description || '',
        initial_tmdt: editingProject.initial_tmdt !== undefined && editingProject.initial_tmdt !== null ? editingProject.initial_tmdt : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        initial_tmdt: '',
      });
    }
  }, [editingProject, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập Tên Dự án!');
      return;
    }

    onSaveProject({
      ...editingProject,
      name: formData.name.trim(),
      description: formData.description.trim(),
      initial_tmdt: formData.initial_tmdt ? Number(formData.initial_tmdt) : 0,
    });

    onClose();
  };

  const initialTmdtNum = Number(formData.initial_tmdt || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingProject ? 'Cập Nhật Dự Án' : 'Khởi Tạo Dự Án Mới'}
              </h3>
              <p className="text-xs text-slate-400">Thiết lập thông tin công trình & Tổng mức đầu tư ban đầu (TMĐT)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tên Dự Án / Công Trình <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Khu Đô Thị Sông Hồng Riverside..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* TMĐT Ban đầu */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Tổng Mức Đầu Tư Ban Đầu (TMĐT Được Phê Duyệt)
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="Nhập số tiền VNĐ (Ví dụ: 500000000000)..."
                value={formData.initial_tmdt}
                onChange={(e) => setFormData({ ...formData, initial_tmdt: e.target.value })}
                className="w-full pl-3.5 pr-14 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition"
                min="0"
                step="1000000"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                VNĐ
              </span>
            </div>

            {/* Quick Add Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 font-medium">Cộng nhanh:</span>
              {[10_000_000_000, 50_000_000_000, 100_000_000_000, 500_000_000_000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    const current = Number(formData.initial_tmdt || 0);
                    setFormData({ ...formData, initial_tmdt: (current + val).toString() });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-emerald-400 font-mono font-semibold transition cursor-pointer"
                >
                  +{val / 1_000_000_000} Tỷ
                </button>
              ))}
            </div>

            {/* Readout */}
            {initialTmdtNum > 0 && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 space-y-0.5">
                <div>Định dạng: <span className="font-bold text-white">{formatVND(initialTmdtNum)}</span></div>
                <div className="text-[11px] text-emerald-400 font-sans italic flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                  Bằng chữ: {numberToWordsVN(initialTmdtNum)}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mô Tả / Quy Mô Dự Án
            </label>
            <textarea
              rows="3"
              placeholder="Mô tả vị trí, diện tích, quy mô hạng mục công trình..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Modal Footer */}
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
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              {editingProject ? 'Lưu Thay Đổi' : 'Tạo Dự Án'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
