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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Glow Effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-bold mx-auto">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-1.5 pt-1">
            BUILD<span className="text-blue-400 font-black">COST</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Hệ thống Quản lý Chi phí & Hợp đồng Xây dựng
          </p>
        </div>

        {/* Warning if .env is missing */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Chưa phát hiện cấu hình Supabase (.env)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Vui lòng tạo file <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">.env</code> tại thư mục gốc dự án với nội dung:
            </p>
            <pre className="bg-slate-950 p-2.5 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto border border-slate-800">
              VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}
              VITE_SUPABASE_ANON_KEY=your-anon-key-here
            </pre>
          </div>
        )}

        {/* Auth Toggle Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              !isSignUp ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
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
              isSignUp ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Đăng ký
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold uppercase text-[10px] tracking-wider block">
              Email đăng nhập
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="vd: kythuat@duan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold uppercase text-[10px] tracking-wider block">
              Mật khẩu
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

        <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-800/80 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bảo mật bằng Supabase Auth & PostgreSQL Data Layer</span>
        </div>

      </div>
    </div>
  );
}
