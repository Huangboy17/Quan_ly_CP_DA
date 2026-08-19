import React, { useState } from 'react';
import { X, Mail, Calendar, Briefcase, FileText, CheckCircle, Clock, Shield, AlertCircle } from 'lucide-react';

export default function MemberDetailModal({ member, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  const formatVND = (val) => {
    if (val >= 1e9) {
      return (val / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
    } else if (val >= 1e6) {
      return (val / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu';
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const totalTasks = (member.in_progress_count || 0) + (member.settled_count || 0);
  const progressPercent = totalTasks > 0 ? Math.round(((member.settled_count || 0) / totalTasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-3xl rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Section (Banner + Avatar) */}
        <div className="relative pt-12 pb-6 px-6 sm:px-8 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-background/50 hover:bg-background rounded-full text-muted-foreground transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-3xl shadow-md shrink-0">
              {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground leading-none">
                  {member.full_name || 'Thành viên chưa có tên'}
                </h2>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  member.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 
                  member.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  {member.status === 'active' ? 'Đang hoạt động' : 
                   member.status === 'pending' ? 'Chờ kích hoạt' : 'Đã khóa'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{member.email}</span>
                </div>
                {member.title && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    <span>{member.title}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Quyền: Thành viên (Cấp 2)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-8 bg-muted/10">
          
          {/* Workload Stats Grid */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Thống kê công việc</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-semibold">Dự án</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{member.project_count || 0}</p>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold">Hợp đồng</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{member.contract_count || 0}</p>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold">Đang làm</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{member.in_progress_count || 0}</p>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">Hoàn thành</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{member.settled_count || 0}</p>
              </div>
            </div>
          </section>

          {/* Allocation & Values */}
          <div className="grid sm:grid-cols-2 gap-6">
            <section className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Phân bổ hợp đồng</h3>
              {totalTasks > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-foreground">{totalTasks} Hợp đồng tổng cộng</span>
                    <span className="text-emerald-600">{progressPercent}% Hoàn thành</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${100 - progressPercent}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">{member.settled_count || 0} Hoàn thành</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">{member.in_progress_count || 0} Đang làm</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Chưa được phân công hợp đồng nào
                </div>
              )}
            </section>
            
            <section className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tổng giá trị hợp đồng phụ trách</h3>
              <div className="mt-2">
                <p className="text-3xl font-bold font-mono text-primary">
                  {member.total_value > 0 ? formatVND(member.total_value) : '0 VNĐ'}
                </p>
                {member.total_value > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Tổng cộng {member.contract_count} hợp đồng được giao.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Account Details */}
          <section className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Thông tin tài khoản</h3>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Ngày tạo tài khoản</p>
                <p className="text-sm font-medium">{formatDateTime(member.created_at)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">ID Hệ thống</p>
                <p className="text-xs font-mono text-muted-foreground truncate" title={member.id}>{member.id}</p>
              </div>
              {/* Additional fields could go here if database has them like last_login */}
            </div>
          </section>

          {/* Notice for lack of detailed array data */}
          {member.project_count > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Mẹo quản lý</p>
                <p>Để xem chi tiết từng dự án hoặc hợp đồng của <b>{member.full_name}</b>, hãy đóng cửa sổ này và sử dụng <b>Bộ lọc Thành viên</b> ở màn hình Dự án hoặc Hợp đồng chính.</p>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
