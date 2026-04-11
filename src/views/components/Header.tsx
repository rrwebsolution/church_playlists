import { 
  Menu, FolderPlus, Plus, Search, Sun, Moon, Laptop, 
  ChevronDown, User, Headphones
} from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';

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
}

export const Header = ({ 
  activeMenu, activeFolderId, inputValue, setInputValue, 
  onSubmit, setIsSidebarOpen, isFetching,
  searchMode, setSearchMode,
  bgPlayEnabled, setBgPlayEnabled
}: HeaderProps) => {
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (activeMenu === 'saved' || activeFolderId) {
      if (searchMode === 'youtube') return { placeholder: "Search song title on YouTube...", buttonText: isFetching ? "Searching..." : "Search YT", Icon: Search, showInput: true };
      if (searchMode === 'link') return { placeholder: "Paste YouTube URL here...", buttonText: isFetching ? "Fetching..." : "Add Link", Icon: Plus, showInput: true };
      if (searchMode === 'local') return { placeholder: "Search saved song in this folder...", buttonText: "", Icon: Search, showInput: true };
    } 
    if (activeMenu === 'folders' && !activeFolderId) {
      return { placeholder: "Search or create folder...", buttonText: "Create", Icon: FolderPlus, showInput: true, isSubmitDisabled: query.length === 0 };
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

  return (
    <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 transition-all shrink-0 z-70">
      <div className="min-h-16 md:min-h-20 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4 py-3 md:py-0">
        
        {/* LEFT: Sidebar Icon & Title */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button className="md:hidden p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="hidden lg:block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            {activeMenu === 'saved' ? "Saved Songs" : activeFolderId ? "Folder Explorer" : "Playlist Manager"}
          </h2>
        </div>

        {/* CENTER: Search Bar */}
        <div className="order-3 md:order-0 w-full md:w-auto flex-1 min-w-0 flex justify-center md:max-w-2xl mt-2 md:mt-0">
          {info.showInput && (
            <form onSubmit={onSubmit} className="flex w-full group relative shadow-sm rounded-2xl">
              {(activeFolderId || activeMenu === 'saved') && (
                <select 
                  value={searchMode}
                  onChange={(e) => { setSearchMode(e.target.value as any); setInputValue(''); }}
                  className="bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-[10px] md:text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-l-2xl px-2 py-2 md:py-2.5 cursor-pointer border-r-0 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  <option value="youtube">📺 YT Search</option>
                  <option value="link">🔗 Paste Link</option>
                  <option value="local">📁 Local Library</option>
                </select>
              )}
              <div className="relative flex-1 min-w-0 flex items-center">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 z-10">
                  <Search className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  placeholder={info.placeholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isFetching}
                  className={`w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs md:text-sm pl-9 md:pl-10 pr-4 py-2 md:py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 
                    ${!(activeFolderId || activeMenu === 'saved') ? 'rounded-l-2xl' : ''} 
                    ${searchMode === 'local' && (activeFolderId || activeMenu === 'saved') ? 'rounded-r-2xl border-l-0' : 'border-l-0'}
                  `}
                />
              </div>
              <button 
                type="submit" 
                disabled={isFetching || !inputValue.trim() || info.isSubmitDisabled}
                className={`bg-indigo-600 hover:bg-indigo-700 px-4 md:px-6 rounded-r-2xl text-[10px] md:text-xs font-bold flex items-center gap-2 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:grayscale shrink-0 
                  ${searchMode === 'local' && (activeFolderId || activeMenu === 'saved') ? 'hidden' : 'flex'}
                `}
              >
                {isFetching ? <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <info.Icon className="w-3 h-3 md:w-4 md:h-4" />}
                <span className="hidden sm:inline">{info.buttonText}</span>
              </button>
            </form>
          )}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          {/* BACKGROUND PLAY TOGGLE - GI-HIDE SA MOBILE (hidden md:flex) */}
          <button 
            onClick={() => setBgPlayEnabled(!bgPlayEnabled)} 
            className={`hidden md:flex p-2 md:px-3 md:py-2 rounded-xl transition-all items-center gap-2 border ${bgPlayEnabled ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent dark:border-zinc-700 text-zinc-400 hover:text-zinc-600'}`}
          >
            <Headphones className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden xl:block text-[11px] font-bold uppercase tracking-wider">
              {bgPlayEnabled ? 'BG Play: ON' : 'BG Play: OFF'}
            </span>
          </button>

          {/* THEME SWITCHER */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsThemeOpen(!isThemeOpen)} className="p-2 md:px-3 md:py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-xl hover:border-indigo-500 text-zinc-600 dark:text-zinc-300 transition-all flex items-center gap-2">
              {React.createElement(currentThemeIcon, { className: "w-5 h-5 md:w-4 md:h-4" })}
              <ChevronDown className={`w-3 h-3 transition-transform ${isThemeOpen ? 'rotate-180' : ''}`} />
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
          
          {/* USER AVATAR - GI-HIDE PUD SA MOBILE */}
          <div className="hidden md:flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-zinc-200 dark:border-zinc-800">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <User className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};