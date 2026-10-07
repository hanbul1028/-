export type TransactionType = 'expense' | 'income';

export interface LedgerItem {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  memo: string;
  type: TransactionType;
  userName: string;
  userPhoto?: string;
  uid: string;
  createdAt: string; // ISO string
  updatedAt?: string;
  paymentMethod?: string;
  installmentId?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  usedPoints?: number;
}

export interface NewLedgerPayload {
  date: string;
  amount: number;
  category: string;
  memo: string;
  type: TransactionType;
  userName: string;
  userPhoto?: string;
  uid: string;
  createdAt: string;
  paymentMethod?: string;
  installmentId?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  usedPoints?: number;
}

export interface UpdateLedgerPayload {
  date: string;
  amount: number;
  category: string;
  memo: string;
  type: TransactionType;
  userName: string;
  userPhoto?: string;
  updatedAt: string;
  paymentMethod?: string;
  installmentId?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  usedPoints?: number;
}

export interface WalletBalance {
  balance: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  paymentDay: number; // 1-31
  memo?: string;
  userName: string;
  uid: string;
  createdAt: string;
  updatedAt?: string;
}

export const EXPENSE_CATEGORIES = [
  '식비',
  '교육비',
  '교통/유류비',
  '주거/통신',
  '쇼핑/생활',
  '투자/저축',
  '보험료',
  '공과금/세금',
  '의료/건강',
  '문화/여가',
  '경조사/회비',
  '기타'
] as const;

export const INCOME_CATEGORIES = [
  '급여',
  '부수입',
  '상여금',
  '금융/투자수익',
  '용돈/선물',
  '기타'
] as const;

// 결제 수단 목록 (필요에 따라 카드 이름을 쉽게 추가/수정하실 수 있습니다)
export const PAYMENT_METHODS = [
  '신한카드',
  '국민카드',
  '현대카드',
  '삼성카드',
  '체크카드',
  '탐나는전(아내)',
  '탐나는전(남편)',
  '현금',
  '기타'
] as const;

// 각 카드별 월 실적 기준 금액 (원) 설정 객체
export const DEFAULT_CARD_TARGETS: Record<string, number> = {
  신한카드: 300000,
  국민카드: 400000,
  현대카드: 300000,
  삼성카드: 500000,
  체크카드: 0,
  '탐나는전(아내)': 700000,
  '탐나는전(남편)': 700000,
};
