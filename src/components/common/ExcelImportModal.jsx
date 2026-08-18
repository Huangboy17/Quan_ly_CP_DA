import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Building2, 
  Wallet, 
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  parseExcelFile, 
  validateAndPrepareProjectImport, 
  commitProjectImport, 
  downloadProjectTemplate,
  validateAndPrepareContractImport,
  commitContractImport,
  downloadContractTemplate,
  validateAndPreparePaymentImport,
  commitPaymentImport,
  downloadPaymentTemplate
} from '../../services/excelImport';
import { getProjects, getContracts, getPayments } from '../../services/storage';
import { formatVND } from '../../utils/formatters';

export default function ExcelImportModal({
  isOpen,
  onClose,
  initialType = 'projects', // 'projects' | 'contracts' | 'payments'
  onSuccess,
  userId = null
}) {
  const [importType, setImportType] = useState(initialType);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleTypeChange = (type) => {
    setImportType(type);
    setSelectedFile(null);
    setAnalysisResult(null);
    setErrorMsg('');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setErrorMsg('');
    setAnalysisResult(null);

    try {
      const rawRows = await parseExcelFile(file);
      
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        setErrorMsg('Tệp Excel trống hoặc không có dữ liệu dòng phù hợp.');
        setIsLoading(false);
        return;
      }

      const existingProjects = getProjects();
      const existingContracts = getContracts();
      const existingPayments = getPayments();

      let result;
      if (importType === 'projects') {
        result = validateAndPrepareProjectImport(rawRows, existingProjects);
      } else if (importType === 'contracts') {
        result = validateAndPrepareContractImport(rawRows, existingProjects, existingContracts);
      } else if (importType === 'payments') {
        result = validateAndPreparePaymentImport(rawRows, existingProjects, existingContracts, existingPayments);
      }

      setAnalysisResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại tệp!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!analysisResult || analysisResult.validRows.length === 0) return;

    // Check userId - required for Supabase sync
    if (!userId) {
      setErrorMsg('Không xác định được tài khoản đăng nhập. Vui lòng đăng nhập lại trước khi Import.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      let result;
      if (importType === 'projects') {
        result = await commitProjectImport(analysisResult.validRows, userId);
      } else if (importType === 'contracts') {
        result = await commitContractImport(analysisResult.validRows, userId);
      } else if (importType === 'payments') {
        result = await commitPaymentImport(analysisResult.validRows, userId);
      }

      const { importResults } = result || {};

      if (importResults && importResults.failCount > 0) {
        // Some rows failed - show detailed error report
        const errorDetails = importResults.errors.map(
          err => `Dòng ${err.line} - ${err.code}: ${err.error}`
        ).join('\n');
        
        const summaryMsg = `Import hoàn tất: ${analysisResult.validRows.length} dòng, thành công ${importResults.successCount}, thất bại ${importResults.failCount}.\n\nChi tiết lỗi:\n${errorDetails}`;
        
        if (importResults.successCount > 0) {
          // Partial success - refresh data and show warning
          if (onSuccess) onSuccess();
          alert(summaryMsg);
          onClose();
        } else {
          // All failed - show error, don't close
          setErrorMsg(summaryMsg);
        }
      } else {
        // All successful
        const totalSuccess = importResults ? importResults.successCount : analysisResult.validRows.length;
        if (onSuccess) onSuccess();
        alert(`Import thành công ${totalSuccess} dòng dữ liệu vào hệ thống!`);
        onClose();
      }
    } catch (err) {
      setErrorMsg('Lỗi khi Import dữ liệu: ' + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (importType === 'projects') downloadProjectTemplate();
    else if (importType === 'contracts') downloadContractTemplate();
    else if (importType === 'payments') downloadPaymentTemplate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                IMPORT DỮ LIỆU HÀNG LOẠT TỪ EXCEL
              </h3>
              <p className="text-xs text-muted-foreground">
                Nhập liệu nhanh hàng loạt cho Dự án, Hợp đồng & Thanh toán.
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

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. SELECTION TABS FOR 3 IMPORT TYPES */}
          <div className="grid grid-cols-3 gap-3 p-1.5 bg-background rounded-2xl border border-border">
            <button
              onClick={() => handleTypeChange('projects')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'projects'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Building2 className="w-4 h-4" /> Import Dự án
            </button>

            <button
              onClick={() => handleTypeChange('contracts')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'contracts'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <FileText className="w-4 h-4" /> Import Hợp đồng
            </button>

            <button
              onClick={() => handleTypeChange('payments')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'payments'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Wallet className="w-4 h-4" /> Import Thanh toán
            </button>
          </div>

          {/* 2. FILE SELECTION & DOWNLOAD TEMPLATE BAR */}
          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                {importType === 'projects' && 'Cột chuẩn: Mã dự án | Tên dự án | Địa chỉ | Chủ đầu tư | Tổng mức đầu tư (VAT) | Tiến độ dự án (ngày)'}
                {importType === 'contracts' && 'Cột chuẩn: Mã dự án | Số hợp đồng | Nội dung hợp đồng | Giá trị trước VAT | VAT (%) | Giá trị sau VAT | Nhà thầu | Ngày ký | Tiến độ HĐ (ngày) | Ngày kết thúc'}
                {importType === 'payments' && 'Cột chuẩn: Mã dự án | Số hợp đồng | Đợt thanh toán | Loại thanh toán | Ngày thanh toán | Giá trị trước VAT | VAT (%) | Giá trị sau VAT'}
              </span>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-success border border-border text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" /> Tải File Excel Mẫu
            </button>
          </div>

          {/* 3. UPLOAD DRAG & DROP ZONE */}
          {!analysisResult && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-10 border-2 border-dashed border-border hover:border-primary/80 rounded-3xl bg-muted/40 hover:bg-primary/10 transition cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition flex items-center justify-center shadow-lg">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Nhấp vào đây để chọn tệp Excel dữ liệu</h4>
                <p className="text-xs text-muted-foreground mt-1">Hỗ trợ các định dạng tệp .xlsx, .xls, .csv</p>
              </div>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Đang đọc và phân tích file Excel...</p>
            </div>
          )}

          {/* ERROR MSG */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 4. PREVIEW ANALYSIS DASHBOARD */}
          {analysisResult && (
            <div className="space-y-6">
              
              {/* File Selected Badge */}
              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-foreground">
                  <FileSpreadsheet className="w-4 h-4 text-success" />
                  <span className="font-bold">{selectedFile?.name}</span>
                </div>
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-background border border-border text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Đã đọc</span>
                  <span className="text-xl font-mono font-bold text-foreground mt-1 block">{analysisResult.stats.total} dòng</span>
                </div>

                <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-success block">Hợp lệ</span>
                  <span className="text-xl font-mono font-bold text-success mt-1 block">{analysisResult.stats.validCount} dòng</span>
                </div>

                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-destructive block">Dòng lỗi</span>
                  <span className="text-xl font-mono font-bold text-destructive mt-1 block">{analysisResult.stats.errorCount} dòng</span>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-primary block">Thêm mới / Update</span>
                  <span className="text-xs font-mono font-bold text-primary mt-1.5 block">
                    Thêm {analysisResult.stats.newCount} | Sửa {analysisResult.stats.updateCount}
                  </span>
                </div>
              </div>

              {/* Error Rows Table (If Any Errors exist) */}
              {analysisResult.errorRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-3">
                  <h4 className="text-xs font-bold text-destructive flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-4 h-4" /> Danh sách {analysisResult.errorRows.length} dòng dữ liệu bị lỗi (Không thể import):
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-destructive/30 rounded-xl bg-background">
                    <table className="w-full text-left text-xs text-foreground/80">
                      <thead className="bg-destructive/20 text-destructive text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Dòng Excel</th>
                          <th className="py-2 px-3">Mã / Số HĐ</th>
                          <th className="py-2 px-3">Lý do lỗi chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analysisResult.errorRows.map((err, i) => (
                          <tr key={i} className="hover:bg-destructive/10">
                            <td className="py-2 px-3 font-mono font-bold text-destructive">Dòng {err.line}</td>
                            <td className="py-2 px-3 font-mono text-foreground">{err.code}</td>
                            <td className="py-2 px-3 text-destructive/80">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valid Data Rows Preview Table */}
              {analysisResult.validRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                  <h4 className="text-xs font-bold text-success flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-4 h-4" /> Xem trước {analysisResult.validRows.length} dòng dữ liệu hợp lệ sẵn sàng Import:
                  </h4>
                  <div className="max-h-52 overflow-y-auto border border-border rounded-xl bg-card">
                    <table className="w-full text-left text-xs text-foreground/80">
                      <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Thao tác</th>
                          <th className="py-2 px-3">Mã / Số HĐ</th>
                          <th className="py-2 px-3">Tên / Nội dung</th>
                          <th className="py-2 px-3 text-right">Giá trị (VND)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analysisResult.validRows.slice(0, 100).map((row, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.actionType === 'NEW' 
                                  ? 'bg-success/10 text-success border border-success/30'
                                  : 'bg-primary/10 text-primary border border-primary/30'
                              }`}>
                                {row.actionType === 'NEW' ? 'Thêm mới' : 'Cập nhật'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-foreground">{row.code || row.contract_number}</td>
                            <td className="py-2 px-3 truncate max-w-xs">{row.name || row.content}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {formatVND(row.initial_tmdt || row.contractValueAfterVAT || row.amount_after_vat)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition cursor-pointer"
          >
            Hủy Bỏ
          </button>

          {analysisResult && analysisResult.validRows.length > 0 && (
            <button
              onClick={handleCommitImport}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/30 transition cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              XÁC NHẬN IMPORT ({analysisResult.validRows.length} DÒNG HỢP LỆ)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
