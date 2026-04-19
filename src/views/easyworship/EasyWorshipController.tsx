import { useState, useEffect, useMemo, useRef } from 'react';
import { Presentation, Monitor, Activity, Clapperboard, Radio, AlertTriangle, Film, Plus, Sparkles, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import instance from '../../plugin/axios';

import { EasyWorshipArchives } from './EasyWorshipArchives';
import { EasyWorshipSlides } from './EasyWorshipSlides';
import { EasyWorshipEditor } from './EasyWorshipEditor';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  customClass: { container: 'z-[99999]' }
});

const isPrivateNetworkHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '0.0.0.0' ||
  hostname.endsWith('.local') ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

const isLocalObsHost =
  typeof window !== 'undefined' &&
  isPrivateNetworkHost(window.location.hostname);

const OBS_STATE_API_URL = isLocalObsHost
  ? '/api/obs-state'
  : (import.meta.env.VITE_OBS_STATE_URL || '/api/obs-state');
const OBS_STATE_CHANNEL = 'jamc-obs-state';
const BACKEND_BASE_URL = (import.meta.env.VITE_URL || window.location.origin).replace(/\/+$/, '');

const resolveBackgroundVideoUrl = (url?: string | null, storagePath?: string | null) => {
  if (storagePath) {
    return `${BACKEND_BASE_URL}/storage/${storagePath.replace(/^\/+/, '')}`;
  }

  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url;
  if (url.startsWith('/storage/')) {
    return `${BACKEND_BASE_URL}${url}`;
  }

  return url;
};

export interface SavedItem {
  id: string;
  title: string;
  text: string;
  date: string;
}

export interface ArchiveFolder {
  id: string;
  name: string;
  items: SavedItem[];
}

interface ObsStatePayload {
  text: string;
  fontSize: number;
  background: string;
  fontFamily: string;
  videoUrl: string;
  uploadedVideoKey: string | null;
  bold: boolean;
  allCaps: boolean;
  updatedAt: number;
}

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'video';
type BackgroundSpeed = 'slow' | 'medium' | 'fast';
type BackgroundMood = 'worship' | 'praise' | 'ambient' | 'prayer';
type VideoInputMode = 'link' | 'upload';

interface VideoBackgroundItem {
  id: string;
  name: string;
  url: string;
  speed: BackgroundSpeed;
  mood: BackgroundMood;
  createdAt: number;
  sourceType: VideoInputMode;
  blobKey?: string;
  storagePath?: string;
}

const VIDEO_LIBRARY_DB = 'ew-video-library';
const VIDEO_LIBRARY_STORE = 'videos';

const openVideoLibraryDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(VIDEO_LIBRARY_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_LIBRARY_STORE)) {
        db.createObjectStore(VIDEO_LIBRARY_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getVideoBlob = async (key: string): Promise<Blob | null> => {
  const db = await openVideoLibraryDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(VIDEO_LIBRARY_STORE, 'readonly');
    const request = tx.objectStore(VIDEO_LIBRARY_STORE).get(key);
    request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
};

export default function EasyWorshipController() {
  const [inputTitle, setInputTitle] = useState(() => localStorage.getItem('ew_draft_title') || '');
  const [inputText, setInputText] = useState(() => localStorage.getItem('ew_draft_text') || '');

  const [liveText, setLiveText] = useState('');
  const [lastLiveText, setLastLiveText] = useState('');
  const [previewFontSize] = useState(() => {
    const saved = localStorage.getItem('ew_font_size');
    return saved ? parseInt(saved) : 100;
  });
  const [fontFamily] = useState(() => localStorage.getItem('ew_font_family') || 'Oswald, sans-serif');
  const [isBold] = useState(() => localStorage.getItem('ew_bold') !== 'false');
  const [isAllCaps] = useState(() => localStorage.getItem('ew_allcaps') !== 'false');
  const [bgType, setBgType] = useState<BackgroundType>('green');
  const [videoUrl, setVideoUrl] = useState(() => localStorage.getItem('ew_video_url') || '');
  const [videoInputMode, setVideoInputMode] = useState<VideoInputMode>('link');
  const [selectedVideoBackgroundId, setSelectedVideoBackgroundId] = useState<string | null>(() => localStorage.getItem('ew_selected_video_bg_id'));
  const [activeVideoBlobKey, setActiveVideoBlobKey] = useState<string | null>(null);
  const [liveSlideIndex, setLiveSlideIndex] = useState<number | null>(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [lastBroadcastAt, setLastBroadcastAt] = useState<number | null>(null);
  const draftUploadObjectUrlRef = useRef<string | null>(null);
  const persistedObjectUrlsRef = useRef<string[]>([]);
  const obsBroadcastTimerRef = useRef<number | null>(null);
  const obsBroadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastObsPayloadRef = useRef<string>('');
  const pendingObsPayloadRef = useRef<string>('');

  const [currentArchiveId, setCurrentArchiveId] = useState<string | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);
  const [uploadedVideoStoragePath, setUploadedVideoStoragePath] = useState<string | null>(null);

  const handleOpenProjector = () => {
    if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.focus();
      setIsProjectorOpen(true);
      return;
    }
    projectorWindowRef.current = window.open(
      '/projector?fs=1',
      'projector_output',
      'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
    );
    setIsProjectorOpen(!!projectorWindowRef.current && !projectorWindowRef.current.closed);
  };

  const [archiveFolders, setArchiveFolders] = useState<ArchiveFolder[]>(() => {
    const saved = localStorage.getItem('jamc_ew_folders');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'General Library', items: [] }];
  });
  const [videoBackgroundLibrary, setVideoBackgroundLibrary] = useState<VideoBackgroundItem[]>(() => {
    const saved = localStorage.getItem('jamc_ew_video_library');
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('jamc_ew_folders', JSON.stringify(archiveFolders));
  }, [archiveFolders]);

  useEffect(() => {
    localStorage.setItem('jamc_ew_video_library', JSON.stringify(videoBackgroundLibrary));
  }, [videoBackgroundLibrary]);

  useEffect(() => {
    const draftTimer = setTimeout(() => {
      localStorage.setItem('ew_draft_title', inputTitle);
      localStorage.setItem('ew_draft_text', inputText);
    }, 500);

    return () => clearTimeout(draftTimer);
  }, [inputTitle, inputText]);

  useEffect(() => {
    localStorage.setItem('ew_font_size', previewFontSize.toString());
  }, [previewFontSize]);

  useEffect(() => {
    localStorage.setItem('ew_font_family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('ew_bold', String(isBold));
  }, [isBold]);

  useEffect(() => {
    localStorage.setItem('ew_allcaps', String(isAllCaps));
  }, [isAllCaps]);

  useEffect(() => {
    localStorage.setItem('ew_video_url', videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    const matchingBackground = videoBackgroundLibrary.find(item => item.url === videoUrl);
    if (matchingBackground) {
      setSelectedVideoBackgroundId(prev => (prev === matchingBackground.id ? prev : matchingBackground.id));
      return;
    }

    if (selectedVideoBackgroundId && bgType === 'video') {
      setSelectedVideoBackgroundId(null);
    }
  }, [videoUrl, videoBackgroundLibrary, bgType, selectedVideoBackgroundId]);

  useEffect(() => {
    if (selectedVideoBackgroundId) {
      localStorage.setItem('ew_selected_video_bg_id', selectedVideoBackgroundId);
      return;
    }
    localStorage.removeItem('ew_selected_video_bg_id');
  }, [selectedVideoBackgroundId]);

  useEffect(() => {
    let active = true;

    const hydrateUploadedVideos = async () => {
      const raw = localStorage.getItem('jamc_ew_video_library');
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as VideoBackgroundItem[];
        const hydrated = await Promise.all(
          parsed.map(async item => {
            if (item.sourceType !== 'upload' || !item.blobKey) return item;

            const blob = await getVideoBlob(item.blobKey);
            if (!blob) return null;

            const objectUrl = URL.createObjectURL(blob);
            persistedObjectUrlsRef.current.push(objectUrl);
            return { ...item, url: objectUrl };
          })
        );

        if (active) {
          setVideoBackgroundLibrary(
            hydrated
              .filter((item): item is VideoBackgroundItem => item !== null)
              .map(item => ({
                ...item,
                url: item.sourceType === 'upload'
                  ? resolveBackgroundVideoUrl(item.url, item.storagePath)
                  : item.url,
              }))
          );
        }
      } catch {
        // Keep the current library state if hydration fails.
      }
    };

    hydrateUploadedVideos();

    return () => {
      active = false;
      persistedObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      persistedObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const isOpen = !!projectorWindowRef.current && !projectorWindowRef.current.closed;
      setIsProjectorOpen(isOpen);
      if (!isOpen) projectorWindowRef.current = null;
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (draftUploadObjectUrlRef.current) {
        URL.revokeObjectURL(draftUploadObjectUrlRef.current);
      }
    };
  }, []);

  const isOutputCleared = liveText === '';

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(OBS_STATE_CHANNEL);
    obsBroadcastChannelRef.current = channel;

    return () => {
      channel.close();
      obsBroadcastChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (obsBroadcastTimerRef.current !== null) {
        window.clearTimeout(obsBroadcastTimerRef.current);
      }
      pendingObsPayloadRef.current = '';
    };
  }, []);

  const broadcastData = async (
    text: string,
    size: number,
    bg: string,
    font: string,
    vidUrl: string = '',
    bold = isBold,
    allCaps = isAllCaps
  ) => {
    setLiveText(text);
    setLastBroadcastAt(Date.now());
    const data: ObsStatePayload = {
      text,
      fontSize: size,
      background: bg,
      fontFamily: font,
      videoUrl: bg === 'video' && activeVideoBlobKey ? '' : vidUrl,
      uploadedVideoKey: bg === 'video' ? activeVideoBlobKey : null,
      bold,
      allCaps,
      updatedAt: Date.now()
    };

    const requestSignature = JSON.stringify({
      text: data.text,
      fontSize: data.fontSize,
      background: data.background,
      fontFamily: data.fontFamily,
      videoUrl: data.videoUrl,
      uploadedVideoKey: data.uploadedVideoKey,
      bold: data.bold,
      allCaps: data.allCaps,
    });

    localStorage.setItem('jamc_live_display', JSON.stringify(data));
    obsBroadcastChannelRef.current?.postMessage(data);

    if (requestSignature === lastObsPayloadRef.current || requestSignature === pendingObsPayloadRef.current) {
      return;
    }

    if (obsBroadcastTimerRef.current !== null) {
      window.clearTimeout(obsBroadcastTimerRef.current);
    }

    pendingObsPayloadRef.current = requestSignature;
    obsBroadcastTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch(OBS_STATE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data),
        });
        lastObsPayloadRef.current = requestSignature;
      } catch (err) {
        pendingObsPayloadRef.current = '';
        console.error('Failed to broadcast data:', err);
        Toast.fire({ icon: 'error', title: 'Broadcast Failed!' });
        return;
      } finally {
        obsBroadcastTimerRef.current = null;
      }
      pendingObsPayloadRef.current = '';
    }, 120);
  };

  const quickSlides = useMemo(() => {
    if (!inputText.trim()) return [];
    return inputText
      .split(/\n\s*\n/)
      .map(block => {
        const lines = block.trim().split('\n');
        const firstLine = lines[0].trim();
        const headerRegex = /^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Tag|Ending|Instrumental)[^\]]*\]?:?$/i;
        if (headerRegex.test(firstLine) && lines.length > 1) {
          return { label: firstLine.replace(/[\[\]:]/g, '').toUpperCase(), text: lines.slice(1).join('\n').trim() };
        }
        return { label: null, text: block.trim() };
      })
      .filter(b => b.text.length > 0);
  }, [inputText]);

  const currentLiveSlide = liveSlideIndex !== null ? quickSlides[liveSlideIndex] : null;
  const slideCount = quickSlides.length;
  const lineCount = useMemo(() => inputText.split('\n').filter(line => line.trim()).length, [inputText]);
  const hasVideoBackground = bgType === 'video';
  const hasValidVideoUrl = videoUrl.trim().length > 0;
  const ambientBackgrounds = videoBackgroundLibrary.filter(item => item.mood === 'ambient' || item.mood === 'prayer');
  const slowBackgrounds = videoBackgroundLibrary.filter(item => item.speed === 'slow' && item.mood !== 'ambient' && item.mood !== 'prayer');
  const fastBackgrounds = videoBackgroundLibrary.filter(item => item.speed === 'fast' && item.mood !== 'ambient' && item.mood !== 'prayer');
  const otherBackgrounds = videoBackgroundLibrary.filter(
    item =>
      !ambientBackgrounds.some(ambient => ambient.id === item.id) &&
      !slowBackgrounds.some(slow => slow.id === item.id) &&
      !fastBackgrounds.some(fast => fast.id === item.id)
  );
  const lastBroadcastLabel = useMemo(() => {
    if (!lastBroadcastAt) return 'Waiting';
    return new Date(lastBroadcastAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }, [lastBroadcastAt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (liveSlideIndex !== null && quickSlides[liveSlideIndex]) {
        const updatedText = quickSlides[liveSlideIndex].text;
        if (updatedText !== liveText && liveText !== '') {
          broadcastData(updatedText, previewFontSize, bgType, fontFamily, videoUrl);
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [quickSlides, liveSlideIndex, liveText, previewFontSize, bgType, fontFamily, videoUrl]);

  useEffect(() => {
    if (liveText !== '') {
      broadcastData(liveText, previewFontSize, bgType, fontFamily, videoUrl, isBold, isAllCaps);
    }
  }, [previewFontSize, bgType, fontFamily, videoUrl, isBold, isAllCaps]);

  const handleClearEditor = () => {
    setInputTitle('');
    setInputText('');
    setLiveSlideIndex(null);
    setCurrentArchiveId(null);
    localStorage.removeItem('ew_draft_title');
    localStorage.removeItem('ew_draft_text');
    Toast.fire({ icon: 'success', title: 'Editor Cleared' });
  };

  const handleSaveText = async () => {
    if (!inputText.trim()) {
      Toast.fire({ icon: 'warning', title: 'Editor is empty!' });
      return;
    }

    if (currentArchiveId) {
      setArchiveFolders(prev =>
        prev.map(folder => ({
          ...folder,
          items: folder.items.map(item =>
            item.id === currentArchiveId
              ? { ...item, title: inputTitle.trim() || 'Untitled Document', text: inputText.trim(), date: new Date().toLocaleDateString() }
              : item
          )
        }))
      );
      Toast.fire({ icon: 'success', title: 'Updated in Folder!' });
      handleClearEditor();
      return;
    }

    const folderOptions: Record<string, string> = {};
    archiveFolders.forEach(f => {
      folderOptions[f.id] = `[Folder] ${f.name}`;
    });
    folderOptions.NEW_FOLDER = '[New] Create New Folder...';

    const { value: selectedFolderId } = await Swal.fire({
      title: 'Save to Folder',
      input: 'select',
      inputOptions: folderOptions,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
    });

    if (!selectedFolderId) return;

    let targetFolderId = selectedFolderId;

    if (selectedFolderId === 'NEW_FOLDER') {
      const { value: folderName } = await Swal.fire({
        title: 'New Folder Name',
        input: 'text',
        showCancelButton: true,
        inputValidator: value => (!value ? 'Folder name is required!' : null)
      });
      if (!folderName) return;

      targetFolderId = Date.now().toString();
      const newFolder: ArchiveFolder = { id: targetFolderId, name: folderName, items: [] };
      setArchiveFolders(prev => [...prev, newFolder]);
    }

    const newItem: SavedItem = {
      id: Date.now().toString(),
      title: inputTitle.trim() || 'Untitled Document',
      text: inputText.trim(),
      date: new Date().toLocaleDateString()
    };

    setArchiveFolders(prev =>
      prev.map(folder =>
        folder.id === targetFolderId
          ? { ...folder, items: [newItem, ...folder.items] }
          : folder
      )
    );

    Toast.fire({ icon: 'success', title: 'Saved to Library!' });
    handleClearEditor();
  };

  const handleBlackoutToggle = () => {
    if (!isOutputCleared) {
      setLastLiveText(liveText);
      broadcastData('', previewFontSize, bgType, fontFamily, videoUrl);
    } else {
      broadcastData(lastLiveText, previewFontSize, bgType, fontFamily, videoUrl);
      setLastLiveText('');
    }
  };

  const applyVideoBackground = (background: VideoBackgroundItem) => {
    setBgType('video');
    setVideoUrl(resolveBackgroundVideoUrl(background.url, background.storagePath));
    setSelectedVideoBackgroundId(background.id);
    setVideoInputMode(background.sourceType);
    setUploadedVideoStoragePath(background.storagePath || null);
    setActiveVideoBlobKey(null);
    Toast.fire({ icon: 'success', title: `${background.name} ready` });
  };

  const handleSaveVideoBackground = async () => {
    const trimmedUrl = videoUrl.trim();
    const isUploadMode = videoInputMode === 'upload';

    if (isUploadMode && (!uploadedVideoStoragePath || !trimmedUrl)) {
      Toast.fire({ icon: 'warning', title: 'Upload a video first' });
      return;
    }

    if (!isUploadMode && !trimmedUrl) {
      Toast.fire({ icon: 'warning', title: 'Add a video URL first' });
      return;
    }

    const existingBackground = isUploadMode
      ? videoBackgroundLibrary.find(item => item.sourceType === 'upload' && item.storagePath === uploadedVideoStoragePath)
      : videoBackgroundLibrary.find(item => item.sourceType === 'link' && item.url === trimmedUrl);
    if (existingBackground) {
      setSelectedVideoBackgroundId(existingBackground.id);
      Toast.fire({ icon: 'info', title: 'Already saved in library' });
      return;
    }

    const { isConfirmed, value } = await Swal.fire<{
      name: string;
      speed: BackgroundSpeed;
      mood: BackgroundMood;
    }>({
      title: 'Save Background',
      html: `
        <input id="ew-bg-name" class="swal2-input" placeholder="Background name" value="Sunday Motion">
        <select id="ew-bg-speed" class="swal2-input">
          <option value="slow">Slow</option>
          <option value="medium">Medium</option>
          <option value="fast">Fast</option>
        </select>
        <select id="ew-bg-mood" class="swal2-input">
          <option value="worship">Worship</option>
          <option value="praise">Praise</option>
          <option value="ambient">Ambient</option>
          <option value="prayer">Prayer</option>
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      preConfirm: () => {
        const popup = Swal.getPopup();
        const name = (popup?.querySelector('#ew-bg-name') as HTMLInputElement | null)?.value.trim() || '';
        const speed = ((popup?.querySelector('#ew-bg-speed') as HTMLSelectElement | null)?.value || 'slow') as BackgroundSpeed;
        const mood = ((popup?.querySelector('#ew-bg-mood') as HTMLSelectElement | null)?.value || 'worship') as BackgroundMood;

        if (!name) {
          Swal.showValidationMessage('Background name is required.');
          return null;
        }

        return { name, speed, mood };
      }
    });

    if (!isConfirmed) return;

    if (!value) return;

    const nextId = Date.now().toString();

    const newBackground: VideoBackgroundItem = {
      id: nextId,
      name: value.name,
      url: resolveBackgroundVideoUrl(videoUrl, isUploadMode ? uploadedVideoStoragePath : null),
      speed: value.speed,
      mood: value.mood,
      createdAt: Date.now(),
      sourceType: isUploadMode ? 'upload' : 'link',
      storagePath: isUploadMode ? uploadedVideoStoragePath || undefined : undefined
    };

    setVideoBackgroundLibrary(prev => [newBackground, ...prev]);
    setSelectedVideoBackgroundId(newBackground.id);
    Toast.fire({ icon: 'success', title: 'Saved to background library' });
  };

  const handleDeleteVideoBackground = async (backgroundId: string) => {
    const target = videoBackgroundLibrary.find(item => item.id === backgroundId);
    if (!target) return;

    const result = await Swal.fire({
      title: 'Delete Background?',
      text: `${target.name} will be removed from your library.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete'
    });

    if (!result.isConfirmed) return;

    if (target.sourceType === 'upload' && target.storagePath) {
      try {
        await instance.post('background-videos/delete', { path: target.storagePath });
      } catch (error) {
        console.error('Failed to delete uploaded background video:', error);
      }
    }

    setVideoBackgroundLibrary(prev => prev.filter(item => item.id !== backgroundId));
    if (selectedVideoBackgroundId === backgroundId) {
      setSelectedVideoBackgroundId(null);
    }
    Toast.fire({ icon: 'success', title: 'Background removed' });
  };

  const renderBackgroundSection = (title: string, description: string, items: VideoBackgroundItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-100">{title}</h3>
          <span className="px-2.5 py-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
            {items.length}
          </span>
          <p className="text-[10px] font-semibold text-zinc-400">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(background => {
            const isSelected = selectedVideoBackgroundId === background.id;
            return (
              <div key={background.id} className={`rounded-[2rem] border p-4 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/20 shadow-xl shadow-indigo-500/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40'
              }`}>
                <div className="aspect-video rounded-[1.4rem] overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black relative mb-4">
                  <video className="w-full h-full object-cover" src={background.url} autoPlay muted loop playsInline preload="metadata" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-full bg-black/70 text-white text-[8px] font-black uppercase tracking-widest">{background.speed}</span>
                    <span className="px-2 py-1 rounded-full bg-black/70 text-white text-[8px] font-black uppercase tracking-widest">{background.mood}</span>
                    <span className="px-2 py-1 rounded-full bg-black/70 text-white text-[8px] font-black uppercase tracking-widest">{background.sourceType}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{background.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Saved {new Date(background.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => applyVideoBackground(background)} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                      <Film className="w-4 h-4" /> Use Background
                    </button>
                    <button onClick={() => handleDeleteVideoBackground(background.id)} className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-800 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 px-4 relative min-h-screen font-sans bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-6 px-2">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500 text-white rounded-3xl shadow-xl shadow-indigo-500/20">
            <Presentation className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tighter">Worship Presenter</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${liveText ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-zinc-400'}`} />
              <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-none">{liveText ? 'Live Broadcast' : 'Screen Cleared'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleOpenProjector} className="flex items-center gap-2 px-7 py-4 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all border border-zinc-700">
            <Monitor className="w-4 h-4" /> Open Projector
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-2">
        <div className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${liveText ? 'bg-red-500/10 text-red-500' : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'}`}>
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Live Status</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{liveText ? 'Broadcasting now' : 'Output cleared'}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {currentLiveSlide ? `Slide ${liveSlideIndex! + 1} is active on screen.` : 'No slide is currently live.'}
          </p>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${isProjectorOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'}`}>
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Projector</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{isProjectorOpen ? 'Connected' : 'Window closed'}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Last push: {lastBroadcastLabel}</p>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Output Style</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 capitalize">{bgType} background</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {fontFamily.split(',')[0]} at {previewFontSize}px
          </p>
        </div>

        <div className={`rounded-[2rem] border px-5 py-4 shadow-sm backdrop-blur-md ${
          hasVideoBackground && !hasValidVideoUrl
            ? 'border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/30'
            : 'border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${hasVideoBackground && !hasValidVideoUrl ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'}`}>
              {hasVideoBackground && !hasValidVideoUrl ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Session</p>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{slideCount} slides ready</p>
            </div>
          </div>
          <p className={`text-xs font-semibold ${hasVideoBackground && !hasValidVideoUrl ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {hasVideoBackground && !hasValidVideoUrl ? 'Video background selected but no URL is set.' : `${lineCount} lyric lines prepared in the editor.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full mx-auto">
        <div className="w-full">
          <EasyWorshipEditor
            title={inputTitle}
            text={inputText}
            onTitleChange={setInputTitle}
            onTextChange={setInputText}
            onClearEditor={handleClearEditor}
            onSave={handleSaveText}
          />
        </div>

        <div className="w-full">
          <EasyWorshipSlides
            slides={quickSlides}
            liveSlideIndex={liveSlideIndex}
            isBlackout={liveText === ''}
            onSlideClick={(text, idx) => {
              setLiveSlideIndex(idx);
              broadcastData(text, previewFontSize, bgType, fontFamily, videoUrl);
            }}
            onBlackoutToggle={handleBlackoutToggle}
            isOutputCleared={isOutputCleared}
          />
        </div>
      </div>

      <div className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-zinc-100">Background Library</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Save fast, slow, and ambient motion backgrounds for one-click use</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Saved Backgrounds</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{videoBackgroundLibrary.length}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Slow / Fast</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{slowBackgrounds.length} / {fastBackgrounds.length}</p>
            </div>
            <button onClick={handleSaveVideoBackground} className="flex items-center gap-2 px-5 py-4 bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all">
              <Plus className="w-4 h-4" /> Save Current Video
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-8">
          <div className="space-y-5">
            {videoBackgroundLibrary.length === 0 ? (
              <div className="rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 px-8 py-14 text-center bg-zinc-50/70 dark:bg-zinc-950/40">
                <Film className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">No saved video backgrounds yet</p>
                <p className="text-xs font-semibold text-zinc-400 mt-2">Switch to `video`, paste an `.mp4` URL, then save it here.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {renderBackgroundSection('Slow', 'Gentle motion for worship flow.', slowBackgrounds)}
                {renderBackgroundSection('Fast', 'High-energy movement for praise.', fastBackgrounds)}
                {renderBackgroundSection('Ambient', 'Soft atmosphere for prayer and reflection.', ambientBackgrounds)}
                {renderBackgroundSection('Other', 'Everything else you saved.', otherBackgrounds)}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Quick Mix</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">Pick by service energy</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Slow Worship</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{slowBackgrounds.length}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Best for prayer, soaking, altar call.</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fast Praise</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{fastBackgrounds.length}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Best for openers and energetic songs.</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ambient / Prayer</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{ambientBackgrounds.length}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Soft motion for reflective moments.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">AI Prompt Starters</p>
              <div className="space-y-3">
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Slow</p>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mt-1">soft golden light rays through haze, cinematic worship background, slow motion, seamless loop, 16:9</p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Fast</p>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mt-1">energetic blue and gold light streaks, uplifting worship concert motion, seamless loop, 16:9</p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Ambient</p>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mt-1">floating particles, dark blue atmosphere, soft cinematic movement, prayer background, seamless loop, 16:9</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EasyWorshipArchives
        folders={archiveFolders}
        setFolders={setArchiveFolders}
        onLoad={item => {
          setInputTitle(item.title);
          setInputText(item.text);
          setLiveSlideIndex(null);
          setCurrentArchiveId(item.id);
          localStorage.setItem('ew_draft_title', item.title);
          localStorage.setItem('ew_draft_text', item.text);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
