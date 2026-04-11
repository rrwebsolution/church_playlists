// SongList.tsx
import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Music, PlayCircle, PauseCircle, 
  Trash2, ChevronDown, Languages, Search, GripVertical, Copy, Edit3, Check, Guitar, PlusCircle, CheckCircle2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; 
import YoutubePreview from './YoutubePreview';
import { PlayingVisualizer } from './FolderList';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;
  const lines = lyrics.split(/\n/); 
  return lines.map((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={index} className="h-3"></div>; 
    const isHeader = /^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|V1|V2|C1|C2|B1)[\]:)]?(.*)?/i.test(trimmedLine);
    if (isHeader) {
      return (
        <div key={index} className="mt-8 mb-3 flex justify-center">
          <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-500/20">
            {trimmedLine.replace(/[\[\]():]/g, '')}
          </span>
        </div>
      );
    }
    return <div key={index} className="text-zinc-700 dark:text-zinc-300 leading-loose font-medium text-sm md:text-base">{trimmedLine}</div>;
  });
};

export default function SongList(props: any) {
  const { 
    folders, setFolders, activeFolderId, setActiveFolderId, 
    currentSong, setCurrentSong, setIsPlaying, isPlaying,
    inputValue, setInputValue, searchMode, youtubeResults, setYoutubeResults, isFetching
  } = props;

  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempText, setTempText] = useState<string>("");

  const activeFolder = folders.find((f: PlaylistFolder) => f.id === activeFolderId);

  const globalLibrary = useMemo(() => {
    const songsMap = new Map<string, Song>();
    folders.forEach((folder: PlaylistFolder) => {
      folder.songs.forEach((song: Song) => {
        if (!songsMap.has(song.url)) {
          songsMap.set(song.url, song);
        }
      });
    });
    return Array.from(songsMap.values());
  }, [folders]);

  const isLocalSearch = searchMode === 'local' && inputValue.trim().length > 0;
  
  const songsToDisplay = isLocalSearch 
    ? globalLibrary.filter((s: Song) => 
        s.title.toLowerCase().includes(inputValue.toLowerCase()) || 
        (s.artist && s.artist.toLowerCase().includes(inputValue.toLowerCase()))
      )
    : (activeFolder?.songs || []);

  const onDragEnd = (result: any) => {
    if (!result.destination || isLocalSearch) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        const newSongs = Array.from(folder.songs);
        const [movedSong] = newSongs.splice(sourceIndex, 1);
        newSongs.splice(destinationIndex, 0, movedSong);
        return { ...folder, songs: newSongs };
      }
      return folder;
    }));
  };

  const handlePlaySong = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying); 
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handleAddToFolder = (song: Song) => {
    setFolders((prev: PlaylistFolder[]) => prev.map(f => {
      if (f.id === activeFolderId) {
        if (f.songs.some(s => s.url === song.url)) return f;
        return { ...f, songs: [...f.songs, { ...song, id: Date.now().toString() + Math.random() }] };
      }
      return f;
    }));
    Toast.fire({ icon: 'success', title: 'Added to folder!' });
  };

  // --- BAG-O: HANDLE REMOVE SONG WITH SWAL ---
  const handleRemoveSong = async (song: Song) => {
    const result = await Swal.fire({
      title: 'Remove Song?',
      text: `Are you sure you want to remove "${song.title}" from this folder?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // red-500
      cancelButtonColor: '#71717a',  // zinc-500
      confirmButtonText: 'Yes, remove it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setFolders((prev: PlaylistFolder[]) => prev.map(f => 
        f.id === activeFolderId 
          ? { ...f, songs: f.songs.filter(s => s.id !== song.id) } 
          : f
      ));
      Toast.fire({ icon: 'success', title: 'Song removed' });
    }
  };

  const handleSaveText = (songId: string) => {
    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        return {
          ...folder,
          songs: folder.songs.map(song => 
            song.id === songId ? { ...song, [activeTab]: tempText } : song
          )
        };
      }
      return folder;
    }));
    setEditingId(null);
    Toast.fire({ icon: 'success', title: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} saved!` });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => { setActiveFolderId(null); setYoutubeResults([]); setInputValue(''); }} 
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-sm transition-all active:scale-90 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
              {activeFolder?.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <p className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
                {isLocalSearch ? `Global Library Search: "${inputValue}"` : `Folder Setlist`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        
        {searchMode === 'youtube' && (
          <YoutubePreview 
            youtubeResults={youtubeResults} 
            setYoutubeResults={setYoutubeResults} 
            isFetching={isFetching} 
            activeFolderId={activeFolderId} 
            setFolders={setFolders} 
            setInputValue={setInputValue} 
            inputValue={inputValue} 
          />
        )}

        {activeFolder?.songs.length === 0 && !isLocalSearch ? (
          <div className="flex flex-col items-center justify-center py-24 bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-center px-6">
            <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-full mb-4">
               <Music className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Setlist is Empty</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed">
              Search a song or use "Local Library" to add existing tracks to <span className="text-indigo-600 font-semibold">{activeFolder?.name}</span>.
            </p>
          </div>
        ) : isLocalSearch && songsToDisplay.length === 0 ? (
          <div className="py-24 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
            <Search className="w-10 h-10 mx-auto mb-4 text-zinc-400" />
            <p className="font-semibold uppercase tracking-wider text-zinc-500 text-xs">No saved songs found in library</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="playlist-droppable" isDropDisabled={isLocalSearch}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {songsToDisplay.map((song:any, index:any) => {
                    const isCurrentlyPlaying = currentSong?.id === song.id;
                    const alreadyInFolder = activeFolder?.songs.some((s: Song) => s.url === song.url);

                    return (
                      <Draggable key={song.id} draggableId={song.id} index={index} isDragDisabled={isLocalSearch}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.draggableProps} 
                            style={{...provided.draggableProps.style, left: "auto", top: "auto" }} 
                            className={`group overflow-hidden border transition-all duration-300 rounded-[1.5rem] bg-white dark:bg-zinc-900
                              ${snapshot.isDragging ? 'shadow-xl border-indigo-500 scale-[1.01] z-50' : 'border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/50'}
                            `}
                          >
                            <div className="flex items-center justify-between p-4 md:p-5">
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                
                                {!isLocalSearch && (
                                  <div {...provided.dragHandleProps} className="hidden sm:flex text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing px-1">
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-4 min-w-0 group/info flex-1">
                                  <div onClick={(e) => handlePlaySong(e, song)} className="relative shrink-0 cursor-pointer">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isCurrentlyPlaying ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover/info:bg-indigo-50 dark:group-hover/info:bg-indigo-500/10 group-hover/info:text-indigo-600'}`}>
                                      {isCurrentlyPlaying && isPlaying ? <PlayingVisualizer /> : <Music className="w-5 h-5" />}
                                    </div>
                                    <div className={`absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-300 transform ${isCurrentlyPlaying ? 'opacity-100 scale-100 bg-indigo-600/80' : 'opacity-0 scale-75 group-hover/info:opacity-100 group-hover/info:scale-100 bg-zinc-900/40 dark:bg-black/50'}`}>
                                      {isCurrentlyPlaying && isPlaying ? <PauseCircle className="w-6 h-6 text-white" /> : <PlayCircle className="w-6 h-6 text-white" />}
                                    </div>
                                    {!isLocalSearch && <span className="absolute -bottom-2 -left-2 bg-white dark:bg-zinc-900 text-zinc-500 font-mono text-[9px] w-5 h-5 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700">{index + 1}</span>}
                                  </div>
                                  
                                  <div onClick={() => { setExpandedSongId(expandedSongId === song.id ? null : song.id); setEditingId(null); }} className="flex flex-col min-w-0 flex-1 cursor-pointer">
                                    <span className={`truncate text-sm md:text-base transition-colors ${isCurrentlyPlaying ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-900 dark:text-zinc-100 font-semibold group-hover/info:text-indigo-600'}`}>
                                      {song.title}
                                    </span>
                                    <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium uppercase tracking-wider truncate mt-0.5">
                                      {song.artist || 'Unknown Artist'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-4">
                                
                                {isLocalSearch ? (
                                  alreadyInFolder ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-500/20">
                                      <CheckCircle2 className="w-4 h-4" /> In Folder
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => handleAddToFolder(song)}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all active:scale-95 shadow-md"
                                    >
                                      <PlusCircle className="w-4 h-4" /> Add
                                    </button>
                                  )
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleRemoveSong(song)} // <-- GI-UPDATE ANI (SWAL)
                                      className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => { setExpandedSongId(expandedSongId === song.id ? null : song.id); setEditingId(null); }} className={`p-2.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-transform ${expandedSongId === song.id ? 'rotate-180 text-indigo-600' : ''}`}>
                                      <ChevronDown className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {expandedSongId === song.id && (
                              <div className="p-6 md:p-10 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                  <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
                                    <button onClick={() => { setActiveTab('lyrics'); setEditingId(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'lyrics' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}><Languages className="w-4 h-4" /> Lyrics</button>
                                    <button onClick={() => { setActiveTab('chords'); setEditingId(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'chords' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}><Guitar className="w-4 h-4" /> Chords</button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {editingId === song.id ? (
                                      <button onClick={() => handleSaveText(song.id)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-bold text-[10px] uppercase tracking-wider shadow-md active:scale-95"><Check className="w-3.5 h-3.5" /> Save {activeTab}</button>
                                    ) : (
                                      <>
                                        {!isLocalSearch && <button onClick={() => { setEditingId(song.id); setTempText(song[activeTab] || ""); }} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors text-zinc-600 dark:text-zinc-300 font-semibold text-[10px] uppercase tracking-wider shadow-sm active:scale-95"><Edit3 className="w-3.5 h-3.5" /> Edit</button>}
                                        {song[activeTab] && <button onClick={() => { navigator.clipboard.writeText(song[activeTab] || ""); Toast.fire({ icon: 'success', title: 'Copied to clipboard' }); }} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors text-zinc-600 dark:text-zinc-300 font-semibold text-[10px] uppercase tracking-wider shadow-sm active:scale-95"><Copy className="w-3.5 h-3.5" /> Copy</button>}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="max-w-2xl mx-auto pb-6">
                                  {editingId === song.id ? (
                                    <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} placeholder={`Paste your ${activeTab} here...`} className={`w-full h-96 p-4 bg-white dark:bg-zinc-900 border-2 border-indigo-500 rounded-xl outline-none text-zinc-800 dark:text-zinc-200 text-sm shadow-inner resize-none ${activeTab === 'chords' ? 'font-mono tracking-widest leading-tight' : 'font-medium leading-relaxed'}`} />
                                  ) : song[activeTab] ? (
                                    <div className="animate-in fade-in duration-700 overflow-x-auto">{activeTab === 'lyrics' ? <div className="text-center">{formatLyrics(song.lyrics as string)}</div> : <pre className="font-mono text-[13px] md:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-tight">{song.chords}</pre>}</div>
                                  ) : (
                                    <div className="py-12 text-center text-zinc-400 font-semibold text-[10px] uppercase tracking-widest">No {activeTab} found.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}