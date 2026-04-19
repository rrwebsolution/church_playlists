import { LayoutGrid, Presentation, FileText, ChevronLeft, ChevronRight, MonitorOff, RotateCcw, Sparkles, Radio, ScanLine } from 'lucide-react';

interface Slide {
  label: string | null;
  text: string;
}

interface SlidesProps {
  slides: Slide[];
  liveSlideIndex: number | null;
  isBlackout: boolean;
  onSlideClick: (text: string, index: number) => void;
  onBlackoutToggle: () => void;
  isOutputCleared: boolean;
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

export const EasyWorshipSlides = ({
  slides,
  liveSlideIndex,
  isBlackout,
  onSlideClick,
  onBlackoutToggle,
  isOutputCleared
}: SlidesProps) => {
  const handlePrevNext = (direction: 'prev' | 'next') => {
    if (slides.length === 0) return;

    const currentIndex = liveSlideIndex ?? -1;
    const nextIndex =
      direction === 'next'
        ? currentIndex >= slides.length - 1 ? 0 : currentIndex + 1
        : currentIndex <= 0 ? slides.length - 1 : currentIndex - 1;

    if (slides[nextIndex]) {
      onSlideClick(slides[nextIndex].text, nextIndex);
    }
  };

  const activeSlide = liveSlideIndex !== null ? slides[liveSlideIndex] : null;

  return (
    <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-[3rem] p-8 shadow-2xl min-h-150 flex flex-col">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-8 px-2">
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3 rounded-[1.6rem] border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50 px-4 py-3 min-w-0">
            <div className={`p-2 rounded-xl ${activeSlide && !isBlackout ? 'bg-red-500/10 text-red-500' : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'}`}>
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Live Queue</p>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">
                {activeSlide && !isBlackout ? `Slide ${liveSlideIndex! + 1}: ${activeSlide.label || 'Lyrics'}` : 'No live slide selected'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBlackoutToggle}
              className={`p-3 rounded-full font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border ${
                isOutputCleared
                  ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30 animate-pulse'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
              title={isOutputCleared ? 'Restore Lyrics' : 'Clear Output'}
            >
              {isOutputCleared ? <RotateCcw className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
            </button>

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 px-2">
        <div className="rounded-[1.8rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Slide Bank</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{slides.length} ready</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.8rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${activeSlide && !isBlackout ? 'bg-red-500/10 text-red-500' : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'}`}>
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">On Air</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{activeSlide && !isBlackout ? `Slide ${liveSlideIndex! + 1}` : 'Standby'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.8rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isOutputCleared ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Screen State</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{isOutputCleared ? 'Blackout' : 'Visible'}</p>
            </div>
          </div>
        </div>
      </div>

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
            const previewLineCount = slide.text.split('\n').filter(Boolean).length;
            const previewCharCount = slide.text.length;

            return (
              <button
                key={index}
                onClick={() => onSlideClick(slide.text, index)}
                className={`text-left p-5 rounded-[2rem] border transition-all duration-500 group relative flex items-center gap-4 min-h-34 overflow-hidden ${
                  isLive
                    ? 'border-red-500 bg-red-50/80 dark:bg-red-900/20 ring-4 ring-red-500/20 scale-[1.02] z-10 shadow-2xl shadow-red-500/20'
                    : `${labelColors} hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1`
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 transition-all duration-300 ${isLive ? 'bg-red-500' : 'bg-transparent group-hover:bg-indigo-400/60'}`} />

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

                <div className="flex-1 w-full z-10 pr-2">
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      isLive ? 'bg-red-500 text-white' : 'bg-zinc-900/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      Slide {index + 1}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      {previewLineCount} lines
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      {previewCharCount} chars
                    </span>
                  </div>
                  <p className={`whitespace-pre-wrap wrap-break-word tracking-tight transition-colors duration-300 ${
                    isLive ? 'text-red-950 dark:text-red-300 font-bold' : 'text-zinc-600 dark:text-zinc-300'
                  } ${getFontSizeClass(slide.text)}`}>
                    {slide.text}
                  </p>
                </div>

                <span className={`absolute right-2 bottom-0 text-[4.5rem] font-black italic select-none pointer-events-none transition-all duration-500 z-0 ${
                  isLive ? 'text-red-300/20 translate-y-2' : 'text-zinc-800/5 dark:text-white/5 group-hover:text-indigo-500/10'
                }`}>
                  {index + 1}
                </span>

                {isLive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-full shadow-lg z-20">
                    <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
                    <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
