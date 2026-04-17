import { useState, useEffect, useMemo, useRef } from 'react';
import { Presentation, Settings2, GripHorizontal, X, MonitorPlay, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';
import { EasyWorshipEditor } from './EasyWorshipEditor';
import { EasyWorshipSlides } from './EasyWorshipSlides';
import { EasyWorshipArchives } from './EasyWorshipArchives';
// import instance from '../../plugin/axios'; // Commented out as it's no longer used

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  customClass: { container: 'z-[99999]' }
});

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

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'custom';

const FONT_OPTIONS = ['Arial Black', 'Impact', 'Arial', 'Georgia', 'Verdana', 'Times New Roman'];

export default function EasyWorshipController() {

  const [inputTitle, setInputTitle] = useState(() => localStorage.getItem('ew_draft_title') || "");
  const [inputText, setInputText] = useState(() => localStorage.getItem('ew_draft_text') || "");

  const [liveText, setLiveText] = useState("");
  const [lastLiveText, setLastLiveText] = useState("");

   const [previewFontSize, setPreviewFontSize] = useState(() => {
        const saved = localStorage.getItem('ew_fontSize');
        return saved ? parseInt(saved) : 100;
    });
  const [bgType, setBgType] = useState<BackgroundType>('green');
  const [bgColor, setBgColor] = useState('#000000');
  const [showMonitor, setShowMonitor] = useState(true);
  const [liveSlideIndex, setLiveSlideIndex] = useState<number | null>(null);
  const nodeRef = useRef(null);

  // Font style settings — defaults: bold + uppercase + outline
  const [fontFamily, setFontFamily] = useState('Arial Black');
  const [isBold, setIsBold] = useState(true);
  const [isUppercase, setIsUppercase] = useState(true);
  const [hasOutline, setHasOutline] = useState(true);

  const [currentArchiveId, setCurrentArchiveId] = useState<string | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);

  const getResolvedBg = () => bgType === 'custom' ? bgColor : bgType;

  const openProjectorWindow = async () => {
    // Ensure background data is correctly formatted for EasyWorshipView
    const backgroundData = bgType === 'custom' ? bgColor : bgType;

    localStorage.setItem('jamc_live_display', JSON.stringify({
      text: liveText, fontSize: previewFontSize, background: backgroundData,
      fontFamily, isBold, isUppercase, hasOutline, updatedAt: Date.now()
    }));

    if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.focus();
      return;
    }

    try {
      if ('getScreenDetails' in window) {
        const screenDetails = await (window as any).getScreenDetails();
        const screens: any[] = screenDetails.screens;
        const projector = screens.find((s: any) => !s.isPrimary) ?? screens[0];
        projectorWindowRef.current = window.open(
          '/projector', 'projector_output',
          `left=${projector.availLeft},top=${projector.availTop},width=${projector.availWidth},height=${projector.availHeight}`
        );
        // Request fullscreen immediately after opening the window
        if (projectorWindowRef.current?.document?.documentElement) {
          projectorWindowRef.current.document.documentElement.requestFullscreen().catch(err => console.log("Fullscreen request failed:", err));
        }
      } else {
        // Fallback for browsers that don't support getScreenDetails
        projectorWindowRef.current = window.open('/projector', 'projector_output', 'width=1280,height=720');
        // Attempt fullscreen on fallback if possible (less reliable)
        if (projectorWindowRef.current) {
           // Direct fullscreen request on the new window might not be reliable
           // It's better handled by user interaction within that window if possible.
        }
      }
    } catch (err) {
      console.error("Error opening projector window:", err);
      // Fallback if screenDetails or fullscreen fails
      projectorWindowRef.current = window.open('/projector', 'projector_output', 'width=1280,height=720');
       // Attempt fullscreen on fallback if possible
       if (projectorWindowRef.current) {
          // Direct fullscreen request on the new window might not be reliable
       }
    }
  };

  const [archiveFolders, setArchiveFolders] = useState<ArchiveFolder[]>(() => {
    const saved = localStorage.getItem('jamc_ew_folders');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'General Library', items: [] }];
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

  const isOutputCleared = liveText === "";

   useEffect(() => {
        localStorage.setItem('ew_fontSize', previewFontSize.toString());
        // Also persist other styling settings
        localStorage.setItem('ew_fontFamily', fontFamily);
        localStorage.setItem('ew_isBold', JSON.stringify(isBold));
        localStorage.setItem('ew_isUppercase', JSON.stringify(isUppercase));
        localStorage.setItem('ew_hasOutline', JSON.stringify(hasOutline));
        // Persist background settings
        localStorage.setItem('ew_background_type', bgType);
        if (bgType === 'custom') {
            localStorage.setItem('ew_background_color', bgColor);
        } else {
            localStorage.removeItem('ew_background_color'); // Remove custom color if not in use
        }
    }, [previewFontSize, fontFamily, isBold, isUppercase, hasOutline, bgType, bgColor]); // Added dependencies

  const broadcastData = async (text: string, size: number, bg: string) => {
    setLiveText(text);
    // Ensure background data is correctly formatted
    const backgroundData = bgType === 'custom' ? bgColor : bg;

    const data = { text, fontSize: size, background: backgroundData, fontFamily, isBold, isUppercase, hasOutline, updatedAt: Date.now() };
    localStorage.setItem('jamc_live_display', JSON.stringify(data));
    fetch('/obs-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {});
    // Removed: await instance.post('obs/update', data);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (liveSlideIndex !== null && quickSlides[liveSlideIndex]) {
        const updatedText = quickSlides[liveSlideIndex].text;
        if (updatedText !== liveText && liveText !== "") broadcastData(updatedText, previewFontSize, getResolvedBg());
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [quickSlides, liveSlideIndex, liveText, previewFontSize, bgType, bgColor]);

  useEffect(() => {
    if (liveText !== "") broadcastData(liveText, previewFontSize, getResolvedBg());
  }, [previewFontSize, bgType, bgColor, fontFamily, isBold, isUppercase, hasOutline]);

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
      setArchiveFolders(prev => [...prev, newFolder]);
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
      broadcastData("", previewFontSize, getResolvedBg());
    } else {
      broadcastData(lastLiveText, previewFontSize, getResolvedBg());
      setLastLiveText("");
    }
  };

  const previewBgClass = bgType === 'praise' ? 'bg-indigo-900' : bgType === 'worship' ? 'bg-zinc-950' : bgType === 'green' ? 'bg-[#00FF00]' : bgType === 'custom' ? '' : 'bg-black';
  const previewTextStyle: React.CSSProperties = {
    fontSize: `${previewFontSize * 0.25}px`,
    fontFamily,
    fontWeight: isBold ? '900' : 'normal',
    textTransform: isUppercase ? 'uppercase' : 'none',
    textShadow: hasOutline
      ? '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
      : '0 2px 10px rgba(0,0,0,0.5)',
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

            {/* Header */}
            <div className="flex items-center justify-between px-2 cursor-move drag-handle">
              <div className="flex items-center gap-2 text-zinc-500"><GripHorizontal className="w-4 h-4" /><span className="text-[9px] font-black uppercase tracking-widest">Live Monitor</span></div>
              <div className="flex items-center gap-2">
                <button onClick={openProjectorWindow} title="Pop out to projector" className="text-zinc-600 hover:text-indigo-400 transition-colors"><ExternalLink className="w-4 h-4" /></button>
                <button onClick={() => setShowMonitor(false)} className="text-zinc-600 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Preview */}
            <div
              onClick={openProjectorWindow}
              title="Click to open projector window"
              className={`aspect-video w-full rounded-2xl flex items-center justify-center p-4 border border-zinc-900 overflow-hidden relative cursor-pointer hover:border-indigo-500/50 group ${previewBgClass}`}
              style={bgType === 'custom' ? { backgroundColor: bgColor } : {}}
            >
              <p className="text-white text-center leading-tight whitespace-pre-wrap select-none" style={previewTextStyle}>
                {liveText || <span className="text-white/10 italic text-[10px] tracking-[0.4em] font-sans" style={{ fontFamily: 'sans-serif', fontWeight: 'normal', textTransform: 'none', textShadow: 'none' }}>CLEARED</span>}
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest"><ExternalLink className="w-3 h-3" /> Open Projector</div>
              </div>
            </div>

            <div className="space-y-3 px-1">

              {/* Background */}
              <div className="grid grid-cols-5 gap-1.5">
                {(['none', 'praise', 'worship', 'green', 'custom'] as BackgroundType[]).map(t => (
                  <button key={t} onClick={() => setBgType(t)} className={`py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all ${bgType === t ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>
                    {t === 'custom' ? 'BG' : t}
                  </button>
                ))}
              </div>

              {/* Custom color picker */}
              {bgType === 'custom' && (
                <div className="flex items-center gap-2 pl-1">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <span className="text-[9px] font-mono text-zinc-500">{bgColor.toUpperCase()}</span>
                </div>
              )}

              {/* Font size */}
              <div className="flex items-center gap-3">
                <Settings2 className="w-3 h-3 text-zinc-600 shrink-0" />
                <input type="range" min="20" max="200" value={previewFontSize} onChange={(e) => setPreviewFontSize(parseInt(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                <span className="text-[10px] font-bold text-zinc-500 tabular-nums w-12 text-right">{previewFontSize}px</span>
              </div>

              {/* Font family */}
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-bold rounded-xl px-3 py-2 cursor-pointer"
                style={{ fontFamily }}
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>

              {/* Style toggles: Bold / CAPS / Outline */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setIsBold(!isBold)}
                  className={`py-2 rounded-xl text-[11px] border transition-all font-black ${isBold ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}
                >B</button>
                <button
                  onClick={() => setIsUppercase(!isUppercase)}
                  className={`py-2 rounded-xl text-[9px] border transition-all font-black uppercase ${isUppercase ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}
                >AA</button>
                <button
                  onClick={() => setHasOutline(!hasOutline)}
                  className={`py-2 rounded-xl text-[9px] border transition-all font-black ${hasOutline ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}
                  style={{ textShadow: hasOutline ? '-1px -1px 0 #6366f1, 1px 1px 0 #6366f1' : 'none' }}
                >OUT</button>
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
            onSlideClick={(text, idx) => { setLiveSlideIndex(idx); broadcastData(text, previewFontSize, getResolvedBg()); }}
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