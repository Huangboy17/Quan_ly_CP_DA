import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllProfiles, updateProfileStatus, updateProfileQuota, updateLevel1Profile, safeDeleteAccount } from '../../services/storage';
import { Users, CheckCircle, XCircle, Clock, Search, Shield, MoreVertical, X, Edit, Settings, Trash2, Unlock, Lock, UserCheck, Eye, AlertTriangle, Loader2 } from 'lucide-react';

// ========== EDIT ACCOUNT MODAL ==========
function EditAccountModal({ account, isOpen, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setFullName(account.full_name || '');
      setPhone(account.phone || '');
      setError('');
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await updateLevel1Profile(account.id, { fullName, phone });
    setLoading(false);
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold">Sửa thông tin tài khoản</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <input type="text" value={account.email} disabled className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Họ tên</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary" placeholder="Nhập họ tên" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Số điện thoại</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary" placeholder="Nhập số điện thoại" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-muted transition">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== QUOTA MODAL ==========
function QuotaModal({ account, currentCount, isOpen, onClose, onSuccess }) {
  const [newQuota, setNewQuota] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setNewQuota(account.max_quota || 0);
      setError('');
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const remaining = newQuota - currentCount;
  const isOverQuota = remaining < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await updateProfileQuota(account.id, parseInt(newQuota));
    setLoading(false);
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold">Chỉnh hạn mức thành viên</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tài khoản:</span>
              <span className="font-medium">{account.email}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Đang sử dụng:</span>
              <span className="font-bold text-foreground">{currentCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Quota hiện tại:</span>
              <span className="font-medium">{account.max_quota || 0}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Quota mới</label>
            <input type="number" min="0" value={newQuota} onChange={e => setNewQuota(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary" />
          </div>

          <div className={`text-xs p-2 rounded-lg border ${isOverQuota ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
            {isOverQuota ? (
              <>⚠️ Tài khoản đang vượt hạn mức. Hiện có {currentCount} thành viên nhưng quota chỉ còn {newQuota}. Hệ thống sẽ không cho tạo thêm cho đến khi giảm xuống dưới quota.</>
            ) : (
              <>✓ Còn lại: {remaining} slot. Sau khi lưu: {currentCount} / {newQuota}</>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-muted transition">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Cập nhật quota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== DELETE CONFIRM MODAL ==========
function DeleteConfirmModal({ account, isOpen, onClose, onConfirm, isDeleting }) {
  if (!isOpen || !account) return null;

  const isLevel1 = account.role === 'level_1' || account.role === 'admin';
  const subCount = isLevel1 && Array.isArray(account.subordinates) ? account.subordinates.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        
        <div className="flex items-center gap-3 text-destructive">
          <div className="p-2.5 bg-destructive/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Xóa tài khoản Cấp 1?</h3>
            <p className="text-xs text-muted-foreground">Hành động này không thể hoàn tác</p>
          </div>
        </div>

        <div className="bg-muted/50 p-3.5 rounded-xl border border-border text-sm space-y-1">
          <div className="font-semibold text-foreground">{account.full_name || account.email}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Email: {account.email}</span>
            <span>•</span>
            <span className="capitalize">{isLevel1 ? 'Tài khoản Cấp 1' : 'Tài khoản Cấp 2'}</span>
          </div>
        </div>

        {isLevel1 && subCount > 0 ? (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1">
              ⚠️ Cảnh báo tự động xóa phân cấp:
            </div>
            <div>
              Tài khoản này hiện có <strong>{subCount}</strong> tài khoản Cấp 2 trực thuộc.
            </div>
            <div>
              Nếu tiếp tục, toàn bộ <strong>{subCount}</strong> tài khoản Cấp 2 thuộc tài khoản này cũng sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isLevel1 
              ? 'Tài khoản này không có tài khoản Cấp 2. Bạn có chắc chắn muốn xóa tài khoản?' 
              : 'Bạn có chắc chắn muốn xóa tài khoản Cấp 2 này?'}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition disabled:opacity-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang xóa tài khoản...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Xóa tài khoản
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// ========== MAIN ADMIN DASHBOARD ==========
export default function AdminDashboard({ userSession }) {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Drawer state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerStatusFilter, setDrawerStatusFilter] = useState('all');

  // Modal states
  const [editAccount, setEditAccount] = useState(null);
  const [quotaAccount, setQuotaAccount] = useState(null);
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleOpenDeleteConfirm = (account) => {
    if (!account || account.id === userSession?.user?.id) {
      alert('Không thể xóa tài khoản của chính bạn!');
      return;
    }
    setDeleteConfirmAccount(account);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmAccount || isDeletingAccount) return;
    setIsDeletingAccount(true);

    const isL1 = deleteConfirmAccount.role === 'level_1' || deleteConfirmAccount.role === 'admin';
    const subCount = isL1 && Array.isArray(deleteConfirmAccount.subordinates) ? deleteConfirmAccount.subordinates.length : 0;

    const result = await safeDeleteAccount(deleteConfirmAccount.id);

    setIsDeletingAccount(false);

    if (result && result.success) {
      setDeleteConfirmAccount(null);
      await refreshAndUpdateDrawer();

      const successMsg = isL1 && subCount > 0 
        ? `Đã xóa tài khoản Cấp 1 và toàn bộ ${subCount} tài khoản Cấp 2 thuộc tài khoản này.` 
        : 'Đã xóa tài khoản thành công.';
      alert(successMsg);
    } else {
      const errorMsg = result?.message || result?.error || 'Không thể xóa tài khoản Cấp 1. Một hoặc nhiều tài khoản Cấp 2 chưa thể xóa. Vui lòng thử lại.';
      alert(errorMsg);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedAccount]);

  const openDrawer = (account) => {
    setSelectedAccount(account);
    setDrawerSearch('');
    setDrawerStatusFilter('all');
  };

  const closeDrawer = () => {
    setSelectedAccount(null);
    setDrawerSearch('');
    setDrawerStatusFilter('all');
  };

  const loadProfiles = async () => {
    setIsLoading(true);
    const data = await fetchAllProfiles();
    setProfiles(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const refreshAndUpdateDrawer = async () => {
    const data = await fetchAllProfiles();
    setProfiles(data);
    if (selectedAccount) {
      const l1 = data.find(p => p.id === selectedAccount.id);
      const l2 = data.filter(p => p.role === 'level_2' && p.parent_id === selectedAccount.id && p.status !== 'archived');
      if (l1) {
        setSelectedAccount({ ...l1, subordinates: l2 });
      } else {
        closeDrawer();
      }
    }
  };

  const handleStatusChange = async (targetUserId, newStatus) => {
    if (targetUserId === userSession?.user?.id) return;
    
    if (newStatus === 'archived') {
      const confirm = window.confirm('Bạn có chắc chắn muốn xóa (lưu trữ) tài khoản này?');
      if (!confirm) return;
    }
    if (newStatus === 'blocked') {
      const confirm = window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?');
      if (!confirm) return;
    }

    const result = await updateProfileStatus(targetUserId, newStatus);
    if (result.success) {
      await refreshAndUpdateDrawer();
    } else {
      alert(result.error || 'Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  // Process hierarchy
  const { hierarchy, kpi } = useMemo(() => {
    const level1 = profiles.filter(p => p.role === 'level_1' || p.role === 'admin');
    const level2 = profiles.filter(p => p.role === 'level_2');

    let totalL1 = 0;
    let activeL1 = 0;
    let pendingL1 = 0;
    let lockedL1 = 0;

    const builtHierarchy = level1.map(l1 => {
      totalL1++;
      if (l1.status === 'active') activeL1++;
      if (l1.status === 'pending') pendingL1++;
      if (l1.status === 'blocked' || l1.status === 'archived') lockedL1++;

      return {
        ...l1,
        subordinates: level2.filter(l2 => l2.parent_id === l1.id && l2.status !== 'archived')
      };
    });

    return { 
      hierarchy: builtHierarchy,
      kpi: { totalL1, activeL1, pendingL1, lockedL1, totalL2: level2.filter(l2 => l2.status !== 'archived').length }
    };
  }, [profiles]);

  // Apply Filters
  const filteredHierarchy = useMemo(() => {
    return hierarchy.filter(l1 => {
      if (statusFilter !== 'all' && l1.status !== statusFilter) return false;

      const searchLower = searchTerm.toLowerCase();
      let matchesSearch = false;
      if (!searchTerm) {
        matchesSearch = true;
      } else {
        const l1Matches = (l1.full_name || '').toLowerCase().includes(searchLower) ||
                          (l1.email || '').toLowerCase().includes(searchLower) ||
                          (l1.phone || '').toLowerCase().includes(searchLower);
        
        const subMatches = l1.subordinates.some(sub => 
          (sub.full_name || '').toLowerCase().includes(searchLower) ||
          (sub.email || '').toLowerCase().includes(searchLower)
        );

        matchesSearch = l1Matches || subMatches;
      }

      if (roleFilter === 'level_2' && l1.subordinates.length === 0) return false;

      return matchesSearch;
    });
  }, [hierarchy, searchTerm, statusFilter, roleFilter]);

  // Drawer filtering
  const filteredSubordinates = useMemo(() => {
    if (!selectedAccount) return [];
    return selectedAccount.subordinates.filter(sub => {
      const matchSearch = (sub.full_name || '').toLowerCase().includes(drawerSearch.toLowerCase()) || 
                          (sub.email || '').toLowerCase().includes(drawerSearch.toLowerCase());
      const matchStatus = drawerStatusFilter === 'all' || sub.status === drawerStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [selectedAccount, drawerSearch, drawerStatusFilter]);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('vi-VN');
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 60) return `${diffInMins} phút trước`;
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    if (diffInDays === 1) return `Hôm qua`;
    if (diffInDays <= 7) return `${diffInDays} ngày trước`;
    return formatDate(isoString);
  };

  const StatusBadge = ({ status }) => {
    if (status === 'active') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">Hoạt động</span>;
    if (status === 'pending') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20 whitespace-nowrap">Chờ duyệt</span>;
    if (status === 'archived') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">Đã xóa</span>;
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap">Đã khóa</span>;
  };

  // ========== CONTEXT-SENSITIVE ACTION BUTTONS ==========
  const ActionMenu = ({ account, isInDrawer = false }) => {
    const subCount = account.subordinates?.length || 0;
    const status = account.status;
    const btnClass = isInDrawer 
      ? "px-3 py-1.5 hover:bg-muted text-foreground rounded-md transition text-left w-full flex items-center gap-2 text-[11px]"
      : "px-3 py-1.5 hover:bg-muted rounded-md transition text-left w-full flex items-center gap-2 text-[11px]";

    return (
      <div className="p-1 flex flex-col text-[11px] font-medium text-left min-w-[160px]">
        {/* Xem chi tiết — luôn có */}
        {!isInDrawer && (
          <button onClick={(e) => { e.stopPropagation(); openDrawer(account); }} className={btnClass}>
            <Eye className="w-3.5 h-3.5 text-blue-500" /> Xem chi tiết
          </button>
        )}

        {/* Pending: Duyệt, Từ chối */}
        {status === 'pending' && (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(account.id, 'active'); }} className={`${btnClass} text-success`}>
              <UserCheck className="w-3.5 h-3.5" /> Duyệt tài khoản
            </button>
          </>
        )}

        {/* Active: Sửa, Chỉnh quota, Khóa */}
        {status === 'active' && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setEditAccount(account); }} className={btnClass}>
              <Edit className="w-3.5 h-3.5 text-blue-500" /> Sửa thông tin
            </button>
            <button onClick={(e) => { e.stopPropagation(); setQuotaAccount(account); }} className={btnClass}>
              <Settings className="w-3.5 h-3.5 text-indigo-500" /> Chỉnh hạn mức
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(account.id, 'blocked'); }} className={`${btnClass} text-destructive`}>
              <Lock className="w-3.5 h-3.5" /> Khóa tài khoản
            </button>
          </>
        )}

        {/* Blocked: Sửa, Chỉnh quota, Mở khóa */}
        {status === 'blocked' && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setEditAccount(account); }} className={btnClass}>
              <Edit className="w-3.5 h-3.5 text-blue-500" /> Sửa thông tin
            </button>
            <button onClick={(e) => { e.stopPropagation(); setQuotaAccount(account); }} className={btnClass}>
              <Settings className="w-3.5 h-3.5 text-indigo-500" /> Chỉnh hạn mức
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(account.id, 'active'); }} className={`${btnClass} text-emerald-600`}>
              <Unlock className="w-3.5 h-3.5" /> Mở khóa
            </button>
          </>
        )}

        {/* Archived: chỉ Xem */}
        {/* Xóa — tất cả status trừ archived */}
        {status !== 'archived' && (
          <button onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(account); }} className={`${btnClass} text-destructive mt-0.5 border-t border-border pt-1.5`}>
            <Trash2 className="w-3.5 h-3.5" /> Xóa tài khoản
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">
        Đang tải dữ liệu quản trị tài khoản...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[500px] animate-fade-in gap-4">
      {/* HEADER & COMPACT KPI */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">Quản trị Hệ thống</h1>
          <p className="text-xs text-muted-foreground">Quản lý tài khoản và thành viên</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-muted-foreground">Cấp 1:</span>
            <span className="text-sm font-bold">{kpi.totalL1}</span>
          </div>
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Hoạt động:</span>
            <span className="text-sm font-bold text-emerald-600">{kpi.activeL1}</span>
          </div>
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span className="text-[11px] text-muted-foreground">Chờ duyệt:</span>
            <span className="text-sm font-bold text-warning">{kpi.pendingL1}</span>
          </div>
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Đã khóa:</span>
            <span className="text-sm font-bold text-destructive">{kpi.lockedL1}</span>
          </div>
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] text-muted-foreground">Cấp 2:</span>
            <span className="text-sm font-bold">{kpi.totalL2}</span>
          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-border bg-muted/10 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm tài khoản..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="active">Hoạt động</option>
            <option value="blocked">Đã khóa</option>
            <option value="archived">Đã xóa</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm text-muted-foreground text-[10px] uppercase tracking-wider font-semibold shadow-sm after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:border-b after:border-border">
              <tr>
                <th className="px-3 py-2.5">Tài khoản Cấp 1</th>
                <th className="px-3 py-2.5 w-16">SĐT</th>
                <th className="px-3 py-2.5 w-24">Trạng thái</th>
                <th className="px-3 py-2.5 w-32 text-center">Thành viên / Quota</th>
                <th className="px-3 py-2.5 w-28 text-center">Đăng ký</th>
                <th className="px-3 py-2.5 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredHierarchy.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-16 text-center text-muted-foreground">
                    <p className="text-xs">Không tìm thấy tài khoản nào phù hợp.</p>
                  </td>
                </tr>
              ) : (
                filteredHierarchy.map(l1 => {
                  const subCount = l1.subordinates.length;
                  const maxQ = l1.max_quota || 0;
                  const remaining = maxQ - subCount;
                  const quotaStr = maxQ > 0 ? `${subCount} / ${maxQ}` : `${subCount}`;
                  const isOverQuota = maxQ > 0 && remaining < 0;

                  return (
                    <tr key={l1.id} className="hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => openDrawer(l1)}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                            {l1.full_name ? l1.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground leading-tight text-[13px]">{l1.full_name || 'Khách hàng'}</span>
                            <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[200px]">{l1.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{l1.phone || '—'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={l1.status} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[12px] font-medium ${isOverQuota ? 'text-destructive' : 'text-foreground'}`}>{quotaStr}</span>
                        {maxQ > 0 && (
                          <span className={`text-[10px] ml-1 ${remaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            (còn {remaining >= 0 ? remaining : 0})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                        {formatDate(l1.created_at)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="relative group/menu inline-block">
                          <button 
                            onClick={(e) => e.stopPropagation()} 
                            className="p-1 hover:bg-muted text-muted-foreground rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                            <ActionMenu account={l1} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCOUNT DETAIL MODAL */}
      {selectedAccount && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={closeDrawer}></div>
          
          <div 
            className="bg-card w-full max-w-[750px] max-h-[100dvh] sm:max-h-[calc(100vh-48px)] rounded-xl shadow-2xl border border-border flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  {selectedAccount.full_name ? selectedAccount.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground leading-tight">{selectedAccount.full_name || 'Khách hàng'}</h2>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20">Cấp 1</span>
                    <StatusBadge status={selectedAccount.status} />
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{selectedAccount.email}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {/* Dropdown for actions in drawer */}
                <div className="relative group/drawermenu">
                  <button className="px-3 py-1.5 bg-muted/80 text-foreground font-semibold text-[11px] rounded-md hover:bg-muted transition border border-border hidden sm:flex items-center gap-1">
                    <MoreVertical className="w-3.5 h-3.5" /> Hành động
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/drawermenu:opacity-100 group-hover/drawermenu:visible transition-all z-20">
                    <ActionMenu account={selectedAccount} isInDrawer={true} />
                  </div>
                </div>
                <button onClick={closeDrawer} className="p-1.5 hover:bg-background rounded-md text-muted-foreground transition border border-transparent hover:border-border flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden">
              
              {/* Account Info Summary */}
              <div className="p-4 sm:p-5 flex flex-col gap-4 shrink-0 border-b border-border bg-muted/5 overflow-y-auto max-h-[40vh] sm:max-h-none sm:overflow-visible custom-scrollbar">
                
                {/* COMPACT KPI ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-background border border-border rounded-lg px-3 py-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Hạn mức</span>
                    <span className="text-lg font-bold text-foreground leading-none">{selectedAccount.subordinates?.length || 0} <span className="text-sm font-medium text-muted-foreground">/ {selectedAccount.max_quota || '∞'}</span></span>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase mb-0.5">Hoạt động</span>
                    <span className="text-lg font-bold text-emerald-600 leading-none">{selectedAccount.subordinates?.filter(s => s.status === 'active').length || 0}</span>
                  </div>
                  <div className="bg-warning/5 border border-warning/10 rounded-lg px-3 py-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-warning uppercase mb-0.5">Chờ duyệt</span>
                    <span className="text-lg font-bold text-warning leading-none">{selectedAccount.subordinates?.filter(s => s.status === 'pending').length || 0}</span>
                  </div>
                  <div className="bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-destructive uppercase mb-0.5">Đã khóa</span>
                    <span className="text-lg font-bold text-destructive leading-none">{selectedAccount.subordinates?.filter(s => s.status === 'blocked').length || 0}</span>
                  </div>
                </div>

                {/* INFO GRID */}
                <div className="bg-background border border-border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
                    <div className="text-xs font-medium truncate" title={selectedAccount.email}>{selectedAccount.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Số điện thoại</div>
                    <div className="text-xs font-medium">{selectedAccount.phone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Ngày đăng ký</div>
                    <div className="text-xs font-medium">{formatDate(selectedAccount.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Hoạt động gần nhất</div>
                    <div className="text-xs font-medium">{formatRelativeTime(selectedAccount.updated_at || selectedAccount.created_at)}</div>
                  </div>
                </div>
              </div>

              {/* MEMBERS TABLE */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-4 sm:px-5 py-2.5 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">
                    Danh sách thành viên Cấp 2
                  </h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Tìm thành viên..." 
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        className="pl-6 pr-2 py-1 w-full sm:w-48 bg-background border border-border rounded text-[11px] focus:ring-1 focus:ring-primary transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-background">
                  <table className="w-full text-left text-[12px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm text-muted-foreground text-[10px] uppercase font-semibold after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:border-b after:border-border shadow-sm">
                      <tr>
                        <th className="px-4 py-2">Thành viên</th>
                        <th className="px-4 py-2 w-24">Trạng thái</th>
                        <th className="px-4 py-2 w-24 text-center hidden sm:table-cell">Đăng ký</th>
                        <th className="px-4 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSubordinates.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                            <span className="text-[11px]">Không có thành viên nào.</span>
                          </td>
                        </tr>
                      ) : (
                        filteredSubordinates.map(sub => (
                          <tr key={sub.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {sub.full_name ? sub.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[12px] font-medium text-foreground leading-tight">{sub.full_name || 'Thành viên'}</span>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{sub.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <StatusBadge status={sub.status} />
                            </td>
                            <td className="px-4 py-2 text-center text-[11px] text-muted-foreground hidden sm:table-cell">
                              {formatDate(sub.created_at)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="relative group/menu inline-block">
                                <button className="p-0.5 hover:bg-muted text-muted-foreground rounded transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-28 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                                  <div className="p-1 flex flex-col text-[10px] font-medium text-left">
                                    {sub.status === 'active' && (
                                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'blocked'); }} className="px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded transition text-left">
                                        Khóa
                                      </button>
                                    )}
                                    {(sub.status === 'blocked' || sub.status === 'pending') && (
                                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'active'); }} className="px-2 py-1.5 hover:bg-muted text-foreground rounded transition text-left">
                                        Mở khóa
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(sub); }} className="px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded transition text-left mt-0.5 border-t border-border">
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/10 shrink-0 flex sm:hidden gap-2">
              {selectedAccount.status === 'pending' && (
                <button onClick={() => handleStatusChange(selectedAccount.id, 'active')} className="flex-1 py-2 bg-success text-success-foreground font-semibold text-[11px] rounded-lg shadow-sm">
                  Duyệt
                </button>
              )}
              {selectedAccount.status === 'active' && (
                <button onClick={() => handleStatusChange(selectedAccount.id, 'blocked')} className="flex-1 py-2 bg-destructive/10 text-destructive font-semibold text-[11px] rounded-lg">
                  Khóa
                </button>
              )}
              {selectedAccount.status === 'blocked' && (
                <button onClick={() => handleStatusChange(selectedAccount.id, 'active')} className="flex-1 py-2 bg-muted text-foreground font-semibold text-[11px] rounded-lg border border-border">
                  Mở Khóa
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <EditAccountModal
        account={editAccount}
        isOpen={!!editAccount}
        onClose={() => setEditAccount(null)}
        onSuccess={refreshAndUpdateDrawer}
      />

      {/* QUOTA MODAL */}
      <QuotaModal
        account={quotaAccount}
        currentCount={quotaAccount ? (hierarchy.find(h => h.id === quotaAccount.id)?.subordinates?.length || 0) : 0}
        isOpen={!!quotaAccount}
        onClose={() => setQuotaAccount(null)}
        onSuccess={refreshAndUpdateDrawer}
      />

      {/* DELETE CONFIRM MODAL */}
      <DeleteConfirmModal
        account={deleteConfirmAccount}
        isOpen={!!deleteConfirmAccount}
        onClose={() => setDeleteConfirmAccount(null)}
        onConfirm={handleExecuteDelete}
        isDeleting={isDeletingAccount}
      />
    </div>
  );
}
