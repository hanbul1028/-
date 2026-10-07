import React, { useState } from 'react';
import { LedgerItem } from '../types';
import { TrendingDown, TrendingUp, Wallet, PieChart, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface SummaryCardProps {
  items: LedgerItem[];
  selectedMonth: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ items, selectedMonth }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate totals
  const totalIncome = items
    .filter((i) => i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalExpense = items
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);

  const balance = totalIncome - totalExpense;

  // Breakdown by category (for expenses)
  const categoryTotals: Record<string, number> = {};
  items
    .filter((i) => i.type === 'expense')
    .forEach((item) => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Breakdown by member
  const memberTotals: Record<string, { income: number; expense: number; photo?: string }> = {};
  items.forEach((item) => {
    const name = item.userName || '미지정';
    if (!memberTotals[name]) {
      memberTotals[name] = { income: 0, expense: 0, photo: item.userPhoto };
    }
    if (item.type === 'expense') {
      memberTotals[name].expense += item.amount;
    } else {
      memberTotals[name].income += item.amount;
    }
  });

  const monthLabel =
    selectedMonth === 'all'
      ? '전체 기간'
      : `${selectedMonth.split('-')[0]}년 ${parseInt(selectedMonth.split('-')[1], 10)}월`;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl mb-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header of summary */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-medium text-slate-400">{monthLabel} 요약</span>
          <p className="text-sm font-semibold text-slate-200">총 {items.length}건의 거래 내역</p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg border border-indigo-700/50 transition-colors"
        >
          {showDetails ? (
            <>
              <span>간단히 보기</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <PieChart className="w-3.5 h-3.5" />
              <span>분석 보기</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Main 3 statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        {/* Total Income */}
        <div className="bg-slate-800/60 backdrop-blur-xs p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between text-blue-400 mb-1">
            <span className="text-xs font-medium">총 수입</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-300 tracking-tight">
            +{totalIncome.toLocaleString()}
            <span className="text-xs font-normal ml-1 text-blue-400">원</span>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-slate-800/60 backdrop-blur-xs p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-medium">총 지출</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-300 tracking-tight">
            -{totalExpense.toLocaleString()}
            <span className="text-xs font-normal ml-1 text-rose-400">원</span>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-slate-800/60 backdrop-blur-xs p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">현재 잔액</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {balance >= 0 ? '+' : ''}
            {balance.toLocaleString()}
            <span className="text-xs font-normal ml-1 text-slate-400">원</span>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Accordion */}
      {showDetails && (
        <div className="mt-5 pt-5 border-t border-slate-800 space-y-5 animate-in fade-in duration-200">
          {/* Category Expense Breakdown */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-3">
              <PieChart className="w-3.5 h-3.5 text-indigo-400" />
              <span>지출 카테고리별 비중</span>
            </div>
            {sortedCategories.length === 0 ? (
              <p className="text-xs text-slate-500">등록된 지출 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {sortedCategories.slice(0, 5).map(([category, amount]) => {
                  const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{category}</span>
                        <span className="text-slate-400">
                          {amount.toLocaleString()}원 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Family Member Spending Breakdown */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-3">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>가족 구성원별 지출 현황</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(memberTotals).map(([name, stats]) => (
                <div
                  key={name}
                  className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    {stats.photo ? (
                      <img
                        src={stats.photo}
                        alt={name}
                        className="w-6 h-6 rounded-full border border-slate-600 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-800 text-white font-bold flex items-center justify-center text-[10px]">
                        {name[0]}
                      </div>
                    )}
                    <span className="font-medium text-slate-200">{name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-400 font-semibold">-{stats.expense.toLocaleString()}원</span>
                    {stats.income > 0 && (
                      <span className="text-blue-400 text-[11px] block">+{stats.income.toLocaleString()}원</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
