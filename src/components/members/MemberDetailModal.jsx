import React, { useState } from 'react';
import { X, Mail, Calendar, Briefcase, FileText, CheckCircle, CreditCard } from 'lucide-react';

export default function MemberDetailModal({ member, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  const formatVND = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Chưa cập nhật';
    return new Date(isoString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-lg border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            {member.full_name || 'Thành viên'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Quick Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-foreground">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-foreground">Tham gia: {formatDate(member.created_at)}</span>
              </div>
            </div>
            <div className="flex sm:justify-end items-start">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                member.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                member.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'
              }`}>
                {member.status === 'active' ? 'Đang hoạt động' : 
                 member.status === 'pending' ? 'Chờ phê duyệt' : 'Đã khóa'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Dự án</p>
              <p className="text-lg font-bold text-foreground">{member.project_count || 0}</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Hợp đồng</p>
              <p className="text-lg font-bold text-foreground">{member.contract_count || 0}</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Hoàn thành</p>
              <p className="text-lg font-bold text-emerald-600">{member.settled_count || 0}</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Đang làm</p>
              <p className="text-lg font-bold text-blue-600">{member.in_progress_count || 0}</p>
            </div>
            <div className="col-span-2 sm:col-span-4 bg-muted/50 p-3 rounded-xl border border-border/50 flex justify-between items-center">
              <p className="text-xs font-medium text-muted-foreground">Tổng giá trị Hợp đồng phụ trách:</p>
              <p className="text-lg font-bold text-primary font-mono">{formatVND(member.total_value)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Tổng quan
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[150px]">
            {activeTab === 'overview' && (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">
                  (Phiên bản hiện tại chưa hỗ trợ hiển thị chi tiết danh sách Hợp đồng/Dự án bên trong modal. 
                  Vui lòng sử dụng bộ lọc "Thành viên phụ trách" ở màn hình Dự án/Hợp đồng chính để xem chi tiết.)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
