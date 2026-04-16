import React from 'react';

// --- FORMATTER HELPERS ---
export const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Helper function to check for chords (reusable)
const isChordLine = (line: string): boolean => {
  const words = line.trim().split(/\s+/);
  if (words.length === 0 || line.trim() === "") return false;
  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;
  let chordCount = 0;
  words.forEach(word => {
    const cleanWord = word.replace(/[()]/g, '');
    if (chordRegex.test(cleanWord) || ["|", "-", "/", "!", "x"].includes(cleanWord)) chordCount++;
  });
  // If more than 40% of the "words" are chords, it's likely a chord line
  return chordCount > 0 && (chordCount / words.length > 0.4);
};

// Helper function to check for section headers
const isHeader = (line: string): boolean => {
  const tl = line.trim();
  return /^\[(.*?)\]$/.test(tl) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(tl);
};

export const getCleanLyricsText = (lyrics: string): string => {
  if (!lyrics) return "";
  const rawLines = lyrics.replace(/&#039;/g, "'").split(/\r?\n/);
  const result: string[] =[];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]; // 'line' is the correctly scoped variable
    const trimmedLine = line.trim();

    if (trimmedLine === "") {
      result.push("");
      continue;
    }

    if (isHeader(trimmedLine)) {
      let hasLyricsBelow = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const next = rawLines[j].trim();
        if (next === "") continue;
        if (isHeader(next)) break;
        if (!isChordLine(next)) {
          hasLyricsBelow = true;
          break;
        }
      }
      if (hasLyricsBelow) { 
        result.push(`\n${trimmedLine}\n`);
      }
      continue;
    }

    if (!isChordLine(trimmedLine)) { 
      result.push(line); // Fixed: Should be 'line' instead of 'currentLine'
    }
  }
  // Clean up extra newlines and consolidate for EasyWorship
  return result.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const formatLyrics = (lyrics: string): React.ReactNode[] | null => {
  if (!lyrics) return null;
  let cleanLyrics = lyrics.replace(/&#039;/g, "'");
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: React.ReactNode[] =[];

  for (let i = 0; i < rawLines.length; i++) {
    const currentLine = rawLines[i]; // 'currentLine' is correctly scoped here
    const trimmedLine = currentLine.trim();

    if (trimmedLine === "") {
      processedLines.push(<div key={`space-${i}`} className="h-4"></div>);
      continue;
    }

    if (isHeader(trimmedLine)) {
      let hasLyricsBelow = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const nextLine = rawLines[j].trim();
        if (nextLine === "") continue; 
        if (isHeader(nextLine)) break;
        if (!isChordLine(nextLine)) {
          hasLyricsBelow = true;
          break;
        }
      }
      if (hasLyricsBelow) { 
        processedLines.push(
          <div key={`header-${i}`} className="mt-8 mb-3 flex justify-center">
            <span className="px-5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
              {trimmedLine.replace(/[\[\]():]/g, '')}
            </span>
          </div>
        );
      }
      continue; 
    }

    if (isChordLine(trimmedLine)) { 
      // Ignore chord lines in this formatter
      continue;
    }

    processedLines.push(
      <div key={`line-${i}`} className="text-zinc-800 dark:text-zinc-100 leading-relaxed font-semibold text-[15px] md:text-[17px] py-0.5 text-center">
        {currentLine}
      </div>
    );
  }
  return processedLines;
};