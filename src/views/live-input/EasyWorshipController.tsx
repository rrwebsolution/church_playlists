import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Send, Trash2, Presentation, LayoutGrid, FileText, Bookmark, Settings2, GripHorizontal, X, ExternalLink, Sparkles, CloudRain
} from 'lucide-react';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  customClass: { container: 'z-[99999]' }
});

interface SavedItem {
  id: string;
  title: string;
  text: string;
  date: string;
}

type BackgroundType = 'none' | 'praise' | 'worship';

export default function EasyWorshipController() {
  const [inputTitle, setInputTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [previewFontSize, setPreviewFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [showMonitor, setShowMonitor] = useState(true);
  const nodeRef = useRef(null);

  // Load saved archives gikan sa memory
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('jamc_saved_live_texts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('jamc_saved_live_texts', JSON.stringify(savedItems));
  }, [savedItems]);

  // --- BROADCAST FUNCTION (LOCALSTORAGE FOR OBS SYNC) ---
  const broadcastData = (text: string, size: number, bg: BackgroundType) => {
    const data = { 
      text, 
      fontSize: size, 
      background: bg,
      timestamp: Date.now() // Trigger storage event bisag same text
    };
    localStorage.setItem('jamc_live_display', JSON.stringify(data));
    setLiveText(text);
  };

  // Auto-sync kung naay usbon sa settings (Font/BG)
  useEffect(() => {
    broadcastData(liveText, previewFontSize, bgType);
  }, [previewFontSize, bgType]);

  const handleLaunchProjector = () => {
    window.open('/projector', 'WorshipProjector', 'width=1280,height=720,menubar=no,toolbar=no');
    Toast.fire({ icon: 'success', title: 'Projector window opened!' });
  };

  const handleGoLive = () => {
    if (!inputText.trim()) return;
    broadcastData(inputText.trim(), previewFontSize, bgType);
    Toast.fire({ icon: 'success', title: 'Sent to Live Screens!' });
  };

  const handleClearScreen = () => broadcastData("", previewFontSize, bgType);
  const handleClearInput = () => { setInputTitle(""); setInputText(""); };

  const handleSaveText = () => {
    if (!inputText.trim()) return;
    const newItem: SavedItem = { 
        id: Date.now().toString(), 
        title: inputTitle.trim() || 'Untitled Document', 
        text: inputText.trim(), 
        date: new Date().toLocaleDateString() 
    };
    setSavedItems(prev => [newItem, ...prev]);
    Toast.fire({ icon: 'success', title: 'Saved to Library!' });
  };

  const handleDeleteSaved = (id: string) => setSavedItems(prev => prev.filter(item => item.id !== id));

  const handleLoadSaved = (item: SavedItem) => {
    setInputTitle(item.title);
    setInputText(item.text);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const quickSlides = useMemo(() => {
    if (!inputText.trim()) return [];
    return inputText.split(/\n\s*\n/).map(block => {
      const lines = block.trim().split('\n');
      const firstLine = lines[0].trim();
      const headerRegex = /^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Tag|Ending|Instrumental)[^\]]*\]?:?$/i;
      if (headerRegex.test(firstLine) && lines.length > 1) {
        return { label: firstLine.replace(/[\[\]:]/g, '').toUpperCase(), text: lines.slice(1).join('\n').trim() };
      }
      return { label: null, text: block.trim() };
    }).filter(b => b.text.length > 0);
  }, [inputText]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen">
      
      {/* --- HEADER: Label on Left | Launch on Right --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500 text-white rounded-3xl shadow-xl shadow-indigo-500/20">
            <Presentation className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase italic">
              EasyWorship
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${liveText ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-zinc-400'}`} />
              <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-none">
                {liveText ? 'Live Broadcast' : 'System Standby'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {!showMonitor && (
              <button onClick={() => setShowMonitor(true)} className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all border border-zinc-200 dark:border-zinc-700">Show Preview</button>
            )}
            <button onClick={handleLaunchProjector} className="flex items-center gap-2 px-6 py-3.5 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                <ExternalLink className="w-4 h-4" /> Launch Projector
            </button>
        </div>
      </div>

      {/* --- DRAGGABLE FLOATING MONITOR --- */}
      {showMonitor && (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
          <div ref={nodeRef} className="fixed top-24 right-8 z-100 w-full max-w-85 bg-zinc-950 p-4 rounded-[2.5rem] border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center justify-between px-2 cursor-move drag-handle">
                <div className="flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4 text-zinc-700" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Live Sync Monitor</span>
                </div>
                <button onClick={() => setShowMonitor(false)} className="text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            
            {/* Screen with Animations */}
            <div className={`aspect-video w-full rounded-2xl flex items-center justify-center p-6 border border-zinc-900 overflow-hidden relative transition-all duration-1000 ${bgType === 'praise' ? 'bg-indigo-900 animate-pulse' : bgType === 'worship' ? 'bg-zinc-900' : 'bg-black'}`}>
                <p className="text-white text-center font-bold leading-tight whitespace-pre-wrap select-none" style={{ fontSize: `${previewFontSize * 0.25}px` }}>
                    {liveText || <span className="text-white/10 italic text-[10px] tracking-[0.4em]">NO SIGNAL</span>}
                </p>
            </div>

            <div className="space-y-4 px-1">
                <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => setBgType('none')} className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${bgType === 'none' ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>Black</button>
                   <button onClick={() => setBgType('praise')} className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1 ${bgType === 'praise' ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}><Sparkles className="w-2.5 h-2.5" /> Praise</button>
                   <button onClick={() => setBgType('worship')} className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1 ${bgType === 'worship' ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}><CloudRain className="w-2.5 h-2.5" /> Worship</button>
                </div>
                <div className="flex items-center gap-3">
                  <Settings2 className="w-3 h-3 text-zinc-600" />
                  <input type="range" min="20" max="150" value={previewFontSize} onChange={(e) => setPreviewFontSize(parseInt(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-indigo-500" />
                  <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{previewFontSize}px</span>
                </div>
            </div>
          </div>
        </Draggable>
      )}

      {/* --- MAIN GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Editor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-7 shadow-sm">
            <div className="flex justify-between items-center mb-6 px-1">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Studio Editor
              </label>
              <button onClick={handleClearInput} className="text-zinc-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-5 h-5" /></button>
            </div>

            <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="Title / Verse Reference" className="w-full mb-4 px-6 py-4 bg-zinc-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none text-zinc-900 dark:text-zinc-100 font-bold" />
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste lyrics here..." className="w-full h-72 p-6 bg-zinc-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none text-zinc-800 dark:text-zinc-100 font-semibold text-base resize-none custom-scrollbar" />

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button onClick={handleGoLive} className="col-span-2 flex items-center justify-center gap-3 py-4 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-600 transition-all"><Send className="w-5 h-5" /> Broadcast Now</button>
              <button onClick={handleSaveText} className="flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-zinc-800 text-indigo-500 border border-indigo-100 dark:border-indigo-800 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all">Save Library</button>
              <button onClick={handleClearScreen} className="flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-zinc-800 text-red-500 border border-red-100 dark:border-red-800 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all">Clear Output</button>
            </div>
          </div>
        </div>

        {/* Right: Quick Slides */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-7 shadow-sm min-h-150 flex flex-col">
            <div className="flex justify-between items-center mb-8 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg"><LayoutGrid className="w-5 h-5 text-indigo-500" /></div>
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-200">Quick Slides</h2>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-white/5 px-4 py-1.5 rounded-full uppercase border border-zinc-200 dark:border-white/5">{quickSlides.length} Items</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-162.5 overflow-y-auto custom-scrollbar p-2">
              {quickSlides.length === 0 ? (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-center opacity-30 px-10">
                  <Presentation className="w-12 h-12 text-zinc-400 mb-4" />
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Editor Ready</p>
                </div>
              ) : (
                quickSlides.map((slide, index) => {
                  const isLive = liveText === slide.text;
                  return (
                    <button key={index} onClick={() => broadcastData(slide.text, previewFontSize, bgType)} className={`text-left p-6 rounded-[2rem] border-2 transition-all group relative flex flex-col items-start min-h-40 ${isLive ? 'border-red-500 bg-red-50/50 dark:bg-red-500/10 ring-4 ring-red-500/10 scale-[1.03] z-10 shadow-2xl' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 hover:border-indigo-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-xl'}`}>
                      <div className="flex items-center justify-between w-full mb-4">
                        {slide.label ? <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm bg-indigo-500 text-white">{slide.label}</span> : <span className="h-6"></span>}
                        {isLive && <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse shadow-lg"><span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE</div>}
                      </div>
                      <p className={`whitespace-pre-wrap text-[15px] md:text-[17px] font-bold leading-relaxed tracking-tight ${isLive ? 'text-red-900 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{slide.text}</p>
                      <span className="absolute bottom-3 right-5 text-[45px] font-black text-black/4 dark:text-white/4 italic select-none">{index + 1}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- SAVED ARCHIVES --- */}
      <div className="pt-12 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-4 mb-10 px-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl"><Bookmark className="w-6 h-6 text-indigo-500" /></div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase italic">Saved Archives</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="min-w-0">
                  <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg uppercase tracking-tight">{item.title}</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1 opacity-60">{item.date}</p>
                </div>
                <button onClick={() => handleDeleteSaved(item.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-all active:scale-90"><Trash2 className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-4 mb-8 flex-1 font-semibold leading-relaxed">{item.text}</p>
              <button onClick={() => handleLoadSaved(item)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-95">Restore to Editor</button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}