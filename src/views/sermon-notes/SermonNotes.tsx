import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BookOpenText,
  CopyPlus,
  Cross,
  ListChecks,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { SermonNote, SermonOutlinePoint, SermonVerse } from '../types';

type SermonContext = {
  sermonNotes: SermonNote[];
  setSermonNotes: Dispatch<SetStateAction<SermonNote[]>>;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createNewSermon = (): SermonNote => ({
  id: createId(),
  title: 'New Sermon',
  serviceDate: new Date().toISOString().slice(0, 10),
  speaker: '',
  series: '',
  mainText: '',
  keyIdea: '',
  openingPrayer: '',
  closingPrayer: '',
  altarCall: '',
  notes: '',
  outline: [
    { id: createId(), heading: 'Introduction', details: '' },
    { id: createId(), heading: 'Main Point 1', details: '' },
  ],
  verses: [{ id: createId(), reference: '', text: '' }],
  actionSteps: [''],
  updatedAt: new Date().toISOString(),
});

const duplicateSermon = (note: SermonNote): SermonNote => ({
  ...note,
  id: createId(),
  title: `${note.title} Copy`,
  updatedAt: new Date().toISOString(),
  outline: note.outline.map((point) => ({ ...point, id: createId() })),
  verses: note.verses.map((verse) => ({ ...verse, id: createId() })),
  actionSteps: [...note.actionSteps],
});

export default function SermonNotes() {
  const { sermonNotes, setSermonNotes } = useOutletContext<SermonContext>();
  const [selectedSermonId, setSelectedSermonId] = useState(sermonNotes[0]?.id ?? '');

  const selectedSermon = useMemo(
    () => sermonNotes.find((note) => note.id === selectedSermonId) ?? sermonNotes[0] ?? null,
    [sermonNotes, selectedSermonId]
  );

  const updateSermon = (updater: (note: SermonNote) => SermonNote) => {
    if (!selectedSermon) return;

    setSermonNotes((prev) =>
      prev.map((note) =>
        note.id === selectedSermon.id
          ? {
              ...updater(note),
              updatedAt: new Date().toISOString(),
            }
          : note
      )
    );
  };

  const updateOutlinePoint = (pointId: string, patch: Partial<SermonOutlinePoint>) => {
    updateSermon((note) => ({
      ...note,
      outline: note.outline.map((point) => (point.id === pointId ? { ...point, ...patch } : point)),
    }));
  };

  const updateVerse = (verseId: string, patch: Partial<SermonVerse>) => {
    updateSermon((note) => ({
      ...note,
      verses: note.verses.map((verse) => (verse.id === verseId ? { ...verse, ...patch } : verse)),
    }));
  };

  const updateActionStep = (index: number, value: string) => {
    updateSermon((note) => ({
      ...note,
      actionSteps: note.actionSteps.map((step, stepIndex) => (stepIndex === index ? value : step)),
    }));
  };

  const createSermon = () => {
    const newSermon = createNewSermon();
    setSermonNotes((prev) => [newSermon, ...prev]);
    setSelectedSermonId(newSermon.id);
  };

  const outlineCount = selectedSermon?.outline.length ?? 0;
  const verseCount = selectedSermon?.verses.filter((verse) => verse.reference.trim()).length ?? 0;
  const actionCount = selectedSermon?.actionSteps.filter((step) => step.trim()).length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Preaching Desk</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <BookOpenText className="h-8 w-8 text-emerald-500" />
            Sermon Notes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Prepare outlines, verses, prayers, altar call notes, and response steps for each sermon message.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={createSermon}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            New Sermon
          </button>
          {selectedSermon && (
            <button
              type="button"
              onClick={() => {
                const copy = duplicateSermon(selectedSermon);
                setSermonNotes((prev) => [copy, ...prev]);
                setSelectedSermonId(copy.id);
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
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Message Library</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                {sermonNotes.length}
              </span>
            </div>

            <div className="space-y-3">
              {sermonNotes.map((note) => {
                const isActive = note.id === selectedSermon?.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedSermonId(note.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{note.title}</p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{note.serviceDate || 'No date'}</p>
                    <p className="mt-1 truncate text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {note.speaker || 'No speaker yet'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSermon && (
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Outline Points</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{outlineCount}</p>
              </div>
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Verses</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{verseCount}</p>
              </div>
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Action Steps</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{actionCount}</p>
              </div>
            </div>
          )}
        </aside>

        {selectedSermon && (
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Sermon Title</span>
                  <input
                    type="text"
                    value={selectedSermon.title}
                    onChange={(e) => updateSermon((note) => ({ ...note, title: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Date</span>
                  <input
                    type="date"
                    value={selectedSermon.serviceDate}
                    onChange={(e) => updateSermon((note) => ({ ...note, serviceDate: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Speaker</span>
                  <input
                    type="text"
                    value={selectedSermon.speaker || ''}
                    onChange={(e) => updateSermon((note) => ({ ...note, speaker: e.target.value }))}
                    placeholder="Pastor / Preacher"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Series</span>
                  <input
                    type="text"
                    value={selectedSermon.series || ''}
                    onChange={(e) => updateSermon((note) => ({ ...note, series: e.target.value }))}
                    placeholder="Series title"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Main Text</span>
                  <input
                    type="text"
                    value={selectedSermon.mainText || ''}
                    onChange={(e) => updateSermon((note) => ({ ...note, mainText: e.target.value }))}
                    placeholder="e.g. John 3:16"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Big Idea</span>
                  <input
                    type="text"
                    value={selectedSermon.keyIdea || ''}
                    onChange={(e) => updateSermon((note) => ({ ...note, keyIdea: e.target.value }))}
                    placeholder="Main truth of the message"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Sermon Outline</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Build your intro, core points, and application.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateSermon((note) => ({
                        ...note,
                        outline: [...note.outline, { id: createId(), heading: 'New Point', details: '' }],
                      }))
                    }
                    className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    <Plus className="h-4 w-4" />
                    Add Point
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedSermon.outline.map((point, index) => (
                    <div key={point.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Point {index + 1}</p>
                        <button
                          type="button"
                          onClick={() =>
                            updateSermon((note) => ({
                              ...note,
                              outline: note.outline.filter((item) => item.id !== point.id),
                            }))
                          }
                          className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={point.heading}
                        onChange={(e) => updateOutlinePoint(point.id, { heading: e.target.value })}
                        placeholder="Point heading"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <textarea
                        value={point.details || ''}
                        onChange={(e) => updateOutlinePoint(point.id, { details: e.target.value })}
                        placeholder="Explanation, illustration, or application"
                        rows={4}
                        className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Bible Verses</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Store the references and ready-to-read text.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSermon((note) => ({
                          ...note,
                          verses: [...note.verses, { id: createId(), reference: '', text: '' }],
                        }))
                      }
                      className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add Verse
                    </button>
                  </div>

                  <div className="space-y-4">
                    {selectedSermon.verses.map((verse) => (
                      <div key={verse.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <ScrollText className="h-4 w-4 text-emerald-500" />
                          <button
                            type="button"
                            onClick={() =>
                              updateSermon((note) => ({
                                ...note,
                                verses: note.verses.filter((item) => item.id !== verse.id),
                              }))
                            }
                            className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={verse.reference}
                          onChange={(e) => updateVerse(verse.id, { reference: e.target.value })}
                          placeholder="Reference"
                          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                        <textarea
                          value={verse.text || ''}
                          onChange={(e) => updateVerse(verse.id, { text: e.target.value })}
                          placeholder="Verse text"
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Prayer And Response</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Keep ministry moments ready and organized.</p>
                    </div>
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={selectedSermon.openingPrayer || ''}
                      onChange={(e) => updateSermon((note) => ({ ...note, openingPrayer: e.target.value }))}
                      placeholder="Opening prayer notes"
                      rows={3}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                    <textarea
                      value={selectedSermon.closingPrayer || ''}
                      onChange={(e) => updateSermon((note) => ({ ...note, closingPrayer: e.target.value }))}
                      placeholder="Closing prayer notes"
                      rows={3}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                    <textarea
                      value={selectedSermon.altarCall || ''}
                      onChange={(e) => updateSermon((note) => ({ ...note, altarCall: e.target.value }))}
                      placeholder="Altar call or invitation"
                      rows={4}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Preacher Notes</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add illustrations, transitions, and last-minute reminders.</p>
                  </div>
                  <Cross className="h-5 w-5 text-emerald-500" />
                </div>
                <textarea
                  value={selectedSermon.notes || ''}
                  onChange={(e) => updateSermon((note) => ({ ...note, notes: e.target.value }))}
                  placeholder="Full sermon notes, stories, transition lines, or reminders for delivery"
                  rows={12}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Action Steps</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Leave the church with clear next steps.</p>
                  </div>
                  <ListChecks className="h-5 w-5 text-emerald-500" />
                </div>

                <div className="space-y-3">
                  {selectedSermon.actionSteps.map((step, index) => (
                    <div key={`${selectedSermon.id}-step-${index}`} className="flex gap-2">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => updateActionStep(index, e.target.value)}
                        placeholder={`Action step ${index + 1}`}
                        className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateSermon((note) => ({
                            ...note,
                            actionSteps: note.actionSteps.filter((_, stepIndex) => stepIndex !== index),
                          }))
                        }
                        className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateSermon((note) => ({
                      ...note,
                      actionSteps: [...note.actionSteps, ''],
                    }))
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <Plus className="h-4 w-4" />
                  Add Action Step
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
