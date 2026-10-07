import React, { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { auth, db, googleProvider, testConnection, handleFirestoreError, OperationType } from './firebase';
import { LedgerItem, TransactionType, FixedExpense, DEFAULT_CARD_TARGETS } from './types';
import { Header } from './components/Header';
import { SummaryCard } from './components/SummaryCard';
import { CardPerformanceSummary } from './components/CardPerformanceSummary';
import { CardTargetSettingsModal } from './components/CardTargetSettingsModal';
import { LedgerForm } from './components/LedgerForm';
import { LedgerList } from './components/LedgerList';
import { ReportsView } from './components/ReportsView';
import { FixedExpensesModal } from './components/FixedExpensesModal';
import { AuthScreen } from './components/AuthScreen';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [cardTargets, setCardTargets] = useState<Record<string, number>>(DEFAULT_CARD_TARGETS);
  const [tamnaPointsWife, setTamnaPointsWife] = useState<number>(0);
  const [tamnaPointsHusband, setTamnaPointsHusband] = useState<number>(0);
  const [tamnaCashWife, setTamnaCashWife] = useState<number>(0);
  const [tamnaCashHusband, setTamnaCashHusband] = useState<number>(0);
  const [tamnaLimitWife, setTamnaLimitWife] = useState<number>(700000);
  const [tamnaLimitHusband, setTamnaLimitHusband] = useState<number>(700000);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isImportingFixed, setIsImportingFixed] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [editingItem, setEditingItem] = useState<LedgerItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [currentView, setCurrentView] = useState<'ledger' | 'reports'>('ledger');

  // Compute current month formatted as YYYY-MM (e.g. "2026-10")
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Connection test & auth state watcher
  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore sync when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setItems([]);
      return;
    }

    const ledgerRef = collection(db, 'ledger');

    const unsubscribe = onSnapshot(
      ledgerRef,
      (snapshot) => {
        const loaded: LedgerItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            date: data.date,
            amount: Number(data.amount) || 0,
            category: data.category || '기타',
            memo: data.memo || '',
            type: (data.type === 'income' ? 'income' : 'expense') as TransactionType,
            userName: data.userName || '가족',
            userPhoto: data.userPhoto,
            uid: data.uid || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            paymentMethod: data.paymentMethod,
            installmentId: data.installmentId,
            installmentCurrent: data.installmentCurrent,
            installmentTotal: data.installmentTotal,
            usedPoints: typeof data.usedPoints === 'number' ? data.usedPoints : undefined,
          });
        });

        // Sort descending by date, then by createdAt
        loaded.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        setItems(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'ledger');
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Real-time Firestore sync for fixed_expenses
  useEffect(() => {
    if (!currentUser) {
      setFixedExpenses([]);
      return;
    }

    const fixedRef = collection(db, 'fixed_expenses');
    const unsubscribe = onSnapshot(
      fixedRef,
      (snapshot) => {
        const list: FixedExpense[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name,
            amount: Number(data.amount) || 0,
            category: data.category || '기타',
            paymentDay: Number(data.paymentDay) || 1,
            memo: data.memo || '',
            userName: data.userName || '가족',
            uid: data.uid || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
          });
        });
        list.sort((a, b) => a.paymentDay - b.paymentDay);
        setFixedExpenses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'fixed_expenses');
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 4. Real-time Firestore sync for card target settings
  useEffect(() => {
    if (!currentUser) return;

    const docRef = doc(db, 'card_settings', 'default');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.targets && typeof data.targets === 'object') {
            const cleanedTargets = { ...data.targets };
            if ('탐나는전' in cleanedTargets) {
              delete cleanedTargets['탐나는전'];
              setDoc(docRef, { targets: cleanedTargets }, { merge: true }).catch(() => {});
            }
            setCardTargets(cleanedTargets);
          }
        }
      },
      (error) => {
        console.warn('Card settings notice:', error.message);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 5. Real-time Firestore sync for Tamna Jeon wallet balances (wife & husband: points & cash)
  useEffect(() => {
    if (!currentUser) {
      setTamnaPointsWife(0);
      setTamnaPointsHusband(0);
      setTamnaCashWife(0);
      setTamnaCashHusband(0);
      return;
    }

    const wifePointsRef = doc(db, 'wallet_balances', 'tamnaneun_points_wife');
    const unsubWifePoints = onSnapshot(
      wifePointsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.balance === 'number') {
            setTamnaPointsWife(data.balance);
          }
        }
      },
      (error) => {
        console.warn('Tamna Jeon wife points wallet notice:', error.message);
      }
    );

    const husbandPointsRef = doc(db, 'wallet_balances', 'tamnaneun_points_husband');
    const unsubHusbandPoints = onSnapshot(
      husbandPointsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.balance === 'number') {
            setTamnaPointsHusband(data.balance);
          }
        }
      },
      (error) => {
        console.warn('Tamna Jeon husband points wallet notice:', error.message);
      }
    );

    const wifeCashRef = doc(db, 'wallet_balances', 'tamnaneun_cash_wife');
    const unsubWifeCash = onSnapshot(
      wifeCashRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.balance === 'number') {
            setTamnaCashWife(data.balance);
          }
        }
      },
      (error) => {
        console.warn('Tamna Jeon wife cash wallet notice:', error.message);
      }
    );

    const husbandCashRef = doc(db, 'wallet_balances', 'tamnaneun_cash_husband');
    const unsubHusbandCash = onSnapshot(
      husbandCashRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.balance === 'number') {
            setTamnaCashHusband(data.balance);
          }
        }
      },
      (error) => {
        console.warn('Tamna Jeon husband cash wallet notice:', error.message);
      }
    );

    const wifeLimitRef = doc(db, 'wallet_balances', 'tamnaneun_limit_wife');
    const unsubWifeLimit = onSnapshot(
      wifeLimitRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.balance === 'number' && data.balance > 0) {
            setTamnaLimitWife(data.balance);
          }
        }
      },
      (error) => {
        console.warn('Tamna Jeon wife limit notice:', error.message);
      }
    );

    const husbandLimitRef = doc(db, 'wallet_balances', 'tamnaneun_limit_husband');
    const unsubHusbandLimit = onSnapshot(
      husbandLimitRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.balance === 'number' && data.balance > 0) {
            setTamnaLimitHusband(data.balance);
          }
        }
      },
      (error) => {
        console.warn('Tamna Jeon husband limit notice:', error.message);
      }
    );

    return () => {
      unsubWifePoints();
      unsubHusbandPoints();
      unsubWifeCash();
      unsubHusbandCash();
      unsubWifeLimit();
      unsubHusbandLimit();
    };
  }, [currentUser]);

  const handleSaveTamnaLimit = async (person: 'wife' | 'husband', newLimit: number) => {
    if (!currentUser) return;
    const docId = person === 'wife' ? 'tamnaneun_limit_wife' : 'tamnaneun_limit_husband';
    const label = person === 'wife' ? '아내' : '남편';
    try {
      const limitRef = doc(db, 'wallet_balances', docId);
      await setDoc(
        limitRef,
        {
          balance: newLimit,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.displayName || '가족 구성원',
        },
        { merge: true }
      );
      if (person === 'wife') {
        setTamnaLimitWife(newLimit);
      } else {
        setTamnaLimitHusband(newLimit);
      }
      showToast(`탐나는전(${label}) 월 적립 한도가 ${newLimit.toLocaleString()}원으로 변경되었습니다.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `wallet_balances/${docId}`);
    }
  };

  const handleSaveTamnaPoints = async (person: 'wife' | 'husband', newBalance: number) => {
    if (!currentUser) return;
    const docId = person === 'wife' ? 'tamnaneun_points_wife' : 'tamnaneun_points_husband';
    const label = person === 'wife' ? '아내' : '남편';
    try {
      const walletRef = doc(db, 'wallet_balances', docId);
      await setDoc(
        walletRef,
        {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.displayName || '가족 구성원',
        },
        { merge: true }
      );
      if (person === 'wife') {
        setTamnaPointsWife(newBalance);
      } else {
        setTamnaPointsHusband(newBalance);
      }
      showToast(`탐나는전(${label}) 보유 적립금이 ${newBalance.toLocaleString()}원으로 수정되었습니다.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `wallet_balances/${docId}`);
    }
  };

  const handleRechargeTamnaCash = async (person: 'wife' | 'husband', amount: number) => {
    if (!currentUser) return;
    const docId = person === 'wife' ? 'tamnaneun_cash_wife' : 'tamnaneun_cash_husband';
    const label = person === 'wife' ? '아내' : '남편';
    const currentCash = person === 'wife' ? tamnaCashWife : tamnaCashHusband;
    const newBalance = currentCash + amount;
    try {
      const walletRef = doc(db, 'wallet_balances', docId);
      await setDoc(
        walletRef,
        {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.displayName || '가족 구성원',
        },
        { merge: true }
      );
      if (person === 'wife') {
        setTamnaCashWife(newBalance);
      } else {
        setTamnaCashHusband(newBalance);
      }
      showToast(`탐나는전(${label}) 충전 완료: +${amount.toLocaleString()}원 (현재 잔액: ${newBalance.toLocaleString()}원)`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `wallet_balances/${docId}`);
    }
  };

  const handleSaveCardTargets = async (newTargets: Record<string, number>) => {
    if (!currentUser) return;
    setIsSavingTargets(true);
    const cleanedTargets = { ...newTargets };
    delete cleanedTargets['탐나는전'];
    try {
      const docRef = doc(db, 'card_settings', 'default');
      await setDoc(
        docRef,
        {
          targets: cleanedTargets,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.displayName || '가족 구성원',
        },
        { merge: true }
      );
      setCardTargets(cleanedTargets);
      showToast('카드 실적 목표 금액이 성공적으로 저장되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'card_settings/default');
    } finally {
      setIsSavingTargets(false);
    }
  };

  // Handlers for fixed expenses
  const handleSaveFixedExpense = async (data: {
    id?: string;
    name: string;
    amount: number;
    category: string;
    paymentDay: number;
    memo?: string;
  }) => {
    if (!currentUser) return;
    if (data.id) {
      const docRef = doc(db, 'fixed_expenses', data.id);
      const payload: Record<string, any> = {
        name: data.name,
        amount: data.amount,
        category: data.category,
        paymentDay: data.paymentDay,
        memo: data.memo || '',
        userName: currentUser.displayName || '가족 구성원',
        updatedAt: new Date().toISOString(),
      };
      try {
        await updateDoc(docRef, payload);
        showToast('고정비 항목이 수정되었습니다.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `fixed_expenses/${data.id}`);
      }
    } else {
      const payload: Record<string, any> = {
        name: data.name,
        amount: data.amount,
        category: data.category,
        paymentDay: data.paymentDay,
        memo: data.memo || '',
        userName: currentUser.displayName || '가족 구성원',
        uid: currentUser.uid,
        createdAt: new Date().toISOString(),
      };
      try {
        await addDoc(collection(db, 'fixed_expenses'), payload);
        showToast('새로운 고정비 항목이 등록되었습니다.');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'fixed_expenses');
      }
    }
  };

  const handleDeleteFixedExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fixed_expenses', id));
      showToast('고정비 항목이 삭제되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fixed_expenses/${id}`);
    }
  };

  // Import this month's fixed expenses with bulletproof duplicate prevention
  const handleImportFixedExpenses = async (): Promise<number> => {
    if (!currentUser || fixedExpenses.length === 0) return 0;
    setIsImportingFixed(true);

    let addedCount = 0;
    try {
      const targetMonth = selectedMonth === 'all' ? currentMonthStr : selectedMonth;
      const [yearStr, monthStr] = targetMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const daysInTargetMonth = new Date(y, m, 0).getDate();

      // Existing expense records for this month
      const currentMonthLedgerExpenses = items.filter(
        (i) => i.date.startsWith(targetMonth) && i.type === 'expense'
      );

      for (const fixed of fixedExpenses) {
        // Safe payment day
        const safeDay = Math.min(fixed.paymentDay, daysInTargetMonth);
        const targetDate = `${targetMonth}-${String(safeDay).padStart(2, '0')}`;

        // Duplicate prevention logic
        const alreadyExists = currentMonthLedgerExpenses.some((existing) => {
          const matchName =
            existing.memo.includes(fixed.name) ||
            existing.memo.includes(`[고정비] ${fixed.name}`) ||
            existing.memo.toLowerCase() === fixed.name.toLowerCase();
          const matchCategory = existing.category === fixed.category;
          const matchAmount = existing.amount === fixed.amount;

          return matchName && (matchCategory || matchAmount);
        });

        if (!alreadyExists) {
          const payload: Record<string, any> = {
            date: targetDate,
            amount: fixed.amount,
            category: fixed.category,
            memo: `[고정비] ${fixed.name}${fixed.memo ? ` (${fixed.memo})` : ''}`,
            type: 'expense',
            userName: currentUser.displayName || '가족 구성원',
            uid: currentUser.uid,
            createdAt: new Date().toISOString(),
          };

          if (currentUser.photoURL) {
            payload.userPhoto = currentUser.photoURL;
          }

          try {
            await addDoc(collection(db, 'ledger'), payload);
            addedCount++;
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'ledger');
          }
        }
      }

      if (addedCount > 0) {
        showToast(`고정비 ${addedCount}건이 지출 내역에 등록되었습니다.`);
      }
      return addedCount;
    } finally {
      setIsImportingFixed(false);
    }
  };

  // Determine available months from data + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthStr);
    items.forEach((item) => {
      if (item.date && item.date.length >= 7) {
        monthsSet.add(item.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [items, currentMonthStr]);

  // Filter items by selected month
  const monthFilteredItems = useMemo(() => {
    if (selectedMonth === 'all') return items;
    return items.filter((item) => item.date.startsWith(selectedMonth));
  }, [items, selectedMonth]);

  // Current month's spending on Tamna Jeon (wife & husband) - 실제 결제 원금 기준
  const currentMonthSpentWife = useMemo(() => {
    return monthFilteredItems
      .filter((i) => i.type === 'expense' && i.paymentMethod === '탐나는전(아내)')
      .reduce((sum, i) => sum + Math.max(0, i.amount - (i.usedPoints || 0)), 0);
  }, [monthFilteredItems]);

  const currentMonthSpentHusband = useMemo(() => {
    return monthFilteredItems
      .filter((i) => i.type === 'expense' && i.paymentMethod === '탐나는전(남편)')
      .reduce((sum, i) => sum + Math.max(0, i.amount - (i.usedPoints || 0)), 0);
  }, [monthFilteredItems]);

  // Handlers
  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSaveItem = async (data: {
    id?: string;
    date: string;
    amount: number;
    category: string;
    memo: string;
    type: TransactionType;
    paymentMethod?: string;
    installmentMonths?: number;
    usedPoints?: number;
  }) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      if (data.id) {
        // Update existing record
        const docRef = doc(db, 'ledger', data.id);
        const updatePayload: Record<string, any> = {
          date: data.date,
          amount: data.amount,
          category: data.category,
          memo: data.memo,
          type: data.type,
          userName: currentUser.displayName || '가족 구성원',
          updatedAt: new Date().toISOString(),
        };

        if (data.paymentMethod) {
          updatePayload.paymentMethod = data.paymentMethod;
        }

        if (data.usedPoints !== undefined) {
          updatePayload.usedPoints = data.usedPoints;
        }

        if (currentUser.photoURL) {
          updatePayload.userPhoto = currentUser.photoURL;
        }

        try {
          await updateDoc(docRef, updatePayload);
          setEditingItem(null);
          showToast('내역이 성공적으로 수정되었습니다.');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `ledger/${data.id}`);
        }
      } else if (data.installmentMonths && data.installmentMonths >= 2 && data.type === 'expense') {
        // Split into monthly installment documents
        const totalAmount = data.amount;
        const months = data.installmentMonths;
        const baseMonthly = Math.floor(totalAmount / months);
        const remainder = totalAmount - (baseMonthly * months);
        const installmentId = 'inst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const [yearStr, monthStr, dayStr] = data.date.split('-');
        const startYear = parseInt(yearStr, 10);
        const startMonth = parseInt(monthStr, 10); // 1-12
        const startDay = parseInt(dayStr, 10);

        for (let i = 0; i < months; i++) {
          const monthAmount = (i === 0) ? baseMonthly + remainder : baseMonthly;
          const curMonthIndex = startMonth - 1 + i;
          const targetY = startYear + Math.floor(curMonthIndex / 12);
          const targetM = (curMonthIndex % 12) + 1;
          const daysInTargetMonth = new Date(targetY, targetM, 0).getDate();
          const safeDay = Math.min(startDay, daysInTargetMonth);
          const targetDate = `${targetY}-${String(targetM).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

          const payload: Record<string, any> = {
            date: targetDate,
            amount: monthAmount,
            category: data.category,
            memo: data.memo,
            type: data.type,
            userName: currentUser.displayName || '가족 구성원',
            uid: currentUser.uid,
            createdAt: new Date().toISOString(),
            installmentId,
            installmentCurrent: i + 1,
            installmentTotal: months,
          };

          if (data.paymentMethod) {
            payload.paymentMethod = data.paymentMethod;
          }
          if (currentUser.photoURL) {
            payload.userPhoto = currentUser.photoURL;
          }

          try {
            await addDoc(collection(db, 'ledger'), payload);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'ledger');
          }
        }
        showToast(`${months}개월 할부 내역이 매월 날짜에 맞춰 일괄 등록되었습니다.`);
      } else {
        // Create standard single record
        const nowIso = new Date().toISOString();
        const createPayload: Record<string, any> = {
          date: data.date,
          amount: data.amount,
          category: data.category,
          memo: data.memo,
          type: data.type,
          userName: currentUser.displayName || '가족 구성원',
          uid: currentUser.uid,
          createdAt: nowIso,
        };

        if (data.paymentMethod) {
          createPayload.paymentMethod = data.paymentMethod;
        }

        if (data.usedPoints && data.usedPoints > 0) {
          createPayload.usedPoints = data.usedPoints;
        }

        if (currentUser.photoURL) {
          createPayload.userPhoto = currentUser.photoURL;
        }

        try {
          const isTamnaWife = data.paymentMethod === '탐나는전(아내)';
          const isTamnaHusband = data.paymentMethod === '탐나는전(남편)';

          if (data.type === 'expense' && (isTamnaWife || isTamnaHusband)) {
            const label = isTamnaWife ? '아내' : '남편';
            const usedPoints = data.usedPoints || 0;
            const realCashAmount = Math.max(0, data.amount - usedPoints);

            // 1. 월 적립 한도 체크 (설정된 동적 한도 및 실제 결제 원금 기준 당월 누적)
            const targetMonth = data.date.slice(0, 7);
            const currentMonthSpentRealCash = items
              .filter(
                (i) =>
                  i.type === 'expense' &&
                  i.paymentMethod === data.paymentMethod &&
                  i.date.startsWith(targetMonth)
              )
              .reduce(
                (sum, i) => sum + Math.max(0, i.amount - (i.usedPoints || 0)),
                0
              );

            const currentLimit = isTamnaWife ? (tamnaLimitWife || 700000) : (tamnaLimitHusband || 700000);
            const remainingLimit = Math.max(0, currentLimit - currentMonthSpentRealCash);
            const eligibleForCashback = Math.min(realCashAmount, remainingLimit);
            const earnedCashback = Math.floor(eligibleForCashback * 0.1);

            const cashDocId = isTamnaWife ? 'tamnaneun_cash_wife' : 'tamnaneun_cash_husband';
            const pointsDocId = isTamnaWife ? 'tamnaneun_points_wife' : 'tamnaneun_points_husband';
            const cashRef = doc(db, 'wallet_balances', cashDocId);
            const pointsRef = doc(db, 'wallet_balances', pointsDocId);
            const newLedgerDocRef = doc(collection(db, 'ledger'));

            let finalCash = 0;
            let finalPoints = 0;

            await runTransaction(db, async (transaction) => {
              // 1) 트랜잭션 읽기 (Reads)
              const cashSnap = await transaction.get(cashRef);
              const pointsSnap = await transaction.get(pointsRef);

              const dbCash =
                cashSnap.exists() && typeof cashSnap.data()?.balance === 'number'
                  ? cashSnap.data().balance
                  : (isTamnaWife ? tamnaCashWife : tamnaCashHusband);

              const dbPoints =
                pointsSnap.exists() && typeof pointsSnap.data()?.balance === 'number'
                  ? pointsSnap.data().balance
                  : (isTamnaWife ? tamnaPointsWife : tamnaPointsHusband);

              // 2) 잔액 검증
              if (usedPoints > dbPoints) {
                throw new Error(
                  `보유 적립금이 부족합니다. (${label} 현재 보유 적립금: ${dbPoints.toLocaleString()}원, 사용 시도: ${usedPoints.toLocaleString()}원)`
                );
              }
              if (realCashAmount > dbCash) {
                throw new Error(
                  `충전 원금이 부족합니다. (${label} 현재 충전 원금: ${dbCash.toLocaleString()}원, 결제 필요 원금: ${realCashAmount.toLocaleString()}원)`
                );
              }

              // 3) 엄격한 차감 및 적립 공식:
              // - 충전 원금 잔액 = 기존 충전 원금 잔액 - 실제 결제 원금
              // - 보유 적립금 잔액 = 기존 보유 적립금 잔액 - 적립금 사용 금액 + 10% 신규 적립금
              finalCash = Math.max(0, dbCash - realCashAmount);
              finalPoints = Math.max(0, dbPoints - usedPoints) + earnedCashback;
              const nowIso = new Date().toISOString();

              // 4) 트랜잭션 쓰기 (Writes)
              transaction.set(newLedgerDocRef, createPayload);
              transaction.set(
                cashRef,
                {
                  balance: finalCash,
                  updatedAt: nowIso,
                  updatedBy: currentUser.displayName || '가족 구성원',
                },
                { merge: true }
              );
              transaction.set(
                pointsRef,
                {
                  balance: finalPoints,
                  updatedAt: nowIso,
                  updatedBy: currentUser.displayName || '가족 구성원',
                },
                { merge: true }
              );
            });

            // 5) 로컬 상태 동기화
            if (isTamnaWife) {
              setTamnaCashWife(finalCash);
              setTamnaPointsWife(finalPoints);
            } else {
              setTamnaCashHusband(finalCash);
              setTamnaPointsHusband(finalPoints);
            }

            const details: string[] = [];
            details.push(`원금 ${realCashAmount.toLocaleString()}원 결제`);
            if (usedPoints > 0) {
              details.push(`적립금 ${usedPoints.toLocaleString()}원 사용`);
            }
            if (earnedCashback > 0) {
              details.push(`+${earnedCashback.toLocaleString()}원(10%) 적립`);
            }
            showToast(`새로운 내역이 저장되었습니다. (탐나는전 ${label}: ${details.join(', ')})`);
          } else {
            await addDoc(collection(db, 'ledger'), createPayload);
            showToast('새로운 내역이 저장되었습니다.');
          }
        } catch (error: any) {
          if (error?.message && (error.message.includes('부족합니다') || error.message.includes('충전'))) {
            showToast(error.message, 'error');
          } else {
            handleFirestoreError(error, OperationType.CREATE, 'ledger');
          }
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, installmentId?: string, deleteWholePlan?: boolean) => {
    try {
      if (deleteWholePlan && installmentId) {
        const matching = items.filter((i) => i.installmentId === installmentId);
        for (const item of matching) {
          await deleteDoc(doc(db, 'ledger', item.id));
        }
        showToast(`할부 ${matching.length}건이 모두 삭제되었습니다.`);
      } else {
        await deleteDoc(doc(db, 'ledger', id));
        showToast('내역이 삭제되었습니다.');
      }
      if (editingItem?.id === id) {
        setEditingItem(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ledger/${id}`);
    }
  };

  // Export to CSV with Korean UTF-8 BOM
  const handleExportCsv = () => {
    const dataToExport = monthFilteredItems;
    if (dataToExport.length === 0) {
      showToast('내보낼 내역이 없습니다.', 'error');
      return;
    }

    const headers = ['일자', '구분', '카테고리', '내용', '금액(원)', '작성자'];
    const rows = dataToExport.map((i) => [
      i.date,
      i.type === 'expense' ? '지출' : '수입',
      `"${i.category.replace(/"/g, '""')}"`,
      `"${i.memo.replace(/"/g, '""')}"`,
      i.amount,
      `"${i.userName.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `가족가계부_${selectedMonth === 'all' ? '전체' : selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV 파일이 다운로드되었습니다.');
  };

  // Initial auth checking spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">가계부를 불러오는 중...</p>
      </div>
    );
  }

  // Not logged in -> Show welcoming Auth Screen
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} isLoading={authLoading} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16 selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-xs font-bold text-white ${
              toastMessage.type === 'success' ? 'bg-slate-900' : 'bg-rose-600'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main App Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        onExportCsv={handleExportCsv}
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenFixedExpenses={() => setIsFixedModalOpen(true)}
      />

      {/* Fixed Expenses Management Modal */}
      <FixedExpensesModal
        isOpen={isFixedModalOpen}
        onClose={() => setIsFixedModalOpen(false)}
        fixedExpenses={fixedExpenses}
        onSaveFixedExpense={handleSaveFixedExpense}
        onDeleteFixedExpense={handleDeleteFixedExpense}
        onImportFixedExpenses={handleImportFixedExpenses}
        currentMonth={selectedMonth === 'all' ? currentMonthStr : selectedMonth}
        isImporting={isImportingFixed}
      />

      {/* Card Target Settings Modal */}
      <CardTargetSettingsModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        currentTargets={cardTargets}
        onSaveTargets={handleSaveCardTargets}
        isSaving={isSavingTargets}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 sm:pt-8">
        {currentView === 'ledger' ? (
          <>
            {/* Monthly Summary Statistics */}
            <SummaryCard
              items={monthFilteredItems}
              selectedMonth={selectedMonth}
            />

            {/* Monthly Card Performance Summary */}
            <CardPerformanceSummary
              items={monthFilteredItems}
              selectedMonth={selectedMonth}
              cardTargets={cardTargets}
              onOpenSettings={() => setIsCardModalOpen(true)}
              tamnaPointsWife={tamnaPointsWife}
              tamnaPointsHusband={tamnaPointsHusband}
              tamnaCashWife={tamnaCashWife}
              tamnaCashHusband={tamnaCashHusband}
              tamnaLimitWife={tamnaLimitWife}
              tamnaLimitHusband={tamnaLimitHusband}
              onUpdateTamnaPoints={handleSaveTamnaPoints}
              onRechargeTamnaCash={handleRechargeTamnaCash}
              onUpdateTamnaLimit={handleSaveTamnaLimit}
            />

            {/* Input & Edit Form */}
            <LedgerForm
              editingItem={editingItem}
              onSave={handleSaveItem}
              onCancelEdit={() => setEditingItem(null)}
              isSaving={isSaving}
              tamnaPointsWife={tamnaPointsWife}
              tamnaPointsHusband={tamnaPointsHusband}
              tamnaCashWife={tamnaCashWife}
              tamnaCashHusband={tamnaCashHusband}
              tamnaLimitWife={tamnaLimitWife}
              tamnaLimitHusband={tamnaLimitHusband}
              currentMonthSpentWife={currentMonthSpentWife}
              currentMonthSpentHusband={currentMonthSpentHusband}
            />

            {/* Ledger Transactions List */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                  {selectedMonth === 'all'
                    ? '전체 가계부 내역'
                    : `${selectedMonth.split('-')[0]}년 ${parseInt(selectedMonth.split('-')[1], 10)}월 내역`}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  총 {monthFilteredItems.length}건
                </span>
              </div>

              <LedgerList
                items={monthFilteredItems}
                onEdit={(item) => {
                  setEditingItem(item);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                onDelete={handleDeleteItem}
                currentUserId={currentUser.uid}
              />
            </div>
          </>
        ) : (
          /* Reports & Statistical Analytics View */
          <ReportsView items={items} availableMonths={availableMonths} />
        )}
      </main>
    </div>
  );
}
