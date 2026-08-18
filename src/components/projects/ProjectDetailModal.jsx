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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-muted/80 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bảng Thống Kê Tổng Quan Tài Chính & Tiến Độ Chi Trả Dự Án
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenTmdtAdjustment(project)}
              className="px-3 py-1.5 rounded-lg bg-success hover:bg-success text-foreground text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1"
            >
              + Cập Nhật TMĐT
            </button>
            <button
              onClick={() => onOpenTmdtHistory(project)}
              className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> Lịch Sử TMĐT
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition ml-2"
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
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'bg-warning/10 border-warning/30 text-warning'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{w.message}</span>
                  </div>
                  {w.excess > 0 && (
                    <span className="font-mono font-bold bg-card/60 px-2.5 py-1 rounded border border-border">
                      Chênh lệch: +{formatVND(w.excess)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SECTION HEADER */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-success" />
              Tổng Quan Tài Chính Dự Án (6 Nhóm Chỉ Tiêu)
            </h4>
            <span className="text-xs text-muted-foreground font-mono">Cập nhật tự động từ HĐ & TT</span>
          </div>

          {/* 6 FINANCIAL GROUPS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* NHÓM 1 - NGÂN SÁCH DỰ ÁN (TMĐT) */}
            <div className="p-4 rounded-xl bg-muted/80 border border-border/70 shadow-md space-y-2 relative overflow-hidden group hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                  NHÓM 1 — NGÂN SÁCH DỰ ÁN
                </span>
                <DollarSign className="w-4 h-4 text-success" />
              </div>

              <div>
                <span className="text-xs text-foreground/80 font-medium block">Tổng mức đầu tư hiện tại:</span>
                <div className="text-xl font-extrabold text-foreground font-mono mt-0.5">
                  {formatVND(currentTmdt)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between font-mono">
                <span>TMĐT Ban đầu: {formatVNDCompact(initialTmdt)}</span>
                <span className={tmdtDelta >= 0 ? 'text-success' : 'text-destructive'}>
                  {tmdtDelta >= 0 ? `+${formatVNDCompact(tmdtDelta)}` : formatVNDCompact(tmdtDelta)}
                </span>
              </div>
            </div>

            {/* NHÓM 2 - TÌNH HÌNH HỢP ĐỒNG */}
            <div 
              onClick={handleGoToContracts}
              className="p-4 rounded-xl bg-muted/80 border border-border/70 shadow-md space-y-2 relative overflow-hidden group hover:border-primary/50 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                  NHÓM 2 — TÌNH HÌNH HỢP ĐỒNG
                </span>
                <FileText className="w-4 h-4 text-primary" />
              </div>

              <div>
                <span className="text-xs text-foreground/80 font-medium block">Tổng giá trị HĐ đã ký (Sau VAT):</span>
                <div className="text-xl font-extrabold text-primary font-mono mt-0.5">
                  {formatVND(totalSignedContracts)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Số HĐ: <strong className="text-foreground font-mono">{contractsCount} HĐ</strong></span>
                <span className="font-mono text-primary font-bold">Ký / TMĐT: {signedContractsRatio}%</span>
              </div>
            </div>

            {/* NHÓM 3 - TÌNH HÌNH THANH TOÁN */}
            <div 
              onClick={handleGoToPayments}
              className="p-4 rounded-xl bg-muted/80 border border-border/70 shadow-md space-y-2 relative overflow-hidden group hover:border-success/50 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                  NHÓM 3 — TÌNH HÌNH THANH TOÁN
                </span>
                <CreditCard className="w-4 h-4 text-success" />
              </div>

              <div>
                <span className="text-xs text-foreground/80 font-medium block">Đã thanh toán thực tế (Sau VAT):</span>
                <div className="text-xl font-extrabold text-success font-mono mt-0.5">
                  {formatVND(totalPaid)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Đã phát sinh TT: <strong className="text-foreground font-mono">{project.paidContractsCount || 0} HĐ</strong></span>
                <span className="font-mono text-success font-bold">TT / Quyết toán: {paymentProgressRatio}%</span>
              </div>
            </div>

            {/* NHÓM 4 - DỰ KIẾN QUYẾT TOÁN */}
            <div className="p-4 rounded-xl bg-muted/80 border border-border/70 shadow-md space-y-2 relative overflow-hidden group hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                  NHÓM 4 — DỰ KIẾN QUYẾT TOÁN
                </span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>

              <div>
                <span className="text-xs text-foreground/80 font-medium block">Dự kiến quyết toán toàn bộ HĐ:</span>
                <div className="text-xl font-extrabold text-primary/80 font-mono mt-0.5">
                  {formatVND(projEstimatedSettlement)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Chỉ tiêu sử dụng vốn</span>
                <span className="font-mono text-primary/80 font-bold">Sử dụng TMĐT: {settlementTmdtRatio}%</span>
              </div>
            </div>

            {/* NHÓM 5 - CÒN PHẢI THANH TOÁN */}
            <div className="p-4 rounded-xl bg-muted/80 border border-border/70 shadow-md space-y-2 relative overflow-hidden group hover:border-warning/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                  NHÓM 5 — CÒN PHẢI THANH TOÁN
                </span>
                <Clock className="w-4 h-4 text-warning" />
              </div>

              <div>
                <span className="text-xs text-foreground/80 font-medium block">Còn phải chi (Dự kiến QT - Đã TT):</span>
                <div className="text-xl font-extrabold text-warning font-mono mt-0.5">
                  {formatVND(remainingToPay)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Nghĩa vụ chưa giải ngân</span>
                <span className="font-mono text-warning font-medium">Dư nợ hợp đồng</span>
              </div>
            </div>

            {/* NHÓM 6 - NGÂN SÁCH CÒN LẠI (TMĐT - DỰ KIẾN QUYẾT TOÁN) */}
            <div className="p-4 rounded-xl bg-muted/80 border border-border/70 shadow-md space-y-2 relative overflow-hidden group border-primary/40 bg-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-primary/80 tracking-wider">
                  NHÓM 6 — NGÂN SÁCH CÒN LẠI
                </span>
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>

              <div>
                <span className="text-xs text-foreground/80 font-medium block">Ngân sách còn lại (TMĐT - Dự kiến QT):</span>
                <div className={`text-xl font-extrabold font-mono mt-0.5 ${
                  remainingProjectBudget >= 0 ? 'text-primary' : 'text-destructive'
                }`}>
                  {formatVND(remainingProjectBudget)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Chỉ tiêu an toàn tài chính</span>
                <span className={`font-mono font-bold ${remainingProjectBudget >= 0 ? 'text-primary/80' : 'text-destructive'}`}>
                  {remainingProjectBudget >= 0 ? 'Trong hạn mức' : 'Vượt TMĐT'}
                </span>
              </div>
            </div>

          </div>

          {/* PROGRESS BARS SECTION */}
          <div className="p-5 rounded-2xl bg-muted/60 border border-border/60 space-y-4">
            <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
              📊 Các Chỉ Số Tiến Độ Ngân Sách Dự Án
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Progress 1: Ký HĐ / TMĐT */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tiến độ ký hợp đồng (HĐ/TMĐT)</span>
                  <span className="font-bold text-primary font-mono">{signedContractsRatio}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, signedContractsRatio)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{formatVNDCompact(totalSignedContracts)} / {formatVNDCompact(currentTmdt)}</p>
              </div>

              {/* Progress 2: Dự kiến QT / TMĐT */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dự kiến sử dụng TMĐT (Quyết toán/TMĐT)</span>
                  <span className="font-bold text-primary/80 font-mono">{settlementTmdtRatio}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, settlementTmdtRatio)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{formatVNDCompact(projEstimatedSettlement)} / {formatVNDCompact(currentTmdt)}</p>
              </div>

              {/* Progress 3: Đã TT / Dự kiến QT */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tiến độ thanh toán (Đã TT/Dự kiến QT)</span>
                  <span className="font-bold text-success font-mono">{paymentProgressRatio}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, paymentProgressRatio)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{formatVNDCompact(totalPaid)} / {formatVNDCompact(projEstimatedSettlement)}</p>
              </div>

            </div>
          </div>

          {/* LIST OF CONTRACTS IN PROJECT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                📝 Danh Sách Hợp Đồng Thuộc Dự Án ({projContracts.length} HĐ)
              </h4>
              <button
                onClick={handleGoToContracts}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
              >
                Quản lý chi tiết danh sách hợp đồng <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs text-foreground/80">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
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
                <tbody className="divide-y divide-border bg-card/60">
                  {projContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">{c.contract_number}</td>
                      <td className="py-2.5 px-3 text-foreground/80">{c.contractor}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">{formatVND(c.contractValueAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary/80">{formatVND(c.estimated_settlement_value || c.contractValueAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-success">{formatVND(c.totalPaidAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-warning">{formatVND(c.remainingAfterVAT)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'settled'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-success/10 text-success border-success/30'
                        }`}>
                          {c.status === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {projContracts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-muted-foreground">
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
        <div className="px-6 py-3 bg-muted/80 border-t border-border/80 flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-mono">
            Mô hình 3 Giá trị & Quản lý TMĐT tự động
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
}
