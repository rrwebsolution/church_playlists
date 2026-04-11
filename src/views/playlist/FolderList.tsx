// FolderList.tsx
import { useState } from 'react';
import { 
  Folder, FolderPlus, Trash2, Edit2, Check, Music, 
  ListMusic, CloudSync, Sparkles 
} from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';

export const PlayingVisualizer = () => (
  <div className="flex items-end justify-center gap-1 w-6 h-6">
    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.6s_ease-in-out_infinite]" />
    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_0.7s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
    <div className="w-1.5 bg-white rounded-t-sm animate-[music-bar_1.1s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }} />
  </div>
);

export default function FolderList({ 
  folders, setFolders, setActiveFolderId, currentSong, 
  isPlaying, isAutoSaveEnabled, setIsAutoSaveEnabled, inputValue 
}: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <div className="animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2">
        <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-linear-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 drop-shadow-sm">
              My Playlists
            </h1>
            <p className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center gap-2">
              <ListMusic className="w-4 h-4" /> Worship Library
            </p>
        </div>
        
        {/* SYNC TOGGLE PILL */}
        <div className="flex items-center gap-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-5 py-3 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-xl shadow-zinc-200/20 dark:shadow-black/20 transition-all hover:border-indigo-500/30">
          <div className="flex items-center gap-2">
            <CloudSync className={`w-4 h-4 ${isAutoSaveEnabled ? 'text-indigo-500' : 'text-zinc-400'}`} />
            <span className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
              Cloud Sync
            </span>
          </div>
          <button 
            onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)} 
            className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${isAutoSaveEnabled ? 'bg-linear-to-r from-indigo-500 to-purple-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${isAutoSaveEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
      
      {/* EMPTY STATE SECTION */}
      {folders.length === 0 ? (
        <div className="relative overflow-hidden flex flex-col items-center justify-center py-20 bg-linear-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-center px-6 shadow-2xl shadow-zinc-200/20 dark:shadow-none group">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative p-6 bg-white dark:bg-zinc-800 shadow-xl shadow-indigo-500/10 rounded-full mb-8 border border-zinc-100 dark:border-zinc-700 group-hover:scale-110 transition-transform duration-700">
            <FolderPlus className="w-14 h-14 text-indigo-500 dark:text-indigo-400" />
            <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-800 animate-pulse" />
          </div>
          
          <h2 className="relative text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-10 tracking-tight flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-500" /> Let's Get Started
          </h2>
          
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl text-left w-full">
            <div className="p-6 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-3xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-xl hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/30">1</div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Create Folder</h3>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-normal">Use the search bar above to generate folders and organize your worship sets.</p>
            </div>

            <div className="p-6 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-3xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-xl hover:border-purple-400/50 dark:hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-pink-600 text-white text-xs font-bold flex items-center justify-center rounded-xl shadow-lg shadow-purple-500/30">2</div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Add Songs</h3>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-normal">Open a folder, select a mode, and search or paste a YouTube link to add tracks.</p>
            </div>
          </div>
        </div>
      ) : (
       
       /* GRID FOLDER SECTION */
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {folders.filter((f: PlaylistFolder) => f.name.toLowerCase().includes(inputValue.toLowerCase())).map((folder: PlaylistFolder) => {
          
          const isThisFolderPlaying = folder.songs.some((s: Song) => s.id === currentSong?.id) && isPlaying;
          
          return (
            <div 
              key={folder.id} 
              onClick={() => editingId !== folder.id && setActiveFolderId(folder.id)} 
              className={`group relative p-6 md:p-7 rounded-[2.5rem] transition-all duration-500 cursor-pointer overflow-hidden
                ${isThisFolderPlaying 
                  ? 'bg-linear-to-b from-indigo-50/50 to-white dark:from-indigo-900/20 dark:to-zinc-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.03] z-10' 
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50 dark:hover:shadow-black/50 hover:border-indigo-500/50 hover:-translate-y-1'
                }`}
            >
              {/* Animated Glow Backdrop for Playing State */}
              {isThisFolderPlaying && (
                <div className="absolute -inset-24 bg-linear-to-r from-indigo-500/20 to-purple-500/20 blur-3xl opacity-50 pointer-events-none animate-pulse" />
              )}

              <div className="relative z-10 flex justify-between items-start mb-8">
                 
                 {/* FOLDER ICON CONTAINER */}
                 <div className="relative">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
                      ${isThisFolderPlaying 
                        ? 'bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/40' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500'
                      }`}
                    >
                      {isThisFolderPlaying ? <PlayingVisualizer /> : <Folder className="w-6 h-6 fill-current opacity-80" />}
                    </div>
                    {isThisFolderPlaying && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse shadow-sm" />
                    )}
                 </div>

                 {/* ACTION BUTTONS */}
                 <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-x-0 md:translate-x-4 md:group-hover:translate-x-0">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setEditingId(folder.id); setEditValue(folder.name); }} 
                     className="p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-indigo-500 hover:border-indigo-500 rounded-full shadow-sm hover:shadow-md transition-all active:scale-90"
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); if(confirm("Are you sure you want to delete this setlist?")) setFolders((prev: PlaylistFolder[]) => prev.filter(f => f.id !== folder.id)); }} 
                     className="p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-500 rounded-full shadow-sm hover:shadow-md transition-all active:scale-90"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
              </div>

              {/* TEXT AND DETAILS */}
              <div className="relative z-10">
                {editingId === folder.id ? (
                  <div className="flex items-center gap-2 mt-2 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    <input 
                      autoFocus 
                      className="flex-1 bg-white w-10 dark:bg-zinc-950 border-2 border-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold outline-none text-zinc-900 dark:text-zinc-100 shadow-inner" 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setFolders((prev: PlaylistFolder[]) => prev.map((f) => (f.id === folder.id ? { ...f, name: editValue } : f))); 
                          setEditingId(null);
                        }
                      }}
                    />
                    <button 
                      onClick={() => { setFolders((prev: PlaylistFolder[]) => prev.map((f) => (f.id === folder.id ? { ...f, name: editValue } : f))); setEditingId(null); }} 
                      className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-90"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className={`text-xl font-semibold tracking-tight transition-colors duration-300 truncate mb-4
                      ${isThisFolderPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}
                    >
                      {folder.name}
                    </h3>
                    
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all
                        ${isThisFolderPlaying 
                          ? 'bg-indigo-500 text-white border-transparent' 
                          : 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30'
                        }`}
                      >
                        <Music className={`w-3.5 h-3.5 ${isThisFolderPlaying ? 'animate-pulse' : ''}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          {folder.songs?.length || 0} Tracks
                        </span>
                      </div>
                      
                      {isThisFolderPlaying && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 animate-pulse">
                          Now Playing
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
      )}
    </div>
  );
}