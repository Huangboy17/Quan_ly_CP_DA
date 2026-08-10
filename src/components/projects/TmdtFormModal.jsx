import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, DollarSign, Calendar, FileText, Sparkles, Paperclip } from 'lucide-react';
import { formatVND, numberToWordsVN } from '../../utils/formatters';

export default function TmdtFormModal({ 
  isOpen, 
  onClose, 
  project, 
  editingPhase = null,
  onSavePhase 
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    content: '',
    decision_number: '',
    reason: '',
    note: '',
    file_name: '',
  });

  const history = Array.isArray(project?.tmdt_history) ? project.tmdt_history : [];

  useEffect(() => {
    if (editingPhase) {
      setFormData({
        date: editingPhase.date || new Date().toISOString().split('T')[0],
        amount: editingPhase.amount !== undefined ? editingPhase.amount : '',
        content: editingPhase.content || '',
        decision_number: editingPhase.decision_number || '',
        reason: editingPhase.reason || '',
        note: editingPhase.note || '',
        file_name: editingPhase.file_name || '',
      });
    } else {
      const isFirst = history.length === 0;
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        content: isFirst ? 'Phê duyệt ban đầu' : 'Điều chỉnh TMĐT',
        decision_number: '',
        reason: isFirst ? 'TMĐT ban đầu được phê duyệt' : '',
        note: '',
        file_name: '',
      });
    }
  }, [editingPhase, isOpen, project]);

  if (!isOpen || !project) return null;

  // Calculate sequence number
  let phaseNumber = 1;
  let prevAmount = 0;

  if (editingPhase) {
    phaseNumber = editingPhase.phase_number || (history.findIndex(h => h.id === editingPhase.id) + 1);
    const prevIdx = history.findIndex(h => h.id === editingPhase.id) - 1;
    prevAmount = prevIdx >= 0 ? Number(history[prevIdx].amount) : 0;
  } else {
    phaseNumber = history.length + 1;
    prevAmount = history.length > 0 ? Number(history[history.length - 1].amount) : 0;
  }

  const newAmountNum = Number(formData.amount || 0);
  const diffAmount = newAmountNum > 0 && prevAmount > 0 ? newAmountNum - prevAmount : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert('Vui lòng nhập Giá trị TMĐT hợp lệ!');
      return;
    }
    if (!formData.content.trim()) {
      alert('Vui lòng nhập Nội dung phê duyệt / điều chỉnh!');
      return;
    }

    onSavePhase(project.id, {
      id: editingPhase?.id,
      date: formData.date,
      amount: Number(formData.amount),
      content: formData.content.trim(),
      decision_number: formData.decision_number.trim(),
      reason: formData.reason.trim(),
      note: formData.note.trim(),
      file_name: formData.file_name.trim(),
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Main Centered Modal Window */}
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-[92vw] max-h-[88vh] shadow-2xl flex flex-col overflow-hidden"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999
        }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              Lần {phaseNumber}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingPhase ? `Cập Nhật Thông Tin Lần ${phaseNumber}` : `Thêm Lần Điều Chỉnh TMĐT (Lần ${phaseNumber})`}
              </h3>
              <p className="text-xs text-blue-300 font-medium truncate max-w-xs">{project.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Ngày Phê Duyệt / Quyết Định <span className="text-rose-400">*</span>
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
                <FileText className="w-3.5 h-3.5 text-purple-400" /> Số Quyết Định Phê Duyệt
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Số 198/QĐ-UBND..."
                value={formData.decision_number}
                onChange={(e) => setFormData({ ...formData, decision_number: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nội Dung Phê Duyệt / Điều Chỉnh <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder={phaseNumber === 1 ? 'Phê duyệt ban đầu' : 'Ví dụ: Điều chỉnh TMĐT lần 2...'}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Tổng Mức Đầu Tư Sau Điều Chỉnh (VNĐ) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="Ví dụ: 1250000000000..."
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
              {[10_000_000_000, 50_000_000_000, 100_000_000_000, 200_000_000_000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    const base = prevAmount > 0 ? prevAmount : 0;
                    setFormData({ ...formData, amount: (base + val).toString() });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-emerald-400 font-mono font-semibold transition cursor-pointer"
                >
                  +{val / 1_000_000_000} Tỷ
                </button>
              ))}
            </div>

            {/* Difference Preview Card */}
            {newAmountNum > 0 && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 text-xs">
                {prevAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span>TMĐT trước điều chỉnh (Lần {phaseNumber - 1}):</span>
                    <span className="font-mono font-semibold text-slate-200">{formatVND(prevAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-200 font-medium">
                  <span>TMĐT sau điều chỉnh (Lần {phaseNumber}):</span>
                  <span className="font-mono font-bold text-emerald-400">{formatVND(newAmountNum)}</span>
                </div>
                {prevAmount > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-700/60 font-mono">
                    <span className="text-slate-400">Giá trị tăng / giảm:</span>
                    <span className={`font-bold ${diffAmount >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {diffAmount >= 0 ? `+${formatVND(diffAmount)}` : formatVND(diffAmount)}
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-emerald-300 italic pt-1 flex items-center gap-1 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Bằng chữ: {numberToWordsVN(newAmountNum)}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Lý Do Điều Chỉnh
            </label>
            <textarea
              rows="2"
              placeholder="Ví dụ: Bổ sung gói thầu hạ tầng giao thông kết nối đô thị..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ghi Chú Đính Kèm
            </label>
            <input
              type="text"
              placeholder="Ghi chú thêm thông tin cơ quan phê duyệt, tiến độ..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-blue-400" /> Tệp Quyết Định Phê Duyệt (Tên file / link)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: QuyetDinh_PheDuyet_Lan4.pdf..."
              value={formData.file_name}
              onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
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
              {editingPhase ? 'Lưu Cập Nhật' : `Lưu Điều Chỉnh Lần ${phaseNumber}`}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
