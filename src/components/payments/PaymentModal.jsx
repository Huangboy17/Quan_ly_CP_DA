import React, { useState, useEffect, useMemo } from 'react';
import { X, Wallet, Calendar, AlertCircle, Sparkles, CheckCircle2, Building2, FileText, Check, Lock, ShieldCheck, FileCheck, ArrowRight } from 'lucide-react';
import SearchableCombobox from '../common/SearchableCombobox';
import { 
  formatVND, 
  formatVNDCompact,
  numberToWordsVN, 
  calculateVATValues, 
  calculateVATFromAfter,
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

  // Settlement VAT rate – user-controlled, independent of contract VAT, defaults to 10%
  const [settlementVatRate, setSettlementVatRate] = useState(10);

  // Payment VAT input mode: 'before' or 'after'
  const [paymentVatInputMode, setPaymentVatInputMode] = useState('before');
  const [amountAfterVatInput, setAmountAfterVatInput] = useState('');

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
          badge: isSettled ? '🔒 Đã quyết toán' : `${formatVNDCompact(c.remainingAfterVAT || c.remainingValue)} còn lại`,
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
        vat_rate: 10,   // Always default 10% for new payments – independent of contract VAT
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

  // Contract VAT rate – for reference display only, does NOT control payment VAT
  const contractVatRate = selectedContract ? (selectedContract.vatRate !== undefined ? Number(selectedContract.vatRate) : 10) : 10;

  // Payment-specific VAT rate – user-controlled, defaults to 10% for new payments
  const paymentVatRate = Number(formData.vat_rate !== undefined ? formData.vat_rate : 10);

  // Real-time 3-value VAT calculation using payment's own vat_rate
  const phaseVATValues = paymentVatInputMode === 'after' && amountAfterVatInput
    ? calculateVATFromAfter(amountAfterVatInput, paymentVatRate)
    : calculateVATValues(formData.amount_before_vat, paymentVatRate);

  // Cumulative paid sums before this payment
  const paidBeforeVAT = selectedContract ? (selectedContract.totalPaidBeforeVAT || 0) : 0;
  const paidVAT = selectedContract ? (selectedContract.totalPaidVAT || 0) : 0;
  const paidAfterVAT = selectedContract ? (selectedContract.totalPaidAfterVAT || 0) : 0;

  // Real-time Settlement calculation – uses user-controlled settlementVatRate
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
      if (paymentVatInputMode === 'before') {
        if (!formData.amount_before_vat || Number(formData.amount_before_vat) <= 0) {
          alert('Vui lòng nhập Giá trị thanh toán trước VAT hợp lệ!');
          return;
        }
      } else {
        if (!amountAfterVatInput || Number(amountAfterVatInput) <= 0) {
          alert('Vui lòng nhập Giá trị thanh toán sau VAT hợp lệ!');
          return;
        }
      }

      onSavePayment({
        ...formData,
        payment_phase: Number(formData.payment_phase),
        amount_before_vat: phaseVATValues.amountBeforeVAT,
        vat_rate: paymentVatRate,
        vat_amount: phaseVATValues.vatAmount,
        amount_after_vat: phaseVATValues.amountAfterVAT,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-6 pb-6 px-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full mx-2 md:mx-auto shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Modal Header (Fixed) */}
        <div className="px-6 py-3.5 bg-muted/90 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success/20 border border-success/30 flex items-center justify-center text-success">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {editingPayment 
                  ? 'Cập Nhật Đợt Thanh Toán' 
                  : businessType === 'settlement' 
                  ? 'Quyết Toán Hợp Đồng (Đợt Cuối)' 
                  : 'Nghiệp Vụ Thanh Toán Hợp Đồng'}
              </h3>
              <p className="text-xs text-muted-foreground">Mô hình 3 Giá trị: Nhập trước VAT ➜ Tự động tính VAT ({contractVatRate}%) & Sau VAT</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Modal Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* STEP 1 & STEP 2: Select Project & Contract (2-Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" />
                  1. Chọn Dự án <span className="text-destructive">*</span>
                </label>
                <SearchableCombobox
                  options={projectOptions}
                  value={selectedProjectId}
                  onChange={handleProjectSelect}
                  placeholder="Chọn hoặc nhập tên dự án..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-success" />
                  2. Chọn Hợp Đồng Thanh Toán <span className="text-destructive">*</span>
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
                          ? 'bg-muted text-foreground'
                          : isSelected
                          ? 'bg-muted/80 text-success'
                          : 'text-foreground/80 hover:bg-muted/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span className="font-mono text-success">{opt.label}</span>
                          <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px]">VAT {opt.vatRate}%</span>
                          {isSelected && <Check className="w-4 h-4 text-success shrink-0" />}
                        </div>
                        <div className="text-xs text-foreground/90 font-medium truncate mt-0.5">
                          {opt.contractor}
                        </div>
                        {opt.content && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {opt.content}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border shadow-sm block ${
                          opt.status === 'settled'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-background text-warning border-border'
                        }`}>
                          {opt.badge}
                        </span>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Lock Warning if Contract is Settled */}
            {isContractSettled && (
              <div className="p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center gap-3 animate-in fade-in duration-200">
                <Lock className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <strong className="text-destructive">Hợp đồng này đã được quyết toán, không thể tạo thêm đợt thanh toán.</strong>
                  <p className="mt-0.5 text-muted-foreground">Vui lòng chọn hợp đồng đang thực hiện khác để giải ngân thanh toán.</p>
                </div>
              </div>
            )}

            {/* STEP 3: Business Type Selector (Loại Nghiệp Vụ) */}
            {selectedContract && !isContractSettled && (
              <div className="p-3 rounded-xl bg-muted/60 border border-border">
                <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                  3. Loại Nghiệp Vụ Thanh Toán
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBusinessType('phase')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      businessType === 'phase'
                        ? 'bg-success/20 border-success text-success shadow-md'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Wallet className="w-4 h-4" /> 💵 Thanh toán theo đợt
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusinessType('settlement')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      businessType === 'settlement'
                        ? 'bg-primary/20 border-primary text-primary shadow-md'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" /> 📑 Quyết toán hợp đồng (Đợt cuối)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Deferred Contract Context Summary Card (3-Value Breakdown) */}
            {selectedContract && (
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2.5 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Thông tin HĐ {selectedContract.contract_number}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 text-[11px] font-bold">
                    Thuế VAT: {contractVatRate}% (Theo HĐ)
                  </span>
                </div>

                {/* HIỂN THỊ NGƯỜI PHỤ TRÁCH (READONLY) */}
                <div className="flex items-center gap-2 p-2.5 bg-card border border-border rounded-lg mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground font-semibold">Người phụ trách hợp đồng:</span>
                  <span className="text-foreground font-bold">
                    {selectedContract.assignee_id ? (selectedContract.assigneeName || 'Đã phân công') : 'Chưa phân công'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-2 rounded-lg bg-card/80 border border-border">
                    <span className="text-muted-foreground block mb-0.5 font-semibold text-[10px] uppercase">GIÁ TRỊ HỢP ĐỒNG:</span>
                    <div className="font-mono text-foreground/80 text-xs">Trước VAT: {formatVND(selectedContract.contractValueBeforeVAT)}</div>
                    <div className="font-mono text-primary/80 text-xs">Tiền VAT: {formatVND(selectedContract.vatAmount)}</div>
                    <div className="font-mono font-bold text-foreground text-xs mt-0.5">Sau VAT: {formatVND(selectedContract.contractValueAfterVAT)}</div>
                  </div>

                  <div className="p-2 rounded-lg bg-card/80 border border-border">
                    <span className="text-muted-foreground block mb-0.5 font-semibold text-[10px] uppercase">ĐÃ THANH TOÁN (LŨY KẾ):</span>
                    <div className="font-mono text-foreground/80 text-xs">Trước VAT: {formatVND(selectedContract.totalPaidBeforeVAT)}</div>
                    <div className="font-mono text-primary/80 text-xs">Tiền VAT: {formatVND(selectedContract.totalPaidVAT)}</div>
                    <div className="font-mono font-bold text-success text-xs mt-0.5">Sau VAT: {formatVND(selectedContract.totalPaidAfterVAT)}</div>
                  </div>

                  <div className="p-2 rounded-lg bg-card/80 border border-border">
                    <span className="text-muted-foreground block mb-0.5 font-semibold text-[10px] uppercase">DƯ NỢ CÒN LẠI:</span>
                    <div className="font-mono text-foreground/80 text-xs">Trước VAT: {formatVND(selectedContract.remainingBeforeVAT)}</div>
                    <div className="font-mono text-primary/80 text-xs">Tiền VAT: {formatVND(selectedContract.remainingVAT)}</div>
                    <div className="font-mono font-bold text-warning text-xs mt-0.5">Sau VAT: {formatVND(selectedContract.remainingAfterVAT)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Form Fields for "Thanh toán theo đợt" (Phase Payment) */}
            {selectedContract && !isContractSettled && businessType === 'phase' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                
                {/* Payment Phase & Date (2 Cols) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">
                      Đợt Thanh Toán <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.payment_phase}
                        onChange={(e) => setFormData({ ...formData, payment_phase: e.target.value })}
                        className="w-full pl-11 pr-3 py-2 bg-muted border border-border rounded-xl text-xs font-mono font-bold text-success focus:outline-none focus:border-success transition"
                        required
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        Đợt
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">
                      Ngày Thanh Toán <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-success transition"
                      required
                    />
                  </div>
                </div>

                {/* Value BEFORE/AFTER VAT & Quick Chips */}
                <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-3">
                  {/* Cách nhập giá trị */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80">Cách nhập giá trị thanh toán</label>
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer border text-xs font-semibold transition ${paymentVatInputMode === 'before' ? 'bg-success/20 border-success/40 text-success' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                        <input type="radio" name="paymentVatInputMode" value="before" checked={paymentVatInputMode === 'before'} onChange={() => {
                          if (paymentVatInputMode === 'after') {
                            setPaymentVatInputMode('before');
                          }
                        }} className="accent-success" />
                        Trước VAT
                      </label>
                      <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer border text-xs font-semibold transition ${paymentVatInputMode === 'after' ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                        <input type="radio" name="paymentVatInputMode" value="after" checked={paymentVatInputMode === 'after'} onChange={() => {
                          if (paymentVatInputMode === 'before') {
                            const calc = calculateVATValues(formData.amount_before_vat, paymentVatRate);
                            setAmountAfterVatInput(calc.amountAfterVAT);
                            setPaymentVatInputMode('after');
                          }
                        }} className="accent-primary" />
                        Sau VAT
                      </label>
                    </div>
                  </div>

                  {/* 2 Cols: Input Giá trị & Thuế VAT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-foreground/80">
                          {paymentVatInputMode === 'before' ? 'Giá Trị Thanh Toán Trước VAT' : 'Giá Trị Thanh Toán Sau VAT'} <span className="text-destructive">*</span>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="2.000.000.000"
                          value={paymentVatInputMode === 'before' ? formatInputNumber(formData.amount_before_vat) : formatInputNumber(amountAfterVatInput)}
                          onChange={(e) => {
                            const rawVal = parseRawNumber(e.target.value);
                            if (paymentVatInputMode === 'before') {
                              setFormData({ ...formData, amount_before_vat: rawVal });
                            } else {
                              setAmountAfterVatInput(rawVal);
                              const calc = calculateVATFromAfter(rawVal, paymentVatRate);
                              setFormData(prev => ({ ...prev, amount_before_vat: calc.amountBeforeVAT }));
                            }
                          }}
                          className="w-full pl-3 pr-11 py-2 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:border-success transition"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          VND
                        </span>
                      </div>

                      {/* Quick Add Chips */}
                      <div className="flex flex-wrap items-center gap-1 pt-1.5">
                        <span className="text-[10px] text-muted-foreground mr-1">Cộng:</span>
                        {[100_000_000, 500_000_000, 1_000_000_000, 2_000_000_000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              if (paymentVatInputMode === 'before') {
                                setFormData(prev => ({ ...prev, amount_before_vat: (Number(prev.amount_before_vat || 0) + amt) }));
                              } else {
                                const newAfter = (Number(amountAfterVatInput || 0) + amt);
                                setAmountAfterVatInput(newAfter);
                                const calc = calculateVATFromAfter(newAfter, paymentVatRate);
                                setFormData(prev => ({ ...prev, amount_before_vat: calc.amountBeforeVAT }));
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground/80 hover:text-foreground text-[10px] font-mono transition cursor-pointer"
                          >
                            +{amt >= 1_000_000_000 ? `${amt / 1_000_000_000} Tỷ` : `${amt / 1_000_000} Tr`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* VAT RATE INPUT */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-foreground/80">Thuế VAT đợt thanh toán (%)</label>
                        <span className="text-[10px] text-muted-foreground">HĐ: {contractVatRate}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={formData.vat_rate !== undefined ? formData.vat_rate : 10}
                            onChange={(e) => {
                              const newRate = Number(e.target.value);
                              setFormData(prev => ({ ...prev, vat_rate: newRate }));
                              if (paymentVatInputMode === 'after' && amountAfterVatInput) {
                                const calc = calculateVATFromAfter(amountAfterVatInput, newRate);
                                setFormData(prev => ({ ...prev, vat_rate: newRate, amount_before_vat: calc.amountBeforeVAT }));
                              }
                            }}
                            className="w-full pl-2.5 pr-8 py-2 bg-card border border-primary/40 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary transition"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
                        </div>
                        <div className="flex gap-1">
                          {[0, 5, 8, 10].map(rate => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, vat_rate: rate }));
                                if (paymentVatInputMode === 'after' && amountAfterVatInput) {
                                  const calc = calculateVATFromAfter(amountAfterVatInput, rate);
                                  setFormData(prev => ({ ...prev, vat_rate: rate, amount_before_vat: calc.amountBeforeVAT }));
                                }
                              }}
                              className={`px-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                Number(formData.vat_rate) === rate
                                  ? 'bg-primary/30 border border-primary text-primary'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-transparent'
                              }`}
                            >
                              {rate}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* READ-ONLY AUTO VAT & AFTER VAT PANEL */}
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{paymentVatInputMode === 'after' ? 'Đợt thanh toán trước VAT (Tự động tính):' : 'Đợt thanh toán trước VAT:'}</span>
                      <span className={`font-mono font-bold ${paymentVatInputMode === 'after' ? 'text-warning' : 'text-foreground/90'}`}>{formatVND(phaseVATValues.amountBeforeVAT)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>+ Tiền VAT ({paymentVatRate}%):</span>
                      <span className="font-mono text-primary font-bold">+{formatVND(phaseVATValues.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-border text-xs font-extrabold">
                      <span className="text-foreground">{paymentVatInputMode === 'before' ? 'Tổng Thanh Toán Sau VAT (Tự động tính):' : 'Tổng Thanh Toán Sau VAT:'}</span>
                      <span className={`font-mono text-sm ${paymentVatInputMode === 'before' ? 'text-success' : 'text-foreground'}`}>{formatVND(phaseVATValues.amountAfterVAT)}</span>
                    </div>
                  </div>

                  {/* Text Words */}
                  {phaseVATValues.amountAfterVAT > 0 && (
                    <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-[11px] text-success flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-success mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">Bằng chữ (Sau VAT): </span>
                        <span className="italic">{numberToWordsVN(phaseVATValues.amountAfterVAT)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Note Field */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">
                    Ghi Chú Thanh Toán
                  </label>
                  <input
                    type="text"
                    placeholder="Ghi chú nội dung nghiệm thu, số hóa đơn GTGT..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-success transition"
                  />
                </div>

              </div>
            )}

            {/* STEP 6: Form Fields for "Quyết toán hợp đồng" (Final Settlement Payment Milestone) */}
            {selectedContract && !isContractSettled && businessType === 'settlement' && (
              <div className="space-y-3.5 animate-in fade-in duration-150 p-4 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider border-b border-primary/20 pb-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Quyết toán hợp đồng (Đợt thanh toán cuối cùng)
                </div>

                {/* Grid 3 Cột: Ngày quyết toán | Giá trị đợt quyết toán | VAT */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">
                      Ngày Quyết Toán <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      value={settlementData.settlement_date}
                      onChange={(e) => setSettlementData({ ...settlementData, settlement_date: e.target.value })}
                      className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">
                      Giá Trị Đợt Quyết Toán (Trước VAT) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="13.120.000.000"
                        value={formatInputNumber(settlementData.settlement_amount_before_vat)}
                        onChange={(e) => setSettlementData({ ...settlementData, settlement_amount_before_vat: parseRawNumber(e.target.value) })}
                        className="w-full pl-3 pr-11 py-2 bg-card border border-border rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary transition"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        VND
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">
                      VAT đợt này (%)
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
                        className="w-full pl-3 pr-8 py-2 bg-card border border-primary/40 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* READ-ONLY 3-VALUE SETTLEMENT CALCULATION CARD */}
                <div className="p-3.5 rounded-xl bg-background border border-border space-y-2 text-xs">
                  <div className="font-bold text-foreground/80 border-b border-border pb-1.5 flex items-center justify-between">
                    <span>CẤU TRÚC GIÁ TRỊ QUYẾT TOÁN CUỐI CÙNG</span>
                    <span className="text-primary font-mono">VAT {settlementVatRate}%</span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Đã thanh toán trước (Lũy kế):</span>
                    <div className="font-mono text-right">
                      <span className="text-foreground/90">{formatVND(paidBeforeVAT)}</span>
                      <span className="text-muted-foreground text-[11px] block">VAT: {formatVND(paidVAT)} | Sau VAT: {formatVND(paidAfterVAT)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>+ Đợt quyết toán (Đợt cuối):</span>
                    <div className="font-mono text-right text-primary font-bold">
                      <span>+{formatVND(settlementPhaseBeforeVAT)}</span>
                      <span className="text-primary/80 text-[11px] block">VAT: +{formatVND(settlementVATValues.vatAmount)} | Sau VAT: +{formatVND(settlementVATValues.amountAfterVAT)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-foreground">
                      <span>= Tổng Quyết Toán Trước VAT:</span>
                      <span className="font-mono text-foreground/90">{formatVND(finalSettlementBeforeVAT)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-primary">
                      <span>= Tổng VAT Quyết Toán ({settlementVatRate}%):</span>
                      <span className="font-mono text-primary">+{formatVND(finalSettlementVAT)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-sm font-extrabold text-primary border-t border-border/50">
                      <span>= Giá Trị Quyết Toán Sau VAT:</span>
                      <span className="font-mono text-base">{formatVND(finalSettlementAfterVAT)}</span>
                    </div>
                  </div>
                </div>

                {/* VALIDATION WARNING ERROR */}
                {isSettlementOverContract ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <div>
                      <strong>Giá trị quyết toán vượt giá trị hợp đồng trước VAT!</strong>
                      <p className="mt-0.5 text-destructive/80">Lũy kế trước VAT ({formatVND(finalSettlementBeforeVAT)}) lớn hơn Giá trị HĐ trước VAT ({formatVND(selectedContract.contractValueBeforeVAT)}). Vui lòng điều chỉnh lại số tiền đợt quyết toán.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>
                      Sau khi lưu đợt quyết toán, hệ thống sẽ ghi nhận đợt thanh toán cuối (Đợt {(selectedContract.paymentsCount || 0) + 1}), cập nhật tổng quyết toán thành <strong>{formatVND(finalSettlementAfterVAT)} (Sau VAT)</strong> và chuyển trạng thái HĐ thành <strong>🔒 Đã quyết toán</strong> (khóa thanh toán).
                    </span>
                  </div>
                )}

                {/* Note Field */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">
                    Ghi Chú Quyết Toán
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú hoàn thành & nghiệm thu thanh lý hợp đồng..."
                    value={settlementData.note}
                    onChange={(e) => setSettlementData({ ...settlementData, note: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition resize-none"
                  />
                </div>

              </div>
            )}

          </div>

          {/* Modal Footer Actions (Fixed) */}
          <div className="px-6 py-3.5 bg-card border-t border-border flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              Hủy Bỏ
            </button>

            {selectedContract && !isContractSettled && (
              <button
                type="submit"
                disabled={businessType === 'settlement' && isSettlementOverContract}
                className={`px-6 py-2 rounded-xl text-primary-foreground text-xs font-semibold shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  businessType === 'settlement'
                    ? 'bg-primary hover:bg-primary/90 shadow-primary/30'
                    : 'bg-success hover:bg-success/90 shadow-success/30'
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
