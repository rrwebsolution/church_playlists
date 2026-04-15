import { useEffect, useState } from 'react';

type BackgroundType = 'none' | 'praise' | 'worship';

export default function EasyWorshipView() {
  const [lyrics, setLyrics] = useState("");
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // FUNCTION ARON MA-UPDATE ANG DISPLAY GIKAN SA STORAGE
    const updateFromStorage = () => {
      const dataString = localStorage.getItem('jamc_live_display');
      if (!dataString) return;

      try {
        const data = JSON.parse(dataString);
        
        // 1. I-set ang Font Size
        if (data.fontSize) setFontSize(data.fontSize);
        
        // 2. I-set ang Background Type
        if (data.background) setBgType(data.background);

        // 3. I-set ang Lyrics ug visibility logic
        if (data.text && data.text.trim() !== "") {
          setLyrics(data.text);
          setIsVisible(true);
        } else {
          // Fade out una una ayha papason ang text para smooth
          setIsVisible(false);
          setTimeout(() => setLyrics(""), 500); 
        }
      } catch (e) {
        console.error("Error parsing sync data:", e);
      }
    };

    // MAMINAW SA STORAGE CHANGES (Kini ang mo-work sa OBS Studio)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jamc_live_display') {
        updateFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // I-check ang data inig load sa page (Initial check)
    updateFromStorage();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Mapper para sa Background Animations
  const getBgClass = (type: BackgroundType) => {
    if (type === 'praise') return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 animate-gradient-fast';
    if (type === 'worship') return 'bg-gradient-to-t from-black via-indigo-950 to-black animate-gradient-slow';
    return 'bg-black'; // OBS needs solid black for Luma Key transparency
  };

  return (
    <div className={`w-screen h-screen flex flex-col justify-center items-center p-10 md:p-24 overflow-hidden select-none transition-colors duration-1000 ${getBgClass(bgType)}`}>
      
      {/* DEBUG INDICATOR (Makita lang kung walay signal/text) */}
      {!isVisible && !lyrics && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-zinc-900 font-black uppercase tracking-[0.5em] text-2xl opacity-20">
                Ready for Signal
            </p>
        </div>
      )}

      {/* LYRICS RENDERER */}
      <div 
        className={`transition-all duration-700 ease-in-out transform w-full max-w-[95%] flex justify-center relative z-10 ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10'
        }`}
      >
        <h1 
          className="text-white text-center font-bold leading-[1.2] tracking-wide"
          style={{ 
            fontSize: `${fontSize}px`,
            // Baga nga shadow para mabasa bisag hayag ang video sa luyo
            textShadow: '0px 4px 40px rgba(0,0,0,1), 0px 0px 20px rgba(0,0,0,0.8)' 
          }}
        >
          <span className="whitespace-pre-wrap">{lyrics}</span>
        </h1>
      </div>

    </div>
  );
}