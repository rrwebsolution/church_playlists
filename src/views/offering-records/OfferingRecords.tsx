import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  BanknoteArrowDown,
  Eye,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type { OfferingEntry, OfferingExpense, OfferingRecord } from '../types';

type OfferingContext = {
  offeringRecords: OfferingRecord[];
  setOfferingRecords: Dispatch<SetStateAction<OfferingRecord[]>>;
};

const CATEGORY_OPTIONS: Array<{ value: OfferingEntry['category']; label: string }> = [
  { value: 'tithe', label: 'Tithe' },
  { value: 'offering', label: 'Offering' },
  { value: 'missions', label: 'Missions' },
  { value: 'building-fund', label: 'Mission Fund' },
  { value: 'special-love-gift', label: 'Love Gift' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_OPTIONS: Array<{ value: NonNullable<OfferingEntry['paymentMethod']>; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

const EXPENSE_CATEGORY_OPTIONS: Array<{ value: NonNullable<OfferingExpense['category']>; label: string }> = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'honorarium', label: 'Honorarium' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'missions', label: 'Missions' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Love Gift' },
  { value: 'other', label: 'Other' },
];

const SERVICE_TYPE_OPTIONS: Array<{ value: NonNullable<OfferingRecord['serviceType']>; label: string }> = [
  { value: 'sunday-service', label: 'Sunday Service' },
  { value: 'prayer-meeting', label: 'Prayer Meeting' },
  { value: 'youth-service', label: 'Youth Service' },
  { value: 'special-event', label: 'Special Event' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getMonthTitle = (dateValue?: string) => {
  const baseDate = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  return safeDate.toLocaleString('en-US', { month: 'long' });
};

const createRecord = (): OfferingRecord => ({
  id: createId(),
  title: getMonthTitle(),
  isTitleEdited: false,
  serviceDate: new Date().toISOString().slice(0, 10),
  serviceType: 'sunday-service',
  countedBy: '',
  witnessBy: '',
  treasuryNotes: '',
  isSaved: false,
  entries: [],
  expenses: [],
  updatedAt: new Date().toISOString(),
});

const duplicateRecord = (record: OfferingRecord): OfferingRecord => ({
  ...record,
  id: createId(),
  title: `${record.title} Copy`,
  isTitleEdited: true,
  isSaved: false,
  updatedAt: new Date().toISOString(),
  entries: record.entries.map((entry) => ({ ...entry, id: createId() })),
  expenses: (record.expenses ?? []).map((expense) => ({ ...expense, id: createId() })),
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount || 0);

const getQuarterNumber = (dateValue?: string) => {
  if (!dateValue) return 1;
  const month = new Date(dateValue).getMonth();
  if (Number.isNaN(month)) return 1;
  return Math.floor(month / 3) + 1;
};

const getRecordIncome = (record: OfferingRecord) =>
  record.entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

const getRecordExpenses = (record: OfferingRecord) =>
  (record.expenses ?? []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

const confirmDelete = async (message: string) => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
  });

  return result.isConfirmed;
};

export default function OfferingRecords() {
  const { offeringRecords, setOfferingRecords } = useOutletContext<OfferingContext>();
  const currentYear = new Date().getFullYear();
  const [selectedRecordId, setSelectedRecordId] = useState(offeringRecords[0]?.id ?? '');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(getQuarterNumber(new Date().toISOString().slice(0, 10)) as 1 | 2 | 3 | 4);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);

    offeringRecords.forEach((record) => {
      const date = new Date(record.serviceDate);
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [offeringRecords]);

  const filteredRecords = useMemo(
    () =>
      offeringRecords
        .filter((record) => {
          const date = new Date(record.serviceDate);
          const year = Number.isNaN(date.getTime()) ? currentYear : date.getFullYear();
          return year === Number(selectedYear) && getQuarterNumber(record.serviceDate) === selectedQuarter;
        })
        .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [currentYear, offeringRecords, selectedQuarter, selectedYear]
  );

  const quarterIncome = filteredRecords.reduce((sum, record) => sum + getRecordIncome(record), 0);
  const quarterExpenses = filteredRecords.reduce((sum, record) => sum + getRecordExpenses(record), 0);
  const visibleRecords = showAllRecords ? filteredRecords : filteredRecords.slice(0, 5);

  const selectedRecord = useMemo(
    () => filteredRecords.find((record) => record.id === selectedRecordId) ?? filteredRecords[0] ?? null,
    [filteredRecords, selectedRecordId]
  );

  useEffect(() => {
    if (filteredRecords.length === 0) {
      setSelectedRecordId('');
      return;
    }

    const existsInFiltered = filteredRecords.some((record) => record.id === selectedRecordId);
    if (!existsInFiltered) {
      setSelectedRecordId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedRecordId]);

  useEffect(() => {
    setShowAllRecords(false);
  }, [selectedYear, selectedQuarter]);

  useEffect(() => {
    if (!selectedRecord) {
      setIsRecordDialogOpen(false);
    }
  }, [selectedRecord]);

  const updateRecord = (updater: (record: OfferingRecord) => OfferingRecord) => {
    if (!selectedRecord) return;

    setOfferingRecords((prev) =>
      prev.map((record) =>
        record.id === selectedRecord.id
          ? {
              ...updater(record),
              updatedAt: new Date().toISOString(),
            }
          : record
      )
    );
  };

  const addEntry = (partial?: Partial<OfferingEntry>) => {
    updateRecord((record) => ({
      ...record,
      entries: [
        ...record.entries,
        {
          id: createId(),
          date: partial?.date || selectedRecord?.serviceDate || new Date().toISOString().slice(0, 10),
          category: partial?.category || 'tithe',
          amount: partial?.amount || 0,
          paymentMethod: partial?.paymentMethod || 'cash',
          donorName: partial?.donorName || '',
          receivedBy: partial?.receivedBy || '',
          notes: partial?.notes || '',
        },
      ],
    }));
  };

  const updateEntry = (entryId: string, patch: Partial<OfferingEntry>) => {
    updateRecord((record) => ({
      ...record,
      entries: record.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    }));
  };

  const removeEntry = async (entryId: string) => {
    const shouldDelete = await confirmDelete('This collection entry will be removed.');
    if (!shouldDelete) return;

    updateRecord((record) => ({
      ...record,
      entries: record.entries.filter((entry) => entry.id !== entryId),
    }));
  };

  const addExpense = (partial?: Partial<OfferingExpense>) => {
    updateRecord((record) => ({
      ...record,
      expenses: [
        ...(record.expenses ?? []),
        {
          id: createId(),
          category: partial?.category || 'other',
          description: partial?.description || '',
          amount: partial?.amount || 0,
          paidTo: partial?.paidTo || '',
          notes: partial?.notes || '',
        },
      ],
    }));
  };

  const updateExpense = (expenseId: string, patch: Partial<OfferingExpense>) => {
    updateRecord((record) => ({
      ...record,
      expenses: (record.expenses ?? []).map((expense) => (expense.id === expenseId ? { ...expense, ...patch } : expense)),
    }));
  };

  const removeExpense = async (expenseId: string) => {
    const shouldDelete = await confirmDelete('This expense will be removed.');
    if (!shouldDelete) return;

    updateRecord((record) => ({
      ...record,
      expenses: (record.expenses ?? []).filter((expense) => expense.id !== expenseId),
    }));
  };

  const deleteRecord = async (recordId: string) => {
    const shouldDelete = await confirmDelete('This record will be permanently removed.');
    if (!shouldDelete) return;

    setOfferingRecords((prev) => prev.filter((record) => record.id !== recordId));
    if (selectedRecordId === recordId) {
      setSelectedRecordId('');
    }
  };

  const openRecordDialog = (recordId: string) => {
    setSelectedRecordId(recordId);
    setIsRecordDialogOpen(true);
  };

  const createNewRecord = () => {
    const fresh = createRecord();
    const existingTitles = new Set(offeringRecords.map((r) => r.title));
    if (existingTitles.has(fresh.title)) {
      Swal.fire({
        icon: 'warning',
        title: `${fresh.title} record already exists`,
        text: 'Please add entries to the existing record instead.',
        confirmButtonColor: '#059669',
        confirmButtonText: 'Got it',
      });
      return;
    }
    setOfferingRecords((prev) => [fresh, ...prev]);
    setSelectedYear(String(new Date(fresh.serviceDate).getFullYear()));
    setSelectedQuarter(getQuarterNumber(fresh.serviceDate) as 1 | 2 | 3 | 4);
    setSelectedRecordId(fresh.id);
    setIsRecordDialogOpen(false);
  };

  const totalAmount = selectedRecord?.entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) ?? 0;
  const titheAmount = selectedRecord?.entries
    .filter((entry) => entry.category === 'tithe')
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) ?? 0;
  const digitalAmount = selectedRecord?.entries
    .filter((entry) => entry.paymentMethod === 'gcash' || entry.paymentMethod === 'bank-transfer')
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) ?? 0;
  const cashAmount = selectedRecord?.entries
    .filter((entry) => entry.paymentMethod === 'cash' || entry.paymentMethod === 'check')
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) ?? 0;
  const totalExpenses = (selectedRecord?.expenses ?? []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const remainingBalance = totalAmount - totalExpenses;

  return (
    <div className="mx-auto min-h-full max-w-4xl space-y-6 pb-16">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
              Finance Head
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
              Offering Records
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Simple record sheet for tithes, offerings, and other church collections.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createNewRecord}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              New Record
            </button>
            {selectedRecord && (
              <button
                type="button"
                onClick={() => {
                  const copy = duplicateRecord(selectedRecord);
                  setOfferingRecords((prev) => [copy, ...prev]);
                  setSelectedRecordId(copy.id);
                }}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Duplicate
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Total</p>
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Tithes</p>
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(titheAmount)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Digital</p>
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(digitalAmount)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Balance</p>
            </div>
            <p className={`mt-3 text-2xl font-black ${remainingBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
              {formatCurrency(remainingBalance)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px,minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Records</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                {filteredRecords.length}
              </span>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Year</p>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Quarter</p>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((quarter) => (
                        <button
                          key={quarter}
                          type="button"
                          onClick={() => setSelectedQuarter(quarter as 1 | 2 | 3 | 4)}
                          className={`rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                            selectedQuarter === quarter
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                          }`}
                        >
                          Q{quarter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
                  Q{selectedQuarter} {selectedYear}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white px-3 py-3 dark:bg-zinc-900">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Total Collections</p>
                    <p className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(quarterIncome)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-3 dark:bg-zinc-900">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Total Expense</p>
                    <p className="mt-1 text-sm font-black text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(quarterExpenses)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
                  Quarter Expenses
                </p>
                <div className="mt-3 space-y-2">
                  {filteredRecords.flatMap((record) => record.expenses ?? []).length > 0 ? (
                    filteredRecords.flatMap((record) =>
                      (record.expenses ?? []).map((expense) => (
                        <div
                          key={`${record.id}-${expense.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-[11px] dark:bg-zinc-900"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">
                              {EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === expense.category)?.label || 'Expense'}
                            </p>
                            <p className="truncate text-zinc-500 dark:text-zinc-400">{record.title}</p>
                            {expense.notes && (
                              <p className="truncate text-zinc-400 dark:text-zinc-500">
                                Note: {expense.notes}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 font-bold text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(Number(expense.amount) || 0)}
                          </span>
                        </div>
                      ))
                    )
                  ) : (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">No expenses recorded for this quarter.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {filteredRecords.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No records for this quarter.</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Try another quarter or year filter.</p>
                  </div>
                )}

                {visibleRecords.map((record) => {
                  const isActive = record.id === selectedRecord?.id;
                  return (
                    <div
                      key={record.id}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRecordId(record.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{record.title}</p>
                          <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            {record.serviceDate}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                              Expense Breakdown
                            </p>
                            {(record.expenses ?? []).length > 0 ? (
                              <div className="space-y-1">
                                {(record.expenses ?? []).slice(0, 3).map((expense) => (
                                  <div key={expense.id} className="flex items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                                    <span className="truncate">
                                      {EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === expense.category)?.label || 'Expense'}
                                    </span>
                                    <span className="shrink-0 font-semibold text-zinc-700 dark:text-zinc-200">
                                      {formatCurrency(Number(expense.amount) || 0)}
                                    </span>
                                  </div>
                                ))}
                                {(record.expenses ?? []).length > 3 && (
                                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                    +{(record.expenses ?? []).length - 3} more expenses
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">No expenses yet</p>
                            )}
                          </div>
                          {record.isSaved && (
                            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              Saved Record
                            </span>
                          )}
                        </button>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(getRecordIncome(record))}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                            Exp {formatCurrency(getRecordExpenses(record))}
                          </p>
                          {record.isSaved ? (
                            <button
                              type="button"
                              onClick={() => openRecordDialog(record.id)}
                              className="mt-2 mr-1 inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-zinc-900 dark:text-emerald-400"
                              aria-label={`View ${record.title}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openRecordDialog(record.id)}
                              className="mt-2 mr-1 inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-zinc-900 dark:text-emerald-400"
                              aria-label={`Open ${record.title}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteRecord(record.id)}
                            className="mt-2 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-1.5 text-red-500 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-zinc-900"
                            aria-label={`Delete ${record.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredRecords.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRecords((prev) => !prev)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {showAllRecords ? 'Show Less' : 'See More'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Record Workspace</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Click the `+` button on a record card to open the full dialog for quick add, details, summary, collections, and expenses.
            </p>
          </div>
        </aside>

        <section className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Record Dialog</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Use the `+` button on a record card or click `New Record` to open the full offering workspace dialog.
          </p>
        </section>
      </div>

      {isRecordDialogOpen && selectedRecord && (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-zinc-950/55 px-4 py-6 backdrop-blur-sm md:px-8">
          <div className="flex min-h-104 max-h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-[2rem] border-b border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Offering Workspace</p>
                <h2 className="truncate text-lg font-black text-zinc-900 dark:text-zinc-50">{selectedRecord.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordDialogOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(260px,0.75fr)]">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-5 flex items-center gap-3">
                    <ReceiptText className="h-5 w-5 text-emerald-600" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Record Details</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Title</span>
                      <input
                        type="text"
                        value={selectedRecord.title}
                        onChange={(e) => updateRecord((record) => ({ ...record, title: e.target.value, isTitleEdited: true }))}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Service Type</span>
                      <select
                        value={selectedRecord.serviceType || 'sunday-service'}
                        onChange={(e) => updateRecord((record) => ({ ...record, serviceType: e.target.value as OfferingRecord['serviceType'] }))}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      >
                        {SERVICE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Counted By</span>
                      <input
                        type="text"
                        value={selectedRecord.countedBy || ''}
                        onChange={(e) => updateRecord((record) => ({ ...record, countedBy: e.target.value }))}
                        placeholder="Treasurer / counter"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Witness By</span>
                      <input
                        type="text"
                        value={selectedRecord.witnessBy || ''}
                        onChange={(e) => updateRecord((record) => ({ ...record, witnessBy: e.target.value }))}
                        placeholder="Witness"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </label>
                  </div>
                  <textarea
                    value={selectedRecord.treasuryNotes || ''}
                    onChange={(e) => updateRecord((record) => ({ ...record, treasuryNotes: e.target.value }))}
                    placeholder="Notes"
                    rows={4}
                    className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Summary</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Entries</p>
                      <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{selectedRecord.entries.length}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Cash</p>
                      <p className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(cashAmount)}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">GCash + Bank</p>
                      <p className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(digitalAmount)}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Expenses</p>
                      <p className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(totalExpenses)}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Remaining</p>
                      <p className={`mt-2 text-xl font-black ${remainingBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                        {formatCurrency(remainingBalance)}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Collection Entries</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add one line per collection entry.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addEntry()}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Entry
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedRecord.entries.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No finance entries yet.</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Use Add Entry or Quick Add to start recording.</p>
                    </div>
                  )}

                  {selectedRecord.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <BanknoteArrowDown className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                              {CATEGORY_OPTIONS.find((option) => option.value === entry.category)?.label}
                            </p>
                            <p className="mt-1 text-lg font-black text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(Number(entry.amount) || 0)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-500 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-zinc-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mb-3">
                        <label className="space-y-1.5 block">
                          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Date</span>
                          <input
                            type="date"
                            value={entry.date || selectedRecord.serviceDate}
                            onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <select
                          value={entry.category}
                          onChange={(e) => updateEntry(entry.id, { category: e.target.value as OfferingEntry['category'] })}
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                        >
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.amount}
                          onChange={(e) => updateEntry(entry.id, { amount: Number(e.target.value) })}
                          placeholder="Amount"
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                        <select
                          value={entry.paymentMethod || 'cash'}
                          onChange={(e) => updateEntry(entry.id, { paymentMethod: e.target.value as OfferingEntry['paymentMethod'] })}
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                        >
                          {PAYMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                    </div>

                      <textarea
                        value={entry.notes || ''}
                        onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                        placeholder="Notes"
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Expenses</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add church expenses para makita ang total nagasto.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addExpense()}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </button>
                </div>

                <div className="space-y-4">
                  {(selectedRecord.expenses ?? []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No expenses yet.</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add expense lines para makita ang nagasto sa service or event.</p>
                    </div>
                  )}

                  {(selectedRecord.expenses ?? []).map((expense) => (
                    <div
                      key={expense.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                            {EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === expense.category)?.label || 'Expense'}
                          </p>
                          <p className="mt-1 text-lg font-black text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(Number(expense.amount) || 0)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeExpense(expense.id)}
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-500 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-zinc-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <select
                        value={expense.category || 'other'}
                        onChange={(e) => updateExpense(expense.id, { category: e.target.value as OfferingExpense['category'] })}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                        >
                          {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, { amount: Number(e.target.value) })}
                        placeholder="Amount"
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                    </div>

                      <textarea
                        value={expense.notes || ''}
                        onChange={(e) => updateExpense(expense.id, { notes: e.target.value })}
                        placeholder="Notes"
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 bg-white/95 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/95">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordDialogOpen(false)}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateRecord((record) => ({ ...record, isSaved: true }));
                    setIsRecordDialogOpen(false);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700"
                >
                  Save Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
