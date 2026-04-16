import React, { useState, useEffect } from 'react';
import { 
  Music, SkipBack, Play, Pause, SkipForward, 
  Repeat, Shuffle, Volume2, VolumeX, ChevronDown, Languages, Guitar, Maximize2,
  RotateCcw, RotateCw
} from 'lucide-react';
import type { Song } from '../types';

interface FooterProps {
  currentSong: Song | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  ytPlayer?: any; 
  playlistSongs?: Song[];
  onSongChange?: (song: Song) => void;
  volume: number;
  setVolume: (volume: number) => void;
  // 🔥 DUGANGI KINING DUHA KA PROPS PARA SA APP.TSX 🔥
  hasInteracted: boolean; // Gikinahanglan para sa TypeScript error
  isSidebarCollapsed: boolean; // Gikinahanglan para sa width adjustment
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;
  let cleanLyrics = lyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '');
  cleanLyrics = cleanLyrics.replace(/&#039;/g, "'").replace(/&quot;/g, '"');
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: any[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmedLine = rawLines[i].trim();
    const isHeader = /^\[(.*?)\]$/.test(trimmedLine) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(trimmedLine);
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
          <span className="px-4 md:px-5 py-1.5 bg-white/10 text-white/80 text-[10px] md:text-[12px] font-black uppercase tracking-widest rounded-lg border border-white/10 shadow-sm backdrop-blur-md">{trimmedLine.replace(/[\[\]():]/g, '')}</span>
        </div>
      );
    } else if (trimmedLine === "") {
      processedLines.push(<div key={i} className="h-6 md:h-8"></div>);
    } else {
      processedLines.push(<div key={i} className="text-white/95 leading-relaxed font-bold text-[18px] md:text-2xl py-1 text-center drop-shadow-md">{trimmedLine}</div>);
    }
  }
  return processedLines;
};

const getYTId = (url?: string) => url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&]{11})/)?.[1] ?? null;

export const Footer = ({ 
  currentSong, isPlaying, setIsPlaying, ytPlayer, playlistSongs = [], onSongChange, volume, setVolume, 
  isSidebarCollapsed // 🔥 I-DESTRUCTURE ISSIDEBARCOLLAPSED
}: FooterProps) => {
  const [playedSec, setPlayedSec] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  
  const [isFooterHidden, setIsFooterHidden] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  useEffect(() => { setPlayedSec(0); setDuration(0); }, [currentSong?.id]);

  useEffect(() => {
    if (!ytPlayer) return;
    const interval = setInterval(() => {
      if (isSeeking) return;
      try {
        if (typeof ytPlayer.getPlayerState !== 'function') return;
        const state = ytPlayer.getPlayerState();
        if (state === 1 || state === 2 || state === 3) {
          const cTime = ytPlayer.getCurrentTime();
          const dTime = ytPlayer.getDuration();
          if (typeof cTime === 'number' && cTime >= 0) setPlayedSec(cTime);
          if (typeof dTime === 'number' && dTime > 0) setDuration(dTime);
        }
      } catch (err) {}
    }, 500);
    return () => clearInterval(interval);
  }, [ytPlayer, currentSong?.id, isSeeking]);

  useEffect(() => {
    if (isExpanded) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isExpanded]);

  const currentIndex = currentSong ? playlistSongs.findIndex(s => s.id === currentSong.id) : -1;
  const hasSongs = playlistSongs.length > 1;

  const handlePrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex !== -1 && hasSongs) {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlistSongs.length - 1;
      onSongChange?.(playlistSongs[prevIndex]);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex !== -1 && hasSongs) {
      let nextIndex;
      if (isShuffle) {
        do { nextIndex = Math.floor(Math.random() * playlistSongs.length); } while (nextIndex === currentIndex && playlistSongs.length > 1);
      } else {
        nextIndex = currentIndex < playlistSongs.length - 1 ? currentIndex + 1 : 0;
      }
      onSongChange?.(playlistSongs[nextIndex]);
    }
  };

  const handleSkip10 = (direction: 'forward' | 'backward', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    const currentTime = ytPlayer.getCurrentTime();
    const newTime = direction === 'forward' ? Math.min(duration, currentTime + 10) : Math.max(0, currentTime - 10);
    ytPlayer.seekTo(newTime, true);
    setPlayedSec(newTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setPlayedSec(parseFloat(e.target.value));
  };

  const handleSeekConfirm = (e: React.FormEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    const target = e.target as HTMLInputElement;
    const newTime = parseFloat(target.value);
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(newTime, true);
      ytPlayer.playVideo();
      setIsPlaying(true);
    }
  };

  // 🔥 GI-SIMPLIFY ANG TOGGLE PLAY 🔥
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const thumbnailId = currentSong?.url ? getYTId(currentSong.url) : null;
  const progressPercent = duration > 0 ? (playedSec / duration) * 100 : 0;

  const SongInfo = ({ isExpandedView = false }: { isExpandedView?: boolean }) => (
    <div className={`flex items-center gap-3 md:gap-4 flex-1 min-w-0 cursor-pointer group ${isExpandedView ? 'flex-col text-center w-full justify-center mt-2' : 'md:w-[30%]'}`} onClick={() => !isExpandedView && currentSong && setIsExpanded(true)}>
      {currentSong ? (
        <>
          <div className={`relative shrink-0 transition-all duration-500 shadow-2xl ${isExpandedView ? 'w-40 h-40 sm:w-56 sm:h-56 md:w-80 md:h-80 rounded-2xl md:rounded-3xl mb-4' : 'w-10 h-10 md:w-14 md:h-14 rounded-xl group-hover:scale-105'}`}>
            <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 rounded-inherit overflow-hidden border border-white/10 relative group-hover:border-indigo-500/50 transition-colors">
              {thumbnailId ? (
                <img src={`https://i.ytimg.com/vi/${thumbnailId}/maxresdefault.jpg`} onError={(e) => { const target = e.target as HTMLImageElement; if (target?.src?.includes('maxresdefault')) target.src = `https://i.ytimg.com/vi/${thumbnailId}/hqdefault.jpg`; }} className="w-full h-full object-cover" alt={currentSong.title} />
              ) : (
                <Music className="m-auto mt-2.5 md:mt-4 text-zinc-400 w-5 h-5 md:w-6 md:h-6" />
              )}
              {!isExpandedView && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="w-4 h-4 text-white" /></div>}
            </div>
            {isPlaying && !isExpandedView && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse border border-white dark:border-zinc-900" />}
          </div>
          <div className={`flex flex-col min-w-0 w-full overflow-hidden ${isExpandedView ? 'items-center px-4' : ''}`}>
            {!isExpandedView ? (
              <div className="flex flex-col min-w-0 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                <div className="marquee-container gap-12 pr-12">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-sm md:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors whitespace-nowrap">{currentSong.title}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">•</span>
                    <span className="font-bold uppercase tracking-widest text-[10px] md:text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{currentSong.artist}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-sm md:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors whitespace-nowrap">{currentSong.title}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">•</span>
                    <span className="font-bold uppercase tracking-widest text-[10px] md:text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{currentSong.artist}</span>
                  </div>
                </div>
              </div>
            ) : (
              <><span className="font-black text-xl sm:text-3xl md:text-4xl text-white tracking-tight drop-shadow-lg">{currentSong.title}</span><span className="font-bold uppercase tracking-[0.2em] text-[11px] sm:text-sm md:text-base text-indigo-300 mt-2">{currentSong.artist}</span></>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 opacity-30"><div className="w-10 h-10 md:w-14 md:h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl" /><div className="w-24 h-3 bg-zinc-200 dark:bg-zinc-800 rounded" /></div>
      )}
    </div>
  );

  return (
    <>
      {/* FLOATING TRIGGER (Mogawas ra kung hidden ang footer) */}
      {isFooterHidden && !isExpanded && currentSong && (
        <button 
          onClick={() => setIsFooterHidden(false)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-2xl animate-bounce border-4 border-white dark:border-zinc-900 active:scale-90 transition-transform"
        >
          <Music className="w-6 h-6" />
        </button>
      )}

      <footer 
        className={`fixed bottom-0 left-0 md:left-auto right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-zinc-800/50 z-40 transition-all duration-500 ease-in-out shadow-[0_-10px_40px_rgba(0,0,0,0.1)] 
        ${isExpanded ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0'}
        ${isFooterHidden ? 'translate-y-full pointer-events-none' : 'p-2 pt-0 md:p-3 md:px-6 md:py-0 md:h-24'}
        // 🔥 GI-AYO ANG WIDTH LOGIC 🔥
        ${isSidebarCollapsed ? 'md:w-[calc(100%-5rem)]' : 'md:w-[calc(100%-16rem)]'} w-full
        `}
      >
        
        <div 
          className="md:hidden w-full flex justify-center items-center h-8 cursor-pointer active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors rounded-t-2xl pointer-events-auto" 
          onClick={() => setIsFooterHidden(true)}
        >
          <ChevronDown className="w-6 h-6 text-zinc-400" />
        </div>

        {/* Removed Autoplay Prompt as per previous instruction */}

        <div className="hidden md:flex w-full h-full items-center justify-between gap-6 pointer-events-auto">
          <SongInfo />
          <div className="flex flex-col items-center flex-1 max-w-lg gap-1">
            <div className="flex items-center justify-center gap-5">
              <button onClick={(e) => handleSkip10('backward', e)} className="text-zinc-400 hover:text-indigo-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={handlePrevious} disabled={!hasSongs} className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 disabled:opacity-30"><SkipBack className="w-6 h-6 fill-current" /></button>
              <button onClick={togglePlay} disabled={!currentSong} className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg active:scale-90 transition-transform">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}</button>
              <button onClick={handleNext} disabled={!hasSongs} className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 disabled:opacity-30"><SkipForward className="w-6 h-6 fill-current" /></button>
              <button onClick={(e) => handleSkip10('forward', e)} className="text-zinc-400 hover:text-indigo-600 transition-colors"><RotateCw className="w-4 h-4" /></button>
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 font-mono w-10 text-right">{formatTime(playedSec)}</span>
              <div className="flex-1 relative flex items-center h-4 group cursor-pointer">
                <input type="range" min={0} max={duration || 100} step="any" value={playedSec} onChange={handleSeekChange} onMouseUp={handleSeekConfirm} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${progressPercent}%` }} /></div>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono w-10">{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400 w-[30%] justify-end">
            <button onClick={() => setIsShuffle(!isShuffle)}><Shuffle className={`w-4 h-4 transition-colors ${isShuffle ? 'text-indigo-600' : 'text-zinc-400'}`} /></button>
            <Repeat className="w-4 h-4 text-indigo-600" />
            <div className="flex items-center gap-2">
              <button onClick={() => { if (isMuted) setVolume(previousVolume); else { setPreviousVolume(volume); setVolume(0); } setIsMuted(!isMuted); }}>{isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}</button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-24 accent-indigo-600" />
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="flex flex-col w-full gap-2 md:hidden px-1 pb-2 pointer-events-auto">
          <div className="flex items-center justify-between w-full">
            <SongInfo />
            <div className="flex items-center gap-4 pr-2">
               <button onClick={() => setIsShuffle(!isShuffle)}><Shuffle className={`w-5 h-5 ${isShuffle ? 'text-indigo-600' : 'text-zinc-400'}`} /></button>
               <Repeat className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="w-full flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 font-mono">{formatTime(playedSec)}</span>
            <div className="flex-1 relative flex items-center h-8 cursor-pointer">
              <input type="range" min={0} max={duration || 100} step="any" value={playedSec} onChange={handleSeekChange} onTouchEnd={handleSeekConfirm} onMouseUp={handleSeekConfirm} className="absolute inset-0 w-full h-full opacity-0 z-20 touch-none" />
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center justify-center gap-8 pb-1">
             <button onClick={(e) => handleSkip10('backward', e)} className="text-zinc-400 active:text-indigo-600"><RotateCcw className="w-5 h-5" /></button>
             <SkipBack onClick={handlePrevious} className="w-7 h-7 text-zinc-700 dark:text-zinc-300" />
             <button onClick={togglePlay} className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">{isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current translate-x-0.5" />}</button>
             <SkipForward onClick={handleNext} className="w-7 h-7 text-zinc-700 dark:text-zinc-300" />
             <button onClick={(e) => handleSkip10('forward', e)} className="text-zinc-400 active:text-indigo-600"><RotateCw className="w-5 h-5" /></button>
          </div>
        </div>
      </footer>

      {/* FULLSCREEN VIEW (Kini magpabilin nga 'fixed' kay gusto nato motabon sa tibuok screen lakip ang sidebar) */}
      <div className={`fixed inset-0 z-99 bg-zinc-950/95 backdrop-blur-3xl transition-all duration-500 flex flex-col md:flex-row overflow-hidden ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        {thumbnailId && <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden"><img src={`https://i.ytimg.com/vi/${thumbnailId}/maxresdefault.jpg`} onError={(e) => { const target = e.target as HTMLImageElement; if (target?.src?.includes('maxresdefault')) target.src = `https://i.ytimg.com/vi/${thumbnailId}/hqdefault.jpg`; }} className="w-full h-full object-cover blur-[80px] scale-110" alt="" /></div>}
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20">
          <button onClick={() => setIsExpanded(false)} className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"><ChevronDown className="w-5 h-5 md:w-6 md:h-6" /></button>
          <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button onClick={() => setActiveTab('lyrics')} className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'lyrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}><Languages className="w-3.5 h-3.5 md:w-4 md:h-4" /> Lyrics</button>
            <button onClick={() => setActiveTab('chords')} className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'chords' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}><Guitar className="w-3.5 h-3.5 md:w-4 md:h-4" /> Chords</button>
          </div>
          <div className="w-9 h-9" />
        </div>
        <div className="w-full md:w-[45%] flex-none md:flex-1 flex flex-col items-center justify-center p-4 md:p-8 z-10 pt-24">
          <SongInfo isExpandedView={true} />
          <div className="w-full max-w-md mt-10 md:mt-12 space-y-8 px-4">
            <div className="w-full flex items-center gap-4">
              <span className="text-xs font-mono text-zinc-400">{formatTime(playedSec)}</span>
              <div className="flex-1 relative flex items-center h-6 cursor-pointer group">
                <input type="range" min={0} max={duration || 100} step="any" value={playedSec} onChange={handleSeekChange} onMouseUp={handleSeekConfirm} onTouchEnd={handleSeekConfirm} className="absolute inset-0 w-full h-full opacity-0 z-20" />
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white transition-all" style={{ width: `${progressPercent}%` }} /></div>
              </div>
              <span className="text-xs font-mono text-zinc-400">{formatTime(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-10">
              <RotateCcw onClick={(e) => handleSkip10('backward', e)} className="w-7 h-7 text-zinc-400 hover:text-white cursor-pointer" />
              <SkipBack onClick={handlePrevious} className="w-10 h-10 text-zinc-400 hover:text-white cursor-pointer" />
              <button onClick={togglePlay} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all">{isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-1" />}</button>
              <SkipForward onClick={handleNext} className="w-10 h-10 text-zinc-400 hover:text-white cursor-pointer" />
              <RotateCw onClick={(e) => handleSkip10('forward', e)} className="w-7 h-7 text-zinc-400 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto w-full md:w-auto md:h-full z-10 bg-black/40 md:border-l border-white/5 pb-24 md:pb-10 pt-6 md:pt-24 px-4 md:px-12 custom-scrollbar">
          <div className="max-w-2xl mx-auto">
            {currentSong && (activeTab === 'lyrics' ? (currentSong.lyrics ? formatLyrics(currentSong.lyrics) : <div className="text-center text-zinc-500 py-20">No Lyrics Found</div>) : (currentSong.chords ? <pre className="font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed p-4 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-white/5">{currentSong.chords}</pre> : <div className="text-center text-zinc-500 py-20">No Chords Found</div>))}
          </div>
        </div>
      </div>
    </>
  );
};