import { LayoutGrid, Presentation, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  label: string | null;
  text: string;
}

interface SlidesProps {
  slides: Slide[];
  liveSlideIndex: number | null;
  isBlackout: boolean;
  onSlideClick: (text: string, index: number) => void;
  onShowMonitor: () => void;
  showMonitor: boolean;
}

const getFontSizeClass = (text: string): string => {
  const lineCount = text.split('\n').length;
  const charCount = text.length;

  if (lineCount >= 8 || charCount > 250) return 'text-[9px] leading-tight'; 
  if (lineCount >= 6 || charCount > 180) return 'text-[11px] leading-tight'; 
  if (lineCount >= 4 || charCount > 120) return 'text-[12px] leading-snug';
  if (charCount < 60 && lineCount <= 2) return 'text-[16px] leading-tight font-bold'; 
  return 'text-[14px] leading-snug'; 
};

const getLabelBasedColors = (label: string | null): string => {
  const lowerLabel = label?.toLowerCase() || '';
  
  if (lowerLabel.includes('chorus')) {
    return 'bg-indigo-50/70 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/60';
  }
  if (lowerLabel.includes('verse')) {
    return 'bg-blue-50/70 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/60';
  }
  if (lowerLabel.includes('bridge') || lowerLabel.includes('tag')) {
    return 'bg-purple-50/70 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/60';
  }
  if (lowerLabel.includes('pre-chorus') || lowerLabel.includes('intro') || lowerLabel.includes('outro')) {
    return 'bg-sky-50/70 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800/60';
  }
  return 'bg-white/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-white/10';
};


export const EasyWorshipSlides = ({ slides, liveSlideIndex, isBlackout, onSlideClick }: SlidesProps) => {
  
  // 🔥 LOGIC PARA SA PREV/NEXT BUTTONS 🔥
  const handlePrevNext = (direction: 'prev' | 'next') => {
    if (slides.length === 0) return;
    
    let currentIndex = liveSlideIndex ?? -1;
    let nextIndex;

    if (direction === 'next') {
      nextIndex = currentIndex >= slides.length - 1 ? 0 : currentIndex + 1;
    } else { // prev
      nextIndex = currentIndex <= 0 ? slides.length - 1 : currentIndex - 1;
    }

    if (slides[nextIndex]) {
      onSlideClick(slides[nextIndex].text, nextIndex);
    }
  };


  return (
    <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-[3rem] p-8 shadow-2xl min-h-150 flex flex-col">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-8 px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/40">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-100">
              Quick Slides
            </h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Select a slide to broadcast</p>
          </div>
        </div>

        {/* 🔥 BAG-ONG PREV/NEXT BUTTONS 🔥 */}
        <div className="flex items-center gap-2">
            <button 
                onClick={() => handlePrevNext('prev')}
                disabled={slides.length === 0}
                className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
                onClick={() => handlePrevNext('next')}
                disabled={slides.length === 0}
                className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-160 overflow-y-auto custom-scrollbar p-2">
        {slides.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-center opacity-40">
            <Presentation className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Editor is empty</p>
          </div>
        ) : (
          slides.map((slide, index) => {
            const isLive = liveSlideIndex === index && !isBlackout;
            const labelColors = getLabelBasedColors(slide.label);

            return (
              <button
                key={index}
                onClick={() => onSlideClick(slide.text, index)}
                className={`text-left p-5 rounded-[2rem] border transition-all duration-500 group relative flex items-center gap-4 min-h-34 overflow-hidden ${
                  isLive 
                    ? 'border-red-500 bg-red-50/80 dark:bg-red-900/20 ring-4 ring-red-500/20 scale-[1.02] z-10 shadow-2xl shadow-red-500/20' 
                    : `${labelColors} hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 transition-all`
                }`}
              >
                {/* LEFT-SIDE: Elegant Badge */}
                <div className="flex items-center justify-center min-w-14 text-center shrink-0 z-10">
                  {slide.label ? (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                      isLive 
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/40' 
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}>
                      {slide.label}
                    </span>
                  ) : (
                    <div className={`p-2 rounded-xl transition-all duration-300 ${
                      isLive ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                {/* SLIDE TEXT CONTENT */}
                <div className="flex-1 w-full z-10 pr-2">
                  <p className={`whitespace-pre-wrap wrap-break-word tracking-tight transition-colors duration-300 ${
                    isLive ? 'text-red-950 dark:text-red-300 font-bold' : 'text-zinc-600 dark:text-zinc-300'
                  } ${getFontSizeClass(slide.text)}`}>
                    {slide.text}
                  </p>
                </div>

                {/* RIGHT-SIDE: Stylized Watermark */}
                <span className={`absolute right-2 bottom-0 text-[4.5rem] font-black italic select-none pointer-events-none transition-all duration-500 z-0 ${
                    isLive 
                      ? 'text-red-300/20 translate-y-2'
                      : 'text-zinc-800/5 dark:text-white/5 group-hover:text-indigo-500/10'
                }`}>
                  {index + 1}
                </span>

                {/* LIVE PULSE INDICATOR */}
                {isLive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-full shadow-lg z-20">
                    <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
                    <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live</span>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  );
};