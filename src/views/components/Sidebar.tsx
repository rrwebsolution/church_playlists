import { 
  X, Folder, Bookmark, History, Settings, 
  ChevronLeft, ChevronRight, Presentation, MonitorDot, HandCoins, Megaphone
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

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

  type MenuItem = {
    id: string;
    path: string;
    label: string;
    shortLabel?: string;
    icon: LucideIcon;
  };

  const menuSections: { id: string; label: string; items: MenuItem[] }[] = [
    {
      id: 'music',
      label: 'Lineup',
      items: [
        { id: 'playlist', path: '/app/playlist', label: 'My Playlists', shortLabel: 'Playlists', icon: Folder },
        { id: 'saved', path: '/app/saved', label: 'Saved Songs', shortLabel: 'Saved Songs', icon: Bookmark },
        { id: 'history', path: '/app/history', label: 'History', shortLabel: 'History', icon: History },
      ],
    },
    {
      id: 'ministry',
      label: 'Ministry Tools',
      items: [
        { id: 'offering-records', path: '/app/offering-records', label: 'Offering Records', shortLabel: 'Offerings', icon: HandCoins },
        { id: 'announcement-manager', path: '/app/announcement-manager', label: 'Announcement Manager', shortLabel: 'Announcements', icon: Megaphone },
        // Temporarily hidden from sidebar:
        // { id: 'service-planner', path: '/app/service-planner', label: 'Service Planner', shortLabel: 'Service Plan', icon: ClipboardList },
        // { id: 'sermon-notes', path: '/app/sermon-notes', label: 'Sermon Notes', shortLabel: 'Sermon Notes', icon: BookOpenText },
        // { id: 'volunteer-scheduling', path: '/app/volunteer-scheduling', label: 'Volunteer Scheduling', shortLabel: 'Volunteer Team', icon: Users },
        // { id: 'attendance-tracking', path: '/app/attendance-tracking', label: 'Attendance Tracking', shortLabel: 'Attendance', icon: CalendarCheck2 },
        // { id: 'member-directory', path: '/app/member-directory', label: 'Member Directory', shortLabel: 'Members', icon: ContactRound },
        // { id: 'calendar-planning', path: '/app/calendar-planning', label: 'Calendar Planning', shortLabel: 'Calendar', icon: CalendarRange },
      ],
    },
    {
      id: 'presentation',
      label: 'Presentation',
      items: [
        { id: 'easyworship', path: '/app/easyworship', label: 'Worship Presenter', shortLabel: 'Presenter', icon: Presentation },
        { id: 'ppt-presentation', path: '/app/ppt-presentation', label: 'PPT Presentation', shortLabel: 'PPT', icon: MonitorDot },
      ],
    },
    {
      id: 'system',
      label: 'System',
      items: [
        { id: 'settings', path: '/app/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
      ],
    },
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

      <div className={`h-18 flex items-center ${isCollapsed ? 'md:justify-center px-6 md:px-0' : 'justify-between px-5'} border-b border-zinc-200 dark:border-zinc-800 overflow-hidden`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20">
            <span className="text-sm font-black">J</span>
          </div>
          <div className={`min-w-0 transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-900 dark:text-zinc-100">
              JAMC Church
            </p>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-zinc-400 dark:text-zinc-500 uppercase">
              Worship System
            </p>
          </div>
        </div>
        <button className="md:hidden text-zinc-400" onClick={() => setIsSidebarOpen(false)}>
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className={`flex-1 p-3 md:p-4 overflow-y-auto custom-scrollbar ${isCollapsed ? 'overflow-x-visible' : 'overflow-x-hidden'}`}>
        <div className="space-y-4">
          {menuSections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              <div className={`px-3 transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  {section.label}
                </p>
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <div key={item.id} className="relative group flex items-center">
                      <button
                        onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center ${isCollapsed ? 'md:justify-center md:px-0 px-4' : 'gap-3 px-3.5'} py-3 rounded-2xl transition-all text-sm border ${
                          isActive
                            ? 'bg-linear-to-r from-indigo-50 to-sky-50 dark:from-indigo-500/12 dark:to-sky-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-500/20 shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent'
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                          isActive
                            ? 'bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/70 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
                        }`}>
                          <item.icon className="w-4.5 h-4.5 shrink-0" />
                        </div>

                        <div className={`min-w-0 flex-1 text-left transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                          <span className="block truncate font-semibold">
                            {item.shortLabel || item.label}
                          </span>
                        </div>
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
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-300`}>
        <div className={`rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900/80 ${isCollapsed ? 'md:px-2' : ''}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {isCollapsed ? 'JAMC' : 'Church System'}
          </p>
          <p className={`mt-1 text-[9px] font-medium tracking-[0.14em] text-zinc-400 dark:text-zinc-600 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            Organized ministry flow
          </p>
        </div>
      </div>
    </aside>
  );
};
