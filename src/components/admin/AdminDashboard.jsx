import React, { useState, useEffect } from 'react';
import { fetchAllProfiles, updateProfileStatus, updateProfileQuota } from '../../services/storage';
import { supabase } from '../../services/supabase';
import { Users, CheckCircle, XCircle, ShieldAlert, Clock, RefreshCw, ShieldCheck, Archive, Plus, Eye, EyeOff } from 'lucide-react';

export default function AdminDashboard({ userSession }) {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', fullName: '' });

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
    
    // Nếu là archived, yêu cầu xác nhận kỹ
    if (newStatus === 'archived') {
      const confirm = window.confirm('Lưu trữ tài khoản này sẽ giải phóng Quota, tài khoản không thể đăng nhập nữa nhưng lịch sử vẫn được giữ. Bạn có chắc chắn?');
      if (!confirm) return;
    }

    const success = await updateProfileStatus(targetUserId, newStatus);
    if (success) {
      loadProfiles();
    } else {
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleQuotaChange = async (targetUserId, currentQuota) => {
    const newVal = prompt("Nhập số lượng tài khoản Cấp 2 tối đa (Quota) cho người này:", currentQuota);
    if (newVal === null) return; // cancel
    const parsed = parseInt(newVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      alert('Vui lòng nhập một số hợp lệ.');
      return;
    }
    const success = await updateProfileQuota(targetUserId, parsed);
    if (success) {
      loadProfiles();
    } else {
      alert('Có lỗi xảy ra khi cập nhật Quota');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.fullName) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          role: 'level_2'
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      alert("Tạo tài khoản Cấp 2 thành công!");
      setIsCreateModalOpen(false);
      setCreateForm({ email: '', password: '', fullName: '' });
      loadProfiles();
    } catch (err) {
      alert(err.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setIsCreating(false);
    }
  };

  // Tính toán Quota cho Level 1
  const currentUserProfile = profiles.find(p => p.id === userSession?.user?.id);
  const isLevel1 = currentUserProfile?.role === 'level_1';
  
  const myChildren = profiles.filter(p => p.parent_id === userSession?.user?.id);
  const usedQuota = myChildren.filter(p => ['active', 'blocked', 'pending'].includes(p.status)).length;
  const maxQuota = currentUserProfile?.max_quota || 0;

  // Lọc hiển thị
  const filteredProfiles = profiles.filter(p => showArchived ? true : p.status !== 'archived');

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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-success" /> Quản Lý Nhân Sự
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLevel1 ? 'Quản lý tài khoản Cấp 2 và Quota của bạn.' : 'Quản trị hệ thống toàn quyền.'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {showArchived ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showArchived ? 'Ẩn tài khoản Lưu trữ' : 'Hiện tài khoản Lưu trữ'}
            </button>
            <button 
              onClick={loadProfiles}
              className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {isLevel1 && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tạo Cấp 2
              </button>
            )}
          </div>
        </div>

        {/* Quota Indicator cho Cấp 1 */}
        {isLevel1 && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Quota Tài Khoản Cấp 2</div>
              <div className="text-2xl font-black text-foreground">
                <span className={usedQuota >= maxQuota ? 'text-destructive' : 'text-primary'}>{usedQuota}</span> 
                <span className="text-muted-foreground"> / {maxQuota}</span>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground max-w-xs">
              Khi đạt giới hạn, bạn cần lưu trữ (Archive) các tài khoản cũ để tạo thêm nhân sự mới.
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Tài khoản (Email)</th>
                  <th className="p-4 font-semibold">Tên / Phân quyền</th>
                  <th className="p-4 font-semibold">Quota (Cấp 2)</th>
                  <th className="p-4 font-semibold">Ngày đăng ký</th>
                  <th className="p-4 font-semibold">Trạng thái</th>
                  <th className="p-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProfiles.map(p => {
                  const isSelf = p.id === userSession?.user?.id;
                  
                  return (
                    <tr key={p.id} className={`hover:bg-muted/50 transition group ${p.status === 'archived' ? 'opacity-60' : ''}`}>
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
                        {p.role === 'level_1' ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">{p.max_quota || 0}</span>
                            {currentUserProfile?.role === 'super_admin' && (
                              <button 
                                onClick={() => handleQuotaChange(p.id, p.max_quota || 0)}
                                className="text-[10px] text-primary hover:underline cursor-pointer"
                              >
                                Sửa
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
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
                        {p.status === 'archived' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
                            <Archive className="w-3.5 h-3.5" /> Lưu trữ
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
                          {!isSelf && p.status === 'active' && p.role !== 'super_admin' && (
                            <button 
                              onClick={() => {
                                if(window.confirm('Khóa tài khoản này?')) {
                                  handleStatusChange(p.id, 'blocked');
                                }
                              }}
                              className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Khóa
                            </button>
                          )}
                          {!isSelf && p.status === 'blocked' && p.role !== 'super_admin' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(p.id, 'active')}
                                className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                Mở khóa
                              </button>
                              <button 
                                onClick={() => handleStatusChange(p.id, 'archived')}
                                className="px-3 py-1.5 bg-muted hover:bg-destructive/90 text-muted-foreground hover:text-destructive-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Lưu trữ để giải phóng Quota"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-muted-foreground">
                      Không có dữ liệu người dùng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="font-bold text-foreground">Tạo tài khoản Cấp 2</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition cursor-pointer p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email đăng nhập</label>
                <input 
                  type="email" 
                  required
                  value={createForm.email}
                  onChange={e => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition"
                  placeholder="nhanvien@congty.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Mật khẩu</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition"
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  required
                  value={createForm.fullName}
                  onChange={e => setCreateForm({...createForm, fullName: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
