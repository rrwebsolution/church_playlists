import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Heart, PlayCircle, PauseCircle, Trash2, 
  RefreshCcw, Share2, Sparkles, Search,
  Languages, Guitar, Play, Copy, Printer, DownloadCloud,
  ChevronDown,
  Music
} from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';
import { PlayingVisualizer } from '../playlist/FolderList';

// --- TOAST NOTIFICATION CONFIG ---
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

// --- FORMATTER HELPERS ---
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const getCleanLyricsText = (lyrics: string) => {
  if (!lyrics) return "";
  const rawLines = lyrics.replace(/&#039;/g, "'").split(/\r?\n/);
  const result: string[] = [];

  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;
  const isChordLine = (line: string) => {
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || line.trim() === "") return false;
    let chordCount = 0;
    words.forEach(word => {
      const cleanWord = word.replace(/[()]/g, '');
      if (chordRegex.test(cleanWord) || ["|", "-", "/", "!", "x"].includes(cleanWord)) chordCount++;
    });
    return chordCount > 0 && (chordCount / words.length > 0.4);
  };

  const isHeader = (line: string) => {
    const tl = line.trim();
    return /^\[(.*?)\]$/.test(tl) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(tl);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line === "") { result.push(""); continue; }

    if (isHeader(line)) {
      let hasLyricsBelow = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const next = rawLines[j].trim();
        if (next === "") continue;
        if (isHeader(next)) break;
        if (!isChordLine(next)) { hasLyricsBelow = true; break; }
      }
      if (hasLyricsBelow) result.push(`\n[${line.replace(/[\[\]():]/g, '')}]\n`);
      continue;
    }

    if (!isChordLine(line)) result.push(line);
  }
  return result.join('\n').trim();
};

const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;
  let cleanLyrics = lyrics.replace(/&#039;/g, "'");
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: any[] = [];

  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;

  const isChordLine = (line: string) => {
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || line.trim() === "") return false;
    let chordCount = 0;
    words.forEach(word => {
      const cleanWord = word.replace(/[()]/g, '');
      if (chordRegex.test(cleanWord) || ["|", "-", "/", "!", "x"].includes(cleanWord)) chordCount++;
    });
    return chordCount > 0 && (chordCount / words.length > 0.4);
  };

  const isHeader = (line: string) => {
    const tl = line.trim();
    return /^\[(.*?)\]$/.test(tl) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(tl);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const currentLine = rawLines[i].trim();
    if (currentLine === "") { processedLines.push(<div key={i} className="h-4"></div>); continue; }

    if (isHeader(currentLine)) {
      let hasLyricsBelow = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const nextLine = rawLines[j].trim();
        if (nextLine === "") continue; 
        if (isHeader(nextLine)) break; 
        if (!isChordLine(nextLine)) { hasLyricsBelow = true; break; }
      }
      if (hasLyricsBelow) {
        processedLines.push(
          <div key={i} className="mt-8 mb-3 flex justify-center">
            <span className="px-5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
              {currentLine.replace(/[\[\]():]/g, '')}
            </span>
          </div>
        );
      }
      continue; 
    }

    if (isChordLine(currentLine)) continue;

    processedLines.push(
      <div key={i} className="text-zinc-800 dark:text-zinc-100 leading-relaxed font-semibold text-[15px] md:text-[17px] py-0.5 text-center">
        {currentLine}
      </div>
    );
  }
  return processedLines;
};

// --- REALTIME PROGRESS BAR COMPONENT ---
const MiniProgressBar = ({ ytPlayer, isPlaying, isCurrent }: { ytPlayer: any, isPlaying: boolean, isCurrent: boolean }) => {
  const [playedSec, setPlayedSec] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isCurrent || !ytPlayer) return;
    setPlayedSec(0);
    setDuration(0);

    const interval = setInterval(() => {
      try {
        if (typeof ytPlayer.getPlayerState !== 'function') return;
        const state = ytPlayer.getPlayerState();
        if (state === 1 || state === 2 || state === 3) {
          const c = ytPlayer.getCurrentTime();
          const d = ytPlayer.getDuration();
          if (c >= 0) setPlayedSec(c);
          if (d > 0) setDuration(d);
        }
      } catch (e) {}
    }, 500);
    return () => clearInterval(interval);
  }, [ytPlayer, isPlaying, isCurrent]);

  if (!isCurrent) return null;

  const progressPercent = duration > 0 ? (playedSec / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 mt-3 mb-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <span className="text-[10px] text-indigo-500 font-mono font-bold w-8">{formatTime(playedSec)}</span>
      <div className="flex-1 h-1.5 bg-indigo-500/10 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progressPercent}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 font-mono font-bold w-8 text-right">{formatTime(duration)}</span>
    </div>
  );
};

// --- MAIN SAVED COMPONENT ---
export default function Saved() {
  const { 
    folders, setFolders, 
    currentSong, setCurrentSong, 
    isPlaying, setIsPlaying,
    inputValue, searchMode, ytPlayer
  } = useOutletContext<any>();

  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');

  const allSavedSongs = useMemo(() => {
    const songsMap = new Map<string, Song>();
    folders.forEach((folder: PlaylistFolder) => {
      folder.songs.forEach((song: Song) => {
        if (!songsMap.has(song.url)) {
          songsMap.set(song.url, song);
        }
      });
    });
    
    let results = Array.from(songsMap.values());
    if (searchMode === 'local' && inputValue.trim() !== '') {
      const query = inputValue.toLowerCase();
      results = results.filter((s: Song) => 
        s.title.toLowerCase().includes(query) || 
        (s.artist && s.artist.toLowerCase().includes(query))
      );
    }
    return results;
  }, [folders, searchMode, inputValue]);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500); 
  };

  const handlePlaySong = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handleRemoveGlobal = (songUrl: string) => {
    if (confirm("Are you sure you want to remove this song from ALL your folders?")) {
      setFolders((prev: PlaylistFolder[]) => prev.map(folder => ({
        ...folder,
        songs: folder.songs.filter(s => s.url !== songUrl)
      })));
    }
  };

  const toggleExpand = (songId: string, defaultTab: 'lyrics' | 'chords') => {
    if (expandedId === songId && activeTab === defaultTab) {
      setExpandedId(null);
    } else {
      setExpandedId(songId);
      setActiveTab(defaultTab);
    }
  };

  // --- DOWNLOAD & PRINT ---
  const handleDownloadTxt = (song: Song) => {
    const content = activeTab === 'lyrics' ? getCleanLyricsText(song.lyrics || "") : song.chords;
    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${song.title} - ${activeTab.toUpperCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = (song: Song) => {
    const content = activeTab === 'lyrics' ? getCleanLyricsText(song.lyrics || "") : song.chords;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const formattedContent = activeTab === 'lyrics' 
      ? content.replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<div class="badge">$1</div>')
      : `<pre style="font-family: monospace; font-size: 14px; white-space: pre-wrap;">${content}</pre>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${song.title} - ${activeTab.toUpperCase()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #18181b; line-height: 1.6; max-width: 800px; margin: 0 auto; text-align: center; }
            h1 { font-size: 28px; margin-bottom: 4px; color: #111827; }
            h2 { font-size: 14px; color: #6b7280; font-weight: 600; margin-top: 0; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 1px; }
            .content { font-size: 16px; }
            .badge { display: inline-block; padding: 4px 12px; background: #f3f4f6; border: 1px solid #e4e4e7; color: #374151; font-size: 11px; font-weight: bold; border-radius: 8px; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;}
            pre { text-align: left; background: #f9fafb; padding: 20px; border-radius: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${song.title}</h1>
          <h2>${song.artist || 'Unknown Artist'}</h2>
          <div class="content">${formattedContent}</div>
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 relative">
      
      {/* HEADER SECTION */}
      <div className="relative p-8 bg-linear-to-br from-indigo-600/10 to-purple-600/10 dark:from-indigo-500/5 dark:to-purple-500/5 rounded-[2.5rem] border border-indigo-500/10 dark:border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <Sparkles className="w-24 h-24 text-indigo-500" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-linear-to-br from-pink-500 to-rose-500 rounded-lg shadow-lg shadow-pink-500/30">
                  <Heart className="w-5 h-5 text-white fill-white" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Personal Collection</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Saved Songs
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium max-w-md leading-relaxed">
              Manage your favorite worship tracks, lyrics, and chords in one centralized place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-sm">
              <div className="flex flex-col items-end mr-1">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Status</span>
                <span className="text-xs font-bold text-green-500 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Synced
                </span>
              </div>
              <button onClick={handleSync} className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SONGS GRID & EMPTY STATES */}
      {folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-zinc-50 dark:bg-zinc-900/30 rounded-[3rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center px-6">
          <Heart className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Your Library is Empty</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs font-medium">
            Search in the header to start building your personal collection.
          </p>
        </div>
      ) : searchMode === 'local' && allSavedSongs.length === 0 ? (
        <div className="py-24 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
          <Search className="w-10 h-10 mx-auto mb-4 text-zinc-400" />
          <p className="font-semibold uppercase tracking-wider text-zinc-500 text-xs">No matching saved songs found for "{inputValue}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {allSavedSongs.map((song) => {
            const isCurrentlyPlaying = currentSong?.id === song.id;
            const isExpanded = expandedId === song.id;
            const isMp3 = !song.url.includes('youtube');

            return (
              <div 
                key={song.id}
                className={`group relative flex flex-col transition-all duration-500 overflow-hidden
                  ${isExpanded ? 'lg:col-span-2 xl:col-span-3 rounded-[2.5rem] shadow-2xl z-10 border-indigo-500/50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl' : 'rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 z-0 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-white/5 hover:border-indigo-400/50'}
                  ${isCurrentlyPlaying && !isExpanded ? 'border-indigo-500 shadow-indigo-500/20' : ''}`}
              >
                {/* CARD HEADER / MAIN INFO */}
                <div className="relative z-10 flex items-center justify-between p-4 md:p-6 bg-white dark:bg-transparent rounded-t-[1.5rem]">
                  
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div onClick={(e) => handlePlaySong(e, song)} className="relative shrink-0 cursor-pointer">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isCurrentlyPlaying ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600'}`}>
                        {isCurrentlyPlaying ? (isPlaying ? <PlayingVisualizer /> : <Play className="w-6 h-6 fill-current ml-0.5" />) : <Play className="w-6 h-6 fill-current ml-0.5" />}
                      </div>
                      <div className={`absolute inset-0 rounded-2xl flex items-center justify-center transition-all duration-300 transform ${isCurrentlyPlaying ? 'opacity-100 scale-100 bg-indigo-600/80 backdrop-blur-sm' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 bg-zinc-900/40 dark:bg-black/50 backdrop-blur-sm'}`}>
                        {isCurrentlyPlaying && isPlaying ? <PauseCircle className="w-8 h-8 text-white" /> : <PlayCircle className="w-8 h-8 text-white" />}
                      </div>
                    </div>
                    
                    <div onClick={() => toggleExpand(song.id, 'lyrics')} className="flex flex-col min-w-0 flex-1 cursor-pointer">
                      <h3 className={`text-[16px] md:text-[18px] font-bold tracking-tight truncate transition-colors ${isCurrentlyPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600'}`}>
                        {song.title}
                      </h3>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-widest truncate mt-0.5">
                        {song.artist || 'Unknown Artist'} {isMp3 && " • MP3 FILE"}
                      </span>
                      <MiniProgressBar ytPlayer={ytPlayer} isPlaying={isPlaying} isCurrent={isCurrentlyPlaying} />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 ml-4">
                    {!isExpanded && (
                      <button onClick={(e) => { e.stopPropagation(); toggleExpand(song.id, 'lyrics'); }} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                        <Languages className="w-3.5 h-3.5" /> Data
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveGlobal(song.url); }} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90" title="Remove Globally"><Trash2 className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(song.id, 'lyrics'); }} className={`p-2.5 rounded-xl transition-transform ${isExpanded ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rotate-180' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><ChevronDown className="w-5 h-5" /></button>
                  </div>
                </div>

                {/* EXPANDED CONTENT AREA */}
                {isExpanded && (
                  <div className="bg-zinc-50/50 dark:bg-black/20 border-t border-zinc-100 dark:border-white/5 animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                    
                    {/* ACTION BAR */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 border-b border-zinc-200/50 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
                      {/* Segmented Control Tabs */}
                      <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-800/80 rounded-xl shadow-inner w-full sm:w-auto">
                        <button onClick={() => setActiveTab('lyrics')} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'lyrics' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                          <Languages className="w-4 h-4" /> Lyrics
                        </button>
                        <button onClick={() => setActiveTab('chords')} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'chords' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                          <Guitar className="w-4 h-4" /> Chords
                        </button>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {song[activeTab] && (
                          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm overflow-hidden">
                            <button onClick={() => handlePrint(song)} className="p-2.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-indigo-600 transition-colors border-r border-zinc-200 dark:border-zinc-700" title="Print">
                              <Printer className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDownloadTxt(song)} className="p-2.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-indigo-600 transition-colors border-r border-zinc-200 dark:border-zinc-700" title="Download Text File">
                              <DownloadCloud className="w-4 h-4" />
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(activeTab === 'lyrics' ? getCleanLyricsText(song.lyrics as string) : song.chords as string); Toast.fire({ icon: 'success', title: 'Copied!' }); }} className="flex items-center gap-2 px-3 py-2.5 text-zinc-600 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-indigo-600 transition-colors" title="Copy to clipboard">
                              <Copy className="w-4 h-4" /> Copy
                            </button>
                          </div>
                        )}
                        <button onClick={() => { navigator.clipboard.writeText(song.url); Toast.fire({ icon: 'success', title: 'Link Copied!' }); }} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 active:scale-95">
                          <Share2 className="w-4 h-4" /> Share URL
                        </button>
                      </div>
                    </div>
                    
                    {/* CONTENT RENDERER */}
                    <div className="max-w-3xl mx-auto p-6 md:p-10 relative">
                      {song[activeTab] ? (
                        <div className="animate-in fade-in duration-700 overflow-x-auto">
                          {activeTab === 'lyrics' ? (
                            <div className="text-center pb-8">{formatLyrics(song.lyrics as string)}</div>
                          ) : (
                            <pre className="font-mono text-[13px] md:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed p-4 md:p-8 bg-white/80 dark:bg-zinc-900/80 rounded-[2rem] border border-zinc-200/50 dark:border-white/5 shadow-inner">{song.chords}</pre>
                          )}
                        </div>
                      ) : (
                        <div className="py-16">
                          <div className="flex flex-col items-center justify-center animate-in fade-in duration-1000">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 blur-2xl rounded-full" />
                              <div className="relative w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-full flex items-center justify-center shadow-sm">
                                <Music className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                              </div>
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-black uppercase tracking-[0.25em]">No {activeTab} available</p>
                              <p className="text-zinc-400/60 dark:text-zinc-600 text-[10px] font-medium tracking-wide">Edit this song inside a Playlist Folder to add data.</p>
                            </div>
                            <div className="mt-8 w-12 h-0.5 bg-linear-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          {/* DISCOVER MORE BUTTON */}
          <button 
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="relative group p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-500 overflow-hidden h-full min-h-48"
          >
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 shadow-sm group-hover:shadow-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-center relative z-10">
              <span className="block font-black text-sm uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-50 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Discover More</span>
              <span className="text-[10px] font-bold text-zinc-500 mt-1 block">Search for new songs above</span>
            </div>
          </button>
        </div>
      )}
      
      {/* QUICK STATS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6 bg-zinc-50 dark:bg-zinc-900/30 rounded-[2rem] border border-zinc-200/50 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Total Library: {allSavedSongs.length} Songs</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-3 h-3" />
          Realtime Database
        </div>
      </div>

    </div>
  );
}