import React, { useState } from 'react';
import { LedgerItem, DEFAULT_CARD_TARGETS, PAYMENT_METHODS } from '../types';
import { CreditCard, CheckCircle2, Sparkles, Settings, Edit3, X, Check, Wallet, Coins, PlusCircle } from 'lucide-react';

interface CardPerformanceSummaryProps {
  items: LedgerItem[];
  selectedMonth: string;
  cardTargets: Record<string, number>;
  onOpenSettings: () => void;
  tamnaPointsWife: number;
  tamnaPointsHusband: number;
  tamnaCashWife: number;
  tamnaCashHusband: number;
  tamnaLimitWife?: number;
  tamnaLimitHusband?: number;
  onUpdateTamnaPoints: (person: 'wife' | 'husband', newPoints: number) => Promise<void>;
  onRechargeTamnaCash: (person: 'wife' | 'husband', amount: number) => Promise<void>;
  onUpdateTamnaLimit: (person: 'wife' | 'husband', newLimit: number) => Promise<void>;
}

export const CardPerformanceSummary: React.FC<CardPerformanceSummaryProps> = ({
  items,
  selectedMonth,
  cardTargets,
  onOpenSettings,
  tamnaPointsWife,
  tamnaPointsHusband,
  tamnaCashWife,
  tamnaCashHusband,
  tamnaLimitWife = 700000,
  tamnaLimitHusband = 700000,
  onUpdateTamnaPoints,
  onRechargeTamnaCash,
  onUpdateTamnaLimit,
}) => {
  // Aggregate card spending for the month (excluding '현금' and legacy '탐나는전')
  const cardTotals: Record<string, number> = {};

  // Modal state for editing Tamna Jeon points
  const [pointModalPerson, setPointModalPerson] = useState<'wife' | 'husband' | null>(null);
  const [pointInputStr, setPointInputStr] = useState('');
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  // Modal state for recharging Tamna Jeon cash
  const [rechargeModalPerson, setRechargeModalPerson] = useState<'wife' | 'husband' | null>(null);
  const [rechargeInputStr, setRechargeInputStr] = useState('100,000');
  const [isRecharging, setIsRecharging] = useState(false);

  // Modal state for modifying Tamna Jeon monthly limit
  const [limitModalPerson, setLimitModalPerson] = useState<'wife' | 'husband' | null>(null);
  const [limitInputStr, setLimitInputStr] = useState('700,000');
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Initialize from targets or default targets, explicitly removing legacy '탐나는전'
  const activeTargets: Record<string, number> = { ...DEFAULT_CARD_TARGETS, ...cardTargets };
  delete activeTargets['탐나는전'];

  // Initialize cardTotals only for valid cards in PAYMENT_METHODS (excluding '현금', '기타')
  PAYMENT_METHODS.forEach((cardName) => {
    if (cardName !== '현금' && cardName !== '기타') {
      cardTotals[cardName] = 0;
    }
  });

  items
    .filter((i) => i.type === 'expense')
    .forEach((item) => {
      const method = item.paymentMethod || '현금';
      if (
        method !== '현금' &&
        method !== '기타' &&
        cardTotals[method] !== undefined
      ) {
        // 탐나는전은 실제 결제 원금(총 지출 - 사용 적립금) 기준으로 10% 적립 실적 산정
        const spentToAdd = method.startsWith('탐나는전')
          ? Math.max(0, item.amount - (item.usedPoints || 0))
          : item.amount;
        cardTotals[method] = (cardTotals[method] || 0) + spentToAdd;
      }
    });

  // Sort: Tamna cards first, then credit cards by spending, check card at bottom (strictly exclude legacy '탐나는전')
  const cardEntries = Object.entries(cardTotals)
    .filter(([cardName]) => cardName !== '탐나는전' && cardName !== '현금' && cardName !== '기타')
    .sort((a, b) => {
      const isATamna = a[0].startsWith('탐나는전');
      const isBTamna = b[0].startsWith('탐나는전');
      if (isATamna && !isBTamna) return -1;
      if (!isATamna && isBTamna) return 1;
      if (a[0] === '체크카드') return 1;
      if (b[0] === '체크카드') return -1;
      return b[1] - a[1];
    });

  // Overall total card spending
  const totalCardSpending = cardEntries.reduce((sum, [, v]) => sum + v, 0);

  const handleOpenPointModal = (person: 'wife' | 'husband') => {
    setPointModalPerson(person);
    const currentPoints = person === 'wife' ? tamnaPointsWife : tamnaPointsHusband;
    setPointInputStr(currentPoints.toLocaleString());
  };

  const handlePointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointModalPerson) return;
    setIsSavingPoints(true);
    const num = parseInt(pointInputStr.replace(/,/g, ''), 10) || 0;
    try {
      await onUpdateTamnaPoints(pointModalPerson, Math.max(0, num));
      setPointModalPerson(null);
    } finally {
      setIsSavingPoints(false);
    }
  };

  const handleOpenRechargeModal = (person: 'wife' | 'husband') => {
    setRechargeModalPerson(person);
    setRechargeInputStr('100,000');
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeModalPerson) return;
    const num = parseInt(rechargeInputStr.replace(/,/g, ''), 10) || 0;
    if (num <= 0) return;
    setIsRecharging(true);
    try {
      await onRechargeTamnaCash(rechargeModalPerson, num);
      setRechargeModalPerson(null);
    } finally {
      setIsRecharging(false);
    }
  };

  const handleOpenLimitModal = (person: 'wife' | 'husband') => {
    setLimitModalPerson(person);
    const curLimit = person === 'wife' ? (tamnaLimitWife || 700000) : (tamnaLimitHusband || 700000);
    setLimitInputStr(curLimit.toLocaleString());
  };

  const handleLimitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitModalPerson) return;
    const num = parseInt(limitInputStr.replace(/,/g, ''), 10) || 0;
    if (num <= 0) return;
    setIsSavingLimit(true);
    try {
      await onUpdateTamnaLimit(limitModalPerson, num);
      setLimitModalPerson(null);
    } finally {
      setIsSavingLimit(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                이번 달 카드 실적 요약
              </h3>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="카드별 실적 목표 금액 설정"
              >
                <Settings className="w-3 h-3" />
                <span>목표 금액 설정</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              카드별 누적 사용 금액, 탐나는전 10% 적립 한도(각 70만 원) 및 실적 달성 현황
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] text-slate-400 block font-medium">총 카드 사용액</span>
          <span className="text-sm font-black text-indigo-600">
            {totalCardSpending.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {cardEntries.map(([cardName, spent]) => {
          const isCheckCard = cardName === '체크카드';
          const isTamnaWife = cardName === '탐나는전(아내)';
          const isTamnaHusband = cardName === '탐나는전(남편)';
          const isTamna = isTamnaWife || isTamnaHusband;

          // 1. 체크카드 (실적 바 제외)
          if (isCheckCard) {
            return (
              <div
                key={cardName}
                className="p-3.5 rounded-xl border border-teal-200/80 bg-teal-50/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        💳 체크카드
                      </span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md border border-teal-200">
                        실적 무관
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500">
                      직불 결제
                    </div>
                  </div>

                  {/* Amount info */}
                  <div className="flex items-baseline justify-between text-xs mb-2">
                    <span className="font-extrabold text-teal-900 text-sm">
                      {spent.toLocaleString()}원
                    </span>
                    <span className="text-[11px] text-teal-700/80 font-medium">
                      당월 누적 사용액
                    </span>
                  </div>
                </div>

                {/* Status footer message */}
                <div className="pt-2 border-t border-teal-100 text-[11px] text-teal-700 font-medium">
                  체크카드는 전월 실적 조건이 적용되지 않는 직불카드입니다.
                </div>
              </div>
            );
          }

          // 2. 탐나는전 (아내 / 남편 10% 적립 한도 동적 계산)
          if (isTamna) {
            const currentPoints = isTamnaWife ? tamnaPointsWife : tamnaPointsHusband;
            const personKey = isTamnaWife ? 'wife' : 'husband';
            const tamnaLimit = isTamnaWife ? (tamnaLimitWife || 700000) : (tamnaLimitHusband || 700000);
            const maxCashback = Math.floor(tamnaLimit * 0.1);
            const eligibleSpending = Math.min(spent, tamnaLimit);
            const earnedCashback = Math.floor(eligibleSpending * 0.1);
            const remainingLimit = Math.max(0, tamnaLimit - spent);
            const percentage = Math.min(100, Math.round((spent / tamnaLimit) * 100));
            const isLimitFull = spent >= tamnaLimit;

            return (
              <div
                key={cardName}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between bg-amber-50/50 ${
                  isLimitFull ? 'border-amber-300' : 'border-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        🍊 {cardName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenLimitModal(personKey)}
                        className="flex items-center gap-0.5 text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                        title="월 10% 적립 한도 금액 수정"
                      >
                        <Settings className="w-2.5 h-2.5" />
                        <span>한도 설정</span>
                      </button>
                      {isLimitFull ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-200/90 px-1.5 py-0.5 rounded-md border border-amber-300">
                          <CheckCircle2 className="w-3 h-3 text-amber-700" />
                          한도 달성 ({maxCashback >= 10000 ? `${Math.floor(maxCashback / 10000)}만P` : `${maxCashback}P`})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                          10% 적립
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-black text-amber-900">
                      {percentage}%
                    </div>
                  </div>

                  {/* Spending & Cashback info */}
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-extrabold text-amber-950">
                      {spent.toLocaleString()}원{' '}
                      <span className="text-[11px] font-normal text-amber-800">
                        / 한도 {tamnaLimit.toLocaleString()}원
                      </span>
                    </span>
                    <span className="text-[11px] font-black text-amber-800">
                      적립: +{earnedCashback.toLocaleString()}P
                      <span className="text-[10px] font-normal text-amber-700 ml-1">
                        (최대 {maxCashback.toLocaleString()}P)
                      </span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLimitFull
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Status footer message */}
                  <div className="text-[11px] text-right">
                    {isLimitFull ? (
                      <span className="text-amber-800 font-bold flex items-center justify-end gap-1">
                        <Sparkles className="w-3 h-3" />
                        이번 달 {tamnaLimit.toLocaleString()}원 한도(최대 {maxCashback.toLocaleString()}P) 전액 적립 완료!
                      </span>
                    ) : (
                      <span className="text-amber-900 font-medium">
                        <strong className="text-amber-950 font-bold">{remainingLimit.toLocaleString()}원</strong> 더 쓰면 10% 적립 (최대 {maxCashback.toLocaleString()}원)
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual Tamna Jeon cash balance, points balance & recharge button */}
                <div className="mt-3 pt-2.5 border-t border-amber-200/80 bg-amber-100/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl space-y-2">
                  {/* Row 1: 충전 원금 잔액 & [💰 충전하기] 버튼 */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-700" />
                      <span className="text-[11px] font-bold text-amber-950">
                        {isTamnaWife ? '아내' : '남편'} 충전 원금:
                      </span>
                      <span className="text-xs font-black text-amber-950">
                        {(isTamnaWife ? tamnaCashWife : tamnaCashHusband).toLocaleString()}원
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRechargeModal(personKey)}
                      className="flex items-center gap-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-xs"
                      title="탐나는전 충전금 충전하기"
                    >
                      <span>💰 충전하기</span>
                    </button>
                  </div>

                  {/* Row 2: 적립금 잔액 & [✏️ 적립금 수정] */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-200/60 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-800" />
                      <span className="text-[11px] font-semibold text-amber-900">
                        적립금 잔액:
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        {currentPoints.toLocaleString()}P
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPointModal(personKey)}
                      className="flex items-center gap-0.5 text-[10px] font-bold text-amber-800 hover:text-amber-950 hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>적립금 수정</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // 3. 일반 신용카드 실적 바
          const target = activeTargets[cardName] ?? 300000;
          const hasTarget = target > 0;
          const percentage = hasTarget ? Math.min(100, Math.round((spent / target) * 100)) : 0;
          const isAchieved = hasTarget && spent >= target;
          const remaining = Math.max(0, target - spent);

          return (
            <div
              key={cardName}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isAchieved
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      💳 {cardName}
                    </span>
                    {isAchieved && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        실적 달성
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-black text-slate-900">
                    {hasTarget ? `${percentage}%` : '목표 미설정'}
                  </div>
                </div>

                {/* Amount info */}
                <div className="flex items-baseline justify-between text-xs mb-2">
                  <span className="font-extrabold text-indigo-900">
                    {spent.toLocaleString()}원
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {hasTarget ? `목표 ${target.toLocaleString()}원` : '목표 금액 없음'}
                  </span>
                </div>

                {/* Progress bar */}
                {hasTarget ? (
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAchieved
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full bg-slate-100 h-1 rounded-full mb-1.5" />
                )}

                {/* Status footer message */}
                <div className="text-[11px] text-right">
                  {hasTarget ? (
                    isAchieved ? (
                      <span className="text-emerald-700 font-semibold flex items-center justify-end gap-1">
                        <Sparkles className="w-3 h-3" />
                        실적 충족 완료!
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">
                        <strong className="text-slate-700 font-bold">{remaining.toLocaleString()}원</strong> 더 쓰면 실적 충족
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">
                      목표 금액 설정 시 달성률이 표시됩니다.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tamna Jeon points edit modal (wife / husband selectable) */}
      {pointModalPerson && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍊</span>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {pointModalPerson === 'wife' ? '탐나는전(아내)' : '탐나는전(남편)'} 적립금 수정
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPointModalPerson(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePointSubmit} className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  {pointModalPerson === 'wife' ? '아내의' : '남편의'} 총 보유 적립금 (원)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pointInputStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPointInputStr(raw ? parseInt(raw, 10).toLocaleString() : '0');
                    }}
                    className="w-full px-3 py-2.5 pr-8 text-base font-bold text-amber-900 bg-amber-50/50 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    원
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  탐나는전 앱에서 확인하신 잔액을 입력하시면 Firestore에 개별 저장됩니다.
                </p>
              </div>

              {/* Quick adjustment pills */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-[11px] text-slate-400">빠른 추가:</span>
                {[5000, 10000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      const cur = parseInt(pointInputStr.replace(/,/g, ''), 10) || 0;
                      setPointInputStr((cur + amt).toLocaleString());
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] cursor-pointer"
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPointModalPerson(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingPoints}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPoints ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>적립금 저장</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tamna Jeon cash recharge modal ([💰 충전하기]) */}
      {rechargeModalPerson && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    탐나는전({rechargeModalPerson === 'wife' ? '아내' : '남편'}) 충전하기
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    현재 충전 원금: {(rechargeModalPerson === 'wife' ? tamnaCashWife : tamnaCashHusband).toLocaleString()}원
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRechargeModalPerson(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRechargeSubmit} className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  충전할 금액 (원)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rechargeInputStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setRechargeInputStr(raw ? parseInt(raw, 10).toLocaleString() : '0');
                    }}
                    className="w-full px-3.5 py-2.5 pr-8 text-base font-bold text-amber-950 bg-amber-50/50 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="100,000"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    원
                  </span>
                </div>
                {/* Result preview */}
                {(() => {
                  const rechargeAmt = parseInt(rechargeInputStr.replace(/,/g, ''), 10) || 0;
                  const curCash = rechargeModalPerson === 'wife' ? tamnaCashWife : tamnaCashHusband;
                  return (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg text-[11px] text-amber-900 font-medium">
                      충전 후 예상 충전 잔액: <strong className="font-bold text-amber-950">{(curCash + rechargeAmt).toLocaleString()}원</strong>
                    </div>
                  );
                })()}
              </div>

              {/* Quick recharge pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <span className="text-[11px] text-slate-400">빠른 선택:</span>
                {[50000, 100000, 200000, 300000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setRechargeInputStr(amt.toLocaleString());
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] cursor-pointer"
                  >
                    +{amt >= 10000 ? `${amt / 10000}만` : amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRechargeModalPerson(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isRecharging}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isRecharging ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>충전 완료</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tamna Jeon monthly limit setting modal ([⚙️ 한도 설정]) */}
      {limitModalPerson && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  ⚙️
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    탐나는전({limitModalPerson === 'wife' ? '아내' : '남편'}) 월 적립 한도 설정
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    현재 한도: {(limitModalPerson === 'wife' ? (tamnaLimitWife || 700000) : (tamnaLimitHusband || 700000)).toLocaleString()}원
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLimitModalPerson(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLimitSubmit} className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  이번 달 적립 한도 금액 (원)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={limitInputStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setLimitInputStr(raw ? parseInt(raw, 10).toLocaleString() : '0');
                    }}
                    className="w-full px-3.5 py-2.5 pr-8 text-base font-bold text-amber-950 bg-amber-50/50 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="700,000"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    원
                  </span>
                </div>

                {/* Preview maximum points */}
                {(() => {
                  const limitVal = parseInt(limitInputStr.replace(/,/g, ''), 10) || 0;
                  const maxCashback = Math.floor(limitVal * 0.1);
                  return (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 space-y-0.5">
                      <div className="font-bold text-amber-950 flex items-center justify-between">
                        <span>최대 10% 적립금:</span>
                        <span className="text-amber-800 font-black">+{maxCashback.toLocaleString()}P</span>
                      </div>
                      <p className="text-[10px] text-amber-700">
                        당월 실제 결제 원금이 {limitVal.toLocaleString()}원에 도달할 때까지 10% 적립금이 발생합니다.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Quick limit preset pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <span className="text-[11px] text-slate-400">빠른 선택:</span>
                {[500000, 700000, 1000000, 1500000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setLimitInputStr(amt.toLocaleString());
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] cursor-pointer"
                  >
                    {amt >= 10000 ? `${amt / 10000}만` : amt.toLocaleString()}{amt === 700000 ? '(기본)' : ''}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLimitModalPerson(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingLimit}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingLimit ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>한도 저장</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
