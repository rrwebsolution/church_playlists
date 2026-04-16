import { useState, useMemo, useRef } from 'react';
import { 
  UploadCloud, Presentation, Search, Trash2, CalendarDays,
  Layers, MonitorDot, PlusCircle, Sparkles, 
  Edit3, MoreVertical, LayoutPanelLeft, Check
} from 'lucide-react'; 
import Swal from 'sweetalert2';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { PptPresentationFile } from '../../App'; 

export const PPT_TEMPLATES = [
  { id: 'classic-dark', name: 'Classic Dark', bg: 'bg-zinc-950', text: 'text-white', accent: 'text-indigo-400', font: 'font-sans' },
  { id: 'modern-light', name: 'Modern Light', bg: 'bg-zinc-50', text: 'text-zinc-900', accent: 'text-indigo-600', font: 'font-sans' },
  { id: 'worship-blue', name: 'Worship Night', bg: 'bg-linear-to-br from-indigo-900 via-blue-900 to-black', text: 'text-white', accent: 'text-sky-300', font: 'font-serif' },
  { id: 'sunset-gradient', name: 'Deep Sunset', bg: 'bg-linear-to-br from-orange-900 via-red-900 to-zinc-950', text: 'text-orange-50', accent: 'text-yellow-400', font: 'font-sans' },
  { id: 'minimal-green', name: 'Nature Clean', bg: 'bg-emerald-950', text: 'text-emerald-50', accent: 'text-emerald-400', font: 'font-serif' },
  { id: 'royal-purple', name: 'Royal Majesty', bg: 'bg-linear-to-tr from-purple-900 to-indigo-950', text: 'text-purple-50', accent: 'text-fuchsia-400', font: 'font-sans' },
];

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true,
});

const categorizeByTime = <T extends { id: string; uploadedAt: string }>(items: T[]) => {
  const groups: Record<string, T[]> = { 'Today': [], 'This Week': [], 'This Month':[], 'Older':[] };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const thisWeekStart = todayStart - (7 * oneDay);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const sortedItems = [...items].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  sortedItems.forEach(item => {
    const time = new Date(item.uploadedAt).getTime();
    if (time >= todayStart) groups['Today'].push(item);
    else if (time >= thisWeekStart) groups['This Week'].push(item);
    else if (time >= thisMonthStart) groups['This Month'].push(item);
    else groups['Older'].push(item);
  });
  return groups;
};

interface SlideContent { id: number; text: string; }

export default function Pptpresenatation() {
  const { presentations, setPresentations } = useOutletContext<any>();
  const navigate = useNavigate(); 
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presentationListRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // EDITOR STATES
  const [generateTitle, setGenerateTitle] = useState('');
  const [slidesToGenerate, setSlidesToGenerate] = useState<SlideContent[]>([{ id: Date.now(), text: '' }]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(PPT_TEMPLATES[0].id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const filteredAndCategorizedPresentations = useMemo(() => {
    let filtered = presentations.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return categorizeByTime(filtered);
  }, [presentations, searchQuery]);

  // 🔥 CHECK KUNG NAA BAY RESULTA SA SEARCH 🔥
  const hasSearchResults = useMemo(() => {
      return Object.values(filteredAndCategorizedPresentations).some(group => group.length > 0);
  }, [filteredAndCategorizedPresentations]);

  const handleEditSlides = (p: PptPresentationFile) => {
    setActiveMenuId(null);
    setEditingId(p.id);
    setGenerateTitle(p.name);
    setSelectedTemplateId(p.templateId || PPT_TEMPLATES[0].id);
    if (p.sourceText) {
      const rawBlocks = p.sourceText.split(/\n\s*\n/).filter(b => b.trim() !== '');
      setSlidesToGenerate(rawBlocks.map((text, i) => ({ id: Date.now() + i, text: text.replace(/\u200B/g, '') })));
    }
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRenameClick = (p: PptPresentationFile) => {
    setActiveMenuId(null);
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const handleSaveRename = (id: string) => {
    if (!renameValue.trim()) return;
    setPresentations((prev: any) => prev.map((p: any) => p.id === id ? { ...p, name: renameValue.trim() } : p));
    setRenamingId(null);
    Toast.fire({ icon: 'success', title: 'Renamed!' });
  };

  const handleGenerateSlides = () => {
    const validSlides = slidesToGenerate.filter(s => s.text.trim() !== '');
    if (validSlides.length === 0) return;
    const combinedText = validSlides.map(s => s.text.trim().replace(/\n[ \t]*\n/g, '\n\u200B\n')).join('\n\n');
    let finalTitle = generateTitle.trim() || validSlides[0].text.split('\n')[0].substring(0, 40);

    const presentationData = {
        id: editingId || Date.now().toString(),
        name: finalTitle,
        slidesCount: validSlides.length,
        uploadedAt: new Date().toISOString(),
        thumbnailUrl: 'https://via.placeholder.com/150/4f46e5/ffffff?text=PPT',
        sourceText: combinedText,
        templateId: selectedTemplateId,
    };

    if (editingId) {
      setPresentations((prev: any) => prev.map((p: any) => p.id === editingId ? presentationData : p));
      Toast.fire({ icon: 'success', title: 'Presentation Updated!' });
    } else {
      setPresentations((prev: any) => [presentationData, ...prev]);
      Toast.fire({ icon: 'success', title: 'Slides Generated!' });
    }
    setEditingId(null);
    setGenerateTitle('');
    setSlidesToGenerate([{ id: Date.now(), text: '' }]);
  };

  const handleDelete = async (p: PptPresentationFile) => {
    setActiveMenuId(null);
    const result = await Swal.fire({
      title: 'Delete?', text: `Delete "${p.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444'
    });
    if (result.isConfirmed) {
      setPresentations((prev: any) => prev.filter((item: any) => item.id !== p.id));
      Toast.fire({ icon: 'success', title: 'Deleted' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-6 px-2">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-purple-500 text-white rounded-3xl shadow-xl shadow-purple-500/20"><MonitorDot className="w-8 h-8" /></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tighter">PPT Presentation</h1>
            <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-none mt-2">Manage PowerPoint & Text Slides</p>
          </div>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-7 py-4 bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all">
          <UploadCloud className="w-4 h-4" /> Upload PPT
          <input type="file" accept=".ppt,.pptx" ref={fileInputRef} onChange={() => {}} className="hidden" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-10">
        
        {/* EDITOR (LEFT) */}
        <div ref={editorRef} className={`lg:col-span-1 p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-white/5 shadow-lg backdrop-blur-md flex flex-col justify-start min-h-160 transition-all ${editingId ? 'ring-2 ring-indigo-500' : ''}`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {editingId ? <Sparkles className="w-5 h-5 text-amber-500" /> : <PlusCircle className="w-5 h-5 text-indigo-500" />}
                    {editingId ? 'Update Slides' : 'Create Slides'}
                </h3>
                {editingId && <button onClick={() => {setEditingId(null); setGenerateTitle(''); setSlidesToGenerate([{ id: Date.now(), text: '' }]);}} className="text-[10px] font-bold text-red-500 uppercase border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-all">Cancel Edit</button>}
            </div>
            
            <div className="mb-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">Template Style</label>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {PPT_TEMPLATES.map((tpl) => (
                        <button key={tpl.id} onClick={() => setSelectedTemplateId(tpl.id)} className={`shrink-0 p-1 rounded-2xl border-2 transition-all ${selectedTemplateId === tpl.id ? 'border-indigo-500 scale-105' : 'border-transparent opacity-50'}`}>
                            <div className={`w-16 h-10 rounded-xl ${tpl.bg} border border-white/10`} />
                        </button>
                    ))}
                </div>
            </div>

            <input type="text" value={generateTitle} onChange={(e) => setGenerateTitle(e.target.value)} placeholder="Presentation Title..." className="w-full px-5 py-3.5 bg-white dark:bg-black/40 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-zinc-900 dark:text-zinc-100 font-bold focus:border-indigo-500/50 mb-6 transition-all" />
            
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 mb-4 max-h-120">
              {slidesToGenerate.map((slide, index) => (
                <div key={slide.id} className="flex items-start gap-3 relative group/slide animate-in fade-in slide-in-from-bottom-2">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-black text-zinc-400">{index + 1}</div>
                  <textarea 
                    value={slide.text} 
                    onChange={(e) => setSlidesToGenerate(prev => prev.map(s => s.id === slide.id ? { ...s, text: e.target.value } : s))} 
                    // 🔥 GI-UPDATE NGA PLACEHOLDER PARA SA PPT PRESENTATION 🔥
                    placeholder={`Slide ${index + 1} Content...\n\nExample:\nMain Heading or Title\n- Key point or sub-topic 1\n- Key point or sub-topic 2\n- Supporting text or scripture`} 
                    className="w-full min-h-60 p-5 bg-white dark:bg-black/40 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-zinc-800 dark:text-zinc-100 font-semibold focus:border-indigo-500/50 transition-all leading-relaxed shadow-sm" 
                    />
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <button onClick={() => setSlidesToGenerate(prev =>[...prev, { id: Date.now(), text: '' }])} className="flex items-center justify-center gap-2 px-4 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl text-[11px] font-bold uppercase hover:bg-zinc-200 transition-all"><PlusCircle className="w-5 h-5" /> Add Slide</button>
              <button onClick={handleGenerateSlides} className="flex items-center justify-center gap-2 px-7 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">{editingId ? 'Update Slides' : 'Generate Slides'}</button>
            </div>
        </div>

        {/* LIBRARY (RIGHT) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search presentations..." className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-sm font-semibold transition-all shadow-sm" />
          </div>

          {/* 🔥 DYNAMIC LIST WITH SEARCH STATES 🔥 */}
          <div ref={presentationListRef} className="space-y-12">
            {presentations.length === 0 ? (
               // State 1: Wala pa jud na upload
              <div className="py-20 text-center opacity-40 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
                <Presentation className="w-12 h-12 mx-auto mb-4 text-zinc-400" /><p className="font-black uppercase tracking-widest text-xs text-zinc-500">No presentations yet</p>
              </div>
            ) : !hasSearchResults && searchQuery !== '' ? (
              // 🔥 State 2: Naay gi-search pero walay ni-match 🔥
              <div className="py-20 text-center opacity-40 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] animate-in fade-in zoom-in-95">
                <Search className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                <p className="font-black uppercase tracking-widest text-xs text-zinc-500">No matching presentations found</p>
                <button onClick={() => setSearchQuery('')} className="mt-4 text-[10px] font-bold text-indigo-500 uppercase hover:underline">Clear search query</button>
              </div>
            ) : (
              // State 3: I-pakita ang mga results
              Object.entries(filteredAndCategorizedPresentations).map(([label, groupPresentations]) => (
                groupPresentations.length > 0 && (
                  <div key={label} className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-4 mb-6 px-2">
                      <CalendarDays className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-black uppercase tracking-widest">{label}</h3>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {groupPresentations.map((p: any) => (
                        <div key={p.id} className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-2xl transition-all relative cursor-pointer" onClick={() => renamingId !== p.id && navigate(`/app/ppt-presentation/${p.id}`)}>
                          <div className="flex justify-between items-start mb-4 relative z-30">
                            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><Presentation className="w-7 h-7" /></div>
                            <div className="flex items-center gap-1">
                               <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                               <div className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }} className={`p-2 rounded-xl transition-all ${activeMenuId === p.id ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><MoreVertical className="w-4.5 h-4.5" /></button>
                                  {activeMenuId === p.id && (
                                      <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl z-50 py-2 animate-in slide-in-from-top-2">
                                          <button onClick={(e) => {e.stopPropagation(); handleRenameClick(p);}} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"><Edit3 className="w-4 h-4 text-indigo-500" /> Rename Title</button>
                                          <button onClick={(e) => {e.stopPropagation(); handleEditSlides(p);}} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"><LayoutPanelLeft className="w-4 h-4 text-purple-500" /> Edit Slide Text</button>
                                      </div>
                                  )}
                               </div>
                            </div>
                          </div>
                          <div className="relative z-20" onClick={(e) => renamingId === p.id && e.stopPropagation()}>
                            {renamingId === p.id ? (
                              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <input autoFocus type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(p.id); if (e.key === 'Escape') setRenamingId(null); }} className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border-2 border-indigo-500 rounded-lg outline-none text-sm font-bold text-zinc-900 dark:text-white" />
                                <button onClick={(e) => { e.stopPropagation(); handleSaveRename(p.id); }} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"><Check className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 mt-2">
                            <p className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1"><Layers className="w-3 h-3" /> {p.slidesCount} Slides</p>
                            <p className="text-[8px] text-zinc-500/70 font-bold uppercase">Created: {new Date(p.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}