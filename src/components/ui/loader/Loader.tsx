import './loader.css'

function Loader() {
  return (
    // 'flex-1' aron mo-occupy sa tanang space sa outlet, 'min-h-[60vh]' para sa height
    <div className="flex-1 w-full min-h-[60vh] flex flex-col items-center justify-center gap-6 transition-colors animate-in fade-in duration-500">
      
      {/* Ang CSS Loader */}
      <div className="relative flex items-center justify-center">
        <span className="loader"></span>
        {/* Subtle glow effect sa luyo sa spinner */}
        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150 -z-10" />
      </div>
      
      {/* Loading Text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-zinc-900 dark:text-zinc-100 font-black text-sm uppercase tracking-[0.4em] animate-pulse ml-1">
          Worship DJ
        </p>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">
          Preparing Setlist...
        </span>
      </div>

    </div>
  )
}

export default Loader