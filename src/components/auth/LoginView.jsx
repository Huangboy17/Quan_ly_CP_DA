import React, { useState } from 'react';
import { Building2, Lock, Mail, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

export default function LoginView({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase chưa được cấu hình. Vui lòng tạo file .env với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user && data?.session === null) {
          setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản, hoặc đăng nhập nếu tài khoản đã được kích hoạt.');
        } else {
          setSuccessMsg('Tạo tài khoản thành công!');
          if (onLoginSuccess) onLoginSuccess(data.session);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg('Đăng nhập thành công!');
        if (onLoginSuccess) onLoginSuccess(data.session);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra trong quá trình xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Glow Effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-success/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card/90 border border-border rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-primary text-foreground font-bold mx-auto">
            <Building2 className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center justify-center gap-1.5 pt-1">
            BUILD<span className="text-primary font-black">COST</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Hệ thống Quản lý Chi phí & Hợp đồng Xây dựng
          </p>
        </div>

        {/* Warning if .env is missing */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-2xl bg-warning/10 border border-warning/50 text-warning text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-warning-foreground/90">
              <AlertCircle className="w-4 h-4 shrink-0 text-warning" />
              <span>Chưa phát hiện cấu hình Supabase (.env)</span>
            </div>
            <p className="text-warning-foreground/80 leading-relaxed text-[11px]">
              Vui lòng tạo file <code className="bg-background px-1.5 py-0.5 rounded text-warning font-mono">.env</code> tại thư mục gốc dự án với nội dung:
            </p>
            <pre className="bg-background p-2.5 rounded-lg text-[10px] font-mono text-success overflow-x-auto border border-border">
              VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}
              VITE_SUPABASE_ANON_KEY=your-anon-key-here
            </pre>
          </div>
        )}

        {/* Auth Toggle Tabs */}
        <div className="flex rounded-xl bg-background p-1 border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              !isSignUp ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isSignUp ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Đăng ký
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/50 text-destructive text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/50 text-success text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <label className="text-foreground/80 font-semibold uppercase text-[10px] tracking-wider block">
              Email đăng nhập
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="vd: kythuat@duan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground/80 font-semibold uppercase text-[10px] tracking-wider block">
              Mật khẩu
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-foreground font-bold text-xs shadow-lg shadow-primary/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" /> Đăng ký tài khoản
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Đăng nhập hệ thống
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-muted-foreground border-t border-border/80 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>Bảo mật bằng Supabase Auth & PostgreSQL Data Layer</span>
        </div>

      </div>
    </div>
  );
}
