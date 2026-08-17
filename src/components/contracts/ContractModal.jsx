import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, Building2, Plus, Sparkles, Tag } from 'lucide-react';
import { 
  formatVND, 
  numberToWordsVN, 
  calcEndDate, 
  calcDaysBetween, 
  formatInputNumber, 
  parseRawNumber,
  calculateVATValues
} from '../../utils/formatters';

export const COST_GROUP_OPTIONS = [
  'Xây dựng - Thiết bị',
  'Chi phí QLDA',
  'Tư vấn',
  'Chi phí khác',
  'Lãi vay',
  'Khác',
];

export default function ContractModal({ 
  isOpen, 
  onClose, 
  onSaveContract, 
  projects = [], 
  editingContract = null,
  onOpenNewProjectModal 
}) {
  const [formData, setFormData] = useState({
    project_id: '',
    contract_number: '',
    content: '',
    contractValueBeforeVAT: '',
    vatRate: 10,
    isCustomVat: false,
    customVatRate: '',
    contractor: '',
    signing_date: new Date().toISOString().split('T')[0],
    duration_type: 'days', // 'days' | 'end_date'
    execution_days: 90,
    end_date: '',
    costGroup: '', // Default: '' (Chưa phân loại)
    costGroupNote: '',
    estimated_settlement_value: '',
  });

  const [settlementTouched, setSettlementTouched] = useState(false);

  useEffect(() => {
    if (editingContract) {
      const vRate = editingContract.vatRate !== undefined ? Number(editingContract.vatRate) : 10;
      const isCustom = ![5, 8, 10].includes(vRate);
      const beforeVAT = editingContract.contractValueBeforeVAT || editingContract.contract_value || '';

      setFormData({
        ...editingContract,
        contractValueBeforeVAT: beforeVAT,
        vatRate: vRate,
        isCustomVat: isCustom,
        customVatRate: isCustom ? vRate.toString() : '',
        costGroup: editingContract.costGroup || '',
        costGroupNote: editingContract.costGroupNote || '',
        estimated_settlement_value: editingContract.estimated_settlement_value || '',
        execution_days: editingContract.execution_days || 90,
        duration_type: editingContract.duration_type || 'days',
      });
      setSettlementTouched(true);
    } else {
      const defaultSigning = new Date().toISOString().split('T')[0];
      const defaultDays = 90;
      setFormData({
        project_id: projects[0]?.id || '',
        contract_number: `HĐ-${new Date().getFullYear()}/` + Math.floor(100 + Math.random() * 900),
        content: '',
        contractValueBeforeVAT: '',
        vatRate: 10,
        isCustomVat: false,
        customVatRate: '',
        contractor: '',
        signing_date: defaultSigning,
        duration_type: 'days',
        execution_days: defaultDays,
        end_date: calcEndDate(defaultSigning, defaultDays),
        costGroup: '', // Default: '' (Chưa phân loại)
        costGroupNote: '',
        estimated_settlement_value: '',
      });
      setSettlementTouched(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingContract, isOpen]);

  const handleSigningDateChange = (date) => {
    setFormData(prev => {
      let updatedEnd = prev.end_date;
      let updatedDays = prev.execution_days;
      if (prev.duration_type === 'days' && prev.execution_days) {
        updatedEnd = calcEndDate(date, prev.execution_days);
      } else if (prev.duration_type === 'end_date' && prev.end_date) {
        updatedDays = calcDaysBetween(date, prev.end_date);
      }
      return {
        ...prev,
        signing_date: date,
        end_date: updatedEnd,
        execution_days: updatedDays
      };
    });
  };

  const handleDaysChange = (daysVal) => {
    const days = parseInt(daysVal, 10) || 0;
    setFormData(prev => {
      const computedEnd = calcEndDate(prev.signing_date, days);
      return {
        ...prev,
        execution_days: days,
        end_date: computedEnd
      };
    });
  };

  const handleEndDateChange = (date) => {
    setFormData(prev => {
      const computedDays = calcDaysBetween(prev.signing_date, date);
      return {
        ...prev,
        end_date: date,
        execution_days: computedDays
      };
    });
  };

  const handleBeforeVATChange = (valStr) => {
    const rawVal = parseRawNumber(valStr);
    setFormData(prev => {
      const currentRate = prev.isCustomVat ? (Number(prev.customVatRate) || 0) : prev.vatRate;
      const calculated = calculateVATValues(rawVal, currentRate);
      const shouldUpdateSettlement = !settlementTouched || !prev.estimated_settlement_value;
      return {
        ...prev,
        contractValueBeforeVAT: rawVal,
        estimated_settlement_value: shouldUpdateSettlement ? calculated.amountAfterVAT : prev.estimated_settlement_value
      };
    });
  };

  const handleVatRateSelect = (rate, isCustom = false) => {
    setFormData(prev => {
      const activeRate = isCustom ? (Number(prev.customVatRate) || 0) : rate;
      const calculated = calculateVATValues(prev.contractValueBeforeVAT, activeRate);
      const shouldUpdateSettlement = !settlementTouched || !prev.estimated_settlement_value;
      return {
        ...prev,
        vatRate: activeRate,
        isCustomVat: isCustom,
        estimated_settlement_value: shouldUpdateSettlement ? calculated.amountAfterVAT : prev.estimated_settlement_value
      };
    });
  };

  const handleCustomVatInputChange = (valStr) => {
    const rateNum = Math.max(0, Math.min(100, Number(valStr) || 0));
    setFormData(prev => {
      const calculated = calculateVATValues(prev.contractValueBeforeVAT, rateNum);
      const shouldUpdateSettlement = !settlementTouched || !prev.estimated_settlement_value;
      return {
        ...prev,
        customVatRate: valStr,
        vatRate: rateNum,
        estimated_settlement_value: shouldUpdateSettlement ? calculated.amountAfterVAT : prev.estimated_settlement_value
      };
    });
  };

  // Real-time calculation of VAT & Total After VAT
  const activeVatRate = formData.isCustomVat ? (Number(formData.customVatRate) || 0) : formData.vatRate;
  const { amountBeforeVAT, vatAmount, amountAfterVAT } = calculateVATValues(formData.contractValueBeforeVAT, activeVatRate);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_id) {
      alert('Vui lòng chọn Dự án!');
      return;
    }
    if (!formData.contract_number) {
      alert('Vui lòng nhập Số Hợp đồng!');
      return;
    }
    if (!formData.contractValueBeforeVAT || Number(formData.contractValueBeforeVAT) <= 0) {
      alert('Vui lòng nhập Giá trị Hợp đồng trước VAT hợp lệ!');
      return;
    }

    onSaveContract({
      ...formData,
      contractValueBeforeVAT: amountBeforeVAT,
      vatRate: activeVatRate,
      vatAmount: vatAmount,
      contractValueAfterVAT: amountAfterVAT,
      contract_value: amountAfterVAT,
      costGroup: formData.costGroup || '',
      costGroupNote: formData.costGroup === 'Khác' ? (formData.costGroupNote || '') : '',
      estimated_settlement_value: formData.estimated_settlement_value 
        ? Number(formData.estimated_settlement_value) 
        : amountAfterVAT,
      execution_days: Number(formData.execution_days || 0),
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
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingContract ? 'Cập Nhật Hợp Đồng' : 'Thêm Hợp Đồng Mới'}
              </h3>
              <p className="text-xs text-slate-400">Nhập đầy đủ thông tin hợp đồng và phân loại Nhóm chi phí</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* STT 1: Mã dự án */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                1. Mã dự án <span className="text-rose-400">*</span>
              </label>
              {onOpenNewProjectModal && (
                <button
                  type="button"
                  onClick={onOpenNewProjectModal}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Dự án mới
                </button>
              )}
            </div>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              required
            >
              <option value="">-- Chọn dự án --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code || p.id})</option>
              ))}
            </select>
          </div>

          {/* STT 2: Số hợp đồng */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              2. Số hợp đồng <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: HĐ-2026/SH-01"
              value={formData.contract_number}
              onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition"
              required
            />
          </div>

          {/* STT 3: Nội dung hợp đồng */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              3. Nội dung hợp đồng / Gói thầu
            </label>
            <input
              type="text"
              placeholder="Nội dung tóm tắt hạng mục công việc..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* STT 4, 5, 6: GIÁ TRỊ HỢP ĐỒNG (Trước VAT, VAT %, Sau VAT) */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Mô Hình Giá Trị Hợp Đồng & Thuế VAT
              </span>
            </div>

            {/* STT 4: Giá trị trước VAT */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                4. Giá trị trước VAT <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="5.000.000.000"
                  value={formatInputNumber(formData.contractValueBeforeVAT)}
                  onChange={(e) => handleBeforeVATChange(e.target.value)}
                  className="w-full pl-3.5 pr-12 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  VNĐ
                </span>
              </div>
            </div>

            {/* STT 5: VAT (%) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                5. VAT (%) <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[5, 8, 10].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleVatRateSelect(rate, false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer border ${
                      !formData.isCustomVat && formData.vatRate === rate
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    VAT {rate}%
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => handleVatRateSelect(12, true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer border ${
                    formData.isCustomVat
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  ☐ Khác
                </button>
              </div>

              {formData.isCustomVat && (
                <div className="mt-2.5 flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="text-xs font-medium text-purple-300">Nhập tỷ lệ VAT tùy chỉnh:</span>
                  <div className="relative w-32">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="12"
                      value={formData.customVatRate}
                      onChange={(e) => handleCustomVatInputChange(e.target.value)}
                      className="w-full pl-3 pr-7 py-1.5 bg-slate-900 border border-purple-500/50 rounded-lg text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* STT 6: Giá trị sau VAT (Tự động tính) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Giá trị trước VAT:</span>
                <span className="font-mono text-slate-200 font-bold">{formatVND(amountBeforeVAT)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>+ Tiền VAT ({activeVatRate}%):</span>
                <span className="font-mono text-blue-300 font-bold">+{formatVND(vatAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-extrabold">
                <span className="text-white">6. Giá trị sau VAT (Tự động tính):</span>
                <span className="font-mono text-emerald-400 text-base">{formatVND(amountAfterVAT)}</span>
              </div>
            </div>
          </div>

          {/* STT 7: Nhà thầu */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              7. Nhà thầu / Đơn vị thi công <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Tên công ty nhà thầu..."
              value={formData.contractor}
              onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* STT 8, 9, 10: THỜI GIAN VÀ TIẾN ĐỘ (Ngày ký, Tiến độ HĐ, Ngày kết thúc) */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Thời Gian & Tiến Độ Thực Hiện Hợp Đồng
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* STT 8: Ngày ký */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  8. Ngày ký
                </label>
                <input
                  type="date"
                  value={formData.signing_date}
                  onChange={(e) => handleSigningDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* STT 9: Tiến độ HĐ (ngày) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  9. Tiến độ HĐ (ngày)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="365"
                  value={formData.execution_days}
                  onChange={(e) => handleDaysChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-amber-300 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* STT 10: Ngày kết thúc (Tự động tính) */}
              <div>
                <label className="block font-semibold text-slate-400 mb-1">
                  10. Ngày kết thúc (Tự động tính)
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* STT 11: NHÓM CHI PHÍ */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                11. Nhóm chi phí
              </label>
            </div>

            <div>
              <select
                value={formData.costGroup}
                onChange={(e) => setFormData({ ...formData, costGroup: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-semibold cursor-pointer transition"
              >
                <option value="">-- Chưa phân loại / Để trống --</option>
                {COST_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* Ghi chú nhóm chi phí khi chọn "Khác" */}
            {formData.costGroup === 'Khác' && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                <label className="block text-xs font-semibold text-purple-300">
                  Ghi chú nhóm chi phí <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bảo hiểm công trình, Chi phí dự phòng..."
                  value={formData.costGroupNote}
                  onChange={(e) => setFormData({ ...formData, costGroupNote: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-purple-500/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition"
                  required={formData.costGroup === 'Khác'}
                />
              </div>
            )}
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
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              {editingContract ? 'Lưu Thay Đổi' : 'Tạo Hợp Đồng'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
