import { useState, useEffect, useRef } from 'react';
import { 
  Music, SkipBack, Play, Pause, SkipForward, 
  Repeat, Shuffle, Volume2, VolumeX 
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
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const Footer = ({ 
  currentSong, isPlaying, setIsPlaying, ytPlayer, 
  playlistSongs = [], onSongChange, volume, setVolume 
}: FooterProps) => {
  
  const [playedSec, setPlayedSec] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  
  const lastSongId = useRef<string | null>(null);

  // --- 1. RESET TIMER INIG ILIS OG KANTA ---
  useEffect(() => {
    if (currentSong && currentSong.id !== lastSongId.current) {
      setPlayedSec(0);
      setDuration(0);
      lastSongId.current = currentSong.id;
    }
  }, [currentSong]);

  // --- 2. SYNC PROGRESS WITH YOUTUBE PLAYER ---
  useEffect(() => {
    let interval: any;
    
    const syncProgress = () => {
      // Sigurohon nga ready na ang player ug ang iyang functions
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && !isSeeking) {
        const currentTime = ytPlayer.getCurrentTime();
        const totalTime = ytPlayer.getDuration();
        
        if (typeof currentTime === 'number') setPlayedSec(currentTime);
        if (typeof totalTime === 'number' && totalTime > 0) setDuration(totalTime);
      }
    };

    if (isPlaying) {
      // Update Progress taga 500ms (tunga sa segundo)
      syncProgress();
      interval = setInterval(syncProgress, 500); 
    }

    return () => clearInterval(interval);
  }, [isPlaying, ytPlayer, isSeeking, currentSong]);

  // Handle Mute logic
  useEffect(() => { if (!isMuted) setPreviousVolume(volume); }, [volume, isMuted]);

  const currentIndex = currentSong ? playlistSongs.findIndex(s => s.id === currentSong.id) : -1;
  const hasSongs = playlistSongs.length > 1;

  const handlePrevious = () => {
    if (currentIndex !== -1 && hasSongs) {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlistSongs.length - 1;
      onSongChange?.(playlistSongs[prevIndex]);
    }
  };

  const handleNext = () => {
    if (currentIndex !== -1 && hasSongs) {
      const nextIndex = currentIndex < playlistSongs.length - 1 ? currentIndex + 1 : 0;
      onSongChange?.(playlistSongs[nextIndex]);
    }
  };

  const progressPercent = duration > 0 ? (playedSec / duration) * 100 : 0;
  const getYTId = (url?: string) => url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&]{11})/)?.[1] ?? null;
  const thumbnailId = currentSong?.url ? getYTId(currentSong.url) : null;
  const thumb = thumbnailId ? `https://i.ytimg.com/vi/${thumbnailId}/mqdefault.jpg` : null;

  // Handle Manual Seek (Slider)
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setPlayedSec(parseFloat(e.target.value));
  };

  const handleSeekConfirm = (e: any) => {
    setIsSeeking(false);
    const newTime = parseFloat(e.target.value);
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(newTime, true);
      // Inig buhi sa slider, i-ensure nato nga mag play ang video (Importante sa iPhone)
      ytPlayer.playVideo();
      setIsPlaying(true);
    }
  };

  const SongInfo = () => (
    <div className="flex items-center gap-3 flex-1 min-w-0 md:w-[30%]">
      {currentSong ? (
        <>
          <div className="relative shrink-0">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700">
              {thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <Music className="m-auto mt-2.5 md:mt-4 text-zinc-400 w-5 h-5 md:w-6 md:h-6" />}
            </div>
            {isPlaying && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse border border-white dark:border-zinc-900" />}
          </div>
          <div className="flex flex-col min-w-0 w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
            <div className={`whitespace-nowrap inline-block ${isPlaying ? 'animate-marquee' : ''}`}>
              <span className="text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100 pr-8">{currentSong.title}</span>
              {isPlaying && <span className="text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100 pr-8">{currentSong.title}</span>}
            </div>
            <span className="text-[10px] md:text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-semibold uppercase tracking-wider mt-0.5">{currentSong.artist}</span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 opacity-30">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="w-24 h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      )}
    </div>
  );

  return (
    <footer className="w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-zinc-800/50 p-3 md:px-6 md:py-0 md:h-24 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      
      {/* 1. DESKTOP VIEW */}
      <div className="hidden md:flex w-full h-full items-center justify-between gap-6">
        <SongInfo />
        
        <div className="flex flex-col items-center flex-1 max-w-lg gap-1">
          <div className="flex items-center justify-center gap-7">
            <button onClick={handlePrevious} disabled={!hasSongs} className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 transition-colors disabled:opacity-30"><SkipBack className="w-6 h-6 fill-current" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} disabled={!currentSong} className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg active:scale-90 transition-transform">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}</button>
            <button onClick={handleNext} disabled={!hasSongs} className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 transition-colors disabled:opacity-30"><SkipForward className="w-6 h-6 fill-current" /></button>
          </div>

          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono w-10 text-right">{formatTime(playedSec)}</span>
            <div className="flex-1 relative flex items-center h-4 group cursor-pointer">
              <input type="range" min={0} max={duration || 100} step="any" value={playedSec} onChange={handleSeekChange} onMouseUp={handleSeekConfirm} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden pointer-events-none"><div className="h-full bg-indigo-600" style={{ width: `${progressPercent}%` }} /></div>
              <div className="absolute w-3 h-3 bg-white border-2 border-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progressPercent}% - 6px)` }} />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400 w-[30%] justify-end">
          <Shuffle className="w-4 h-4 hover:text-indigo-600 cursor-pointer" />
          <Repeat className="w-4 h-4 text-indigo-600" />
          <div className="flex items-center gap-2 group">
            <button onClick={() => { if (isMuted) setVolume(previousVolume); else { setPreviousVolume(volume); setVolume(0); } setIsMuted(!isMuted); }}>{isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}</button>
            <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-24 accent-indigo-600" />
          </div>
        </div>
      </div>

      {/* 2. MOBILE VIEW */}
      <div className="flex flex-col w-full gap-2 md:hidden">
        <div className="flex items-center justify-between w-full">
          <SongInfo />
          <div className="flex items-center gap-3">
             <Shuffle className="w-4 h-4 text-zinc-400" />
             <Repeat className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
        
        <div className="w-full flex items-center gap-2 px-1">
          <span className="text-[9px] text-zinc-500 font-mono">{formatTime(playedSec)}</span>
          <div className="flex-1 relative flex items-center h-8 cursor-pointer">
            <input type="range" min={0} max={duration || 100} step="any" value={playedSec} onChange={handleSeekChange} onTouchEnd={handleSeekConfirm} onMouseUp={handleSeekConfirm} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 touch-none" />
            <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden pointer-events-none"><div className="h-full bg-indigo-600" style={{ width: `${progressPercent}%` }} /></div>
            <div className="absolute w-3 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-lg pointer-events-none" style={{ left: `calc(${progressPercent}% - 6px)` }} />
          </div>
          <span className="text-[9px] text-zinc-500 font-mono">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-10 pb-1">
           <SkipBack onClick={handlePrevious} className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
           <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}</button>
           <SkipForward onClick={handleNext} className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
        </div>
      </div>

    </footer>
  );
};