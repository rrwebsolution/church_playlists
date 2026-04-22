import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BadgeCheck,
  BookUser,
  CalendarDays,
  CopyPlus,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UsersRound,
} from 'lucide-react';
import type { MemberProfile } from '../types';

type MemberContext = {
  members: MemberProfile[];
  setMembers: Dispatch<SetStateAction<MemberProfile[]>>;
};

const STATUS_OPTIONS: Array<{ value: NonNullable<MemberProfile['memberStatus']>; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'leader', label: 'Leader' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'inactive', label: 'Inactive' },
];

const GENDER_OPTIONS: Array<{ value: NonNullable<MemberProfile['gender']>; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const CIVIL_STATUS_OPTIONS: Array<{ value: NonNullable<MemberProfile['civilStatus']>; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'other', label: 'Other' },
];

const QUICK_MEMBER_TEMPLATES: Array<Pick<MemberProfile, 'memberStatus' | 'ministry'>> = [
  { memberStatus: 'member', ministry: 'Worship Team' },
  { memberStatus: 'leader', ministry: 'Pastoral Care' },
  { memberStatus: 'volunteer', ministry: 'Media Team' },
  { memberStatus: 'visitor', ministry: '' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createMember = (): MemberProfile => ({
  id: createId(),
  fullName: 'New Member',
  gender: 'female',
  birthday: '',
  phone: '',
  email: '',
  address: '',
  ministry: '',
  memberStatus: 'member',
  civilStatus: 'single',
  emergencyContact: '',
  notes: '',
  updatedAt: new Date().toISOString(),
});

const duplicateMember = (member: MemberProfile): MemberProfile => ({
  ...member,
  id: createId(),
  fullName: `${member.fullName} Copy`,
  updatedAt: new Date().toISOString(),
});

export default function MemberDirectory() {
  const { members, setMembers } = useOutletContext<MemberContext>();
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? '');
  const [search, setSearch] = useState('');

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      [member.fullName, member.ministry, member.phone, member.email, member.memberStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [members, search]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? members[0] ?? null,
    [members, selectedMemberId]
  );

  const updateMember = (memberId: string, patch: Partial<MemberProfile>) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? {
              ...member,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : member
      )
    );
  };

  const activeMembers = members.filter((member) => member.memberStatus !== 'inactive').length;
  const leaders = members.filter((member) => member.memberStatus === 'leader').length;
  const visitors = members.filter((member) => member.memberStatus === 'visitor').length;
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();

    return members
      .filter((member) => member.birthday)
      .map((member) => {
        const birthday = new Date(member.birthday as string);
        const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffDays = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...member,
          diffDays,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);
  }, [members]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500">Church People</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <BookUser className="h-8 w-8 text-cyan-500" />
            Member Directory
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Keep a central list of church members, leaders, volunteers, and visitors with contact info and ministry details.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const next = createMember();
              setMembers((prev) => [next, ...prev]);
              setSelectedMemberId(next.id);
            }}
            className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
          {selectedMember && (
            <button
              type="button"
              onClick={() => {
                const copy = duplicateMember(selectedMember);
                setMembers((prev) => [copy, ...prev]);
                setSelectedMemberId(copy.id);
              }}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <CopyPlus className="h-4 w-4" />
              Duplicate
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member, ministry, phone..."
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const isActive = member.id === selectedMember?.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-cyan-200 bg-cyan-50 dark:border-cyan-500/30 dark:bg-cyan-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{member.fullName}</p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {member.ministry || 'No ministry yet'}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {STATUS_OPTIONS.find((option) => option.value === member.memberStatus)?.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Quick Add</p>
            <div className="space-y-2">
              {QUICK_MEMBER_TEMPLATES.map((item, index) => (
                <button
                  key={`${item.memberStatus}-${item.ministry}-${index}`}
                  type="button"
                  onClick={() => {
                    const next = createMember();
                    next.memberStatus = item.memberStatus;
                    next.ministry = item.ministry;
                    setMembers((prev) => [next, ...prev]);
                    setSelectedMemberId(next.id);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {STATUS_OPTIONS.find((option) => option.value === item.memberStatus)?.label}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {item.ministry || 'General profile'}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 text-cyan-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Upcoming Birthdays</p>
            <div className="space-y-3">
              {upcomingBirthdays.length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No birthdays added yet.</p>
              )}
              {upcomingBirthdays.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{member.fullName}</span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {member.birthday}
                    </span>
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-500">
                    {member.diffDays === 0 ? 'Today' : `${member.diffDays}d`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selectedMember && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Directory Total</p>
                <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                  <UsersRound className="h-6 w-6 text-cyan-500" />
                  {members.length}
                </p>
              </div>
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Active</p>
                <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                  <BadgeCheck className="h-6 w-6 text-emerald-500" />
                  {activeMembers}
                </p>
              </div>
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Leaders / Visitors</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                  {leaders} / {visitors}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Profile Details</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Maintain the member record with ministry assignment and emergency contact info.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMembers((prev) => prev.filter((member) => member.id !== selectedMember.id));
                    const fallback = members.find((member) => member.id !== selectedMember.id);
                    setSelectedMemberId(fallback?.id ?? '');
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Full Name</span>
                  <input
                    type="text"
                    value={selectedMember.fullName}
                    onChange={(e) => updateMember(selectedMember.id, { fullName: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Birthday</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="date"
                      value={selectedMember.birthday || ''}
                      onChange={(e) => updateMember(selectedMember.id, { birthday: e.target.value })}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</span>
                  <select
                    value={selectedMember.memberStatus || 'member'}
                    onChange={(e) => updateMember(selectedMember.id, { memberStatus: e.target.value as MemberProfile['memberStatus'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Gender</span>
                  <select
                    value={selectedMember.gender || 'female'}
                    onChange={(e) => updateMember(selectedMember.id, { gender: e.target.value as MemberProfile['gender'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Civil Status</span>
                  <select
                    value={selectedMember.civilStatus || 'single'}
                    onChange={(e) => updateMember(selectedMember.id, { civilStatus: e.target.value as MemberProfile['civilStatus'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {CIVIL_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Ministry</span>
                  <input
                    type="text"
                    value={selectedMember.ministry || ''}
                    onChange={(e) => updateMember(selectedMember.id, { ministry: e.target.value })}
                    placeholder="e.g. Media Team"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Phone</span>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={selectedMember.phone || ''}
                      onChange={(e) => updateMember(selectedMember.id, { phone: e.target.value })}
                      placeholder="09xxxxxxxxx"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={selectedMember.email || ''}
                      onChange={(e) => updateMember(selectedMember.id, { email: e.target.value })}
                      placeholder="name@email.com"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Address</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-zinc-400" />
                    <textarea
                      value={selectedMember.address || ''}
                      onChange={(e) => updateMember(selectedMember.id, { address: e.target.value })}
                      rows={3}
                      placeholder="Complete address"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Emergency Contact</span>
                  <div className="relative">
                    <ShieldAlert className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={selectedMember.emergencyContact || ''}
                      onChange={(e) => updateMember(selectedMember.id, { emergencyContact: e.target.value })}
                      placeholder="Name / number"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
              </div>

              <textarea
                value={selectedMember.notes || ''}
                onChange={(e) => updateMember(selectedMember.id, { notes: e.target.value })}
                rows={5}
                placeholder="Pastoral notes, follow-up reminders, baptism status, or family details"
                className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
