import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarCheck2,
  CopyPlus,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import type { AttendanceEntry, AttendanceRecord, MemberProfile } from '../types';

type AttendanceContext = {
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: Dispatch<SetStateAction<AttendanceRecord[]>>;
  members: MemberProfile[];
};

const CATEGORY_OPTIONS: Array<{ value: AttendanceEntry['category']; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'youth', label: 'Youth' },
  { value: 'kids', label: 'Kids' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'staff', label: 'Staff' },
];

const STATUS_OPTIONS: Array<{ value: AttendanceEntry['status']; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'first-time', label: 'First Time' },
];

const SERVICE_TYPES: Array<{ value: NonNullable<AttendanceRecord['serviceType']>; label: string }> = [
  { value: 'sunday-service', label: 'Sunday Service' },
  { value: 'prayer-meeting', label: 'Prayer Meeting' },
  { value: 'youth-service', label: 'Youth Service' },
  { value: 'cell-group', label: 'Cell Group' },
  { value: 'special-event', label: 'Special Event' },
];

const QUICK_PEOPLE: Array<Pick<AttendanceEntry, 'category' | 'status' | 'ministry'>> = [
  { category: 'member', status: 'present', ministry: '' },
  { category: 'visitor', status: 'first-time', ministry: '' },
  { category: 'volunteer', status: 'present', ministry: 'Media' },
  { category: 'youth', status: 'present', ministry: 'Youth Ministry' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createRecord = (): AttendanceRecord => ({
  id: createId(),
  title: 'New Attendance Record',
  serviceDate: new Date().toISOString().slice(0, 10),
  serviceType: 'sunday-service',
  venue: 'Main Sanctuary',
  notes: '',
  entries: [],
  updatedAt: new Date().toISOString(),
});

const duplicateRecord = (record: AttendanceRecord): AttendanceRecord => ({
  ...record,
  id: createId(),
  title: `${record.title} Copy`,
  updatedAt: new Date().toISOString(),
  entries: record.entries.map((entry) => ({ ...entry, id: createId() })),
});

export default function AttendanceTracking() {
  const { attendanceRecords, setAttendanceRecords, members } = useOutletContext<AttendanceContext>();
  const [selectedRecordId, setSelectedRecordId] = useState(attendanceRecords[0]?.id ?? '');

  const selectedRecord = useMemo(
    () => attendanceRecords.find((record) => record.id === selectedRecordId) ?? attendanceRecords[0] ?? null,
    [attendanceRecords, selectedRecordId]
  );

  const updateRecord = (updater: (record: AttendanceRecord) => AttendanceRecord) => {
    if (!selectedRecord) return;

    setAttendanceRecords((prev) =>
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

  const addEntry = (partial?: Partial<AttendanceEntry>) => {
    updateRecord((record) => ({
      ...record,
      entries: [
        ...record.entries,
        {
          id: createId(),
          fullName: partial?.fullName || '',
          category: partial?.category || 'member',
          status: partial?.status || 'present',
          contact: partial?.contact || '',
          ministry: partial?.ministry || '',
          notes: partial?.notes || '',
        },
      ],
    }));
  };

  const updateEntry = (entryId: string, patch: Partial<AttendanceEntry>) => {
    updateRecord((record) => ({
      ...record,
      entries: record.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    }));
  };

  const removeEntry = (entryId: string) => {
    updateRecord((record) => ({
      ...record,
      entries: record.entries.filter((entry) => entry.id !== entryId),
    }));
  };

  const applyMemberToEntry = (entryId: string, memberId: string) => {
    const selectedMember = members.find((member) => member.id === memberId);
    if (!selectedMember) return;

    const nextCategory: AttendanceEntry['category'] =
      selectedMember.memberStatus === 'visitor'
        ? 'visitor'
        : selectedMember.memberStatus === 'volunteer'
          ? 'volunteer'
          : selectedMember.ministry?.toLowerCase().includes('youth')
            ? 'youth'
            : 'member';

    updateEntry(entryId, {
      fullName: selectedMember.fullName,
      contact: selectedMember.phone || '',
      ministry: selectedMember.ministry || '',
      category: nextCategory,
      status: nextCategory === 'visitor' ? 'first-time' : 'present',
      notes: selectedMember.notes || '',
    });
  };

  const totalAttendees = selectedRecord?.entries.length ?? 0;
  const presentCount = selectedRecord?.entries.filter((entry) => entry.status === 'present' || entry.status === 'late' || entry.status === 'first-time').length ?? 0;
  const firstTimeCount = selectedRecord?.entries.filter((entry) => entry.status === 'first-time').length ?? 0;
  const absentCount = selectedRecord?.entries.filter((entry) => entry.status === 'absent').length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-500">Church Attendance</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <CalendarCheck2 className="h-8 w-8 text-sky-500" />
            Attendance Tracking
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Record members, visitors, youth, and ministry attendance for every church gathering.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const next = createRecord();
              setAttendanceRecords((prev) => [next, ...prev]);
              setSelectedRecordId(next.id);
            }}
            className="flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-sky-600"
          >
            <Plus className="h-4 w-4" />
            New Record
          </button>
          {selectedRecord && (
            <button
              type="button"
              onClick={() => {
                const copy = duplicateRecord(selectedRecord);
                setAttendanceRecords((prev) => [copy, ...prev]);
                setSelectedRecordId(copy.id);
              }}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <CopyPlus className="h-4 w-4" />
              Duplicate
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Attendance Logs</p>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                {attendanceRecords.length}
              </span>
            </div>

            <div className="space-y-3">
              {attendanceRecords.map((record) => {
                const isActive = record.id === selectedRecord?.id;
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{record.title}</p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{record.serviceDate}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Quick Add</p>
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{members.length} members available from directory</p>
            <div className="space-y-2">
              {QUICK_PEOPLE.map((item, index) => (
                <button
                  key={`${item.category}-${item.status}-${index}`}
                  type="button"
                  onClick={() => addEntry(item)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {CATEGORY_OPTIONS.find((option) => option.value === item.category)?.label}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {STATUS_OPTIONS.find((option) => option.value === item.status)?.label}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 text-sky-500" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selectedRecord && (
          <section className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:col-span-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Record Title</span>
                    <input
                      type="text"
                      value={selectedRecord.title}
                      onChange={(e) => updateRecord((record) => ({ ...record, title: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Date</span>
                    <input
                      type="date"
                      value={selectedRecord.serviceDate}
                      onChange={(e) => updateRecord((record) => ({ ...record, serviceDate: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Type</span>
                    <select
                      value={selectedRecord.serviceType || 'sunday-service'}
                      onChange={(e) => updateRecord((record) => ({ ...record, serviceType: e.target.value as AttendanceRecord['serviceType'] }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      {SERVICE_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Venue</span>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={selectedRecord.venue || ''}
                        onChange={(e) => updateRecord((record) => ({ ...record, venue: e.target.value }))}
                        placeholder="Main Sanctuary"
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </div>
                  </label>
                </div>

                <textarea
                  value={selectedRecord.notes || ''}
                  onChange={(e) => updateRecord((record) => ({ ...record, notes: e.target.value }))}
                  placeholder="Notes about attendance, weather, special visitors, or follow-up reminders"
                  rows={3}
                  className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-1">
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Total</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <UsersRound className="h-6 w-6 text-sky-500" />
                    {totalAttendees}
                  </p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Present</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <UserCheck className="h-6 w-6 text-emerald-500" />
                    {presentCount}
                  </p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">First Time</p>
                  <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{firstTimeCount}</p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Absent</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <UserRoundX className="h-6 w-6 text-rose-500" />
                    {absentCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Attendance List</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Track members, visitors, and ministry attendance for this gathering.</p>
                </div>
                <button
                  type="button"
                  onClick={() => addEntry()}
                  className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <Plus className="h-4 w-4" />
                  Add Entry
                </button>
              </div>

              <div className="space-y-4">
                {selectedRecord.entries.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No attendance entries yet.</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Use Add Entry or Quick Add to start logging attendance.</p>
                  </div>
                )}

                {selectedRecord.entries.map((entry) => (
                  <div key={entry.id} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 transition dark:border-zinc-800 dark:bg-zinc-950/50">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                          {CATEGORY_OPTIONS.find((option) => option.value === entry.category)?.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                          {entry.fullName || 'New attendee'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          applyMemberToEntry(entry.id, e.target.value);
                        }}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        <option value="">Select from members</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.fullName}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={entry.fullName}
                        onChange={(e) => updateEntry(entry.id, { fullName: e.target.value })}
                        placeholder="Full name"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <select
                        value={entry.category}
                        onChange={(e) => updateEntry(entry.id, { category: e.target.value as AttendanceEntry['category'] })}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={entry.status}
                        onChange={(e) => updateEntry(entry.id, { status: e.target.value as AttendanceEntry['status'] })}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={entry.contact || ''}
                        onChange={(e) => updateEntry(entry.id, { contact: e.target.value })}
                        placeholder="Contact number"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        type="text"
                        value={entry.ministry || ''}
                        onChange={(e) => updateEntry(entry.id, { ministry: e.target.value })}
                        placeholder="Ministry / group"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                    </div>

                    <textarea
                      value={entry.notes || ''}
                      onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                      placeholder="Follow-up notes, prayer concern, or visitor remark"
                      rows={3}
                      className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
