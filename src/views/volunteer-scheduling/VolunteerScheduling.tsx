import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarClock,
  CopyPlus,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  UserRoundCheck,
} from 'lucide-react';
import type { MemberProfile, VolunteerAssignment, VolunteerSchedule } from '../types';

type VolunteerContext = {
  volunteerSchedules: VolunteerSchedule[];
  setVolunteerSchedules: Dispatch<SetStateAction<VolunteerSchedule[]>>;
  members: MemberProfile[];
};

const MINISTRY_OPTIONS: Array<{ value: VolunteerAssignment['ministry']; label: string }> = [
  { value: 'worship', label: 'Worship Team' },
  { value: 'media', label: 'Media Team' },
  { value: 'ushering', label: 'Ushering' },
  { value: 'speaker', label: 'Speaker' },
  { value: 'prayer', label: 'Prayer Team' },
  { value: 'kids', label: 'Kids Ministry' },
  { value: 'security', label: 'Security' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: Array<{ value: NonNullable<VolunteerAssignment['status']>; label: string }> = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'substitute', label: 'Substitute' },
  { value: 'absent', label: 'Absent' },
];

const QUICK_ASSIGNMENTS: Array<Pick<VolunteerAssignment, 'ministry' | 'role' | 'arrivalTime'>> = [
  { ministry: 'worship', role: 'Lead Vocalist', arrivalTime: '08:00' },
  { ministry: 'media', role: 'OBS / Livestream', arrivalTime: '08:00' },
  { ministry: 'ushering', role: 'Main Door Usher', arrivalTime: '08:15' },
  { ministry: 'prayer', role: 'Prayer Leader', arrivalTime: '08:20' },
  { ministry: 'kids', role: 'Kids Teacher', arrivalTime: '08:15' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createSchedule = (): VolunteerSchedule => ({
  id: createId(),
  title: 'New Volunteer Schedule',
  serviceDate: new Date().toISOString().slice(0, 10),
  serviceTime: '09:00',
  venue: 'Main Sanctuary',
  notes: '',
  assignments: [],
  updatedAt: new Date().toISOString(),
});

const duplicateSchedule = (schedule: VolunteerSchedule): VolunteerSchedule => ({
  ...schedule,
  id: createId(),
  title: `${schedule.title} Copy`,
  updatedAt: new Date().toISOString(),
  assignments: schedule.assignments.map((assignment) => ({ ...assignment, id: createId() })),
});

export default function VolunteerScheduling() {
  const { volunteerSchedules, setVolunteerSchedules, members } = useOutletContext<VolunteerContext>();
  const [selectedScheduleId, setSelectedScheduleId] = useState(volunteerSchedules[0]?.id ?? '');

  const selectedSchedule = useMemo(
    () => volunteerSchedules.find((schedule) => schedule.id === selectedScheduleId) ?? volunteerSchedules[0] ?? null,
    [volunteerSchedules, selectedScheduleId]
  );

  const updateSchedule = (updater: (schedule: VolunteerSchedule) => VolunteerSchedule) => {
    if (!selectedSchedule) return;

    setVolunteerSchedules((prev) =>
      prev.map((schedule) =>
        schedule.id === selectedSchedule.id
          ? {
              ...updater(schedule),
              updatedAt: new Date().toISOString(),
            }
          : schedule
      )
    );
  };

  const addAssignment = (partial?: Partial<VolunteerAssignment>) => {
    updateSchedule((schedule) => ({
      ...schedule,
      assignments: [
        ...schedule.assignments,
        {
          id: createId(),
          ministry: partial?.ministry || 'other',
          role: partial?.role || 'New Assignment',
          volunteerName: partial?.volunteerName || '',
          contact: partial?.contact || '',
          arrivalTime: partial?.arrivalTime || '',
          status: partial?.status || 'pending',
          notes: partial?.notes || '',
        },
      ],
    }));
  };

  const updateAssignment = (assignmentId: string, patch: Partial<VolunteerAssignment>) => {
    updateSchedule((schedule) => ({
      ...schedule,
      assignments: schedule.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, ...patch } : assignment
      ),
    }));
  };

  const removeAssignment = (assignmentId: string) => {
    updateSchedule((schedule) => ({
      ...schedule,
      assignments: schedule.assignments.filter((assignment) => assignment.id !== assignmentId),
    }));
  };

  const applyMemberToAssignment = (assignmentId: string, memberId: string) => {
    const selectedMember = members.find((member) => member.id === memberId);
    if (!selectedMember) return;

    const nextMinistry: VolunteerAssignment['ministry'] =
      selectedMember.memberStatus === 'leader'
        ? 'speaker'
        : selectedMember.ministry?.toLowerCase().includes('media')
          ? 'media'
          : selectedMember.ministry?.toLowerCase().includes('worship')
            ? 'worship'
            : selectedMember.ministry?.toLowerCase().includes('kids')
              ? 'kids'
              : selectedMember.ministry?.toLowerCase().includes('prayer')
                ? 'prayer'
                : 'other';

    updateAssignment(assignmentId, {
      volunteerName: selectedMember.fullName,
      contact: selectedMember.phone || '',
      ministry: nextMinistry,
      status: 'confirmed',
      notes: selectedMember.notes || '',
    });
  };

  const totalAssignments = selectedSchedule?.assignments.length ?? 0;
  const confirmedCount = selectedSchedule?.assignments.filter((assignment) => assignment.status === 'confirmed').length ?? 0;
  const pendingCount = selectedSchedule?.assignments.filter((assignment) => assignment.status === 'pending').length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Team Rotation</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <Users className="h-8 w-8 text-amber-500" />
            Volunteer Scheduling
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Assign ministry teams per service with roles, arrival times, contact details, and attendance status.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const fresh = createSchedule();
              setVolunteerSchedules((prev) => [fresh, ...prev]);
              setSelectedScheduleId(fresh.id);
            }}
            className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            New Schedule
          </button>
          {selectedSchedule && (
            <button
              type="button"
              onClick={() => {
                const copy = duplicateSchedule(selectedSchedule);
                setVolunteerSchedules((prev) => [copy, ...prev]);
                setSelectedScheduleId(copy.id);
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
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Service Dates</p>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                {volunteerSchedules.length}
              </span>
            </div>

            <div className="space-y-3">
              {volunteerSchedules.map((schedule) => {
                const isActive = schedule.id === selectedSchedule?.id;
                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => setSelectedScheduleId(schedule.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{schedule.title}</p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {schedule.serviceDate} {schedule.serviceTime ? `• ${schedule.serviceTime}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Quick Add Roles</p>
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{members.length} member profiles available for assignments</p>
            <div className="space-y-2">
              {QUICK_ASSIGNMENTS.map((item) => (
                <button
                  key={`${item.ministry}-${item.role}`}
                  type="button"
                  onClick={() => addAssignment(item)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{item.role}</span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {MINISTRY_OPTIONS.find((option) => option.value === item.ministry)?.label}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 text-amber-500" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selectedSchedule && (
          <section className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:col-span-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Schedule Title</span>
                    <input
                      type="text"
                      value={selectedSchedule.title}
                      onChange={(e) => updateSchedule((schedule) => ({ ...schedule, title: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Date</span>
                    <input
                      type="date"
                      value={selectedSchedule.serviceDate}
                      onChange={(e) => updateSchedule((schedule) => ({ ...schedule, serviceDate: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Time</span>
                    <input
                      type="time"
                      value={selectedSchedule.serviceTime || ''}
                      onChange={(e) => updateSchedule((schedule) => ({ ...schedule, serviceTime: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Venue</span>
                    <input
                      type="text"
                      value={selectedSchedule.venue || ''}
                      onChange={(e) => updateSchedule((schedule) => ({ ...schedule, venue: e.target.value }))}
                      placeholder="Main Sanctuary"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                </div>

                <textarea
                  value={selectedSchedule.notes || ''}
                  onChange={(e) => updateSchedule((schedule) => ({ ...schedule, notes: e.target.value }))}
                  placeholder="General reminders for all volunteers"
                  rows={3}
                  className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Assignments</p>
                  <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{totalAssignments}</p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Confirmed</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <UserRoundCheck className="h-6 w-6 text-emerald-500" />
                    {confirmedCount}
                  </p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Pending</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <CalendarClock className="h-6 w-6 text-amber-500" />
                    {pendingCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Volunteer Assignments</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Track ministry roles, who is assigned, and whether they already confirmed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => addAssignment()}
                  className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <Plus className="h-4 w-4" />
                  Add Volunteer
                </button>
              </div>

              <div className="space-y-4">
                {selectedSchedule.assignments.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No volunteer assignments yet.</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Use Add Volunteer or Quick Add Roles to start building the team rotation.</p>
                  </div>
                )}

                {selectedSchedule.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 transition dark:border-zinc-800 dark:bg-zinc-950/50">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                            {MINISTRY_OPTIONS.find((option) => option.value === assignment.ministry)?.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{assignment.role || 'New Assignment'}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAssignment(assignment.id)}
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
                          applyMemberToAssignment(assignment.id, e.target.value);
                        }}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        <option value="">Assign from members</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.fullName}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assignment.ministry}
                        onChange={(e) => updateAssignment(assignment.id, { ministry: e.target.value as VolunteerAssignment['ministry'] })}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {MINISTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={assignment.role}
                        onChange={(e) => updateAssignment(assignment.id, { role: e.target.value })}
                        placeholder="Role"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        type="text"
                        value={assignment.volunteerName}
                        onChange={(e) => updateAssignment(assignment.id, { volunteerName: e.target.value })}
                        placeholder="Volunteer name"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <label className="relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={assignment.contact || ''}
                          onChange={(e) => updateAssignment(assignment.id, { contact: e.target.value })}
                          placeholder="Contact number"
                          className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                      </label>
                      <input
                        type="time"
                        value={assignment.arrivalTime || ''}
                        onChange={(e) => updateAssignment(assignment.id, { arrivalTime: e.target.value })}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <select
                        value={assignment.status || 'pending'}
                        onChange={(e) => updateAssignment(assignment.id, { status: e.target.value as VolunteerAssignment['status'] })}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={assignment.notes || ''}
                      onChange={(e) => updateAssignment(assignment.id, { notes: e.target.value })}
                      placeholder="Special reminders, backup plan, or missing details"
                      rows={3}
                      className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
