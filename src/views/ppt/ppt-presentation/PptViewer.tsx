import { useState, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, MonitorDot, Layers, FileText } from 'lucide-react';
import type { PptPresentationFile } from '@/App';

export default function PptViewer() {
  const { id } = useParams<{ id: string }>(); // Kuhaon ang ID gikan sa URL
  const navigate = useNavigate();
  // 🔥 Kuhaon ang presentations gikan sa App.tsx context 🔥
  const { presentations } = useOutletContext<{ presentations: PptPresentationFile[] }>(); 

  const presentation = useMemo(() => {
    return presentations.find(p => p.id === id);
  }, [id, presentations]);

  if (!presentation) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-zinc-400 dark:text-zinc-600">
        <MonitorDot className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-bold">Presentation Not Found</h2>
        <p className="text-sm">The presentation you are looking for does not exist.</p>
        <button onClick={() => navigate('/app/ppt-presentation')} className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
          Go back to Presentations
        </button>
      </div>
    );
  }

  // State para sa current slide (kung naay multiple slides from sourceText)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const slides = useMemo(() => {
    if (presentation.sourceText) {
      // Mag-split sa source text base sa double newline para sa slides
      const rawSlides = presentation.sourceText.split(/\n\s*\n/).filter(block => block.trim().length > 0);
      return rawSlides.map((slideText, index) => {
        // Simple formatting to show "label" from the first line if it exists
        const lines = slideText.split('\n');
        const firstLine = lines[0].trim();
        const headerMatch = firstLine.match(/^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Tag|Ending|Instrumental)[^\]]*\]?:?$/i);
        
        let label = headerMatch ? headerMatch[1].replace(/[\[\]:]/g, '') : `Slide ${index + 1}`;
        let content = headerMatch && lines.length > 1 ? lines.slice(1).join('\n').trim() : slideText.trim();

        return { label, content };
      });
    }
    return []; // Empty for uploaded PPT files
  }, [presentation.sourceText]);

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="animate-in fade-in duration-700 relative h-full">
      {/* HEADER / NAVIGATION */}
      <div className="flex items-center justify-between p-4 md:p-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/app/ppt-presentation')} className="p-2 md:p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-90">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 truncate max-w-50 md:max-w-md">
              {presentation.name}
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> {slides.length} Slides ({presentation.sourceText ? 'Generated' : 'Uploaded'})
            </p>
          </div>
        </div>
        
        {/* SLIDE CONTROLS (Kung naay slides) */}
        {slides.length > 0 && (
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))} 
                disabled={currentSlideIndex === 0}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{currentSlideIndex + 1} / {slides.length}</span>
            <button 
                onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))} 
                disabled={currentSlideIndex === slides.length - 1}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all"
            >
                <ChevronLeft className="w-5 h-5 rotate-180" /> {/* ChevronRight is rotated */}
            </button>
          </div>
        )}
      </div>

      {/* PRESENTATION CONTENT AREA */}
      <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center h-[calc(100vh-140px)] overflow-hidden">
        {presentation.sourceText ? (
          <div className="relative w-full max-w-4xl h-full bg-black rounded-3xl shadow-2xl flex items-center justify-center p-8 text-white text-center overflow-hidden">
            {/* Displaying the current slide */}
            <div className="text-4xl md:text-5xl font-black leading-tight whitespace-pre-wrap">
              {currentSlide ? (
                <>
                  {currentSlide.label && <span className="block text-indigo-400 text-xl md:text-2xl mb-4 uppercase">{currentSlide.label}</span>}
                  {currentSlide.content}
                </>
              ) : (
                <span className="text-zinc-500/50">No content for this slide.</span>
              )}
            </div>
            {/* Thumbnail/Preview if available */}
            {presentation.thumbnailUrl && (
                <img 
                    src={presentation.thumbnailUrl} 
                    alt="Presentation Thumbnail" 
                    className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl pointer-events-none" 
                />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 bg-white/10 rounded-3xl text-white/70 shadow-lg border border-white/5 backdrop-blur-md">
            <FileText className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Native PPT File</h2>
            <p className="text-sm text-center max-w-md">
              This is an uploaded PowerPoint file. For actual viewing and control, 
              you would typically integrate a specialized viewer (e.g., Office Web Viewer, or a backend conversion service).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}