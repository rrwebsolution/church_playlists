import { useEffect, useState } from 'react';

type BackgroundType = 'none' | 'praise' | 'worship' | 'green';

export default function EasyWorshipView() {
  const [lyrics, setLyrics] = useState(""); // Ang text nga gaka-display karon
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [isVisible, setIsVisible] = useState(false); // Tig-kontrol sa Fade animation

  useEffect(() => {
    const syncDataFromStorage = () => {
      const dataString = localStorage.getItem('jamc_live_display');
      if (!dataString) return;

      try {
        const data = JSON.parse(dataString);
        const newText = data.text || "";

        // --- ANIMATION LOGIC ---
        
        // 1. Kung ang text parehas ra sa gaka-display, i-update lang ang settings (size/bg)
        if (newText === lyrics) {
           if (data.fontSize) setFontSize(data.fontSize);
           if (data.background) setBgType(data.background);
           return;
        }

        // 2. Transition Process: Fade Out -> Change Text -> Fade In
        setIsVisible(false); // Sugod sa Fade Out

        setTimeout(() => {
          setLyrics(newText);
          if (data.fontSize) setFontSize(data.fontSize);
          if (data.background) setBgType(data.background);

          // 3. Kung naay text, i-Fade In. Kung wala (Clear), pabilin nga hide.
          if (newText.trim() !== "") {
            setIsVisible(true);
          }
        }, 300); // Hulaton ang 300ms (Fade out duration) una ilisan ang text

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
  }, [lyrics]); // I-watch ang lyrics state para sa comparison

  const getBgClass = (type: BackgroundType) => {
    if (type === 'praise') return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 animate-gradient-fast';
    if (type === 'worship') return 'bg-gradient-to-t from-black via-indigo-950 to-black animate-gradient-slow';
    if (type === 'green') return 'bg-[#00FF00]';
    return 'bg-black';
  };

  return (
    <div className={`w-screen h-screen flex flex-col justify-center items-center p-10 md:p-24 overflow-hidden select-none transition-colors duration-1000 ${getBgClass(bgType)}`}>
      
      {/* CONNECTION INDICATOR (Makita lang kung walay kanta) */}
      {!isVisible && lyrics === "" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white font-black uppercase tracking-[1em] text-xs opacity-10 animate-pulse">
                JAMC SYSTEM CONNECTED
            </p>
        </div>
      )}

      {/* LYRICS WITH SMOOTH ANIMATION */}
      <div 
        className={`transition-all duration-500 ease-in-out transform w-full max-w-[95%] flex justify-center relative z-10 ${
          isVisible 
            ? 'opacity-100 scale-100 translate-y-0' // Fade In + Normal Scale
            : 'opacity-0 scale-95 translate-y-2'    // Fade Out + Gamayng Slide
        }`}
      >
        <h1 
          className="text-white text-center font-bold leading-[1.2] tracking-wide"
          style={{ 
            fontSize: `${fontSize}px`,
            textShadow: '0px 4px 40px rgba(0,0,0,1), 0px 0px 20px rgba(0,0,0,0.8)' 
          }}
        >
          <span className="whitespace-pre-wrap">{lyrics}</span>
        </h1>
      </div>
    </div>
  );
}    