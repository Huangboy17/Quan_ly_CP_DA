import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Edit, Calendar, DollarSign, Building2, CheckCircle } from 'lucide-react';
import { formatVND, numberToWordsVN } from '../../utils/formatters';

export default function ContractAppendixModal({
  isOpen,
  onClose,
  contracts = [],
  projects = [],
  initialContractId = '',
  appendixToEdit = null,
  onSave
}) {
  if (!isOpen) return null;

  const [contractId, setContractId] = useState(initialContractId || (contracts[0]?.id || ''));
  const [appendixNumber, setAppendixNumber] = useState('');
  const [content, setContent] = useState('');
  const [amountBeforeVat, setAmountBeforeVat] = useState(0);
  const [vatRate, setVatRate] = useState(10);
  const [signedDate, setSignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Selected contract object
  const selectedContract = contracts.find(c => c.id === contractId);

  // Auto-generate suggestion for appendix number e.g., PLHĐ-01, PLHĐ-02
  useEffect(() => {
    if (appendixToEdit) {
      setContractId(appendixToEdit.contractId || initialContractId || (contracts[0]?.id || ''));
      setAppendixNumber(appendixToEdit.appendix_number || '');
      setContent(appendixToEdit.content || '');
      setAmountBeforeVat(appendixToEdit.amount_before_vat || 0);
      setVatRate(appendixToEdit.vat_rate !== undefined ? appendixToEdit.vat_rate : (selectedContract?.vatRate || 10));
      setSignedDate(appendixToEdit.signed_date || new Date().toISOString().split('T')[0]);
      setNote(appendixToEdit.note || '');
    } else {
      if (initialContractId) {
        setContractId(initialContractId);
      } else if (!contractId && contracts.length > 0) {
        setContractId(contracts[0].id);
      }
      
      const targetC = contracts.find(c => c.id === (initialContractId || contractId || contracts[0]?.id));
      const existingAppendices = Array.isArray(targetC?.appendices) ? targetC.appendices : [];
      const nextNum = existingAppendices.length + 1;
      setAppendixNumber(`PLHĐ-${nextNum.toString().padStart(2, '0')}`);
      setVatRate(targetC?.vatRate !== undefined ? targetC.vatRate : 10);
    }
  }, [appendixToEdit, initialContractId, isOpen]);

  // When selected contract changes in dropdown, suggest next appendix number if creating new
  const handleContractChange = (newCId) => {
    setContractId(newCId);
    if (!appendixToEdit) {
      const targetC = contracts.find(c => c.id === newCId);
      const existingAppendices = Array.isArray(targetC?.appendices) ? targetC.appendices : [];
      const nextNum = existingAppendices.length + 1;
      setAppendixNumber(`PLHĐ-${nextNum.toString().padStart(2, '0')}`);
      if (targetC?.vatRate !== undefined) {
        setVatRate(targetC.vatRate);
      }
    }
  };

  const vatAmount = Math.round(Number(amountBeforeVat || 0) * (Number(vatRate || 0) / 100));
  const amountAfterVat = Number(amountBeforeVat || 0) + vatAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contractId) {
      alert('Vui lòng chọn Hợp đồng!');
      return;
    }
    if (!appendixNumber.trim()) {
      alert('Vui lòng nhập Số phụ lục!');
      return;
    }
    if (!content.trim()) {
      alert('Vui lòng nhập Nội dung phụ lục!');
      return;
    }

    const payload = {
      id: appendixToEdit ? appendixToEdit.id : undefined,
      contractId,
      appendix_number: appendixNumber.trim(),
      content: content.trim(),
      amount_before_vat: Number(amountBeforeVat),
      vat_rate: Number(vatRate),
      vat_amount: vatAmount,
      amount_after_vat: amountAfterVat,
      signed_date: signedDate,
      note: note.trim()
    };

    onSave(contractId, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-6 pb-6 px-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[calc(100vh-48px)] overflow-hidden">
        
        {/* Modal Header (Fixed) */}
        <div className="px-6 py-3.5 bg-slate-800/90 border-b border-slate-700/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {appendixToEdit ? 'Chỉnh Sửa Phụ Lục Hợp Đồng' : 'Thêm Phụ Lục Hợp Đồng Mới'}
              </h3>
              <p className="text-xs text-slate-400">
                Lưu lịch sử điều chỉnh giá trị hợp đồng (Giá trị phụ lục có thể âm hoặc dương)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Modal Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
            
            {/* Select Contract Dropdown */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Chọn Hợp Đồng <span className="text-rose-400">*</span>
              </label>
              <select
                value={contractId}
                onChange={(e) => handleContractChange(e.target.value)}
                disabled={!!appendixToEdit}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition font-mono font-medium disabled:opacity-60"
              >
                <option value="">-- Chọn Hợp Đồng --</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.contract_number} - {c.contractor} ({c.projectName})
                  </option>
                ))}
              </select>
            </div>

            {/* Grid 2 cols: Số phụ lục & Ngày ký */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Số Phụ Lục Hợp Đồng <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={appendixNumber}
                  onChange={(e) => setAppendixNumber(e.target.value)}
                  placeholder="Ví dụ: PLHĐ-01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Ngày Ký Phụ Lục <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={signedDate}
                  onChange={(e) => setSignedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  required
                />
              </div>
            </div>

            {/* Nội dung phụ lục */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nội Dung Điều Chỉnh Chi Tiết <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows="2"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung nghiệp vụ (Ví dụ: Bổ sung khối lượng cọc nhồi, điều chỉnh phạm vi công việc...)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition leading-relaxed resize-none"
                required
              />
            </div>

            {/* 3-TIER VAT VALUES MODEL (TRƯỚC VAT, THUẾ VAT %, SAU VAT) */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold text-blue-400 uppercase block border-b border-slate-800 pb-1.5">
                💰 Giá Trị Phụ Lục Hợp Đồng (Cho phép nhập số Dương hoặc Số Âm)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] font-medium mb-1">
                    Giá Trị Trước VAT (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amountBeforeVat}
                    onChange={(e) => setAmountBeforeVat(Number(e.target.value))}
                    placeholder="Ví dụ: 2000000000 hoặc -500000000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-medium mb-1">
                    Mức Thuế VAT (%)
                  </label>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    placeholder="8 hoặc 10"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-blue-300 font-mono font-bold text-center focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-medium mb-1">
                    Tiền Thuế VAT (Tự tính)
                  </label>
                  <div className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-blue-400 font-mono font-bold">
                    {formatVND(vatAmount)}
                  </div>
                </div>
              </div>

              {/* Giá trị Sau VAT Tự Động Tính */}
              <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-xs">Giá Trị Phụ Lục Sau VAT (Hiện tại):</span>
                <span className={`font-mono text-sm font-black ${amountAfterVat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {amountAfterVat >= 0 ? `+${formatVND(amountAfterVat)}` : formatVND(amountAfterVat)}
                </span>
              </div>

              {/* Readout Number in Words */}
              {amountAfterVat !== 0 && (
                <div className="text-[11px] text-slate-400 italic">
                  Bằng chữ: <span className="text-slate-200 font-medium">{numberToWordsVN(Math.abs(amountAfterVat))} {amountAfterVat < 0 ? '(Giảm giá trị)' : ''}</span>
                </div>
              )}
            </div>

            {/* Diễn giải / Ghi chú */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Diễn Giải / Ghi Chú Căn Cứ
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Theo biên bản họp thống nhất ngày 05/08/2026..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

          </div>

          {/* Modal Footer Actions (Fixed) */}
          <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {appendixToEdit ? 'Cập Nhật Phụ Lục' : 'Lưu Phụ Lục Hợp Đồng'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
