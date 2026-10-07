import React, { useState } from 'react';
import { Home, Users, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onLogin: () => Promise<void>;
  isLoading: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, isLoading }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginClick = async () => {
    setErrorMsg(null);
    try {
      await onLogin();
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('로그인 창이 닫혔습니다. 다시 시도해주세요.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setErrorMsg('구글 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient decorative shapes */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative z-10 text-white">
        {/* App Logo & Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-400 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
          <Home className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          우리 가족 가계부
        </h1>
        <p className="text-sm text-slate-300 mb-6 font-medium">
          온 가족이 실시간으로 함께 기록하고 나누는 스마트 가계부
        </p>

        {/* Feature Highlights */}
        <div className="space-y-3 text-left mb-8">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">가족 실시간 동기화</p>
              <p className="text-[11px] text-slate-400">한 명이 등록하면 모든 가족 화면에 즉시 업데이트</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">직관적인 월별 지출/수입 통계</p>
              <p className="text-[11px] text-slate-400">카테고리별 비중 및 구성원별 지출 한눈에 파악</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">안전한 클라우드 저장</p>
              <p className="text-[11px] text-slate-400">Firebase Firestore 기반의 안전하고 빠른 데이터베이스</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs px-3 py-2 rounded-xl mb-4 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleLoginClick}
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-3.5 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="text-sm sm:text-base">Google 계정으로 시작하기</span>
        </button>

        <p className="text-[11px] text-slate-400 mt-4">
          가족 구성원 누구나 구글 계정으로 로그인하여 동일한 장부를 공유할 수 있습니다.
        </p>
      </div>
    </div>
  );
};
