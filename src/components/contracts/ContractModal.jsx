import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, Building2, Plus, Sparkles, Tag } from 'lucide-react';
import { 
  formatVND, 
  numberToWordsVN, 
  calcEndDate, 
  calcDaysBetween, 
  formatInputNumber, 
  parseRawNumber,
  calculateVATValues,
  calculateVATFromAfter
} from '../../utils/formatters';
import { supabase } from '../../services/supabase';

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
    assignee_id: '',
  });

  const [settlementTouched, setSettlementTouched] = useState(false);
  const [vatInputMode, setVatInputMode] = useState('before'); // 'before' | 'after'
  const [contractValueAfterVATInput, setContractValueAfterVATInput] = useState('');
  
  // State for assignee list
  const [projectMembers, setProjectMembers] = useState([]);

  // Fetch members when project_id changes
  useEffect(() => {
    if (!formData.project_id) {
      setProjectMembers([]);
      return;
    }
    const loadMembers = async () => {
      const { data } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles:user_id ( full_name, email )
        `)
        .eq('project_id', formData.project_id);
      setProjectMembers(data || []);
    };
    loadMembers();
  }, [formData.project_id]);

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
        assignee_id: editingContract.assignee_id || '',
      });
      setSettlementTouched(true);
    } else {
      const defaultSigning = new Date().toISOString().split('T')[0];
      const defaultDays = 90;
      setFormData({
        project_id: projects[0]?.id || '',
        contract_number: `HD-${new Date().getFullYear()}/` + Math.floor(100 + Math.random() * 900),
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
        assignee_id: '',
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

  const handleAfterVATChange = (valStr) => {
    const rawVal = parseRawNumber(valStr);
    setContractValueAfterVATInput(rawVal);
    setFormData(prev => {
      const currentRate = prev.isCustomVat ? (Number(prev.customVatRate) || 0) : prev.vatRate;
      const calculated = calculateVATFromAfter(rawVal, currentRate);
      const shouldUpdateSettlement = !settlementTouched || !prev.estimated_settlement_value;
      return {
        ...prev,
        contractValueBeforeVAT: calculated.amountBeforeVAT,
        estimated_settlement_value: shouldUpdateSettlement ? calculated.amountAfterVAT : prev.estimated_settlement_value
      };
    });
  };

  const handleVatInputModeChange = (newMode) => {
    if (newMode === vatInputMode) return;
    const currentRate = formData.isCustomVat ? (Number(formData.customVatRate) || 0) : formData.vatRate;
    if (newMode === 'after') {
      // Switching to after-VAT: compute afterVAT from current beforeVAT
      const calc = calculateVATValues(formData.contractValueBeforeVAT, currentRate);
      setContractValueAfterVATInput(calc.amountAfterVAT);
    }
    // Switching to before-VAT: formData.contractValueBeforeVAT already has the correct value
    setVatInputMode(newMode);
  };

  const handleVatRateSelect = (rate, isCustom = false) => {
    setFormData(prev => {
      const activeRate = isCustom ? (Number(prev.customVatRate) || 0) : rate;
      if (vatInputMode === 'after' && contractValueAfterVATInput) {
        const calc = calculateVATFromAfter(contractValueAfterVATInput, activeRate);
        const shouldUpdateSettlement = !settlementTouched || !prev.estimated_settlement_value;
        return {
          ...prev,
          vatRate: activeRate,
          isCustomVat: isCustom,
          contractValueBeforeVAT: calc.amountBeforeVAT,
          estimated_settlement_value: shouldUpdateSettlement ? calc.amountAfterVAT : prev.estimated_settlement_value
        };
      }
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
      if (vatInputMode === 'after' && contractValueAfterVATInput) {
        const calc = calculateVATFromAfter(contractValueAfterVATInput, rateNum);
        const shouldUpdateSettlement = !settlementTouched || !prev.estimated_settlement_value;
        return {
          ...prev,
          customVatRate: valStr,
          vatRate: rateNum,
          contractValueBeforeVAT: calc.amountBeforeVAT,
          estimated_settlement_value: shouldUpdateSettlement ? calc.amountAfterVAT : prev.estimated_settlement_value
        };
      }
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
  const vatCalcResult = vatInputMode === 'after' && contractValueAfterVATInput
    ? calculateVATFromAfter(contractValueAfterVATInput, activeVatRate)
    : calculateVATValues(formData.contractValueBeforeVAT, activeVatRate);
  const { amountBeforeVAT, vatAmount, amountAfterVAT } = vatCalcResult;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_id) {
      alert('Vui lòng chọn Dự án!');
      return;
    }
    if (!formData.contract_number) {
      alert('Vui lòng nhập Số Hợp Đồng!');
      return;
    }
    if (vatInputMode === 'before') {
      if (!formData.contractValueBeforeVAT || Number(formData.contractValueBeforeVAT) <= 0) {
        alert('Vui lòng nhập Giá trị Hợp Đồng trước VAT hợp lệ!');
        return;
      }
    } else {
      if (!contractValueAfterVATInput || Number(contractValueAfterVATInput) <= 0) {
        alert('Vui lòng nhập Giá trị Hợp Đồng sau VAT hợp lệ!');
        return;
      }
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
      assignee_id: formData.assignee_id || null,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-6 pb-6 px-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full mx-2 md:mx-auto shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Modal Header (Fixed) */}
        <div className="px-6 py-3.5 bg-muted/50 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {editingContract ? 'Cập Nhật Hợp Đồng' : 'Thêm Hợp Đồng Mới'}
              </h3>
              <p className="text-xs text-muted-foreground">Nhập đầy đủ thông tin hợp đồng và phân loại Nhóm chi phí</p>
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
            
            {/* SECTION 1: THÔNG TIN CHUNG HỢP ĐỒNG */}
            <div className="p-4 rounded-xl bg-background/40 border border-border/70 space-y-3.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block border-b border-border/60 pb-2">
                Thông tin chung
              </span>

              {/* Row 1: Dự án & Số Hợp Đồng (2 Cột) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">
                      Mã / Tên dự án <span className="text-destructive">*</span>
                    </label>
                    {onOpenNewProjectModal && (
                      <button
                        type="button"
                        onClick={onOpenNewProjectModal}
                        className="text-[11px] text-primary hover:text-primary/90 flex items-center gap-0.5 font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Thêm Dự án mới
                      </button>
                    )}
                  </div>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                    required
                  >
                    <option value="">-- Chọn dự án --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code || p.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Số hợp đồng <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: HD-2026/SH-01"
                    value={formData.contract_number}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono transition"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Nhà Thầu & Nhóm Chi Phí (2 Cột) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nhà thầu / Đơn vị thi công <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Tên công ty nhà thầu..."
                    value={formData.contractor}
                    onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                    <span>Nhóm chi phí</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(Phân loại ngân sách)</span>
                  </label>
                  <select
                    value={formData.costGroup}
                    onChange={(e) => setFormData({ ...formData, costGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-semibold cursor-pointer transition"
                  >
                    <option value="">-- Chưa phân loại / Để trống --</option>
                    {COST_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Row 3: Người Phụ Trách */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                    <span>Người phụ trách (Giao việc)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(Chỉ Cấp 2 thuộc dự án này)</span>
                  </label>
                  <select
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-semibold cursor-pointer transition"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {projectMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profiles?.full_name || m.profiles?.email} ({m.profiles?.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú nhóm chi phí khi chọn "Khác" */}
              {formData.costGroup === 'Khác' && (
                <div className="space-y-1 pt-0.5 animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-primary">
                    Ghi chú nhóm chi phí chi tiết <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Bảo hiểm công trình, Chi phí dự phòng..."
                    value={formData.costGroupNote}
                    onChange={(e) => setFormData({ ...formData, costGroupNote: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-primary/60 rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition"
                    required={formData.costGroup === 'Khác'}
                  />
                </div>
              )}

              {/* Row 3: Nội dung hợp đồng (Full width) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nội dung hợp đồng / Gói thầu
                </label>
                <input
                  type="text"
                  placeholder="Nội dung tóm tắt hạng mục công việc..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            {/* SECTION 2: MÔ HÌNH GIÁ TRỊ HỢP ĐỒNG & THUẾ VAT */}
            <div className="p-4 rounded-xl bg-background/40 border border-border/70 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  Mô Hình Giá Trị Hợp Đồng & Thuế VAT
                </span>

                {/* Cách nhập giá trị */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Nhập theo:</span>
                  <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer border text-xs font-semibold transition ${vatInputMode === 'before' ? 'bg-success/20 border-success/40 text-success' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                      <input type="radio" name="vatInputMode" value="before" checked={vatInputMode === 'before'} onChange={() => handleVatInputModeChange('before')} className="accent-success" />
                      Trước VAT
                    </label>
                    <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer border text-xs font-semibold transition ${vatInputMode === 'after' ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                      <input type="radio" name="vatInputMode" value="after" checked={vatInputMode === 'after'} onChange={() => handleVatInputModeChange('after')} className="accent-primary" />
                      Sau VAT
                    </label>
                  </div>
                </div>
              </div>

              {/* Grid 2 Cột: Input Giá Trị & VAT (%) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Input Giá Trị */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {vatInputMode === 'before' ? 'Giá trị trước VAT' : 'Giá trị sau VAT'} <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="5.000.000.000"
                      value={vatInputMode === 'before' ? formatInputNumber(formData.contractValueBeforeVAT) : formatInputNumber(contractValueAfterVATInput)}
                      onChange={(e) => vatInputMode === 'before' ? handleBeforeVATChange(e.target.value) : handleAfterVATChange(e.target.value)}
                      className="w-full pl-3 pr-11 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:border-success transition"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      VND
                    </span>
                  </div>
                </div>

                {/* Thuế VAT (%) */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Thuế VAT (%) <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[5, 8, 10].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleVatRateSelect(rate, false)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer border ${
                          !formData.isCustomVat && formData.vatRate === rate
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => handleVatRateSelect(12, true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer border ${
                        formData.isCustomVat
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      Khác
                    </button>
                  </div>

                  {formData.isCustomVat && (
                    <div className="mt-2 flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-medium text-primary">Tỷ lệ VAT tùy chỉnh:</span>
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="12"
                          value={formData.customVatRate}
                          onChange={(e) => handleCustomVatInputChange(e.target.value)}
                          className="w-full pl-2.5 pr-6 py-1 bg-background border border-primary/50 rounded-lg text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bảng tóm tắt 3 giá trị (Tự động tính) */}
              <div className="p-3 rounded-xl bg-card border border-border space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{vatInputMode === 'after' ? 'Giá trị trước VAT (Tự động tính):' : 'Giá trị trước VAT:'}</span>
                  <span className={`font-mono font-bold ${vatInputMode === 'after' ? 'text-warning' : 'text-foreground'}`}>{formatVND(amountBeforeVAT)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>+ Tiền thuế VAT ({activeVatRate}%):</span>
                  <span className="font-mono text-primary font-bold">+{formatVND(vatAmount)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border text-xs font-extrabold">
                  <span className="text-foreground">{vatInputMode === 'before' ? 'Giá trị sau VAT (Tự động tính):' : 'Giá trị sau VAT:'}</span>
                  <span className={`font-mono text-sm ${vatInputMode === 'before' ? 'text-success' : 'text-foreground'}`}>{formatVND(amountAfterVAT)}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: THỜI GIAN VÀ TIẾN ĐỘ */}
            <div className="p-4 rounded-xl bg-background/40 border border-border/70 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  Thời Gian & Tiến Độ Thực Hiện Hợp Đồng
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Ngày ký hợp đồng
                  </label>
                  <input
                    type="date"
                    value={formData.signing_date}
                    onChange={(e) => handleSigningDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Tiến độ HĐ (ngày)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="90"
                    value={formData.execution_days}
                    onChange={(e) => handleDaysChange(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono text-warning focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">
                    Ngày kết thúc (Tự tính)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition font-mono"
                  />
                </div>
              </div>
            </div>

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
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30 transition cursor-pointer"
            >
              {editingContract ? 'Lưu Thay Đổi' : 'Tạo Hợp Đồng'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
