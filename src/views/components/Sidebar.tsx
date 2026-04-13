import { Music, X, Folder, Bookmark, History, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'playlist', path: '/app/playlist', label: 'My Playlists', icon: Folder },
    { id: 'saved', path: '/app/saved', label: 'Saved Songs', icon: Bookmark },
    { id: 'history', path: '/app/history', label: 'History', icon: History },
    { id: 'settings', path: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-99 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-all duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-xl shrink-0">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6" /> JAMC Worship DJ
        </div>
        <button className="md:hidden text-zinc-400" onClick={() => setIsSidebarOpen(false)}><X className="w-6 h-6" /></button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium border ${
                isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-600 text-center font-bold tracking-widest">
        JAMC TAGOLOAN CHURCH SYSTEM V1.0
      </div>
    </aside>
  );
};