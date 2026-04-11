import { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './views/components/Sidebar';
import { Header } from './views/components/Header';
import { Footer } from './views/components/Footer';
import type { PlaylistFolder, Song } from './views/types';
import { X, Play } from 'lucide-react';
import YouTube from 'react-youtube';

import axiosInstance from './plugin/axios';
import axios from 'axios';
import Swal from 'sweetalert2';

// TOAST CONFIGURATION
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
  
  // PERSISTENCE: Makuha ang kanta bisag gi-refresh ang page
  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    const saved = localStorage.getItem('last_played_song');
    return saved ? JSON.parse(saved) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const ytPlayerRef = useRef<any>(null);
  
  const [isAutoPlayNextEnabled, setIsAutoPlayNextEnabled] = useState(() => {
    const saved = localStorage.getItem('autoplay_next_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [bgPlayEnabled, setBgPlayEnabled] = useState(true);
  const [playHistory, setPlayHistory] = useState<any[]>([]);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isClient, setIsClient] = useState(false);

  const activeVideoId = getYouTubeID(currentSong?.url);
  const lastSavedData = useRef<string>("");
  const isSavingRef = useRef(false);

  // --- AUTO-PLAY ENGINE (IPHONE & CHROME FIX) ---
  const handleTogglePlay = (playState: boolean) => {
    setIsPlaying(playState);
    if (ytPlayerRef.current) {
      if (playState) {
        // Sa iPhone, kinahanglan i-unmute kadiyot aron mo-play
        ytPlayerRef.current.unMute(); 
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    }
  };

  // Logic para sa pagbalhin sa sunod nga kanta (Awtomatiko)
  const handleSongEnded = useCallback(() => {
    if (!isAutoPlayNextEnabled) {
      setIsPlaying(false);
      return;
    }
    const currentPlaylist = folders.find(f => f.songs.some(s => s.id === currentSong?.id))?.songs || [];
    const currentIndex = currentPlaylist.findIndex(s => s.id === currentSong?.id);

    if (currentIndex !== -1 && currentIndex < currentPlaylist.length - 1) {
      const nextSong = currentPlaylist[currentIndex + 1];
      setCurrentSong(nextSong);
      setIsPlaying(true);
      
      // IPHONE FIX: Imbis i-reload ang player, mandoan ang kasamtangang Iframe sa pag-ilis og video ID
      const nextId = getYouTubeID(nextSong.url);
      if (ytPlayerRef.current && nextId) {
        ytPlayerRef.current.loadVideoById(nextId);
        ytPlayerRef.current.playVideo();
      }
    } else {
      setIsPlaying(false);
    }
  }, [folders, currentSong, isAutoPlayNextEnabled]);

  // I-load ang video automatic kung nausab ang currentSong ID pinaagi sa code
  useEffect(() => {
    if (ytPlayerRef.current && activeVideoId && isPlaying) {
      const internalId = ytPlayerRef.current.getVideoData?.().video_id;
      if (internalId !== activeVideoId) {
        ytPlayerRef.current.loadVideoById(activeVideoId);
        ytPlayerRef.current.playVideo();
      }
    }
    if (currentSong) localStorage.setItem('last_played_song', JSON.stringify(currentSong));
  }, [activeVideoId, isPlaying, currentSong]);

  // --- REAL-TIME DATABASE SYNC ---
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
    } catch (err) { if (!isDataLoaded) setIsDataLoaded(true); }
  }, [isDataLoaded]);

  useEffect(() => {
    fetchDatabase(); 
    const pollInterval = setInterval(fetchDatabase, 4000); 
    return () => clearInterval(pollInterval);
  }, [fetchDatabase]);

  // --- AUTO-SAVE TO LARAVEL ---
  useEffect(() => {
    if (!isDataLoaded) return;
    const currentDataString = JSON.stringify(folders);
    if (currentDataString === lastSavedData.current) return;

    const saveTimer = setTimeout(() => {
      isSavingRef.current = true; 
      axiosInstance.post('playlists/sync', folders)
        .then(() => { 
          lastSavedData.current = currentDataString; 
          isSavingRef.current = false; 
        })
        .catch(() => { isSavingRef.current = false; });
    }, 1500); 

    return () => clearTimeout(saveTimer);
  }, [folders, isDataLoaded]);

  // --- HEADER SEARCH HANDLER ---
  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    if (activeFolderId === null && location.pathname.includes('playlist')) {
      const newFolder = { id: Date.now().toString(), name: query, songs: [] };
      setFolders([...folders, newFolder as any]);
      setInputValue('');
      Toast.fire({ icon: 'success', title: 'Folder created!' });
      return;
    }

    if (searchMode === 'local') return;

    setIsFetching(true);
    try {
      const isUrl = query.startsWith('http');
      if (isUrl || searchMode === 'link') {
        const confirmAdd = await Swal.fire({ title: 'Add this link?', text: "Import this worship track?", icon: 'question', showCancelButton: true, confirmButtonColor: '#4f46e5' });
        if (!confirmAdd.isConfirmed) return;

        let videoId = getYouTubeID(query);
        if (videoId) {
          const ytRes = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          const newSong: Song = { id: Date.now().toString(), title: ytRes.data.title, artist: ytRes.data.author_name, url: `https://www.youtube.com/watch?v=${videoId}`, lyrics: "", chords: "" };
          setFolders(prev => {
            if (activeFolderId) return prev.map(f => f.id === activeFolderId ? { ...f, songs: [...f.songs, newSong] } : f);
            return [...prev, { id: Date.now().toString(), name: "Saved Library", songs: [newSong] }];
          });
          setInputValue('');
          Toast.fire({ icon: 'success', title: 'Song added!' });
        }
      } else {
        setYoutubeResults([]);
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const res = await axios.get(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytSearchUrl)}`).catch(() => axios.get(`https://corsproxy.io/?${encodeURIComponent(ytSearchUrl)}`));
        const idsMatch = [...res.data.matchAll(/"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"/g)];
        const uniqueIds = Array.from(new Set(idsMatch.map(m => m[1]))).slice(0, 5);
        const results = await Promise.all(uniqueIds.map(async (id) => {
          const meta = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
          return { videoId: id, title: meta.data.title, author: meta.data.author_name, url: `https://www.youtube.com/watch?v=${id}` };
        }));
        setYoutubeResults(results);
      }
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: 'YouTube connection failed.' }); } finally { setIsFetching(false); }
  };

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { if (ytPlayerRef.current) { try { ytPlayerRef.current.setVolume(Math.round(volume * 100)); } catch (e) {} } }, [volume]);

  const currentActiveMenu = location.pathname.includes('playlist') ? 'folders' : location.pathname.includes('saved') ? 'saved' : 'home';

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden relative">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          activeMenu={currentActiveMenu} activeFolderId={activeFolderId} inputValue={inputValue} setInputValue={setInputValue} 
          onSubmit={handleHeaderSubmit} setIsSidebarOpen={setIsSidebarOpen} isFetching={isFetching} searchMode={searchMode} 
          setSearchMode={setSearchMode} bgPlayEnabled={bgPlayEnabled} setBgPlayEnabled={setBgPlayEnabled} 
        />
        
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 relative">
          <div className="mx-auto p-4 md:p-8 pb-32">
            <Outlet context={{ folders, setFolders, activeFolderId, setActiveFolderId, currentSong, setCurrentSong, setIsPlaying: handleTogglePlay, isPlaying, isAutoPlayNextEnabled, setIsAutoPlayNextEnabled, inputValue, setInputValue, searchMode, youtubeResults, setYoutubeResults, isFetching, playHistory, setPlayHistory }} />
          </div>
        </main>

        {/* --- GLOBAL YOUTUBE PLAYER --- */}
        {isClient && currentSong && activeVideoId && (
          <div className={`fixed bottom-28 right-4 md:bottom-32 md:right-8 z-60 w-[70vw] max-w-[16rem] md:w-80 transition-all duration-500 origin-bottom-right ${showFloatingPlayer ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-50 pointer-events-none'}`}>
            <div className="bg-zinc-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group relative">
              <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-center bg-black/60 z-20">
                <span className="text-[9px] font-bold text-white truncate px-2 max-w-[75%] uppercase tracking-widest">{currentSong?.title}</span>
                <button onClick={() => setShowFloatingPlayer(false)} className="p-1 bg-black/50 hover:bg-red-500 rounded-full text-white"><X className="w-3 h-3" /></button>
              </div>
              <div className="aspect-video relative bg-black">
                <YouTube
                  videoId={activeVideoId}
                  opts={{ 
                    width: '100%', height: '100%', 
                    playerVars: { 
                      autoplay: 1, mute: 1, playsinline: 1, controls: 1, rel: 0, enablejsapi: 1,
                      origin: window.location.protocol + '//' + window.location.host 
                    } 
                  }}
                  onReady={(e) => { 
                    ytPlayerRef.current = e.target; 
                    if (isPlaying) { e.target.unMute(); e.target.playVideo(); }
                  }}
                  onStateChange={(e) => {
                    if (e.data === 1) { setIsPlaying(true); e.target.unMute(); }
                    if (e.data === 2) setIsPlaying(false);
                    if (e.data === 0) handleSongEnded();
                  }}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </div>
        )}

        {currentSong && !showFloatingPlayer && (
          <button onClick={() => setShowFloatingPlayer(true)} className="fixed bottom-44 right-8 z-60 bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-bounce"><Play className="w-6 h-6 fill-current" /></button>
        )}

        <Footer currentSong={currentSong} isPlaying={isPlaying} setIsPlaying={handleTogglePlay} ytPlayer={ytPlayerRef.current} playlistSongs={currentSong ? folders.find(f => f.songs.some(s => s.id === currentSong.id))?.songs || [] : []} onSongChange={(song) => { setCurrentSong(song); setIsPlaying(true); setShowFloatingPlayer(true); }} volume={volume} setVolume={setVolume} />
      </div>
    </div>
  );
}