import { useState, useMemo } from 'react';
import { Bookmark, Trash2, RotateCcw, Search, X, FileText } from 'lucide-react';

interface SavedItem {
  id: string;
  title: string;
  text: string;
  date: string;
}

interface ArchivesProps {
  items: SavedItem[];
  onDelete: (id: string) => void;
  onLoad: (item: SavedItem) => void;
}

export const EasyWorshipArchives = ({ items, onDelete, onLoad }: ArchivesProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  return (
    <div className="pt-16 border-t border-zinc-200 dark:border-zinc-800 px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 px-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tight">Archives Library</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Total: {items.length} Items</p>
          </div>
        </div>

        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title or lyrics..."
            className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none focus:border-indigo-500/50 text-sm font-semibold transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-20 text-center opacity-30 px-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
          <Bookmark className="w-12 h-12 mx-auto mb-4" />
          <p className="font-black uppercase tracking-widest text-xs">No records found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3 h-3 text-indigo-500" />
                    <span className="text-[9px] font-black text-indigo-500 uppercase">Document</span>
                  </div>
                  <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate text-lg uppercase italic">{item.title}</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 opacity-60">{item.date}</p>
                </div>
                <button onClick={() => onDelete(item.id)} className="p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all active:scale-90"><Trash2 className="w-4.5 h-4.5" /></button>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-4 mb-8 flex-1 font-semibold leading-relaxed">{item.text}</p>
              <button onClick={() => onLoad(item)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3">
                <RotateCcw className="w-4 h-4" /> Restore to Studio
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};