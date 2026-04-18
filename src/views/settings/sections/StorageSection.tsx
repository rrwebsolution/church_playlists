import { HardDrive, Folder, Music, FileText, AlertTriangle } from 'lucide-react';

interface StorageStats {
  kb: number;
  mb: number;
  usedPercent: number;
  totalSongs: number;
  totalWithLyrics: number;
  LIMIT_MB: number;
}

interface Props {
  sectionRef: (el: HTMLDivElement | null) => void;
  storageStats: StorageStats;
  foldersCount: number;
}

export default function StorageSection({ sectionRef, storageStats, foldersCount }: Props) {
  const color =
    storageStats.usedPercent > 80 ? 'text-red-500' :
    storageStats.usedPercent > 50 ? 'text-amber-500' :
    'text-indigo-600 dark:text-indigo-400';

  const barColor =
    storageStats.usedPercent > 80 ? 'bg-red-500' :
    storageStats.usedPercent > 50 ? 'bg-amber-500' :
    'bg-indigo-500';

  const glowColor =
    storageStats.usedPercent > 80 ? 'rgba(239,68,68,0.07)' :
    storageStats.usedPercent > 50 ? 'rgba(234,179,8,0.07)' :
    'rgba(99,102,241,0.07)';

  return (
    <div
      id="settings-storage"
      ref={sectionRef}
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-none transition-colors overflow-hidden relative scroll-mt-6"
    >
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: glowColor }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider`}>
          <HardDrive className={`w-4 h-4 ${color}`} />
          Storage Monitor
        </h3>
        {storageStats.usedPercent > 80 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Low Space</span>
          </div>
        )}
      </div>

      {/* Alert banner at 100% */}
      {storageStats.usedPercent >= 100 && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 animate-in fade-in duration-500">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
          <p className="text-xs text-red-600 dark:text-red-400 font-bold">Storage limit reached — please delete some folders or songs to free up space.</p>
        </div>
      )}

      {/* Usage */}
      <div className="mb-5">
        <div className="flex justify-between items-end mb-2">
          <span className="text-3xl font-black tabular-nums text-zinc-800 dark:text-zinc-100">
            {storageStats.mb >= 1 ? `${storageStats.mb.toFixed(2)} MB` : `${storageStats.kb.toFixed(1)} KB`}
          </span>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">/ {storageStats.LIMIT_MB} MB limit</span>
        </div>
        <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${storageStats.usedPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className={`text-[10px] font-black tabular-nums uppercase tracking-wider ${color}`}>
            {storageStats.usedPercent.toFixed(1)}% used
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">
            {(storageStats.LIMIT_MB - storageStats.mb).toFixed(2)} MB free
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        {[
          { icon: Folder, label: 'Folders', value: foldersCount },
          { icon: Music, label: 'Songs', value: storageStats.totalSongs },
          { icon: FileText, label: 'With Lyrics', value: storageStats.totalWithLyrics },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
            <Icon className="w-4 h-4 text-zinc-400" />
            <span className="text-lg font-black text-zinc-700 dark:text-zinc-200 tabular-nums">{value}</span>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
