import { 
  Menu, Plus, Search, Sun, Moon, Laptop, 
  ChevronDown, User, Headphones, DownloadCloud, X, BookOpen,
} from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  activeMenu: string;
  activeFolderId: string | null;
  inputValue: string;
  setInputValue: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  setIsSidebarOpen: (open: boolean) => void;
  isFetching: boolean;
  searchMode: 'youtube' | 'link' | 'local';
  setSearchMode: (mode: 'youtube' | 'link' | 'local') => void;
  bgPlayEnabled: boolean;
  setBgPlayEnabled: (val: boolean) => void;
  
  youtubeResults?: any[];
  setYoutubeResults?: (val: any[]) => void;
  onImportYT?: (yt: any) => void;
  importingId?: string | null;
}

export const Header = ({
  activeMenu, activeFolderId, inputValue, setInputValue, 
  onSubmit, setIsSidebarOpen, isFetching,
  searchMode, setSearchMode,
  bgPlayEnabled, setBgPlayEnabled,
  youtubeResults, setYoutubeResults, onImportYT, importingId
}: HeaderProps) => {
  const location = useLocation();
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); // STATE PARA SA MOBILE SEARCH
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isPptPresentationRoute = /\/app\/ppt-presentation\/?$/.test(location.pathname);

  // Reset keyboard cursor if list changes
  useEffect(() => { setSelectedIndex(0); }, [youtubeResults]);

  // --- AUTO SET DEFAULT SEARCH MODE BASE SA ACTIVE MENU ---
  useEffect(() => {
    if (activeMenu === 'saved') {
      setSearchMode('local');
      setInputValue('');
    } else if (activeFolderId) {
      setSearchMode('youtube'); 
      setInputValue('');
    } else if (activeMenu === 'folders' && !activeFolderId) {
      setSearchMode('local'); 
      setInputValue('');
    }
  }, [activeMenu, activeFolderId, setSearchMode, setInputValue]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
    setIsThemeOpen(false);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsThemeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getHeaderInfo = () => {
    const query = inputValue.trim();
    if (isPptPresentationRoute) {
      return { label: 'PPT Presentation', showInput: false };
    }
    if (activeMenu === 'service-planner') {
      return { label: 'Service Planner', showInput: false };
    }
    if (activeMenu === 'sermon-notes') {
      return { label: 'Sermon Notes', showInput: false };
    }
    if (activeMenu === 'volunteer-scheduling') {
      return { label: 'Volunteer Scheduling', showInput: false };
    }
    if (activeMenu === 'attendance-tracking') {
      return { label: 'Attendance Tracking', showInput: false };
    }
    if (activeMenu === 'offering-records') {
      return { label: 'Offering Records', showInput: false };
    }
    if (activeMenu === 'member-directory') {
      return { label: 'Member Directory', showInput: false };
    }
    if (activeMenu === 'announcement-manager') {
      return { label: 'Announcement Manager', showInput: false };
    }
    if (activeMenu === 'calendar-planning') {
      return { label: 'Calendar Planning', showInput: false };
    }
    if (activeMenu === 'saved' || activeFolderId) {
      if (searchMode === 'youtube') return { placeholder: "Type a few letters to auto-search YouTube...", buttonText: isFetching ? "Searching..." : "Search YT", Icon: Search, showInput: true };
      if (searchMode === 'link') return { placeholder: "Paste YouTube URL here...", buttonText: isFetching ? "Fetching..." : "Add Link", Icon: Plus, showInput: true };
      if (searchMode === 'local') return { placeholder: "Search saved song in this folder...", buttonText: "", Icon: Search, showInput: true };
    } 
    // Pangitaa kani nga part sa Header.tsx
    if (activeMenu === 'folders' && !activeFolderId) {
      return { 
        placeholder: "Search folder...", // Giilisan ang text
        buttonText: "Search",            // Giilisan ang button text
        Icon: Search,                    // Giilisan gikan sa FolderPlus ngadto sa Search
        showInput: true, 
        isSubmitDisabled: query.length === 0 
      };
    }
    return { label: "Worship DJ", showInput: false };
  };

  const info = getHeaderInfo() as any;
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop }
  ];
  const currentThemeIcon = themes.find(t => t.id === theme)?.icon || Laptop;
  const hasYoutubeResults = searchMode === 'youtube' && !!youtubeResults?.length;
  const submitButtonText = hasYoutubeResults
    ? (importingId ? 'Adding...' : 'Add Selected')
    : info.buttonText;
  const SubmitIcon = hasYoutubeResults ? DownloadCloud : info.Icon;

  // --- KEYBOARD NAVIGATION (Command Selection Style) ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchMode !== 'youtube' || !youtubeResults || youtubeResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, youtubeResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (youtubeResults && youtubeResults.length > 0) {
        e.preventDefault();
        if (onImportYT) {
          onImportYT(youtubeResults[selectedIndex]);
          setIsMobileSearchOpen(false); // Close mobile search after selecting
        }
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (searchMode === 'youtube' && youtubeResults && youtubeResults.length > 0 && onImportYT) {
      e.preventDefault();
      onImportYT(youtubeResults[selectedIndex]);
      setIsMobileSearchOpen(false);
      return;
    }

    onSubmit(e);
  };

  return (
    <header className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all shrink-0 z-70">
      <div className="px-3 md:px-8 min-h-16 md:min-h-20 flex items-center justify-between gap-2 md:gap-4">
        
        {/* LEFT: Sidebar Icon & Title */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button className="md:hidden p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors active:scale-90" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 hidden sm:block">
            {isPptPresentationRoute ? "PPT Presentation" : activeMenu === 'service-planner' ? "Service Planner" : activeMenu === 'sermon-notes' ? "Sermon Notes" : activeMenu === 'volunteer-scheduling' ? "Volunteer Scheduling" : activeMenu === 'attendance-tracking' ? "Attendance Tracking" : activeMenu === 'offering-records' ? "Offering Records" : activeMenu === 'member-directory' ? "Member Directory" : activeMenu === 'announcement-manager' ? "Announcement Manager" : activeMenu === 'calendar-planning' ? "Calendar Planning" : activeMenu === 'saved' ? "Saved Songs" : activeFolderId ? "Folder Explorer" : "Playlist Manager"}
          </h2>
        </div>

        {/* CENTER (DESKTOP) & DROPDOWN CONTAINER (MOBILE) */}
        <div className={`
          md:flex md:flex-1 md:justify-center md:max-w-2xl md:relative md:w-auto md:p-0 md:bg-transparent md:border-none md:shadow-none
          ${isMobileSearchOpen 
            ? 'absolute top-full left-0 w-full p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-b border-zinc-200 dark:border-zinc-800 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 flex animate-in slide-in-from-top-2' 
            : 'hidden'
          }
        `}>
          {isPptPresentationRoute && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-ppt-bible-modal'))}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all"
            >
              <BookOpen className="w-4 h-4" /> Bible Verse
            </button>
          )}
          {info.showInput && (
            <form onSubmit={handleFormSubmit} className="flex w-full group relative shadow-sm rounded-2xl">
              {(activeFolderId || activeMenu === 'saved') && (
                <select 
                  value={searchMode}
                  onChange={(e) => { setSearchMode(e.target.value as any); setInputValue(''); }}
                  className="bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-[10px] md:text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-l-2xl px-2 py-2.5 md:py-2.5 cursor-pointer border-r-0 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  <option value="youtube">📺 YT Search</option>
                  <option value="link">🔗 Paste Link</option>
                  <option value="local">📁 Local</option>
                </select>
              )}
            <div className="relative flex-1 min-w-0 flex items-center">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 z-10 pointer-events-none">
                {isFetching && searchMode === 'youtube' ? (
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input 
                autoFocus={isMobileSearchOpen}
                type="text" 
                placeholder={info.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs md:text-sm pl-9 md:pl-10 pr-4 py-2.5 md:py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 
                  ${!(activeFolderId || activeMenu === 'saved') ? 'rounded-l-2xl' : ''} 
                  ${searchMode === 'local' && (activeFolderId || activeMenu === 'saved') ? 'rounded-r-2xl border-l-0' : 'border-l-0'}
                `}
              />

{searchMode === 'youtube' && ((youtubeResults && youtubeResults.length > 0) || isFetching) && (
  <div className="
    /* 1. Positioning */
    fixed md:absolute 
    top-17.5 md:top-[calc(100%+0.5rem)] 
    
    /* 2. Responsive Width: Outlet-wide sa Mobile, Balanced sa Web */
    left-4 right-4 
    md:left-1/2 md:-translate-x-1/2 
    md:w-175 lg:w-213 
    
    /* 3. Refined Glassmorphism Styling */
    bg-white/95 dark:bg-zinc-900/98 backdrop-blur-xl
    border border-zinc-200/50 dark:border-white/10
    shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] 
    rounded-[1.5rem] overflow-hidden z-100
    animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 
    flex flex-col max-h-[65vh]"
  >
    
    {/* HEADER: Compact Status Bar */}
    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping absolute" />
          <div className="w-2 h-2 bg-indigo-500 rounded-full relative" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400">YT Search</span>
          <span className="text-[9px] font-bold text-zinc-400 mt-0.5">{youtubeResults?.length || 0} results</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-[8px] font-black text-zinc-400 uppercase tracking-widest bg-white dark:bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-white/5 shadow-xs">
          <span>↑↓ Nav</span>
          <span className="opacity-20">|</span>
          <span>↵ Add</span>
        </div>
        <button 
          type="button" 
          onClick={(e) => { e.preventDefault(); setYoutubeResults?.([]); setInputValue(''); }}
          className="p-1.5 text-zinc-400 hover:text-red-500 transition-all active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* LIST AREA: Compact & Smooth */}
    <div className="overflow-y-auto p-2 md:p-3 space-y-1 custom-scrollbar">
  {isFetching && (!youtubeResults || youtubeResults.length === 0) ? (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 animate-pulse">Fetching Cloud Data</span>
    </div>
  ) : (
    youtubeResults?.map((yt: any, index: number) => {
      const isSelected = index === selectedIndex;
      const isImporting = importingId === yt.videoId;

      return (
        <div 
          key={yt.videoId}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => { if (!isImporting && onImportYT) onImportYT(yt); }}
          className="group relative flex items-center gap-3.5 p-2 md:p-2.5 cursor-pointer transition-all duration-200"
        >
          {/* Vertical Indicator Bar (Kini ra ang mo-color para simple) */}
          <div className={`absolute left-0 w-1 rounded-full transition-all duration-300 
            ${isSelected ? 'h-6 bg-indigo-500' : 'h-0 bg-transparent'}`} 
          />

          {/* Thumbnail (Limpyo na ni, wala nay overlay) */}
          <div className="relative shrink-0 overflow-hidden rounded-lg shadow-sm">
            <img 
              src={`https://i.ytimg.com/vi/${yt.videoId}/mqdefault.jpg`} 
              alt="" 
              className="w-20 h-12 md:w-28 md:h-16 object-cover block" 
            />
          </div>

          {/* Typography */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className={`text-[13px] md:text-[15px] font-bold line-clamp-1 leading-tight transition-colors duration-200
              ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {yt.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium transition-colors
                ${isSelected ? 'text-indigo-500/70' : 'text-zinc-500'}`}>
                {yt.author}
              </span>
            </div>
          </div>
          
          {/* Action Icon */}
          <div className="shrink-0 px-2">
            {isImporting ? (
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className={`transition-all duration-300 
                ${isSelected ? 'text-indigo-500 opacity-100 scale-110' : 'text-zinc-300 opacity-0 group-hover:opacity-100'}`}>
                <DownloadCloud className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            )}
          </div>
        </div>
      );
    })
  )}
</div>

    {/* COMPACT FOOTER */}
    <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-200/50 dark:border-white/5 flex justify-between items-center shrink-0">
       <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
         Press Enter or click Add Selected to import
       </span>
       <div className="flex gap-1">
          <div className={`w-1 h-1 rounded-full ${isFetching ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-300'}`} />
          <div className="w-1 h-1 rounded-full bg-zinc-300" />
       </div>
    </div>
  </div>
)}
            </div>
            
            {/* SEARCH BUTTON (Visible only if not local mode) */}
<button 
  type="submit" 
  // GIKUHA NATO ANG 'isFetching' DIRI ARON PIRME CLICKABLE BASTA NAAY GI-TYPE
  disabled={!inputValue.trim() || info.isSubmitDisabled}
  className={`bg-indigo-600 hover:bg-indigo-700 px-4 md:px-6 rounded-r-2xl text-[10px] md:text-xs font-bold flex items-center gap-2 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:grayscale shrink-0 
    ${searchMode === 'local' && (activeFolderId || activeMenu === 'saved') ? 'hidden' : 'flex'}
  `}
>
  {isFetching ? (
    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  ) : (
    <SubmitIcon className="w-3 h-3 md:w-4 md:h-4" />
  )}
  <span className="hidden sm:inline">{submitButtonText}</span>
</button>
            </form>
          )}
        </div>

        {/* RIGHT: Actions (All Visible on Mobile) */}
        <div className="flex items-center justify-end gap-1.5 md:gap-4 shrink-0 flex-1 md:flex-none">
          
          {/* MOBILE SEARCH TOGGLE ICON (Only visible on mobile) */}
          {info.showInput && (
            <button 
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)} 
              className={`md:hidden p-2 rounded-xl transition-all active:scale-90 ${isMobileSearchOpen ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}
            >
              {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          )}

          {/* BACKGROUND PLAY TOGGLE (Icon only on mobile, text on desktop) */}
          <button 
            onClick={() => setBgPlayEnabled(!bgPlayEnabled)} 
            className={`flex p-2 md:px-3 md:py-2 rounded-xl transition-all active:scale-90 items-center gap-2 border ${bgPlayEnabled ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            title="Toggle Background Play"
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden xl:block text-[11px] font-bold uppercase tracking-wider">
              {bgPlayEnabled ? 'BG Play: ON' : 'BG Play: OFF'}
            </span>
          </button>

          {/* THEME SWITCHER */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsThemeOpen(!isThemeOpen)} className="p-2 md:px-3 md:py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-xl hover:border-indigo-500 text-zinc-600 dark:text-zinc-300 transition-all active:scale-90 flex items-center gap-2">
              {React.createElement(currentThemeIcon, { className: "w-4 h-4" })}
              <ChevronDown className={`w-3 h-3 transition-transform ${isThemeOpen ? 'rotate-180' : ''} hidden sm:block`} />
            </button>
            {isThemeOpen && (
              <div className="absolute right-0 md:left-1/2 md:-translate-x-1/2 mt-2 w-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-80 animate-in fade-in zoom-in-95 duration-200">
                {themes.map((t) => (
                  <button key={t.id} onClick={() => setTheme(t.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-[11px] font-medium transition-colors ${theme === t.id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400'}`}>
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* USER AVATAR (Visible on all screens) */}
          <div className="flex items-center pl-1.5 md:pl-4 md:border-l border-zinc-200 dark:border-zinc-800 ml-1 md:ml-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm cursor-pointer hover:scale-105 transition-transform">
              <User className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
