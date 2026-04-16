import { FileText, Trash2, Save, MonitorOff, RotateCcw } from 'lucide-react';

interface EditorProps {
  title: string;
  text: string;
  isOutputCleared: boolean;
  onTitleChange: (val: string) => void;
  onTextChange: (val: string) => void;
  onClearEditor: () => void;
  onSave: () => void;
  onBlackoutToggle: () => void;
}

export const EasyWorshipEditor = ({
  title, text, isOutputCleared, onTitleChange, onTextChange, onClearEditor, onSave, onBlackoutToggle
}: EditorProps) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm transition-all duration-300">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <label className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400">
            Studio Editor
          </label>
        </div>
        
        <button 
          onClick={onClearEditor} 
          className="p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all active:scale-90 shadow-sm border border-zinc-100 dark:border-zinc-700" 
          title="Reset Editor"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* --- INPUT FIELDS --- */}
      <div className="space-y-5">
        <div className="group">
          <input 
            type="text" 
            value={title} 
            onChange={(e) => onTitleChange(e.target.value)} 
            placeholder="Enter Song Title..." 
            className="w-full px-6 py-4 bg-zinc-50 dark:bg-black/40 border-2 group-focus-within:border-indigo-500/30 rounded-2xl outline-none text-zinc-900 dark:text-zinc-100 font-bold text-lg placeholder:font-medium placeholder:text-zinc-400 transition-all border-zinc-100 dark:border-zinc-700" 
          />
        </div>
        
        <div className="relative">
          <textarea 
            value={text} 
            onChange={(e) => onTextChange(e.target.value)} 
            placeholder="Paste lyrics here... Use double-enter for new slides." 
            className="w-full h-85 p-7 bg-zinc-50 dark:bg-black/40 border-2 focus:border-indigo-500/30 rounded-3xl outline-none text-zinc-800 dark:text-zinc-100 font-semibold text-base resize-none custom-scrollbar leading-relaxed border-zinc-100 dark:border-zinc-700" 
          />
          {/* Subtle indicator for live sync */}
          <div className="absolute bottom-4 right-6 pointer-events-none">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 opacity-40">
              Live Sync Active
            </span>
          </div>
        </div>
      </div>

      {/* --- ACTION BUTTONS --- */}
      <div className="grid grid-cols-2 gap-5 mt-8">
        <button 
          onClick={onSave} 
          className="py-4.5 bg-indigo-500 text-white rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
        >
          <Save className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
          Save Archive
        </button>
        
        <button 
          onClick={onBlackoutToggle} 
          className={`py-4.5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 border-2 ${
            isOutputCleared 
              ? 'bg-red-600 text-white border-red-600 shadow-xl shadow-red-600/20 animate-pulse' 
              : 'bg-white dark:bg-zinc-800 text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20'
          }`}
        >
          {isOutputCleared ? (
            <>
              <RotateCcw className="w-4 h-4" /> Restore Lyrics
            </>
          ) : (
            <>
              <MonitorOff className="w-4 h-4" /> Clear Output
            </>
          )}
        </button>
      </div>

      {/* --- TIPS SECTION --- */}
      <div className="mt-8 px-2">
        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed text-center opacity-60">
          Tip: Add <span className="text-indigo-500">[Chorus]</span> or <span className="text-indigo-500">Verse 1:</span> to automatically categorize slides.
        </p>
      </div>
    </div>
  );
};