import { useCallback, useEffect, useRef, useState } from 'react';

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'video';

const API_URL = (import.meta.env.VITE_URL || 'http://localhost:3000') + '/api/obs-state';

export default function EasyWorshipView() {
  const [lyrics, setLyrics] = useState("");
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [fontFamily, setFontFamily] = useState('Oswald, sans-serif');
  const [videoUrl, setVideoUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastUpdatedAt = useRef(0);
  const lyricsRef = useRef(lyrics);
  lyricsRef.current = lyrics;

  const applyData = useCallback((data: any) => {
    if (!data || (data.updatedAt && data.updatedAt <= lastUpdatedAt.current)) return;
    if (data.updatedAt) lastUpdatedAt.current = data.updatedAt;

    const newText = data.text ?? "";

    if (newText === lyricsRef.current) {
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      return;
    }

    setIsVisible(false);
    setTimeout(() => {
      setLyrics(newText);
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
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
            textShadow: '0px 4px 40px rgba(0,0,0,1), 0px 0px 20px rgba(0,0,0,0.8)'
          }}
        >
          <span className="whitespace-pre-wrap">{lyrics}</span>
        </h1>
      </div>
    </div>
  );
}