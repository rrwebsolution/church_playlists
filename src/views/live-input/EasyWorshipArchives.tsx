import { useState, useMemo } from 'react';
import { Bookmark, Trash2, RotateCcw, Search, X, FileText, Folder, ChevronLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import type { ArchiveFolder, SavedItem } from './EasyWorshipController';

interface ArchivesProps {
  folders: ArchiveFolder[];
  setFolders: React.Dispatch<React.SetStateAction<ArchiveFolder[]>>;
  onLoad: (item: SavedItem) => void;
}

export const EasyWorshipArchives = ({ folders, setFolders, onLoad }: ArchivesProps) => {
  const[searchQuery, setSearchQuery] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const activeFolder = folders.find(f => f.id === activeFolderId);

  // --- FILTER 1: FOLDERS (Kung naa sa gawas ug nag-search)
  const filteredFolders = useMemo(() => {
    return folders.filter(folder => 
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, searchQuery]);

  // --- FILTER 2: GLOBAL SONGS (Kung naa sa gawas ug nag-search) ---
  const globalFilteredItems = useMemo(() => {
    if (activeFolderId || !searchQuery) return[]; // Modagan ra ni kung wala sa folder ug naay gi-search
    
    // I-combine ang tanang kanta gikan sa tanang folders ug isagol ang ngalan sa folder
    const allItems = folders.flatMap(f => 
      f.items.map(item => ({ ...item, folderName: f.name }))
    );
    
    return allItems.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  },[folders, activeFolderId, searchQuery]);

  // --- FILTER 3: LOCAL SONGS (Kung naa sa SULOD sa folder) ---
  const filteredItems = useMemo(() => {
    if (!activeFolder) return[];
    return activeFolder.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  },[activeFolder, searchQuery]);

  // DELETE FOLDER LOGIC
  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Folder?',
      text: "All lyrics inside this folder will be permanently deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      setFolders(prev => prev.filter(f => f.id !== folderId));
    }
  };

  // DELETE SONG LOGIC (Karon mo-delete ni bisag asa nga folder siya nakasulod)
  const handleDeleteSong = (songId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolders(prev => prev.map(folder => ({
      ...folder,
      items: folder.items.filter(i => i.id !== songId)
    })));
  };

  return (
    <div className="pt-16 border-t border-zinc-200 dark:border-zinc-800 px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 px-4">
        
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            {activeFolderId ? <FileText className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tight">
              {activeFolderId ? activeFolder?.name : 'Library Archives'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">
              {activeFolderId ? `Total: ${activeFolder?.items.length} Files` : `Global Search Ready`}
            </p>
          </div>
        </div>

        {/* SEARCH & BACK BUTTON */}
        <div className="flex items-center gap-3 w-full md:max-w-md">
          {activeFolderId && (
            <button 
              onClick={() => { setActiveFolderId(null); setSearchQuery(""); }} 
              className="p-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-2xl transition-all shrink-0"
              title="Back to Folders"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeFolderId ? "Search lyrics in this folder..." : "Search all folders & lyrics globally..."}
              className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none focus:border-indigo-500/50 text-sm font-semibold transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- RENDER VIEW: ROOT LEVEL (WALA SA FOLDER) --- */}
      {!activeFolderId ? (
        searchQuery ? (
          /* 🔥 KUNG NAAY GI-SEARCH SA ROOT (GLOBAL SEARCH) 🔥 */
          filteredFolders.length === 0 && globalFilteredItems.length === 0 ? (
            <div className="py-20 text-center opacity-30 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
              <Search className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No matching folders or lyrics</p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* GLOBAL RESULT: FOLDERS */}
              {filteredFolders.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">Folders</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredFolders.map((folder) => (
                      <div 
                        key={folder.id} 
                        onClick={() => { setActiveFolderId(folder.id); setSearchQuery(""); }}
                        className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                            <Folder className="w-8 h-8" />
                          </div>
                          <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg">{folder.name}</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                          {folder.items.length} {folder.items.length === 1 ? 'File' : 'Files'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GLOBAL RESULT: SONGS/LYRICS */}
              {globalFilteredItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">Songs / Lyrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {globalFilteredItems.map((item) => (
                      <div key={item.id} className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Folder className="w-3 h-3 text-indigo-500" />
                              <span className="text-[9px] font-black text-indigo-500 uppercase truncate max-w-37.5">{item.folderName}</span>
                            </div>
                            <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg uppercase italic">{item.title}</h3>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 opacity-60">{item.date}</p>
                          </div>
                          <button onClick={(e) => handleDeleteSong(item.id, e)} className="p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all active:scale-90"><Trash2 className="w-4.5 h-4.5" /></button>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-4 mb-8 flex-1 font-semibold leading-relaxed">{item.text}</p>
                        <button onClick={() => onLoad(item)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3">
                          <RotateCcw className="w-4 h-4" /> Restore to Studio
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* KUNG WALAY GI-SEARCH SA ROOT (DEFAULT FOLDER LISTING) */
          folders.length === 0 ? (
            <div className="py-20 text-center opacity-30 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
              <Folder className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No folders yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {folders.map((folder) => (
                <div 
                  key={folder.id} 
                  onClick={() => setActiveFolderId(folder.id)}
                  className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                      <Folder className="w-8 h-8" />
                    </div>
                    <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg">{folder.name}</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                    {folder.items.length} {folder.items.length === 1 ? 'File' : 'Files'}
                  </p>
                </div>
              ))}
            </div>
          )
        )
      ) : (
        /* --- RENDER VIEW: SULOD SA FOLDER --- */
        activeFolder?.items.length === 0 ? (
          <div className="py-20 text-center opacity-30 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
            <FileText className="w-12 h-12 mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">Folder is empty</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center opacity-30 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">No lyrics found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      <span className="text-[9px] font-black text-indigo-500 uppercase">Document</span>
                    </div>
                    <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg uppercase italic">{item.title}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 opacity-60">{item.date}</p>
                  </div>
                  <button onClick={(e) => handleDeleteSong(item.id, e)} className="p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all active:scale-90"><Trash2 className="w-4.5 h-4.5" /></button>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-4 mb-8 flex-1 font-semibold leading-relaxed">{item.text}</p>
                <button onClick={() => onLoad(item)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3">
                  <RotateCcw className="w-4 h-4" /> Restore to Studio
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};