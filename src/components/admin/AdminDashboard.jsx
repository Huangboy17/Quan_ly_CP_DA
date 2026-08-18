import React, { useState, useEffect } from 'react';
import { fetchAllProfiles, updateProfileStatus } from '../../services/storage';
import { Users, CheckCircle, XCircle, ShieldAlert, Clock, RefreshCw, ShieldCheck } from 'lucide-react';

export default function AdminDashboard({ userSession }) {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    // Cannot change own status
    if (targetUserId === userSession?.user?.id) return;

    const success = await updateProfileStatus(targetUserId, newStatus);
    if (success) {
      loadProfiles();
    } else {
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Đang tải danh sách người dùng...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 animate-fade-in flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-success" /> Quản Trị Hệ Thống
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Phê duyệt tài khoản, khóa hoặc mở khóa người dùng.
            </p>
          </div>
          <button 
            onClick={loadProfiles}
            className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Tài khoản (Email)</th>
                  <th className="p-4 font-semibold">Tên / Phân quyền</th>
                  <th className="p-4 font-semibold">Ngày đăng ký</th>
                  <th className="p-4 font-semibold">Trạng thái</th>
                  <th className="p-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {profiles.map(p => {
                  const isSelf = p.id === userSession?.user?.id;
                  
                  return (
                    <tr key={p.id} className="hover:bg-muted/50 transition group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{p.email}</div>
                            {isSelf && <div className="text-[10px] text-success font-bold uppercase mt-0.5">Tài khoản của bạn</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-foreground/80">{p.full_name || 'Chưa cập nhật'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{p.role}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-foreground/80 font-mono">
                          {new Date(p.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="p-4">
                        {p.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-success/10 text-success border border-success/20">
                            <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                            <Clock className="w-3.5 h-3.5" /> Chờ duyệt
                          </span>
                        )}
                        {p.status === 'blocked' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            <XCircle className="w-3.5 h-3.5" /> Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isSelf && p.status === 'pending' && (
                            <button 
                              onClick={() => handleStatusChange(p.id, 'active')}
                              className="px-3 py-1.5 bg-success hover:bg-success/90 text-success-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Duyệt
                            </button>
                          )}
                          {!isSelf && p.status === 'active' && p.role !== 'admin' && (
                            <button 
                              onClick={() => {
                                if(window.confirm('Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ bị văng ra ngoài ngay lập tức.')) {
                                  handleStatusChange(p.id, 'blocked');
                                }
                              }}
                              className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Khóa
                            </button>
                          )}
                          {!isSelf && p.status === 'blocked' && (
                            <button 
                              onClick={() => handleStatusChange(p.id, 'active')}
                              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Mở khóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-muted-foreground">
                      Chưa có dữ liệu người dùng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
