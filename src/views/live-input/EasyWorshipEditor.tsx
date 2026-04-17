import { FileText, Trash2, Save } from 'lucide-react'; // MonitorOff ug RotateCcw gikuha
import { useRef } from 'react';

interface EditorProps {
  title: string;
  text: string;
  onTitleChange: (val: string) => void;
  onTextChange: (val: string) => void;
  onClearEditor: () => void;
  onSave: () => void;
  // isOutputCleared ug onBlackoutToggle gikuha na dinhi
}

export const EasyWorshipEditor = ({
  title, text, onTitleChange, onTextChange, onClearEditor, onSave // Gikuha ang isOutputCleared, onBlackoutToggle
}: EditorProps) => {
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  let currentBlockNumber = 1;
  let isNewBlock = true;

  const lineNumbers = text.split('\n').map((line) => {
    if (line.trim() === '') {
      isNewBlock = true;
      return null;
    } else {
      if (isNewBlock) {
        isNewBlock = false;
        return currentBlockNumber++;
      } else {
        return null; 
      }
    }
  });

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
        
        {/* TEXTAREA WITH BLOCK NUMBERS */}
        <div className="relative flex w-full h-85 bg-zinc-50 dark:bg-black/40 border-2 focus-within:border-indigo-500/30 rounded-3xl overflow-hidden transition-all border-zinc-100 dark:border-zinc-700">
          
          {/* GUTTER (Block Numbers) */}
          <div 
            ref={gutterRef}
            className="w-12 md:w-14 h-full shrink-0 bg-zinc-100/50 dark:bg-zinc-800/30 border-r border-zinc-200 dark:border-zinc-700/50 overflow-hidden select-none text-right py-7 pr-3 md:pr-4 text-base leading-relaxed text-zinc-400/70 dark:text-zinc-500 font-bold"
          >
            {lineNumbers.map((num, i) => (
              <div key={i} className={num ? 'text-indigo-500/80 dark:text-indigo-400' : ''}>
                {num !== null ? num : '\u00A0'}
              </div>
            ))}
          </div>

          {/* TEXTAREA */}
          <textarea 
            ref={textareaRef}
            onScroll={handleScroll}
            value={text} 
            onChange={(e) => onTextChange(e.target.value)} 
            placeholder="Paste lyrics here... Use double-enter for new slides." 
            className="flex-1 w-full h-full py-7 px-6 outline-none bg-transparent resize-none custom-scrollbar text-zinc-800 dark:text-zinc-100 font-semibold text-base leading-relaxed whitespace-pre overflow-x-auto" 
          />
          
          <div className="absolute bottom-4 right-6 pointer-events-none z-10">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 opacity-40 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-md">
              Live Sync Active
            </span>
          </div>
        </div>
      </div>

      {/* --- ACTION BUTTONS (Gikuha na ang Clear Output) --- */}
      <div className="grid grid-cols-1 gap-5 mt-8"> {/* Gihimong col-span-1 kay usa nalang ang button */}
        <button 
          onClick={onSave} 
          className="py-4.5 bg-indigo-500 text-white rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
        >
          <Save className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
          Save Archive
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