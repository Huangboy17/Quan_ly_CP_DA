import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { updateOwnProfile } from '../../services/storage';
import { User, Lock, Save, Loader2, Building2, Briefcase, Calendar, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ProfileView({ userSession, userProfile, onProfileUpdated }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Profile state
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    jobTitle: '',
    company: '',
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState(null);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.full_name || '',
        birthDate: userProfile.birth_date || '',
        jobTitle: userProfile.job_title || '',
        company: userProfile.company || '',
      });
    }
  }, [userProfile]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { success, error } = await updateOwnProfile(formData);
    
    setLoading(false);
    if (success) {
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      if (onProfileUpdated) onProfileUpdated();
    } else {
      setMessage({ type: 'error', text: error || 'Có lỗi xảy ra khi cập nhật.' });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwdMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }

    setPwdLoading(true);
    setPwdMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    setPwdLoading(false);
    if (error) {
      setPwdMessage({ type: 'error', text: error.message });
    } else {
      setPwdMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Thông tin tài khoản</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* THÔNG TIN CÁ NHÂN */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Thông tin cá nhân</h2>
          </div>

          {message && (
            <div className={`p-3 rounded-xl flex items-start gap-2 mb-4 text-sm font-medium ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Email (Không thể đổi)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={userProfile?.email || userSession?.user?.email || ''}
                  disabled
                  className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-muted-foreground font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Họ và tên</label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleProfileChange}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                  placeholder="Nhập họ và tên..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Ngày sinh</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleProfileChange}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Chức vụ</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleProfileChange}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                  placeholder="Nhập chức vụ..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Công ty</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleProfileChange}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                  placeholder="Nhập tên công ty..."
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>

        {/* BẢO MẬT TÀI KHOẢN */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Lock className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-bold text-foreground">Bảo mật tài khoản</h2>
          </div>

          {pwdMessage && (
            <div className={`p-3 rounded-xl flex items-start gap-2 mb-4 text-sm font-medium ${pwdMessage.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {pwdMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {pwdMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive outline-none transition"
                  placeholder="Nhập mật khẩu mới..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive outline-none transition"
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Đổi mật khẩu
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
