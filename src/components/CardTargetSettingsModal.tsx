import React, { useState, useEffect } from 'react';
import { PAYMENT_METHODS } from '../types';
import { X, CreditCard, Check, Settings } from 'lucide-react';

interface CardTargetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTargets: Record<string, number>;
  onSaveTargets: (newTargets: Record<string, number>) => Promise<void>;
  isSaving: boolean;
}

export const CardTargetSettingsModal: React.FC<CardTargetSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTargets,
  onSaveTargets,
  isSaving,
}) => {
  // Only cards (excluding '현금')
  const availableCards = PAYMENT_METHODS.filter((m) => m !== '현금' && m !== '기타');

  const [targetsInput, setTargetsInput] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const init: Record<string, string> = {};
      availableCards.forEach((card) => {
        const val = currentTargets[card] ?? 300000;
        init[card] = val.toLocaleString();
      });
      setTargetsInput(init);
    }
  }, [isOpen, currentTargets]);

  if (!isOpen) return null;

  const handleInputChange = (card: string, val: string) => {
    const raw = val.replace(/\D/g, '');
    if (!raw) {
      setTargetsInput((prev) => ({ ...prev, [card]: '0' }));
      return;
    }
    const num = parseInt(raw, 10);
    if (num <= 1000000000) {
      setTargetsInput((prev) => ({ ...prev, [card]: num.toLocaleString() }));
    }
  };

  const handleQuickAdd = (card: string, amount: number) => {
    const current = parseInt((targetsInput[card] || '0').replace(/,/g, ''), 10) || 0;
    const next = current + amount;
    setTargetsInput((prev) => ({ ...prev, [card]: next.toLocaleString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed: Record<string, number> = {};
    Object.entries(targetsInput).forEach(([card, valStr]) => {
      parsed[card] = parseInt(valStr.replace(/,/g, ''), 10) || 0;
    });

    await onSaveTargets(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                카드별 실적 목표 금액 설정
              </h3>
              <p className="text-[11px] text-slate-500">
                각 카드의 월 실적 충족 기준 금액을 설정하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            {availableCards.map((card) => {
              const isCheckCard = card === '체크카드';
              const currentValStr = targetsInput[card] || '0';
              return (
                <div
                  key={card}
                  className={`p-3 border rounded-xl space-y-2 ${
                    isCheckCard
                      ? 'bg-teal-50/40 border-teal-200'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className={`w-3.5 h-3.5 ${isCheckCard ? 'text-teal-600' : 'text-indigo-600'}`} />
                      {card}
                      {isCheckCard && (
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-md font-bold border border-teal-200">
                          실적 무관 (체크)
                        </span>
                      )}
                    </span>
                    {!isCheckCard && (
                      <span className="text-[11px] text-indigo-600 font-semibold">
                        {parseInt(currentValStr.replace(/,/g, ''), 10) > 0
                          ? `${(parseInt(currentValStr.replace(/,/g, ''), 10) / 10000).toLocaleString()}만 원`
                          : '0원'}
                      </span>
                    )}
                  </div>

                  {isCheckCard ? (
                    <div className="p-2.5 bg-teal-100/60 rounded-lg text-[11px] text-teal-900 font-medium">
                      💡 체크카드는 전월 실적 조건이 없어 카드 요약의 실적 달성률(%) 및 프로그레스 바 대상에서 자동으로 제외됩니다.
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={currentValStr}
                          onChange={(e) => handleInputChange(card, e.target.value)}
                          placeholder="300,000"
                          className="w-full px-3 py-2 pr-8 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          원
                        </span>
                      </div>

                      {/* Quick Add Pills */}
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                        <span className="text-slate-400">빠른 추가:</span>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(card, 100000)}
                          className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-600"
                        >
                          +10만
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(card, 300000)}
                          className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-600"
                        >
                          +30만
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetsInput((prev) => ({ ...prev, [card]: '0' }))}
                          className="px-2 py-0.5 text-slate-400 hover:text-slate-600 ml-auto"
                        >
                          초기화
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>설정 저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
