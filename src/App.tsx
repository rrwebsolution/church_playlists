import { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './views/components/Sidebar';
import { Header } from './views/components/Header';
import { Footer } from './views/components/Footer';
import type { PlaylistFolder, Song } from './views/types';
import { X, Play, GripHorizontal, Tv } from 'lucide-react';
import YouTube from 'react-youtube';

import axiosInstance from './plugin/axios';
import axios from 'axios';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';

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
  const [importingId, setImportingId] = useState<string | null>(null);

  const [folders, setFolders] = useState<PlaylistFolder[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    const saved = localStorage.getItem('last_played_song');
    return saved ? JSON.parse(saved) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  
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

  // --- LATEST STATE REFS (Para mawala ang TypeScript errors) ---
  const currentSongRef = useRef<Song | null>(currentSong);
  const foldersRef = useRef<PlaylistFolder[]>(folders);
  const autoPlayRef = useRef<boolean>(isAutoPlayNextEnabled);

  // Kini nga useEffect mag-update sa Refs taga-usab sa imong state
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { foldersRef.current = folders; }, [folders]);
  useEffect(() => { autoPlayRef.current = isAutoPlayNextEnabled; }, [isAutoPlayNextEnabled]);

  

  // Sa sulod sa App component
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

  const nodeRef = useRef(null);

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
    if (currentSong) localStorage.setItem('last_played_song', JSON.stringify(currentSong));
    localStorage.setItem('autoplay_next_enabled', JSON.stringify(isAutoPlayNextEnabled));
  }, [currentSong, isAutoPlayNextEnabled]);

  const fetchDatabase = useCallback(async () => {
    try {
      const response = await axiosInstance.get('playlists');
      const dbDataString = JSON.stringify(response.data);
      
      if (dbDataString !== lastSavedData.current) {
        setFolders(response.data); 
        lastSavedData.current = dbDataString; 
      }
      setIsDataLoaded(true);
    } catch (err) { 
      setIsDataLoaded(true); 
    }
  }, []);

  useEffect(() => {
    fetchDatabase(); 
  }, [fetchDatabase]);

 // --- AUTO-SAVE (SYNC) KUNG NAAY MA-USAB SA FOLDERS ---
useEffect(() => {
  // 1. Ayaw pag-sync kung wala pa mahuman og load ang data gikan sa server
  if (!isDataLoaded) return;

  // 2. Safeguard: Kung ang folders kay empty ([]) apan ang database naay sulod (lastSavedData),
  // ayaw ipadayon ang sync kay pasabot ani wala pa ma-update ang state.
  if (folders.length === 0 && lastSavedData.current !== "" && lastSavedData.current !== "[]") {
    return;
  }

  const currentDataString = JSON.stringify(folders);
  
  // 3. Ayaw pag-sync kung wala gyud kay gi-usab (parehas ra ang data karon ug ang sa server)
  if (currentDataString === lastSavedData.current) return;

  // Kung mo-agi sa tanang filters sa ibabaw, diha pa nato i-save sa database
  const saveTimer = setTimeout(() => {
    isSavingRef.current = true; 
    axiosInstance.post('playlists/sync', folders)
      .then(() => { 
        lastSavedData.current = currentDataString; 
        isSavingRef.current = false; 
      })
      .catch((err) => { 
        isSavingRef.current = false; 
        // Kung naay error sa sync (sama sa cannot delete folder), i-fetch balik ang saktong data
        console.error("Sync error:", err);
        fetchDatabase(); 
      });
  }, 2000); // Gidugangan nato ang delay gamay aron sure nga human na ang tanang local state updates
  
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
        Swal.fire({ 
          icon: 'info', 
          title: 'Already in Library', 
          html: `<b>"${yt.title}"</b> is already saved in the folder: <b>${existingFolder}</b>.<br><br>If you want to add this song to your current folder, please switch your search mode to <b>Local Library</b> and add it from there.` 
        });
        return; 
    }

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

    const newSong: Song = { 
      id: Date.now().toString(), 
      title: yt.title, 
      artist: yt.author, 
      url: yt.url, 
      lyrics: "",
      chords: "" 
    };

    setFolders((prev: PlaylistFolder[]) => {
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
    
    setImportingId(null);
    setYoutubeResults([]); 
    setInputValue('');
    
    Toast.fire({ icon: 'success', title: 'Song imported successfully!' });
  };

  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    if (activeFolderId === null && location.pathname.includes('playlist')) {
      const newFolder = { id: Date.now().toString(), name: query, songs: [] };
      setFolders([...folders, newFolder as any]);
      setInputValue('');
      return;
    }

    if (searchMode === 'local') return;

    const isUrl = query.startsWith('http');
    if (isUrl || searchMode === 'link') {
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
              Swal.fire({ 
                icon: 'info', 
                title: 'Already in Library', 
                html: `This YouTube link is already saved in the folder: <b>${existingFolder}</b>.<br><br>If you want to add this song to your current folder, please switch your search mode to <b>Local Library</b> and add it from there.` 
              });
              setIsFetching(false);
              return; 
          }

          const ytRes = await axios.get(`https://noembed.com/embed?url=${targetUrl}`);
          
          const newSong: Song = { 
            id: Date.now().toString(), 
            title: ytRes.data.title, 
            artist: ytRes.data.author_name, 
            url: targetUrl, 
            lyrics: "", 
            chords: "" 
          };

          setFolders(prev => {
            if (activeFolderId) return prev.map(f => f.id === activeFolderId ? { ...f, songs: [...f.songs, newSong] } : f);
            return [...prev, { id: Date.now().toString(), name: "Saved Library", songs: [newSong] }];
          });

          setInputValue('');
          Toast.fire({ icon: 'success', title: 'Added!' });
        }
      } catch (err) {
        console.error(err);
      } finally { 
        setIsFetching(false); 
      }
    }
  };

  const handleTogglePlay = (playState: boolean) => {
    setIsPlaying(playState);
    if (ytPlayer) {
      if (playState) {
        ytPlayer.unMute(); 
        ytPlayer.playVideo();
      } else {
        ytPlayer.pauseVideo();
      }
    }
  };

  // --- SONG ENDED HANDLER (WITH AUTO-LOOP TO FIRST SONG) ---
  const handleSongEnded = useCallback(() => {
    // 1. Check kung naka-ON ang Auto-Play
    if (!autoPlayRef.current) {
      setIsPlaying(false);
      return;
    }

    // 2. Pangitaon ang folder sa kanta karon gamit ang Refs (para dili ma-stale sa iOS)
    const currentFolder = foldersRef.current.find(f => 
      f.songs.some(s => s.id === currentSongRef.current?.id)
    );

    if (!currentFolder || currentFolder.songs.length === 0) {
      setIsPlaying(false);
      return;
    }

    const playlist = currentFolder.songs;
    const currentIndex = playlist.findIndex(s => s.id === currentSongRef.current?.id);

    // 3. KINI ANG LOOP LOGIC:
    // (currentIndex + 1) % playlist.length
    // Pananglitan: Kung naa sa song index 4 out of 5 songs -> (4 + 1) % 5 = 0 (Balik sa una!)
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextSong = playlist[nextIndex];

    // 4. I-update ang state para mo-trigger ang player sync
    setCurrentSong(nextSong);
    setIsPlaying(true);

    // 5. Para sa iOS stability: load diritso ang video id
    const nextId = getYouTubeID(nextSong.url);
    if (ytPlayer && nextId) {
      ytPlayer.loadVideoById(nextId);
      ytPlayer.playVideo();
    }
  }, [ytPlayer]); // Dependency is only ytPlayer kay Ref na ang uban

  useEffect(() => {
    if (searchMode !== 'youtube' || inputValue.trim().length < 2) {
      if (inputValue.trim() === '') setYoutubeResults([]);
      return;
    }
    if (inputValue.trim().startsWith('http')) return;

    let isCancelled = false; 

    const timer = setTimeout(async () => {
      const query = inputValue.trim();
      setIsFetching(true);
      try {
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const res = await axios.get(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytSearchUrl)}`)
          .catch(() => axios.get(`https://corsproxy.io/?${encodeURIComponent(ytSearchUrl)}`));
        
        if (isCancelled) return; 

        const parts = res.data.split('"videoRenderer":{"videoId":"');
        parts.shift(); 

        const results: { videoId: string; title: string; author: string; url: string }[] = [];
        
        for (const part of parts) {
          if (results.length >= 25) break; 
          
          const videoId = part.substring(0, 11);
          
          const titleMatch = part.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
          const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"') : "Unknown Title";

          const authorMatch = part.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
          const author = authorMatch ? authorMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"') : "Unknown Author";

          if (!results.some(r => r.videoId === videoId)) {
            results.push({
              videoId,
              title,
              author,
              url: `https://www.youtube.com/watch?v=${videoId}`
            });
          }
        }

        if (!isCancelled) {
          setYoutubeResults(results);
        }
      } catch (err) {
        console.error("Auto-search failed", err);
      } finally {
        if (!isCancelled) setIsFetching(false);
      }
    }, 700); 

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue, searchMode]);

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { if (ytPlayer) { try { ytPlayer.setVolume(Math.round(volume * 100)); } catch (e) {} } }, [volume, ytPlayer]);

  const currentActiveMenu = location.pathname.includes('playlist') ? 'folders' : location.pathname.includes('saved') ? 'saved' : 'home';

  // --- MEDIA SESSION API (Lock Screen Info & Controls) ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const videoId = getYouTubeID(currentSong.url);
      
      // 1. I-set ang impormasyon sa kanta nga mugawas sa Lock Screen
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Unknown Artist',
        album: activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'Worship DJ',
        artwork: [
          { 
            src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, 
            sizes: '480x360', 
            type: 'image/jpeg' 
          },
          { 
            src: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, 
            sizes: '1280x720', 
            type: 'image/jpeg' 
          }
        ]
      });

      // 2. I-set ang mga buttons sa Lock Screen
      navigator.mediaSession.setActionHandler('play', () => {
        handleTogglePlay(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        handleTogglePlay(false);
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleSongEnded();
      });

      // Opsyonal: Kung gusto nimo naay Previous button sa lock screen
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        // I-add ang imong previous song logic diri kung naa na
        console.log("Previous song clicked from lock screen");
      });
    }

    // Limpyohon ang handlers inig gawas sa app aron dili mag-conflict
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [currentSong, activeFolderId, handleSongEnded]); // Mo-update ni taga ilis sa kanta
  
  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden relative">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          activeMenu={currentActiveMenu} 
          activeFolderId={activeFolderId} 
          inputValue={inputValue} 
          setInputValue={setInputValue} 
          onSubmit={handleHeaderSubmit} 
          setIsSidebarOpen={setIsSidebarOpen} 
          isFetching={isFetching} 
          searchMode={searchMode} 
          setSearchMode={setSearchMode} 
          bgPlayEnabled={bgPlayEnabled} 
          setBgPlayEnabled={setBgPlayEnabled} 
          youtubeResults={youtubeResults}
          setYoutubeResults={setYoutubeResults}
          onImportYT={handleImportYT}
          importingId={importingId}
        />
        
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 relative">
          <div className="mx-auto p-4 md:p-8 pb-32">
            <Outlet 
              context={{ 
                folders, 
                setFolders, 
                activeFolderId, 
                setActiveFolderId, 
                currentSong, 
                setCurrentSong, 
                setIsPlaying: handleTogglePlay, 
                isPlaying, 
                isAutoPlayNextEnabled, 
                setIsAutoPlayNextEnabled, 
                inputValue, 
                setInputValue, 
                searchMode, 
                playHistory, 
                setPlayHistory,
                 ytPlayer,
              }} 
            />
          </div>
        </main>

        {/* DRAGGABLE FLOATING PLAYER - DRAGGABLE ONLY ON MOBILE */}
        {isClient && currentSong && activeVideoId && (
          <Draggable 
            nodeRef={nodeRef} 
            handle=".drag-handle" 
            cancel=".no-drag"
            bounds="parent"
            disabled={!isMobile} // <--- KINI: I-disable ang drag kung DILI mobile (Desktop)
          >
            <div 
              ref={nodeRef}
              className={`fixed bottom-28 right-4 md:bottom-32 md:right-8 z-60 w-[70vw] max-w-[16rem] md:w-80 transition-opacity duration-500 ${showFloatingPlayer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <div className="bg-zinc-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group relative">
                
                {/* DRAG HANDLE & HEADER - Ang drag icon makita ra kung isMobile=true */}
                <div className="drag-handle absolute top-0 left-0 w-full p-2 flex justify-between items-center bg-black/80 z-20 border-b border-white/5" style={{ cursor: isMobile ? 'move' : 'default' }}>
                  <div className="flex items-center gap-2 px-2 max-w-[75%]">
                    {isMobile && <GripHorizontal className="w-3 h-3 text-zinc-500" />}
                    <span className="text-[9px] font-bold text-white truncate uppercase tracking-widest">{currentSong?.title}</span>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFloatingPlayer(false);
                    }} 
                    className="no-drag p-2 bg-zinc-800 hover:bg-red-500 rounded-lg text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="no-drag aspect-video relative bg-black pt-8">
                  <YouTube
  videoId={activeVideoId || undefined}
  opts={{ 
    width: '100%', 
    height: '100%', 
    host: 'https://www.youtube-nocookie.com',
    playerVars: { 
      autoplay: 1, 
      mute: 0,     
      playsinline: 1, 
      controls: 1, 
      rel: 0, 
      origin: window.location.origin,
      enablejsapi: 1,
    } 
  }}
  onReady={(e) => { 
    setYtPlayer(e.target); 
    if (isPlaying) {
      e.target.unMute(); 
      e.target.playVideo(); 
    }
  }}
  onStateChange={(e) => {
    if (e.data === 1) setIsPlaying(true); 
    if (e.data === 2) setIsPlaying(false); 
    if (e.data === 0) handleSongEnded();   
  }}
  className="absolute inset-0 w-full h-full"
/>
                </div>
              </div>
            </div>
          </Draggable>
        )}

        {/* FLOATING SHOW BUTTON (CHANGED ICON TO TV/VIDEO) */}
        {currentSong && !showFloatingPlayer && (
          <button 
            onClick={() => setShowFloatingPlayer(true)} 
            className="fixed bottom-44 right-8 z-60 bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-bounce hover:scale-110 active:scale-95 transition-all"
            title="Show Video Player"
          >
            <Tv className="w-6 h-6" /> {/* Icon changed to TV (Video) */}
          </button>
        )}

        {currentSong && !showFloatingPlayer && (
          <button onClick={() => setShowFloatingPlayer(true)} className="fixed bottom-44 right-8 z-60 bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-bounce"><Play className="w-6 h-6 fill-current" /></button>
        )}

        <Footer currentSong={currentSong} isPlaying={isPlaying} setIsPlaying={handleTogglePlay} ytPlayer={ytPlayer} playlistSongs={currentSong ? folders.find(f => f.songs.some(s => s.id === currentSong.id))?.songs || [] : []} onSongChange={(song) => { setCurrentSong(song); setIsPlaying(true); setShowFloatingPlayer(true); }} volume={volume} setVolume={setVolume} />
      </div>
    </div>
  );
}