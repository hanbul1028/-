import React, { useState, useMemo } from 'react';
import { LedgerItem, TransactionType } from '../types';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Users,
  Award,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface ReportsViewProps {
  items: LedgerItem[];
  availableMonths: string[];
}

// Category palette mapping for chart slices
const CATEGORY_COLORS: Record<string, string> = {
  식비: '#f97316', // Orange
  교육비: '#8b5cf6', // Violet
  '교통/유류비': '#06b6d4', // Cyan
  '주거/통신': '#10b981', // Emerald
  '쇼핑/생활': '#ec4899', // Pink
  '투자/저축': '#6366f1', // Indigo
  보험료: '#eab308', // Yellow
  '공과금/세금': '#64748b', // Slate
  '의료/건강': '#14b8a6', // Teal
  '문화/여가': '#a855f7', // Purple
  '경조사/회비': '#f43f5e', // Rose
  기타: '#94a3b8', // Gray
  급여: '#2563eb', // Blue
  부수입: '#3b82f6',
  상여금: '#60a5fa',
  '금융/투자수익': '#0284c7',
  '용돈/선물': '#38bdf8',
};

export const ReportsView: React.FC<ReportsViewProps> = ({ items, availableMonths }) => {
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');

  // Currently selected year & month
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(`${currentYearStr}-${currentMonthNum}`);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Extract all distinct years from items
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr);
    items.forEach((item) => {
      if (item.date && item.date.length >= 4) {
        yearsSet.add(item.date.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [items, currentYearStr]);

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let nextY = y;
    let nextM = m - 1;
    if (nextM < 1) {
      nextY -= 1;
      nextM = 12;
    }
    setSelectedMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextY += 1;
      nextM = 1;
    }
    setSelectedMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
  };

  // Filter items based on active period
  const activeItems = useMemo(() => {
    if (reportType === 'monthly') {
      return items.filter((item) => item.date.startsWith(selectedMonth));
    } else {
      return items.filter((item) => item.date.startsWith(selectedYear));
    }
  }, [items, reportType, selectedMonth, selectedYear]);

  // Totals
  const totalIncome = useMemo(
    () => activeItems.filter((i) => i.type === 'income').reduce((sum, i) => sum + i.amount, 0),
    [activeItems]
  );

  const totalExpense = useMemo(
    () => activeItems.filter((i) => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0),
    [activeItems]
  );

  const netBalance = totalIncome - totalExpense;

  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Category breakdown for expenses
  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    activeItems
      .filter((i) => i.type === 'expense')
      .forEach((item) => {
        map[item.category] = (map[item.category] || 0) + item.amount;
      });

    const entries = Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      color: CATEGORY_COLORS[category] || '#64748b',
    }));

    return entries.sort((a, b) => b.amount - a.amount);
  }, [activeItems, totalExpense]);

  // Family member breakdown
  const memberExpenses = useMemo(() => {
    const map: Record<string, { expense: number; income: number; photo?: string }> = {};
    activeItems.forEach((item) => {
      const name = item.userName || '가족';
      if (!map[name]) {
        map[name] = { expense: 0, income: 0, photo: item.userPhoto };
      }
      if (item.type === 'expense') {
        map[name].expense += item.amount;
      } else {
        map[name].income += item.amount;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => b.expense - a.expense);
  }, [activeItems]);

  // Annual data: 12 months Income vs Expense
  const annualMonthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      return {
        month: `${i + 1}월`,
        key: `${selectedYear}-${mStr}`,
        income: 0,
        expense: 0,
        balance: 0,
      };
    });

    items
      .filter((i) => i.date.startsWith(selectedYear))
      .forEach((item) => {
        const mIndex = parseInt(item.date.slice(5, 7), 10) - 1;
        if (mIndex >= 0 && mIndex < 12) {
          if (item.type === 'income') {
            months[mIndex].income += item.amount;
          } else {
            months[mIndex].expense += item.amount;
          }
        }
      });

    months.forEach((m) => {
      m.balance = m.income - m.expense;
    });

    return months;
  }, [items, selectedYear]);

  // Monthly data: Daily spending breakdown for selected month
  const monthlyDailyData = useMemo(() => {
    if (reportType !== 'monthly') return [];
    const [y, m] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dStr = String(i + 1).padStart(2, '0');
      return {
        day: i + 1,
        dateKey: `${selectedMonth}-${dStr}`,
        expense: 0,
        income: 0,
      };
    });

    activeItems.forEach((item) => {
      const dNum = parseInt(item.date.slice(8, 10), 10);
      if (dNum >= 1 && dNum <= daysInMonth) {
        if (item.type === 'expense') {
          days[dNum - 1].expense += item.amount;
        } else {
          days[dNum - 1].income += item.amount;
        }
      }
    });

    return days;
  }, [activeItems, reportType, selectedMonth]);

  // Calculate SVG Pie/Donut Chart Slices
  const donutSlices = useMemo(() => {
    if (categoryExpenses.length === 0 || totalExpense === 0) return [];

    let cumulativeAngle = 0;
    const radius = 80;
    const innerRadius = 48;
    const center = 100;

    return categoryExpenses.map((cat) => {
      const sliceAngle = (cat.amount / totalExpense) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle += sliceAngle;

      // Coordinate helper
      const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
        const rad = ((angleDeg - 90) * Math.PI) / 180.0;
        return {
          x: cx + r * Math.cos(rad),
          y: cy + r * Math.sin(rad),
        };
      };

      const startOuter = polarToCartesian(center, center, radius, startAngle);
      const endOuter = polarToCartesian(center, center, radius, endAngle);
      const startInner = polarToCartesian(center, center, innerRadius, endAngle);
      const endInner = polarToCartesian(center, center, innerRadius, startAngle);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      // Arc path
      const pathData = [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
        `L ${startInner.x} ${startInner.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
        'Z',
      ].join(' ');

      return {
        ...cat,
        pathData,
        startAngle,
        endAngle,
      };
    });
  }, [categoryExpenses, totalExpense]);

  // Bar chart max values for proper scale
  const maxAnnualVal = useMemo(() => {
    let max = 0;
    annualMonthlyData.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    });
    return max > 0 ? max : 100000;
  }, [annualMonthlyData]);

  const maxDailyExpense = useMemo(() => {
    let max = 0;
    monthlyDailyData.forEach((d) => {
      if (d.expense > max) max = d.expense;
    });
    return max > 0 ? max : 10000;
  }, [monthlyDailyData]);

  // Smart Insight text
  const highestExpenseCategory = categoryExpenses[0];
  const highestExpenseDay = useMemo(() => {
    if (monthlyDailyData.length === 0) return null;
    let maxD = monthlyDailyData[0];
    monthlyDailyData.forEach((d) => {
      if (d.expense > maxD.expense) maxD = d;
    });
    return maxD.expense > 0 ? maxD : null;
  }, [monthlyDailyData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls: Report Type & Period Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Type Toggle: Monthly vs Yearly */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setReportType('monthly')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              reportType === 'monthly'
                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            월간 리포트
          </button>
          <button
            onClick={() => setReportType('yearly')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              reportType === 'yearly'
                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            연간 리포트
          </button>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {reportType === 'monthly' ? (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                title="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 px-2 py-1 outline-hidden cursor-pointer"
              >
                {availableMonths
                  .filter((m) => m !== 'all')
                  .map((m) => {
                    const [y, mon] = m.split('-');
                    return (
                      <option key={m} value={m}>
                        {y}년 {parseInt(mon, 10)}월
                      </option>
                    );
                  })}
              </select>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                title="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 px-3 py-1 outline-hidden cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}년 연간 결산
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards: Income, Expense, Net Balance, Savings Rate */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Income */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold text-slate-500">총 수입</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            +{totalIncome.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 ml-1">원</span>
          </div>
        </div>

        {/* Expense */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold text-slate-500">총 지출</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            -{totalExpense.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 ml-1">원</span>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold text-slate-500">당기 잔액</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-xl font-black tracking-tight ${
              netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}
            {netBalance.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 ml-1">원</span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold text-slate-500">저축/잉여율</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-600 tracking-tight">
            {totalIncome > 0 ? `${savingsRate}%` : '-'}
            <span className="text-xs font-medium text-slate-400 ml-1.5">
              {savingsRate >= 30 ? '우수' : savingsRate > 0 ? '양호' : '적자 주의'}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Financial Insights Banner */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 rounded-2xl p-4 text-xs flex items-start gap-3">
        <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-950 text-sm">가계부 스마트 인사이트</h4>
          <p className="text-slate-600 leading-relaxed">
            {highestExpenseCategory ? (
              <>
                가장 큰 지출 비중은{' '}
                <strong className="text-indigo-900 font-bold">
                  [{highestExpenseCategory.category}]
                </strong>
                (
                <span className="text-rose-600 font-semibold">
                  {highestExpenseCategory.amount.toLocaleString()}원
                </span>
                , {Math.round(highestExpenseCategory.percentage)}%)입니다.{' '}
              </>
            ) : (
              '지출 내역이 충분하지 않습니다. '
            )}
            {reportType === 'monthly' && highestExpenseDay && (
              <>
                이번 달 지출이 가장 많았던 날은{' '}
                <strong className="text-indigo-900">{highestExpenseDay.day}일</strong>(
                {highestExpenseDay.expense.toLocaleString()}원)입니다.
              </>
            )}
            {reportType === 'yearly' && (
              <>
                연간 총 {annualMonthlyData.filter((d) => d.expense > 0).length}개월 동안 평균 월 지출액은 약{' '}
                <strong className="text-indigo-900">
                  {Math.round(totalExpense / 12).toLocaleString()}원
                </strong>
                입니다.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Category Expense Donut Chart */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              지출 카테고리별 비중
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              총 {categoryExpenses.length}개 분야
            </span>
          </div>

          {categoryExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[260px]">
              <PieChartIcon className="w-10 h-10 mb-2 stroke-1 opacity-50" />
              <p className="text-xs">해당 기간의 지출 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 my-auto pt-2">
              {/* Interactive SVG Donut */}
              <div className="relative w-48 h-48 shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs">
                  {donutSlices.map((slice) => {
                    const isHovered = hoveredSlice === slice.category;
                    return (
                      <path
                        key={slice.category}
                        d={slice.pathData}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-200 cursor-pointer"
                        style={{
                          transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                          transformOrigin: '100px 100px',
                          filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.category)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {hoveredSlice ? (
                    (() => {
                      const item = categoryExpenses.find((c) => c.category === hoveredSlice);
                      return item ? (
                        <>
                          <span className="text-[11px] font-bold text-slate-500 truncate max-w-[90px]">
                            {item.category}
                          </span>
                          <span className="text-sm font-black text-slate-900 leading-tight">
                            {Math.round(item.percentage)}%
                          </span>
                          <span className="text-[10px] text-rose-600 font-semibold">
                            {item.amount.toLocaleString()}원
                          </span>
                        </>
                      ) : null;
                    })()
                  ) : (
                    <>
                      <span className="text-[11px] font-semibold text-slate-400">총 지출</span>
                      <span className="text-xs font-black text-slate-800">
                        {totalExpense > 100000000
                          ? `${(totalExpense / 100000000).toFixed(1)}억`
                          : totalExpense > 10000
                          ? `${Math.round(totalExpense / 10000).toLocaleString()}만`
                          : totalExpense.toLocaleString()}
                        원
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Category Legend list */}
              <div className="w-full flex-1 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {categoryExpenses.map((cat) => {
                  const isHovered = hoveredSlice === cat.category;
                  return (
                    <div
                      key={cat.category}
                      onMouseEnter={() => setHoveredSlice(cat.category)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isHovered ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold text-slate-700 truncate">{cat.category}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900">
                          {cat.amount.toLocaleString()}원
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5">
                          ({Math.round(cat.percentage)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Bar Chart: Monthly Daily Trend OR Annual 12-Month Comparison */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              {reportType === 'monthly'
                ? '일자별 지출 추이 (1일 ~ 31일)'
                : '12개월 월별 수입 vs 지출 비교'}
            </h3>
            {reportType === 'yearly' && (
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> 수입
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> 지출
                </span>
              </div>
            )}
          </div>

          {reportType === 'monthly' ? (
            /* Monthly View: Daily Bars */
            <div className="flex-1 flex flex-col justify-end min-h-[220px]">
              <div className="h-44 w-full flex items-end gap-1 pt-6 pb-2 px-1 border-b border-slate-200">
                {monthlyDailyData.map((d) => {
                  const heightPercent =
                    maxDailyExpense > 0 ? Math.min(100, (d.expense / maxDailyExpense) * 100) : 0;
                  return (
                    <div
                      key={d.day}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {d.day}일: {d.expense.toLocaleString()}원
                      </div>

                      {/* Bar */}
                      <div
                        className="w-full rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${Math.max(d.expense > 0 ? 6 : 0, heightPercent)}%`,
                          backgroundColor:
                            d.expense > 0
                              ? d.expense === maxDailyExpense
                                ? '#f43f5e'
                                : '#fb7185'
                              : '#f1f5f9',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Day Labels (Every 5 days) */}
              <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 px-1">
                <span>1일</span>
                <span>5일</span>
                <span>10일</span>
                <span>15일</span>
                <span>20일</span>
                <span>25일</span>
                <span>{monthlyDailyData.length}일</span>
              </div>
            </div>
          ) : (
            /* Annual View: 12-Month Dual Bars */
            <div className="flex-1 flex flex-col justify-end min-h-[220px]">
              <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-slate-200">
                {annualMonthlyData.map((d) => {
                  const incomeHeight =
                    maxAnnualVal > 0 ? Math.min(100, (d.income / maxAnnualVal) * 100) : 0;
                  const expenseHeight =
                    maxAnnualVal > 0 ? Math.min(100, (d.expense / maxAnnualVal) * 100) : 0;

                  return (
                    <div
                      key={d.month}
                      className="flex-1 h-full flex items-end justify-center gap-0.5 sm:gap-1 group relative cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg space-y-0.5 text-center">
                        <div className="font-bold border-b border-slate-700 pb-0.5">{d.month}</div>
                        <div className="text-blue-300">수입: +{d.income.toLocaleString()}원</div>
                        <div className="text-rose-300">지출: -{d.expense.toLocaleString()}원</div>
                      </div>

                      {/* Income Bar */}
                      <div
                        className="w-1/2 bg-blue-500 group-hover:bg-blue-600 rounded-t-xs transition-all"
                        style={{
                          height: `${Math.max(d.income > 0 ? 4 : 0, incomeHeight)}%`,
                        }}
                      />

                      {/* Expense Bar */}
                      <div
                        className="w-1/2 bg-rose-500 group-hover:bg-rose-600 rounded-t-xs transition-all"
                        style={{
                          height: `${Math.max(d.expense > 0 ? 4 : 0, expenseHeight)}%`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Month Labels 1월 ~ 12월 */}
              <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 font-medium px-0.5">
                {annualMonthlyData.map((d) => (
                  <span key={d.month}>{d.month.replace('월', '')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Family Member Spending Share & Contribution */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            가족 구성원별 재정 기여도
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {reportType === 'monthly' ? selectedMonth : `${selectedYear}년`} 집계
          </span>
        </div>

        {memberExpenses.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">등록된 가족 내역이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberExpenses.map((m) => {
              const expShare = totalExpense > 0 ? Math.round((m.expense / totalExpense) * 100) : 0;
              const incShare = totalIncome > 0 ? Math.round((m.income / totalIncome) * 100) : 0;

              return (
                <div
                  key={m.name}
                  className="bg-slate-50 border border-slate-200/70 p-4 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {m.photo ? (
                        <img
                          src={m.photo}
                          alt={m.name}
                          className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                          {m.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800">{m.name}</p>
                        <p className="text-[11px] text-slate-400">
                          지출 비중: <span className="font-bold text-rose-600">{expShare}%</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <p className="text-rose-600 font-extrabold">-{m.expense.toLocaleString()}원</p>
                      {m.income > 0 && (
                        <p className="text-blue-600 font-semibold text-[11px]">
                          +{m.income.toLocaleString()}원
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar of spending */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${expShare}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
