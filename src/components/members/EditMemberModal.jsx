import React, { useState, useEffect } from 'react';
import { updateLevel2MemberProfile } from '../../services/storage';

export default function EditMemberModal({ isOpen, onClose, member, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || '');
      setPhone(member.phone || '');
      setJobTitle(member.title || member.job_title || member.position || member.chuc_vu || '');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Họ tên không được để trống.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await updateLevel2MemberProfile(member.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim()
      });

      if (res.success) {
        onSuccess && onSuccess();
        onClose();
      } else {
        setError(res.error || 'Lỗi khi cập nhật thông tin.');
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-card text-foreground rounded-xl shadow-xl overflow-hidden border border-border" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-base font-bold">Chỉnh sửa thông tin thành viên</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Email</label>
            <input
              type="text"
              value={member.email}
              disabled
              className="w-full px-3 py-2 border border-input rounded-md bg-muted text-xs text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Chức vụ / Chức danh</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Nhập chức vụ (ví dụ: Kỹ sư QS, Kế toán...)"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-input bg-background hover:bg-muted rounded-md text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
