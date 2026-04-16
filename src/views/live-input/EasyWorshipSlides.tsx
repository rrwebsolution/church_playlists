import { LayoutGrid, Presentation } from 'lucide-react';

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

export const EasyWorshipSlides = ({ slides, liveSlideIndex, isBlackout, onSlideClick }: SlidesProps) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-7 shadow-sm min-h-150 flex flex-col">
      <div className="flex justify-between items-center mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg"><LayoutGrid className="w-5 h-5 text-indigo-600" /></div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-200">Quick Slides</h2>
        </div>
        {/* {!showMonitor && (
          <button onClick={onShowMonitor} className="text-[10px] font-black uppercase text-indigo-500 hover:underline tracking-widest">Show Monitor</button>
        )} */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-163 overflow-y-auto custom-scrollbar p-2">
        {slides.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-center opacity-30">
            <Presentation className="w-12 h-12 text-zinc-400 mb-4" />
            <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Editor is empty</p>
          </div>
        ) : (
          slides.map((slide, index) => {
            const isLive = liveSlideIndex === index && !isBlackout;
            return (
              <button
                key={index}
                onClick={() => onSlideClick(slide.text, index)}
                className={`text-left p-6 rounded-[2rem] border-2 transition-all group relative flex flex-col items-start min-h-38 ${
                  isLive 
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-500/10 ring-4 ring-red-500/10 scale-[1.03] z-10 shadow-2xl' 
                    : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 hover:border-indigo-400 hover:bg-white transition-all hover:shadow-xl'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-4">
                  {slide.label ? (
                    <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm bg-indigo-500 text-white">
                      {slide.label}
                    </span>
                  ) : <span className="h-6"></span>}
                  
                  {isLive && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse shadow-lg">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                    </div>
                  )}
                </div>
                
                <p className={`whitespace-pre-wrap text-[15px] md:text-[16px] font-bold leading-relaxed tracking-tight ${isLive ? 'text-red-900 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {slide.text}
                </p>
                <span className="absolute bottom-3 right-5 text-[45px] font-black text-black/4 dark:text-white/4 italic select-none">{index + 1}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  );
};