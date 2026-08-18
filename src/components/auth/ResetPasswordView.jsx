import React, { useState } from 'react';
import { KeyRound, Lock, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function ResetPasswordView({ onBackToLogin, hasRecoverySession }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // If the user lands here but Supabase didn't grant a recovery session, it means the link is invalid or expired
  if (!hasRecoverySession && !success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 via-rose-500 to-red-600 p-6 text-white text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h2 className="text-2xl font-bold">Liên kết không hợp lệ</h2>
          </div>
          <div className="p-6 text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một liên kết mới.
            </p>
            <button
              onClick={onBackToLogin}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ mật khẩu mới và xác nhận mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Update successful, log out to require manual login
      await supabase.auth.signOut();
      
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra trong quá trình đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden text-center">
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 p-6 text-white">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h2 className="text-2xl font-bold">Thành công</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-foreground text-sm font-medium">
              Đặt lại mật khẩu thành công.
            </p>
            <p className="text-muted-foreground text-sm">
              Bạn có thể sử dụng mật khẩu mới để đăng nhập vào hệ thống.
            </p>
            <button
              onClick={onBackToLogin}
              className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Branding Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
            Antigravity<span className="text-primary">QLDA</span>
          </h1>
          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Hệ thống Quản lý Dự án
          </span>
        </div>
      </div>

      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white text-center">
          <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold">Đặt lại mật khẩu</h2>
          <p className="text-xs text-blue-100/80 mt-1">Vui lòng nhập mật khẩu mới của bạn</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-start gap-2 text-sm animate-in fade-in zoom-in duration-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
