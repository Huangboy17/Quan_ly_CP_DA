import React, { useState, useEffect, useMemo } from 'react';
import { X, Wallet, Calendar, AlertCircle, Sparkles, CheckCircle2, Building2, FileText, Check, Lock, ShieldCheck, FileCheck, ArrowRight } from 'lucide-react';
import SearchableCombobox from '../common/SearchableCombobox';
import { 
  formatVND, 
  formatVNDCompact,
  numberToWordsVN, 
  calculateVATValues, 
  formatInputNumber, 
  parseRawNumber,
  formatDisplayDate
} from '../../utils/formatters';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onSavePayment, 
  onSettleContract,
  contracts = [], 
  payments = [],
  editingPayment = null,
  initialContractId = '' 
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [businessType, setBusinessType] = useState('phase'); // 'phase' (Thanh toán theo đợt) | 'settlement' (Quyết toán hợp đồng)

  // Form State for Phase Payment
  const [formData, setFormData] = useState({
    contract_id: '',
    payment_phase: 1,
    payment_date: new Date().toISOString().split('T')[0],
    amount_before_vat: '',
    vat_rate: 10,
    note: '',
  });

  // Form State for Settlement (Quyết toán đợt cuối)
  const [settlementData, setSettlementData] = useState({
    settlement_date: new Date().toISOString().split('T')[0],
    settlement_amount_before_vat: '',
    note: 'Quyết toán hoàn thành & thanh lý HĐ',
  });

  // Settlement VAT rate — user-controlled, independent of contract VAT, defaults to 10%
  const [settlementVatRate, setSettlementVatRate] = useState(10);

  // Extract unique projects list from contracts
  const projectOptions = useMemo(() => {
    const projMap = new Map();
    contracts.forEach(c => {
      if (c.project_id && !projMap.has(c.project_id)) {
        projMap.set(c.project_id, {
          id: c.project_id,
          label: c.projectName || 'Dự án chưa tên',
          subtitle: `Tổng hợp đồng: ${contracts.filter(ct => ct.project_id === c.project_id).length} HĐ`,
          searchTerms: `${c.projectName || ''} ${c.project_id}`
        });
      }
    });
    return Array.from(projMap.values());
  }, [contracts]);

  // Derived contracts list filtered strictly by selectedProjectId
  const contractOptions = useMemo(() => {
    if (!selectedProjectId) return [];
    
    return contracts
      .filter(c => c.project_id === selectedProjectId)
      .map(c => {
        const isSettled = c.status === 'settled';
        return {
          id: c.id,
          label: c.contract_number,
          contractor: c.contractor,
          projectName: c.projectName,
          content: c.content,
          contractValueAfterVAT: c.contractValueAfterVAT || c.contract_value,
          remainingAfterVAT: c.remainingAfterVAT || c.remainingValue,
          vatRate: c.vatRate !== undefined ? c.vatRate : 10,
          status: c.status || 'in_progress',
          badge: isSettled ? '🔵 Đã quyết toán' : `${formatVNDCompact(c.remainingAfterVAT || c.remainingValue)} còn lại`,
          searchTerms: `${c.contract_number} ${c.contractor} ${c.content} ${c.id}`
        };
      });
  }, [contracts, selectedProjectId]);

  const selectedContract = useMemo(() => {
    return contracts.find(c => c.id === formData.contract_id) || null;
  }, [contracts, formData.contract_id]);

  const isContractSettled = selectedContract?.status === 'settled';

  useEffect(() => {
    if (editingPayment) {
      const parentContract = contracts.find(c => c.id === editingPayment.contract_id);
      setSelectedProjectId(parentContract ? parentContract.project_id : '');
      setBusinessType('phase');
      setFormData({
        ...editingPayment,
        amount_before_vat: editingPayment.amount_before_vat || '',
        // Load the payment's own saved vat_rate; fallback to 10 if old data has none
        vat_rate: editingPayment.vat_rate !== undefined ? Number(editingPayment.vat_rate) : 10,
      });
    } else {
      const initialContract = contracts.find(c => c.id === initialContractId);
      const projId = initialContract ? initialContract.project_id : '';
      setSelectedProjectId(projId);
      setBusinessType('phase');

      const targetContractId = initialContractId || '';
      const contractPayments = payments.filter(p => p.contract_id === targetContractId);
      const nextPhase = contractPayments.length > 0 
        ? Math.max(...contractPayments.map(p => Number(p.payment_phase) || 0)) + 1 
        : 1;

      setFormData({
        contract_id: targetContractId,
        payment_phase: nextPhase,
        payment_date: new Date().toISOString().split('T')[0],
        amount_before_vat: '',
        vat_rate: 10,   // Always default 10% for new payments — independent of contract VAT
        note: targetContractId ? `Thanh toán đợt ${nextPhase}` : '',
      });
      setSettlementVatRate(10); // Reset settlement VAT to default 10% for new form

      if (initialContract) {
        setSettlementData({
          settlement_date: new Date().toISOString().split('T')[0],
          settlement_amount_before_vat: initialContract.remainingBeforeVAT || 0,
          note: 'Quyết toán hoàn thành & thanh lý HĐ',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPayment, isOpen, initialContractId]);

  // Handlers for Project & Contract Combobox changes
  const handleProjectSelect = (projOption) => {
    const newProjId = projOption ? projOption.id : '';
    setSelectedProjectId(newProjId);
    
    if (selectedContract && selectedContract.project_id !== newProjId) {
      setFormData(prev => ({
        ...prev,
        contract_id: '',
        note: '',
      }));
    }
  };

  const handleContractSelect = (contractOption) => {
    const newContractId = contractOption ? contractOption.id : '';
    const targetContract = contracts.find(c => c.id === newContractId);

    const contractPayments = payments.filter(p => p.contract_id === newContractId);
    const nextPhase = contractPayments.length > 0 
      ? Math.max(...contractPayments.map(p => Number(p.payment_phase) || 0)) + 1 
      : 1;

    setFormData(prev => ({
      ...prev,
      contract_id: newContractId,
      payment_phase: nextPhase,
      note: newContractId ? `Thanh toán đợt ${nextPhase}` : '',
    }));

    if (targetContract) {
      setSettlementVatRate(10); // Reset settlement VAT to 10% on new contract select
      setSettlementData({
        settlement_date: new Date().toISOString().split('T')[0],
        settlement_amount_before_vat: targetContract.remainingBeforeVAT || 0,
        note: 'Quyết toán hoàn thành & thanh lý HĐ',
      });
    }
  };

  // Contract VAT rate — for reference display only, does NOT control payment VAT
  const contractVatRate = selectedContract ? (selectedContract.vatRate !== undefined ? Number(selectedContract.vatRate) : 10) : 10;

  // Payment-specific VAT rate — user-controlled, defaults to 10% for new payments
  const paymentVatRate = Number(formData.vat_rate !== undefined ? formData.vat_rate : 10);

  // Real-time 3-value VAT calculation using payment's own vat_rate
  const phaseVATValues = calculateVATValues(formData.amount_before_vat, paymentVatRate);

  // Cumulative paid sums before this payment
  const paidBeforeVAT = selectedContract ? (selectedContract.totalPaidBeforeVAT || 0) : 0;
  const paidVAT = selectedContract ? (selectedContract.totalPaidVAT || 0) : 0;
  const paidAfterVAT = selectedContract ? (selectedContract.totalPaidAfterVAT || 0) : 0;

  // Real-time Settlement calculation — uses user-controlled settlementVatRate
  const settlementPhaseBeforeVAT = Number(settlementData.settlement_amount_before_vat || 0);
  const settlementVATValues = calculateVATValues(settlementPhaseBeforeVAT, settlementVatRate);

  const finalSettlementBeforeVAT = paidBeforeVAT + settlementPhaseBeforeVAT;
  const finalSettlementVAT = paidVAT + settlementVATValues.vatAmount;
  const finalSettlementAfterVAT = paidAfterVAT + settlementVATValues.amountAfterVAT;

  const isSettlementOverContract = selectedContract 
    ? (finalSettlementBeforeVAT > (selectedContract.contractValueBeforeVAT || 0)) 
    : false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Vui lòng chọn Dự án!');
      return;
    }
    if (!formData.contract_id) {
      alert('Vui lòng chọn Hợp đồng thanh toán!');
      return;
    }

    if (isContractSettled) {
      alert('Hợp đồng này đã được quyết toán, không thể tạo thêm đợt thanh toán.');
      return;
    }

    if (businessType === 'settlement') {
      if (settlementPhaseBeforeVAT <= 0) {
        alert('Vui lòng nhập Giá trị đợt quyết toán trước VAT hợp lệ!');
        return;
      }
      if (isSettlementOverContract) {
        alert('Giá trị quyết toán trước VAT vượt giá trị hợp đồng trước VAT! Vui lòng kiểm tra lại.');
        return;
      }

      if (onSettleContract) {
        try {
          await onSettleContract(formData.contract_id, {
            ...settlementData,
            settlement_amount_before_vat: settlementPhaseBeforeVAT,
            settlement_amount: settlementVATValues.amountAfterVAT,
            vat_rate: settlementVatRate,
          });
          alert(`Đã quyết toán đợt cuối & khóa hợp đồng ${selectedContract.contract_number} thành công!`);
        } catch (err) {
          alert(
            `Lỗi quyết toán: ${err?.message || 'Không thể hoàn tất quyết toán. Dữ liệu chưa được cập nhật.'}`
          );
          return;
        }
      } else {
        onSavePayment({
          ...formData,
          payment_phase: (selectedContract?.paymentsCount || 0) + 1,
          amount_before_vat: settlementPhaseBeforeVAT,
          vat_rate: contractVatRate,
          vat_amount: settlementVATValues.vatAmount,
          amount_after_vat: settlementVATValues.amountAfterVAT,
          note: settlementData.note || 'Quyết toán hoàn thành hợp đồng',
          payment_type: 'FINAL_SETTLEMENT',
          is_settlement: true,
        });
        alert(`Đã quyết toán đợt cuối & khóa hợp đồng ${selectedContract.contract_number} thành công!`);
      }

    } else {
      if (!formData.amount_before_vat || Number(formData.amount_before_vat) <= 0) {
        alert('Vui lòng nhập Giá trị thanh toán trước VAT hợp lệ!');
        return;
      }

      onSavePayment({
        ...formData,
        payment_phase: Number(formData.payment_phase),
        amount_before_vat: Number(formData.amount_before_vat),
        vat_rate: paymentVatRate,          // payment's own VAT rate (user-set)
        vat_amount: phaseVATValues.vatAmount,
        amount_after_vat: phaseVATValues.amountAfterVAT,
      });
    }

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
                {editingPayment ? 'Cập Nhật Đợt Thanh Toán' : 'Nghiệp Vụ Thanh Toán Hợp Đồng'}
              </h3>
              <p className="text-xs text-slate-400">Mô hình 3 Giá trị: Nhập trước VAT ➔ Tự động tính VAT ({contractVatRate}%) & Sau VAT</p>
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
          
          {/* STEP 1: Select Project Combobox */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              1. Chọn Dự Án <span className="text-rose-400">*</span>
            </label>
            <SearchableCombobox
              options={projectOptions}
              value={selectedProjectId}
              onChange={handleProjectSelect}
              placeholder="Chọn hoặc nhập tên dự án..."
            />
          </div>

          {/* STEP 2: Select Contract Combobox (Filtered strictly by Project) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              2. Chọn Hợp Đồng Thanh Toán <span className="text-rose-400">*</span>
            </label>
            <SearchableCombobox
              options={contractOptions}
              value={formData.contract_id}
              onChange={handleContractSelect}
              disabled={!selectedProjectId}
              disabledPlaceholder="Vui lòng chọn dự án trước"
              placeholder="Nhập số hợp đồng hoặc tên nhà thầu..."
              renderOption={(opt, { isSelected, isHighlighted }) => (
                <div
                  className={`px-3 py-2.5 rounded-lg transition flex items-center justify-between text-xs ${
                    isHighlighted
                      ? 'bg-slate-800 text-white'
                      : isSelected
                      ? 'bg-slate-800/80 text-emerald-300'
                      : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <span className="font-mono text-emerald-400">{opt.label}</span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 text-[10px]">VAT {opt.vatRate}%</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                      {opt.contractor}
                    </div>
                    {opt.content && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {opt.content}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border shadow-sm block ${
                      opt.status === 'settled'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-slate-950 text-amber-400 border-slate-700/80'
                    }`}>
                      {opt.badge}
                    </span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Lock Warning if Contract is Settled */}
          {isContractSettled && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
              <Lock className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200">Hợp đồng này đã được quyết toán, không thể tạo thêm đợt thanh toán.</strong>
                <p className="mt-0.5 text-slate-400">Vui lòng chọn hợp đồng đang thực hiện khác để giải ngân thanh toán.</p>
              </div>
            </div>
          )}

          {/* STEP 3: Business Type Selector (Loại Nghiệp Vụ) */}
          {selectedContract && !isContractSettled && (
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                3. Loại Nghiệp Vụ Thanh Toán
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBusinessType('phase')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    businessType === 'phase'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Wallet className="w-4 h-4" /> ● Thanh toán theo đợt
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessType('settlement')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    businessType === 'settlement'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileCheck className="w-4 h-4" /> ○ Quyết toán hợp đồng (Đợt cuối)
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Deferred Contract Context Summary Card (3-Value Breakdown) */}
          {selectedContract && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Thông tin HĐ {selectedContract.contract_number}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                  Thuế VAT: {contractVatRate}% (Theo HĐ)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5 font-semibold text-[11px]">GIÁ TRỊ HỢP ĐỒNG:</span>
                  <div className="font-mono text-slate-200 text-xs">Trước VAT: {formatVND(selectedContract.contractValueBeforeVAT)}</div>
                  <div className="font-mono text-blue-300 text-xs">Tiền VAT: {formatVND(selectedContract.vatAmount)}</div>
                  <div className="font-mono font-bold text-white text-xs mt-0.5">Sau VAT: {formatVND(selectedContract.contractValueAfterVAT)}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5 font-semibold text-[11px]">ĐÃ THANH TOÁN (LŨY KẾ):</span>
                  <div className="font-mono text-slate-200 text-xs">Trước VAT: {formatVND(selectedContract.totalPaidBeforeVAT)}</div>
                  <div className="font-mono text-blue-300 text-xs">Tiền VAT: {formatVND(selectedContract.totalPaidVAT)}</div>
                  <div className="font-mono font-bold text-emerald-400 text-xs mt-0.5">Sau VAT: {formatVND(selectedContract.totalPaidAfterVAT)}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5 font-semibold text-[11px]">DƯ NỢ CÒN LẠI:</span>
                  <div className="font-mono text-slate-200 text-xs">Trước VAT: {formatVND(selectedContract.remainingBeforeVAT)}</div>
                  <div className="font-mono text-blue-300 text-xs">Tiền VAT: {formatVND(selectedContract.remainingVAT)}</div>
                  <div className="font-mono font-bold text-amber-400 text-xs mt-0.5">Sau VAT: {formatVND(selectedContract.remainingAfterVAT)}</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Form Fields for "Thanh toán theo đợt" (Phase Payment) */}
          {selectedContract && !isContractSettled && businessType === 'phase' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
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

              {/* Value BEFORE VAT & Quick Chips */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Giá Trị Thanh Toán Trước VAT <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                      Tỷ lệ VAT Hợp đồng: {contractVatRate}%
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="2.000.000.000"
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
                      className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition cursor-pointer"
                    >
                      +{amt >= 1_000_000_000 ? `${amt / 1_000_000_000} Tỷ` : `${amt / 1_000_000} Tr`}
                    </button>
                  ))}
                </div>

                {/* VAT RATE INPUT — payment-specific, independent of contract VAT */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Thuế VAT của đợt thanh toán này</label>
                    <span className="text-[11px] text-slate-500">VAT hợp đồng: {contractVatRate}% (tham khảo)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.vat_rate !== undefined ? formData.vat_rate : 10}
                        onChange={(e) => setFormData(prev => ({ ...prev, vat_rate: Number(e.target.value) }))}
                        className="w-full pl-3.5 pr-10 py-2 bg-slate-900 border border-blue-500/40 rounded-xl text-sm font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500 transition"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 5, 8, 10].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, vat_rate: rate }))}
                          className={`px-2.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            Number(formData.vat_rate) === rate
                              ? 'bg-blue-600/30 border border-blue-500 text-blue-300'
                              : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-transparent'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* READ-ONLY AUTO VAT & AFTER VAT PANEL */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Đợt thanh toán trước VAT:</span>
                    <span className="font-mono text-slate-200 font-bold">{formatVND(formData.amount_before_vat)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>+ Tiền VAT ({paymentVatRate}%):</span>
                    <span className="font-mono text-blue-300 font-bold">+{formatVND(phaseVATValues.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-extrabold">
                    <span className="text-white">Tổng Thanh Toán Sau VAT:</span>
                    <span className="font-mono text-emerald-400 text-base">{formatVND(phaseVATValues.amountAfterVAT)}</span>
                  </div>
                </div>

                {/* Text Words */}
                {phaseVATValues.amountAfterVAT > 0 && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Bằng chữ (Sau VAT): </span>
                      <span className="italic">{numberToWordsVN(phaseVATValues.amountAfterVAT)}</span>
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

            </div>
          )}

          {/* STEP 6: Form Fields for "Quyết toán hợp đồng" (Final Settlement Payment Milestone) */}
          {selectedContract && !isContractSettled && businessType === 'settlement' && (
            <div className="space-y-4 animate-in fade-in duration-150 p-4.5 rounded-xl bg-blue-950/30 border border-blue-800/50">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">
                <FileCheck className="w-4 h-4 text-blue-400" />
                Quyết toán hợp đồng (Đợt thanh toán cuối cùng)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ngày Quyết Toán <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={settlementData.settlement_date}
                    onChange={(e) => setSettlementData({ ...settlementData, settlement_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Giá Trị Đợt Quyết Toán (Trước VAT) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="13.120.000.000"
                      value={formatInputNumber(settlementData.settlement_amount_before_vat)}
                      onChange={(e) => setSettlementData({ ...settlementData, settlement_amount_before_vat: parseRawNumber(e.target.value) })}
                      className="w-full pl-3.5 pr-12 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500 transition"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      VNĐ
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    VAT (%) <span className="text-blue-400 font-normal text-[11px] ml-1">— của đợt quyết toán này</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={settlementVatRate}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setSettlementVatRate(isNaN(v) ? 0 : Math.max(0, Math.min(100, v)));
                      }}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-blue-700/60 rounded-xl text-sm font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">HĐ: {contractVatRate}% (tham khảo)</p>
                </div>
              </div>

              {/* READ-ONLY 3-VALUE SETTLEMENT CALCULATION CARD */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                <div className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>CẤU TRÚC GIÁ TRỊ QUYẾT TOÁN CUỐI CÙNG</span>
                  <span className="text-blue-400 font-mono">VAT {settlementVatRate}%</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Đã thanh toán trước (Lũy kế):</span>
                  <div className="font-mono text-right">
                    <span className="text-slate-200">{formatVND(paidBeforeVAT)}</span>
                    <span className="text-slate-400 text-[11px] block">VAT: {formatVND(paidVAT)} | Sau VAT: {formatVND(paidAfterVAT)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>+ Đợt quyết toán (đợt cuối):</span>
                  <div className="font-mono text-right text-blue-300 font-bold">
                    <span>+{formatVND(settlementPhaseBeforeVAT)}</span>
                    <span className="text-blue-400 text-[11px] block">VAT: +{formatVND(settlementVATValues.vatAmount)} | Sau VAT: +{formatVND(settlementVATValues.amountAfterVAT)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span>= Tổng Quyết Toán Trước VAT:</span>
                    <span className="font-mono text-slate-100">{formatVND(finalSettlementBeforeVAT)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-blue-300">
                    <span>= Tổng VAT Quyết Toán ({settlementVatRate}%):</span>
                    <span className="font-mono text-blue-300">+{formatVND(finalSettlementVAT)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-sm font-extrabold text-purple-300 border-t border-slate-900">
                    <span>= Giá Trị Quyết Toán Sau VAT:</span>
                    <span className="font-mono text-base">{formatVND(finalSettlementAfterVAT)}</span>
                  </div>
                </div>
              </div>

              {/* VALIDATION WARNING ERROR */}
              {isSettlementOverContract ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <strong>Giá trị quyết toán vượt giá trị hợp đồng trước VAT!</strong>
                    <p className="mt-0.5 text-rose-300/80">Lũy kế trước VAT ({formatVND(finalSettlementBeforeVAT)}) lớn hơn Giá trị HĐ trước VAT ({formatVND(selectedContract.contractValueBeforeVAT)}). Vui lòng điều chỉnh lại số tiền đợt quyết toán.</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Sau khi lưu đợt quyết toán, hệ thống sẽ ghi nhận đợt thanh toán cuối (Đợt {(selectedContract.paymentsCount || 0) + 1}), cập nhật tổng quyết toán thành <strong>{formatVND(finalSettlementAfterVAT)} (Sau VAT)</strong> và chuyển trạng thái HĐ thành <strong>🔵 Đã quyết toán</strong> (khóa thanh toán).
                  </span>
                </div>
              )}

              {/* Note Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ghi Chú Quyết Toán
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú hoàn thành & nghiệm thu thanh lý hợp đồng..."
                  value={settlementData.note}
                  onChange={(e) => setSettlementData({ ...settlementData, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy Bỏ
            </button>

            {selectedContract && !isContractSettled && (
              <button
                type="submit"
                disabled={businessType === 'settlement' && isSettlementOverContract}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-semibold shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  businessType === 'settlement'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                {businessType === 'settlement' ? (
                  <>
                    <FileCheck className="w-4 h-4" /> Lưu Quyết Toán Đợt Cuối & Khóa HĐ
                  </>
                ) : (
                  <>
                    {editingPayment ? 'Lưu Thay Đổi' : 'Xác Nhận Thanh Toán'}
                  </>
                )}
              </button>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}
