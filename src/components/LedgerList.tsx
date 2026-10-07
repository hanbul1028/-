import React, { useState, useMemo } from 'react';
import { LedgerItem, TransactionType } from '../types';
import { Search, Edit2, Trash2, Filter, ArrowUpRight, ArrowDownRight, User as UserIcon } from 'lucide-react';

interface LedgerListProps {
  items: LedgerItem[];
  onEdit: (item: LedgerItem) => void;
  onDelete: (id: string, installmentId?: string, deleteWholePlan?: boolean) => void;
  currentUserId?: string;
}

export const LedgerList: React.FC<LedgerListProps> = ({
  items,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<LedgerItem | null>(null);

  // Extract all distinct categories and authors present in items
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [items]);

  const availableAuthors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.userName));
    return Array.from(set);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (filterType !== 'all' && item.type !== filterType) return false;
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      // Author filter
      if (selectedAuthor !== 'all' && item.userName !== selectedAuthor) return false;
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchMemo = item.memo.toLowerCase().includes(query);
        const matchCategory = item.category.toLowerCase().includes(query);
        const matchAuthor = item.userName.toLowerCase().includes(query);
        if (!matchMemo && !matchCategory && !matchAuthor) return false;
      }
      return true;
    });
  }, [items, filterType, selectedCategory, selectedAuthor, searchTerm]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, LedgerItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    return groups;
  }, [filteredItems]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  }, [groupedByDate]);

  // Format date with Korean day of week
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[date.getDay()];
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(month, 10)}월 ${parseInt(day, 10)}일 (${dayOfWeek})`;
  };

  const getCategoryColor = (category: string, type: TransactionType) => {
    if (type === 'income') return 'bg-blue-50 text-blue-700 border-blue-200';
    switch (category) {
      case '식비':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '교육비':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case '교통/유류비':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case '주거/통신':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '쇼핑/생활':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case '투자/저축':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="내용, 카테고리, 작성자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                지우기
              </button>
            )}
          </div>

          {/* Type filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'expense'
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              지출만
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'income'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              수입만
            </button>
          </div>
        </div>

        {/* Category & Author filter pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Filter className="w-3 h-3" /> 필터:
          </span>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">모든 카테고리</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Author filter */}
          {availableAuthors.length > 1 && (
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">모든 작성자</option>
              {availableAuthors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}

          {(selectedCategory !== 'all' || selectedAuthor !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedAuthor('all');
                setSearchTerm('');
              }}
              className="text-indigo-600 hover:underline font-medium ml-auto"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* List content grouped by Date */}
      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">내역이 없습니다</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            조건에 일치하는 내역이 없거나 아직 등록된 가계부 내역이 없습니다. 상단에서 새로운 수입/지출을 기록해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dayItems = groupedByDate[dateStr];
            const dayExpense = dayItems
              .filter((i) => i.type === 'expense')
              .reduce((sum, i) => sum + i.amount, 0);
            const dayIncome = dayItems
              .filter((i) => i.type === 'income')
              .reduce((sum, i) => sum + i.amount, 0);

            return (
              <div key={dateStr} className="space-y-2">
                {/* Date Header with Daily Totals */}
                <div className="flex items-center justify-between px-2 py-1 border-b-2 border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">{formatDateHeader(dateStr)}</span>
                    <span className="text-[11px] text-slate-400 font-medium">({dayItems.length}건)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    {dayIncome > 0 && (
                      <span className="text-blue-600 flex items-center">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{dayIncome.toLocaleString()}원
                      </span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-rose-600 flex items-center">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        -{dayExpense.toLocaleString()}원
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Items */}
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/70 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-3 group"
                    >
                      {/* Left: Category Badge & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold shrink-0 ${getCategoryColor(
                            item.category,
                            item.type
                          )}`}
                        >
                          {item.category}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate leading-snug flex items-center gap-1.5 flex-wrap">
                            <span>{item.memo}</span>
                            {item.installmentCurrent && item.installmentTotal && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                                ({item.installmentCurrent}/{item.installmentTotal}개월)
                              </span>
                            )}
                          </p>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Author avatar */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              {item.userPhoto ? (
                                <img
                                  src={item.userPhoto}
                                  alt={item.userName}
                                  className="w-4 h-4 rounded-full border border-slate-200 object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <UserIcon className="w-3 h-3 text-slate-400" />
                              )}
                              <span className="font-medium text-slate-600">{item.userName}</span>
                            </div>

                            {/* Payment method badge */}
                            {item.paymentMethod && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                                  item.paymentMethod.startsWith('탐나는전')
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                                    : item.paymentMethod === '체크카드'
                                    ? 'bg-teal-50 text-teal-800 border-teal-300 font-bold'
                                    : item.paymentMethod === '현금'
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
                                }`}
                              >
                                <span>{item.paymentMethod.startsWith('탐나는전') ? '🍊' : '💳'} {item.paymentMethod}</span>
                                {item.paymentMethod.startsWith('탐나는전') && item.usedPoints && item.usedPoints > 0 ? (
                                  <span className="bg-amber-200/90 text-amber-950 px-1 py-0.2 rounded text-[9px] font-black">
                                    적립금 {item.usedPoints.toLocaleString()}원 사용
                                  </span>
                                ) : null}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-base font-extrabold tracking-tight ${
                              item.type === 'expense' ? 'text-rose-600' : 'text-blue-600'
                            }`}
                          >
                            {item.type === 'expense' ? '-' : '+'}
                            {item.amount.toLocaleString()}
                            <span className="text-xs font-semibold ml-0.5">원</span>
                          </span>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 sm:opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="수정하기"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="삭제하기"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-bold text-slate-900 mb-2">내역을 삭제하시겠습니까?</h4>
            <p className="text-xs text-slate-500 mb-3">
              [{itemToDelete.category}] {itemToDelete.memo} ({itemToDelete.amount.toLocaleString()}원)
            </p>

            {itemToDelete.installmentId && (
              <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs mb-4">
                <strong>할부 결제 내역 안내</strong>
                <p className="text-[11px] text-purple-700 mt-1">
                  이 내역은 총 {itemToDelete.installmentTotal}개월 할부 중{' '}
                  {itemToDelete.installmentCurrent}회차 내역입니다.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>

              {itemToDelete.installmentId ? (
                <>
                  <button
                    onClick={() => {
                      onDelete(itemToDelete.id, undefined, false);
                      setItemToDelete(null);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    이 회차만 삭제
                  </button>
                  <button
                    onClick={() => {
                      onDelete(itemToDelete.id, itemToDelete.installmentId, true);
                      setItemToDelete(null);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    전체 회차 삭제
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onDelete(itemToDelete.id);
                    setItemToDelete(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  삭제하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
