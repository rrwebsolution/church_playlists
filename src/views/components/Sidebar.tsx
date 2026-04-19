import { 
  X, Folder, Bookmark, History, Settings, 
  ChevronLeft, ChevronRight, Presentation, MonitorDot 
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean; 
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 🔥 FIX: Siguraduhon nga ang isCollapsed kay boolean sa dili pa i-save
    // Ang `String(!!isCollapsed)` nagsiguro nga bisan og undefined/null ang isCollapsed,
    // mahimo gihapon kining "true" o "false" string.
    localStorage.setItem('sidebar_collapsed', String(!!isCollapsed));
  }, [isCollapsed]);

  const menuItems = [
    { id: 'playlist', path: '/app/playlist', label: 'My Playlists', icon: Folder },
    { id: 'saved', path: '/app/saved', label: 'Saved Songs', icon: Bookmark },
    { id: 'history', path: '/app/history', label: 'History', icon: History },
    { id: 'easyworship', path: '/app/easyworship', label: 'Worship Presenter', icon: Presentation },
    { id: 'ppt-presentation', path: '/app/ppt-presentation', label: 'PPT Presentation', icon: MonitorDot },
    { id: 'settings', path: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-99 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
      w-64 ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full items-center justify-center text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 shadow-md transition-all z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={`h-16 flex items-center ${isCollapsed ? 'md:justify-center px-6 md:px-0' : 'justify-between px-6'} border-b border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold text-sm uppercase tracking-widest shrink-0 overflow-hidden`}>
        <div className="flex items-center">
          <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            JAMC Worship Flow
          </span>
          {isCollapsed && <span className="hidden md:block font-bold text-lg">J</span>}
        </div>
        <button className="md:hidden text-zinc-400" onClick={() => setIsSidebarOpen(false)}>
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className={`flex-1 p-3 md:p-4 space-y-2 overflow-y-auto custom-scrollbar ${isCollapsed ? 'overflow-x-visible' : 'overflow-x-hidden'}`}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <div key={item.id} className="relative group flex items-center">
              <button
                onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
                className={`w-full flex items-center ${isCollapsed ? 'md:justify-center md:px-0 px-4' : 'gap-3 px-4'} py-3 rounded-xl transition-all text-sm font-medium border ${
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

              {isCollapsed && (
                <div className="fixed left-full ml-4 px-3 py-2 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-100 shadow-xl border border-zinc-700/50 pointer-events-none">
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-zinc-900 dark:border-r-zinc-800"></div>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800 text-[9px] text-zinc-400 dark:text-zinc-600 text-center font-medium tracking-widest overflow-hidden whitespace-nowrap transition-all duration-300`}>
        {isCollapsed ? 'V1.0' : 'JAMC TAGOLOAN CHURCH SYSTEM V1.0'}
      </div>
    </aside>
  );
};
