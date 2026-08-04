import React from 'react';
import { 
  Building2, 
  PlusCircle, 
  RotateCcw, 
  Download, 
  Upload, 
  Search, 
  Wallet, 
  FileText 
} from 'lucide-react';
import { resetStorage, getAggregatedData } from '../../services/storage';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onNewContract, 
  onNewPayment, 
  onDataChange, 
  globalSearch, 
  setGlobalSearch 
}) {

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu? Tất cả dữ liệu hiện tại sẽ được cập nhật lại.')) {
      resetStorage();
      onDataChange();
    }
  };

  const handleExport = () => {
    const data = getAggregatedData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuanLyChiPhi_BaoCao_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.projects && imported.contracts && imported.payments) {
          localStorage.setItem('ql_cp_projects_v1', JSON.stringify(imported.projects));
          localStorage.setItem('ql_cp_contracts_v1', JSON.stringify(imported.contracts));
          localStorage.setItem('ql_cp_payments_v1', JSON.stringify(imported.payments));
          onDataChange();
          alert('Nhập dữ liệu thành công!');
        } else {
          alert('File JSON không hợp lệ! Thiếu cấu trúc dự án/hợp đồng/thanh toán.');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                BUILD<span className="text-blue-400 font-extrabold">COST</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v2.5 Enterprise
                </span>
              </h1>
              <p className="text-xs text-slate-400">Quản lý Chi phí & Hợp đồng Xây dựng</p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={onNewContract}
              className="p-2 rounded-lg bg-blue-600 text-white text-xs flex items-center gap-1 font-medium hover:bg-blue-500 transition"
              title="Thêm hợp đồng"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              onClick={onNewPayment}
              className="p-2 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1 font-medium hover:bg-emerald-500 transition"
              title="Thêm thanh toán"
            >
              <Wallet className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, nhà thầu, dự án..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
          {globalSearch && (
            <button 
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Desktop Controls & Quick Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Quick Add Buttons */}
          <button
            onClick={onNewContract}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            + Hợp Đồng Mới
          </button>

          <button
            onClick={onNewPayment}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            + Thanh Toán Mới
          </button>

          <div className="h-6 w-px bg-slate-800 my-auto mx-1" />

          {/* Backup / Export / Reset Tools */}
          <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={handleExport}
              title="Xuất dữ liệu JSON báo cáo"
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition"
            >
              <Download className="w-4 h-4" />
            </button>

            <label title="Nhập file JSON sao lưu" className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleReset}
              title="Khôi phục dữ liệu mẫu ban đầu"
              className="p-1.5 rounded text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
