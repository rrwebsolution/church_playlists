import { useState, useEffect, useMemo, useRef } from 'react';
import { Presentation, Settings2, GripHorizontal, X, MonitorPlay, Type } from 'lucide-react';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';
import instance from '../../plugin/axios';

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

const FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Impact', value: 'Impact, fantasy' },
  { label: 'Georgia', value: 'Georgia, serif' },
];

export interface SavedItem {
  id: string;
  title: string;
  text: string;
  date: string;
}

export interface ArchiveFolder {
  id: string;
  name: string;
  items: SavedItem[];
}

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'video';

export default function EasyWorshipController() {

  const [inputTitle, setInputTitle] = useState(() => localStorage.getItem('ew_draft_title') || "");
  const [inputText, setInputText] = useState(() => localStorage.getItem('ew_draft_text') || "");

  const [liveText, setLiveText] = useState("");
  const [lastLiveText, setLastLiveText] = useState("");
  const [previewFontSize, setPreviewFontSize] = useState(() => {
    const saved = localStorage.getItem('ew_font_size');
    return saved ? parseInt(saved) : 100;
  });
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('ew_font_family') || 'Oswald, sans-serif');
  const [bgType, setBgType] = useState<BackgroundType>('green');
  const [videoUrl, setVideoUrl] = useState(() => localStorage.getItem('ew_video_url') || '');
  const [showMonitor, setShowMonitor] = useState(true);
  const [liveSlideIndex, setLiveSlideIndex] = useState<number | null>(null);
  const nodeRef = useRef(null);

  const [currentArchiveId, setCurrentArchiveId] = useState<string | null>(null);

  const [archiveFolders, setArchiveFolders] = useState<ArchiveFolder[]>(() => {
    const saved = localStorage.getItem('jamc_ew_folders');
    return saved ? JSON.parse(saved) :[{ id: 'default', name: 'General Library', items: [] }];
  });

  useEffect(() => {
    localStorage.setItem('jamc_ew_folders', JSON.stringify(archiveFolders));
  }, [archiveFolders]);

  useEffect(() => {
    const draftTimer = setTimeout(() => {
      localStorage.setItem('ew_draft_title', inputTitle);
      localStorage.setItem('ew_draft_text', inputText);
    }, 500);

    return () => clearTimeout(draftTimer);
  }, [inputTitle, inputText]);

  useEffect(() => {
    localStorage.setItem('ew_font_size', previewFontSize.toString());
  }, [previewFontSize]);

  useEffect(() => {
    localStorage.setItem('ew_font_family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('ew_video_url', videoUrl);
  }, [videoUrl]);

  const isOutputCleared = liveText === "";

  const broadcastData = async (text: string, size: number, bg: string, font: string, vidUrl: string = '') => {
    setLiveText(text);
    const data = { text, fontSize: size, background: bg, fontFamily: font, videoUrl: vidUrl, updatedAt: Date.now() };
    // Write to localStorage so the projector window on same browser syncs instantly
    localStorage.setItem('jamc_live_display', JSON.stringify(data));
    try {
      await instance.post('obs-state', data);
    } catch (err) {
      console.error("Failed to broadcast data:", err);
      Toast.fire({ icon: 'error', title: 'Broadcast Failed!' });
    }
  };

  const quickSlides = useMemo(() => {
    if (!inputText.trim()) return[];
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (liveSlideIndex !== null && quickSlides[liveSlideIndex]) {
        const updatedText = quickSlides[liveSlideIndex].text;
        if (updatedText !== liveText && liveText !== "") broadcastData(updatedText, previewFontSize, bgType, fontFamily, videoUrl);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [quickSlides, liveSlideIndex, liveText, previewFontSize, bgType, fontFamily, videoUrl]);

  useEffect(() => { if (liveText !== "") broadcastData(liveText, previewFontSize, bgType, fontFamily, videoUrl); },[previewFontSize, bgType, fontFamily, videoUrl]);

  const handleClearEditor = () => {
    setInputTitle("");
    setInputText("");
    setLiveSlideIndex(null);
    setCurrentArchiveId(null);
    localStorage.removeItem('ew_draft_title');
    localStorage.removeItem('ew_draft_text');
    Toast.fire({ icon: 'success', title: 'Editor Cleared' });
  };

  const handleSaveText = async () => {
    if (!inputText.trim()) {
      Toast.fire({ icon: 'warning', title: 'Editor is empty!' });
      return;
    }

    if (currentArchiveId) {
      setArchiveFolders(prev => prev.map(folder => ({
        ...folder,
        items: folder.items.map(item =>
          item.id === currentArchiveId
            ? { ...item, title: inputTitle.trim() || 'Untitled Document', text: inputText.trim(), date: new Date().toLocaleDateString() }
            : item
        )
      })));
      Toast.fire({ icon: 'success', title: 'Updated in Folder!' });
      handleClearEditor();
      return;
    }

    const folderOptions: Record<string, string> = {};
    archiveFolders.forEach(f => { folderOptions[f.id] = `📁 ${f.name}`; });
    folderOptions['NEW_FOLDER'] = '➕ Create New Folder...';

    const { value: selectedFolderId } = await Swal.fire({
      title: 'Save to Folder',
      input: 'select',
      inputOptions: folderOptions,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
    });

    if (!selectedFolderId) return;

    let targetFolderId = selectedFolderId;

    if (selectedFolderId === 'NEW_FOLDER') {
      const { value: folderName } = await Swal.fire({
        title: 'New Folder Name',
        input: 'text',
        showCancelButton: true,
        inputValidator: (value) => !value ? 'Folder name is required!' : null
      });
      if (!folderName) return;

      targetFolderId = Date.now().toString();
      const newFolder: ArchiveFolder = { id: targetFolderId, name: folderName, items: [] };
      setArchiveFolders(prev =>[...prev, newFolder]);
    }

    const newItem: SavedItem = {
      id: Date.now().toString(),
      title: inputTitle.trim() || 'Untitled Document',
      text: inputText.trim(),
      date: new Date().toLocaleDateString()
    };

    setArchiveFolders(prev => prev.map(folder =>
      folder.id === targetFolderId
        ? { ...folder, items: [newItem, ...folder.items] }
        : folder
    ));

    Toast.fire({ icon: 'success', title: 'Saved to Library!' });
    handleClearEditor();
  };

  const handleBlackoutToggle = () => {
    if (!isOutputCleared) {
      setLastLiveText(liveText);
      broadcastData("", previewFontSize, bgType, fontFamily, videoUrl);
    } else {
      broadcastData(lastLiveText, previewFontSize, bgType, fontFamily, videoUrl);
      setLastLiveText("");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen font-sans bg-zinc-50 dark:bg-zinc-950">

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

        {!showMonitor && (
          <button onClick={() => setShowMonitor(true)} className="flex items-center gap-2 px-7 py-4 bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all">
            <MonitorPlay className="w-4 h-4" /> Show Live Monitor
          </button>
        )}
      </div>

      {showMonitor && (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
          <div ref={nodeRef} className="fixed top-28 right-8 z-100 w-full max-w-90 bg-zinc-950 p-4 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between px-2 cursor-move drag-handle">
                <div className="flex items-center gap-2 text-zinc-500"><GripHorizontal className="w-4 h-4" /><span className="text-[9px] font-black uppercase tracking-widest">Live Monitor</span></div>
                <button onClick={() => setShowMonitor(false)} className="text-zinc-600 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Preview screen */}
            <div className={`aspect-video w-full rounded-2xl flex items-center justify-center p-6 border border-zinc-900 overflow-hidden relative transition-all duration-1000 ${bgType === 'praise' ? 'bg-indigo-900 animate-pulse' : bgType === 'worship' ? 'bg-zinc-950' : bgType === 'green' ? 'bg-[#00FF00]' : 'bg-black'}`}>
                {bgType === 'video' && videoUrl && (
                  <video key={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-2xl" src={videoUrl} />
                )}
                <p className="text-white text-center leading-tight whitespace-pre-wrap select-none relative z-10" style={{ fontSize: `${previewFontSize * 0.25}px`, fontFamily, fontWeight: 'bold', WebkitTextStroke: '0.5px #000', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{liveText || <span className="text-white/10 italic text-[10px] tracking-[0.4em]" style={{ fontWeight: 'normal', WebkitTextStroke: 'unset' }}>CLEARED</span>}</p>
            </div>

            <div className="space-y-3 px-1">
                {/* Background type buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                   {(['none', 'praise', 'worship', 'green', 'video'] as BackgroundType[]).map(t => (
                      <button key={t} onClick={() => setBgType(t)} className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${bgType === t ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>{t}</button>
                   ))}
                </div>

                {/* Video URL input */}
                {bgType === 'video' && (
                  <input
                    type="text"
                    placeholder="Paste video URL (.mp4)..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-zinc-900 text-zinc-300 text-[9px] rounded-xl px-3 py-2 border border-zinc-800 placeholder-zinc-700 outline-none focus:border-indigo-500"
                  />
                )}

                {/* Font family selector */}
                <div className="flex items-center gap-2">
                  <Type className="w-3 h-3 text-zinc-600 shrink-0" />
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="flex-1 bg-zinc-900 text-zinc-300 text-[9px] font-bold rounded-xl px-2 py-1.5 border border-zinc-800 outline-none focus:border-indigo-500 cursor-pointer"
                    style={{ fontFamily }}
                  >
                    {FONTS.map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Font size slider */}
                <div className="flex items-center gap-3">
                  <Settings2 className="w-3 h-3 text-zinc-600" />
                  <input type="range" min="20" max="200" value={previewFontSize} onChange={(e) => setPreviewFontSize(parseInt(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                  <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{previewFontSize}px</span>
                </div>
            </div>
          </div>
        </Draggable>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full mx-auto">
        <div className="w-full">
          <EasyWorshipEditor
            title={inputTitle} text={inputText}
            onTitleChange={setInputTitle} onTextChange={setInputText}
            onClearEditor={handleClearEditor} onSave={handleSaveText}
          />
        </div>

        <div className="w-full">
          <EasyWorshipSlides
            slides={quickSlides}
            liveSlideIndex={liveSlideIndex}
            isBlackout={liveText === ""}
            onSlideClick={(text, idx) => { setLiveSlideIndex(idx); broadcastData(text, previewFontSize, bgType, fontFamily, videoUrl); }}
            onBlackoutToggle={handleBlackoutToggle}
            isOutputCleared={isOutputCleared}
          />
        </div>
      </div>

      <EasyWorshipArchives
        folders={archiveFolders}
        setFolders={setArchiveFolders}
        onLoad={(item) => {
          setInputTitle(item.title);
          setInputText(item.text);
          setLiveSlideIndex(null);
          setCurrentArchiveId(item.id);
          localStorage.setItem('ew_draft_title', item.title);
          localStorage.setItem('ew_draft_text', item.text);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
