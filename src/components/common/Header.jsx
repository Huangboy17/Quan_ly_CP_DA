import React from 'react';
import { 
  Building2, 
  PlusCircle, 
  RotateCcw, 
  Download, 
  Upload, 
  Search, 
  Wallet, 
  FileText,
  HardDrive,
  FileSpreadsheet,
  LogOut,
  UserCheck,
  Database,
  ShieldCheck,
  Menu
} from 'lucide-react';
import { resetStorage, exportData, importData } from '../../services/storage';
import ThemeToggle from './ThemeToggle';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onNewContract, 
  onNewPayment, 
  onOpenExcelImport,
  onDataChange, 
  globalSearch, 
  setGlobalSearch,
  userSession,
  userProfile,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) {

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu? Tất cả dữ liệu hiện tại sẽ được cập nhật lại.')) {
      resetStorage();
      onDataChange();
    }
  };

  const handleExport = () => {
    const backupObj = exportData();
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BuildCost_Backup_${new Date().toISOString().split('T')[0]}.json`;
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
        importData(imported);
        onDataChange();
        alert('Khôi phục dữ liệu từ file JSON thành công!');
      } catch (err) {
        alert('Lỗi khôi phục file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-30 px-2 sm:px-4 lg:px-6 py-2.5 sm:py-3.5 shadow-lg w-full transition-colors">
      <div className="w-full max-w-full flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveTab('profile')}>
            <button 
              className="lg:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition"
              onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-primary text-foreground font-bold">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-1.5 sm:gap-2">
                BUILD<span className="text-primary font-extrabold">COST</span>
                <span className="hidden sm:flex text-[10px] sm:text-xs font-normal px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 items-center gap-1 font-mono">
                  <Database className="w-3 h-3 text-success" /> Supabase Database
                </span>
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground">Quản lý Chi phí & Hợp đồng Xây dựng</p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:hidden">
            <button 
              onClick={onNewContract}
              className="w-9 h-9 sm:p-2 rounded-lg bg-primary text-primary-foreground text-xs flex items-center justify-center gap-1 font-medium hover:bg-primary/90 transition cursor-pointer"
              title="Thêm hợp đồng"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              onClick={onNewPayment}
              className="w-9 h-9 sm:p-2 rounded-lg bg-success text-success-foreground text-xs flex items-center justify-center gap-1 font-medium hover:bg-success/90 transition cursor-pointer"
              title="Thêm thanh toán"
            >
              <Wallet className="w-4 h-4" />
            </button>
            {userSession && (
              <button
                onClick={onLogout}
                className="w-9 h-9 sm:p-2 rounded-lg bg-card text-destructive hover:bg-muted text-xs transition flex items-center justify-center cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, nhà thầu, dự án..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-background/80 border border-border/80 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium"
          />
          {globalSearch && (
            <button 
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Desktop Controls & Quick Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Quick Excel Import Button */}
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
            className="px-3.5 py-2 rounded-lg bg-success hover:bg-success/90 text-success-foreground text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-success/20 transition cursor-pointer"
            title="Import dữ liệu hàng loạt từ tệp Excel (Dự án, Hợp đồng, Thanh toán)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            📥 Import Excel
          </button>

          {/* Quick Add Buttons */}
          {['admin', 'super_admin'].includes(userProfile?.role) && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer ${activeTab === 'admin' ? 'bg-warning text-warning-foreground' : 'bg-warning/10 hover:bg-warning/20 text-warning border border-warning/30'}`}
              title="Quản trị hệ thống (Phê duyệt tài khoản)"
            >
              <ShieldCheck className="w-4 h-4" />
              Quản Trị
            </button>
          )}

          <button
            onClick={onNewContract}
            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            + Hợp Đồng Mới
          </button>

          <button
            onClick={onNewPayment}
            className="px-3.5 py-2 rounded-lg bg-success hover:bg-success/90 text-success-foreground text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-success/20 transition cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            + Thanh Toán Mới
          </button>

          <div className="h-6 w-px bg-border my-auto mx-1" />

          {/* Backup / Export / Reset Tools */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
            <button
              onClick={handleExport}
              title="Xuất file JSON sao lưu (Backup)"
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center gap-1 text-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-primary" />
            </button>

            <label title="Phục hồi dữ liệu từ file JSON (Restore)" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer flex items-center gap-1 text-xs">
              <Upload className="w-4 h-4 text-success" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleReset}
              title="Khôi phục dữ liệu mẫu ban đầu"
              className="p-1.5 rounded text-warning/80 hover:text-warning hover:bg-warning/10 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-border my-auto mx-1" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Session & Logout Badge */}
          {userSession ? (
            <div className="flex items-center gap-2 bg-card border border-success/30 px-3 py-1.5 rounded-lg text-xs" title={`Đã đăng nhập: ${userSession.user?.email}`}>
              <UserCheck className="w-4 h-4 text-success" />
              <div className="text-left max-w-[130px] truncate">
                <p className="font-mono text-success font-bold truncate text-[11px]">{userSession.user?.email}</p>
                <p className="text-[10px] text-muted-foreground">Đã xác thực</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition cursor-pointer ml-1"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg">
              <HardDrive className="w-4 h-4 text-primary" />
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">Supabase Connected</p>
                <p className="text-[10px] text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Đã kết nối DB
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
