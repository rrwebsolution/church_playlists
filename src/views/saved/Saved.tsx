import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Heart, PlayCircle, PauseCircle, Trash2, 
  RefreshCcw, Share2, Sparkles, Search,
  Languages, Guitar, ChevronUp
} from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';

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

const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;
  let cleanLyrics = lyrics.replace(/&#039;/g, "'").replace(/&quot;/g, '"');
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: any[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const trimmedLine = rawLines[i].trim();
    const isHeader = /^\[(.*?)\]$/.test(trimmedLine) || 
                     /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(trimmedLine);

    if (isHeader) {
      let hasContent = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const nextLine = rawLines[j].trim();
        if (nextLine === "") continue; 
        if (/^\[(.*?)\]$/.test(nextLine) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(nextLine)) break;
        hasContent = true;
        break;
      }
      if (!hasContent) continue;

      processedLines.push(
        <div key={i} className="mt-8 mb-4 flex justify-center">
          <span className="px-5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            {trimmedLine.replace(/[\[\]():]/g, '')}
          </span>
        </div>
      );
    } else if (trimmedLine === "") {
      processedLines.push(<div key={i} className="h-5"></div>);
    } else {
      processedLines.push(
        <div key={i} className="text-zinc-800 dark:text-zinc-100 leading-relaxed font-bold text-[16px] md:text-[18px] py-0.5 text-center">
          {trimmedLine}
        </div>
      );
    }
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

  const handlePlaySong = (song: Song) => {
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

            return (
              <div 
                key={song.id}
                className={`group relative flex flex-col backdrop-blur-xl border transition-all duration-500 overflow-hidden
                  ${isExpanded ? 'lg:col-span-2 xl:col-span-3 rounded-[2.5rem] shadow-2xl z-10' : 'rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 z-0'}
                  ${isCurrentlyPlaying 
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-500/50 shadow-indigo-500/20' 
                    : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/50 dark:border-white/5 hover:border-indigo-500/30'
                  }`}
              >
                {/* CARD HEADER / MAIN INFO */}
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 md:p-8">
                 {/* PLAY / PAUSE BUTTON WITH BACKGROUND BARS ANIMATION */}
                  <div className="relative shrink-0 cursor-pointer group/btn" onClick={() => handlePlaySong(song)}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover/btn:scale-105
                      ${isCurrentlyPlaying 
                        ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40' 
                        : 'bg-zinc-100 dark:bg-zinc-800'}`}
                    >
                      {/* BACKGROUND ANIMATED BARS (Visible only when playing) */}
                      {isCurrentlyPlaying && isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30">
                          <div className="w-1.5 h-12 bg-white rounded-full animate-[music-bar_0.6s_ease-in-out_infinite]" />
                          <div className="w-1.5 h-16 bg-white rounded-full animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1.5 h-10 bg-white rounded-full animate-[music-bar_0.7s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1.5 h-14 bg-white rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }} />
                        </div>
                      )}

                      {/* FOREGROUND ICON */}
                      <div className="relative z-10">
                        {isCurrentlyPlaying && isPlaying ? (
                          <PauseCircle className="w-12 h-12 text-white fill-white/20 animate-in zoom-in duration-300" />
                        ) : (
                          <PlayCircle className={`w-12 h-12 animate-in zoom-in duration-300 ${isCurrentlyPlaying ? 'text-white fill-white/20' : 'text-indigo-500 fill-indigo-500/10'}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SONG INFO */}
                  <div className="flex-1 min-w-0 w-full pt-1">
                    <h3 className={`text-lg md:text-xl font-black truncate transition-colors ${isCurrentlyPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600'}`}>
                      {song.title}
                    </h3>
                    <p className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate mb-2 mt-1">
                      {song.artist || 'Unknown Artist'}
                    </p>
                    
                    {/* PROGRESS BAR KUNG NAG-PLAY */}
                    <MiniProgressBar ytPlayer={ytPlayer} isPlaying={isPlaying} isCurrent={isCurrentlyPlaying} />
                    
                    {/* QUICK ACTION BUTTONS (LYRICS & CHORDS) - PERMI NA MAKITA */}
                    <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 custom-scrollbar">
                      <button onClick={() => toggleExpand(song.id, 'lyrics')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${isExpanded && activeTab === 'lyrics' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-300'}`}>
                        <Languages className="w-3 h-3" /> Lyrics
                      </button>
                      <button onClick={() => toggleExpand(song.id, 'chords')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${isExpanded && activeTab === 'chords' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-300'}`}>
                        <Guitar className="w-3 h-3" /> Chords
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center gap-2 w-full sm:w-auto justify-end mt-4 sm:mt-0">
                    <button onClick={() => { navigator.clipboard.writeText(song.url); Toast.fire({ icon: 'success', title: 'Link Copied!' }); }} className="p-2.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all" title="Copy Link"><Share2 className="w-4 h-4" /></button>
                    <button onClick={() => handleRemoveGlobal(song.url)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all" title="Remove Globally"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* EXPANDED LYRICS / CHORDS VIEW */}
                {isExpanded && (
                  <div className="relative border-t border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 md:p-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                      <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-sm">
                        <button onClick={() => setActiveTab('lyrics')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'lyrics' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}><Languages className="w-4 h-4" /> Lyrics</button>
                        <button onClick={() => setActiveTab('chords')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'chords' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}><Guitar className="w-4 h-4" /> Chords</button>
                      </div>
                      <button onClick={() => setExpandedId(null)} className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors shadow-sm">
                        <ChevronUp className="w-4 h-4" /> Close
                      </button>
                    </div>

                    <div className="max-w-3xl mx-auto min-h-60 max-h-120 overflow-y-auto custom-scrollbar pr-2 pb-4">
                      {activeTab === 'lyrics' ? (
                        song.lyrics ? (
                          <div className="animate-in fade-in duration-700">{formatLyrics(song.lyrics as string)}</div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 py-12 gap-3">
                             <Languages className="w-12 h-12 opacity-20" />
                             <span className="font-bold text-xs uppercase tracking-widest">No Lyrics Saved</span>
                          </div>
                        )
                      ) : (
                        song.chords ? (
                          <pre className="font-mono text-[13px] md:text-[15px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-700 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                            {song.chords}
                          </pre>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 py-12 gap-3">
                             <Guitar className="w-12 h-12 opacity-20" />
                             <span className="font-bold text-xs uppercase tracking-widest">No Chords Saved</span>
                          </div>
                        )
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