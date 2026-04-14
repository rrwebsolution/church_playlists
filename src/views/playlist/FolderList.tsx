import { useState, useMemo } from 'react';
import { 
  Folder, FolderPlus, Trash2, Check, Music, 
  ListMusic, Sparkles, Edit2, X, Filter, CalendarDays, Clock, Plus,
  Search, Play
} from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

export const PlayingVisualizer = () => (
  <div className="flex items-end justify-center gap-0.75 w-6 h-6">
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_0.6s_ease-in-out_infinite]" />
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_0.7s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
    <div className="w-1 bg-white rounded-t-full animate-[music-bar_1.1s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }} />
  </div>
);

const formatFolderDate = (folder: any) => {
  let dateObj: Date;
  if (folder.created_at) {
    dateObj = new Date(folder.created_at);
  } else {
    const timestamp = parseInt(folder.id);
    if (timestamp && timestamp > 1000000000000) {
      dateObj = new Date(timestamp);
    } else {
      return 'Unknown Date';
    }
  }
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); 
};

const getFolderTime = (folder: any) => {
  if (folder.created_at) return new Date(folder.created_at).getTime();
  const timeVal = parseInt(folder.id);
  return (timeVal > 1000000000000) ? timeVal : 0;
};

export default function FolderList({ 
  folders, setFolders, setActiveFolderId, currentSong, 
  isPlaying, inputValue 
}: any) {

  // KINI DAPAT NAA SA BABAW (Top-Level)
  const navigate = useNavigate();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); 
  
  const [isCreating, setIsCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');

  const groupedFolders = useMemo(() => {
    let filtered = folders.filter((f: PlaylistFolder) => 
      f.name.toLowerCase().includes(inputValue.toLowerCase())
    );

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
      if (folderTime >= todayStart) groups['Today'].push(folder);
      else if (folderTime >= thisWeekStart) groups['This Week'].push(folder);
      else if (folderTime >= lastWeekStart) groups['Last Week'].push(folder);
      else groups['Older'].push(folder);
    });

    return groups;
  }, [folders, inputValue, sortOrder]);

  const hasSearchResults = Object.values(groupedFolders).some(group => group.length > 0);

  const handleCreateFolder = () => {
    const trimmedValue = createValue.trim();
    if (!trimmedValue) {
      setIsCreating(false);
      return;
    }
    const newFolder: any = { 
      id: Date.now().toString(), 
      name: trimmedValue, 
      songs: [],
      created_at: new Date().toISOString()
    };
    setFolders((prev: PlaylistFolder[]) => [newFolder, ...prev]);
    setIsCreating(false);
    setCreateValue('');
  };

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

  const startEditing = (folder: PlaylistFolder) => {
    setEditingId(folder.id);
    setEditValue(folder.name);
  };

  const handleSaveEdit = (folderId: string) => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) return;
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 px-2 relative z-10">
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
          className="group flex items-center gap-3 bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 p-1.5 pr-4 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-sm transition-all active:scale-95"
        >
          <div className={`p-2 rounded-full transition-all duration-500 ${sortOrder === 'newest' ? 'bg-indigo-500 text-white rotate-0' : 'bg-amber-500 text-white rotate-180'}`}>
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Sort By</span>
            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
              {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </span>
          </div>
        </button>
      </div>

      {/* TOP GRID: CREATE FOLDER & LET'S GO BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">

         {/* RIGHT: LET'S GO BANNER (MINIMALIST VERSION) */}
        <div className="lg:col-span-2 xl:col-span-3 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between p-6 md:p-8 rounded-[2rem] bg-white/30 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md transition-all duration-500 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

          <div className="relative z-10 mb-8 sm:mb-0 sm:mr-6 text-center sm:text-left flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-3 mb-2 text-zinc-900 dark:text-white">
              <Sparkles className="w-6 h-6 text-amber-500" /> Let's Go!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-[15px] font-medium max-w-md leading-relaxed">
              Build your perfect worship setlists. Create folders, search YouTube for tracks, and worship seamlessly.
            </p>
          </div>

          <div className="relative z-10 flex flex-col xs:flex-row sm:flex-col lg:flex-row gap-3 w-full sm:w-auto shrink-0">
            {[
              { icon: FolderPlus, label: "Create" },
              { icon: Search, label: "Add" },
              { icon: Play, label: "Worship" }
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3.5 bg-zinc-100/50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50 px-4 py-3.5 rounded-2xl hover:border-indigo-500/50 transition-colors cursor-default group/step">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                  {i + 1}
                </div>
                <div className="flex items-center gap-2">
                  <step.icon className="w-4 h-4 text-zinc-400 group-hover/step:text-indigo-500 transition-colors" />
                  <span className="font-bold text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-300">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* LEFT: CREATE NEW FOLDER CARD */}
        <div className="lg:col-span-1">
          <div 
            onClick={() => !isCreating && setIsCreating(true)}
            className={`group relative flex flex-col p-6 rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-xl h-full min-h-45 justify-center items-center
              ${isCreating 
                ? 'bg-white dark:bg-zinc-900 border-2 border-indigo-500 shadow-[0_20px_40px_-15px_rgba(99,102,241,0.3)] scale-[1.02]' 
                : 'bg-zinc-50/50 dark:bg-zinc-900/20 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 hover:-translate-y-1'
              }`}
          >
            {isCreating ? (
              <div className="w-full flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <input 
                  autoFocus 
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-indigo-500/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-sm font-bold outline-none text-zinc-900 dark:text-white transition-all text-center" 
                  value={createValue} 
                  onChange={(e) => setCreateValue(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') { setIsCreating(false); setCreateValue(''); }
                  }}
                  placeholder="Name your folder..."
                />
                <div className="flex gap-2 w-full mt-2">
                  <button onClick={handleCreateFolder} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-colors active:scale-95">
                    <Check className="w-4 h-4" /> Create
                  </button>
                  <button onClick={() => { setIsCreating(false); setCreateValue(''); }} className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors active:scale-95">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shadow-sm">
                  <Plus className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Create New Folder
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                    Add to your library
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

       
      </div>
      
      {/* NO FOLDERS FALLBACK */}
      {folders.length === 0 && inputValue === '' && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-600 animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
             <FolderPlus className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">No folders yet</p>
          <p className="text-xs mt-1 text-zinc-500 max-w-xs text-center">Use the "Create New Folder" card above to start organizing.</p>
        </div>
      )}

      {/* NO SEARCH RESULTS FALLBACK */}
      {folders.length > 0 && inputValue !== '' && !hasSearchResults && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-5 shadow-inner">
             <Search className="w-8 h-8 text-indigo-400" />
           </div>
           <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
             No results found
           </h3>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm">
             We couldn't find any folder matching "<span className="font-bold text-indigo-500 dark:text-indigo-400">{inputValue}</span>". 
             Try using a different keyword or create a new one above.
           </p>
        </div>
      )}
      
      {/* GROUPED GRID FOLDER SECTION */}
      {hasSearchResults && (
       <div className="space-y-12">
        {Object.entries(groupedFolders).map(([label, items]) => {
          if (items.length === 0) return null; 
          
          return (
            <div key={label} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center gap-4 mb-6 px-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <CalendarDays className="w-5 h-5" />
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-widest">{label}</h3>
                </div>
                <span className="px-2.5 py-1 bg-zinc-200/50 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500">{items.length}</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800/50 flex-1 ml-2"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((folder: PlaylistFolder) => {
                  
                  const isThisFolderPlaying = folder.songs.some((s: Song) => s.id === currentSong?.id) && isPlaying;
                  const isEditingThis = editingId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        // SAKTONG NAVIGATION LOGIC (dili mo-navigate kung nag-edit)
                        if (!isEditingThis) {
                          setActiveFolderId(folder.id);
                          navigate(`/app/playlist/${folder.id}`);
                        }
                      }}
                      className={`group relative flex flex-col p-6 rounded-[2rem] transition-all duration-500 ease-out cursor-pointer overflow-hidden backdrop-blur-xl min-h-45
                        ${isThisFolderPlaying
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950 shadow-2xl shadow-indigo-500/20 scale-[1.02] z-10'
                          : 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] hover:border-indigo-500/40 hover:-translate-y-1'
                        }`}
                    >
                      {isThisFolderPlaying && (
                        <div className="absolute -inset-24 bg-linear-to-tr from-indigo-500/20 to-purple-500/20 blur-[60px] opacity-60 pointer-events-none animate-pulse" />
                      )}

                      <div className="relative z-10 flex justify-between items-start mb-6">
                        <div className="relative">
                          <div className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ease-spring group-hover:scale-105 group-hover:-rotate-3 shadow-sm
                            ${isThisFolderPlaying
                              ? 'bg-linear-to-br from-indigo-500 to-purple-500 text-white shadow-indigo-500/40'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                            }`}
                          >
                            {isThisFolderPlaying ? <PlayingVisualizer /> : <Folder className="w-6 h-6 fill-current opacity-20 group-hover:opacity-100 transition-all duration-500" />}
                          </div>
                          {isThisFolderPlaying && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-indigo-50 dark:border-indigo-950 rounded-full animate-pulse shadow-sm" />
                          )}
                        </div>

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

                      <div className="relative z-10 flex-1 flex flex-col justify-end">
                        {isEditingThis ? (
                          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-indigo-500/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-sm font-bold outline-none text-zinc-900 dark:text-white shadow-inner transition-all"
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