"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Eye, EyeOff, Loader2, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setIsLoading(true);
    try {
      const success = await login(account, password);
      if (success) {
        router.push('/notes');
      } else {
        setError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* 左侧品牌面板 */}
      <div className="hidden lg:flex flex-col w-[45%] bg-gray-800 relative overflow-hidden p-14">
        {/* 背景光晕 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(20,184,166,0.25)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.18)_0%,_transparent_60%)]" />
        {/* 同心圆装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-white/[0.03]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-white/[0.04]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-white/[0.06]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <span className="text-white font-black text-xl tracking-tight">漫记</span>
            <span className="text-teal-400/60 text-[10px] font-black uppercase tracking-[0.35em] ml-2.5">manoai</span>
          </div>
        </div>

        {/* 核心文案 */}
        <div className="relative flex-1 flex flex-col justify-center z-10 space-y-8">
          <div className="inline-flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-teal-400/80 text-[10px] font-black uppercase tracking-[0.3em]">AI Knowledge Engine</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight whitespace-nowrap">
              思想的<span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">永久存档</span>
            </h1>
            <p className="text-white/35 text-sm leading-[1.9] max-w-[260px] font-medium">
              将每一次思考沉淀为结构化知识，让 AI 帮你发现隐藏在笔记之间的连线。
            </p>
          </div>
        </div>

        {/* 底部功能标签 */}
        <div className="relative z-10 flex items-center gap-5">
          {[
            { color: 'bg-teal-400', label: '语义搜索' },
            { color: 'bg-cyan-400', label: '知识图谱' },
            { color: 'bg-blue-400', label: 'AI 综述' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
              </div>
              <span className="text-white/25 text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧表单面板 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        {/* 移动端 Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-12">
          <div className="w-9 h-9 bg-gradient-to-tr from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Sparkles className="text-white" size={18} />
          </div>
          <span className="text-gray-900 font-black text-xl tracking-tight">漫记</span>
        </div>

        <div className="w-full max-w-[340px]">
          <div className="mb-10 space-y-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">欢迎回来</h2>
            <p className="text-gray-400 text-sm font-medium">登录您的私有知识库</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 账号 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                账号
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => { setAccount(e.target.value); setError(false); }}
                className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none text-gray-900 font-medium text-sm transition-all duration-200 placeholder:text-gray-300 ${
                  error
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-transparent focus:border-teal-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(20,184,166,0.07)]'
                }`}
                placeholder="请输入账号"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            {/* 密码 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none text-gray-900 font-medium text-sm transition-all duration-200 placeholder:text-gray-300 pr-12 ${
                    error
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-transparent focus:border-teal-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(20,184,166,0.07)]'
                  }`}
                  placeholder="请输入密码"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-red-500 font-bold pl-1 pt-0.5">账号或密码错误，请重试</p>
              )}
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || !account || !password}
              className="w-full flex items-center justify-center gap-2.5 bg-gray-900 hover:bg-teal-600 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed text-white py-[1.05rem] rounded-2xl font-black text-[13px] uppercase tracking-[0.15em] transition-all duration-300 shadow-xl shadow-gray-900/10 hover:shadow-teal-500/20 active:scale-[0.985]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  <span>验证中...</span>
                </>
              ) : (
                <>
                  <span>进入知识库</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-200 text-[9px] font-black uppercase tracking-[0.3em] mt-14">
            MANOAI · Private AI System
          </p>
        </div>
      </div>
    </div>
  );
}
