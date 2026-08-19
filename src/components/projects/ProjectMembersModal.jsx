import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, UserMinus, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function ProjectMembersModal({ isOpen, onClose, project, userSession }) {
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current members of the project
      const { data: memberData, error: memberErr } = await supabase
        .from('project_members')
        .select(`
          user_id,
          created_at,
          profiles:user_id ( id, email, full_name, role )
        `)
        .eq('project_id', project.id);
      
      if (memberErr) throw memberErr;
      setMembers(memberData || []);

      // 2. Fetch all profiles (to find available level_2 users)
      const { data: profilesData, error: profErr } = await supabase.rpc('get_all_profiles');
      if (profErr) throw profErr;

      // Filter to only level_2 that belong to this level_1 (and are active)
      // and are not already in the project
      const myLevel2Users = (profilesData || []).filter(p => 
        p.role === 'level_2' && 
        p.status === 'active' &&
        !memberData?.some(m => m.user_id === p.id)
      );
      setAvailableUsers(myLevel2Users);
      if (myLevel2Users.length > 0) setSelectedUserId(myLevel2Users[0].id);

    } catch (err) {
      console.error(err);
      alert('Lỗi khi tải dữ liệu thành viên: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      loadData();
    }
  }, [isOpen, project]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: selectedUserId
        });
      
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Lỗi thêm thành viên: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    // Không cho tự xóa chính mình nếu là level_1 (owner)
    if (userId === userSession?.user?.id) {
      alert("Bạn không thể tự xóa mình khỏi dự án do bạn sở hữu.");
      return;
    }

    if (!window.confirm("Xóa nhân sự này khỏi dự án?")) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .match({ project_id: project.id, user_id: userId });
      
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Lỗi xóa thành viên: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Thành viên Dự án</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{project.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition cursor-pointer p-1.5 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Form Add Member */}
              {userSession?.user?.role !== 'level_2' && (
                <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                      Thêm nhân sự (Cấp 2) vào dự án
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition"
                      disabled={availableUsers.length === 0}
                    >
                      {availableUsers.length === 0 ? (
                        <option value="">-- Không có nhân sự nào để thêm --</option>
                      ) : (
                        availableUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || u.email} ({u.email})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={isAdding || availableUsers.length === 0}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Thêm
                  </button>
                </div>
              )}

              {/* Members List */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-success" /> Danh sách thành viên ({members.length})
                </h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse bg-card">
                    <thead>
                      <tr className="bg-muted text-muted-foreground text-[11px] uppercase tracking-wider">
                        <th className="p-3 font-semibold">Nhân sự</th>
                        <th className="p-3 font-semibold">Vai trò</th>
                        <th className="p-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {members.map(m => {
                        const profile = m.profiles || {};
                        const isOwner = profile.role === 'level_1' || profile.role === 'super_admin';
                        const isMe = m.user_id === userSession?.user?.id;

                        return (
                          <tr key={m.user_id} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div className="font-semibold text-sm text-foreground">{profile.full_name || 'Chưa cập nhật'}</div>
                              <div className="text-xs text-muted-foreground">{profile.email}</div>
                            </td>
                            <td className="p-3">
                              {isOwner ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                  Owner (Cấp 1)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground border border-border">
                                  Member (Cấp 2)
                                </span>
                              )}
                              {isMe && <span className="ml-2 text-[10px] text-success font-bold">(Bạn)</span>}
                            </td>
                            <td className="p-3 text-right">
                              {/* Cấp 1 có quyền xóa Cấp 2. Không ai được xóa Cấp 1 (owner) từ UI này */}
                              {!isOwner && userSession?.user?.role !== 'level_2' && (
                                <button
                                  onClick={() => handleRemoveMember(m.user_id)}
                                  className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition cursor-pointer"
                                  title="Xóa khỏi dự án"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
