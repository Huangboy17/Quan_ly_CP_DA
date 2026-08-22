import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
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
  Menu,
  ChevronDown,
  MoreVertical,
  SlidersHorizontal
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
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const toolsRef = useRef(null);
  const createRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) {
        setIsToolsOpen(false);
      }
      if (createRef.current && !createRef.current.contains(event.target)) {
        setIsCreateOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu? Tất cả dữ liệu hiện tại sẽ được cập nhật lại.')) {
      resetStorage();
      onDataChange();
      setIsToolsOpen(false);
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
    setIsToolsOpen(false);
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
        setIsToolsOpen(false);
      } catch (err) {
        alert('Lỗi khôi phục file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-30 px-3 sm:px-4 lg:px-6 py-2.5 shadow-2xs w-full transition-colors">
      <div className="w-full max-w-full flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Brand & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('profile')}>
            <button 
              className="lg:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
              onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xs text-white font-bold shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1.5 leading-tight">
                BUILD<span className="text-primary font-extrabold">COST</span>
                <span className="hidden sm:inline-flex text-[10px] font-normal px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 items-center gap-1 font-mono">
                  <Database className="w-2.5 h-2.5" /> Supabase
                </span>
              </h1>
              <p className="hidden sm:block text-[11px] text-muted-foreground">Quản lý Chi phí & Hợp đồng Xây dựng</p>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button 
              onClick={onNewContract}
              className="p-2 rounded-lg bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium hover:bg-primary/90 transition"
              title="Thêm hợp đồng"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              onClick={onNewPayment}
              className="p-2 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-medium hover:bg-emerald-700 transition"
              title="Thêm thanh toán"
            >
              <Wallet className="w-4 h-4" />
            </button>
            {userSession && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-card text-destructive hover:bg-muted border border-border text-xs transition flex items-center justify-center"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="w-full md:w-72 lg:w-96 relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm số HĐ, nhà thầu, dự án... (Ctrl+K)"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium"
          />
          {globalSearch && (
            <button 
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Desktop Controls & Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          
          {/* Quick Create Dropdown Menu */}
          <div className="relative" ref={createRef}>
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {isCreateOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-card border border-border shadow-lg py-1 z-40 animate-in fade-in-50 zoom-in-95">
                <button
                  onClick={() => { setIsCreateOpen(false); onNewContract(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition text-left cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>+ Hợp đồng mới</span>
                </button>
                <button
                  onClick={() => { setIsCreateOpen(false); onNewPayment(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition text-left cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+ Thanh toán mới</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Excel Import Button */}
          <button
            onClick={() => onOpenExcelImport && onOpenExcelImport('projects')}
            className="px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Import dữ liệu hàng loạt từ tệp Excel (Dự án, Hợp đồng, Thanh toán)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Import Excel</span>
          </button>

          {/* Admin System Management Link (if admin) */}
          {['admin', 'super_admin'].includes(userProfile?.role) && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                activeTab === 'admin' 
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold' 
                  : 'bg-card hover:bg-muted text-amber-600 dark:text-amber-400 border-border'
              }`}
              title="Quản trị hệ thống (Phê duyệt tài khoản & Hạn mức Quota)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quản trị</span>
            </button>
          )}

          {/* Backup / Tools Dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="p-1.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs transition cursor-pointer"
              title="Công cụ dữ liệu & Sao lưu JSON"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isToolsOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-xl bg-card border border-border shadow-lg py-1 z-40 animate-in fade-in-50 zoom-in-95">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition text-left cursor-pointer"
                  title="Xuất file JSON sao lưu (Backup)"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Xuất file Backup (JSON)</span>
                </button>

                <label 
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition text-left cursor-pointer"
                  title="Phục hồi dữ liệu từ file JSON (Restore)"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Phục hồi từ file JSON</span>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handleReset}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition text-left cursor-pointer"
                  title="Khôi phục dữ liệu mẫu ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục dữ liệu mẫu</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Session & Profile Badge */}
          {userSession ? (
            <div className="flex items-center gap-2 bg-card border border-border px-2.5 py-1 rounded-lg text-xs" title={`Đã đăng nhập: ${userSession.user?.email}`}>
              <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="text-left max-w-[120px] truncate">
                <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate text-[11px] leading-none">{userSession.user?.email}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">Đã xác thực</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition cursor-pointer ml-0.5"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded-lg">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              <div className="text-left">
                <p className="text-[11px] font-semibold text-foreground leading-none">Supabase DB</p>
                <p className="text-[9px] text-emerald-500 font-medium leading-none mt-0.5">Đã kết nối</p>
              </div>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}

