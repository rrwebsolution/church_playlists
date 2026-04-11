import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  User, 
  Volume2, 
  Monitor, 
  ShieldCheck, 
  Database, 
  Save,
  Trash2,
  Tv,
  CheckCircle2
} from 'lucide-react';

export default function Settings() {
  const { setPlayHistory } = useOutletContext<any>();

  // --- STATES PARA SA SETTINGS ---
  const [churchName, setChurchName] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [autoPlay, setAutoPlay] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [audioDevice, setAudioDevice] = useState('System Default Speakers');
  
  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // --- LOAD SAVED SETTINGS INIG ABLI SA PAGE ---
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

  // --- SAVE SETTINGS FUNCTION ---
  const handleSaveChanges = () => {
    setIsSaving(true);
    
    const newSettings = {
      churchName,
      operatorName,
      autoPlay,
      crossfade,
      showVideo,
      audioDevice
    };

    localStorage.setItem('worship_dj_settings', JSON.stringify(newSettings));

    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  // --- CLEAR HISTORY FUNCTION ---
  const handleClearHistory = () => {
    if (confirm("⚠️ Are you sure you want to completely clear the play history? This cannot be undone.")) {
      setPlayHistory([]); 
      localStorage.removeItem('worship_play_history'); 
      alert("Play history successfully cleared!");
    }
  };

  // --- RESET ALL SETTINGS FUNCTION ---
  const handleResetSettings = () => {
    if (confirm("⚠️ Are you sure you want to reset all settings to default?")) {
      setChurchName('');
      setOperatorName('');
      setAutoPlay(true);
      setCrossfade(false);
      setShowVideo(true);
      setAudioDevice('System Default Speakers');
      localStorage.removeItem('worship_dj_settings');
      alert("All settings have been reset to default.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            System Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Configure your worship DJ system preferences and integrations.</p>
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
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: NAVIGATION SHORTCUTS */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4 mb-2">Categories</p>
          {['General', 'Playback', 'Audio Output', 'Integrations', 'Advanced'].map((item, index) => (
            <button 
              key={item} 
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                index === 0 
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* RIGHT COLUMN: ACTUAL SETTINGS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* SECTION 1: PROFILE */}
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm dark:shadow-none transition-colors">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Church Profile
            </h3>
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1 uppercase tracking-wider">Church Name</label>
                <input 
                  type="text" 
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="e.g. Victory Church Main"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm dark:shadow-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1 uppercase tracking-wider">System Operator Name</label>
                <input 
                  type="text" 
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Media Head"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm dark:shadow-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PLAYBACK */}
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm dark:shadow-none transition-colors">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider mb-2">
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Playback Preferences
            </h3>
            
            <div className="flex items-center justify-between group">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Auto-play Next Track</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium">Automatically start the next track in the playlist folder.</p>
              </div>
              <button 
                onClick={() => setAutoPlay(!autoPlay)}
                className={`shrink-0 w-12 h-6 rounded-full transition-colors relative shadow-inner ${autoPlay ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${autoPlay ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Enable Crossfade</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium">Smoothly transition between worship songs (Live Mode).</p>
              </div>
              <button 
                onClick={() => setCrossfade(!crossfade)}
                className={`shrink-0 w-12 h-6 rounded-full transition-colors relative shadow-inner ${crossfade ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${crossfade ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Show Video Background</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium">Display the YouTube video in the background behind the playlist.</p>
              </div>
              <button 
                onClick={() => setShowVideo(!showVideo)}
                className={`shrink-0 w-12 h-6 rounded-full transition-colors relative shadow-inner ${showVideo ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${showVideo ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* SECTION 3: AUDIO OUTPUT */}
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm dark:shadow-none transition-colors">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Audio Device Integration
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1 uppercase tracking-wider">Primary Audio Interface</label>
              <select 
                value={audioDevice}
                onChange={(e) => setAudioDevice(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm dark:shadow-none"
              >
                <option value="System Default Speakers">System Default Speakers</option>
                <option value="Focusrite USB Audio (Mixer Out)">Focusrite USB Audio (Mixer Out)</option>
                <option value="Behringer X32 (Asio Driver)">Behringer X32 (Asio Driver)</option>
                <option value="Realtek High Definition Audio">Realtek High Definition Audio</option>
              </select>
            </div>
          </div>

          {/* SECTION 4: INTEGRATIONS */}
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm dark:shadow-none transition-colors">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
              <Tv className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> OBS Integration
            </h3>
            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 italic font-medium">Connected to OBS Websocket v5.x</span>
              </div>
              <button className="text-[10px] font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none uppercase tracking-wider active:scale-95">
                Disconnect
              </button>
            </div>
          </div>

          {/* SECTION 5: DANGER ZONE */}
          <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-3xl p-6 md:p-8 transition-colors">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2 uppercase tracking-wider mb-2">
              <Database className="w-4 h-4" /> Danger Zone
            </h3>
            <p className="text-xs text-red-500/70 dark:text-zinc-500 mb-6 font-medium">
              Once you delete history or reset settings, it cannot be undone. Please be careful.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Clear Play History
              </button>
              
              <button 
                onClick={handleResetSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none active:scale-95"
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