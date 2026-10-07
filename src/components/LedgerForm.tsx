import React, { useState, useEffect } from 'react';
import { TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, LedgerItem } from '../types';
import { PlusCircle, Check, X, Calendar as CalendarIcon, Tag, FileText, CreditCard } from 'lucide-react';

interface LedgerFormProps {
  editingItem: LedgerItem | null;
  onSave: (data: {
    id?: string;
    date: string;
    amount: number;
    category: string;
    memo: string;
    type: TransactionType;
    paymentMethod?: string;
    installmentMonths?: number;
    usedPoints?: number;
  }) => Promise<void>;
  onCancelEdit: () => void;
  isSaving: boolean;
  tamnaPointsWife?: number;
  tamnaPointsHusband?: number;
  tamnaCashWife?: number;
  tamnaCashHusband?: number;
  tamnaLimitWife?: number;
  tamnaLimitHusband?: number;
  currentMonthSpentWife?: number;
  currentMonthSpentHusband?: number;
}

export const LedgerForm: React.FC<LedgerFormProps> = ({
  editingItem,
  onSave,
  onCancelEdit,
  isSaving,
  tamnaPointsWife = 0,
  tamnaPointsHusband = 0,
  tamnaCashWife = 0,
  tamnaCashHusband = 0,
  tamnaLimitWife = 700000,
  tamnaLimitHusband = 700000,
  currentMonthSpentWife = 0,
  currentMonthSpentHusband = 0,
}) => {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState<string>(getTodayDate());
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [installmentMonths, setInstallmentMonths] = useState<number>(3);
  const [usedPointsStr, setUsedPointsStr] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync editing item
  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type);
      setDate(editingItem.date);
      setAmountStr(editingItem.amount.toLocaleString());
      setCategory(editingItem.category);
      setPaymentMethod(editingItem.paymentMethod || PAYMENT_METHODS[0]);
      setIsInstallment(false);
      setUsedPointsStr(editingItem.usedPoints ? editingItem.usedPoints.toLocaleString() : '');
      setMemo(editingItem.memo);
      setErrorMessage(null);
    } else {
      resetForm();
    }
  }, [editingItem]);

  // When type changes, ensure valid category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'expense') {
      if (!EXPENSE_CATEGORIES.includes(category as any)) {
        setCategory(EXPENSE_CATEGORIES[0]);
      }
    } else {
      if (!INCOME_CATEGORIES.includes(category as any)) {
        setCategory(INCOME_CATEGORIES[0]);
      }
    }
  };

  const resetForm = () => {
    setDate(getTodayDate());
    setAmountStr('');
    setType('expense');
    setCategory(EXPENSE_CATEGORIES[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setIsInstallment(false);
    setInstallmentMonths(3);
    setUsedPointsStr('');
    setMemo('');
    setErrorMessage(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setAmountStr('');
      return;
    }
    const num = parseInt(rawDigits, 10);
    // Upper bound protection: 100 billion KRW
    if (num > 100000000000) return;
    setAmountStr(num.toLocaleString());
  };

  const isTamnaWife = paymentMethod === '탐나는전(아내)';
  const isTamnaHusband = paymentMethod === '탐나는전(남편)';
  const isTamna = isTamnaWife || isTamnaHusband;

  const currentTamnaPoints = isTamnaWife ? tamnaPointsWife : isTamnaHusband ? tamnaPointsHusband : 0;
  const currentTamnaCash = isTamnaWife ? tamnaCashWife : isTamnaHusband ? tamnaCashHusband : 0;
  const currentTamnaSpent = isTamnaWife ? currentMonthSpentWife : isTamnaHusband ? currentMonthSpentHusband : 0;
  const currentTamnaLimit = isTamnaWife ? (tamnaLimitWife || 700000) : (tamnaLimitHusband || 700000);

  const handleUsedPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setUsedPointsStr('');
      return;
    }
    const num = parseInt(rawDigits, 10);
    const currentTotal = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
    // Cap at total expense amount and available points for selected owner
    let maxLimit = currentTotal > 0 ? currentTotal : 100000000;
    if (currentTamnaPoints > 0 && !editingItem) {
      maxLimit = Math.min(maxLimit, currentTamnaPoints);
    }
    const safeVal = Math.min(num, maxLimit);
    setUsedPointsStr(safeVal.toLocaleString());
  };

  const handleUseAllPoints = () => {
    const currentTotal = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
    if (currentTamnaPoints > 0) {
      const toUse = currentTotal > 0 ? Math.min(currentTamnaPoints, currentTotal) : currentTamnaPoints;
      setUsedPointsStr(toUse.toLocaleString());
    }
  };

  const addAmount = (addVal: number) => {
    const current = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
    const next = current + addVal;
    if (next <= 100000000000) {
      setAmountStr(next.toLocaleString());
    }
  };

  // Format Korean text preview for currency (e.g. 50,000 -> 5만 원)
  const getKoreanAmountText = (valStr: string) => {
    const num = parseInt(valStr.replace(/,/g, ''), 10);
    if (!num) return '';

    const eok = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    const won = num % 10000;

    const parts = [];
    if (eok > 0) parts.push(`${eok}억`);
    if (man > 0) parts.push(`${man.toLocaleString()}만`);
    if (won > 0) parts.push(`${won.toLocaleString()}`);

    return `${parts.join(' ')} 원`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericAmount = parseInt(amountStr.replace(/,/g, ''), 10);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('0원보다 큰 금액을 입력해주세요.');
      return;
    }

    if (!date) {
      setErrorMessage('날짜를 입력해주세요.');
      return;
    }

    if (!memo.trim()) {
      setErrorMessage('내용(메모)을 입력해주세요.');
      return;
    }

    const numericPoints = parseInt(usedPointsStr.replace(/,/g, ''), 10) || 0;
    if (type === 'expense' && isTamna) {
      const ownerName = isTamnaWife ? '아내' : '남편';

      // 1. 적립금 사용 금액이 총 결제 금액을 초과하는지 검증
      if (numericPoints > numericAmount) {
        setErrorMessage('적립금 사용 금액은 총 결제 금액을 초과할 수 없습니다.');
        return;
      }

      // 2. 보유 적립금 잔액 검증 (독립 분리)
      if (!editingItem && numericPoints > currentTamnaPoints) {
        setErrorMessage(
          `${ownerName}의 보유 적립금(${currentTamnaPoints.toLocaleString()}원)을 초과하여 사용할 수 없습니다.`
        );
        return;
      }

      // 3. 실제 결제 원금 = (총 지출 금액 - 적립금 사용 금액)
      const realCashNeeded = numericAmount - numericPoints;

      // 4. 충전 원금 잔액 검증 (독립 분리)
      if (!editingItem && realCashNeeded > currentTamnaCash) {
        setErrorMessage(
          `충전 원금 잔액이 부족합니다. 먼저 충전해 주세요. (${ownerName} 현재 충전 원금: ${currentTamnaCash.toLocaleString()}원, 결제 필요 원금: ${realCashNeeded.toLocaleString()}원)`
        );
        return;
      }
    }

    try {
      await onSave({
        id: editingItem?.id,
        date,
        amount: numericAmount,
        category,
        memo: memo.trim(),
        type,
        paymentMethod: type === 'expense' ? paymentMethod : undefined,
        installmentMonths: type === 'expense' && isInstallment && !editingItem ? installmentMonths : undefined,
        usedPoints: type === 'expense' && isTamna && numericPoints > 0 ? numericPoints : undefined,
      });

      if (!editingItem) {
        // Reset only amount, points and memo to make sequential entries fast
        setAmountStr('');
        setUsedPointsStr('');
        setMemo('');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8 transition-all">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-3.5 text-center text-sm font-bold transition-all relative ${
            type === 'expense'
              ? 'text-rose-600 bg-white border-t-2 border-rose-500 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          지출 내역 작성
          {type === 'expense' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`flex-1 py-3.5 text-center text-sm font-bold transition-all relative ${
            type === 'income'
              ? 'text-blue-600 bg-white border-t-2 border-blue-500 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          수입 내역 작성
          {type === 'income' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {/* Editing alert banner */}
      {editingItem && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <span className="font-medium">
            기존 내역을 수정하고 있습니다. (작성자: {editingItem.userName})
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex items-center gap-1 font-bold text-amber-900 hover:text-amber-700 underline"
          >
            <X className="w-3.5 h-3.5" /> 취소
          </button>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                날짜
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDate())}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split('T')[0]);
                  }}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                >
                  어제
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden bg-slate-50/50"
              required
            />
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                금액 (원)
              </label>
              {amountStr && (
                <span className="text-[11px] font-semibold text-indigo-600">
                  {getKoreanAmountText(amountStr)}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountStr}
                onChange={handleAmountChange}
                className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">
                원
              </span>
            </div>

            {/* Quick amount increment pills */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {[10000, 50000, 100000, 500000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => addAmount(quick)}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium transition-colors"
                >
                  +{quick >= 10000 ? `${quick / 10000}만` : quick}
                </button>
              ))}
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="text-[11px] px-2 py-0.5 text-slate-400 hover:text-slate-600 transition-colors ml-auto"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`grid gap-4 ${type === 'expense' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              분류 카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method (for expenses) */}
          {type === 'expense' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                결제 수단
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden bg-white"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Memo / Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              내용 (메모)
            </label>
            <input
              type="text"
              placeholder={
                type === 'expense'
                  ? '예: 이마트 장보기, 학원비, 주유 등'
                  : '예: 10월 급여, 주식 배당금, 부수입'
              }
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={200}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden"
              required
            />
          </div>
        </div>

        {/* Tamna Jeon points usage & 10% cashback guide (shown for '탐나는전(아내)' or '탐나는전(남편)') */}
        {type === 'expense' && isTamna && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-amber-200/60">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                🍊 {paymentMethod} 잔액 현황
              </span>
              <div className="flex items-center gap-2.5 text-[11px] font-semibold">
                <span className="text-amber-950">
                  충전 원금: <strong className="font-black text-amber-900">{currentTamnaCash.toLocaleString()}원</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-800">
                  적립금: <strong className="font-black text-amber-700">{currentTamnaPoints.toLocaleString()}P</strong>
                </span>
              </div>
            </div>

            {/* Points input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-amber-900">
                  적립금 사용 금액
                </label>
                <span className="text-[10px] text-amber-800">
                  (사용 시 충전 원금 결제액이 줄어듭니다)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0 (적립금 사용 금액)"
                    value={usedPointsStr}
                    onChange={handleUsedPointsChange}
                    className="w-full px-3 py-2 pr-8 text-sm font-bold bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    원
                  </span>
                </div>
                {currentTamnaPoints > 0 && (
                  <button
                    type="button"
                    onClick={handleUseAllPoints}
                    className="px-3 py-2 text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    전액 사용
                  </button>
                )}
              </div>
            </div>

            {/* Real-time 10% Cash Back Calculation & Cash Balance Adequacy Guide */}
            {(() => {
              const numAmt = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
              const usedPts = parseInt(usedPointsStr.replace(/,/g, ''), 10) || 0;
              const cashNeeded = Math.max(0, numAmt - usedPts);
              const remainingBefore = Math.max(0, currentTamnaLimit - currentTamnaSpent);
              const eligibleThis = Math.min(cashNeeded, remainingBefore);
              const expectedCashback = Math.floor(eligibleThis * 0.1);
              const owner = isTamnaWife ? '아내' : '남편';
              const isPointsShort = usedPts > currentTamnaPoints;
              const isCashShort = cashNeeded > currentTamnaCash;

              return numAmt > 0 ? (
                <div className="p-2.5 bg-amber-100/70 border border-amber-200/80 rounded-lg text-[11px] space-y-1.5">
                  {/* Points Shortage Warning */}
                  {isPointsShort && (
                    <div className="bg-rose-50 border border-rose-300 text-rose-700 p-2 rounded-md font-bold text-[11px]">
                      ⚠️ 보유 적립금 부족! ({owner} 보유 적립금: {currentTamnaPoints.toLocaleString()}원 / 입력 사용액: {usedPts.toLocaleString()}원)
                    </div>
                  )}

                  {/* Cash Shortage Warning */}
                  {isCashShort && (
                    <div className="bg-rose-50 border border-rose-300 text-rose-700 p-2 rounded-md font-bold text-[11px]">
                      ⚠️ 충전 원금 잔액 부족! ({owner} 충전 원금: {currentTamnaCash.toLocaleString()}원 / 실제 결제 필요 원금: {cashNeeded.toLocaleString()}원)
                      <div className="text-[10px] font-normal text-rose-600 mt-0.5">
                        {(cashNeeded - currentTamnaCash).toLocaleString()}원이 부족합니다. 상단 실적 요약에서 [💰 충전하기]를 먼저 진행해 주세요.
                      </div>
                    </div>
                  )}

                  {/* 10% cashback info (실제 결제 원금 기준) */}
                  {remainingBefore <= 0 ? (
                    <p className="text-amber-900 font-medium">
                      ⚠️ {owner}의 이번 달 10% 적립 한도({currentTamnaLimit.toLocaleString()}원)를 이미 모두 달성하여 추가 적립금은 발생하지 않습니다. (당월 누적 {currentTamnaSpent.toLocaleString()}원)
                    </p>
                  ) : cashNeeded <= remainingBefore ? (
                    <p className="text-amber-900 font-medium">
                      💡 실제 결제 원금({cashNeeded.toLocaleString()}원)에 대해 <strong className="font-bold text-amber-950">+{expectedCashback.toLocaleString()}원(10%)</strong> 적립 예정 ({owner} 당월 한도 {currentTamnaLimit.toLocaleString()}원 중 누적 {(currentTamnaSpent + cashNeeded).toLocaleString()}원)
                    </p>
                  ) : (
                    <p className="text-amber-900 font-medium">
                      💡 한도 내 {remainingBefore.toLocaleString()}원에 대해 <strong className="font-bold text-amber-950">+{expectedCashback.toLocaleString()}원(10%)</strong> 적립 예정 ({owner} 당월 {currentTamnaLimit.toLocaleString()}원 한도 소진, 초과분 {(cashNeeded - remainingBefore).toLocaleString()}원은 일반 결제)
                    </p>
                  )}

                  {/* Cash vs Points breakdown */}
                  <div className="flex flex-wrap items-center justify-between text-amber-950 font-semibold border-t border-amber-200/80 pt-1">
                    <span>
                      결제 원금: <strong>{cashNeeded.toLocaleString()}원</strong>
                      {usedPts > 0 && <span className="font-normal text-amber-800"> (적립금 {usedPts.toLocaleString()}원 사용)</span>}
                    </span>
                    {!isCashShort && (
                      <span className="text-emerald-700 font-bold">
                        (원금 잔액: {(currentTamnaCash - cashNeeded).toLocaleString()}원 / 적립금 잔액: {(Math.max(0, currentTamnaPoints - usedPts) + expectedCashback).toLocaleString()}원)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-amber-800 flex items-center justify-between">
                  <span>{isTamnaWife ? '아내' : '남편'} 당월 누적 사용액: {currentTamnaSpent.toLocaleString()}원 / 한도 {currentTamnaLimit.toLocaleString()}원</span>
                  <span>(남은 적립 한도: {remainingBefore.toLocaleString()}원)</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Installment options (when recording new expense) */}
        {type === 'expense' && !editingItem && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                결제 방식
              </span>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsInstallment(false)}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    !isInstallment
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  일시불
                </button>
                <button
                  type="button"
                  onClick={() => setIsInstallment(true)}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    isInstallment
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  할부 결제
                </button>
              </div>
            </div>

            {isInstallment && (
              <div className="pt-2 border-t border-slate-200/70 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    할부 개월 수 (2~24개월)
                  </label>
                  <select
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(Number(e.target.value))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 bg-white outline-hidden cursor-pointer"
                  >
                    {Array.from({ length: 23 }, (_, i) => i + 2).map((m) => (
                      <option key={m} value={m}>
                        {m}개월 할부
                      </option>
                    ))}
                  </select>
                </div>

                {amountStr && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/80 p-2 rounded-lg font-medium">
                    💡 총 {amountStr}원을 {installmentMonths}개월간 매월 약{' '}
                    <strong className="font-bold">
                      {Math.floor(
                        parseInt(amountStr.replace(/,/g, ''), 10) / installmentMonths
                      ).toLocaleString()}
                      원
                    </strong>
                    씩 분할하여 매달 장부에 자동 등록합니다. (단수 차액은 첫 달에 자동 포함)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 ${
              type === 'expense'
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                저장 중...
              </span>
            ) : editingItem ? (
              <>
                <Check className="w-5 h-5" />
                수정 완료하기
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" />
                {type === 'expense' ? '지출 내역 저장하기' : '수입 내역 저장하기'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
