import { User } from 'lucide-react';

interface Props {
  sectionRef: (el: HTMLDivElement | null) => void;
  churchName: string;
  setChurchName: (v: string) => void;
  operatorName: string;
  setOperatorName: (v: string) => void;
}

export default function GeneralSection({ sectionRef, churchName, setChurchName, operatorName, setOperatorName }: Props) {
  return (
    <div
      id="settings-general"
      ref={sectionRef}
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm dark:shadow-none transition-colors scroll-mt-6"
    >
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
        <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Church Profile
      </h3>

      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1 uppercase tracking-wider">Church Name</label>
        <input
          type="text"
          value={churchName}
          onChange={(e) => setChurchName(e.target.value)}
          placeholder="e.g. JAMC Tagoloan"
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1 uppercase tracking-wider">System Operator Name</label>
        <input
          type="text"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          placeholder="e.g. Media Head"
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>
  );
}
