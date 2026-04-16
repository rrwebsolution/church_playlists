import { useState, useEffect, useMemo, useRef } from 'react';
import { Presentation, Settings2, GripHorizontal, X, MonitorPlay } from 'lucide-react';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';
import instance from '../../plugin/axios'; 

// I-import ang separated components
import { EasyWorshipArchives } from './EasyWorshipArchives';
import { EasyWorshipSlides } from './EasyWorshipSlides';
import { EasyWorshipEditor } from './EasyWorshipEditor';

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

type BackgroundType = 'none' | 'praise' | 'worship' | 'green';

export default function EasyWorshipController() {
  const [inputTitle, setInputTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [liveText, setLiveText] = useState(""); 
  const [lastLiveText, setLastLiveText] = useState(""); 
  const [previewFontSize, setPreviewFontSize] = useState(90);
  const [bgType, setBgType] = useState<BackgroundType>('green');
  const [showMonitor, setShowMonitor] = useState(true);
  const [liveSlideIndex, setLiveSlideIndex] = useState<number | null>(null);
  const nodeRef = useRef(null);

  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('jamc_saved_live_texts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('jamc_saved_live_texts', JSON.stringify(savedItems));
  }, [savedItems]);

  // --- BROADCAST FUNCTION ---
  const broadcastData = async (text: string, size: number, bg: string) => {
    setLiveText(text); // UI update dayon
    
    const data = { text, fontSize: size, background: bg, updatedAt: Date.now() };
    
    // I-send sa Laravel (Himoa nga 'api/obs/update' kon naa sa api.php)
    await instance.post('/obs/update', data); 
};

  // --- QUICK SLIDE LOGIC ---
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

  // Real-time editor sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (liveSlideIndex !== null && quickSlides[liveSlideIndex]) {
        const updatedText = quickSlides[liveSlideIndex].text;
        if (updatedText !== liveText && liveText !== "") {
          broadcastData(updatedText, previewFontSize, bgType);
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [quickSlides, liveSlideIndex, liveText, previewFontSize, bgType]);

  useEffect(() => {
    if (liveText !== "") broadcastData(liveText, previewFontSize, bgType);
  }, [previewFontSize, bgType]);

  const handleSaveText = () => {
    if (!inputText.trim()) return;
    const newItem = { id: Date.now().toString(), title: inputTitle.trim() || 'Untitled Document', text: inputText.trim(), date: new Date().toLocaleDateString() };
    setSavedItems(prev => [newItem, ...prev]);
    Toast.fire({ icon: 'success', title: 'Saved to Library!' });
  };

  const handleBlackoutToggle = () => {
    if (liveText !== "") {
      setLastLiveText(liveText);
      broadcastData("", previewFontSize, bgType);
    } else if (lastLiveText !== "") {
      broadcastData(lastLiveText, previewFontSize, bgType);
    }
  };

  const handleClearEditor = () => { 
    setInputTitle(""); setInputText(""); setLiveSlideIndex(null);
    Toast.fire({ icon: 'success', title: 'Editor Cleared' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen font-sans bg-zinc-50 dark:bg-zinc-950">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-6 px-2">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500 text-white rounded-3xl shadow-xl shadow-indigo-500/20"><Presentation className="w-8 h-8" /></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tighter">EasyWorship</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${liveText ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-zinc-400'}`} />
              <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-none">{liveText ? 'Live Broadcast' : 'Screen Cleared'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {!showMonitor && (
              <button onClick={() => setShowMonitor(true)} className="flex items-center gap-2 px-7 py-4 bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all">
                <MonitorPlay className="w-4 h-4" /> Show Live Monitor
              </button>
            )}
        </div>
      </div>

      {/* MONITOR */}
      {showMonitor && (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
          <div ref={nodeRef} className="fixed top-28 right-8 z-100 w-full max-w-90 bg-zinc-950 p-4 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between px-2 cursor-move drag-handle">
                <div className="flex items-center gap-2 text-zinc-500"><GripHorizontal className="w-4 h-4" /><span className="text-[9px] font-black uppercase tracking-widest">Live Monitor</span></div>
                <button onClick={() => setShowMonitor(false)} className="text-zinc-600 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className={`aspect-video w-full rounded-2xl flex items-center justify-center p-6 border border-zinc-900 overflow-hidden relative transition-all duration-1000 ${bgType === 'praise' ? 'bg-indigo-900 animate-pulse' : bgType === 'worship' ? 'bg-zinc-950' : bgType === 'green' ? 'bg-[#00FF00]' : 'bg-black'}`}>
                <p className="text-white text-center font-bold leading-tight whitespace-pre-wrap select-none" style={{ fontSize: `${previewFontSize * 0.25}px`, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{liveText || <span className="text-white/10 italic text-[10px] tracking-[0.4em]">CLEARED</span>}</p>
            </div>
            <div className="space-y-4 px-1">
                <div className="grid grid-cols-4 gap-2">
                   {['none', 'praise', 'worship', 'green'].map(t => (
                      <button key={t} onClick={() => setBgType(t as BackgroundType)} className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${bgType === t ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>{t}</button>
                   ))}
                </div>
                <div className="flex items-center gap-3">
                  <Settings2 className="w-3 h-3 text-zinc-600" />
                  <input type="range" min="20" max="150" value={previewFontSize} onChange={(e) => setPreviewFontSize(parseInt(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                  <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{previewFontSize}px</span>
                </div>
            </div>
          </div>
        </Draggable>
      )}

      {/* WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5">
          <EasyWorshipEditor 
            title={inputTitle} text={inputText} isOutputCleared={liveText === ""} onTitleChange={setInputTitle} onTextChange={setInputText} 
            onClearEditor={handleClearEditor} onSave={handleSaveText} onBlackoutToggle={handleBlackoutToggle} 
          />
        </div>

        <div className="lg:col-span-7">
          <EasyWorshipSlides 
            slides={quickSlides} liveSlideIndex={liveSlideIndex} isBlackout={liveText === ""} 
            onSlideClick={(text, idx) => { setLiveSlideIndex(idx); broadcastData(text, previewFontSize, bgType); }} 
            onShowMonitor={() => setShowMonitor(true)} showMonitor={showMonitor}
          />
        </div>
      </div>

      <EasyWorshipArchives 
        items={savedItems} onDelete={(id) => setSavedItems(prev => prev.filter(i => i.id !== id))} 
        onLoad={(item) => { setInputTitle(item.title); setInputText(item.text); setLiveSlideIndex(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
      />
    </div>
  );
}