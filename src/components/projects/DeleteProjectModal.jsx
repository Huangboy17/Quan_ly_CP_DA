import React, { useState, useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              step === 3 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {step === 3 ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {step === 3 ? 'ĐÃ XÓA DỰ ÁN THÀNH CÔNG' : 'XÓA DỰ ÁN VĨNH VIỄN?'}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 1 && 'Bước 1/2: Cảnh báo xóa dữ liệu liên lụy'}
                {step === 2 && 'Bước 2/2: Nhập mã xác nhận bảo mật'}
                {step === 3 && 'Kết quả xóa cascade toàn bộ hệ thống'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1">
          
          {/* STEP 1: WARNING STEP */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-3">
                <div className="flex items-start gap-3 text-rose-300">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Bạn có chắc chắn muốn xóa dự án này không?</h4>
                    <p className="text-xs text-rose-200/90 leading-relaxed mt-1">
                      Dự án <strong className="text-white">"{project.name}"</strong> ({targetCode}) sẽ bị xóa cùng toàn bộ dữ liệu con liên quan:
                    </p>
                  </div>
                </div>

                <ul className="text-xs text-slate-300 space-y-1.5 pl-9 list-disc">
                  <li>Toàn bộ <strong className="text-white">{contractsCount} hợp đồng</strong> thuộc dự án.</li>
                  <li>Toàn bộ <strong className="text-white">{paymentsCount} đợt thanh toán</strong> thuộc các hợp đồng.</li>
                  <li>Dữ liệu tổng mức đầu tư & quyết toán.</li>
                  <li>Các phụ lục và báo cáo liên quan khác.</li>
                </ul>

                <p className="text-xs font-bold text-rose-400 pl-4 border-l-2 border-rose-500">
                  Thao tác này không thể hoàn tác!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span>Dự án đang chọn:</span>
                <span className="font-mono font-bold text-blue-400">{project.name}</span>
              </div>
            </div>
          )}

          {/* STEP 2: CODE VERIFICATION STEP */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <p className="text-slate-300">
                  Để đảm bảo không bấm nhầm, hãy nhập đúng mã dự án <strong className="text-amber-400 font-mono text-sm px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">{targetCode}</strong> hoặc tên dự án để xác nhận xóa:
                </p>

                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={`Nhập mã "${targetCode}"...`}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-rose-500 transition"
                  autoFocus
                />

                {confirmInput && !isCodeMatched && (
                  <p className="text-[11px] text-rose-400 font-semibold">
                    Mã xác nhận chưa khớp với "{targetCode}". Vui lòng kiểm tra lại.
                  </p>
                )}

                {isCodeMatched && (
                  <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác nhận đúng mã dự án. Bạn có thể xóa vĩnh viễn ngay.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS SUMMARY REPORT */}
          {step === 3 && deletionSummary && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 space-y-3">
                <h4 className="font-bold text-sm text-white">Đã xóa dự án thành công!</h4>
                
                <div className="text-xs space-y-2 font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-slate-200">
                    Dự án: <span className="font-bold text-blue-300">{deletionSummary.deletedProject?.name || targetCode}</span> ({targetCode})
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-slate-300 space-y-1">
                    <div>✓ Đã xóa: <strong className="text-emerald-400">{deletionSummary.deletedContractsCount} hợp đồng</strong></div>
                    <div>✓ Đã xóa: <strong className="text-emerald-400">{deletionSummary.deletedPaymentsCount} đợt thanh toán</strong></div>
                    <div>✓ Toàn bộ dữ liệu quyết toán & phụ lục liên quan</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-sans">
                  Hệ thống đã làm sạch 100% dữ liệu mồ côi. Dashboard và các dự án khác đã được tự động cập nhật.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleProceedToStep2}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
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
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Quay lại Bước 1
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={!isCodeMatched}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isCodeMatched
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
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
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
            >
              Hoàn Tất & Đóng
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
