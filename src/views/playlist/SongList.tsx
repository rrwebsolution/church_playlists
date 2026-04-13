import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Play, PlayCircle, PauseCircle, 
  Trash2, ChevronDown, Languages, Search, GripVertical, Copy, Edit3, Check, Guitar, PlusCircle, CheckCircle2, Upload,
  Music, CloudDownload
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; 
import { PlayingVisualizer } from './FolderList';
import type { PlaylistFolder, Song } from '../types';
import Swal from 'sweetalert2';
import axiosInstance from '../../plugin/axios';
import axios from 'axios';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

// --- SUPER PROXY ENGINE ---
const fetchWithProxy = async (targetUrl: string) => {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${targetUrl}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await axios.get(proxy, { timeout: 5000 });
      if (proxy.includes('allorigins') && res.data?.contents) {
        return { data: res.data.contents };
      }
      if (res.data) return res;
    } catch (e) {}
  }
  throw new Error("Proxies failed");
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

  const junkRegex = /(Official|Music Video|Lyric Video|Lyrics|Wish 107.5 Bus|Music|TV|Live|Acoustic|Performance|HD|HQ|Audio|VEVO|Topic|Channel|in Melbourne|Cover|\bVideo\b)/gi;
  title = title.replace(junkRegex, '').trim();
  artist = artist.replace(junkRegex, '').trim();

  return { cleanArtist: artist, cleanTitle: title };
};

// --- ULTIMATE GUITAR JSON EXTRACTOR ---
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


// --- MULTI-LAYER LYRICS ENGINE ---
const fetchLyricsSmart = async (artist: string, title: string) => {
  const query = encodeURIComponent(`${artist} ${title}`);
  const qArtist = encodeURIComponent(artist);
  const qTitle = encodeURIComponent(title);

  try {
    const searchUrl = `https://christianlyricsonline.net/?s=${query}`;
    const searchRes = await fetchWithProxy(searchUrl);
    
    const links = searchRes.data.match(/href="(https:\/\/christianlyricsonline\.net\/(?:lyrics\/)?[^/"]+\/)"/g);
    let postUrl = null;
    
    if (links) {
      for (const link of links) {
        const cleanLink = link.replace(/href="|"/g, '');
        if (!cleanLink.includes('/category/') && !cleanLink.includes('/tag/') && !cleanLink.includes('/about/') && !cleanLink.includes('/author/')) {
          postUrl = cleanLink;
          break;
        }
      }
    }

    if (postUrl) {
      const articleRes = await fetchWithProxy(postUrl);
      const contentMatch = articleRes.data.match(/<div class="[^"]*entry-content[^"]*">([\s\S]*?)<\/div>/i);
      
      if (contentMatch && contentMatch[1]) {
        let rawLyrics = contentMatch[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&#8217;/g, "'")
          .replace(/&#039;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/&nbsp;/g, ' ')
          .replace(/Share this:[\s\S]*/gi, ''); 

        if (rawLyrics.length > 50) return rawLyrics.trim();
      }
    }
  } catch (e) {}

  // --- FIXED LRCLIB API (Pugngan ang paggawas sa timestamps) ---
  try {
    const res = await fetchWithProxy(`https://lrclib.net/api/search?q=${query}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    
    // Unahon gyud nato pangita ang 'plainLyrics' aron walay numbers
    const bestMatch = data?.find((d: any) => 
      (d.plainLyrics !== null && d.plainLyrics !== "") || 
      (d.syncedLyrics !== null && d.syncedLyrics !== "")
    );
    
    if (bestMatch) {
      let finalLyrics = bestMatch.plainLyrics || bestMatch.syncedLyrics;
      
      // Kung syncedLyrics lang ang naa, i-delete nato ang mga "[01:00.16]" gamit ang Regex
      if (finalLyrics) {
        finalLyrics = finalLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '');
        return finalLyrics.trim();
      }
    }
  } catch (e) {}

  try {
    const res = await fetchWithProxy(`https://api.popcat.xyz/lyrics?song=${query}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) return data.lyrics.trim();
  } catch (e) {}

  try {
    const res = await fetchWithProxy(`https://api.lyrics.ovh/v1/${qArtist}/${qTitle}`);
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data?.lyrics && data.lyrics.length > 50) return data.lyrics.trim();
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
      return matchPre[1].replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&#8217;/g, "'")
                        .replace(/&#039;/g, "'")
                        .replace(/&#8220;/g, '"')
                        .replace(/&#8221;/g, '"').trim();
    }
  } catch(e) { }

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
          if (rawContent) return rawContent.replace(/\[\/?ch\]/g, '').replace(/\[\/?tab\]/g, '')
                                           .replace(/&#039;/g, "'").trim();
        }
      }
    }
  } catch(e) {}

  try {
    const googleFallback = `https://html.duckduckgo.com/html/?q=site:tabs.ultimate-guitar.com/tab/ ${query} chords`;
    const resG = await fetchWithProxy(googleFallback);
    const linkMatch = resG.data.match(/href="\/\/duckduckgo\.com\/l\/\?uddg=(https%3A%2F%2Ftabs\.ultimate-guitar\.com%2Ftab%2F[^"]+?)"/);
    
    if (linkMatch && linkMatch[1]) {
      const decodedUrl = decodeURIComponent(linkMatch[1]);
      const tabRes = await fetchWithProxy(decodedUrl);
      const tabStore = extractUGJson(tabRes.data);
      if (tabStore) {
        const rawContent = tabStore?.store?.page?.data?.tab_view?.wiki_tab?.content || tabStore?.data?.tab_view?.wiki_tab?.content || "";
        if (rawContent) return rawContent.replace(/\[\/?ch\]/g, '').replace(/\[\/?tab\]/g, '')
                                         .replace(/&#039;/g, "'").trim();
      }
    }
  } catch (e) {}

  return "";
};

// --- FORMATTER PARA SA BADGE ---
const formatLyrics = (lyrics: string) => {
  if (!lyrics) return null;

  let cleanLyrics = lyrics.replace(/&#039;/g, "'");
  const rawLines = cleanLyrics.split(/\r?\n/); 
  const processedLines: any[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const trimmedLine = rawLines[i].trim();
    
    const isHeader = /^\[(.*?)\]$/.test(trimmedLine) || 
                     /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(trimmedLine);

    if (isHeader) {
      let hasContent = false;
      for (let j = i + 1; j < rawLines.length; j++) {
        const nextLine = rawLines[j].trim();
        if (nextLine === "") continue; 
        
        if (/^\[(.*?)\]$/.test(nextLine) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)[\s\d]*:?$/i.test(nextLine)) {
          break;
        }

        hasContent = true;
        break;
      }

      if (!hasContent) continue;

      processedLines.push(
        <div key={i} className="mt-8 mb-3 flex justify-center">
          <span className="px-5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            {trimmedLine.replace(/[\[\]():]/g, '')}
          </span>
        </div>
      );
    } else if (trimmedLine === "") {
      processedLines.push(<div key={i} className="h-4"></div>);
    } else {
      processedLines.push(
        <div key={i} className="text-zinc-800 dark:text-zinc-100 leading-relaxed font-semibold text-[15px] md:text-[17px] py-0.5 text-center">
          {trimmedLine}
        </div>
      );
    }
  }

  return processedLines;
};

export default function SongList(props: any) {
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
  const [fetchingSongId, setFetchingSongId] = useState<string | null>(null);

  // --- STATES PARA SA TITLE EDITING ---
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>("");

  const activeFolder = folders.find((f: PlaylistFolder) => f.id === activeFolderId);

  const globalLibrary = useMemo(() => {
    const songsMap = new Map<string, Song>();
    folders.forEach((folder: PlaylistFolder) => {
      folder.songs.forEach((song: Song) => {
        if (!songsMap.has(song.url)) {
          songsMap.set(song.url, song);
        }
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
      if (!isPlaying) {
        selectSong?.(song);
      } else {
        setIsPlaying(false);
      }
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
    Toast.fire({ icon: 'success', title: 'Added to folder!' });
  };

  const handleRemoveSong = async (song: Song) => {
    const result = await Swal.fire({
      title: 'Remove Song?',
      text: `Are you sure you want to remove "${song.title}" from this folder?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, remove it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setFolders((prev: PlaylistFolder[]) => prev.map(f => f.id === activeFolderId ? { ...f, songs: f.songs.filter(s => s.id !== song.id) } : f));
      Toast.fire({ icon: 'success', title: 'Song removed' });
    }
  };

  const handleSaveText = (songId: string) => {
    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        return { ...folder, songs: folder.songs.map(song => song.id === songId ? { ...song, [activeTab]: tempText } : song) };
      }
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
      const res = await axiosInstance.post('playlists/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFolders((prev: any) => prev.map((f: any) => f.id === activeFolderId ? { ...f, songs: [...f.songs, res.data] } : f));
      Swal.close();
      Toast.fire({ icon: 'success', title: 'MP3 Uploaded!' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: 'Please check your server settings.' });
    }
  };

  // --- SAVE INLINE TITLE ---
  const handleSaveTitle = (songId: string) => {
    if (!tempTitle.trim()) {
      setEditingTitleId(null);
      return;
    }
    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        return {
          ...folder,
          songs: folder.songs.map(song => song.id === songId ? { ...song, title: tempTitle.trim() } : song)
        };
      }
      return folder;
    }));
    setEditingTitleId(null);
    Toast.fire({ icon: 'success', title: 'Title updated!' });
  };

  // --- MANUAL AUTO-FIND LYRICS & CHORDS ---
  const handleManualFetch = async (song: Song) => {
    const { cleanArtist, cleanTitle } = cleanUpSongData(song.artist || "", song.title);

    const { value: formValues } = await Swal.fire({
      title: '<span style="font-weight: 900; color: #4f46e5; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> Get Data Online</span>',
      html: `
        <div style="text-align: left; padding: 10px 5px;">
          <p style="font-size: 13px; color: #71717a; margin-bottom: 20px; font-weight: 500; text-align: center;">
            Make sure the artist and song title are clean to get the most accurate lyrics and chords.
          </p>
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
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<span style="font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Search Online</span>',
      cancelButtonText: '<span style="font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Cancel</span>',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#a1a1aa',
      customClass: { popup: 'rounded-3xl' },
      preConfirm: () => {
        return [
          (document.getElementById('swal-artist') as HTMLInputElement).value,
          (document.getElementById('swal-title') as HTMLInputElement).value
        ];
      }
    });

    if (!formValues) return;
    const [artist, title] = formValues;

    setFetchingSongId(song.id);

    let [newLyrics, newChords] = await Promise.all([
      fetchLyricsSmart(artist, title),
      fetchChordsSmart(artist, title)
    ]);

    if (!newLyrics && newChords) {
      let lines = newChords.split('\n');
      let finalLyricLines = [];
      
      for (let line of lines) {
        let trimmed = line.trim();
        
        if (trimmed === "" || /^\[(.*?)\]$/.test(trimmed) || /^(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain|Interlude|Tag|Ending|Instrumental|Solo)/i.test(trimmed)) {
          finalLyricLines.push(trimmed);
          continue;
        }

        const words = trimmed.split(/\s+/).filter((w:any) => w.length > 0);
        const isMostlyChords = words.length > 0 && words.every((w:any) => 
          /^[A-G][b#]?(m|maj|sus|dim|aug|add)?[0-9]*((\/)[A-G][b#]?)?$/i.test(w) || w === '|' || w === '-' || w === '~' || w === 'x'
        );

        if (!isMostlyChords) {
          finalLyricLines.push(trimmed);
        }
      }
      
      newLyrics = finalLyricLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    setFolders((prev: PlaylistFolder[]) => prev.map(folder => {
      if (folder.id === activeFolderId) {
        return {
          ...folder,
          songs: folder.songs.map(s => s.id === song.id ? { 
            ...s, 
            lyrics: newLyrics || s.lyrics, 
            chords: newChords || s.chords 
          } : s)
        };
      }
      return folder;
    }));

    setFetchingSongId(null);

    if (newLyrics && newChords) {
      Swal.fire({
        icon: 'success',
        title: 'Found it!',
        html: `<p style="font-size: 14px; font-weight: 500; color: #3f3f46;">Successfully downloaded both <b>Lyrics</b> and <b>Chords</b>.</p>`,
        timer: 3000,
        showConfirmButton: false
      });
      setActiveTab('chords');
    } 
    else if (newLyrics || newChords) {
      const foundItem = newLyrics ? 'Lyrics' : 'Chords';
      const missingItem = newLyrics ? 'Chords' : 'Lyrics';
      
      Swal.fire({
        title: `<span style="font-weight: 900; color: #f59e0b; display: flex; align-items: center; justify-content: center; gap: 8px;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 
                 Partial Data Found
               </span>`,
        html: `
          <div style="text-align: left; padding: 10px 5px;">
            <p style="font-size: 14px; color: #52525b; margin-bottom: 20px; font-weight: 600; text-align: center;">
              We found the <b style="color: #16a34a;">${foundItem}</b>, but the <b style="color: #ef4444;">${missingItem}</b> are missing online.
            </p>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px;">
              <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #d97706; margin-bottom: 8px;">How to add ${missingItem}</span>
              <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5; font-weight: 500;">
                You can manually search for the ${missingItem} on Google, copy them, select the <b>${missingItem} Tab</b>, and click <b>Edit</b> to paste them.
              </p>
            </div>
          </div>
        `,
        focusConfirm: false,
        confirmButtonText: '<span style="font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Got it</span>',
        confirmButtonColor: '#f59e0b',
        customClass: { popup: 'rounded-3xl' }
      });

      if (newChords && !newLyrics) setActiveTab('chords');
      if (newLyrics) setActiveTab('lyrics');
    } 
    else {
      Swal.fire({
        title: '<span style="font-weight: 900; color: #ef4444; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Data Not Found</span>',
        html: `
          <div style="text-align: left; padding: 10px 5px;">
            <p style="font-size: 14px; color: #52525b; margin-bottom: 20px; font-weight: 600; text-align: center;">
              The system could not find any lyrics or chords online.
            </p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 10px;">
              <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ef4444; margin-bottom: 8px;">Option 1: Try Again</span>
              <p style="font-size: 13px; color: #7f1d1d; margin: 0; line-height: 1.5; font-weight: 500;">
                Clean up the <b>Artist</b> or <b>Song Title</b> and click "Search Online" once more.
              </p>
            </div>

            <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px;">
              <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #52525b; margin-bottom: 8px;">Option 2: Manual Paste</span>
              <p style="font-size: 13px; color: #3f3f46; margin: 0; line-height: 1.5; font-weight: 500;">
                Find the lyrics/chords on Google, copy them, then click the <b style="color:#4f46e5;">Edit</b> button below to paste them directly.
              </p>
            </div>
          </div>
        `,
        focusConfirm: false,
        confirmButtonText: '<span style="font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Got it</span>',
        confirmButtonColor: '#ef4444',
        customClass: {
          popup: 'rounded-3xl',
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => { setActiveFolderId(null); setYoutubeResults([]); setInputValue(''); }} className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-sm transition-all active:scale-90 group"><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /></button>
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

                    return (
                      <Draggable key={song.id} draggableId={song.id} index={index} isDragDisabled={isLocalSearch}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} style={{...provided.draggableProps.style, left: "auto", top: "auto" }} className={`group overflow-hidden border transition-all duration-300 rounded-[1.5rem] bg-white dark:bg-zinc-900 ${snapshot.isDragging ? 'shadow-xl border-indigo-500 scale-[1.01] z-50' : 'border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/50'}`}>
                            <div className="flex items-center justify-between p-4 md:p-5 relative">
                              
                              {isFetchingData && (
                                <div className="absolute top-0 left-0 w-full h-0.75 bg-indigo-500/10 overflow-hidden">
                                  <div className="h-full bg-indigo-600 w-1/3 rounded-full animate-loading-bar"></div>
                                </div>
                              )}

                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                {!isLocalSearch && <div {...provided.dragHandleProps} className="hidden sm:flex text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing px-1"><GripVertical className="w-5 h-5" /></div>}
                                <div className="flex items-center gap-4 min-w-0 group/info flex-1">
                                  <div onClick={(e) => handlePlaySong(e, song)} className="relative shrink-0 cursor-pointer">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isCurrentlyPlaying ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover/info:bg-indigo-50 dark:group-hover/info:bg-indigo-500/10 group-hover/info:text-indigo-600'}`}>
                                      {isCurrentlyPlaying ? (isPlaying ? <PlayingVisualizer /> : <Play className="w-5 h-5 fill-current ml-0.5" />) : <Play className="w-5 h-5 fill-current ml-0.5" />}
                                    </div>
                                    <div className={`absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-300 transform ${isCurrentlyPlaying ? 'opacity-100 scale-100 bg-indigo-600/80' : 'opacity-0 scale-75 group-hover/info:opacity-100 group-hover/info:scale-100 bg-zinc-900/40 dark:bg-black/50'}`}>
                                      {isCurrentlyPlaying && isPlaying ? <PauseCircle className="w-6 h-6 text-white" /> : <PlayCircle className="w-6 h-6 text-white" />}
                                    </div>
                                    {!isLocalSearch && <span className="absolute -bottom-2 -left-2 bg-white dark:bg-zinc-900 text-zinc-500 font-mono text-[9px] w-5 h-5 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700">{index + 1}</span>}
                                  </div>
                                  
                                  <div 
  onClick={() => { 
    if (editingTitleId !== song.id) { 
      setExpandedSongId(expandedSongId === song.id ? null : song.id); 
      setEditingId(null); 
    } 
  }} 
  className="flex flex-col min-w-0 flex-1 cursor-pointer"
>
  <div className="flex items-center gap-2">
    {editingTitleId === song.id ? (
      <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
        <input 
          autoFocus
          type="text" 
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveTitle(song.id);
            if (e.key === 'Escape') setEditingTitleId(null);
          }}
          className="px-2 py-0.5 text-sm md:text-base font-semibold border-2 border-indigo-500 rounded-md outline-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 w-full max-w-113 shadow-sm"
        />
        <button onClick={() => handleSaveTitle(song.id)} className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 shadow-sm">
          <Check className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <span className={`truncate text-sm md:text-base transition-colors ${isCurrentlyPlaying ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-900 dark:text-zinc-100 font-semibold group-hover/info:text-indigo-600'}`}>
        {song.title}
      </span>
    )}
  </div>
  <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium uppercase tracking-wider truncate mt-0.5">{song.artist || 'Unknown Artist'} {isMp3 && " • MP3 FILE"}</span>
</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-4">
  {isLocalSearch ? (
    alreadyInFolder ? (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-500/20">
        <CheckCircle2 className="w-4 h-4" /> In Folder
      </div>
    ) : (
      <button onClick={() => handleAddToFolder(song)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all active:scale-95 shadow-md">
        <PlusCircle className="w-4 h-4" /> Add
      </button>
    )
  ) : (
    <>
      {/* EDIT BUTTON - TAPAD SA DELETE UG PERMI MAKITA */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setEditingTitleId(song.id);
          setTempTitle(song.title);
        }} 
        className={`p-2.5 rounded-xl transition-all active:scale-90 ${editingTitleId === song.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
        title="Edit Title"
      >
        <Edit3 className="w-5 h-5" />
      </button>

      {/* DELETE BUTTON */}
      <button 
        onClick={() => handleRemoveSong(song)} 
        className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
        title="Remove Song"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* EXPAND BUTTON */}
      <button 
        onClick={() => { setExpandedSongId(expandedSongId === song.id ? null : song.id); setEditingId(null); }} 
        className={`p-2.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-transform ${expandedSongId === song.id ? 'rotate-180 text-indigo-600' : ''}`}
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </>
  )}
</div>
                            </div>

                            {/* EXPANDED CONTENT AREA */}
                            {expandedSongId === song.id && (
                              <div className="p-6 md:p-10 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
                                  <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
                                    <button disabled={isFetchingData} onClick={() => { setActiveTab('lyrics'); setEditingId(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'lyrics' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'} ${isFetchingData ? 'opacity-50 cursor-not-allowed' : ''}`}><Languages className="w-4 h-4" /> Lyrics</button>
                                    <button disabled={isFetchingData} onClick={() => { setActiveTab('chords'); setEditingId(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'chords' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'} ${isFetchingData ? 'opacity-50 cursor-not-allowed' : ''}`}><Guitar className="w-4 h-4" /> Chords</button>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {editingId === song.id ? (
                                      <button onClick={() => handleSaveText(song.id)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-bold text-[10px] uppercase tracking-wider shadow-md active:scale-95"><Check className="w-3.5 h-3.5" /> Save {activeTab}</button>
                                    ) : (
                                      <>
                                        {!isLocalSearch && (
                                          <>
                                            <button disabled={isFetchingData} onClick={() => handleManualFetch(song)} className={`flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all ${isFetchingData ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95'}`}>
                                              <CloudDownload className={`w-3.5 h-3.5 ${isFetchingData ? 'animate-bounce' : ''}`} /> {isFetchingData ? 'Generating...' : 'Generate Online'}
                                            </button>
                                            <button disabled={isFetchingData} onClick={() => { setEditingId(song.id); setTempText(song[activeTab] || ""); }} className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-semibold text-[10px] uppercase tracking-wider shadow-sm transition-all text-zinc-600 dark:text-zinc-300 ${isFetchingData ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600 active:scale-95'}`}><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                                          </>
                                        )}
                                        {song[activeTab] && <button disabled={isFetchingData} onClick={() => { navigator.clipboard.writeText(song[activeTab] || ""); Toast.fire({ icon: 'success', title: 'Copied to clipboard' }); }} className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-semibold text-[10px] uppercase tracking-wider shadow-sm transition-all text-zinc-600 dark:text-zinc-300 ${isFetchingData ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500 hover:text-indigo-600 active:scale-95'}`}><Copy className="w-3.5 h-3.5" /> Copy</button>}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="max-w-2xl mx-auto pb-6 relative">
                                  {isFetchingData ? (
                                    <div className="animate-pulse w-full py-8 flex flex-col items-center transition-all duration-300">
                                      <div className="h-7 w-28 bg-indigo-500/20 rounded-xl mb-8"></div>
                                      <div className="space-y-4 w-full max-w-sm flex flex-col items-center">
                                        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                      </div>
                                      <div className="h-7 w-36 bg-indigo-500/20 rounded-xl mt-12 mb-8"></div>
                                      <div className="space-y-4 w-full max-w-sm flex flex-col items-center">
                                        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                        <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800/80 rounded-md"></div>
                                      </div>
                                    </div>
                                  ) : editingId === song.id ? (
                                    <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} placeholder={`Paste your ${activeTab} here...`} className={`w-full h-96 p-4 bg-white dark:bg-zinc-900 border-2 border-indigo-500 rounded-xl outline-none text-zinc-800 dark:text-zinc-200 text-sm shadow-inner resize-none ${activeTab === 'chords' ? 'font-mono tracking-widest leading-tight' : 'font-medium leading-relaxed'}`} />
                                  ) : song[activeTab] ? (
                                    <div className="animate-in fade-in duration-700 overflow-x-auto">{activeTab === 'lyrics' ? <div className="text-center">{formatLyrics(song.lyrics as string)}</div> : <pre className="font-mono text-[13px] md:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-tight">{song.chords}</pre>}</div>
                                  ) : (
                                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                                      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
                                        <Search className="w-5 h-5 text-zinc-400" />
                                      </div>
                                      <div>
                                        <span className="block text-zinc-500 font-bold text-sm">No {activeTab} found for this song.</span>
                                        <span className="block text-zinc-400 font-medium text-[11px] mt-1">Click "Fetch Online" above to download the data.</span>
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