import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Play, PlayCircle, PauseCircle, 
  Trash2, ChevronDown, Languages, Search, GripVertical, Copy, Edit3, Check, Guitar, PlusCircle, CheckCircle2, Upload,
  Music, CloudDownload, Printer, DownloadCloud
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; 
import { PlayingVisualizer } from './FolderList';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';
import axiosInstance from '../../plugin/axios';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

// --- UPGRADED PROXY ENGINE ---
const fetchWithProxy = async (targetUrl: string) => {
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://cors.sh/${targetUrl}`,
    `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await axios.get(proxy, { timeout: 8000 });
      const dataString = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
      if (dataString.includes("Forbidden") || dataString.includes("Cloudflare") || dataString.includes("error code: 1020")) {
        console.warn(`Proxy ${proxy} was blocked.`);
        continue;
      }
      return res; 
    } catch (e) {
      console.warn(`Proxy failed: ${proxy}`, e);
    }
  }
  throw new Error("All proxies failed.");
};


// --- AGGRESSIVE CLEANER ---
const cleanUpSongData = (rawArtist: string, rawTitle: string) => {
  let title = rawTitle;
  let artist = rawArtist;

  if (title.includes('|')) {
    const parts = title.split('|');
    title = parts[0];
    artist = parts[1] || artist;
  } else if (title.includes('-')) {
    const parts = title.split('-');
    artist = parts[0];
    title = parts[1];
  }

  title = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '');
  artist = artist.replace(/\([^)]*\)|\[[^\]]*\]/g, '');

  const junkRegex = /(Official|Music Video|Lyric Video|'|Lyrics|Wish 107.5 Bus|Music|TV|Live|Acoustic|Performance|HD|HQ|Audio|VEVO|Topic|Channel|in Melbourne|Cover|\bVideo\b)/gi;
  title = title.replace(junkRegex, '').trim();
  artist = artist.replace(junkRegex, '').trim();

  return { cleanArtist: artist, cleanTitle: title };
};

const extractUGJson = (html: string) => {
  try {
    const dataMatch = html.match(/class="js-store" data-content="([^"]+)"/);
    if (dataMatch && dataMatch[1]) {
      const decoded = dataMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&apos;/g, "'");
      return JSON.parse(decoded);
    }
    const scriptMatch = html.match(/window\.UGAPP\.store\.page\s*=\s*(\{.+?\});/);
    if (scriptMatch && scriptMatch[1]) return JSON.parse(scriptMatch[1]);
  } catch (e) { }
  return null;
};

// --- 🔥 BAG-O NGA "API": TheWorshipSongs.com SCRAPER 🔥 ---
const fetchLyricsFromWorshipSongs = async (_artist: string, title: string) => {
  try {
    // 1. Himuon ang URL slug (e.g., "Imong Gunit" -> "imong-gunit")
    const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const targetUrl = `https://www.theworshipsongs.com/parts/lyrics/${slug}-lyrics.html`;

    // 2. Kuhaon ang HTML content sa page
    const response = await fetchWithProxy(targetUrl);
    
    // 3. Pangitaon ang div nga naay sulod nga lyrics
    const contentMatch = response.data.match(/<div class="post-body entry-content[^"]*">([\s\S]*?)<\/div>/i);

    if (contentMatch && contentMatch[1]) {
      // 4. Limpyuhan ang nakuha nga HTML
      let lyrics = contentMatch[1]
        .replace(/<br\s*\/?>/gi, '\n') // Himuong newline ang <br>
        .replace(/<p><strong>.*?<\/strong><\/p>/gi, '') // Tangtangon ang mga header sa sulod
        .replace(/<[^>]+>/g, '') // Tangtangon ang tanang ubang HTML tags
        .replace(/&#\d+;/g, (match:any) => String.fromCharCode(parseInt(match.substring(2, match.length - 1)))) // I-decode ang HTML entities
        .replace(/&nbsp;/g, ' ')
        .trim();
        
      // Kuhaon ang mga junk sa sinugdanan
      const firstRealLineIndex = lyrics.search(/\n\s*\n/);
      if (firstRealLineIndex !== -1) {
          lyrics = lyrics.substring(firstRealLineIndex).trim();
      }

      if (lyrics.length > 50) {
        return lyrics;
      }
    }
  } catch (e) {
    console.warn("TheWorshipSongs.com fetch failed:", e);
  }
  return "";
};


// --- MULTI-LAYER LYRICS ENGINE (GI-UPDATE) ---
const fetchLyricsSmart = async (artist: string, title: string) => {
  // 1. 🔥 UNAHON ANG BAG-O NGA TheWorshipSongs.com
  const worshipSongsLyrics = await fetchLyricsFromWorshipSongs(artist, title);
  if (worshipSongsLyrics) return worshipSongsLyrics;

  const query = encodeURIComponent(`${artist} ${title}`);

  try { // 2. LRCLib (Direct)
    const res = await axios.get(`https://lrclib.net/api/search?q=${query}`, { timeout: 5000 });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const bestMatch = data?.find((d: any) => (d.plainLyrics || d.syncedLyrics));
    if (bestMatch && (bestMatch.plainLyrics || bestMatch.syncedLyrics)) {
      return (bestMatch.plainLyrics || bestMatch.syncedLyrics).replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
    }
  } catch (e) {}

  try { // 3. Popcat (Direct)
    const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${query}`, { timeout: 5000 });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) return data.lyrics.trim();
  } catch (e) {}

  try { // 4. ChristianLyricsOnline (with Proxy)
    const searchUrl = `https://christianlyricsonline.net/?s=${query}`;
    const searchRes = await fetchWithProxy(searchUrl);
    const links = searchRes.data.match(/href="(https:\/\/christianlyricsonline\.net\/(?:lyrics\/)?[^/"]+\/)"/g);
    if (links) {
      const postUrl = links.find((link:any) => !/category|tag|about|author/.test(link))?.replace(/href="|"/g, '');
      if (postUrl) {
        const articleRes = await fetchWithProxy(postUrl);
        const contentMatch = articleRes.data.match(/<div class="[^"]*entry-content[^"]*">([\s\S]*?)<\/div>/i);
        if (contentMatch && contentMatch[1]) {
          let rawLyrics = contentMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&#8217;|&#039;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&nbsp;/g, ' ').replace(/Share this:[\s\S]*/gi, ''); 
          if (rawLyrics.length > 50) return rawLyrics.trim();
        }
      }
    }
  } catch (e) {}

  return "";
};

// --- MULTI-LAYER CHORDS ENGINE ---
const fetchChordsSmart = async (artist: string, title: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  try {
    const slug = `${title}-${artist}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const pnwUrl = `https://pnwchords.com/${slug}/`;
    const resPnw = await fetchWithProxy(pnwUrl);
    const matchPre = resPnw.data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (matchPre && matchPre[1]) {
      return matchPre[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#039;/g, "'").trim();
    }
  } catch(e) {}

  try {
    const chordSearchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`;
    const resC = await fetchWithProxy(chordSearchUrl);
    const store = extractUGJson(resC.data);
    if (store) {
      const results = store?.store?.page?.data?.results || store?.data?.results || [];
      const chordTab = results.find((r: any) => r.type === 'Chords' && r.tab_url);
      if (chordTab && chordTab.tab_url) {
        const tabRes = await fetchWithProxy(chordTab.tab_url);
        const tabStore = extractUGJson(tabRes.data);
        if (tabStore) {
          const rawContent = tabStore?.store?.page?.data?.tab_view?.wiki_tab?.content || tabStore?.data?.tab_view?.wiki_tab?.content || "";
          if (rawContent) return rawContent.replace(/\[\/?(ch|tab)\]/g, '').replace(/&#039;/g, "'").trim();
        }
      }
    }
  } catch(e) {}
  return "";
};

// --- HELPER PARA SA PLAIN TEXT LYRICS ---
const getCleanLyricsText = (lyrics: string) => {
  if (!lyrics) return "";
  const rawLines = lyrics.replace(/&#039;/g, "'").split(/\r?\n/);
  const result: string[] = [];

  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;
  const isChordLine = (line: string) => {
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || line.trim() === "") return false;
    let chordCount = 0;
    words.forEach(word => {
      const cleanWord = word.replace(/[()]/g, '');
      if (chordRegex.test(cleanWord) || ["|", "-", "/", "!", "x"].includes(cleanWord)) chordCount++;
    });
    return chordCount > 0 && (chordCount / words.length > 0.4);
  };

  const isHeader = (line: string) => {
    const tl = line.trim();
    return /^\[(.*?)\]$/.test(tl) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(tl);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line === "") { result.push(""); continue; }

    if (isHeader(line)) {
      let hasLyricsBelow = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const next = rawLines[j].trim();
        if (next === "") continue;
        if (isHeader(next)) break;
        if (!isChordLine(next)) { hasLyricsBelow = true; break; }
      }
      if (hasLyricsBelow) result.push(`\n[${line.replace(/[\[\]():]/g, '')}]\n`);
      continue;
    }

    if (!isChordLine(line)) result.push(line);
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};


// --- SMART LYRICS FORMATTER ---
const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;

  let cleanLyrics = lyrics.replace(/&#039;/g, "'");
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: any[] = [];

  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;

  const isChordLine = (line: string) => {
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || line.trim() === "") return false;
    let chordCount = 0;
    words.forEach(word => {
      const cleanWord = word.replace(/[()]/g, '');
      if (chordRegex.test(cleanWord) || ["|", "-", "/", "!", "x"].includes(cleanWord)) chordCount++;
    });
    return chordCount > 0 && (chordCount / words.length > 0.4);
  };

  const isHeader = (line: string) => {
    const tl = line.trim();
    return /^\[(.*?)\]$/.test(tl) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(tl);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const currentLine = rawLines[i].trim();
    
    if (currentLine === "") {
      processedLines.push(<div key={i} className="h-4"></div>);
      continue;
    }

    if (isHeader(currentLine)) {
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
          <div key={i} className="mt-8 mb-3 flex justify-center">
            <span className="px-5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
              {currentLine.replace(/[\[\]():]/g, '')}
            </span>
          </div>
        );
      }
      continue; 
    }

    if (isChordLine(currentLine)) continue;

    processedLines.push(
      <div key={i} className="text-zinc-800 dark:text-zinc-100 leading-relaxed font-semibold text-[15px] md:text-[17px] py-0.5 text-center">
        {currentLine}
      </div>
    );
  }
  return processedLines;
};

const stripChordsForEdit = (text: string) => {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  const chordRegex = /^[A-G][b#]?(?:m|maj|min|sus|dim|aug|add|M|alt|7|9|11|13|5|6|b|#|-|\+)*(?:\/[A-G][b#]?)?$/i;

  return lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed === "") return true; 
    
    if (/^\[(.*?)\]$/.test(trimmed) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(trimmed)) {
      return true;
    }

    const words = trimmed.split(/\s+/);
    let chordCount = 0;
    words.forEach(word => {
      const cleanWord = word.replace(/[()]/g, '');
      if (chordRegex.test(cleanWord) || ["|", "-", "/", "!", "x"].includes(cleanWord)) chordCount++;
    });

    return !(chordCount > 0 && (chordCount / words.length > 0.4));
  }).join('\n').trim();
};

export default function SongList(props: any) {
  const navigate = useNavigate();
  const { 
    folders, setFolders, activeFolderId, setActiveFolderId, 
    currentSong, setCurrentSong, selectSong, setIsPlaying, isPlaying,
    inputValue, setInputValue, searchMode, setYoutubeResults,
    isAutoPlayNextEnabled, setIsAutoPlayNextEnabled 
  } = props;

  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempText, setTempText] = useState<string>("");
  const[fetchingSongId, setFetchingSongId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>("");

  const activeFolder = folders.find((f: PlaylistFolder) => f.id === activeFolderId);

  const globalLibrary = useMemo(() => {
    const songsMap = new Map<string, Song>();
    folders.forEach((folder: PlaylistFolder) => {
      folder.songs.forEach((song: Song) => {
        if (!songsMap.has(song.url)) songsMap.set(song.url, song);
      });
    });
    return Array.from(songsMap.values());
  }, [folders]);

  const isLocalSearch = searchMode === 'local' && inputValue.trim().length > 0;
  const songsToDisplay = isLocalSearch 
    ? globalLibrary.filter((s: Song) => s.title.toLowerCase().includes(inputValue.toLowerCase()) || (s.artist && s.artist.toLowerCase().includes(inputValue.toLowerCase())))
    : (activeFolder?.songs || []);

  const onDragEnd = (result: any) => {
    if (!result.destination || isLocalSearch) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        const newSongs = Array.from(folder.songs);
        const [movedSong] = newSongs.splice(sourceIndex, 1);
        newSongs.splice(destinationIndex, 0, movedSong);
        return { ...folder, songs: newSongs };
      }
      return folder;
    }));
  };

  const handlePlaySong = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (currentSong?.id === song.id) {
      if (!isPlaying) selectSong?.(song);
      else setIsPlaying(false);
    } else {
      selectSong?.(song) ?? (setCurrentSong(song), setIsPlaying(true));
    }
  };

  const handleAddToFolder = (song: Song) => {
    const currentFolder = folders.find((f: PlaylistFolder) => f.id === activeFolderId);
    
    if (currentFolder && currentFolder.songs.some((s:any) => s.url === song.url)) {
        Swal.fire({ icon: 'error', title: 'Duplicate Song', text: 'This song is already in this folder!' });
        return;
    }

    setFolders((prev: PlaylistFolder[]) => prev.map(f => {
      if (f.id === activeFolderId) {
        return { ...f, songs: [...f.songs, { ...song, id: Date.now().toString() + Math.random() }] };
      }
      return f;
    }));

    setInputValue(''); 
    Toast.fire({ icon: 'success', title: 'Added to folder!' });
  };

  const handleRemoveSong = async (song: Song) => {
    const result = await Swal.fire({
      title: 'Remove Song?', text: `Are you sure you want to remove "${song.title}" from this folder?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#71717a', confirmButtonText: 'Yes, remove it!'
    });
    if (result.isConfirmed) {
      setFolders((prev: PlaylistFolder[]) => prev.map(f => f.id === activeFolderId ? { ...f, songs: f.songs.filter(s => s.id !== song.id) } : f));
      if (currentSong?.id === song.id) {
        setCurrentSong(null);
        setIsPlaying(false);
      }
      Toast.fire({ icon: 'success', title: 'Song removed' });
    }
  };

  const handleSaveText = (songId: string) => {
    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) return { ...folder, songs: folder.songs.map(song => song.id === songId ? { ...song, [activeTab]: tempText } : song) };
      return folder;
    }));
    setEditingId(null);
    Toast.fire({ icon: 'success', title: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} saved!` });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFolderId) return;
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('folder_id', activeFolderId);
    formData.append('title', file.name.replace('.mp3', ''));

    Swal.fire({ title: 'Uploading MP3...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await axiosInstance.post('playlists/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFolders((prev: any) => prev.map((f: any) => f.id === activeFolderId ? { ...f, songs: [...f.songs, res.data] } : f));
      Swal.close();
      Toast.fire({ icon: 'success', title: 'MP3 Uploaded!' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: 'Please check your server settings.' });
    }
  };

  const handleSaveTitle = (songId: string) => {
    if (!tempTitle.trim()) { setEditingTitleId(null); return; }
    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) return { ...folder, songs: folder.songs.map(song => song.id === songId ? { ...song, title: tempTitle.trim() } : song) };
      return folder;
    }));
    setEditingTitleId(null);
    Toast.fire({ icon: 'success', title: 'Title updated!' });
  };

  const handleDownloadTxt = (song: Song) => {
    const content = activeTab === 'lyrics' 
      ? getCleanLyricsText(song.lyrics || "") 
      : song.chords;

    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${song.title} - ${activeTab.toUpperCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = (song: Song) => {
    const content = activeTab === 'lyrics' 
      ? getCleanLyricsText(song.lyrics || "") 
      : song.chords;

    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const formattedContent = activeTab === 'lyrics' 
      ? content.replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<div class="badge">$1</div>')
      : `<pre style="font-family: monospace; font-size: 14px; white-space: pre-wrap;">${content}</pre>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${song.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; color: #18181b; }
            h1 { margin-bottom: 5px; font-size: 24px; }
            h2 { margin-top: 0; font-size: 14px; color: #71717a; text-transform: uppercase; margin-bottom: 30px; }
            .badge { 
              display: inline-block; padding: 4px 12px; background: #f4f4f5; 
              border: 1px solid #e4e4e7; border-radius: 6px; font-weight: bold; 
              font-size: 11px; margin: 20px 0 10px 0; text-transform: uppercase;
            }
            .lyrics-line { margin-bottom: 4px; font-size: 16px; font-weight: 500; }
          </style>
        </head>
        <body>
          <h1>${song.title}</h1>
          <h2>${song.artist || 'Unknown Artist'}</h2>
          <div>${formattedContent}</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleManualFetch = async (song: Song) => {
    const { cleanArtist, cleanTitle } = cleanUpSongData(song.artist || "", song.title);
    const { value: formValues } = await Swal.fire({
      title: '<span style="font-weight: 900; color: #4f46e5; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> Get Data Online</span>',
      html: `
        <div style="text-align: left; padding: 10px 5px;">
          <p style="font-size: 13px; color: #71717a; margin-bottom: 20px; font-weight: 500; text-align: center;">Make sure the artist and song title are clean to get the most accurate lyrics and chords.</p>
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 6px;">Artist Name</label>
            <input id="swal-artist" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; border-radius: 12px; background: #f4f4f5; border: 1px solid #e4e4e7; color: #3f3f46; font-weight: 600;" placeholder="e.g. Hillsong Worship" value="${cleanArtist.replace(/"/g, '&quot;')}">
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 6px;">Song Title</label>
            <input id="swal-title" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; border-radius: 12px; background: #f4f4f5; border: 1px solid #e4e4e7; color: #3f3f46; font-weight: 600;" placeholder="e.g. What a Beautiful Name" value="${cleanTitle.replace(/"/g, '&quot;')}">
          </div>
        </div>
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: '<span style="font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Search Online</span>', cancelButtonText: '<span style="font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Cancel</span>', confirmButtonColor: '#4f46e5', cancelButtonColor: '#a1a1aa', customClass: { popup: 'rounded-3xl' },
      preConfirm: () => [ (document.getElementById('swal-artist') as HTMLInputElement).value, (document.getElementById('swal-title') as HTMLInputElement).value ]
    });

    if (!formValues) return;
    const [artist, title] = formValues;

    setFetchingSongId(song.id);
    const [lyricsResult, chordsResult] = await Promise.all([ fetchLyricsSmart(artist, title), fetchChordsSmart(artist, title) ]);

    let finalLyrics = lyricsResult;
    if (chordsResult && (!lyricsResult || chordsResult.length > lyricsResult.length + 50)) {
        finalLyrics = getCleanLyricsText(chordsResult);
    }

    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        return { ...folder, songs: folder.songs.map(s => s.id === song.id ? { ...s, lyrics: finalLyrics || s.lyrics, chords: chordsResult || s.chords } : s) };
      }
      return folder;
    }));
    setFetchingSongId(null);

    // UPGRADED SWAL NOTIFICATIONS
    if (finalLyrics && chordsResult) {
      Swal.fire({ icon: 'success', title: 'Found it!', html: `<p style="font-size: 14px; font-weight: 500; color: #3f3f46;">Successfully downloaded both <b>Lyrics</b> and <b>Chords</b>.</p>`, timer: 3000, showConfirmButton: false });
      setActiveTab('chords');
    } else if (finalLyrics || chordsResult) {
      const foundItem = finalLyrics ? 'Lyrics' : 'Chords';
      const missingItem = finalLyrics ? 'Chords' : 'Lyrics';
      Swal.fire({ icon: 'info', title: 'Partial Data Found', html: `<div style="text-align: center;"><p style="font-size: 15px; font-weight: bold; color: #3f3f46;">We found the <span style="color: #4f46e5;">${foundItem}</span>!</p><p style="font-size: 13px; color: #71717a; margin-top: 8px;">However, we couldn't find the <b>${missingItem}</b> online. You may need to paste the ${missingItem.toLowerCase()} manually.</p></div>`, confirmButtonText: 'Okay, got it', confirmButtonColor: '#4f46e5', customClass: { popup: 'rounded-3xl' } });
      setActiveTab(chordsResult && !finalLyrics ? 'chords' : 'lyrics');
    } else {
      const { isConfirmed } = await Swal.fire({ 
        icon: 'warning',
        title: 'Data Not Found Online', 
        html: `<p style="font-size: 14px; color: #71717a;">The automated search failed. You can search on Google and paste the lyrics or chords yourself.</p>`, 
        showCancelButton: true,
        confirmButtonText: 'Edit Manually',
        cancelButtonText: 'Close',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'rounded-3xl' }
      });
      if (isConfirmed) {
        setEditingId(song.id);
        const rawText = song[activeTab] || "";
        const textToEdit = activeTab === 'lyrics' ? stripChordsForEdit(rawText) : rawText;
        setTempText(textToEdit); 
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => { 
              setActiveFolderId(null); 
              setYoutubeResults?.([]); 
              setInputValue?.(''); 
              navigate('/app/playlist'); 
            }} 
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-sm transition-all active:scale-90 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">{activeFolder?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <p className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">{isLocalSearch ? `Global Library Search: "${inputValue}"` : `Folder Setlist`}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <label className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl cursor-pointer hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 transition-all shadow-sm active:scale-95 whitespace-nowrap">
             <Upload className="w-4 h-4" />
             <span className="text-[10px] font-bold uppercase tracking-wider">Upload MP3</span>
             <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
           </label>
           
           {!isLocalSearch && (
             <div className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm whitespace-nowrap shrink-0">
               <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                 Auto-Play Next: <span className={isAutoPlayNextEnabled ? "text-indigo-500" : "text-zinc-400"}>{isAutoPlayNextEnabled ? "ON" : "OFF"}</span>
               </span>
               <button onClick={() => setIsAutoPlayNextEnabled(!isAutoPlayNextEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${isAutoPlayNextEnabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${isAutoPlayNextEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
             </div>
           )}
        </div>
      </div>

      <div className="space-y-6">
        {activeFolder?.songs.length === 0 && !isLocalSearch ? (
          <div className="flex flex-col items-center justify-center py-24 bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-center px-6">
            <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-full mb-4"><Music className="w-10 h-10 text-indigo-500" /></div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Setlist is Empty</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed">Search a song using the header bar or use "Local Library" to add existing tracks to <span className="text-indigo-600 font-semibold">{activeFolder?.name}</span>.</p>
          </div>
        ) : isLocalSearch && songsToDisplay.length === 0 ? (
          <div className="py-24 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
            <Search className="w-10 h-10 mx-auto mb-4 text-zinc-400" />
            <p className="font-semibold uppercase tracking-wider text-zinc-500 text-xs">No saved songs found in library</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="playlist-droppable" isDropDisabled={isLocalSearch}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {songsToDisplay.map((song:any, index:any) => {
                    const isCurrentlyPlaying = currentSong?.id === song.id;
                    const alreadyInFolder = activeFolder?.songs.some((s: Song) => s.url === song.url);
                    const isMp3 = !song.url.includes('youtube');
                    const isFetchingData = fetchingSongId === song.id;
                    const isExpanded = expandedSongId === song.id;

                    return (
                      <Draggable key={song.id} draggableId={song.id} index={index} isDragDisabled={isLocalSearch}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} style={{...provided.draggableProps.style, left: "auto", top: "auto" }} 
                            className={`group overflow-hidden transition-all duration-300 rounded-[1.5rem] bg-white dark:bg-zinc-900/80 backdrop-blur-xl border
                            ${snapshot.isDragging ? 'shadow-2xl border-indigo-500 scale-[1.02] z-50' : isExpanded ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/10' : 'border-zinc-200/50 dark:border-white/5 shadow-sm hover:border-indigo-400/50 dark:hover:border-indigo-500/30'}`}>
                            
                            {/* CARD HEADER */}
                            <div className="flex items-center justify-between p-4 md:p-5 relative bg-white dark:bg-transparent rounded-t-[1.5rem]">
                              
                              {isFetchingData && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/10 overflow-hidden">
                                  <div className="h-full bg-indigo-600 w-1/3 rounded-full animate-loading-bar"></div>
                                </div>
                              )}

                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                {!isLocalSearch && <div {...provided.dragHandleProps} className="hidden sm:flex text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing px-1"><GripVertical className="w-5 h-5" /></div>}
                                <div className="flex items-center gap-4 min-w-0 group/info flex-1">
                                  
                                  {/* THUMBNAIL AREA */}
                                  <div onClick={(e) => handlePlaySong(e, song)} className="relative shrink-0 cursor-pointer">
                                    <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center transition-all ${
                                      isCurrentlyPlaying 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                    }`}>
                                      {song.thumbnail ? (
                                        <img 
                                          src={song.thumbnail} 
                                          alt={song.title} 
                                          className={`w-full h-full object-cover transition-opacity duration-300 ${isCurrentlyPlaying ? 'opacity-40' : 'opacity-100'}`} 
                                        />
                                      ) : (
                                        isCurrentlyPlaying ? (
                                          isPlaying ? <PlayingVisualizer /> : <Play className="w-5 h-5 fill-current ml-0.5" />
                                        ) : (
                                          <Play className="w-5 h-5 fill-current ml-0.5" />
                                        )
                                      )}
                                    </div>

                                    {/* OVERLAY */}
                                    <div className={`absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-300 transform ${
                                      isCurrentlyPlaying 
                                        ? 'opacity-100 scale-100 bg-indigo-600/60' 
                                        : 'opacity-0 scale-75 group-hover/info:opacity-100 group-hover/info:scale-100 bg-zinc-900/40 dark:bg-black/50 backdrop-blur-[2px]'
                                    }`}>
                                      {isCurrentlyPlaying && isPlaying ? (
                                        <PauseCircle className="w-6 h-6 text-white" />
                                      ) : (
                                        <PlayCircle className="w-6 h-6 text-white" />
                                      )}
                                    </div>

                                    {!isLocalSearch && (
                                      <span className="absolute -bottom-2 -left-2 bg-white dark:bg-zinc-900 text-zinc-500 font-mono text-[9px] w-5 h-5 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm z-10">
                                        {index + 1}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div onClick={() => { if (editingTitleId !== song.id) { setExpandedSongId(isExpanded ? null : song.id); setEditingId(null); } }} className="flex flex-col min-w-0 flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      {editingTitleId === song.id ? (
                                        <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                                          <input autoFocus type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(song.id); if (e.key === 'Escape') setEditingTitleId(null); }} className="px-3 py-1.5 text-sm md:text-base font-semibold border-2 border-indigo-500 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 w-full max-w-113 shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                                          <button onClick={() => handleSaveTitle(song.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm transition-colors"><Check className="w-4 h-4" /></button>
                                        </div>
                                      ) : (
                                        <span className={`truncate text-[15px] md:text-[17px] tracking-tight transition-colors ${isCurrentlyPlaying ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-900 dark:text-zinc-100 font-bold group-hover/info:text-indigo-600'}`}>{song.title}</span>
                                      )}
                                    </div>
                                    <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">{song.artist || 'Unknown Artist'} {isMp3 && " • MP3 FILE"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* ACTIONS */}
                              <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-4">
                                {isLocalSearch ? (
                                  alreadyInFolder ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-500/20"><CheckCircle2 className="w-4 h-4" /> In Folder</div>
                                  ) : (
                                    <button onClick={() => handleAddToFolder(song)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all active:scale-95 shadow-md"><PlusCircle className="w-4 h-4" /> Add</button>
                                  )
                                ) : (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingTitleId(song.id); setTempTitle(song.title); }} className={`p-2.5 rounded-xl transition-all active:scale-90 ${editingTitleId === song.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`} title="Edit Title"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleRemoveSong(song)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90" title="Remove Song"><Trash2 className="w-4 h-4" /></button>
                                    <button onClick={() => { setExpandedSongId(isExpanded ? null : song.id); setEditingId(null); }} className={`p-2.5 rounded-xl transition-all ${isExpanded ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rotate-180' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><ChevronDown className="w-5 h-5" /></button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* EXPANDED CONTENT AREA */}
                            {isExpanded && (
                              <div className="bg-zinc-50/50 dark:bg-black/20 border-t border-zinc-100 dark:border-white/5 animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                                
                                {/* ACTION BAR */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 border-b border-zinc-200/50 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
                                  {/* Segmented Control Tabs */}
                                  <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-800/80 rounded-xl shadow-inner w-full sm:w-auto">
                                    <button disabled={isFetchingData} onClick={() => { setActiveTab('lyrics'); setEditingId(null); }} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'lyrics' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'} ${isFetchingData ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <Languages className="w-4 h-4" /> Lyrics
                                    </button>
                                    <button disabled={isFetchingData} onClick={() => { setActiveTab('chords'); setEditingId(null); }} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'chords' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'} ${isFetchingData ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <Guitar className="w-4 h-4" /> Chords
                                    </button>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {editingId === song.id ? (
                                      <button onClick={() => handleSaveText(song.id)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-500/30 active:scale-95">
                                        <Check className="w-4 h-4" /> Save {activeTab}
                                      </button>
                                    ) : (
                                      <>
                                        {!isLocalSearch && (
                                          <>
                                            <button disabled={isFetchingData} onClick={() => handleManualFetch(song)} className={`flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-indigo-700 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all ${isFetchingData ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95'}`}>
                                              <CloudDownload className={`w-4 h-4 ${isFetchingData ? 'animate-bounce' : ''}`} /> Try to Generate
                                            </button>
                                            <button 
                                              disabled={isFetchingData} 
                                              onClick={() => { 
                                                setEditingId(song.id); 
                                                const rawText = song[activeTab] || "";
                                                const textToEdit = activeTab === 'lyrics' 
                                                  ? stripChordsForEdit(rawText) 
                                                  : rawText;
                                                setTempText(textToEdit); 
                                              }} 
                                              className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all text-zinc-600 dark:text-zinc-300 ${isFetchingData ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600 active:scale-95'}`}
                                            >
                                              <Edit3 className="w-4 h-4" /> Edit
                                            </button>
                                          </>
                                        )}
                                        {song[activeTab] && (
                                          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm overflow-hidden">
                                            <button disabled={isFetchingData} onClick={() => handlePrint(song)} className="p-2.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-indigo-600 transition-colors border-r border-zinc-200 dark:border-zinc-700" title="Print">
                                              <Printer className="w-4 h-4" />
                                            </button>
                                            <button disabled={isFetchingData} onClick={() => handleDownloadTxt(song)} className="p-2.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-indigo-600 transition-colors border-r border-zinc-200 dark:border-zinc-700" title="Download Text File">
                                              <DownloadCloud className="w-4 h-4" />
                                            </button>
                                            <button disabled={isFetchingData} onClick={() => { navigator.clipboard.writeText(song[activeTab] || ""); Toast.fire({ icon: 'success', title: 'Copied!' }); }} className="flex items-center gap-2 px-3 py-2.5 text-zinc-600 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-indigo-600 transition-colors" title="Copy to clipboard">
                                              <Copy className="w-4 h-4" /> Copy
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* CONTENT RENDERER */}
                                <div className="max-w-3xl mx-auto p-6 md:p-10 relative">
                                  {isFetchingData ? (
                                    <div className="animate-pulse w-full py-8 flex flex-col items-center transition-all duration-300">
                                      <div className="h-7 w-32 bg-indigo-500/20 rounded-full mb-8"></div>
                                      <div className="space-y-4 w-full max-w-md flex flex-col items-center">
                                        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                      </div>
                                    </div>
                                  ) : editingId === song.id ? (
                                    <textarea 
                                      value={tempText} 
                                      onChange={(e) => setTempText(e.target.value)} 
                                      placeholder={`Paste your ${activeTab} here...`} 
                                      className={`w-full h-96 p-6 bg-white dark:bg-zinc-950 border-2 border-indigo-500 rounded-2xl outline-none text-zinc-800 dark:text-zinc-200 text-sm shadow-inner resize-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${activeTab === 'chords' ? 'font-mono tracking-widest leading-tight' : 'font-medium leading-relaxed'}`} 
                                    />
                                  ) : song[activeTab] ? (
                                    <div className="animate-in fade-in duration-700 overflow-x-auto">
                                      {activeTab === 'lyrics' ? (
                                        <div className="text-center pb-8">{formatLyrics(song.lyrics as string)}</div>
                                      ) : (
                                        <pre className="font-mono text-[13px] md:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed p-4 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-white/5">{song.chords}</pre>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-16">
                                      <div className="flex flex-col items-center justify-center animate-in fade-in duration-1000">
                                        <div className="relative mb-6">
                                          <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 blur-2xl rounded-full" />
                                          <div className="relative w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 rounded-full flex items-center justify-center shadow-sm">
                                            <Music className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                                          </div>
                                        </div>

                                        <div className="text-center space-y-1">
                                          <p className="text-zinc-400 dark:text-zinc-500 text-[11px] font-black uppercase tracking-[0.25em]">
                                            No {activeTab} available
                                          </p>
                                          <p className="text-zinc-400/60 dark:text-zinc-600 text-[10px] font-medium tracking-wide">
                                            Click <span className="text-indigo-500/60 font-bold uppercase tracking-widest mx-1">Generate</span> or <span className="text-indigo-500/60 font-bold uppercase tracking-widest mx-1">Edit</span> to start
                                          </p>
                                        </div>
                                        
                                        <div className="mt-8 w-12 h-0.5 bg-linear-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
                                      </div>
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}