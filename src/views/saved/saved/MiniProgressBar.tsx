import { useState, useEffect } from 'react';
import { formatTime } from '../utils/formatters';

interface MiniProgressBarProps {
  ytPlayer: any;
  isPlaying: boolean;
  isCurrent: boolean;
}

export const MiniProgressBar = ({ ytPlayer, isPlaying, isCurrent }: MiniProgressBarProps) => {
  const [playedSec, setPlayedSec] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isCurrent || !ytPlayer) return;

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
        <div 
          className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>
      <span className="text-[10px] text-zinc-500 font-mono font-bold w-8 text-right">{formatTime(duration)}</span>
    </div>
  );
};