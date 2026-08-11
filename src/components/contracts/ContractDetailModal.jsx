import React from 'react';
import { X, FileText, Calendar, Building2, Wallet, Plus, Trash2, Edit, CheckCircle2, ShieldCheck, Lock, Paperclip } from 'lucide-react';
import { formatVND, formatDisplayDate, cleanVND } from '../../utils/formatters';

export default function ContractDetailModal({ 
  isOpen, 
  onClose, 
  contract, 
  payments = [], 
  onAddPaymentForContract,
  onEditPayment,
  onDeletePayment,
  onOpenAddAppendix,
  onEditAppendix,
  onDeleteAppendix
}) {
  if (!isOpen || !contract) return null;

  // Appendices list
  const appendicesList = Array.isArray(contract.appendices) ? contract.appendices : [];
  const initialContractValueAfterVat = cleanVND(contract.initialContractValueAfterVAT || contract.contractValueAfterVAT || contract.contract_value || 0);
  const totalAppendicesAfterVat = cleanVND(contract.totalAppendicesAfterVAT || 0);
  const currentContractValueAfterVat = cleanVND(contract.contractValueAfterVAT || contract.contract_value || 0);

  // Filter payments belonging to this contract and sort strictly by payment_date ASCENDING
  const contractPayments = payments
    .filter(p => p.contract_id === contract.id)
    .sort((a, b) => {
      const d1 = a.payment_date || '1970-01-01';
      const d2 = b.payment_date || '1970-01-01';
      if (d1 !== d2) return d1.localeCompare(d2);
      return Number(a.payment_phase || 0) - Number(b.payment_phase || 0);
    });

  // Compute running cumulative sums line-by-line in chronological order
  let runningSum = 0;
  const paymentsWithCumulative = contractPayments.map(pm => {
    runningSum = cleanVND(runningSum + cleanVND(pm.amount_after_vat || 0));
    return {
      ...pm,
      cumulativeAfterVAT: runningSum,
    };
  });

  const totalPaidAfterVat = runningSum;
  const remainingValue = Math.max(0, cleanVND(currentContractValueAfterVat - totalPaidAfterVat));
  const isSettled = contract.status === 'settled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono font-bold text-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Chi Tiết Tiến Độ & Lịch Sử Hợp Đồng</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isSettled
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isSettled ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Dự án: <span className="text-blue-300 font-semibold">{contract.projectName}</span></p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* SECTION 1: Top Contract Header Card (Card Thông Tin Hợp Đồng) */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 shadow-md space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5 uppercase tracking-wider font-semibold">Số hợp đồng:</span>
                <span className="font-mono font-bold text-white text-sm">{contract.contract_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5 uppercase tracking-wider font-semibold">Tên nhà thầu:</span>
                <span className="font-semibold text-slate-200 text-sm">{contract.contractor}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-400 block mb-0.5 uppercase tracking-wider font-semibold">Nội dung gói thầu:</span>
                <span className="text-slate-300 font-medium">{contract.content || 'Chưa cập nhật nội dung thi công'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Giá trị ký ban đầu (Gốc): </span>
                <span className="font-mono font-bold text-slate-200">{formatVND(initialContractValueAfterVat)}</span>
                {totalAppendicesAfterVat !== 0 && (
                  <span className={`font-mono text-xs font-semibold ml-2 ${totalAppendicesAfterVat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)} từ {appendicesList.length} phụ lục)
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Giá trị hợp đồng hiện tại: </span>
                <span className="font-mono font-extrabold text-blue-400 text-base">{formatVND(currentContractValueAfterVat)}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: LỊCH SỬ PHỤ LỤC HỢP ĐỒNG (APPENDICES HISTORY) */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-400" />
                Lịch Sử Phụ Lục Hợp Đồng ({appendicesList.length} phụ lục)
              </h4>
              <button
                onClick={() => onOpenAddAppendix && onOpenAddAppendix(contract.id)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> + Thêm Phụ Lục
              </button>
            </div>

            {/* Table of Appendices */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Số Phụ Lục</th>
                    <th className="py-2.5 px-3">Ngày Ký</th>
                    <th className="py-2.5 px-3">Nội Dung Điều Chỉnh Chi Tiết</th>
                    <th className="py-2.5 px-3 text-right">Giá Trị Phụ Lục (Sau VAT)</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                  {appendicesList.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/60 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {app.appendix_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {formatDisplayDate(app.signed_date)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs leading-relaxed">
                        <div className="font-medium text-slate-200">{app.content}</div>
                        {app.note && <div className="text-[10px] text-slate-400 italic">Căn cứ: {app.note}</div>}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${app.amount_after_vat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {app.amount_after_vat >= 0 ? `+${formatVND(app.amount_after_vat)}` : formatVND(app.amount_after_vat)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditAppendix && onEditAppendix(contract.id, app)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                            title="Sửa Phụ Lục"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn xóa phụ lục ${app.appendix_number}?`)) {
                                onDeleteAppendix && onDeleteAppendix(contract.id, app.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Xóa Phụ Lục"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {appendicesList.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">
                        Hợp đồng này chưa phát sinh phụ lục điều chỉnh giá trị nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Appendix Section Summary Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400">
                Giá trị ban đầu: <span className="font-bold text-white">{formatVND(initialContractValueAfterVat)}</span>
              </div>
              <div className={totalAppendicesAfterVat >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                Tổng giá trị phụ lục: {totalAppendicesAfterVat >= 0 ? `+${formatVND(totalAppendicesAfterVat)}` : formatVND(totalAppendicesAfterVat)}
              </div>
              <div className="text-blue-300 font-bold text-sm">
                Giá trị HĐ hiện tại: {formatVND(currentContractValueAfterVat)}
              </div>
            </div>
          </div>

          {/* SECTION 3: Payment History Table (Lịch sử thanh toán hợp đồng) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Lịch Sử Thanh Toán Hợp Đồng ({contractPayments.length} đợt)
              </h4>

              <button
                onClick={() => {
                  if (isSettled) {
                    alert('Hợp đồng này đã được quyết toán, không thể tạo thêm đợt thanh toán.');
                  } else {
                    onAddPaymentForContract(contract);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  isSettled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md'
                }`}
                title={isSettled ? 'Hợp đồng đã quyết toán, không thể tạo thêm đợt thanh toán' : 'Thêm Đợt Thanh Toán'}
              >
                <Plus className="w-4 h-4" /> + Thêm Đợt Thanh Toán
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Đợt Thanh Toán</th>
                    <th className="py-3 px-4">Ngày Thanh Toán</th>
                    <th className="py-3 px-4 text-right">Giá Trị Thanh Toán (Sau VAT)</th>
                    <th className="py-3 px-4 text-right">Lũy Kế Sau Thanh Toán</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {paymentsWithCumulative.map((pm) => {
                    const isSettlementPhase = pm.is_settlement || pm.payment_type === 'FINAL_SETTLEMENT';
                    return (
                      <tr key={pm.id} className="hover:bg-slate-800/60 transition">
                        <td className="py-3 px-4 font-semibold">
                          {isSettlementPhase ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold text-[11px] inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Quyết toán
                            </span>
                          ) : (
                            <span className="text-white font-mono">Đợt {pm.payment_phase}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {formatDisplayDate(pm.payment_date)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-xs">
                          {formatVND(pm.amount_after_vat)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-300 text-xs">
                          {formatVND(pm.cumulativeAfterVAT)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onEditPayment && (
                              <button
                                onClick={() => onEditPayment(pm)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                                title="Sửa"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeletePayment && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xóa đợt thanh toán ${pm.payment_phase}?`)) {
                                    onDeletePayment(pm.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {paymentsWithCumulative.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        Chưa có đợt thanh toán nào cho hợp đồng này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Summary Footer Card (Tổng hợp cuối bảng) */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700/60 pb-2">
              Tổng Hợp Thanh Toán Hợp Đồng
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px] font-sans font-medium mb-1">Giá trị hợp đồng hiện tại:</span>
                <span className="font-bold text-white text-sm">{formatVND(currentContractValueAfterVat)}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px] font-sans font-medium mb-1">Đã thanh toán lũy kế:</span>
                <span className="font-bold text-emerald-400 text-sm">{formatVND(totalPaidAfterVat)}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px] font-sans font-medium mb-1">Còn phải thanh toán:</span>
                <span className="font-bold text-amber-400 text-sm">{formatVND(remainingValue)}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px] font-sans font-medium mb-1">Trạng thái hợp đồng:</span>
                <span className={`font-sans font-bold text-xs inline-block mt-0.5 ${
                  isSettled ? 'text-blue-400' : 'text-emerald-400'
                }`}>
                  {isSettled ? '🔵 Đã quyết toán' : '🟢 Đang thực hiện'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
