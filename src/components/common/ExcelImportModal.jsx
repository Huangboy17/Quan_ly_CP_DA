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
  onSuccess
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

    setIsLoading(true);
    try {
      if (importType === 'projects') {
        await commitProjectImport(analysisResult.validRows);
      } else if (importType === 'contracts') {
        await commitContractImport(analysisResult.validRows);
      } else if (importType === 'payments') {
        await commitPaymentImport(analysisResult.validRows);
      }

      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg('Lỗi khi lưu dữ liệu lên Supabase: ' + err.message);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                IMPORT DỮ LIỆU HÀNG LOẠT TỪ EXCEL
              </h3>
              <p className="text-xs text-slate-400">
                Nhập liệu nhanh hàng loạt cho Dự án, Hợp đồng & Thanh toán.
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

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. SELECTION TABS FOR 3 IMPORT TYPES */}
          <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              onClick={() => handleTypeChange('projects')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'projects'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" /> Import Dự Án
            </button>

            <button
              onClick={() => handleTypeChange('contracts')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'contracts'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" /> Import Hợp Đồng
            </button>

            <button
              onClick={() => handleTypeChange('payments')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'payments'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" /> Import Thanh Toán
            </button>
          </div>

          {/* 2. FILE SELECTION & DOWNLOAD TEMPLATE BAR */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                {importType === 'projects' && 'Cột chuẩn: Mã dự án | Tên dự án | Địa chỉ | Chủ đầu tư | Tổng mức đầu tư (VAT) | Tiến độ dự án (ngày)'}
                {importType === 'contracts' && 'Cột chuẩn: Mã dự án | Số hợp đồng | Nội dung hợp đồng | Giá trị trước VAT | VAT (%) | Giá trị sau VAT | Nhà thầu | Ngày ký | Tiến độ HĐ (ngày) | Ngày kết thúc'}
                {importType === 'payments' && 'Cột chuẩn: Mã dự án | Số hợp đồng | Đợt thanh toán | Loại thanh toán | Ngày thanh toán | Giá trị trước VAT | VAT (%) | Giá trị sau VAT'}
              </span>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" /> Tải File Excel Mẫu
            </button>
          </div>

          {/* 3. UPLOAD DRAG & DROP ZONE */}
          {!analysisResult && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-10 border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-3xl bg-slate-950/40 hover:bg-blue-950/20 transition cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition flex items-center justify-center shadow-lg">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Nhấp vào đây để chọn tệp Excel dữ liệu</h4>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ các định dạng tệp .xlsx, .xls, .csv</p>
              </div>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">Đang đọc và phân tích file Excel...</p>
            </div>
          )}

          {/* ERROR MSG */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 4. PREVIEW ANALYSIS DASHBOARD */}
          {analysisResult && (
            <div className="space-y-6">
              
              {/* File Selected Badge */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">{selectedFile?.name}</span>
                </div>
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Đã đọc</span>
                  <span className="text-xl font-mono font-bold text-white mt-1 block">{analysisResult.stats.total} dòng</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">✓ Hợp lệ</span>
                  <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">{analysisResult.stats.validCount} dòng</span>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">⚠ Dòng lỗi</span>
                  <span className="text-xl font-mono font-bold text-rose-400 mt-1 block">{analysisResult.stats.errorCount} dòng</span>
                </div>

                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-300 block">Thêm mới / Update</span>
                  <span className="text-xs font-mono font-bold text-blue-300 mt-1.5 block">
                    Thêm {analysisResult.stats.newCount} | Sửa {analysisResult.stats.updateCount}
                  </span>
                </div>
              </div>

              {/* Error Rows Table (If Any Errors exist) */}
              {analysisResult.errorRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-3">
                  <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-4 h-4" /> Danh sách {analysisResult.errorRows.length} dòng dữ liệu bị lỗi (Không thể import):
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-rose-500/30 rounded-xl bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-rose-950/60 text-rose-300 text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Dòng Excel</th>
                          <th className="py-2 px-3">Mã / Số HĐ</th>
                          <th className="py-2 px-3">Lý do lỗi chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {analysisResult.errorRows.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-950/30">
                            <td className="py-2 px-3 font-mono font-bold text-rose-400">Dòng {err.line}</td>
                            <td className="py-2 px-3 font-mono text-slate-300">{err.code}</td>
                            <td className="py-2 px-3 text-rose-300">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valid Data Rows Preview Table */}
              {analysisResult.validRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-4 h-4" /> Xem trước {analysisResult.validRows.length} dòng dữ liệu hợp lệ sẵn sàng Import:
                  </h4>
                  <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Thao tác</th>
                          <th className="py-2 px-3">Mã / Số HĐ</th>
                          <th className="py-2 px-3">Tên / Nội dung</th>
                          <th className="py-2 px-3 text-right">Giá trị (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {analysisResult.validRows.slice(0, 100).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.actionType === 'NEW' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                              }`}>
                                {row.actionType === 'NEW' ? 'Thêm mới' : 'Cập nhật'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-white">{row.code || row.contract_number}</td>
                            <td className="py-2 px-3 truncate max-w-xs">{row.name || row.content}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-300">
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Hủy Bỏ
          </button>

          {analysisResult && analysisResult.validRows.length > 0 && (
            <button
              onClick={handleCommitImport}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2"
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
