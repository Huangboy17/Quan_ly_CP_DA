import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllProfiles, updateProfileStatus } from '../../services/storage';
import { Users, CheckCircle, XCircle, ShieldAlert, Clock, Search, ShieldCheck, Archive, ChevronDown, ChevronRight, Mail, Calendar, Shield, Activity, MoreVertical } from 'lucide-react';

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
        // Just reload profiles and let the useMemo rebuild hierarchy, but we need to update selectedAccount reference
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

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
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
      kpi: { totalL1, activeL1, pendingL1, lockedL1 }
    };
  }, [profiles]);

  // Apply Filters
  const filteredHierarchy = useMemo(() => {
    return hierarchy.filter(l1 => {
      // 1. Status Filter
      if (statusFilter !== 'all' && l1.status !== statusFilter) return false;

      // 2. Search Filter
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

        // Auto-expand if a subordinate matched the search
        if (!l1Matches && subMatches && !expandedRows.has(l1.id)) {
          setExpandedRows(prev => new Set(prev).add(l1.id));
        }
      }

      // 3. Role Filter
      if (roleFilter === 'level_2' && l1.subordinates.length === 0) return false;

      return matchesSearch;
    });
  }, [hierarchy, searchTerm, statusFilter, roleFilter, expandedRows]);

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

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">
        Đang tải dữ liệu quản trị tài khoản...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Quản trị Tài khoản</h1>
        <p className="text-sm text-muted-foreground">Theo dõi và quản lý toàn bộ tài khoản Cấp 1 trên hệ thống.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tổng tài khoản</p>
          </div>
          <p className="text-2xl font-bold">{kpi.totalL1}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Đang hoạt động</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{kpi.activeL1}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning/10 text-warning rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Chờ duyệt</p>
          </div>
          <p className="text-2xl font-bold text-warning">{kpi.pendingL1}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Đã khóa</p>
          </div>
          <p className="text-2xl font-bold text-destructive">{kpi.lockedL1}</p>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-muted/10">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm tài khoản, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-background border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="active">Hoạt động</option>
              <option value="blocked">Đã khóa</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              <option value="all">Tất cả tài khoản</option>
              <option value="level_1">Tài khoản Cấp 1</option>
              <option value="level_2">Có thành viên Cấp 2</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Tài khoản Cấp 1</th>
                <th className="px-4 py-4 text-center">Trạng thái</th>
                <th className="px-4 py-4 text-center">Thành viên Cấp 2</th>
                <th className="px-4 py-4 text-center">Ngày đăng ký</th>
                <th className="px-4 py-4 text-center">Hoạt động gần nhất</th>
                <th className="px-4 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredHierarchy.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-8 h-8 opacity-20" />
                      <p className="text-sm">Không tìm thấy tài khoản nào phù hợp.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHierarchy.map(l1 => {
                  const isExpanded = expandedRows.has(l1.id);
                  const subCount = l1.subordinates.length;
                  const quotaStr = l1.max_members ? `${subCount} / ${l1.max_members}` : `${subCount}`;

                  return (
                    <React.Fragment key={l1.id}>
                      {/* LEVEL 1 ROW */}
                      <tr className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => openDrawer(l1)}>
                        <td className="px-4 py-3 text-center">
                          {subCount > 0 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleRow(l1.id); }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground transition"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {l1.full_name ? l1.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-[13px]">{l1.full_name || 'Khách hàng'}</span>
                              <span className="text-[11px] text-muted-foreground">{l1.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            l1.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                            l1.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {l1.status === 'active' ? 'Hoạt động' : 
                             l1.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {subCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs border border-blue-500/20">
                              <Users className="w-3 h-3" /> {quotaStr}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {formatDate(l1.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {formatDateTime(l1.updated_at || l1.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {l1.status === 'pending' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'active'); }}
                                className="px-3 py-1.5 bg-success hover:bg-success/90 text-success-foreground rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-sm"
                              >
                                Duyệt
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); openDrawer(l1); }}
                              className="px-3 py-1.5 hover:bg-muted text-muted-foreground rounded-lg text-[11px] font-semibold transition cursor-pointer border border-border bg-card"
                            >
                              Xem
                            </button>
                            
                            <div className="relative group/menu">
                              <button 
                                onClick={(e) => e.stopPropagation()} 
                                className="p-1.5 hover:bg-muted text-muted-foreground rounded-lg transition"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                                <div className="p-1 flex flex-col text-[11px] font-medium">
                                  {l1.status === 'active' && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'blocked'); }}
                                      className="text-left px-3 py-2 hover:bg-destructive/10 text-destructive rounded-lg transition"
                                    >
                                      Khóa tài khoản
                                    </button>
                                  )}
                                  {(l1.status === 'blocked' || l1.status === 'archived') && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'active'); }}
                                      className="text-left px-3 py-2 hover:bg-muted text-foreground rounded-lg transition"
                                    >
                                      Mở khóa
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(l1.id, 'archived'); }}
                                    className="text-left px-3 py-2 hover:bg-destructive/10 text-destructive rounded-lg transition mt-1 border-t border-border"
                                  >
                                    Xóa tài khoản
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* LEVEL 2 SUB-ROWS */}
                      {isExpanded && l1.subordinates.map((l2, idx) => (
                        <tr key={l2.id} className="bg-muted/5 border-l-2 border-l-blue-500 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 flex items-center gap-3">
                            <div className="w-4 h-4 border-l-2 border-b-2 border-border rounded-bl-lg ml-3 -mt-4 opacity-50"></div>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground text-[11px]">{l2.full_name || 'Thành viên Cấp 2'}</span>
                              <span className="text-[10px] text-muted-foreground">{l2.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              l2.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                              l2.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {l2.status === 'active' ? 'Hoạt động' : 
                               l2.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-[10px] text-muted-foreground font-mono">
                            ID: {l2.id.split('-')[0]}...
                          </td>
                          <td className="px-4 py-2 text-center text-[11px] text-muted-foreground">
                            {formatDate(l2.created_at)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCOUNT DETAIL DRAWER */}
      {selectedAccount && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-6 sm:pt-8 px-4 pb-6 bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={closeDrawer}></div>
          <div 
            className="bg-card w-full max-w-[550px] max-h-full rounded-2xl shadow-2xl border border-border flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-border flex items-start justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-3xl shadow-sm shrink-0">
                  {selectedAccount.full_name ? selectedAccount.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-tight mb-1">{selectedAccount.full_name || 'Khách hàng'}</h2>
                  <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{selectedAccount.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      Cấp 1
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      selectedAccount.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                      selectedAccount.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {selectedAccount.status === 'active' ? 'Hoạt động' : 
                       selectedAccount.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={closeDrawer}
                className="p-2 hover:bg-background rounded-full text-muted-foreground transition shadow-sm bg-background/50"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-muted/5">
              
              {/* SECTION: THÔNG TIN TÀI KHOẢN */}
              <section>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Thông tin tài khoản
                </h3>
                <div className="bg-card rounded-xl border border-border divide-y divide-border shadow-sm">
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-sm text-muted-foreground">Tên tài khoản</span>
                    <span className="text-sm font-semibold text-foreground">{selectedAccount.full_name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-semibold text-foreground">{selectedAccount.email}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-sm text-muted-foreground">Loại tài khoản</span>
                    <span className="text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded border border-border">Cấp 1</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-sm text-muted-foreground">Trạng thái</span>
                    <span className="text-sm font-semibold text-foreground">
                      {selectedAccount.status === 'active' ? 'Hoạt động' : 
                       selectedAccount.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-sm text-muted-foreground">Ngày đăng ký</span>
                    <span className="text-sm font-medium text-foreground">{formatDate(selectedAccount.created_at)}</span>
                  </div>
                </div>
              </section>

              {/* SECTION: THỐNG KÊ THÀNH VIÊN */}
              <section>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Thống kê thành viên
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-primary uppercase mb-1">Đã sử dụng / Hạn mức</span>
                    <p className="text-xl font-bold text-primary">
                      {selectedAccount.subordinates?.length || 0} <span className="text-primary/60 text-sm">/ {selectedAccount.max_members || '∞'}</span>
                    </p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Đang hoạt động</span>
                    <p className="text-xl font-bold text-emerald-600">
                      {selectedAccount.subordinates?.filter(s => s.status === 'active').length || 0}
                    </p>
                  </div>
                  <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-warning uppercase mb-1">Chờ kích hoạt</span>
                    <p className="text-xl font-bold text-warning">
                      {selectedAccount.subordinates?.filter(s => s.status === 'pending').length || 0}
                    </p>
                  </div>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-destructive uppercase mb-1">Đã khóa</span>
                    <p className="text-xl font-bold text-destructive">
                      {selectedAccount.subordinates?.filter(s => s.status === 'blocked' || s.status === 'archived').length || 0}
                    </p>
                  </div>
                </div>
              </section>

              {/* SECTION: DANH SÁCH THÀNH VIÊN */}
              <section className="flex flex-col h-[400px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Danh sách thành viên
                  </h3>
                </div>

                <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
                  <div className="p-3 border-b border-border bg-muted/10 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Tìm tên, email..." 
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 w-full bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary transition"
                      />
                    </div>
                    <select
                      value={drawerStatusFilter}
                      onChange={(e) => setDrawerStatusFilter(e.target.value)}
                      className="px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">Tất cả</option>
                      <option value="active">Hoạt động</option>
                      <option value="pending">Chờ</option>
                      <option value="blocked">Đã khóa</option>
                    </select>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
                    {filteredSubordinates.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                        <Users className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">Không có thành viên nào phù hợp</span>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {filteredSubordinates.map(sub => (
                          <li key={sub.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition group">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {sub.full_name ? sub.full_name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground leading-tight">{sub.full_name || 'Thành viên Cấp 2'}</span>
                                <span className="text-[11px] text-muted-foreground">{sub.email}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 
                                sub.status === 'pending' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
                              }`}>
                                {sub.status === 'active' ? 'Hoạt động' : 
                                 sub.status === 'pending' ? 'Chờ' : 'Khóa'}
                              </span>
                              
                              <div className="relative group/menu">
                                <button className="p-1 hover:bg-muted text-muted-foreground rounded transition">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-28 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                                  <div className="p-1 flex flex-col text-[11px] font-medium">
                                    {sub.status === 'active' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'blocked'); }}
                                        className="text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition"
                                      >
                                        Khóa
                                      </button>
                                    )}
                                    {(sub.status === 'blocked' || sub.status === 'pending' || sub.status === 'archived') && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'active'); }}
                                        className="text-left px-3 py-1.5 hover:bg-muted text-foreground rounded-lg transition"
                                      >
                                        Mở khóa
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(sub.id, 'archived'); }}
                                      className="text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition mt-0.5 border-t border-border"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

            </div>
            
            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-border bg-card flex gap-3 rounded-b-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              {selectedAccount.status === 'pending' && (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedAccount.id, 'active');
                  }}
                  className="flex-1 px-4 py-2.5 bg-success text-success-foreground font-semibold text-sm rounded-xl hover:bg-success/90 transition shadow-sm"
                >
                  Duyệt Tài Khoản Cấp 1
                </button>
              )}
              {selectedAccount.status === 'active' && (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedAccount.id, 'blocked');
                  }}
                  className="flex-1 px-4 py-2.5 bg-destructive/10 text-destructive font-semibold text-sm rounded-xl hover:bg-destructive hover:text-destructive-foreground transition"
                >
                  Khóa Tài Khoản Cấp 1
                </button>
              )}
              {(selectedAccount.status === 'blocked' || selectedAccount.status === 'archived') && (
                <button 
                  onClick={() => {
                    handleStatusChange(selectedAccount.id, 'active');
                  }}
                  className="flex-1 px-4 py-2.5 bg-muted text-foreground font-semibold text-sm rounded-xl hover:bg-muted/80 transition border border-border"
                >
                  Mở Khóa Tài Khoản
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
