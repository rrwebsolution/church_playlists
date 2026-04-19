import { useState } from 'react';
import { Search, XCircle, DownloadCloud } from 'lucide-react';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';
import { fetchSongResourcesSmart } from './songData';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

interface YoutubePreviewProps {
  youtubeResults: any[];
  setYoutubeResults: (val: any[]) => void;
  isFetching: boolean;
  activeFolderId: string | null;
  setFolders: React.Dispatch<React.SetStateAction<PlaylistFolder[]>>;
  setInputValue: (val: string) => void;
  inputValue: string;
}

export default function YoutubePreview({
  youtubeResults, setYoutubeResults, isFetching,
  activeFolderId, setFolders, setInputValue
}: YoutubePreviewProps) {

  const [importingId, setImportingId] = useState<string | null>(null);

  const handleImportYT = async (yt: any) => {
    const confirmImport = await Swal.fire({
      title: 'Import Song?',
      text: `Do you want to add "${yt.title}" to your library?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#a1a1aa',
      confirmButtonText: 'Yes, import it!'
    });

    if (!confirmImport.isConfirmed) return;

    setImportingId(yt.videoId);

    const pendingSong: Song = {
      id: Date.now().toString(),
      title: yt.title,
      artist: yt.author,
      url: yt.url,
      lyrics: '',
      chords: '',
      isGenerating: true,
    };

    // Insert immediately so skeleton shows in SongList
    const insertIntoFolder = (prev: PlaylistFolder[]) => {
      if (activeFolderId) {
        return prev.map(f => f.id === activeFolderId ? { ...f, songs: [...f.songs, pendingSong] } : f);
      }
      const defaultIndex = prev.findIndex(f => f.name === "Saved Library" || f.name === "Uncategorized");
      if (defaultIndex !== -1) {
        const updated = [...prev];
        updated[defaultIndex] = { ...updated[defaultIndex], songs: [...updated[defaultIndex].songs, pendingSong] };
        return updated;
      }
      return [...prev, { id: Date.now().toString(), name: "Saved Library", songs: [pendingSong] }];
    };

    setFolders(insertIntoFolder);
    setYoutubeResults([]);
    setInputValue('');

    try {
      const { lyrics, chords } = await fetchSongResourcesSmart(yt.author, yt.title);
      setFolders(prev => prev.map(folder => ({
        ...folder,
        songs: folder.songs.map(s => s.id === pendingSong.id
          ? { ...s, lyrics, chords, isGenerating: false }
          : s
        ),
      })));
      Toast.fire({
        icon: lyrics || chords ? 'success' : 'info',
        title: lyrics || chords ? 'Imported with auto-generated data!' : 'Imported, but no lyrics found online.',
      });
    } catch {
      setFolders(prev => prev.map(folder => ({
        ...folder,
        songs: folder.songs.map(s => s.id === pendingSong.id ? { ...s, isGenerating: false } : s),
      })));
      Toast.fire({ icon: 'warning', title: 'Imported, but generation failed.' });
    } finally {
      setImportingId(null);
    }
  };

  if (!isFetching && youtubeResults.length === 0) return null;

  return (
    <div className="mb-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 rounded-[2rem] p-5 md:p-8 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <Search className="w-4 h-4 md:w-5 md:h-5"/> YouTube Results
        </h3>
        <button onClick={() => { setYoutubeResults([]); setInputValue(''); }} className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all">
          <XCircle className="w-6 h-6" />
        </button>
      </div>
      
      {isFetching ? (
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 animate-pulse">Scraping YouTube...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {youtubeResults.map((yt: any) => (
            <div key={yt.videoId} className="group flex items-center justify-between p-3 md:p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-2xl hover:border-indigo-500/50 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <img src={`https://i.ytimg.com/vi/${yt.videoId}/mqdefault.jpg`} alt="" className="w-16 h-12 md:w-20 md:h-14 object-cover rounded-xl shadow-sm group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors rounded-xl"></div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{yt.title}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest truncate mt-0.5">{yt.author}</span>
                </div>
              </div>
              <button 
                onClick={() => handleImportYT(yt)}
                disabled={importingId === yt.videoId}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all shrink-0 ml-4 disabled:opacity-50 disabled:grayscale"
              >
                {importingId === yt.videoId ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <DownloadCloud className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{importingId === yt.videoId ? 'Adding...' : 'Import'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}