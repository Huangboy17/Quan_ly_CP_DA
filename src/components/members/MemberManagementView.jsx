import React, { useState, useEffect } from 'react';
import { Users, Briefcase, FileText, CheckCircle, Search, Mail, AlertCircle, MoreVertical, Shield, Plus } from 'lucide-react';
import { getMemberStats } from '../../services/storage';
import MemberDetailModal from './MemberDetailModal';
import CreateMemberModal from './CreateMemberModal';

export default function MemberManagementView({ currentUserId, activeTab, userProfile }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'members') {
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setIsLoading(true);
    const data = await getMemberStats();
    setMembers(data);
    setIsLoading(false);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingMembers = members.filter(m => m.status === 'pending').length;
  
  const maxQuota = userProfile?.max_quota || 0;
  const remainingSlots = maxQuota > 0 ? maxQuota - totalMembers : 0;
  const canCreateMember = maxQuota > 0 && totalMembers < maxQuota;
  const isOverQuota = maxQuota > 0 && totalMembers > maxQuota;

  const formatVND = (val) => {
    if (val >= 1e9) {
      return (val / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
    } else if (val >= 1e6) {
      return (val / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu';
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">
        Đang tải dữ liệu thành viên...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header & KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tổng thành viên</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{totalMembers}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Đang hoạt động</p>
          </div>
          <p className="text-2xl font-bold">{activeMembers}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Chờ kích hoạt</p>
          </div>
          <p className="text-2xl font-bold">{pendingMembers}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hạn mức tài khoản</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${isOverQuota ? 'text-destructive' : ''}`}>{totalMembers} <span className="text-muted-foreground text-lg">/ {maxQuota > 0 ? maxQuota : '∞'}</span></p>
          </div>
          {maxQuota > 0 && remainingSlots >= 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">Còn {remainingSlots} tài khoản</p>
          )}
          {isOverQuota && (
            <p className="text-[10px] text-destructive mt-1">⚠️ Đang vượt hạn mức! Không thể tạo thêm.</p>
          )}
        </div>
      </div>

      {/* Create Member Button + Over-quota warning */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!canCreateMember}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            canCreateMember
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          Thêm thành viên cấp 2
        </button>
        {maxQuota > 0 && !canCreateMember && !isOverQuota && totalMembers === maxQuota && (
          <span className="text-xs text-muted-foreground">Đã đạt hạn mức tối đa ({maxQuota}). Liên hệ quản trị viên để nâng cấp.</span>
        )}
        {isOverQuota && (
          <span className="text-xs text-destructive">Tài khoản đang vượt hạn mức. Hiện có {totalMembers} thành viên nhưng quota chỉ còn {maxQuota}.</span>
        )}
        {maxQuota === 0 && (
          <span className="text-xs text-muted-foreground">Chưa được cấp hạn mức. Liên hệ quản trị viên.</span>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-foreground">Danh sách Thành viên</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Chờ kích hoạt</option>
              <option value="locked">Đã khóa</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Tìm kiếm thành viên..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary transition w-full sm:w-64"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-4 sticky left-0 bg-card z-10 shadow-[1px_0_0_0_hsl(var(--border))]">Thành viên</th>
                <th className="px-4 py-4">Chức danh</th>
                <th className="px-4 py-4 text-center">Dự án</th>
                <th className="px-4 py-4 text-center">Hợp đồng</th>
                <th className="px-4 py-4 text-center">Tiến độ công việc</th>
                <th className="px-4 py-4 text-right">Tổng GT Hợp đồng</th>
                <th className="px-4 py-4 text-center">Trạng thái</th>
                <th className="px-4 py-4 text-center sticky right-0 bg-card z-10 shadow-[-1px_0_0_0_hsl(var(--border))]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 opacity-20" />
                      <p className="text-sm">Không tìm thấy thành viên nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-4 py-3 sticky left-0 bg-card group-hover:bg-muted/50 transition-colors z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-[13px]">{member.full_name || 'Chưa cập nhật tên'}</span>
                          <span className="text-[11px] text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {member.title ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                          {member.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.project_count > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          {member.project_count} dự án
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.contract_count > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {member.contract_count} HĐ
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(member.in_progress_count > 0 || member.settled_count > 0) ? (
                        <div className="flex items-center justify-center gap-1.5 text-xs">
                          {member.in_progress_count > 0 && <span className="text-blue-600 font-medium">{member.in_progress_count} Đang làm</span>}
                          {member.in_progress_count > 0 && member.settled_count > 0 && <span className="text-muted-foreground/40">/</span>}
                          {member.settled_count > 0 && <span className="text-emerald-600 font-medium">{member.settled_count} Hoàn thành</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] font-medium text-foreground/90">
                      {member.total_value > 0 ? formatVND(member.total_value) : <span className="text-muted-foreground/40 text-xs font-sans">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        member.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                        member.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {member.status === 'active' ? 'Hoạt động' : 
                         member.status === 'pending' ? 'Chờ kích hoạt' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center sticky right-0 bg-card group-hover:bg-muted/50 transition-colors z-10 shadow-[-1px_0_0_0_hsl(var(--border))]">
                      <button 
                        onClick={() => setSelectedMember(member)}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <MemberDetailModal 
          member={selectedMember} 
          onClose={() => setSelectedMember(null)} 
        />
      )}

      <CreateMemberModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadStats();
        }}
      />
    </div>
  );
}
