import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupabaseConfigured) {
      setErrorMsg('Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env trước khi đăng nhập.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Email và Mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setSuccessMsg('Đăng nhập thành công!');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(data.user);
          onClose();
        }, 800);
      } else {
        const checkEmail = email.trim();
        
        // 1. First layer: Check profiles if RLS allows
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('status')
          .ilike('email', checkEmail);

        if (existingProfiles && existingProfiles.length > 0) {
          const profileStatus = existingProfiles[0].status;
          if (profileStatus === 'active') {
            throw new Error('Email này đã được đăng ký và tài khoản đang hoạt động. Vui lòng đăng nhập thay vì đăng ký tài khoản mới.');
          } else if (profileStatus === 'pending') {
            throw new Error('Email này đã được đăng ký và đang chờ quản trị viên phê duyệt.');
          } else {
            throw new Error('Email này đã tồn tại trong hệ thống. Vui lòng liên hệ quản trị viên.');
          }
        }

        // 2. Second layer: Auth check
        const { data, error } = await supabase.auth.signUp({
          email: checkEmail,
          password,
        });

        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Email này đã được đăng ký và tài khoản đang hoạt động. Vui lòng đăng nhập thay vì đăng ký tài khoản mới.');
          }
          throw error;
        }

        // 3. Third layer: Catch Supabase fake success
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Email này đã được đăng ký và tài khoản đang hoạt động. Vui lòng đăng nhập thay vì đăng ký tài khoản mới.');
        }

        if (data.session) {
          setSuccessMsg('Đăng ký tài khoản thành công!');
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(data.user);
            onClose();
          }, 1000);
        } else {
          setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận (nếu Supabase bật email confirmation) hoặc tiến hành đăng nhập.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {/* Header Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-foreground relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-foreground/80 hover:text-foreground bg-black/20 hover:bg-black/40 rounded-full p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-card/10 backdrop-blur-md rounded-xl">
              <ShieldCheck className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Xác thực Supabase</h2>
              <p className="text-xs text-blue-100/80">Quản lý chi phí & bảo mật RLS theo User ID</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          
          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Chưa cấu hình Supabase API Key!</strong>
                <p className="mt-1">Hãy mở file <code>.env</code> và thay thế <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code> bằng thông tin dự án Supabase của bạn.</p>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex bg-background p-1 rounded-xl border border-border mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-primary text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="w-4 h-4" /> Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-primary text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Đăng Ký
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl text-success text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-foreground font-semibold text-sm rounded-xl transition shadow-lg shadow-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Đăng Nhập
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Tạo Tài Khoản Mới
                </>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
