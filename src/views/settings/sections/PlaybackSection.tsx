import { Volume2 } from 'lucide-react';

interface Props {
  sectionRef: (el: HTMLDivElement | null) => void;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  crossfade: boolean;
  setCrossfade: (v: boolean) => void;
  showVideo: boolean;
  setShowVideo: (v: boolean) => void;
}

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`shrink-0 w-12 h-6 rounded-full transition-colors relative shadow-inner ${value ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

export default function PlaybackSection({ sectionRef, autoPlay, setAutoPlay, crossfade, setCrossfade, showVideo, setShowVideo }: Props) {
  const rows = [
    {
      label: 'Auto-play Next Track',
      desc: 'Automatically start the next track in the playlist folder.',
      value: autoPlay,
      toggle: () => setAutoPlay(!autoPlay),
    },
    {
      label: 'Enable Crossfade',
      desc: 'Smoothly transition between worship songs (Live Mode).',
      value: crossfade,
      toggle: () => setCrossfade(!crossfade),
    },
    {
      label: 'Show Video Background',
      desc: 'Display the YouTube video in the background behind the playlist.',
      value: showVideo,
      toggle: () => setShowVideo(!showVideo),
    },
  ];

  return (
    <div
      id="settings-playback"
      ref={sectionRef}
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm dark:shadow-none transition-colors scroll-mt-6"
    >
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
        <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Playback Preferences
      </h3>

      {rows.map(({ label, desc, value, toggle }) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{label}</p>
            <p className="text-xs text-zinc-500 font-medium">{desc}</p>
          </div>
          <Toggle value={value} onToggle={toggle} />
        </div>
      ))}
    </div>
  );
}
