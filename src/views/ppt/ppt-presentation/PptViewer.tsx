import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, MonitorDot, Layers, FileText, ChevronRight } from 'lucide-react';
import type { PptPresentationFile } from '@/App';
import { PPT_TEMPLATES } from '../Pptpresenatation'; 
import { deserializeSlides } from '@/lib/ppt';
import { PresentationSlideCanvas, PRESENTATION_CANVAS_OVERLAY_CLASS } from '../components/PresentationSlideCanvas';

export default function PptViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { presentations } = useOutletContext<{ presentations: PptPresentationFile[] }>(); 

  const presentation = useMemo(() => {
    return presentations.find(p => p.id === id);
  }, [id, presentations]);

  const template = useMemo(() => {
    if (!presentation?.templateId) return PPT_TEMPLATES[0];
    return PPT_TEMPLATES.find(t => t.id === presentation.templateId) || PPT_TEMPLATES[0];
  }, [presentation]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const slides = useMemo(() => {
    if (presentation?.sourceText || presentation?.slideData) {
      return deserializeSlides(presentation.slideData, presentation.sourceText);
    }
    return [];
  }, [presentation?.slideData, presentation?.sourceText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        navigate('/app/ppt-presentation');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, navigate]);

  if (!presentation) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-zinc-400 dark:text-zinc-600">
        <MonitorDot className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-bold">Presentation Not Found</h2>
        <button onClick={() => navigate('/app/ppt-presentation')} className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
          Go back
        </button>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className={`animate-in fade-in duration-1000 relative h-screen flex flex-col overflow-hidden transition-all ${template.bg}`}>
      
      {/* HEADER / NAVIGATION */}
      <div className="flex items-center justify-between p-4 md:p-6 bg-black/20 backdrop-blur-md border-b border-white/10 z-50">
        <div className="flex items-center gap-4 text-white">
          <button 
            onClick={() => navigate('/app/ppt-presentation')} 
            className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tight drop-shadow-md">
              {presentation.name}
            </h1>
            <div className="flex items-center gap-3 text-white/50 text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {slides.length} Slides</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-white/80">{template.name}</span>
            </div>
          </div>
        </div>
        
        {/* SLIDE CONTROLS */}
        {slides.length > 0 && (
          <div className="flex items-center gap-4 bg-black/30 px-4 py-2 rounded-full border border-white/10">
            <button 
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))} 
                disabled={currentSlideIndex === 0}
                className="p-2 text-white/60 hover:text-white disabled:opacity-20 transition-all"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-sm font-black text-white min-w-15 text-center tracking-tighter">
                {currentSlideIndex + 1} / {slides.length}
            </span>
            <button 
                onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))} 
                disabled={currentSlideIndex === slides.length - 1}
                className="p-2 text-white/60 hover:text-white disabled:opacity-20 transition-all"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* PRESENTATION CONTENT AREA */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        {presentation.backgroundImageUrl && (
          <img
            src={presentation.backgroundImageUrl}
            alt="Presentation background"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className={`${PRESENTATION_CANVAS_OVERLAY_CLASS} ${presentation.backgroundImageUrl ? 'bg-black/25' : 'bg-transparent'}`} />
        
        {presentation.sourceText ? (
          <div className={`w-full h-full flex flex-col items-center justify-center p-6 md:p-10 text-center relative transition-all duration-500 ${template.text} ${template.font}`}>
            <PresentationSlideCanvas
              slide={currentSlide}
              template={template}
              backgroundImageUrl={presentation.backgroundImageUrl}
              className="relative z-10 w-full max-w-6xl mx-auto animate-in zoom-in-95 fade-in duration-500 rounded-[2rem]"
              frameClassName="rounded-[2rem]"
              fontScale={1}
            />

            <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none">
                <MonitorDot className="w-32 h-32 text-current" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-white/5 rounded-[3rem] text-white/50 border border-white/10 backdrop-blur-xl shadow-2xl">
            <FileText className="w-20 h-20 mb-6 opacity-20" />
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Native PowerPoint</h2>
            <p className="text-sm text-center max-w-md font-medium leading-relaxed">
              This presentation was uploaded as a file. Use a dedicated PPT viewer or screen sharing.
            </p>
          </div>
        )}
      </div>

      {/* PROGRESS BAR (Bottom) */}
      {slides.length > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
              />
          </div>
      )}
    </div>
  );
}
