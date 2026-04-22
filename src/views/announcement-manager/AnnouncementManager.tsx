import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BellRing,
  CalendarRange,
  ExternalLink,
  CopyPlus,
  Megaphone,
  Plus,
  Presentation,
  Send,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { AnnouncementItem } from '../types';

type AnnouncementContext = {
  announcements: AnnouncementItem[];
  setAnnouncements: Dispatch<SetStateAction<AnnouncementItem[]>>;
};

const PROJECTOR_SCENE_STORAGE_KEY = 'jamc_projector_scene';
const PROJECTOR_SCENE_SYNC_TYPE = 'jamc-projector-scene-sync';
const PROJECTOR_WINDOW_NAME = 'projector_output';

const AUDIENCE_OPTIONS: Array<{ value: NonNullable<AnnouncementItem['audience']>; label: string }> = [
  { value: 'church-wide', label: 'Church Wide' },
  { value: 'youth', label: 'Youth' },
  { value: 'kids', label: 'Kids' },
  { value: 'leaders', label: 'Leaders' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'visitors', label: 'Visitors' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS: Array<{ value: NonNullable<AnnouncementItem['category']>; label: string }> = [
  { value: 'event', label: 'Event' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'service-update', label: 'Service Update' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'special', label: 'Special' },
];

const PRIORITY_OPTIONS: Array<{ value: NonNullable<AnnouncementItem['priority']>; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'featured', label: 'Featured' },
];

const QUICK_TEMPLATES: Array<Pick<AnnouncementItem, 'title' | 'category' | 'audience' | 'priority'>> = [
  { title: 'Sunday Service Reminder', category: 'service-update', audience: 'church-wide', priority: 'high' },
  { title: 'Youth Event Announcement', category: 'event', audience: 'youth', priority: 'featured' },
  { title: 'Birthday Celebrants', category: 'birthday', audience: 'church-wide', priority: 'normal' },
  { title: 'Volunteer Call', category: 'ministry', audience: 'volunteers', priority: 'high' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createAnnouncement = (): AnnouncementItem => ({
  id: createId(),
  title: 'New Announcement',
  eventDate: new Date().toISOString().slice(0, 10),
  eventTime: '',
  venue: '',
  audience: 'church-wide',
  category: 'event',
  priority: 'normal',
  isPublished: true,
  shortText: '',
  body: '',
  contactPerson: '',
  updatedAt: new Date().toISOString(),
});

const duplicateAnnouncement = (announcement: AnnouncementItem): AnnouncementItem => ({
  ...announcement,
  id: createId(),
  title: `${announcement.title} Copy`,
  updatedAt: new Date().toISOString(),
});

const buildAnnouncementProjectorPayload = (announcement: AnnouncementItem) => ({
  mode: 'announcement',
  payload: {
    id: announcement.id,
    title: announcement.title,
    shortText: announcement.shortText || '',
    body: announcement.body || '',
    eventDate: announcement.eventDate || '',
    eventTime: announcement.eventTime || '',
    venue: announcement.venue || '',
    audience: announcement.audience || 'church-wide',
    contactPerson: announcement.contactPerson || '',
    priority: announcement.priority || 'normal',
    updatedAt: Date.now(),
  },
});

export default function AnnouncementManager() {
  const { announcements, setAnnouncements } = useOutletContext<AnnouncementContext>();
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(announcements[0]?.id ?? '');

  const selectedAnnouncement = useMemo(
    () => announcements.find((item) => item.id === selectedAnnouncementId) ?? announcements[0] ?? null,
    [announcements, selectedAnnouncementId]
  );

  const updateAnnouncement = (id: string, patch: Partial<AnnouncementItem>) => {
    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const publishedCount = announcements.filter((item) => item.isPublished).length;
  const featuredCount = announcements.filter((item) => item.priority === 'featured').length;
  const upcomingCount = announcements.filter((item) => item.eventDate).length;

  const pushAnnouncementToProjector = (announcement: AnnouncementItem, shouldOpen = false) => {
    const scene = buildAnnouncementProjectorPayload(announcement);
    localStorage.setItem(PROJECTOR_SCENE_STORAGE_KEY, JSON.stringify(scene));

    if (shouldOpen) {
      const projectorWindow = window.open(
        '/projector?fs=1',
        PROJECTOR_WINDOW_NAME,
        'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
      );

      projectorWindow?.focus();
      window.setTimeout(() => {
        projectorWindow?.postMessage({ type: PROJECTOR_SCENE_SYNC_TYPE, payload: scene }, window.location.origin);
      }, 500);
      return;
    }

    window.postMessage({ type: PROJECTOR_SCENE_SYNC_TYPE, payload: scene }, window.location.origin);
  };

  const clearAnnouncementFromProjector = () => {
    const scene = {
      mode: 'lyrics',
      payload: null,
      updatedAt: Date.now(),
    };

    localStorage.setItem(PROJECTOR_SCENE_STORAGE_KEY, JSON.stringify(scene));
    window.postMessage({ type: PROJECTOR_SCENE_SYNC_TYPE, payload: scene }, window.location.origin);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="rounded-[2.25rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Church Notices</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
              <Megaphone className="h-8 w-8 text-rose-500" />
              Announcement Manager
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Prepare slide-ready church announcements with event details, teaser text, body copy, audience targeting, and publish controls.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const next = createAnnouncement();
                setAnnouncements((prev) => [next, ...prev]);
                setSelectedAnnouncementId(next.id);
              }}
              className="flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-rose-600"
            >
              <Plus className="h-4 w-4" />
              New Announcement
            </button>
            {selectedAnnouncement && (
              <button
                type="button"
                onClick={() => {
                  const copy = duplicateAnnouncement(selectedAnnouncement);
                  setAnnouncements((prev) => [copy, ...prev]);
                  setSelectedAnnouncementId(copy.id);
                }}
                className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <CopyPlus className="h-4 w-4" />
                Duplicate
              </button>
            )}
            {selectedAnnouncement && (
              <button
                type="button"
                onClick={() => pushAnnouncementToProjector(selectedAnnouncement)}
                className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                <Presentation className="h-4 w-4" />
                Show on Projector
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Published</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <Send className="h-6 w-6 text-rose-500" />
            {publishedCount}
          </p>
        </div>
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Featured</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <Star className="h-6 w-6 text-amber-500" />
            {featuredCount}
          </p>
        </div>
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">With Dates</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <CalendarRange className="h-6 w-6 text-cyan-500" />
            {upcomingCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Announcement List</p>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                {announcements.length}
              </span>
            </div>

            <div className="space-y-3">
              {announcements.map((item) => {
                const isActive = item.id === selectedAnnouncement?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAnnouncementId(item.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {item.eventDate || 'No date yet'}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {PRIORITY_OPTIONS.find((option) => option.value === item.priority)?.label}
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
                  key={`${template.title}-${template.audience}`}
                  type="button"
                  onClick={() => {
                    const next = createAnnouncement();
                    next.title = template.title;
                    next.category = template.category;
                    next.audience = template.audience;
                    next.priority = template.priority;
                    setAnnouncements((prev) => [next, ...prev]);
                    setSelectedAnnouncementId(next.id);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{template.title}</span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {AUDIENCE_OPTIONS.find((option) => option.value === template.audience)?.label}
                    </span>
                  </span>
                  <Sparkles className="h-4 w-4 text-rose-500" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selectedAnnouncement && (
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Announcement Details</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Write one version for screen teaser and one for the full church slide.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pushAnnouncementToProjector(selectedAnnouncement, true)}
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Projector
                  </button>
                  <button
                    type="button"
                    onClick={clearAnnouncementFromProjector}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    Clear Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncements((prev) => prev.filter((item) => item.id !== selectedAnnouncement.id));
                      const fallback = announcements.find((item) => item.id !== selectedAnnouncement.id);
                      setSelectedAnnouncementId(fallback?.id ?? '');
                    }}
                    className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Announcement Title</span>
                  <input
                    type="text"
                    value={selectedAnnouncement.title}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { title: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Published</span>
                  <button
                    type="button"
                    onClick={() => updateAnnouncement(selectedAnnouncement.id, { isPublished: !selectedAnnouncement.isPublished })}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                      selectedAnnouncement.isPublished
                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                  >
                    {selectedAnnouncement.isPublished ? 'Published' : 'Draft'}
                  </button>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Event Date</span>
                  <input
                    type="date"
                    value={selectedAnnouncement.eventDate || ''}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { eventDate: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Event Time</span>
                  <input
                    type="time"
                    value={selectedAnnouncement.eventTime || ''}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { eventTime: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Venue</span>
                  <input
                    type="text"
                    value={selectedAnnouncement.venue || ''}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { venue: e.target.value })}
                    placeholder="Church hall / sanctuary"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Audience</span>
                  <select
                    value={selectedAnnouncement.audience || 'church-wide'}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { audience: e.target.value as AnnouncementItem['audience'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Category</span>
                  <select
                    value={selectedAnnouncement.category || 'event'}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { category: e.target.value as AnnouncementItem['category'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Priority</span>
                  <select
                    value={selectedAnnouncement.priority || 'normal'}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { priority: e.target.value as AnnouncementItem['priority'] })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Contact Person</span>
                  <input
                    type="text"
                    value={selectedAnnouncement.contactPerson || ''}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { contactPerson: e.target.value })}
                    placeholder="Coordinator / ministry head"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="mb-3 flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-rose-500" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Short Teaser</p>
                  </div>
                  <textarea
                    value={selectedAnnouncement.shortText || ''}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { shortText: e.target.value })}
                    rows={5}
                    placeholder="One short teaser for lower third, quick card, or rotating notice"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>

                <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="mb-3 flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-rose-500" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Full Slide Body</p>
                  </div>
                  <textarea
                    value={selectedAnnouncement.body || ''}
                    onChange={(e) => updateAnnouncement(selectedAnnouncement.id, { body: e.target.value })}
                    rows={8}
                    placeholder="Full announcement text for Sunday slide, presenter notes, or social media caption"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
