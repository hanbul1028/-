import React, { useState } from 'react';
import { FixedExpense, EXPENSE_CATEGORIES } from '../types';
import { X, Plus, Trash2, Edit2, Calendar, Tag, DollarSign, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface FixedExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedExpenses: FixedExpense[];
  onSaveFixedExpense: (item: {
    id?: string;
    name: string;
    amount: number;
    category: string;
    paymentDay: number;
    memo?: string;
  }) => Promise<void>;
  onDeleteFixedExpense: (id: string) => Promise<void>;
  onImportFixedExpenses: () => Promise<number>;
  currentMonth: string; // YYYY-MM
  isImporting: boolean;
}

export const FixedExpensesModal: React.FC<FixedExpensesModalProps> = ({
  isOpen,
  onClose,
  fixedExpenses,
  onSaveFixedExpense,
  onDeleteFixedExpense,
  onImportFixedExpenses,
  currentMonth,
  isImporting,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [paymentDay, setPaymentDay] = useState<number>(1);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEditClick = (item: FixedExpense) => {
    setEditingId(item.id);
    setName(item.name);
    setAmountStr(item.amount.toLocaleString());
    setCategory(item.category);
    setPaymentDay(item.paymentDay);
    setMemo(item.memo || '');
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setAmountStr('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setPaymentDay(1);
    setMemo('');
    setErrorMessage(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setAmountStr('');
      return;
    }
    const num = parseInt(raw, 10);
    if (num <= 100000000000) {
      setAmountStr(num.toLocaleString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericAmount = parseInt(amountStr.replace(/,/g, ''), 10);
    if (!name.trim()) {
      setErrorMessage('항목명을 입력해주세요.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('0원보다 큰 금액을 입력해주세요.');
      return;
    }
    if (paymentDay < 1 || paymentDay > 31) {
      setErrorMessage('결제일은 1일에서 31일 사이여야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveFixedExpense({
        id: editingId || undefined,
        name: name.trim(),
        amount: numericAmount,
        category,
        paymentDay,
        memo: memo.trim() || undefined,
      });
      handleCancelEdit();
    } catch (err) {
      console.error(err);
      setErrorMessage('고정비 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    setImportResult(null);
    try {
      const count = await onImportFixedExpenses();
      if (count > 0) {
        setImportResult(`이번 달(${currentMonth}) 고정비 ${count}건이 지출 장부에 등록되었습니다!`);
      } else {
        setImportResult(`이번 달 고정비 항목이 이미 모두 등록되어 있어 추가된 항목이 없습니다.`);
      }
    } catch (err) {
      console.error(err);
      setImportResult('고정비 등록 중 오류가 발생했습니다.');
    }
  };

  const totalMonthlyFixed = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              매월 고정비 관리
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              보험료, 관리비, 구독료 등 매월 정기적으로 지출되는 항목을 관리합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Banner: Import this month's fixed expenses */}
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-xs font-bold text-indigo-950">
              이번 달 ({currentMonth}) 고정비 일괄 등록
            </p>
            <p className="text-[11px] text-slate-600">
              중복 방지 알고리즘이 적용되어 이미 등록된 항목은 건너뛰고 누락된 항목만 안전하게 지출 장부에 추가합니다.
            </p>
          </div>
          <button
            onClick={handleImport}
            disabled={isImporting || fixedExpenses.length === 0}
            className="w-full sm:w-auto shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isImporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>이번 달 고정비 불러오기</span>
          </button>
        </div>

        {importResult && (
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importResult}</span>
          </div>
        )}

        {/* Modal Body: Scrollable area */}
        <div className="flex-1 overflow-y-auto space-y-5 pt-4 pr-1">
          {/* Form to add or edit fixed expense */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-slate-700">
              {editingId ? '고정비 항목 수정' : '새로운 고정비 항목 추가'}
            </h4>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  항목명 (예: 아파트 관리비, 넷플릭스)
                </label>
                <input
                  type="text"
                  placeholder="예: 실손보험료"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">금액 (원)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountStr}
                  onChange={handleAmountChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  매월 결제일 (1~31일)
                </label>
                <select
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      매월 {d}일
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">메모 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 자동이체 국민은행"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  취소
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingId ? '수정 완료' : '고정비 등록'}</span>
              </button>
            </div>
          </form>

          {/* Fixed expenses list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                등록된 고정비 목록 ({fixedExpenses.length}건)
              </span>
              <span className="text-xs font-bold text-rose-600">
                월 고정비 합계: -{totalMonthlyFixed.toLocaleString()}원
              </span>
            </div>

            {fixedExpenses.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                아직 등록된 고정비가 없습니다. 위 입력창에서 정기 지출 항목을 추가해보세요.
              </div>
            ) : (
              <div className="space-y-2">
                {fixedExpenses.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                        매월 {item.paymentDay}일
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-slate-800 truncate">
                            {item.name}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-sm">
                            {item.category}
                          </span>
                        </div>
                        {item.memo && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.memo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-black text-rose-600">
                        -{item.amount.toLocaleString()}원
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteFixedExpense(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
