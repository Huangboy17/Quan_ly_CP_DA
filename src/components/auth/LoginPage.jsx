import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Mail, Lock, LogIn, UserPlus, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage({ onContinueAsGuest }) {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, isConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isConfigured) {
      setErrorMsg('Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env trước khi đăng nhập.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        const res = await registerWithEmail(email, password);
        if (res?.session) {
          setSuccessMsg('Đăng ký thành công và đã tự động đăng nhập!');
        } else {
          setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản (nếu Supabase bật email confirmation).');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đăng nhập bằng Google OAuth.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Decor Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Box */}
      <div className="w-full max-w-md bg-card/90 border border-border rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-primary text-foreground mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
            BUILD<span className="text-primary">COST</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Cloud Enterprise
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Hệ thống Quản lý Chi phí & Hợp đồng Xây dựng</p>
        </div>

        {/* Warning if Supabase Not Configured */}
        {!isConfigured && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-2xl text-amber-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>Chưa kết nối Supabase Cloud!</strong>
              <p className="mt-1">Hãy mở file <code>.env</code> và điền <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code> để kích hoạt Đăng nhập đám mây.</p>
              {onContinueAsGuest && (
                <button
                  onClick={onContinueAsGuest}
                  className="mt-2.5 px-3 py-1.5 bg-warning/20 hover:bg-warning/30 text-amber-200 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                >
                  Dùng thử ở chế độ Offline (LocalStorage) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Google OAuth Button */}
        {isConfigured && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 bg-muted hover:bg-muted/80 border border-border/80 rounded-2xl text-sm font-semibold text-slate-100 flex items-center justify-center gap-3 transition shadow-md group"
            >
              {/* Google Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-1.5-1.2-3.2-1.2-5z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              Đăng nhập với Google OAuth
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">
                hoặc dùng Email
              </span>
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="flex bg-background p-1 rounded-2xl border border-border mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
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
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-primary text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Đăng Ký Tài Khoản
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-success/10 border border-success/30 rounded-xl text-success text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
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
                placeholder="chuduan@company.com"
                required
                className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-blue-500 transition"
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
                className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-foreground font-bold text-sm rounded-xl transition shadow-lg shadow-primary disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" /> Đăng Nhập Vào Dashboard
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Đăng Ký Tài Khoản Mới
              </>
            )}
          </button>
        </form>

        {/* Guest Mode Option */}
        {onContinueAsGuest && isConfigured && (
          <div className="mt-6 text-center border-t border-border/80 pt-4">
            <button
              onClick={onContinueAsGuest}
              className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-4"
            >
              Xem thử ứng dụng ở chế độ Demo (LocalStorage)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
