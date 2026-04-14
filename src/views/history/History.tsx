import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  History as HistoryIcon, RotateCcw, Calendar, Trash2, Clock, Music, CheckCircle2, Sparkles,
} from 'lucide-react';
import type { Song } from '../types';
import Swal from 'sweetalert2';

export default function History() {
  // Gikuha nato ang setPlayHistory para ma-clear nato ang localStorage
  const { playHistory = [], setPlayHistory, setCurrentSong, selectSong, setIsPlaying } = useOutletContext<any>();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    playHistory.forEach((log: any) => {
      const dateKey = new Date(log.playedAt).toLocaleDateString(undefined, { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });

    const formattedGroups = Object.entries(groups).map(([date, logs], index) => ({
      id: `session-${index}`,
      date: date,
      label: `${date} Session`,
      songs: logs
    }));

    if (formattedGroups.length > 0 && !expandedId) setExpandedId(formattedGroups[0].id);
    return formattedGroups;
  }, [playHistory]);

  const handlePlayAgain = (song: Song) => {
    selectSong?.(song) ?? (setCurrentSong(song), setIsPlaying(true));
  };

  // UPDATED CLEAR HISTORY WITH SWEETALERT PARA NINDOT
  const handleClearHistory = async () => {
    const result = await Swal.fire({
      title: 'Clear History?',
      text: "This will permanently delete your local play logs.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, clear it!'
    });

    if (result.isConfirmed) {
      setPlayHistory([]);
      localStorage.removeItem('jamc_history'); // Manual clear sa storage
      Swal.fire('Cleared!', 'Your history has been deleted.', 'success');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* HEADER */}
      <div className="relative p-8 bg-linear-to-br from-indigo-600/10 to-blue-600/10 dark:from-indigo-500/5 dark:to-blue-500/5 rounded-[2.5rem] border border-indigo-500/10 dark:border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Sparkles className="w-24 h-24 text-indigo-500" /></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30"><HistoryIcon className="w-5 h-5 text-white" /></div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Activity Log</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Play History</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium max-w-md leading-relaxed">
               History is limited to the last <b>50 songs</b> to keep the app fast and lightweight.
            </p>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="space-y-4">
        {groupedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-zinc-900/30 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
             <HistoryIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
             <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No History Yet</h3>
          </div>
        ) : (
          groupedHistory.map((session) => (
            <div key={session.id} className={`group border transition-all duration-500 rounded-[2rem] overflow-hidden ${expandedId === session.id ? 'bg-white dark:bg-zinc-900/50 border-indigo-500/30 shadow-2xl' : 'bg-white/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-white/5'}`}>
              <button onClick={() => setExpandedId(expandedId === session.id ? null : session.id)} className="w-full flex items-center justify-between p-6 md:p-8 outline-none">
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-2xl transition-all ${expandedId === session.id ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}><Calendar className="w-6 h-6" /></div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{session.date}</span>
                    <h3 className={`text-lg md:text-xl font-black ${expandedId === session.id ? 'text-indigo-600' : 'text-zinc-900 dark:text-zinc-100'}`}>{session.label}</h3>
                  </div>
                </div>
                <span className="hidden md:block text-[10px] font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">{session.songs.length} Songs</span>
              </button>

              <div className={`transition-all duration-500 ${expandedId === session.id ? 'max-h-250 opacity-100 pb-8' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-6 md:px-8 space-y-3">
                  {session.songs.map((log: any) => (
                    <div key={log.id} className="group/item flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm"><Music className="w-5 h-5 text-indigo-500" /></div>
                        <div className="min-w-0">
                          <h4 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-sm md:text-base">{log.song.title}</h4>
                          <p className="text-xs font-bold text-zinc-500 uppercase">{log.song.artist || 'Unknown Artist'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                        <div className="flex flex-col items-end">
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase"><Clock className="w-3 h-3" /> {new Date(log.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase"><CheckCircle2 className="w-3 h-3" /> Played</div>
                        </div>
                        <button onClick={() => handlePlayAgain(log.song)} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-indigo-600 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-indigo-50 transition-all font-bold text-[10px] uppercase"><RotateCcw className="w-4 h-4" /> Replay</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      {groupedHistory.length > 0 && (
        <div className="flex flex-col items-center gap-4 pt-10">
          <button onClick={handleClearHistory} className="flex items-center gap-2 px-6 py-3 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Trash2 className="w-4 h-4" /> Clear All History Data
          </button>
          <p className="text-zinc-400 dark:text-zinc-600 text-[9px] font-bold uppercase tracking-[0.2em]">Storage limit: 50 tracks maximum</p>
        </div>
      )}
    </div>
  );
}