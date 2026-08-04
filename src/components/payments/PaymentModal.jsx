import React, { useState, useEffect } from 'react';
import { X, Wallet, Calendar, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { 
  formatVND, 
  numberToWordsVN, 
  calculateVAT, 
  formatInputNumber, 
  parseRawNumber 
} from '../../utils/formatters';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onSavePayment, 
  contracts = [], 
  payments = [],
  editingPayment = null,
  initialContractId = '' 
}) {
  const [formData, setFormData] = useState({
    contract_id: '',
    payment_phase: 1,
    payment_date: new Date().toISOString().split('T')[0],
    amount_before_vat: '',
    vat_rate: 10,
    note: '',
  });

  useEffect(() => {
    if (editingPayment) {
      setFormData({
        ...editingPayment,
        amount_before_vat: editingPayment.amount_before_vat || '',
      });
    } else {
      const selectedId = initialContractId || contracts[0]?.id || '';
      // Determine next phase for this contract
      const contractPayments = payments.filter(p => p.contract_id === selectedId);
      const nextPhase = contractPayments.length > 0 
        ? Math.max(...contractPayments.map(p => Number(p.payment_phase) || 0)) + 1 
        : 1;

      setFormData({
        contract_id: selectedId,
        payment_phase: nextPhase,
        payment_date: new Date().toISOString().split('T')[0],
        amount_before_vat: '',
        vat_rate: 10,
        note: `Thanh toán đợt ${nextPhase}`,
      });
    }
  }, [editingPayment, isOpen, initialContractId, contracts]);

  const selectedContract = contracts.find(c => c.id === formData.contract_id);

  // When contract changes, auto suggest next phase number
  const handleContractChange = (cId) => {
    const contractPayments = payments.filter(p => p.contract_id === cId);
    const nextPhase = contractPayments.length > 0 
      ? Math.max(...contractPayments.map(p => Number(p.payment_phase) || 0)) + 1 
      : 1;

    setFormData(prev => ({
      ...prev,
      contract_id: cId,
      payment_phase: nextPhase,
      note: `Thanh toán đợt ${nextPhase}`,
    }));
  };

  // Real-time calculation
  const { vatAmount, amountAfterVat } = calculateVAT(formData.amount_before_vat, formData.vat_rate);

  // Balance remaining after this payment
  const currentPaid = selectedContract ? selectedContract.totalPaid : 0;
  // If editing, subtract old payment amount first
  const adjustedCurrentPaid = editingPayment 
    ? Math.max(0, currentPaid - Number(editingPayment.amount_after_vat || 0)) 
    : currentPaid;
  const newTotalPaid = adjustedCurrentPaid + amountAfterVat;
  const remainingAfterPayment = selectedContract ? (selectedContract.contract_value - newTotalPaid) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.contract_id) {
      alert('Vui lòng chọn Hợp đồng!');
      return;
    }
    if (!formData.amount_before_vat || Number(formData.amount_before_vat) <= 0) {
      alert('Vui lòng nhập Giá trị thanh toán trước VAT hợp lệ!');
      return;
    }

    onSavePayment({
      ...formData,
      payment_phase: Number(formData.payment_phase),
      amount_before_vat: Number(formData.amount_before_vat),
      vat_rate: Number(formData.vat_rate),
      vat_amount: vatAmount,
      amount_after_vat: amountAfterVat,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingPayment ? 'Cập Nhật Đợt Thanh Toán' : 'Tạo Đợt Thanh Toán Mới'}
              </h3>
              <p className="text-xs text-slate-400">Nhập giá trị trước VAT, mức thuế & tự động tính tổng tiền thanh toán</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Select Contract */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Chọn Hợp Đồng Thanh Toán <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.contract_id}
              onChange={(e) => handleContractChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition font-mono"
              required
            >
              <option value="">-- Chọn hợp đồng --</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contract_number} | {c.projectName} - {c.contractor} (Còn lại: {formatVND(c.remainingValue)})
                </option>
              ))}
            </select>
          </div>

          {/* Contract Context Info Card */}
          {selectedContract && (
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Giá trị HĐ: </span>
                <span className="font-bold text-white font-mono">{formatVND(selectedContract.contract_value)}</span>
              </div>
              <div>
                <span className="text-slate-400">Đã chi: </span>
                <span className="font-bold text-emerald-400 font-mono">{formatVND(selectedContract.totalPaid)}</span>
              </div>
              <div>
                <span className="text-slate-400">Dư nợ còn lại: </span>
                <span className="font-bold text-amber-400 font-mono">{formatVND(selectedContract.remainingValue)}</span>
              </div>
            </div>
          )}

          {/* Payment Phase & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Đợt Thanh Toán <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.payment_phase}
                  onChange={(e) => setFormData({ ...formData, payment_phase: e.target.value })}
                  className="w-full pl-12 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Đợt
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ngày Thanh Toán <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>
          </div>

          {/* Value before VAT & Quick Chips */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Giá Trị Trước VAT <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="500.000.000"
                  value={formatInputNumber(formData.amount_before_vat)}
                  onChange={(e) => setFormData({ ...formData, amount_before_vat: parseRawNumber(e.target.value) })}
                  className="w-full pl-3.5 pr-12 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  VNĐ
                </span>
              </div>
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Cộng nhanh:</span>
              {[100_000_000, 500_000_000, 1_000_000_000, 2_000_000_000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    amount_before_vat: (Number(prev.amount_before_vat || 0) + amt)
                  }))}
                  className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition"
                >
                  +{amt >= 1_000_000_000 ? `${amt / 1_000_000_000} Tỷ` : `${amt / 1_000_000} Tr`}
                </button>
              ))}
            </div>

            {/* VAT Rate Selection Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mức Thuế VAT
              </label>
              <div className="flex items-center gap-2">
                {[5, 8, 10].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFormData({ ...formData, vat_rate: rate })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition border ${
                      formData.vat_rate === rate
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    VAT {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Realtime Calculation Preview Panel */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tiền hàng trước VAT:</span>
                <span className="font-mono text-slate-200">{formatVND(formData.amount_before_vat)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tiền thuế VAT ({formData.vat_rate}%):</span>
                <span className="font-mono text-slate-300">+{formatVND(vatAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold">
                <span className="text-white">Tổng Thanh Toán Sau VAT:</span>
                <span className="font-mono text-emerald-400 text-base">{formatVND(amountAfterVat)}</span>
              </div>

              {selectedContract && (
                <div className={`pt-2 border-t border-slate-800/80 flex items-center justify-between ${
                  remainingAfterPayment < 0 ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  <span>Dư nợ hợp đồng còn lại sau đợt này:</span>
                  <span className="font-mono font-bold">
                    {remainingAfterPayment < 0 ? 'Vượt hợp đồng: ' : ''}{formatVND(remainingAfterPayment)}
                  </span>
                </div>
              )}
            </div>

            {/* Text Words */}
            {amountAfterVat > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Bằng chữ: </span>
                  <span className="italic">{numberToWordsVN(amountAfterVat)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Note Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ghi Chú Thanh Toán
            </label>
            <input
              type="text"
              placeholder="Ghi chú nội dung nghiệm thu, số hóa đơn GTGT..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Modal Footer Actions */}
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
              {editingPayment ? 'Lưu Thay Đổi' : 'Xác Nhận Thanh Toán'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
