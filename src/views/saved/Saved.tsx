import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Heart, PlayCircle, PauseCircle, Plus, Trash2, 
   RefreshCcw, Music, Share2, Sparkles, X,
  Search
} from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';
import YoutubePreview from '../playlist/YoutubePreview';

export default function Saved() {
  const { 
    folders, setFolders, 
    currentSong, setCurrentSong, 
    isPlaying, setIsPlaying,
    inputValue, setInputValue, searchMode,
    youtubeResults, setYoutubeResults, isFetching
  } = useOutletContext<any>();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Kung naay ni-load nga youtubeResults gikan sa Header search, awtomatik ablihi ang modal
  useEffect(() => {
    if (youtubeResults.length > 0 || isFetching) {
      setShowSearchModal(true);
    }
  }, [youtubeResults, isFetching]);

  // --- I-FLATTEN UG I-FILTER ANG TANANG KANTA PARA SA SAVED LIBRARY ---
  const allSavedSongs = useMemo(() => {
    // 1. I-tingob tanang kanta aron maporma ang library, ug i-remove ang duplicates
    const songsMap = new Map<string, Song>();
    folders.forEach((folder: PlaylistFolder) => {
      folder.songs.forEach((song: Song) => {
        if (!songsMap.has(song.url)) {
          songsMap.set(song.url, song);
        }
      });
    });
    
    let results = Array.from(songsMap.values());

    // 2. Kung naka "Local Library" mode ug naay gi-type ang user, i-filter ang resulta
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
              Saved Library
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium max-w-md leading-relaxed">
              Manage your favorite worship tracks, setlists, and database items in one centralized place.
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
            Click "Discover More" or search in the header to start building your personal collection.
          </p>
        </div>
      ) : searchMode === 'local' && allSavedSongs.length === 0 ? (
        // STATE KUNG NAG-SEARCH OG WALA NAKITA
        <div className="py-24 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
          <Search className="w-10 h-10 mx-auto mb-4 text-zinc-400" />
          <p className="font-semibold uppercase tracking-wider text-zinc-500 text-xs">No matching saved songs found for "{inputValue}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {allSavedSongs.map((song) => {
            const isCurrentlyPlaying = currentSong?.id === song.id;

            return (
              <div 
                key={song.id}
                className={`group relative p-6 backdrop-blur-xl border rounded-[2rem] transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1.5
                  ${isCurrentlyPlaying 
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-500 shadow-indigo-500/20' 
                    : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/50 dark:border-white/5 hover:border-indigo-500/30'
                  }`}
              >
                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-purple-500/5 rounded-[2rem] pointer-events-none animate-pulse" />
                )}

                <div className="relative z-10 flex items-start gap-5">
                  <div className="relative shrink-0 cursor-pointer" onClick={() => handlePlaySong(song)}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-105
                      ${isCurrentlyPlaying ? 'bg-indigo-600 text-white shadow-indigo-500/40' : 'bg-linear-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700'}`}
                    >
                      {isCurrentlyPlaying && isPlaying ? (
                        <div className="flex items-end justify-center gap-1 w-5 h-5">
                          <div className="w-1 bg-white rounded-t-sm animate-[music-bar_0.6s_ease-in-out_infinite]" />
                          <div className="w-1 bg-white rounded-t-sm animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 bg-white rounded-t-sm animate-[music-bar_0.7s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
                        </div>
                      ) : (
                        <Music className={`w-7 h-7 ${isCurrentlyPlaying ? 'text-white' : 'text-indigo-500 opacity-40'}`} />
                      )}
                    </div>
                    <div className={`absolute inset-0 bg-indigo-600/80 rounded-2xl flex items-center justify-center transition-all duration-300 transform ${isCurrentlyPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}`}>
                      {isCurrentlyPlaying && isPlaying ? <PauseCircle className="w-8 h-8 text-white fill-white/20" /> : <PlayCircle className="w-8 h-8 text-white fill-white/20" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className={`font-black truncate transition-colors ${isCurrentlyPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600'}`}>
                      {song.title}
                    </h3>
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate mb-3 mt-0.5">
                      {song.artist || 'Unknown Artist'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/10">Track</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-4 md:group-hover:translate-x-0">
                    <button onClick={() => { navigator.clipboard.writeText(song.url); alert("Link Copied!"); }} className="p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all" title="Copy Link"><Share2 className="w-4 h-4" /></button>
                    <button onClick={() => handleRemoveGlobal(song.url)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all" title="Remove Globally"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* DISCOVER MORE BUTTON */}
          <button 
            onClick={() => setShowSearchModal(true)} 
            className="relative group p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 shadow-sm group-hover:shadow-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center relative z-10">
              <span className="block font-black text-sm uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-50 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Discover More</span>
              <span className="text-[10px] font-bold text-zinc-500">Search YouTube directly</span>
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

      {/* DISCOVER SEARCH MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative">
            
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
              <div>
                <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">Discover & Import</h3>
                <p className="text-xs text-zinc-500 font-medium">Search using the header bar to find songs here.</p>
              </div>
              <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {youtubeResults.length > 0 || isFetching ? (
                <YoutubePreview 
                  youtubeResults={youtubeResults} 
                  setYoutubeResults={setYoutubeResults} 
                  isFetching={isFetching} 
                  activeFolderId={null} // <--- Ipasa null aron i-save sa Default Folder
                  setFolders={setFolders} 
                  setInputValue={setInputValue} 
                  inputValue={inputValue} 
                />
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Type in the header search bar and press Enter</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}