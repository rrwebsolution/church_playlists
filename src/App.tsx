import { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './views/components/Sidebar';
import { Header } from './views/components/Header';
import { Footer } from './views/components/Footer';
import type { PlaylistFolder, Song } from './views/types';
import { X, GripHorizontal, Tv } from 'lucide-react';

import axiosInstance from './plugin/axios';
import axios from 'axios';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

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

// BAG-ONG TYPES PARA SA PPT PRESENTATIONS (Gi-move na ni sa App.tsx)
export interface PptPresentationFile {
  id: string;
  name: string;
  slidesCount: number;
  uploadedAt: string;
  thumbnailUrl?: string;
  sourceText?: string;
  templateId?: string;
}

export default function App() {
  const location = useLocation();

  const isEasyWorshipPage = location.pathname.includes('/app/easyworship');
  const isFooterHiddenRoute = location.pathname.includes('/app/ppt-presentation') || location.pathname.includes('/app/settings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'youtube' | 'link' | 'local'>('youtube');
  const [inputValue, setInputValue] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  const [folders, setFolders] = useState<PlaylistFolder[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const activeFolder = folders.find(f => f.id === activeFolderId) || null;

  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    const saved = localStorage.getItem('last_played_song');
    return saved ? JSON.parse(saved) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  
  const ytPlayerRef = useRef<any>(null);
  const [ytPlayer, setYtPlayer] = useState<any>(null); 
  
  const [isAutoPlayNextEnabled, setIsAutoPlayNextEnabled] = useState(() => {
    const saved = localStorage.getItem('autoplay_next_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [bgPlayEnabled, setBgPlayEnabled] = useState(true);
  const [playHistory, setPlayHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('jamc_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const lastSavedData = useRef<string>("");
  const isSavingRef = useRef(false);
  const nodeRef = useRef(null);

  // STATE PARA SA SIDEBAR COLLAPSED
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
      return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // BAG-ONG STATE SA APP.TSX PARA SA PPT PRESENTATIONS
  const [presentations, setPresentations] = useState<PptPresentationFile[]>(() => {
    const saved = localStorage.getItem('jamc_ppt_presentations');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('jamc_ppt_presentations', JSON.stringify(presentations));
  }, [presentations]);


  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIOS || isSafari) setShowFloatingPlayer(false);
  }, []);

  const currentSongRef = useRef<Song | null>(currentSong);
  const foldersRef = useRef<PlaylistFolder[]>(folders);
  const autoPlayRef = useRef<boolean>(isAutoPlayNextEnabled);

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { foldersRef.current = folders; }, [folders]);
  useEffect(() => { autoPlayRef.current = isAutoPlayNextEnabled; }, [isAutoPlayNextEnabled]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setIsClient(true); }, []);

  const initPlayer = useCallback(() => {
    const container = document.getElementById('vanilla-yt-player');
    if (!container) return; 

    const initialId = getYouTubeID(currentSongRef.current?.url) || '';

    if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
      try { ytPlayerRef.current.destroy(); } catch (e) {}
    }

    ytPlayerRef.current = new window.YT.Player('vanilla-yt-player', {
      videoId: initialId,
      playerVars: {
        autoplay: 1, // Autoplay Enabled
        origin: window.location.origin,
        playsinline: 1,
        controls: 1,
        rel: 0,
      },
      events: {
        onReady: (event: any) => {
          ytPlayerRef.current = event.target; 
          setYtPlayer(event.target);
          event.target.setVolume(Math.round(volume * 100));
          
          if (initialId) {
            event.target.playVideo();
          }
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
          if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
          if (event.data === window.YT.PlayerState.ENDED) {
            handleVanillaSongEnded(event.target);
          }
        }
      }
    });
  }, [volume]);

  useEffect(() => {
    if (!isClient) return;
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setTimeout(initPlayer, 500);
    } else {
      setTimeout(initPlayer, 500);
    }
  }, [isClient, initPlayer]);

  useEffect(() => {
    if (currentSong && !ytPlayer && window.YT) {
      setTimeout(initPlayer, 500);
    }
  }, [currentSong, ytPlayer, initPlayer]);

  const handleVanillaSongEnded = (playerInstance: any) => {
    if (!autoPlayRef.current) { 
      setIsPlaying(false); 
      return; 
    }
    const currentFolder = foldersRef.current.find(f => f.songs.some(s => s.id === currentSongRef.current?.id));
    if (!currentFolder || currentFolder.songs.length === 0) { 
      setIsPlaying(false); 
      return; 
    }
    const playlist = currentFolder.songs;
    const currentIndex = playlist.findIndex(s => s.id === currentSongRef.current?.id);
    const nextSong = playlist[(currentIndex + 1) % playlist.length];
    const nextVideoId = getYouTubeID(nextSong.url);
    if (nextVideoId) {
      playerInstance.loadVideoById(nextVideoId);
      setCurrentSong(nextSong);
    }
  };

  const handleSelectSong = (song: Song) => {
    const nextId = getYouTubeID(song.url);
    setCurrentSong(song);
    setShowFloatingPlayer(true);
    const player = ytPlayer || ytPlayerRef.current;
    if (player && typeof player.loadVideoById === 'function' && nextId) {
      player.loadVideoById(nextId);
      player.playVideo();
    }
  };

  const handleTogglePlay = (playState: boolean) => {
    setIsPlaying(playState);
    const player = ytPlayer || ytPlayerRef.current;
    if (player && typeof player.playVideo === 'function') {
      if (playState) player.playVideo();
      else player.pauseVideo();
    }
  };

  useEffect(() => { 
    const player = ytPlayer || ytPlayerRef.current;
    if (player && typeof player.setVolume === 'function') {
        try { player.setVolume(Math.round(volume * 100)); } catch (e) {} 
    }
  }, [volume, ytPlayer]);

  useEffect(() => {
    if (currentSong) {
      setPlayHistory(prev => {
        if (prev.length > 0 && prev[0].song.id === currentSong.id) return prev;
        const newLog = { id: Date.now().toString(), song: currentSong, playedAt: new Date().toISOString() };
        const updatedHistory = [newLog, ...prev].slice(0, 50);
        localStorage.setItem('jamc_history', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      localStorage.setItem('last_played_song', JSON.stringify(currentSong));
    }
    localStorage.setItem('autoplay_next_enabled', JSON.stringify(isAutoPlayNextEnabled));
  }, [currentSong, isAutoPlayNextEnabled]);

  const handleClearHistory = () => {
    setPlayHistory([]);
    localStorage.removeItem('jamc_history');
  };

  const fetchDatabase = useCallback(async () => {
    try {
      const response = await axiosInstance.get('playlists');
      if (JSON.stringify(response.data) !== lastSavedData.current) {
        setFolders(response.data); 
        lastSavedData.current = JSON.stringify(response.data); 
      }
      setIsDataLoaded(true);
    } catch (err) { setIsDataLoaded(true); }
  }, []);

  useEffect(() => { fetchDatabase(); }, [fetchDatabase]);

  useEffect(() => {
    if (!isDataLoaded) return;
    if (folders.length === 0 && lastSavedData.current !== "" && lastSavedData.current !== "[]") return;
    const currentDataString = JSON.stringify(folders);
    if (currentDataString === lastSavedData.current) return;

    const saveTimer = setTimeout(() => {
      isSavingRef.current = true;
      if (!folders || folders.length === 0) { isSavingRef.current = false; return; }
      axiosInstance.post('playlists/sync', folders).then(() => {
        lastSavedData.current = currentDataString;
        isSavingRef.current = false;
      }).catch(() => {
        isSavingRef.current = false;
        fetchDatabase();
      });
    }, 2000);
    return () => clearTimeout(saveTimer);
  }, [folders, isDataLoaded, fetchDatabase]);

  const handleImportYT = async (yt: any) => {
    let existingFolder = null;
    const isDuplicateGlobally = folders.some(folder => {
      const exists = folder.songs.some(s => s.url === yt.url);
      if (exists) existingFolder = folder.name;
      return exists;
    });

    if (isDuplicateGlobally) {
        Swal.fire({ icon: 'info', title: 'Already in Library', html: `<b>"${yt.title}"</b> is already saved in: <b>${existingFolder}</b>.` });
        return; 
    }

    const confirmImport = await Swal.fire({ title: 'Import Song?', text: `Add "${yt.title}"?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#4f46e5' });
    if (!confirmImport.isConfirmed) return;

    setImportingId(yt.videoId);
    const newSong: Song = { id: Date.now().toString(), title: yt.title, artist: yt.author, url: yt.url, lyrics: "", chords: "" };

    setFolders(prev => {
      if (activeFolderId) return prev.map(f => f.id === activeFolderId ? { ...f, songs: [...f.songs, newSong] } : f);
      const defaultIndex = prev.findIndex(f => f.name === "Saved Library" || f.name === "Uncategorized");
      if (defaultIndex !== -1) { const updated = [...prev]; updated[defaultIndex].songs.push(newSong); return updated; } 
      else return [...prev, { id: Date.now().toString(), name: "Saved Library", songs: [newSong] }];
    });
    
    setImportingId(null);
    setYoutubeResults([]); 
    setInputValue('');
    Toast.fire({ icon: 'success', title: 'Imported successfully!' });
  };

  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query || searchMode === 'local') return;

    if (query.startsWith('http') || searchMode === 'link') {
      setIsFetching(true);
      try {
        let videoId = getYouTubeID(query);
        if (videoId) {
          const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
          let existingFolder = null;
          const isDuplicateGlobally = folders.some(folder => {
            const exists = folder.songs.some(s => s.url === targetUrl);
            if (exists) existingFolder = folder.name;
            return exists;
          });
          if (isDuplicateGlobally) {
              Swal.fire({ icon: 'info', title: 'Already in Library', html: `Saved in folder: <b>${existingFolder}</b>.` });
              setIsFetching(false); return; 
          }
          const ytRes = await axios.get(`https://noembed.com/embed?url=${targetUrl}`);
          const newSong: Song = { id: Date.now().toString(), title: ytRes.data.title, artist: ytRes.data.author_name, url: targetUrl, lyrics: "", chords: "" };
          setFolders(prev => {
            if (activeFolderId) return prev.map(f => f.id === activeFolderId ? { ...f, songs: [...f.songs, newSong] } : f);
            return [...prev, { id: Date.now().toString(), name: "Saved Library", songs: [newSong] }];
          });
          setInputValue('');
          Toast.fire({ icon: 'success', title: 'Added!' });
        }
      } catch (err) {} finally { setIsFetching(false); }
    }
  };

  useEffect(() => {
    if (searchMode !== 'youtube' || inputValue.trim().length < 2) {
      if (inputValue.trim() === '') setYoutubeResults([]); return;
    }
    if (inputValue.trim().startsWith('http')) return;

    let isCancelled = false; 
    const timer = setTimeout(async () => {
      setIsFetching(true);
      try {
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(inputValue.trim())}`;
        const res = await axios.get(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytSearchUrl)}`)
          .catch(() => axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(ytSearchUrl)}`));
        if (isCancelled) return; 

        const parts = res.data.split('"videoRenderer":{"videoId":"');
        parts.shift(); 
        const results: any[] = [];
        
        for (const part of parts) {
          if (results.length >= 25) break; 
          const videoId = part.substring(0, 11);
          const titleMatch = part.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
          const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"') : "Unknown";
          const authorMatch = part.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
          const author = authorMatch ? authorMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"') : "Unknown";
          if (!results.some(r => r.videoId === videoId)) results.push({ videoId, title, author, url: `https://www.youtube.com/watch?v=${videoId}` });
        }
        if (!isCancelled) setYoutubeResults(results);
      } catch (err) {} finally { if (!isCancelled) setIsFetching(false); }
    }, 700); 
    return () => { isCancelled = true; clearTimeout(timer); };
  }, [inputValue, searchMode]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const videoId = getYouTubeID(currentSong.url);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Unknown Artist',
        artwork: [{ src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', () => handleTogglePlay(true));
      navigator.mediaSession.setActionHandler('pause', () => handleTogglePlay(false));
      navigator.mediaSession.setActionHandler('nexttrack', () => handleVanillaSongEnded(ytPlayerRef.current));
    }
  }, [currentSong, ytPlayer]);

  const currentActiveMenu = location.pathname.includes('playlist') ? 'folders' : location.pathname.includes('saved') ? 'saved' : 'home';

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden relative">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          activeMenu={currentActiveMenu} 
          activeFolderId={activeFolderId} inputValue={inputValue} setInputValue={setInputValue} 
          onSubmit={handleHeaderSubmit} setIsSidebarOpen={setIsSidebarOpen} isFetching={isFetching} 
          searchMode={searchMode} setSearchMode={setSearchMode} bgPlayEnabled={bgPlayEnabled} 
          setBgPlayEnabled={setBgPlayEnabled} youtubeResults={youtubeResults} setYoutubeResults={setYoutubeResults}
          onImportYT={handleImportYT} importingId={importingId}
        />
        
        <main className={`flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 relative ${isEasyWorshipPage ? 'pb-8' : 'pb-32'}`}>
          <div className="mx-auto p-4 md:p-8">
            <Outlet 
              context={{ 
                folders, setFolders, activeFolderId, setActiveFolderId, activeFolder, 
                currentSong, setCurrentSong, selectSong: handleSelectSong, setIsPlaying: handleTogglePlay, isPlaying, 
                isAutoPlayNextEnabled, setIsAutoPlayNextEnabled, inputValue, setInputValue, 
                searchMode, setSearchMode, playHistory, setPlayHistory, ytPlayer, handleClearHistory,
                // IDUGANG ANG PPT STATES SA CONTEXT
                presentations, setPresentations
              }} 
            />
          </div>
        </main>

        {isClient && currentSong && (
          <div style={{ display: (isEasyWorshipPage || isFooterHiddenRoute) ? 'none' : 'block' }}>
            <Draggable nodeRef={nodeRef} handle=".drag-handle" cancel=".no-drag" bounds="parent" disabled={!isMobile}>
              <div ref={nodeRef} className={`fixed bottom-28 right-4 md:bottom-32 md:right-8 z-60 w-[70vw] max-w-[16rem] md:w-80 transition-opacity duration-500 ${showFloatingPlayer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="drag-handle absolute top-0 left-0 w-full p-2 flex justify-between items-center bg-black/80 z-20 border-b border-white/5" style={{ cursor: isMobile ? 'move' : 'default' }}>
                  <div className="flex items-center gap-2 px-2 max-w-[75%]">
                    {isMobile && <GripHorizontal className="w-3 h-3 text-zinc-500" />}
                    <span className="text-[9px] font-bold text-white truncate uppercase tracking-widest">{currentSong?.title}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setShowFloatingPlayer(false); }} className="no-drag p-2 bg-zinc-800 hover:bg-red-500 rounded-lg text-white transition-colors"><X className="w-3 h-3" /></button>
                </div>
                <div className="no-drag aspect-video relative bg-black pt-8">
                  <div id="vanilla-yt-player" className="absolute inset-0 w-full h-full pointer-events-none sm:pointer-events-auto"></div>
                </div>
              </div>
            </Draggable>
          </div>
        )}

        {!isEasyWorshipPage && !isFooterHiddenRoute && currentSong && !showFloatingPlayer && (
          <button onClick={() => setShowFloatingPlayer(true)} className="fixed bottom-44 right-8 z-60 bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-bounce hover:scale-110 active:scale-95 transition-all" title="Show Video Player"><Tv className="w-6 h-6" /></button>
        )}

        {!isEasyWorshipPage && (
          <div className={isFooterHiddenRoute ? 'invisible pointer-events-none' : ''}>
            <Footer
              currentSong={currentSong}
              isPlaying={isPlaying}
              setIsPlaying={handleTogglePlay}
              ytPlayer={ytPlayer}
              playlistSongs={currentSong ? folders.find(f => f.songs.some(s => s.id === currentSong.id))?.songs || [] : []}
              onSongChange={handleSelectSong}
              volume={volume}
              setVolume={setVolume}
              hasInteracted={true}
              isSidebarCollapsed={isSidebarCollapsed}
            />
          </div>
        )}
      </div>
    </div>
  );
}