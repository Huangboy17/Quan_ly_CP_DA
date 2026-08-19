import React, { useState, useEffect } from 'react';
import { X, Building2, DollarSign, Sparkles } from 'lucide-react';
import { formatVND, numberToWordsVN } from '../../utils/formatters';

export default function ProjectModal({ isOpen, onClose, onSaveProject, editingProject = null }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    initial_tmdt: '',
    member_ids: [],
  });

  const [availableLevel2, setAvailableLevel2] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    const loadMembersData = async () => {
      if (!isOpen) return;
      setIsLoadingMembers(true);
      try {
        // Fetch all Level 2 profiles managed by the current user
        const { supabase } = await import('../../services/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, email, status')
          .eq('role', 'level_2')
          .eq('parent_id', user.id)
          .eq('status', 'active');
        
        if (profErr) throw profErr;
        setAvailableLevel2(profiles || []);

        // If editing, fetch current members
        let currentMemberIds = [];
        if (editingProject && editingProject.id) {
          const { data: currentMembers, error: memErr } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', editingProject.id);
          
          if (memErr) throw memErr;
          currentMemberIds = currentMembers?.map(m => m.user_id) || [];
        }

        setFormData({
          name: editingProject?.name || '',
          location: editingProject?.location || editingProject?.address || '',
          description: editingProject?.description || '',
          initial_tmdt: editingProject?.initial_tmdt !== undefined && editingProject.initial_tmdt !== null ? editingProject.initial_tmdt : '',
          member_ids: currentMemberIds,
        });

      } catch (err) {
        console.error('Error loading members data:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMembersData();
  }, [editingProject, isOpen]);

  const toggleMember = (userId) => {
    setFormData(prev => {
      const isSelected = prev.member_ids.includes(userId);
      if (isSelected) {
        return { ...prev, member_ids: prev.member_ids.filter(id => id !== userId) };
      } else {
        return { ...prev, member_ids: [...prev.member_ids, userId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập Tên Dự Án!');
      return;
    }

    const locVal = formData.location.trim();
    try {
      await onSaveProject({
        ...editingProject,
        name: formData.name.trim(),
        location: locVal,
        address: locVal,
        description: formData.description.trim(),
        initial_tmdt: formData.initial_tmdt ? Number(formData.initial_tmdt) : 0,
        member_ids: formData.member_ids,
      });
      onClose();
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('MEMBER_HAS_CONTRACTS')) {
        alert('Không thể xóa thành viên này khỏi dự án vì đang được giao hợp đồng. Vui lòng chuyển giao hợp đồng trước.');
      } else {
        alert('Lỗi khi lưu dự án: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const initialTmdtNum = Number(formData.initial_tmdt || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-6 pb-6 px-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full mx-2 md:mx-auto shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Modal Header (Fixed) */}
        <div className="px-6 py-3.5 bg-muted/50 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {editingProject ? 'Cập Nhật Dự Án' : 'Khởi Tạo Dự Án Mới'}
              </h3>
              <p className="text-xs text-muted-foreground">Thiết lập thông tin công trình & Tổng mức đầu tư ban đầu (TMĐT)</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Modal Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">
                Tên Dự Án / Công Trình <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Khu Đô Thị Sông Hồng Riverside..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">
                Địa Điểm / Hạng Mục Dự Án
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đông Anh, Hà Nội..."
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* TMĐT Ban Đầu */}
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-success" />
                Tổng Mức Đầu Tư Ban Đầu (TMĐT Được Phê Duyệt)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Nhập số tiền VND (Ví dụ: 500000000000)..."
                  value={formData.initial_tmdt}
                  onChange={(e) => setFormData({ ...formData, initial_tmdt: e.target.value })}
                  className="w-full pl-3 pr-14 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground font-mono font-bold focus:outline-none focus:border-success transition"
                  min="0"
                  step="1000000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-success">
                  VND
                </span>
              </div>

              {/* Quick Add Chips */}
              <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto pb-0.5">
                <span className="text-[10px] text-muted-foreground font-medium">Cộng nhanh:</span>
                {[10_000_000_000, 50_000_000_000, 100_000_000_000, 500_000_000_000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const current = Number(formData.initial_tmdt || 0);
                      setFormData({ ...formData, initial_tmdt: (current + val).toString() });
                    }}
                    className="px-2 py-0.5 rounded-lg bg-muted hover:bg-muted/80 border border-border text-[10px] text-success font-mono font-semibold transition cursor-pointer"
                  >
                    +{val / 1_000_000_000} Tỷ
                  </button>
                ))}
              </div>

              {/* Readout */}
              {initialTmdtNum > 0 && (
                <div className="mt-1.5 p-2 rounded-lg bg-success/10 border border-success/20 text-xs font-mono text-success space-y-0.5">
                  <div>Định dạng: <span className="font-bold text-foreground">{formatVND(initialTmdtNum)}</span></div>
                  <div className="text-[11px] text-success/90 font-sans italic flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-success shrink-0" />
                    Bằng chữ: {numberToWordsVN(initialTmdtNum)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">
                Mô Tả / Quy Mô Dự Án
              </label>
              <textarea
                rows="2"
                placeholder="Mô tả vị trí, diện tích, quy mô hạng mục công trình..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            {/* Thành viên tham gia dự án (Level 2) */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-foreground/80 mb-2">
                Thành Viên Tham Gia Dự Án (Cấp 2)
              </label>
              
              <div className="bg-muted/30 border border-border rounded-xl p-3 max-h-40 overflow-y-auto">
                {isLoadingMembers ? (
                  <div className="text-center text-xs text-muted-foreground py-2">Đang tải danh sách thành viên...</div>
                ) : availableLevel2.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-2">Bạn chưa có tài khoản Cấp 2 nào đang hoạt động.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {availableLevel2.map(user => {
                      const isSelected = formData.member_ids.includes(user.id);
                      return (
                        <label 
                          key={user.id} 
                          className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                            isSelected ? 'bg-primary/10 border-primary/30' : 'bg-card border-transparent hover:border-border'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMember(user.id)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {user.full_name || 'Chưa cập nhật tên'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{user.email}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Modal Footer (Fixed) */}
          <div className="px-6 py-3.5 bg-card border-t border-border flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30 transition cursor-pointer"
            >
              {editingProject ? 'Lưu Thay Đổi' : 'Tạo Dự Án'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
