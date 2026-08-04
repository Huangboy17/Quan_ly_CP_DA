import React from 'react';
import { X, FileText, Calendar, Building2, Wallet, Plus, Trash2, Edit } from 'lucide-react';
import { formatVND, formatDisplayDate, numberToWordsVN } from '../../utils/formatters';

export default function ContractDetailModal({ 
  isOpen, 
  onClose, 
  contract, 
  payments = [], 
  onAddPaymentForContract,
  onEditPayment,
  onDeletePayment 
}) {
  if (!isOpen || !contract) return null;

  const contractPayments = payments.filter(p => p.contract_id === contract.id);
  const totalPaidAfterVat = contractPayments.reduce((sum, p) => sum + Number(p.amount_after_vat || 0), 0);
  const totalPaidBeforeVat = contractPayments.reduce((sum, p) => sum + Number(p.amount_before_vat || 0), 0);
  const totalVat = contractPayments.reduce((sum, p) => sum + Number(p.vat_amount || 0), 0);
  const remainingValue = Math.max(0, Number(contract.contract_value) - totalPaidAfterVat);
  const paidPct = contract.contract_value > 0 ? Math.min(100, Math.round((totalPaidAfterVat / contract.contract_value) * 100)) : 0;

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
                <h3 className="text-lg font-bold text-white font-mono">{contract.contract_number}</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium">
                  {contract.projectName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{contract.contractor}</p>
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
          
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Giá trị Hợp đồng</span>
              <div className="text-base font-bold text-white font-mono mt-1">{formatVND(contract.contract_value)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Đã thanh toán (Sau VAT)</span>
              <div className="text-base font-bold text-emerald-400 font-mono mt-1">{formatVND(totalPaidAfterVat)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Giá trị còn lại</span>
              <div className="text-base font-bold text-amber-400 font-mono mt-1">{formatVND(remainingValue)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Dự kiến quyết toán</span>
              <div className="text-base font-bold text-purple-300 font-mono mt-1">{formatVND(contract.estimated_settlement_value)}</div>
            </div>
          </div>

          {/* Progress Bar & Contract Metadata */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Tỷ lệ thanh toán / Giá trị HĐ</span>
              <span className="font-bold text-blue-400 font-mono">{paidPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${paidPct}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-700/50 text-slate-300">
              <div>
                <span className="text-slate-400">Nội dung thi công:</span>
                <p className="font-medium text-slate-200 mt-0.5">{contract.content || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400">Ngày ký HĐ:</span>
                <p className="font-medium text-slate-200 mt-0.5">{formatDisplayDate(contract.signing_date)}</p>
              </div>
              <div>
                <span className="text-slate-400">Thời gian thực hiện:</span>
                <p className="font-medium text-amber-300 mt-0.5">
                  {contract.execution_days} ngày (Đến {formatDisplayDate(contract.end_date)})
                </p>
              </div>
            </div>
          </div>

          {/* Payments History Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Lịch Sử Thanh Toán Đợt ({contractPayments.length} đợt)
              </h4>

              <button
                onClick={() => onAddPaymentForContract(contract)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Thêm Đợt Thanh Toán
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Đợt</th>
                    <th className="py-2.5 px-3">Ngày TT</th>
                    <th className="py-2.5 px-3 text-right">Trước VAT</th>
                    <th className="py-2.5 px-3 text-center">Mức VAT</th>
                    <th className="py-2.5 px-3 text-right">Tiền VAT</th>
                    <th className="py-2.5 px-3 text-right">Sau VAT</th>
                    <th className="py-2.5 px-3">Ghi Chú</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {contractPayments.map((pm) => (
                    <tr key={pm.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-white">Đợt {pm.payment_phase}</td>
                      <td className="py-2.5 px-3 font-mono">{formatDisplayDate(pm.payment_date)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatVND(pm.amount_before_vat)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[11px]">
                          {pm.vat_rate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatVND(pm.vat_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{formatVND(pm.amount_after_vat)}</td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{pm.note || '---'}</td>
                      <td className="py-2.5 px-3 text-center space-x-1">
                        {onEditPayment && (
                          <button
                            onClick={() => onEditPayment(pm)}
                            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
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
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {contractPayments.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-400">
                        Chưa có đợt thanh toán nào cho hợp đồng này.
                      </td>
                    </tr>
                  )}
                </tbody>
                
                {contractPayments.length > 0 && (
                  <tfoot className="bg-slate-800/80 font-bold border-t border-slate-700 text-slate-200">
                    <tr>
                      <td colSpan="2" className="py-3 px-3 uppercase text-[11px] text-slate-400">Tổng Lũy Kế</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-200">{formatVND(totalPaidBeforeVat)}</td>
                      <td className="py-3 px-3 text-center">---</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">{formatVND(totalVat)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">{formatVND(totalPaidAfterVat)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
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
