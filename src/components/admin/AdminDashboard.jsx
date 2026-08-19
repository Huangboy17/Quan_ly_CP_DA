import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllProfiles, updateProfileStatus } from '../../services/storage';
import { Users, CheckCircle, XCircle, Clock, Search, Shield, MoreVertical, X } from 'lucide-react';

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

  const handleStatusChange = async (targetUserId, newStatus) => {
    if (targetUserId === userSession?.user?.id) return;
    
    if (newStatus === 'archived' || newStatus === 'blocked') {
      const actionName = newStatus === 'archived' ? 'xóa' : 'khóa';
      const confirm = window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này?`);
      if (!confirm) return;
    }

    const success = await updateProfileStatus(targetUserId, newStatus);
    if (success) {
      loadProfiles();
      
      // Update selected account in drawer if it's open
      if (selectedAccount && (selectedAccount.id === targetUserId || selectedAccount.subordinates.some(sub => sub.id === targetUserId))) {
        const data = await fetchAllProfiles();
        setProfiles(data);
        const l1 = data.find(p => p.id === selectedAccount.id);
        const l2 = data.filter(p => p.role === 'level_2' && p.parent_id === selectedAccount.id);
        if (l1) {
          setSelectedAccount({ ...l1, subordinates: l2 });
        } else {
          closeDrawer();
        }
      }
    } else {
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
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
        subordinates: level2.filter(l2 => l2.parent_id === l1.id)
      };
    });

    return { 
      hierarchy: builtHierarchy,
      kpi: { totalL1, activeL1, pendingL1, lockedL1, totalL2: level2.length }
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
                          (l1.email || '').toLowerCase().includes(searchLower);
        
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
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap">Đã khóa</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">
        Đang tải dữ liệu quản trị tài khoản...
      </div>
    );
  }

  return (
    // Sử dụng flex flex-col và h-[calc(100vh-100px)] để Dashboard chiếm trọn màn hình, không bị cao hơn viewport
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[500px] animate-fade-in gap-4">
      {/* HEADER & COMPACT KPI - Không scroll */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">Quản trị Hệ thống</h1>
          <p className="text-xs text-muted-foreground">Quản lý tài khoản và thành viên</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-card border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-muted-foreground">Tài khoản Cấp 1:</span>
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
            <span className="text-[11px] text-muted-foreground">Thành viên Cấp 2:</span>
            <span className="text-sm font-bold">{kpi.totalL2}</span>
          </div>
        </div>
      </div>

      {/* MAIN TABLE WRAPPER - Flex 1 min-h-0 để chứa bảng có thể scroll */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        {/* Compact Toolbar - Không scroll */}
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
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary"
          >
            <option value="all">Tất cả tài khoản</option>
            <option value="level_1">Tài khoản Cấp 1</option>
            <option value="level_2">Có thành viên Cấp 2</option>
          </select>
        </div>

        {/* Table Content - CHỈ KHU VỰC NÀY SCROLL */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[700px]">
            {/* Header Sticky */}
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm text-muted-foreground text-[10px] uppercase tracking-wider font-semibold shadow-sm after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:border-b after:border-border">
              <tr>
                <th className="px-3 py-2.5">Tài khoản Cấp 1</th>
                <th className="px-3 py-2.5 w-24">Trạng thái</th>
                <th className="px-3 py-2.5 w-24 text-center">Thành viên</th>
                <th className="px-3 py-2.5 w-28 text-center">Đăng ký</th>
                <th className="px-3 py-2.5 w-28 text-center">Hoạt động</th>
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
                  const quotaStr = l1.max_members ? `${subCount} / ${l1.max_members}` : `${subCount}`;

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
                      <td className="px-3 py-2">
                        <StatusBadge status={l1.status} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[12px] font-medium text-foreground">{quotaStr}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                        {formatDate(l1.created_at)}
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                        {formatRelativeTime(l1.updated_at || l1.created_at)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="relative group/menu inline-block">
                          <button 
                            onClick={(e) => e.stopPropagation()} 
                            className="p-1 hover:bg-muted text-muted-foreground rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                            <div className="p-1 flex flex-col text-[11px] font-medium text-left">
                              {l1.status === 'pending' && (
                                <button onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'active'); }} className="px-3 py-1.5 hover:bg-success/10 text-success rounded-md transition text-left">
                                  Duyệt tài khoản
                                </button>
                              )}
                              {l1.status === 'active' && (
                                <button onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'blocked'); }} className="px-3 py-1.5 hover:bg-destructive/10 text-destructive rounded-md transition text-left">
                                  Khóa tài khoản
                                </button>
                              )}
                              {(l1.status === 'blocked' || l1.status === 'archived') && (
                                <button onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'active'); }} className="px-3 py-1.5 hover:bg-muted text-foreground rounded-md transition text-left">
                                  Mở khóa
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'archived'); }} className="px-3 py-1.5 hover:bg-destructive/10 text-destructive rounded-md transition text-left mt-0.5 border-t border-border">
                                Xóa
                              </button>
                            </div>
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

      {/* ACCOUNT DETAIL MODAL - Flex column layout with max-height to viewport */}
      {selectedAccount && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={closeDrawer}></div>
          
          <div 
            className="bg-card w-full max-w-[750px] max-h-[100dvh] sm:max-h-[calc(100vh-48px)] rounded-xl shadow-2xl border border-border flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Fixed Height */}
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
                {selectedAccount.status === 'pending' && (
                  <button onClick={() => handleStatusChange(selectedAccount.id, 'active')} className="px-3 py-1.5 bg-success text-success-foreground font-semibold text-[11px] rounded-md hover:bg-success/90 transition shadow-sm hidden sm:block">
                    Duyệt
                  </button>
                )}
                {selectedAccount.status === 'active' && (
                  <button onClick={() => handleStatusChange(selectedAccount.id, 'blocked')} className="px-3 py-1.5 bg-destructive/10 text-destructive font-semibold text-[11px] rounded-md hover:bg-destructive hover:text-destructive-foreground transition hidden sm:block">
                    Khóa
                  </button>
                )}
                {(selectedAccount.status === 'blocked' || selectedAccount.status === 'archived') && (
                  <button onClick={() => handleStatusChange(selectedAccount.id, 'active')} className="px-3 py-1.5 bg-muted text-foreground font-semibold text-[11px] rounded-md hover:bg-muted/80 transition hidden sm:block">
                    Mở Khóa
                  </button>
                )}
                <button onClick={closeDrawer} className="p-1.5 hover:bg-background rounded-md text-muted-foreground transition border border-transparent hover:border-border flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body - Flex 1 to fill space, min-h-0 allows internal scrolling if needed */}
            <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden">
              
              {/* Account Summary & Info - Shrink-0 so it doesn't compress, always visible at top of modal body */}
              <div className="p-4 sm:p-5 flex flex-col gap-4 shrink-0 border-b border-border bg-muted/5 overflow-y-auto max-h-[40vh] sm:max-h-none sm:overflow-visible custom-scrollbar">
                
                {/* COMPACT KPI ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-background border border-border rounded-lg px-3 py-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Hạn mức</span>
                    <span className="text-lg font-bold text-foreground leading-none">{selectedAccount.subordinates?.length || 0} <span className="text-sm font-medium text-muted-foreground">/ {selectedAccount.max_members || '∞'}</span></span>
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
                    <span className="text-lg font-bold text-destructive leading-none">{selectedAccount.subordinates?.filter(s => s.status === 'blocked' || s.status === 'archived').length || 0}</span>
                  </div>
                </div>

                {/* 2-COLUMN INFO GRID */}
                <div className="bg-background border border-border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
                    <div className="text-xs font-medium truncate" title={selectedAccount.email}>{selectedAccount.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Loại tài khoản</div>
                    <div className="text-xs font-medium">Cấp 1</div>
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

              {/* COMPACT MEMBERS TABLE - The Only Area That Scrolls Heavily */}
              <div className="flex flex-col flex-1 min-h-0">
                {/* Search Bar for Member List */}
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

                {/* Scrollable Table Content */}
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
                                <div className="absolute right-0 top-full mt-1 w-24 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                                  <div className="p-1 flex flex-col text-[10px] font-medium text-left">
                                    {sub.status === 'active' && (
                                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'blocked'); }} className="px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded transition text-left">
                                        Khóa
                                      </button>
                                    )}
                                    {(sub.status === 'blocked' || sub.status === 'pending' || sub.status === 'archived') && (
                                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'active'); }} className="px-2 py-1.5 hover:bg-muted text-foreground rounded transition text-left">
                                        Mở khóa
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'archived'); }} className="px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded transition text-left mt-0.5 border-t border-border">
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

            {/* Mobile Actions Footer - Only visible on small screens to replace header buttons */}
            <div className="px-4 py-3 border-t border-border bg-muted/10 shrink-0 flex sm:hidden gap-2">
              {selectedAccount.status === 'pending' && (
                <button onClick={() => handleStatusChange(selectedAccount.id, 'active')} className="flex-1 py-2 bg-success text-success-foreground font-semibold text-[11px] rounded-lg shadow-sm">
                  Duyệt
                </button>
              )}
              {selectedAccount.status === 'active' && (
                <button onClick={() => handleStatusChange(selectedAccount.id, 'blocked')} className="flex-1 py-2 bg-destructive/10 text-destructive font-semibold text-[11px] rounded-lg">
                  Khóa Tài Khoản
                </button>
              )}
              {(selectedAccount.status === 'blocked' || selectedAccount.status === 'archived') && (
                <button onClick={() => handleStatusChange(selectedAccount.id, 'active')} className="flex-1 py-2 bg-muted text-foreground font-semibold text-[11px] rounded-lg border border-border">
                  Mở Khóa
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
