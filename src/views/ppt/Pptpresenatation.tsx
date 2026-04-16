import React, { useState, useMemo, useRef } from 'react';
import { 
  UploadCloud, Presentation, FileText,
  Search, Trash2, X, CalendarDays,
  Layers, MonitorDot, PlusCircle
} from 'lucide-react'; 
import Swal from 'sweetalert2';
import { useNavigate, useOutletContext } from 'react-router-dom'; // 🔥 Gidugang ang useNavigate ug useOutletContext

// Import ang type gikan sa App.tsx
import type { PptPresentationFile } from '../../App'; 

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  customClass: { container: 'z-[99999]' }
});

// HELPER FUNCTION PARA MAG-KATEGORYA BASE SA ORAS UG MAG-SORT (LATEST FIRST)
const categorizeByTime = <T extends { id: string; uploadedAt: string }>(items: T[]) => {
  const groups: Record<string, T[]> = {
    'Today': [],
    'This Week': [],
    'This Month':[],
    'Older':[]
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const thisWeekStart = todayStart - (7 * oneDay);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const sortedItems = [...items].sort((a, b) => {
    const timeA = new Date(a.uploadedAt).getTime();
    const timeB = new Date(b.uploadedAt).getTime();
    return timeB - timeA;
  });

  sortedItems.forEach(item => {
    const time = new Date(item.uploadedAt).getTime();
    
    if (time >= todayStart) {
      groups['Today'].push(item);
    } else if (time >= thisWeekStart) {
      groups['This Week'].push(item);
    } else if (time >= thisMonthStart) {
      groups['This Month'].push(item);
    } else {
      groups['Older'].push(item);
    }
  });

  return groups;
};

// HELPER PARA SA FORMAT SA PETSA
const formatUploadedDate = (dateString: string) => {
  if (!dateString) return "Unknown Date";
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// HELPER FUNCTION PARA MAG-CONVERT OG TEXT NGADTO SA MOCK SLIDES
const generateMockSlidesFromText = (text: string): { title: string; slides: string[] } => {
  const blocks = text.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  const slides: string[] = [];
  let defaultTitle = "Generated Presentation";

  blocks.forEach((block, index) => {
    let lines = block.trim().split('\n');
    let label = `Slide ${index + 1}`;
    const firstLine = lines[0].trim();

    const headerMatch = firstLine.match(/^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Tag|Ending|Instrumental)[^\]]*\]?:?$/i);
    if (headerMatch) {
        label = headerMatch[1].replace(/[\[\]:]/g, '');
        if (lines.length > 1) {
            lines = lines.slice(1);
        } else {
            lines = [];
        }
    }
    slides.push(`${label}\n${lines.join('\n').trim()}`);
  });

  if (blocks.length > 0 && !blocks[0].trim().match(/^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Tag|Ending|Instrumental)[^\]]*\]?:?$/i)) {
      defaultTitle = blocks[0].trim().split('\n')[0].substring(0, 50);
  }

  return { title: defaultTitle, slides };
};


export default function Pptpresenatation() {
  // 🔥 Kuhaon ang presentations state gikan sa App.tsx context 🔥
  const { presentations, setPresentations } = useOutletContext<{ 
    presentations: PptPresentationFile[], 
    setPresentations: React.Dispatch<React.SetStateAction<PptPresentationFile[]>> 
  }>();

  const navigate = useNavigate(); // Initialize useNavigate
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [generateTitle, setGenerateTitle] = useState('');
  const [generateText, setGenerateText] = useState('');

  const presentationListRef = useRef<HTMLDivElement>(null);

  // useEffect(() => { // 🔥 Dili na kinahanglan kini nga useEffect kay naa na sa App.tsx
  //   localStorage.setItem('jamc_ppt_presentations', JSON.stringify(presentations));
  // }, [presentations]);

  const filteredAndCategorizedPresentations = useMemo(() => {
    let filtered = presentations.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return categorizeByTime(filtered);
  }, [presentations, searchQuery]);

  const hasSearchResults = useMemo(() => {
    return Object.values(filteredAndCategorizedPresentations).some(group => group.length > 0);
  }, [filteredAndCategorizedPresentations]);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newPresentation: PptPresentationFile = {
        id: Date.now().toString(),
        name: file.name.replace(/\.(pptx|ppt)$/i, ''),
        slidesCount: Math.floor(Math.random() * 20) + 10, 
        uploadedAt: new Date().toISOString(),
        thumbnailUrl: 'https://via.placeholder.com/150/4f46e5/ffffff?text=PPT_UPLOAD' 
      };
      setPresentations(prev => [newPresentation, ...prev]);
      Toast.fire({ icon: 'success', title: 'PPT Uploaded!' });
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; 
      }
      setTimeout(() => {
        presentationListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); 
    }
  };

  const handleGenerateSlides = () => {
    if (!generateText.trim()) {
        Swal.fire({ icon: 'warning', title: 'Editor Empty', text: 'Please paste some lyrics or text to generate slides.' });
        return;
    }

    const { title, slides } = generateMockSlidesFromText(generateText);

    const newPresentation: PptPresentationFile = {
        id: Date.now().toString(),
        name: generateTitle.trim() || title,
        slidesCount: slides.length,
        uploadedAt: new Date().toISOString(),
        thumbnailUrl: 'https://via.placeholder.com/150/4f46e5/ffffff?text=PPT_TEXT',
        sourceText: generateText,
    };
    setPresentations(prev => [newPresentation, ...prev]);
    
    setGenerateTitle('');
    setGenerateText('');

    Toast.fire({ icon: 'success', title: 'Slides Generated!' });
    setTimeout(() => {
      presentationListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };


  const handleDeletePresentation = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Delete Presentation?',
      text: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      setPresentations(prev => prev.filter(p => p.id !== id));
      Toast.fire({ icon: 'success', title: 'Presentation deleted!' });
    }
  };

  // 🔥 GI-UPDATE: Mo-navigate na sa PptViewer.tsx 🔥
  const handleOpenPresentation = (presentation: PptPresentationFile) => {
    navigate(`/app/ppt-presentation/${presentation.id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen font-sans bg-zinc-50 dark:bg-zinc-950">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-6 px-2">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-purple-500 text-white rounded-3xl shadow-xl shadow-purple-500/20">
            <MonitorDot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tighter">
              PPT Presentation
            </h1>
            <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-none mt-2">
              Manage and Broadcast PowerPoint Files
            </p>
          </div>
        </div>

        {/* UPLOAD BUTTON */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-7 py-4 bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all"
        >
          <UploadCloud className="w-4 h-4" /> Upload New PPT
          <input 
            type="file" 
            accept=".ppt,.pptx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-10">
        
        {/* LEFT SIDE: TEXT-BASED SLIDES GENERATOR */}
        <div className="lg:col-span-1 p-8 rounded-[2rem] bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-white/5 shadow-lg backdrop-blur-md flex flex-col justify-start min-h-100">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Generate from Text
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mb-6">
                Paste your lyrics or text below to quickly create presentation slides.
            </p>

            <input
                type="text"
                value={generateTitle}
                onChange={(e) => setGenerateTitle(e.target.value)}
                placeholder="Presentation Title (optional)"
                className="w-full px-5 py-3 bg-zinc-50 dark:bg-black/40 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl outline-none text-zinc-900 dark:text-zinc-100 font-semibold text-sm placeholder:font-medium placeholder:text-zinc-400 focus:border-indigo-500/50 transition-all mb-4"
            />
            <textarea
                value={generateText}
                onChange={(e) => setGenerateText(e.target.value)}
                placeholder="Paste lyrics or text here... Use double-enter for new slides."
                className="w-full flex-1 h-auto p-5 bg-zinc-50 dark:bg-black/40 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl outline-none text-zinc-800 dark:text-zinc-100 font-semibold text-sm resize-none custom-scrollbar leading-relaxed focus:border-indigo-500/50 transition-all mb-4"
            />
            <button
                onClick={handleGenerateSlides}
                className="flex items-center justify-center gap-2 px-7 py-3.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            >
                <PlusCircle className="w-4 h-4" /> Generate Slides
            </button>
        </div>


        {/* RIGHT SIDE: SEARCH AND PRESENTATION LIST */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Bar */}
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presentations..."
              className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none focus:border-indigo-500/50 text-sm font-semibold transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Presentation List (Categorized) */}
          {presentations.length === 0 ? (
            <div className="py-20 text-center opacity-40 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
              <Presentation className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No presentations uploaded yet</p>
            </div>
          ) : !hasSearchResults && searchQuery !== '' ? (
            <div className="py-20 text-center opacity-40 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
              <Search className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No matching presentations</p>
            </div>
          ) : (
            <div ref={presentationListRef} className="space-y-12">
              {Object.entries(filteredAndCategorizedPresentations).map(([label, groupPresentations]) => {
                if (groupPresentations.length === 0) return null;
                return (
                  <div key={label} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 mb-6 px-2">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <CalendarDays className="w-5 h-5" />
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-widest">{label}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-zinc-200/50 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500">{groupPresentations.length}</span>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-800/50 flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                      {groupPresentations.map((presentation) => (
                        <div 
                          key={presentation.id} 
                          className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative cursor-pointer overflow-hidden"
                          onClick={() => handleOpenPresentation(presentation)} // 🔥 Ang onClick kay mo-navigate na!
                        >
                          <div className="flex justify-between items-start mb-4">
                            {presentation.thumbnailUrl ? (
                              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                                <img src={presentation.thumbnailUrl} alt={presentation.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                                <Presentation className="w-8 h-8" />
                              </div>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeletePresentation(presentation.id, presentation.name); }} 
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                              title="Delete Presentation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg">{presentation.name}</h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                              <Layers className="w-3 h-3" /> {presentation.slidesCount} Slides
                            </p>
                            <p className="text-[8px] text-zinc-500/70 dark:text-zinc-500 font-bold uppercase tracking-widest">
                              Uploaded: {formatUploadedDate(presentation.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}