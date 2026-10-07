import React from 'react';
import { User } from 'firebase/auth';
import { LogOut, Home, Calendar, Download, Receipt, BarChart3 } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  selectedMonth: string; // YYYY-MM or 'all'
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  onExportCsv: () => void;
  currentView: 'ledger' | 'reports';
  onViewChange: (view: 'ledger' | 'reports') => void;
  onOpenFixedExpenses: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  selectedMonth,
  onMonthChange,
  availableMonths,
  onExportCsv,
  currentView,
  onViewChange,
  onOpenFixedExpenses,
  isSyncing,
}) => {
  // Format month for display: "2026-10" -> "2026년 10월"
  const formatMonthDisplay = (monthStr: string) => {
    if (monthStr === 'all') return '전체 기간';
    const [year, month] = monthStr.split('-');
    return `${year}년 ${parseInt(month, 10)}월`;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand & User info */}
          <div className="w-full sm:w-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-slate-800 text-lg leading-tight">우리 가족 가계부</h1>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    실시간 공유
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">가족과 실시간으로 함께 관리하는 가계부</p>
              </div>
            </div>

            {/* Mobile logout/profile button */}
            <div className="flex sm:hidden items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || '사용자'}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  {(user.displayName || '가족')[0]}
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Selector & Controls */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
            {/* Month Dropdown (shown when in ledger view) */}
            {currentView === 'ledger' && (
              <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-xl px-2.5 py-1.5 transition-colors">
                <Calendar className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-hidden cursor-pointer pr-2"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthDisplay(m)}
                    </option>
                  ))}
                  <option value="all">전체 내역 보기</option>
                </select>
              </div>
            )}

            {/* Manage Fixed Expenses */}
            <button
              onClick={onOpenFixedExpenses}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="매월 정기 고정비 관리 및 이번 달 등록"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>고정비 관리</span>
            </button>

            {/* Export to CSV */}
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="CSV 엑셀 파일로 내보내기"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">엑셀 내보내기</span>
            </button>

            {/* Desktop User Profile & Logout */}
            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '사용자'}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    {(user.displayName || '가족')[0]}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">
                  {user.displayName || '가족 구성원'}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Switcher: 가계부 내역 vs 통계 리포트 */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => onViewChange('ledger')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentView === 'ledger'
                ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>가계부 내역 & 입력</span>
          </button>
          <button
            onClick={() => onViewChange('reports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentView === 'reports'
                ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>통계 리포트 & 분석 차트</span>
          </button>
        </div>
      </div>
    </header>
  );
};
