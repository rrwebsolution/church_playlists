import { useState, useMemo } from 'react';
import { 
  Folder, FolderPlus, Trash2, Check, Music, 
  ListMusic, Sparkles, Edit2, X, Filter, CalendarDays, Clock
} from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';

export const PlayingVisualizer = () => (
  <div className="flex items-end justify-center gap-0.75 w-6 h-6">
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_0.6s_ease-in-out_infinite]" />
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_0.7s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_1.1s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }} />
  </div>
);

// --- DATE FORMATTER HELPER (USES created_at) ---
const formatFolderDate = (folder: any) => {
  let dateObj: Date;

  // 1. Unahon ang created_at gikan sa database
  if (folder.created_at) {
    dateObj = new Date(folder.created_at);
  } 
  // 2. Kung walay created_at, gamiton ang id as fallback
  else {
    const timestamp = parseInt(folder.id);
    if (timestamp && timestamp > 1000000000000) {
      dateObj = new Date(timestamp);
    } else {
      return 'Unknown Date';
    }
  }
  
  return dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }); 
};

// --- TIMESTAMP EXTRACTOR PARA SA SORTING & GROUPING ---
const getFolderTime = (folder: any) => {
  if (folder.created_at) {
    return new Date(folder.created_at).getTime();
  }
  const timeVal = parseInt(folder.id);
  return (timeVal > 1000000000000) ? timeVal : 0;
};

export default function FolderList({ 
  folders, setFolders, setActiveFolderId, currentSong, 
  isPlaying, inputValue 
}: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); 

  // ===================== DATE GROUPING LOGIC =====================
  const groupedFolders = useMemo(() => {
    let filtered = folders.filter((f: PlaylistFolder) => 
      f.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    // SORT BY DATABASE CREATED_AT
    filtered.sort((a: PlaylistFolder, b: PlaylistFolder) => {
      const timeA = getFolderTime(a);
      const timeB = getFolderTime(b);
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    const groups: Record<string, PlaylistFolder[]> = {
      'Today': [],
      'This Week': [],
      'Last Week': [],
      'Older': []
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const thisWeekStart = todayStart - (7 * oneDay);
    const lastWeekStart = todayStart - (14 * oneDay);

    filtered.forEach((folder: PlaylistFolder) => {
      const folderTime = getFolderTime(folder) || now.getTime();

      if (folderTime >= todayStart) {
        groups['Today'].push(folder);
      } else if (folderTime >= thisWeekStart) {
        groups['This Week'].push(folder);
      } else if (folderTime >= lastWeekStart) {
        groups['Last Week'].push(folder);
      } else {
        groups['Older'].push(folder);
      }
    });

    return groups;
  }, [folders, inputValue, sortOrder]);

  // ===================== DELETE LOGIC =====================
  const handleDeleteFolder = async (folder: PlaylistFolder) => {
    if (folder.songs && folder.songs.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Action Denied',
        html: `Cannot delete <b>"${folder.name}"</b> because it still contains <b>${folder.songs.length} song(s)</b>.<br><br><small class="text-zinc-500">Please empty the folder first before deleting it.</small>`,
        confirmButtonColor: '#4f46e5',
        background: document.documentElement.classList.contains('dark') ? '#18181b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800' }
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${folder.name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, delete it',
      background: document.documentElement.classList.contains('dark') ? '#18181b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
      customClass: { popup: 'rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800' }
    });

    if (result.isConfirmed) {
      setFolders((prev: PlaylistFolder[]) => prev.filter(f => f.id !== folder.id));
    }
  };

  // ===================== EDIT LOGIC =====================
  const startEditing = (folder: PlaylistFolder) => {
    setEditingId(folder.id);
    setEditValue(folder.name);
  };

  const handleSaveEdit = (folderId: string) => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Folder name cannot be empty!', confirmButtonColor: '#4f46e5' });
      return;
    }
    setFolders((prev: PlaylistFolder[]) => prev.map((f) => (f.id === folderId ? { ...f, name: trimmedValue } : f)));
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2 relative z-10">
        <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 drop-shadow-sm pb-1">
              Library
            </h1>
            <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-[0.25em] flex items-center gap-2">
              <ListMusic className="w-4 h-4" /> Worship Playlists
            </p>
        </div>
        
        {/* FILTER BUTTON */}
        <button 
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="flex items-center gap-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl px-6 py-3.5 rounded-full border border-zinc-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-600 dark:text-zinc-300 active:scale-95 group"
        >
          <Filter className="w-4 h-4" />
          <div className="flex flex-col items-start leading-none mt-0.5">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Sort By</span>
            <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </span>
          </div>
        </button>
      </div>
      
      {/* EMPTY STATE SECTION */}
      {folders.length === 0 ? (
        <div className="relative overflow-hidden flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[3rem] text-center px-6 shadow-xl shadow-zinc-200/20 dark:shadow-none group transition-all duration-700 hover:border-indigo-500/20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 bg-indigo-500/10 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none transition-opacity duration-700 group-hover:opacity-70" />
          
          <div className="relative p-6 bg-white dark:bg-zinc-800/80 shadow-2xl shadow-indigo-500/10 rounded-3xl mb-8 border border-zinc-100 dark:border-zinc-700 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700 ease-out">
            <FolderPlus className="w-16 h-16 text-indigo-500 dark:text-indigo-400" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-4 border-white dark:border-zinc-800 animate-pulse" />
          </div>
          
          <h2 className="relative text-3xl font-bold text-zinc-900 dark:text-white mb-12 tracking-tight flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-400" /> Start Building
          </h2>
          
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl text-left w-full">
            {[ 
              { num: 1, title: 'Create Folder', desc: 'Use the search bar above to generate folders and organize your worship sets.', color: 'from-indigo-500 to-blue-500' },
              { num: 2, title: 'Add Songs', desc: 'Open a folder, select a mode, and search or paste a YouTube link to add tracks.', color: 'from-purple-500 to-pink-500' }
            ].map((step) => (
              <div key={step.num} className="p-7 bg-white/60 dark:bg-zinc-800/50 backdrop-blur-xl rounded-[2rem] border border-zinc-100/50 dark:border-zinc-700/50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group/card">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 bg-linear-to-br ${step.color} text-white text-sm font-black flex items-center justify-center rounded-2xl shadow-lg transform group-hover/card:scale-110 group-hover/card:rotate-6 transition-all duration-300`}>
                    {step.num}
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{step.title}</h3>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
       
       /* GROUPED GRID FOLDER SECTION */
       <div className="space-y-12">
        {Object.entries(groupedFolders).map(([label, items]) => {
          if (items.length === 0) return null; 
          
          return (
            <div key={label} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* GROUP LABEL HEADER */}
              <div className="flex items-center gap-4 mb-6 px-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <CalendarDays className="w-5 h-5" />
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-widest">{label}</h3>
                </div>
                <span className="px-2.5 py-1 bg-zinc-200/50 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500">{items.length}</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800/50 flex-1 ml-2"></div>
              </div>

              {/* GRID ITEMS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((folder: PlaylistFolder) => {
                  const isThisFolderPlaying = folder.songs.some((s: Song) => s.id === currentSong?.id) && isPlaying;
                  const isEditingThis = editingId === folder.id;
                  
                  return (
                    <div 
                      key={folder.id} 
                      onClick={() => !isEditingThis && setActiveFolderId(folder.id)} 
                      className={`group relative flex flex-col p-6 rounded-[2rem] transition-all duration-500 ease-out cursor-pointer overflow-hidden backdrop-blur-xl
                        ${isThisFolderPlaying 
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950 shadow-2xl shadow-indigo-500/20 scale-[1.02] z-10' 
                          : 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] hover:border-indigo-500/40 hover:-translate-y-1.5'
                        }`}
                    >
                      {/* Animated Glow Backdrop for Playing State */}
                      {isThisFolderPlaying && (
                        <div className="absolute -inset-24 bg-linear-to-tr from-indigo-500/20 to-purple-500/20 blur-[60px] opacity-60 pointer-events-none animate-pulse" />
                      )}

                      <div className="relative z-10 flex justify-between items-start mb-6">
                        
                        {/* FOLDER ICON CONTAINER */}
                        <div className="relative">
                            <div className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ease-spring group-hover:scale-105 group-hover:-rotate-3 shadow-sm
                              ${isThisFolderPlaying 
                                ? 'bg-linear-to-br from-indigo-500 to-purple-500 text-white shadow-indigo-500/40' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                              }`}
                            >
                              {isThisFolderPlaying ? <PlayingVisualizer /> : <Folder className={`w-6 h-6 transition-all duration-500 ${!isThisFolderPlaying && 'fill-current opacity-20 group-hover:opacity-100'}`} />}
                            </div>
                            {isThisFolderPlaying && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-indigo-50 dark:border-indigo-950 rounded-full animate-pulse shadow-sm" />
                            )}
                        </div>

                        {/* ACTION BUTTONS */}
                        {!isEditingThis && (
                          <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 md:group-hover:translate-y-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEditing(folder); }} 
                              className="p-2.5 bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-500 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/30 dark:hover:text-indigo-400 rounded-xl transition-colors active:scale-90"
                              title="Edit Folder Name"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} 
                              className="p-2.5 bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/30 dark:hover:text-red-400 rounded-xl transition-colors active:scale-90"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* TEXT AND DETAILS */}
                      <div className="relative z-10 flex-1 flex flex-col justify-end">
                        {isEditingThis ? (
                          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <input 
                              autoFocus 
                              className="w-full bg-white dark:bg-zinc-950 border border-indigo-500/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-sm font-bold outline-none text-zinc-900 dark:text-white shadow-inner transition-all" 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(folder.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              placeholder="Enter folder name..."
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleSaveEdit(folder.id)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-colors active:scale-95">
                                <Check className="w-4 h-4" /> Save
                              </button>
                              <button onClick={handleCancelEdit} className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors active:scale-95">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* DATE CREATED LABEL BASE SA DATABASE */}
                            <div className="flex items-center gap-1.5 mb-1.5 text-zinc-400 dark:text-zinc-500">
                              <Clock className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">
                                {formatFolderDate(folder)}
                              </span>
                            </div>

                            <h3 className={`text-xl md:text-2xl font-bold tracking-tight transition-colors duration-300 line-clamp-2 leading-tight mb-4
                              ${isThisFolderPlaying ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}
                            >
                              {folder.name}
                            </h3>
                            
                            <div className="flex items-center justify-between mt-auto">
                              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all
                                ${isThisFolderPlaying 
                                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' 
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                }`}
                              >
                                <Music className={`w-3.5 h-3.5 ${isThisFolderPlaying ? 'animate-pulse' : ''}`} />
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                  {folder.songs?.length || 0} Tracks
                                </span>
                              </div>
                              
                              {isThisFolderPlaying && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 animate-pulse bg-white/50 dark:bg-indigo-950/50 px-2 py-1 rounded-md">
                                  Playing
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
       </div>
      )}
    </div>
  );
}