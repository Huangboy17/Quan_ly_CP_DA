import React, { useState, useEffect } from 'react';
import { Users, Briefcase, FileText, CheckCircle, Search, Mail, Calendar, AlertCircle } from 'lucide-react';
import { getMemberStats } from '../../services/storage';
import MemberDetailModal from './MemberDetailModal';

export default function MemberManagementView({ currentUserId, activeTab }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

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

  const filteredMembers = members.filter(m => 
    (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const totalProjects = members.reduce((sum, m) => sum + (m.project_count || 0), 0);
  const totalContracts = members.reduce((sum, m) => sum + (m.contract_count || 0), 0);

  const formatVND = (val) => {
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
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Tổng thành viên</p>
            <p className="text-xl font-bold">{totalMembers}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Đang hoạt động</p>
            <p className="text-xl font-bold">{activeMembers}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Dự án phân công</p>
            <p className="text-xl font-bold">{totalProjects}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Hợp đồng giao phó</p>
            <p className="text-xl font-bold">{totalContracts}</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-foreground">Danh sách Thành viên</h2>
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">Thành viên</th>
                <th className="px-4 py-3 text-center">Dự án</th>
                <th className="px-4 py-3 text-center">Hợp đồng</th>
                <th className="px-4 py-3 text-center">Đang làm</th>
                <th className="px-4 py-3 text-center">Hoàn thành</th>
                <th className="px-4 py-3 text-right">Tổng giá trị HĐ</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    Không tìm thấy thành viên nào
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr 
                    key={member.id} 
                    onClick={() => setSelectedMember(member)}
                    className="hover:bg-muted/30 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-xs">{member.full_name || 'Chưa cập nhật tên'}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {member.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-xs">
                      {member.project_count > 0 ? (
                        <span className="bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full">{member.project_count}</span>
                      ) : (
                        <span className="text-muted-foreground/50">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-xs">
                      {member.contract_count > 0 ? (
                        <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">{member.contract_count}</span>
                      ) : (
                        <span className="text-muted-foreground/50">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-blue-600 font-medium">
                      {member.in_progress_count > 0 ? member.in_progress_count : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-emerald-600 font-medium">
                      {member.settled_count > 0 ? member.settled_count : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-foreground/80">
                      {formatVND(member.total_value)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        member.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                        member.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {member.status === 'active' ? 'Hoạt động' : 
                         member.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}
                      </span>
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
    </div>
  );
}
