import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  FileText, 
  CreditCard 
} from 'lucide-react';

export default function DeleteProjectModal({
  isOpen,
  onClose,
  project,
  contractsCount = 0,
  paymentsCount = 0,
  onConfirmDelete
}) {
  const [step, setStep] = useState(1); // 1: Warning, 2: Security Input, 3: Success Report
  const [confirmInput, setConfirmInput] = useState('');
  const [deletionSummary, setDeletionSummary] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmInput('');
      setDeletionSummary(null);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const targetCode = project.id || project.code || '';
  const targetName = project.name || '';

  // Checks if input matches project code or name (case-insensitive trim)
  const isCodeMatched = confirmInput.trim().toUpperCase() === targetCode.trim().toUpperCase() || 
                        confirmInput.trim().toUpperCase() === targetName.trim().toUpperCase();

  const handleProceedToStep2 = () => {
    setStep(2);
  };

  const handleExecuteDelete = () => {
    if (!isCodeMatched) return;

    const result = onConfirmDelete(project.id);
    setDeletionSummary(result);
    setStep(3); // Show Success Summary
  };

  const handleFinish = () => {
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-md cursor-pointer"
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Main Centered Modal Window */}
      <div 
        className="bg-card border border-border rounded-3xl w-[92vw] max-w-lg max-h-[88vh] shadow-2xl overflow-hidden flex flex-col"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999
        }}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-card/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              step === 3 
                ? 'bg-success/10 text-success border-success/30' 
                : 'bg-destructive/10 text-destructive border-destructive/30'
            }`}>
              {step === 3 ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {step === 3 ? 'ĐÃ XÓA DỰ ÁN THÀNH CÔNG' : 'XÓA DỰ ÁN VĨNH VIỄN?'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {step === 1 && 'Bước 1/2: Cảnh báo xóa dữ liệu liên lụy'}
                {step === 2 && 'Bước 2/2: Nhập mã xác nhận bảo mật'}
                {step === 3 && 'Kết quả xóa cascade toàn bộ hệ thống'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0">
          
          {/* STEP 1: WARNING STEP */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-destructive/50 space-y-3">
                <div className="flex items-start gap-3 text-rose-300">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Bạn có chắc chắn muốn xóa dự án này không?</h4>
                    <p className="text-xs text-rose-200/90 leading-relaxed mt-1">
                      Dự án <strong className="text-foreground">"{project.name}"</strong> ({targetCode}) sẽ bị xóa cùng toàn bộ dữ liệu con liên quan:
                    </p>
                  </div>
                </div>

                <ul className="text-xs text-foreground/80 space-y-1.5 pl-9 list-disc">
                  <li>Toàn bộ <strong className="text-foreground">{contractsCount} hợp đồng</strong> thuộc dự án.</li>
                  <li>Toàn bộ <strong className="text-foreground">{paymentsCount} đợt thanh toán</strong> thuộc các hợp đồng.</li>
                  <li>Dữ liệu tổng mức đầu tư & quyết toán.</li>
                  <li>Các phụ lục và báo cáo liên quan khác.</li>
                </ul>

                <p className="text-xs font-bold text-destructive pl-4 border-l-2 border-destructive">
                  Thao tác này không thể hoàn tác!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-foreground/80 flex items-center justify-between">
                <span>Dự án đang chọn:</span>
                <span className="font-mono font-bold text-primary">{project.name}</span>
              </div>
            </div>
          )}

          {/* STEP 2: CODE VERIFICATION STEP */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3 text-xs">
                <p className="text-foreground/80">
                  Để đảm bảo không bấm nhầm, hãy nhập đúng mã dự án <strong className="text-warning font-mono text-sm px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20">{targetCode}</strong> hoặc tên dự án để xác nhận xóa:
                </p>

                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={`Nhập mã "${targetCode}"...`}
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm font-mono font-bold text-foreground focus:outline-none focus:border-destructive transition"
                  autoFocus
                />

                {confirmInput && !isCodeMatched && (
                  <p className="text-[11px] text-destructive font-semibold">
                    Mã xác nhận chưa khớp với "{targetCode}". Vui lòng kiểm tra lại.
                  </p>
                )}

                {isCodeMatched && (
                  <p className="text-[11px] text-success font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác nhận đúng mã dự án. Bạn có thể xóa vĩnh viễn ngay.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS SUMMARY REPORT */}
          {step === 3 && deletionSummary && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-success/40 text-emerald-300 space-y-3">
                <h4 className="font-bold text-sm text-foreground">Đã xóa dự án thành công!</h4>
                
                <div className="text-xs space-y-2 font-mono bg-background p-3.5 rounded-xl border border-border">
                  <div className="text-foreground">
                    Dự án: <span className="font-bold text-blue-300">{deletionSummary.deletedProject?.name || targetCode}</span> ({targetCode})
                  </div>
                  <div className="pt-2 border-t border-border text-foreground/80 space-y-1">
                    <div>✓ Đã xóa: <strong className="text-success">{deletionSummary.deletedContractsCount} hợp đồng</strong></div>
                    <div>✓ Đã xóa: <strong className="text-success">{deletionSummary.deletedPaymentsCount} đợt thanh toán</strong></div>
                    <div>✓ Toàn bộ dữ liệu quyết toán & phụ lục liên quan</div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground font-sans">
                  Hệ thống đã làm sạch 100% dữ liệu mồ côi. Dashboard và các dự án khác đã được tự động cập nhật.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border bg-card/90 flex items-center justify-between shrink-0">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground/80 text-xs font-semibold transition cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleProceedToStep2}
                className="px-5 py-2.5 rounded-xl bg-destructive hover:bg-destructive text-foreground text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Tiếp Tục Xóa (Bước 2)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground/80 text-xs font-semibold transition cursor-pointer"
              >
                Quay lại Bước 1
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={!isCodeMatched}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isCodeMatched
                    ? 'bg-destructive hover:bg-destructive text-foreground shadow-lg shadow-rose-600/30'
                    : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                XÁC NHẬN XÓA VĨNH VIỄN DỰ ÁN
              </button>
            </>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary text-foreground text-xs font-bold shadow-lg transition cursor-pointer"
            >
              Hoàn Tất & Đóng
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
