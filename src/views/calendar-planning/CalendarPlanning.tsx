import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  CopyPlus,
  MapPin,
  Plus,
  Rows3,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import type { CalendarEvent } from '../types';

type CalendarContext = {
  calendarEvents: CalendarEvent[];
  setCalendarEvents: Dispatch<SetStateAction<CalendarEvent[]>>;
};

const EVENT_TYPE_OPTIONS: Array<{ value: NonNullable<CalendarEvent['eventType']>; label: string }> = [
  { value: 'service', label: 'Service' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'baptism', label: 'Baptism' },
  { value: 'conference', label: 'Conference' },
  { value: 'special', label: 'Special' },
];

const STATUS_OPTIONS: Array<{ value: NonNullable<CalendarEvent['status']>; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const QUICK_TEMPLATES: Array<Pick<CalendarEvent, 'title' | 'eventType' | 'status' | 'ministry'>> = [
  { title: 'Prayer Meeting', eventType: 'service', status: 'planned', ministry: 'Church Wide' },
  { title: 'Worship Team Rehearsal', eventType: 'rehearsal', status: 'planned', ministry: 'Worship Team' },
  { title: 'Youth Fellowship', eventType: 'special', status: 'confirmed', ministry: 'Youth Ministry' },
  { title: 'Leaders Meeting', eventType: 'meeting', status: 'planned', ministry: 'Church Leaders' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createEvent = (): CalendarEvent => ({
  id: createId(),
  title: 'New Church Event',
  eventDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  eventTime: '',
  venue: '',
  ministry: '',
  eventType: 'special',
  status: 'planned',
  description: '',
  coordinator: '',
  updatedAt: new Date().toISOString(),
});

const duplicateEvent = (event: CalendarEvent): CalendarEvent => ({
  ...event,
  id: createId(),
  title: `${event.title} Copy`,
  updatedAt: new Date().toISOString(),
});

const formatEventDate = (date?: string) => {
  if (!date) return 'No date';
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date;
  }
};

export default function CalendarPlanning() {
  const { calendarEvents, setCalendarEvents } = useOutletContext<CalendarContext>();
  const [selectedEventId, setSelectedEventId] = useState(calendarEvents[0]?.id ?? '');

  const sortedEvents = useMemo(
    () =>
      [...calendarEvents].sort((a, b) =>
        `${a.eventDate || ''}${a.eventTime || ''}`.localeCompare(`${b.eventDate || ''}${b.eventTime || ''}`)
      ),
    [calendarEvents]
  );

  const selectedEvent = useMemo(
    () => sortedEvents.find((event) => event.id === selectedEventId) ?? sortedEvents[0] ?? null,
    [sortedEvents, selectedEventId]
  );

  const updateEvent = (id: string, patch: Partial<CalendarEvent>) => {
    setCalendarEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? {
              ...event,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : event
      )
    );
  };

  const confirmedCount = calendarEvents.filter((event) => event.status === 'confirmed').length;
  const ministryCount = new Set(calendarEvents.map((event) => event.ministry).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="rounded-[2.25rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-500">Church Calendar</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
              <CalendarDays className="h-8 w-8 text-violet-500" />
              Calendar Event Planning
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Organize services, rehearsals, meetings, outreaches, and special events in one church planning board.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const next = createEvent();
                setCalendarEvents((prev) => [next, ...prev]);
                setSelectedEventId(next.id);
              }}
              className="flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-violet-600"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
            {selectedEvent && (
              <button
                type="button"
                onClick={() => {
                  const copy = duplicateEvent(selectedEvent);
                  setCalendarEvents((prev) => [copy, ...prev]);
                  setSelectedEventId(copy.id);
                }}
                className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <CopyPlus className="h-4 w-4" />
                Duplicate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Events</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <Rows3 className="h-6 w-6 text-violet-500" />
            {calendarEvents.length}
          </p>
        </div>
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Confirmed</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <Sparkles className="h-6 w-6 text-emerald-500" />
            {confirmedCount}
          </p>
        </div>
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Ministries</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <Users className="h-6 w-6 text-amber-500" />
            {ministryCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Upcoming Events</p>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                {sortedEvents.length}
              </span>
            </div>
            <div className="space-y-3">
              {sortedEvents.map((event) => {
                const isActive = event.id === selectedEvent?.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{event.title}</p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{formatEventDate(event.eventDate)}</p>
                    <p className="mt-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {STATUS_OPTIONS.find((option) => option.value === event.status)?.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Quick Templates</p>
            <div className="space-y-2">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={`${template.title}-${template.ministry}`}
                  type="button"
                  onClick={() => {
                    const next = createEvent();
                    next.title = template.title;
                    next.eventType = template.eventType;
                    next.status = template.status;
                    next.ministry = template.ministry;
                    setCalendarEvents((prev) => [next, ...prev]);
                    setSelectedEventId(next.id);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{template.title}</span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{template.ministry}</span>
                  </span>
                  <Plus className="h-4 w-4 text-violet-500" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selectedEvent && (
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Event Details</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Track the schedule, ministry owner, venue, and event planning notes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarEvents((prev) => prev.filter((event) => event.id !== selectedEvent.id));
                    const fallback = sortedEvents.find((event) => event.id !== selectedEvent.id);
                    setSelectedEventId(fallback?.id ?? '');
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Event Title</span>
                  <input
                    type="text"
                    value={selectedEvent.title}
                    onChange={(e) => updateEvent(selectedEvent.id, { title: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Coordinator</span>
                  <input
                    type="text"
                    value={selectedEvent.coordinator || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, { coordinator: e.target.value })}
                    placeholder="Leader / coordinator"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Event Date</span>
                  <input
                    type="date"
                    value={selectedEvent.eventDate}
                    onChange={(e) => updateEvent(selectedEvent.id, { eventDate: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">End Date</span>
                  <input
                    type="date"
                    value={selectedEvent.endDate || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, { endDate: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Time</span>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="time"
                      value={selectedEvent.eventTime || ''}
                      onChange={(e) => updateEvent(selectedEvent.id, { eventTime: e.target.value })}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Venue</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={selectedEvent.venue || ''}
                      onChange={(e) => updateEvent(selectedEvent.id, { venue: e.target.value })}
                      placeholder="Venue / location"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Ministry</span>
                  <input
                    type="text"
                    value={selectedEvent.ministry || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, { ministry: e.target.value })}
                    placeholder="Responsible ministry"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Type</span>
                  <select
                    value={selectedEvent.eventType || 'special'}
                    onChange={(e) => updateEvent(selectedEvent.id, { eventType: e.target.value as CalendarEvent['eventType'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</span>
                  <select
                    value={selectedEvent.status || 'planned'}
                    onChange={(e) => updateEvent(selectedEvent.id, { status: e.target.value as CalendarEvent['status'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <textarea
                value={selectedEvent.description || ''}
                onChange={(e) => updateEvent(selectedEvent.id, { description: e.target.value })}
                rows={6}
                placeholder="Planning notes, key agenda, preparation checklist, or event reminder"
                className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
