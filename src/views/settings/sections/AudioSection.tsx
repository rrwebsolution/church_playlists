import { Headphones } from 'lucide-react';

interface Props {
  sectionRef: (el: HTMLDivElement | null) => void;
  audioDevice: string;
  setAudioDevice: (v: string) => void;
}

const AUDIO_DEVICES = [
  'System Default Speakers',
  'Focusrite USB Audio (Mixer Out)',
  'Behringer X32 (Asio Driver)',
  'Realtek High Definition Audio',
];

export default function AudioSection({ sectionRef, audioDevice, setAudioDevice }: Props) {
  return (
    <div
      id="settings-audio"
      ref={sectionRef}
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm dark:shadow-none transition-colors scroll-mt-6"
    >
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
        <Headphones className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Audio Output
      </h3>

      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1 uppercase tracking-wider">Primary Audio Interface</label>
        <select
          value={audioDevice}
          onChange={(e) => setAudioDevice(e.target.value)}
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
        >
          {AUDIO_DEVICES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-400 ml-1 font-medium">
          Note: Browser limitations prevent automatic audio routing. Select your device as a reference label only.
        </p>
      </div>
    </div>
  );
}
