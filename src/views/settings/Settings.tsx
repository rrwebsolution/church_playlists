import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Volume2,
  Headphones,
  Database,
  Save,
  Trash2,
  CheckCircle2,
  HardDrive,
  Folder,
  Music,
  FileText,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'general',    label: 'General',      icon: User },
  { id: 'playback',   label: 'Playback',     icon: Volume2 },
  { id: 'audio',      label: 'Audio Output', icon: Headphones },
  { id: 'storage',    label: 'Storage',      icon: HardDrive },
  { id: 'danger',     label: 'Danger Zone',  icon: Database },
] as const;

export default function Settings() {
  const { setPlayHistory, folders = [] } = useOutletContext<any>();

  const storageStats = useMemo(() => {
    const bytes = new Blob([JSON.stringify(folders)]).size;
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const LIMIT_MB = 10;
    const usedPercent = Math.min((mb / LIMIT_MB) * 100, 100);
    const totalSongs = folders.reduce((acc: number, f: any) => acc + (f.songs?.length || 0), 0);
    const totalWithLyrics = folders.reduce((acc: number, f: any) =>
      acc + f.songs.filter((s: any) => s.lyrics || s.chords).length, 0);
    return { bytes, kb, mb, usedPercent, totalSongs, totalWithLyrics, LIMIT_MB };
  }, [folders]);

  const [churchName, setChurchName] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [autoPlay, setAutoPlay] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [audioDevice, setAudioDevice] = useState('System Default Speakers');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem('worship_dj_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.churchName) setChurchName(parsed.churchName);
      if (parsed.operatorName) setOperatorName(parsed.operatorName);
      if (parsed.autoPlay !== undefined) setAutoPlay(parsed.autoPlay);
      if (parsed.crossfade !== undefined) setCrossfade(parsed.crossfade);
      if (parsed.showVideo !== undefined) setShowVideo(parsed.showVideo);
      if (parsed.audioDevice) setAudioDevice(parsed.audioDevice);
    }
  }, []);

  // IntersectionObserver — track which section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace('settings-', ''));
          }
        }
      },
      { threshold: 0.4 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSaveChanges = () => {
    setIsSaving(true);
    localStorage.setItem('worship_dj_settings', JSON.stringify({
      churchName, operatorName, autoPlay, crossfade, showVideo, audioDevice
    }));
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear the play history? This cannot be undone.')) {
      setPlayHistory([]);
      localStorage.removeItem('worship_play_history');
    }
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setChurchName('');
      setOperatorName('');
      setAutoPlay(true);
      setCrossfade(false);
      setShowVideo(true);
      setAudioDevice('System Default Speakers');
      localStorage.removeItem('worship_dj_settings');
    }
  };

  const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`shrink-0 w-12 h-6 rounded-full transition-colors relative shadow-inner ${value ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20" ref={scrollContainerRef as any}>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            System Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Configure your worship DJ system preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-500 uppercase tracking-widest animate-in fade-in zoom-in">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-70"
          >
            {isSaving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* LEFT: NAV */}
        <div className="md:sticky md:top-6 self-start space-y-1">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4 mb-3">Categories</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            const isDanger = id === 'danger';
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? isDanger
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </button>
            );
          })}
        </div>

        {/* RIGHT: SECTIONS */}
        <div className="md:col-span-2 space-y-6">

          {/* GENERAL */}
          <div
            id="settings-general"
            ref={(el) => { sectionRefs.current['general'] = el; }}
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

          {/* PLAYBACK */}
          <div
            id="settings-playback"
            ref={(el) => { sectionRefs.current['playback'] = el; }}
            className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm dark:shadow-none transition-colors scroll-mt-6"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Playback Preferences
            </h3>
            {[
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
            ].map(({ label, desc, value, toggle }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-500 font-medium">{desc}</p>
                </div>
                <Toggle value={value} onToggle={toggle} />
              </div>
            ))}
          </div>

          {/* AUDIO OUTPUT */}
          <div
            id="settings-audio"
            ref={(el) => { sectionRefs.current['audio'] = el; }}
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
                <option value="System Default Speakers">System Default Speakers</option>
                <option value="Focusrite USB Audio (Mixer Out)">Focusrite USB Audio (Mixer Out)</option>
                <option value="Behringer X32 (Asio Driver)">Behringer X32 (Asio Driver)</option>
                <option value="Realtek High Definition Audio">Realtek High Definition Audio</option>
              </select>
            </div>
          </div>

          {/* STORAGE */}
          <div
            id="settings-storage"
            ref={(el) => { sectionRefs.current['storage'] = el; }}
            className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-none transition-colors overflow-hidden relative scroll-mt-6"
          >
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: storageStats.usedPercent > 80 ? 'rgba(239,68,68,0.07)' : storageStats.usedPercent > 50 ? 'rgba(234,179,8,0.07)' : 'rgba(99,102,241,0.07)' }}
            />

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                <HardDrive className={`w-4 h-4 ${storageStats.usedPercent > 80 ? 'text-red-500' : storageStats.usedPercent > 50 ? 'text-amber-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                Storage Monitor
              </h3>
              {storageStats.usedPercent > 80 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Low Space</span>
                </div>
              )}
            </div>

            {storageStats.usedPercent >= 100 && (
              <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 animate-in fade-in duration-500">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
                <p className="text-xs text-red-600 dark:text-red-400 font-bold">Storage limit reached — please delete some folders or songs to free up space.</p>
              </div>
            )}

            <div className="mb-5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black tabular-nums text-zinc-800 dark:text-zinc-100">
                  {storageStats.mb >= 1 ? `${storageStats.mb.toFixed(2)} MB` : `${storageStats.kb.toFixed(1)} KB`}
                </span>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">/ {storageStats.LIMIT_MB} MB limit</span>
              </div>
              <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${storageStats.usedPercent > 80 ? 'bg-red-500' : storageStats.usedPercent > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${storageStats.usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className={`text-[10px] font-black tabular-nums uppercase tracking-wider ${storageStats.usedPercent > 80 ? 'text-red-500' : storageStats.usedPercent > 50 ? 'text-amber-500' : 'text-indigo-500'}`}>
                  {storageStats.usedPercent.toFixed(1)}% used
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {(storageStats.LIMIT_MB - storageStats.mb).toFixed(2)} MB free
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {[
                { icon: Folder, label: 'Folders', value: folders.length },
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

          {/* DANGER ZONE */}
          <div
            id="settings-danger"
            ref={(el) => { sectionRefs.current['danger'] = el; }}
            className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-3xl p-6 md:p-8 transition-colors scroll-mt-6"
          >
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2 uppercase tracking-wider mb-2">
              <Database className="w-4 h-4" /> Danger Zone
            </h3>
            <p className="text-xs text-red-500/70 dark:text-zinc-500 mb-6 font-medium">
              These actions are permanent and cannot be undone. Please be careful.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Clear Play History
              </button>
              <button
                onClick={handleResetSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                Reset All Settings
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
