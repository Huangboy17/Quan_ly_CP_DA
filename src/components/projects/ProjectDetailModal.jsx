import React from 'react';
import { 
  X, 
  Building2, 
  DollarSign, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  CheckCircle2,
  PieChart as PieIcon,
  ShieldAlert
} from 'lucide-react';
import { formatVND, formatVNDCompact, formatDisplayDate } from '../../utils/formatters';

export default function ProjectDetailModal({ 
  isOpen, 
  onClose, 
  project, 
  contracts = [], 
  payments = [],
  onOpenTmdtAdjustment,
  onOpenTmdtHistory,
  setActiveTab,
  setSelectedProjectId
}) {
  if (!isOpen || !project) return null;

  const projContracts = contracts.filter(c => c.project_id === project.id);
  const currentTmdt = project.currentTmdt || 0;
  const initialTmdt = project.initial_tmdt || 0;
  const tmdtDelta = project.tmdtDelta || 0;

  // 6 Financial Groups
  const totalSignedContracts = project.totalContractValueAfterVAT || 0;
  const contractsCount = project.contractsCount || projContracts.length;
  const signedContractsRatio = project.signedContractsRatio || (currentTmdt > 0 ? Math.round((totalSignedContracts / currentTmdt) * 1000) / 10 : 0);

  const totalPaid = project.totalPaidAfterVAT || 0;
  const paymentProgressRatio = project.paymentProgressRatio || 0;

  const projEstimatedSettlement = project.projEstimatedSettlement || 0;
  const settlementTmdtRatio = project.settlementTmdtRatio || 0;

  const remainingToPay = project.remainingToPay || 0;
  const remainingProjectBudget = project.remainingProjectBudget || 0;

  const financialWarnings = project.financialWarnings || [];

  const handleGoToContracts = () => {
    setSelectedProjectId(project.id);
    setActiveTab('contracts');
    onClose();
  };

  const handleGoToPayments = () => {
    setSelectedProjectId(project.id);
    setActiveTab('payments');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {project.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bảng Thống Kê Tổng Quan Tài Chính & Tiến Độ Chi Trả Dự Án
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenTmdtAdjustment(project)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              + Cập Nhật TMĐT
            </button>
            <button
              onClick={() => onOpenTmdtHistory(project)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> Lịch Sử TMĐT
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* FINANCIAL WARNING BANNERS */}
          {financialWarnings.length > 0 && (
            <div className="space-y-2">
              {financialWarnings.map((w, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                    w.level === 'danger'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{w.message}</span>
                  </div>
                  {w.excess > 0 && (
                    <span className="font-mono font-bold bg-slate-900/60 px-2.5 py-1 rounded border border-slate-700">
                      Chênh lệch: +{formatVND(w.excess)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SECTION HEADER */}
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Tổng Quan Tài Chính Dự Án (6 Nhóm Chỉ Tiêu)
            </h4>
            <span className="text-xs text-slate-400 font-mono">Cập nhật tự động từ HĐ & TT</span>
          </div>

          {/* 6 FINANCIAL GROUPS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* NHÓM 1 - NGÂN SÁCH DỰ ÁN (TMĐT) */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md space-y-2 relative overflow-hidden group hover:border-blue-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  NHÓM 1 • NGÂN SÁCH DỰ ÁN
                </span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>

              <div>
                <span className="text-xs text-slate-300 font-medium block">Tổng mức đầu tư hiện tại:</span>
                <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                  {formatVND(currentTmdt)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>TMĐT Ban đầu: {formatVNDCompact(initialTmdt)}</span>
                <span className={tmdtDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {tmdtDelta >= 0 ? `+${formatVNDCompact(tmdtDelta)}` : formatVNDCompact(tmdtDelta)}
                </span>
              </div>
            </div>

            {/* NHÓM 2 - TÌNH HÌNH HỢP ĐỒNG */}
            <div 
              onClick={handleGoToContracts}
              className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md space-y-2 relative overflow-hidden group hover:border-blue-500/50 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  NHÓM 2 • TÌNH HÌNH HỢP ĐỒNG
                </span>
                <FileText className="w-4 h-4 text-blue-400" />
              </div>

              <div>
                <span className="text-xs text-slate-300 font-medium block">Tổng giá trị HĐ đã ký (Sau VAT):</span>
                <div className="text-xl font-extrabold text-blue-400 font-mono mt-0.5">
                  {formatVND(totalSignedContracts)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Số HĐ: <strong className="text-white font-mono">{contractsCount} HĐ</strong></span>
                <span className="font-mono text-blue-300 font-bold">Ký / TMĐT: {signedContractsRatio}%</span>
              </div>
            </div>

            {/* NHÓM 3 - TÌNH HÌNH THANH TOÁN */}
            <div 
              onClick={handleGoToPayments}
              className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md space-y-2 relative overflow-hidden group hover:border-emerald-500/50 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  NHÓM 3 • TÌNH HÌNH THANH TOÁN
                </span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>

              <div>
                <span className="text-xs text-slate-300 font-medium block">Đã thanh toán thực tế (Sau VAT):</span>
                <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                  {formatVND(totalPaid)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Đã phát sinh TT: <strong className="text-white font-mono">{project.paidContractsCount || 0} HĐ</strong></span>
                <span className="font-mono text-emerald-400 font-bold">TT / Quyết toán: {paymentProgressRatio}%</span>
              </div>
            </div>

            {/* NHÓM 4 - DỰ KIẾN QUYẾT TOÁN */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md space-y-2 relative overflow-hidden group hover:border-purple-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  NHÓM 4 • DỰ KIẾN QUYẾT TOÁN
                </span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>

              <div>
                <span className="text-xs text-slate-300 font-medium block">Dự kiến quyết toán toàn bộ HĐ:</span>
                <div className="text-xl font-extrabold text-purple-300 font-mono mt-0.5">
                  {formatVND(projEstimatedSettlement)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Chỉ tiêu sử dụng vốn</span>
                <span className="font-mono text-purple-300 font-bold">Sử dụng TMĐT: {settlementTmdtRatio}%</span>
              </div>
            </div>

            {/* NHÓM 5 - CÒN PHẢI THANH TOÁN */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md space-y-2 relative overflow-hidden group hover:border-amber-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  NHÓM 5 • CÒN PHẢI THANH TOÁN
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>

              <div>
                <span className="text-xs text-slate-300 font-medium block">Còn phải chi (Dự kiến QT - Đã TT):</span>
                <div className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">
                  {formatVND(remainingToPay)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Nghĩa vụ chưa giải ngân</span>
                <span className="font-mono text-amber-300 font-medium">Dư nợ hợp đồng</span>
              </div>
            </div>

            {/* NHÓM 6 - NGÂN SÁCH CÒN LẠI (TMĐT - DỰ KIẾN QUYẾT TOÁN) */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 shadow-md space-y-2 relative overflow-hidden group border-indigo-500/40 bg-indigo-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-indigo-300 tracking-wider">
                  NHÓM 6 • NGÂN SÁCH CÒN LẠI
                </span>
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              </div>

              <div>
                <span className="text-xs text-slate-300 font-medium block">Ngân sách còn lại (TMĐT - Dự kiến QT):</span>
                <div className={`text-xl font-extrabold font-mono mt-0.5 ${
                  remainingProjectBudget >= 0 ? 'text-indigo-400' : 'text-rose-400'
                }`}>
                  {formatVND(remainingProjectBudget)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Chỉ tiêu an toàn tài chính</span>
                <span className={`font-mono font-bold ${remainingProjectBudget >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                  {remainingProjectBudget >= 0 ? 'Trong hạn mức' : 'Vượt TMĐT'}
                </span>
              </div>
            </div>

          </div>

          {/* PROGRESS BARS SECTION */}
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              📈 Các Chỉ Số Tiến Độ Ngân Sách Dự Án
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Progress 1: Ký HĐ / TMĐT */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tiến độ ký hợp đồng (HĐ/TMĐT)</span>
                  <span className="font-bold text-blue-400 font-mono">{signedContractsRatio}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, signedContractsRatio)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{formatVNDCompact(totalSignedContracts)} / {formatVNDCompact(currentTmdt)}</p>
              </div>

              {/* Progress 2: Dự kiến QT / TMĐT */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Dự kiến sử dụng TMĐT (Quyết toán/TMĐT)</span>
                  <span className="font-bold text-purple-300 font-mono">{settlementTmdtRatio}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, settlementTmdtRatio)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{formatVNDCompact(projEstimatedSettlement)} / {formatVNDCompact(currentTmdt)}</p>
              </div>

              {/* Progress 3: Đã TT / Dự kiến QT */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tiến độ thanh toán (Đã TT/Dự kiến QT)</span>
                  <span className="font-bold text-emerald-400 font-mono">{paymentProgressRatio}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, paymentProgressRatio)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{formatVNDCompact(totalPaid)} / {formatVNDCompact(projEstimatedSettlement)}</p>
              </div>

            </div>
          </div>

          {/* LIST OF CONTRACTS IN PROJECT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                📄 Danh Sách Hợp Đồng Thuộc Dự Án ({projContracts.length} HĐ)
              </h4>
              <button
                onClick={handleGoToContracts}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                Quản lý chi tiết danh sách hợp đồng <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Số HĐ</th>
                    <th className="py-2.5 px-3">Nhà Thầu</th>
                    <th className="py-2.5 px-3 text-right">Giá Trị Ký (Sau VAT)</th>
                    <th className="py-2.5 px-3 text-right">Dự Kiến QT</th>
                    <th className="py-2.5 px-3 text-right">Đã Thanh Toán</th>
                    <th className="py-2.5 px-3 text-right">Còn Phải TT</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {projContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{c.contract_number}</td>
                      <td className="py-2.5 px-3 text-slate-300">{c.contractor}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-300">{formatVND(c.contractValueAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-300">{formatVND(c.estimated_settlement_value || c.contractValueAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{formatVND(c.totalPaidAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">{formatVND(c.remainingAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'settled'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {c.status === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {projContracts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-400">
                        Chưa có hợp đồng nào được thêm cho dự án này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Mô hình 3 Giá trị & Quản lý TMĐT tự động
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
}
