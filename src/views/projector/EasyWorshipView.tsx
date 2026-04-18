import { useEffect, useRef, useState } from 'react';

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'video';

export default function EasyWorshipView() {
  const [lyrics, setLyrics] = useState("");
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [videoUrl, setVideoUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const syncDataFromStorage = () => {
      const dataString = localStorage.getItem('jamc_live_display');
      if (!dataString) return;

      try {
        const data = JSON.parse(dataString);
        const newText = data.text || "";

        if (newText === lyrics) {
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

          if (newText.trim() !== "") {
            setIsVisible(true);
          }
        }, 300);

      } catch (e) {
        console.error("Sync error", e);
      }
    };

    const interval = setInterval(syncDataFromStorage, 300);
    window.addEventListener('storage', syncDataFromStorage);
    syncDataFromStorage();

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncDataFromStorage);
    };
  }, [lyrics]);

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