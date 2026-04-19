import { useCallback, useEffect, useRef, useState } from 'react';

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'video';

const API_URL = (import.meta.env.VITE_URL || 'http://localhost/jamctagoloan-backend/public') + '/api/obs-state';

export default function EasyWorshipView() {
  const [lyrics, setLyrics] = useState("");
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [fontFamily, setFontFamily] = useState('Oswald, sans-serif');
  const [isBold, setIsBold] = useState(true);
  const [isAllCaps, setIsAllCaps] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [needsFullscreen, setNeedsFullscreen] = useState(
    new URLSearchParams(window.location.search).get('fs') === '1'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastUpdatedAt = useRef(0);
  const lyricsRef = useRef(lyrics);
  lyricsRef.current = lyrics;

  const handleEnterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {});
    setNeedsFullscreen(false);
  };

  const applyData = useCallback((data: any) => {
    if (!data || (data.updatedAt && data.updatedAt <= lastUpdatedAt.current)) return;
    if (data.updatedAt) lastUpdatedAt.current = data.updatedAt;

    const newText = data.text ?? "";

    if (newText === lyricsRef.current) {
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      if (data.bold !== undefined) setIsBold(data.bold);
      if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
      return;
    }

    setIsVisible(false);
    setTimeout(() => {
      setLyrics(newText);
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      if (data.bold !== undefined) setIsBold(data.bold);
      if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
      if (newText.trim() !== "") setIsVisible(true);
    }, 300);
  }, []);

  // localStorage polling — fast path for same-browser projector window
  useEffect(() => {
    const sync = () => {
      const raw = localStorage.getItem('jamc_live_display');
      if (!raw) return;
      try { applyData(JSON.parse(raw)); } catch {}
    };
    const interval = setInterval(sync, 300);
    window.addEventListener('storage', sync);
    sync();
    return () => { clearInterval(interval); window.removeEventListener('storage', sync); };
  }, [applyData]);

  // API polling — for OBS Browser Source (separate Chromium, no shared localStorage)
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(API_URL);
        if (res.ok) applyData(await res.json());
      } catch {}
      if (active) setTimeout(poll, 500);
    };
    poll();
    return () => { active = false; };
  }, [applyData]);

  const getBgClass = (type: BackgroundType) => {
    if (type === 'praise') return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 animate-gradient-fast';
    if (type === 'worship') return 'bg-gradient-to-t from-black via-indigo-950 to-black animate-gradient-slow';
    if (type === 'green') return 'bg-[#00FF00]';
    return 'bg-black';
  };

  return (
    <div className={`w-screen h-screen flex flex-col justify-center items-center p-10 md:p-24 overflow-hidden select-none transition-colors duration-1000 relative ${getBgClass(bgType)}`}>


      {needsFullscreen && (
        <button
          onClick={handleEnterFullscreen}
          className="absolute inset-0 z-50 w-full h-full bg-black flex flex-col items-center justify-center gap-4 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h4.5M3.75 3.75v4.5M3.75 3.75l5.25 5.25M20.25 3.75h-4.5m4.5 0v4.5m0-4.5-5.25 5.25M3.75 20.25h4.5m-4.5 0v-4.5m0 4.5 5.25-5.25M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5-5.25-5.25" />
          </svg>
          <span className="text-white/40 text-sm font-black uppercase tracking-widest">Click to enter fullscreen</span>
        </button>
      )}

      {/* VIDEO BACKGROUND */}
      {bgType === 'video' && videoUrl && (
        <video
          ref={videoRef}
          key={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={videoUrl}
        />
      )}

      {/* LYRICS WITH SMOOTH ANIMATION */}
      <div
        className={`transition-all duration-500 ease-in-out transform w-full max-w-[95%] flex justify-center relative z-10 ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <h1
          className="text-white text-center font-bold leading-[1.2] tracking-wide"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily,
            fontWeight: isBold ? 'bold' : 'normal',
            textTransform: isAllCaps ? 'uppercase' : 'none',
            textShadow: '0px 4px 40px rgba(0,0,0,1), 0px 0px 20px rgba(0,0,0,0.8)'
          }}
        >
          <span className="whitespace-pre-wrap">{lyrics}</span>
        </h1>
      </div>
    </div>
  );
}
