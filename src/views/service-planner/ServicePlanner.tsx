import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  CopyPlus,
  ListRestart,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ServicePlan, ServicePlanItem } from '../types';

type PlannerContext = {
  servicePlans: ServicePlan[];
  setServicePlans: Dispatch<SetStateAction<ServicePlan[]>>;
};

const ITEM_TYPES: Array<{ value: ServicePlanItem['type']; label: string }> = [
  { value: 'song', label: 'Song' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'offering', label: 'Offering' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'communion', label: 'Communion' },
  { value: 'special', label: 'Special Number' },
  { value: 'closing', label: 'Closing' },
];

const QUICK_TEMPLATES: Array<Pick<ServicePlanItem, 'title' | 'type' | 'durationMinutes'>> = [
  { title: 'Praise and Worship', type: 'song', durationMinutes: 20 },
  { title: 'Scripture Reading', type: 'special', durationMinutes: 5 },
  { title: 'Testimony Time', type: 'special', durationMinutes: 10 },
  { title: 'Communion', type: 'communion', durationMinutes: 10 },
  { title: 'Benediction', type: 'closing', durationMinutes: 3 },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const duplicatePlan = (plan: ServicePlan): ServicePlan => ({
  ...plan,
  id: createId(),
  title: `${plan.title} Copy`,
  updatedAt: new Date().toISOString(),
  items: plan.items.map((item) => ({ ...item, id: createId(), completed: false })),
});

export default function ServicePlanner() {
  const { servicePlans, setServicePlans } = useOutletContext<PlannerContext>();
  const [selectedPlanId, setSelectedPlanId] = useState(servicePlans[0]?.id ?? '');

  const selectedPlan = useMemo(
    () => servicePlans.find((plan) => plan.id === selectedPlanId) ?? servicePlans[0] ?? null,
    [servicePlans, selectedPlanId]
  );

  const updatePlan = (updater: (plan: ServicePlan) => ServicePlan) => {
    if (!selectedPlan) return;

    setServicePlans((prev) =>
      prev.map((plan) =>
        plan.id === selectedPlan.id
          ? {
              ...updater(plan),
              updatedAt: new Date().toISOString(),
            }
          : plan
      )
    );
  };

  const createPlan = () => {
    const newPlan: ServicePlan = {
      id: createId(),
      title: 'New Church Service',
      serviceDate: new Date().toISOString().slice(0, 10),
      theme: '',
      notes: '',
      updatedAt: new Date().toISOString(),
      items: [],
    };

    setServicePlans((prev) => [newPlan, ...prev]);
    setSelectedPlanId(newPlan.id);
  };

  const addItem = (partial?: Partial<ServicePlanItem>) => {
    updatePlan((plan) => ({
      ...plan,
      items: [
        ...plan.items,
        {
          id: createId(),
          title: partial?.title || 'New Segment',
          type: partial?.type || 'special',
          leader: partial?.leader || '',
          durationMinutes: partial?.durationMinutes || 5,
          notes: partial?.notes || '',
          completed: false,
        },
      ],
    }));
  };

  const updateItem = (itemId: string, patch: Partial<ServicePlanItem>) => {
    updatePlan((plan) => ({
      ...plan,
      items: plan.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    updatePlan((plan) => {
      const index = plan.items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= plan.items.length) return plan;

      const items = [...plan.items];
      const [item] = items.splice(index, 1);
      items.splice(nextIndex, 0, item);
      return { ...plan, items };
    });
  };

  const removeItem = (itemId: string) => {
    updatePlan((plan) => ({
      ...plan,
      items: plan.items.filter((item) => item.id !== itemId),
    }));
  };

  const totalMinutes = selectedPlan?.items.reduce((sum, item) => sum + (item.durationMinutes || 0), 0) ?? 0;
  const completedItems = selectedPlan?.items.filter((item) => item.completed).length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Church Flow</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            <ClipboardList className="h-8 w-8 text-indigo-500" />
            Service Program Planner
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Plan the full service flow with segments, leaders, durations, and quick templates for Sunday worship.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={createPlan}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
          {selectedPlan && (
            <button
              type="button"
              onClick={() => {
                const copy = duplicatePlan(selectedPlan);
                setServicePlans((prev) => [copy, ...prev]);
                setSelectedPlanId(copy.id);
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
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Saved Plans</p>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                {servicePlans.length}
              </span>
            </div>

            <div className="space-y-3">
              {servicePlans.map((plan) => {
                const isActive = plan.id === selectedPlan?.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{plan.title}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{plan.serviceDate || 'No date'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Quick Insert</p>
            <div className="space-y-2">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => addItem(template)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/70"
                >
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{template.title}</span>
                  <Plus className="h-4 w-4 text-indigo-500" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {selectedPlan && (
          <section className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:col-span-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Title</span>
                    <input
                      type="text"
                      value={selectedPlan.title}
                      onChange={(e) => updatePlan((plan) => ({ ...plan, title: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Date</span>
                    <input
                      type="date"
                      value={selectedPlan.serviceDate}
                      onChange={(e) => updatePlan((plan) => ({ ...plan, serviceDate: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Theme</span>
                    <input
                      type="text"
                      value={selectedPlan.theme || ''}
                      onChange={(e) => updatePlan((plan) => ({ ...plan, theme: e.target.value }))}
                      placeholder="e.g. Faith Over Fear"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Notes</span>
                    <input
                      type="text"
                      value={selectedPlan.notes || ''}
                      onChange={(e) => updatePlan((plan) => ({ ...plan, notes: e.target.value }))}
                      placeholder="Main reminder for the team"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Segments</p>
                  <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">{selectedPlan.items.length}</p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Est. Time</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <Clock3 className="h-6 w-6 text-indigo-500" />
                    {totalMinutes}m
                  </p>
                </div>
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Completed</p>
                  <p className="mt-2 flex items-center gap-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    {completedItems}/{selectedPlan.items.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Program Flow</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Arrange the exact order the operator will follow during the service.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addItem()}
                    className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePlan((plan) => ({
                        ...plan,
                        items: plan.items.map((item) => ({ ...item, completed: false })),
                      }))
                    }
                    className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <ListRestart className="h-4 w-4" />
                    Reset Checks
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {selectedPlan.items.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No service items yet.</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Use Add Item or Quick Insert to build the service flow.</p>
                  </div>
                )}

                {selectedPlan.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`rounded-[1.75rem] border p-4 transition ${
                      item.completed
                        ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50'
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, { completed: !item.completed })}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                            item.completed
                              ? 'border-emerald-300 bg-emerald-500 text-white'
                              : 'border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
                          }`}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Step {index + 1}</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                            {ITEM_TYPES.find((type) => type.value === item.type)?.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, -1)}
                          disabled={index === 0}
                          className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, 1)}
                          disabled={index === selectedPlan.items.length - 1}
                          className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        placeholder="Segment title"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, { type: e.target.value as ServicePlanItem['type'] })}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {ITEM_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.leader || ''}
                        onChange={(e) => updateItem(item.id, { leader: e.target.value })}
                        placeholder="Assigned leader / speaker"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.durationMinutes || 0}
                        onChange={(e) => updateItem(item.id, { durationMinutes: Number(e.target.value) })}
                        placeholder="Minutes"
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                    </div>

                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                      placeholder="Notes, verse references, transition cues, or technical reminders"
                      rows={3}
                      className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
