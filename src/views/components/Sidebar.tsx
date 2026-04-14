import { 
  Music, X, Folder, Bookmark, History, Settings, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // I-save ang state sa local storage para dili mabalik sa dako inig refresh
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const menuItems = [
    { id: 'playlist', path: '/app/playlist', label: 'My Playlists', icon: Folder },
    { id: 'saved', path: '/app/saved', label: 'Saved Songs', icon: Bookmark },
    { id: 'history', path: '/app/history', label: 'History', icon: History },
    { id: 'settings', path: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-99 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
      w-64 ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
    >
      {/* DESKTOP COLLAPSE BUTTON (Gi-center na sa kilid) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full items-center justify-center text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 shadow-md transition-all z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* HEADER / LOGO AREA */}
      <div className={`h-20 flex items-center ${isCollapsed ? 'md:justify-center px-6 md:px-0' : 'justify-between px-6'} border-b border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-xl shrink-0 overflow-hidden`}>
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 shrink-0" />
          <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            JAMC Worship DJ
          </span>
        </div>
        {/* MOBILE CLOSE BUTTON */}
        <button className="md:hidden text-zinc-400" onClick={() => setIsSidebarOpen(false)}>
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'md:justify-center md:px-0 px-4' : 'gap-3 px-4'} py-3 rounded-xl transition-all text-sm font-medium border group ${
                isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:scale-110'}`} />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* FOOTER AREA */}
      <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-600 text-center font-bold tracking-widest overflow-hidden whitespace-nowrap transition-all duration-300`}>
        {isCollapsed ? 'V1.0' : 'JAMC TAGOLOAN CHURCH SYSTEM V1.0'}
      </div>
    </aside>
  );
};