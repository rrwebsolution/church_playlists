import { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './views/components/Sidebar';
import { Header } from './views/components/Header';
import { Footer } from './views/components/Footer';
import type { PlaylistFolder, Song } from './views/types';
import { X } from 'lucide-react';
import YouTube from 'react-youtube';

import axiosInstance from './plugin/axios';
import axios from 'axios';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const getYouTubeID = (url: string | undefined | null) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&]{11})/);
  return (match && match[1]) ? match[1] : null;
};

export default function App() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'youtube' | 'link' | 'local'>('youtube');
  const [inputValue, setInputValue] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);

  const [folders, setFolders] = useState<PlaylistFolder[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    const savedSong = localStorage.getItem('last_played_song');
    return savedSong ? JSON.parse(savedSong) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const ytPlayerRef = useRef<any>(null);
  
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(() => {
    const savedStatus = localStorage.getItem('autosave_status');
    return savedStatus !== null ? JSON.parse(savedStatus) : true;
  });

  const [bgPlayEnabled, setBgPlayEnabled] = useState(() => {
    const savedStatus = localStorage.getItem('bg_play_enabled');
    return savedStatus !== null ? JSON.parse(savedStatus) : true; 
  });

  const [playHistory, setPlayHistory] = useState<any[]>(() => {
    const savedHistory = localStorage.getItem('worship_play_history');
    return savedHistory !== null ? JSON.parse(savedHistory) : [];
  });

  const [showFloatingPlayer, setShowFloatingPlayer] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isClient, setIsClient] = useState(false);

  const activeVideoId = getYouTubeID(currentSong?.url);
  const prevPathname = useRef(location.pathname);
  
  const lastSavedData = useRef<string>("");
  const isSavingRef = useRef(false); 

  useEffect(() => {
    if (currentSong) {
      localStorage.setItem('last_played_song', JSON.stringify(currentSong));
    }
  }, [currentSong]);

  useEffect(() => {
    if (currentSong) {
      setPlayHistory(prev => {
        if (prev.length > 0 && prev[0].song.id === currentSong.id) return prev;
        const newLog = { id: Date.now().toString(), song: currentSong, playedAt: new Date().toISOString() };
        return [newLog, ...prev].slice(0, 100); 
      });
    }
  }, [currentSong]);

  useEffect(() => {
    localStorage.setItem('bg_play_enabled', JSON.stringify(bgPlayEnabled));
    
    if (prevPathname.current !== location.pathname) {
      if (!bgPlayEnabled) {
        setIsPlaying(false);
        if (ytPlayerRef.current) ytPlayerRef.current.pauseVideo();
      }
      prevPathname.current = location.pathname;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && !bgPlayEnabled) {
        setIsPlaying(false);
        if (ytPlayerRef.current) ytPlayerRef.current.pauseVideo();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [location.pathname, bgPlayEnabled]);

  const fetchDatabase = useCallback(async () => {
    if (isSavingRef.current) return; 

    try {
      const response = await axiosInstance.get('playlists');
      const dbDataString = JSON.stringify(response.data);
      
      if (dbDataString !== lastSavedData.current) {
        setFolders(response.data); 
        lastSavedData.current = dbDataString; 
      }
      
      if (!isDataLoaded) setIsDataLoaded(true);
    } catch (err) {
      if (!isDataLoaded) setIsDataLoaded(true);
    }
  }, [isDataLoaded]);

  useEffect(() => {
    fetchDatabase(); 
    const pollInterval = setInterval(fetchDatabase, 3000); 
    return () => clearInterval(pollInterval);
  }, [fetchDatabase]);

  useEffect(() => {
    if (!isAutoSaveEnabled || !isDataLoaded) return;

    const currentDataString = JSON.stringify(folders);
    if (currentDataString === lastSavedData.current) return;

    const saveTimer = setTimeout(() => {
      isSavingRef.current = true; 
      axiosInstance.post('playlists/sync', folders)
        .then(() => { 
          lastSavedData.current = currentDataString; 
          isSavingRef.current = false; 
        })
        .catch(_err => {
          isSavingRef.current = false;
        });
    }, 1500); 

    return () => clearTimeout(saveTimer);
  }, [folders, isAutoSaveEnabled, isDataLoaded]);

  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    if (activeFolderId === null && location.pathname.includes('playlist')) {
      const newFolder: PlaylistFolder = { id: Date.now().toString(), name: query, songs: [] };
      setFolders([...folders, newFolder]);
      setInputValue('');
      Toast.fire({ icon: 'success', title: 'Folder created successfully!' });
      return;
    } 

    if (searchMode === 'local') return;

    try {
      const isUrl = query.startsWith('http');

      if (searchMode === 'link' || isUrl) {
        const confirmAdd = await Swal.fire({
          title: 'Add this link?',
          text: "Do you want to add this YouTube link to your library?",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#4f46e5',
          cancelButtonColor: '#a1a1aa',
          confirmButtonText: 'Yes, add it!'
        });

        if (!confirmAdd.isConfirmed) return;

        setIsFetching(true);
        let videoId = getYouTubeID(query);
        if (videoId) {
          const ytResponse = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          const ytData = ytResponse.data;
          const rawTitle = ytData.title || "Worship Song";
          const rawArtist = ytData.author_name || "Unknown Artist";
          
          let cleanTitle = rawTitle.replace(/\([^)]*\)|\[[^\]]*\]|Official Video|Lyrics|Audio|Music Video/gi, '').trim();
          let searchArtist = rawArtist.replace(/VEVO|Topic|Official|Channel/gi, '').trim();

          let fetchedLyrics = "";
          try {
            const lyricRes = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(`${searchArtist} ${cleanTitle}`)}`);
            if (lyricRes.data && lyricRes.data.length > 0 && lyricRes.data[0].plainLyrics) {
              fetchedLyrics = lyricRes.data[0].plainLyrics;
            }
          } catch (err) {}

          const newSong: Song = { 
            id: Date.now().toString(), title: rawTitle, artist: rawArtist, 
            url: `https://www.youtube.com/watch?v=${videoId}`, lyrics: fetchedLyrics, chords: "" 
          };
          
          setFolders(prev => {
            if (activeFolderId) {
              return prev.map(f => f.id === activeFolderId ? { ...f, songs: [...f.songs, newSong] } : f);
            } else {
              const defaultIndex = prev.findIndex(f => f.name === "Saved Library" || f.name === "Uncategorized");
              if (defaultIndex !== -1) {
                const updated = [...prev];
                updated[defaultIndex].songs.push(newSong);
                return updated;
              } else {
                return [...prev, { id: Date.now().toString(), name: "Saved Library", songs: [newSong] }];
              }
            }
          });
          setInputValue('');
          Toast.fire({ icon: 'success', title: 'Song added successfully!' });
        }
      } 
      else {
        setIsFetching(true);
        setYoutubeResults([]);
        let finalResults: any[] = [];
        try {
          const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          let html = "";
          try {
            const res = await axios.get(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytSearchUrl)}`);
            html = res.data;
          } catch (err) {
            const res2 = await axios.get(`https://corsproxy.io/?${encodeURIComponent(ytSearchUrl)}`);
            html = res2.data;
          }

          const idsMatch = [...html.matchAll(/"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"/g)];
          const uniqueIds = Array.from(new Set(idsMatch.map(m => m[1]))).slice(0, 5);

          if (uniqueIds.length > 0) {
             const fetchedResults = await Promise.all(uniqueIds.map(async (id) => {
                const metaRes = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
                const metaData = metaRes.data;
                return { 
                  videoId: id, 
                  title: metaData.title || query, 
                  author: metaData.author_name || "YouTube", 
                  url: `https://www.youtube.com/watch?v=${id}` 
                };
            }));
            finalResults = fetchedResults;
          }

          if (finalResults.length === 0) {
             Swal.fire({ icon: 'error', title: 'No results', text: 'Walay nakita nga kanta. Usba ang keyword.' });
          } else {
             setYoutubeResults(finalResults); 
          }
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Oops! Naay problema sa pag-connect sa YouTube.' });
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleTogglePlay = (playState: boolean) => {
    setIsPlaying(playState);
    if (ytPlayerRef.current) { 
      if (playState) {
        ytPlayerRef.current.playVideo(); 
      } else {
        ytPlayerRef.current.pauseVideo(); 
      }
    }
  };

  useEffect(() => { setIsClient(true); }, []);

  const currentActiveMenu = location.pathname.includes('playlist') ? 'folders' : location.pathname.includes('saved') ? 'saved' : location.pathname.includes('history') ? 'history' : 'home';

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden transition-colors relative">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          activeMenu={currentActiveMenu} activeFolderId={activeFolderId} 
          inputValue={inputValue} setInputValue={setInputValue}
          onSubmit={handleHeaderSubmit} setIsSidebarOpen={setIsSidebarOpen}
          isFetching={isFetching} searchMode={searchMode} setSearchMode={setSearchMode}
          bgPlayEnabled={bgPlayEnabled} setBgPlayEnabled={setBgPlayEnabled} 
        />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 transition-colors relative">
          <div className="mx-auto p-4 md:p-8 pb-32">
            <Outlet context={{ 
              folders, setFolders, activeFolderId, setActiveFolderId, currentSong, setCurrentSong, 
              setIsPlaying: handleTogglePlay, 
              isPlaying, isAutoSaveEnabled, setIsAutoSaveEnabled, inputValue, setInputValue, searchMode, youtubeResults, setYoutubeResults, isFetching,
              playHistory, setPlayHistory
            }} />
          </div>
        </main>

        {isClient && (
          <div className={`fixed bottom-28 right-4 md:bottom-32 md:right-8 z-60 w-[70vw] max-w-[16rem] md:w-80 lg:w-96 transition-all duration-500 origin-bottom-right ${(currentSong && showFloatingPlayer) ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-50 pointer-events-none'}`}>
            <div className="bg-zinc-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 group relative">
              <div className="absolute top-0 left-0 w-full p-2 md:p-3 flex justify-between items-center bg-linear-to-b from-black/90 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                <span className="text-[10px] font-bold text-white truncate px-2 max-w-[75%] uppercase tracking-widest drop-shadow-md">{currentSong?.title}</span>
                <button onClick={() => setShowFloatingPlayer(false)} className="p-1.5 md:p-2 bg-black/50 hover:bg-red-500 rounded-full text-white backdrop-blur-md transition-colors shadow-sm"><X className="w-3 h-3 md:w-4 md:h-4" /></button>
              </div>
              <div className="aspect-video relative bg-black pointer-events-none md:pointer-events-auto">
                {activeVideoId && (
                  <YouTube
                    key={activeVideoId} 
                    videoId={activeVideoId}
                    opts={{ 
                      width: '100%', 
                      height: '100%', 
                      playerVars: { 
                        autoplay: 1, 
                        controls: 1, 
                        modestbranding: 1, 
                        rel: 0, 
                        // GITANGTANG ANG HOST PROP
                        origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000' 
                      } 
                    }}
                    onReady={(e) => { 
                      ytPlayerRef.current = e.target; 
                      try { e.target.setVolume(Math.round(volume * 100)); } catch (error) {} 
                      
                      if (isPlaying) {
                        e.target.playVideo();
                      }
                    }}
                    onStateChange={(e) => {
                      if (e.data === 1) setIsPlaying(true);  
                      if (e.data === 2) setIsPlaying(false); 
                      if (e.data === 0) { 
                        const currentPlaylist = folders.find(f => f.songs.some(s => s.id === currentSong?.id))?.songs || [];
                        const currentIndex = currentPlaylist.findIndex(s => s.id === currentSong?.id);
                        if (currentIndex !== -1 && currentPlaylist.length > 0) {
                          const nextIndex = currentIndex < currentPlaylist.length - 1 ? currentIndex + 1 : 0;
                          setCurrentSong(currentPlaylist[nextIndex]); setIsPlaying(true); 
                        } else setIsPlaying(false);
                      }
                    }}
                    className="absolute inset-0 w-full h-full"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {currentSong && !showFloatingPlayer && (
          <button onClick={() => setShowFloatingPlayer(true)} className="fixed bottom-44 right-4 md:bottom-32 md:right-8 z-60 bg-indigo-600 text-white p-3 md:px-5 md:py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group border border-white/20">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-full h-full bg-white/40 rounded-full animate-ping" />
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">Show Video</span>
          </button>
        )}

        <Footer currentSong={currentSong} isPlaying={isPlaying} setIsPlaying={handleTogglePlay} ytPlayer={ytPlayerRef.current} playlistSongs={currentSong ? folders.find(f => f.songs.some(s => s.id === currentSong.id))?.songs || [] : []} onSongChange={(song) => { setCurrentSong(song); setIsPlaying(true); setShowFloatingPlayer(true); }} volume={volume} setVolume={setVolume} />
      </div>
    </div>
  );
}