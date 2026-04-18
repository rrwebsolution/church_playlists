import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Music, SkipBack, Play, Pause, SkipForward,
  Repeat, Shuffle, Volume2, VolumeX, ChevronDown, Languages, Guitar, Maximize2,
  RotateCcw, RotateCw, RefreshCcw, Mic, MicOff
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
  hasInteracted: boolean;
  isSidebarCollapsed: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Gitangtang ang header parsing diri kay dili na kinahanglan para sa synced lyrics
const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;
  let cleanLyrics = lyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, ''); // Tangtangon ang timestamps
  cleanLyrics = cleanLyrics.replace(/&#039;/g, "'").replace(/&quot;/g, '"');
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: any[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmedLine = rawLines[i].trim();
    if (trimmedLine === "") {
      processedLines.push(<div key={i} className="h-6 md:h-8"></div>);
    } else {
      // Kini para sa plain text lyrics kung walay timestamps
      processedLines.push(<div key={i} className="text-white/95 leading-relaxed font-bold text-[18px] md:text-2xl py-1 text-center drop-shadow-md">{trimmedLine}</div>);
    }
  }
  return processedLines;
};

const getYTId = (url?: string) => url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&]{11})/)?.[1] ?? null;

// --- SYNCED LYRICS HELPERS ---
type SyncedLine = { time: number; text: string };

const parseLRC = (text: string): SyncedLine[] | null => {
  const lines = text.split(/\r?\n/);
  const result: SyncedLine[] = [];
  let hasTs = false;
  for (const line of lines) {
    // Regex para sa standard LRC format [mm:ss.xx]
    const m = line.match(/^\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (m) {
      hasTs = true;
      // Convert time to seconds
      const sec = +m[1] * 60 + +m[2] + +m[3] / (m[3].length === 3 ? 1000 : 100);
      if (m[4].trim()) { // Siguroha nga naay text ang linya
         result.push({ time: sec, text: m[4].trim() });
      }
    }
  }
  // Mobalik lang og data kung naay timestamps nga nadetect
  return hasTs ? result : null; 
};

// Gitangtang ang header at chord detection diri kay para lang ni sa plain text format
const getPlainLines = (text: string): string[] => {
  return text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
};

export const Footer = ({
  currentSong, isPlaying, setIsPlaying, ytPlayer, playlistSongs = [], onSongChange, volume, setVolume,
  isSidebarCollapsed
}: FooterProps) => {
  const [playedSec, setPlayedSec] = useState(0);
  const [duration, setDuration] = useState(0);
  const [manualOffset, setManualOffset] = useState(0); // State para sa manual sync offset
  const [isSeeking, setIsSeeking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [isFooterHidden, setIsFooterHidden] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isMicListening, setIsMicListening] = useState(false);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Get the offset from the song object (if exists) or use 0
  // Use 'as any' if 'offset' is not yet in your Song type definition
  const dbOffset = (currentSong as any)?.offset || 0; 

  const hasLRC = useMemo(() => !!parseLRC(currentSong?.lyrics || ''), [currentSong?.lyrics]);

  // Build synced lines, applying both database offset and manual offset
  const syncedLines = useMemo<SyncedLine[] | null>(() => {
    if (!currentSong?.lyrics) return null;
    
    const lrcLines = parseLRC(currentSong.lyrics);
    
    if (lrcLines) {
      // If LRC format is available, apply offsets
      return lrcLines.map(line => ({ 
        ...line, 
        time: line.time + (dbOffset / 1000) + manualOffset 
      }));
    } else {
      // Fallback for plain text lyrics (no timestamps) - will not sync properly
      const plain = getPlainLines(currentSong.lyrics);
      if (plain.length === 0 || duration <= 0) return null;
      const interval = duration / plain.length;
      return plain.map((text, i) => ({ time: i * interval, text }));
    }
  }, [currentSong?.lyrics, dbOffset, manualOffset, duration]);

  // Determine the current line based on playedSec and syncedLines
  const currentLineIndex = useMemo(() => {
    if (!syncedLines || syncedLines.length === 0) return -1;
    // Prevent highlighting if we haven't reached the first timestamp yet
    if (playedSec < syncedLines[0].time) return -1;
    
    let idx = 0;
    for (let i = 0; i < syncedLines.length; i++) {
      if (playedSec >= syncedLines[i].time) idx = i;
      else break;
    }
    return idx;
  }, [syncedLines, playedSec]);

  // Reset manual offset and played time when the song changes
  useEffect(() => {
    setManualOffset(0);
    setPlayedSec(0);
    setDuration(0);
    setAutoScroll(true);
    stopVoiceSync();
  }, [currentSong?.id]);

  // Enable auto-scroll whenever fullscreen view opens
  useEffect(() => {
    if (isExpanded) setAutoScroll(true);
  }, [isExpanded]);

  // Auto-scroll lyrics to current line
  useEffect(() => {
    if (!isExpanded || !autoScroll || currentLineIndex < 0) return;
    lineRefs.current[currentLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIndex, isExpanded, autoScroll]);

  // Update played time and duration from YouTube Player
  useEffect(() => {
    if (!ytPlayer) return;
    const interval = setInterval(() => {
      if (isSeeking) return;
      try {
        const state = ytPlayer.getPlayerState?.();
        // Only update if the player is playing, paused, or buffering
        if (state === 1 || state === 2 || state === 3) {
          const currentTime = ytPlayer.getCurrentTime?.();
          const duration = ytPlayer.getDuration?.();
          if (typeof currentTime === 'number' && currentTime >= 0) {
            setPlayedSec(currentTime);
          }
          if (typeof duration === 'number' && duration > 0) {
            setDuration(duration);
          }
        }
      } catch (err) {
        // Ignore errors, likely player not ready yet
      }
    }, 500);
    return () => clearInterval(interval);
  }, [ytPlayer, isSeeking]);

  // Manual Sync Handler
  const handleManualSync = () => {
    // Find the time of the first lyric line
    const firstLineTime = parseLRC(currentSong?.lyrics || "")?.[0]?.time;
    if (firstLineTime !== undefined && playedSec >= firstLineTime) {
      // Calculate the offset needed to align the first lyric line with the current playback time
      setManualOffset(playedSec - firstLineTime);
    } else if (firstLineTime !== undefined) {
      // If current time is before the first line, maybe reset or prompt user
      // For now, let's just show a message
      console.warn("Cannot sync before the first lyric line starts.");
    } else {
      console.warn("No LRC timestamps found to sync.");
    }
  };

  // --- Voice Sync ---
  const startVoiceSync = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Try Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      if (!syncedLines || syncedLines.length === 0) return;
      const transcript = Array.from(event.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      if (transcript.length < 3) return;

      const words = transcript.split(/\s+/).filter(w => w.length > 2);
      let bestIndex = -1;
      let bestScore = 0;
      syncedLines.forEach((line, i) => {
        const lineWords = line.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        const matches = words.filter(w => lineWords.some(lw => lw === w || lw.startsWith(w) || w.startsWith(lw)));
        const score = matches.length / Math.max(words.length, lineWords.length);
        if (score > bestScore && score >= 0.3) { bestScore = score; bestIndex = i; }
      });

      if (bestIndex >= 0 && ytPlayer?.seekTo) {
        ytPlayer.seekTo(syncedLines[bestIndex].time, true);
        setPlayedSec(syncedLines[bestIndex].time);
        setAutoScroll(true);
      }
    };

    recognition.onerror = () => { setIsMicListening(false); isListeningRef.current = false; };
    recognition.onend = () => { if (isListeningRef.current) recognition.start(); };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsMicListening(true);
    recognition.start();
  };

  const stopVoiceSync = () => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsMicListening(false);
  };

  const toggleVoiceSync = () => isMicListening ? stopVoiceSync() : startVoiceSync();

  // --- Event Handlers ---
  const handlePrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentSong || !playlistSongs || playlistSongs.length === 0) return;
    const currentIndex = playlistSongs.findIndex(s => s.id === currentSong.id);
    if (currentIndex !== -1) {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlistSongs.length - 1;
      onSongChange?.(playlistSongs[prevIndex]);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentSong || !playlistSongs || playlistSongs.length === 0) return;
    const currentIndex = playlistSongs.findIndex(s => s.id === currentSong.id);
    if (currentIndex !== -1) {
      let nextIndex;
      if (isShuffle) {
        do { 
          nextIndex = Math.floor(Math.random() * playlistSongs.length); 
        } while (nextIndex === currentIndex && playlistSongs.length > 1);
      } else {
        nextIndex = currentIndex < playlistSongs.length - 1 ? currentIndex + 1 : 0;
      }
      onSongChange?.(playlistSongs[nextIndex]);
    }
  };

  const handleSkip10 = (direction: 'forward' | 'backward', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function' || duration === 0) return;
    const currentTime = ytPlayer.getCurrentTime();
    const newTime = direction === 'forward' 
      ? Math.min(duration, currentTime + 10) 
      : Math.max(0, currentTime - 10);
    ytPlayer.seekTo(newTime, true);
    setPlayedSec(newTime); // Update state immediately
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
      // Ensure playback continues if it was playing
      if (isPlaying) ytPlayer.playVideo(); 
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return; // Do nothing if no song is selected
    if (isPlaying) {
      ytPlayer?.pauseVideo?.();
    } else {
      ytPlayer?.playVideo?.();
    }
    setIsPlaying(!isPlaying);
  };

  const thumbnailId = currentSong?.url ? getYTId(currentSong.url) : null;
  const progressPercent = duration > 0 ? (playedSec / duration) * 100 : 0;

  // --- Components ---
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
        ${isSidebarCollapsed ? 'md:w-[calc(100%-5rem)]' : 'md:w-[calc(100%-16rem)]'} w-full
        `}
      >
        
        <div 
          className="md:hidden w-full flex justify-center items-center h-8 cursor-pointer active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors rounded-t-2xl pointer-events-auto" 
          onClick={() => setIsFooterHidden(true)}
        >
          <ChevronDown className="w-6 h-6 text-zinc-400" />
        </div>

        <div className="hidden md:flex w-full h-full items-center justify-between gap-6 pointer-events-auto">
          <SongInfo />
          <div className="flex flex-col items-center flex-1 max-w-lg gap-1">
            <div className="flex items-center justify-center gap-5">
              <button onClick={(e) => handleSkip10('backward', e)} className="text-zinc-400 hover:text-indigo-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={handlePrevious} disabled={!playlistSongs || playlistSongs.length <= 1} className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 disabled:opacity-30"><SkipBack className="w-6 h-6 fill-current" /></button>
              <button onClick={togglePlay} disabled={!currentSong} className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg active:scale-90 transition-transform">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}</button>
              <button onClick={handleNext} disabled={!playlistSongs || playlistSongs.length <= 1} className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 disabled:opacity-30"><SkipForward className="w-6 h-6 fill-current" /></button>
              <button onClick={(e) => handleSkip10('forward', e)} className="text-zinc-400 hover:text-indigo-600 transition-colors"><RotateCw className="w-4 h-4" /></button>
            </div>

            {/* Current lyric preview in collapsed footer */}
            {syncedLines && currentLineIndex >= 0 && (
              <p
                key={currentLineIndex}
                className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 truncate max-w-xs text-center animate-in fade-in duration-300"
              >
                {syncedLines[currentLineIndex].text}
              </p>
            )}

            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 font-mono w-10 text-right">{formatTime(playedSec)}</span>
              <div className="flex-1 relative flex items-center h-4 group cursor-pointer">
                {/* Seek bar input */}
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  step="any" 
                  value={playedSec} 
                  onChange={handleSeekChange} 
                  onMouseUp={handleSeekConfirm} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                />
                {/* Seek bar visual */}
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono w-10">{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400 w-[30%] justify-end">
            <button onClick={() => setIsShuffle(!isShuffle)}><Shuffle className={`w-4 h-4 transition-colors ${isShuffle ? 'text-indigo-600' : 'text-zinc-400'}`} /></button>
            <Repeat className="w-4 h-4 text-indigo-600" /> {/* Repeat button - may need implementation */}
              <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">{isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}</button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} className="w-24 accent-indigo-600" />
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="flex flex-col w-full gap-2 md:hidden px-1 pb-2 pointer-events-auto">
          <div className="flex items-center justify-between w-full">
            <SongInfo />
            <div className="flex items-center gap-4 pr-2">
               <button onClick={() => setIsShuffle(!isShuffle)}><Shuffle className={`w-5 h-5 ${isShuffle ? 'text-indigo-600' : 'text-zinc-400'}`} /></button>
               <Repeat className="w-5 h-5 text-indigo-600" /> {/* Repeat button */}
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

      {/* FULLSCREEN VIEW */}
      <div className={`fixed inset-0 z-99 bg-zinc-950/95 backdrop-blur-3xl transition-all duration-500 flex flex-col md:flex-row overflow-hidden ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        {thumbnailId && <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden"><img src={`https://i.ytimg.com/vi/${thumbnailId}/maxresdefault.jpg`} onError={(e) => { const target = e.target as HTMLImageElement; if (target?.src?.includes('maxresdefault')) target.src = `https://i.ytimg.com/vi/${thumbnailId}/hqdefault.jpg`; }} className="w-full h-full object-cover blur-[80px] scale-110" alt="" /></div>}
        
        {/* Top Controls Bar */}
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20">
          <button onClick={() => setIsExpanded(false)} className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"><ChevronDown className="w-5 h-5 md:w-6 md:h-6" /></button>
          <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button onClick={() => setActiveTab('lyrics')} className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'lyrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}><Languages className="w-3.5 h-3.5 md:w-4 md:h-4" /> Lyrics</button>
            <button onClick={() => setActiveTab('chords')} className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'chords' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}><Guitar className="w-3.5 h-3.5 md:w-4 md:h-4" /> Chords</button>
          </div>
          {/* Placeholder for potential right-side controls */}
          <div className="w-9 h-9" /> 
        </div>

        {/* Left Side: Song Info, Playback Controls, Seek Bar */}
        <div className="w-full md:w-[45%] flex-none md:flex-1 flex flex-col items-center justify-center p-4 md:p-8 z-10 pt-24">
          <SongInfo isExpandedView={true} />
          <div className="w-full max-w-md mt-10 md:mt-12 space-y-8 px-4">
            {/* Seek Bar */}
            <div className="w-full flex items-center gap-4">
              <span className="text-xs font-mono text-zinc-400">{formatTime(playedSec)}</span>
              <div className="flex-1 relative flex items-center h-6 cursor-pointer group">
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  step="any" 
                  value={playedSec} 
                  onChange={handleSeekChange} 
                  onMouseUp={handleSeekConfirm} 
                  onTouchEnd={handleSeekConfirm} // For touch devices
                  className="absolute inset-0 w-full h-full opacity-0 z-20" 
                />
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-400">{formatTime(duration)}</span>
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-10">
              <RotateCcw onClick={(e) => handleSkip10('backward', e)} className="w-7 h-7 text-zinc-400 hover:text-white cursor-pointer" />
              <SkipBack onClick={handlePrevious} className="w-10 h-10 text-zinc-400 hover:text-white cursor-pointer" />
              <button onClick={togglePlay} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all">
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-1" />}
              </button>
              <SkipForward onClick={handleNext} className="w-10 h-10 text-zinc-400 hover:text-white cursor-pointer" />
              <RotateCw onClick={(e) => handleSkip10('forward', e)} className="w-7 h-7 text-zinc-400 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Right Side: Lyrics / Chords View */}
        <div className="flex-1 overflow-y-auto w-full md:w-auto md:h-full z-10 bg-black/40 md:border-l border-white/5 pb-24 md:pb-10 pt-6 md:pt-24 px-4 md:px-12 custom-scrollbar">
          <div className="max-w-2xl mx-auto">
            {currentSong && (
              activeTab === 'lyrics' ? (
                syncedLines && syncedLines.length > 0 ? (
                  // Synced Lyrics View
                  <div className="space-y-1 py-4">
                    {/* SYNC BUTTONS */}
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <div className="flex justify-center gap-3">
                        {hasLRC && (
                          <button
                            onClick={handleManualSync}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-full text-white text-xs font-bold uppercase transition-colors"
                          >
                            <RefreshCcw className="w-4 h-4" /> Sync Lyrics
                          </button>
                        )}
                        <button
                          onClick={toggleVoiceSync}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold uppercase transition-colors ${isMicListening ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                        >
                          {isMicListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          {isMicListening ? 'Stop' : 'Voice Sync'}
                        </button>
                      </div>
                      {/* OFFSET CONTROLS */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setManualOffset(o => o - 0.5)}
                          className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition-colors"
                        >−</button>
                        <span className="text-xs text-zinc-400 font-mono w-20 text-center">
                          {manualOffset === 0 ? 'offset: 0s' : `offset: ${manualOffset > 0 ? '+' : ''}${manualOffset.toFixed(1)}s`}
                        </span>
                        <button
                          onClick={() => setManualOffset(o => o + 0.5)}
                          className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition-colors"
                        >+</button>
                      </div>
                    </div>
                    
                    {/* Render Lyrics */}
                    {syncedLines.map((line, i) => {
                      const dist = i - currentLineIndex;
                      const isCurrent = i === currentLineIndex;
                      const isNear = Math.abs(dist) <= 2; // Highlight lines close to the current one
                      return (
                        <div
                          key={i}
                          ref={(el) => { lineRefs.current[i] = el; }}
                          className={`text-center py-2 transition-all duration-500 leading-relaxed
                            ${isCurrent
                              ? 'text-white text-2xl md:text-3xl font-black drop-shadow-[0_0_20px_rgba(99,102,241,0.8)] scale-105'
                              : isNear
                              ? 'text-white/40 text-lg md:text-xl font-semibold'
                              : 'text-white/15 text-base font-medium'
                            }`}
                        >
                          {line.text}
                        </div>
                      );
                    })}
                  </div>
                ) : currentSong.lyrics ? (
                  // Render plain text lyrics if no timestamps found
                  <div className="text-center text-zinc-400 py-20">
                    Lyrics found, but no timestamps detected. <br />
                    <span className="text-xs">Consider adding LRC format for proper syncing.</span>
                    {formatLyrics(currentSong.lyrics)}
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 py-20">No Lyrics Found</div>
                )
              ) : (
                // Chords View
                currentSong.chords
                  ? <pre className="font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed p-4 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-white/5">{currentSong.chords}</pre>
                  : <div className="text-center text-zinc-500 py-20">No Chords Found</div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
};