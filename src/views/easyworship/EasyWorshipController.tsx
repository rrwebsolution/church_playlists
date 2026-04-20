import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { Presentation, Settings2, GripHorizontal, X, MonitorPlay, Type, Monitor, Activity, Clapperboard, Radio, AlertTriangle, Film, Plus, Sparkles, Trash2, LoaderCircle } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Draggable from 'react-draggable';
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
const PROJECTOR_SYNC_MESSAGE_TYPE = 'jamc-projector-sync';
const PROJECTOR_READY_MESSAGE_TYPE = 'jamc-projector-ready';
const LOCAL_BACKEND_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}`
    : '';
const CONFIGURED_BACKEND_BASE_URL = (import.meta.env.VITE_URL || '').replace(/\/+$/, '');
const BACKEND_BASE_URL = (
  isLocalObsHost
    ? (LOCAL_BACKEND_BASE_URL || window.location.origin)
    : (CONFIGURED_BACKEND_BASE_URL || window.location.origin)
).replace(/\/+$/, '');
const DEFAULT_MAX_BACKGROUND_VIDEO_MB = 25;
const parsedMaxBackgroundVideoMb = Number(import.meta.env.VITE_BACKGROUND_VIDEO_MAX_MB);
const MAX_BACKGROUND_VIDEO_MB = Number.isFinite(parsedMaxBackgroundVideoMb) && parsedMaxBackgroundVideoMb > 0
  ? parsedMaxBackgroundVideoMb
  : DEFAULT_MAX_BACKGROUND_VIDEO_MB;
const MAX_BACKGROUND_VIDEO_BYTES = MAX_BACKGROUND_VIDEO_MB * 1024 * 1024;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
};

const normalizeStoragePath = (value?: string | null) => {
  if (!value) return '';

  return value
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/^public\//i, '')
    .replace(/^storage\//i, '');
};

const resolveBackgroundVideoUrl = (url?: string | null, storagePath?: string | null) => {
  const trimmedUrl = url?.trim() || '';
  const normalizedStoragePath = normalizeStoragePath(storagePath);

  if (trimmedUrl.startsWith('blob:')) return trimmedUrl;
  if (normalizedStoragePath) {
    return `${BACKEND_BASE_URL}/storage/${normalizedStoragePath}`;
  }
  if (/^https?:\/\//i.test(trimmedUrl)) {
    try {
      const parsedUrl = new URL(trimmedUrl);

      // If the backend returns a localhost/private URL in production, rebuild it
      // against the configured backend base so deployed clients can actually reach it.
      if (!isLocalObsHost && isPrivateNetworkHost(parsedUrl.hostname) && normalizedStoragePath) {
        return `${BACKEND_BASE_URL}/storage/${normalizedStoragePath}`;
      }

      return trimmedUrl;
    } catch {
      return trimmedUrl;
    }
  }
  if (trimmedUrl.startsWith('/api/')) {
    return `${BACKEND_BASE_URL}${trimmedUrl}`;
  }
  if (trimmedUrl.startsWith('/storage/')) {
    return `${BACKEND_BASE_URL}${trimmedUrl}`;
  }
  if (/^storage\//i.test(trimmedUrl)) {
    return `${BACKEND_BASE_URL}/${trimmedUrl.replace(/^\/+/, '')}`;
  }

  const fallbackStoragePath = normalizeStoragePath(trimmedUrl);
  if (fallbackStoragePath && /^(public\/|storage\/|\/storage\/)/i.test(trimmedUrl)) {
    return `${BACKEND_BASE_URL}/storage/${fallbackStoragePath}`;
  }

  return trimmedUrl;
};

const FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Impact', value: 'Impact, fantasy' },
  { label: 'Georgia', value: 'Georgia, serif' },
];

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
  const savedLiveDisplay = (() => {
    try {
      const raw = localStorage.getItem('jamc_live_display');
      return raw ? JSON.parse(raw) as Partial<ObsStatePayload> : null;
    } catch {
      return null;
    }
  })();

  const [inputTitle, setInputTitle] = useState(() => localStorage.getItem('ew_draft_title') || '');
  const [inputText, setInputText] = useState(() => localStorage.getItem('ew_draft_text') || '');

  const [liveText, setLiveText] = useState(() => savedLiveDisplay?.text || '');
  const [lastLiveText, setLastLiveText] = useState(() => localStorage.getItem('ew_last_live_text') || '');
  const [previewFontSize, setPreviewFontSize] = useState(() => {
    const saved = localStorage.getItem('ew_font_size');
    return saved ? parseInt(saved) : 100;
  });
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('ew_font_family') || 'Oswald, sans-serif');
  const [isBold, setIsBold] = useState(() => localStorage.getItem('ew_bold') !== 'false');
  const [isAllCaps, setIsAllCaps] = useState(() => localStorage.getItem('ew_allcaps') !== 'false');
  const [bgType, setBgType] = useState<BackgroundType>(() => {
    const saved = localStorage.getItem('ew_bg_type');
    return (saved as BackgroundType) || 'green';
  });
  const [videoUrl, setVideoUrl] = useState(() => localStorage.getItem('ew_video_url') || '');
  const [videoLinkInput, setVideoLinkInput] = useState(() => localStorage.getItem('ew_video_link_input') || '');
  const [videoInputMode, setVideoInputMode] = useState<VideoInputMode>('link');
  const [selectedVideoBackgroundId, setSelectedVideoBackgroundId] = useState<string | null>(() => localStorage.getItem('ew_selected_video_bg_id'));
  const [activeVideoBlobKey, setActiveVideoBlobKey] = useState<string | null>(null);
  const [showMonitor, setShowMonitor] = useState(() => localStorage.getItem('ew_show_monitor') !== 'false');
  const [liveSlideIndex, setLiveSlideIndex] = useState<number | null>(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [lastBroadcastAt, setLastBroadcastAt] = useState<number | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const nodeRef = useRef(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const draftUploadObjectUrlRef = useRef<string | null>(null);
  const persistedObjectUrlsRef = useRef<string[]>([]);
  const obsBroadcastTimerRef = useRef<number | null>(null);
  const obsBroadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastObsPayloadRef = useRef<string>('');
  const pendingObsPayloadRef = useRef<string>('');
  const monitorFrameRef = useRef<HTMLDivElement | null>(null);
  const [monitorScale, setMonitorScale] = useState(0.25);

  const [currentArchiveId, setCurrentArchiveId] = useState<string | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
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
    localStorage.setItem('ew_video_link_input', videoLinkInput);
  }, [videoLinkInput]);

  useEffect(() => {
    localStorage.setItem('ew_bg_type', bgType);
  }, [bgType]);

  useEffect(() => {
    localStorage.setItem('ew_last_live_text', lastLiveText);
  }, [lastLiveText]);

  useEffect(() => {
    localStorage.setItem('ew_show_monitor', String(showMonitor));
  }, [showMonitor]);

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
    if (bgType !== 'video' || !selectedVideoBackgroundId) return;

    const selectedBackground = videoBackgroundLibrary.find(item => item.id === selectedVideoBackgroundId);
    if (!selectedBackground) return;

    const resolvedUrl = resolveBackgroundVideoUrl(selectedBackground.url, selectedBackground.storagePath);
    if (videoUrl !== resolvedUrl) {
      setVideoUrl(resolvedUrl);
    }

    if (videoInputMode !== selectedBackground.sourceType) {
      setVideoInputMode(selectedBackground.sourceType);
    }

    if (selectedBackground.sourceType === 'link' && videoLinkInput !== selectedBackground.url) {
      setVideoLinkInput(selectedBackground.url);
    }
  }, [bgType, selectedVideoBackgroundId, videoBackgroundLibrary, videoLinkInput]);

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
    const handleProjectorReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PROJECTOR_READY_MESSAGE_TYPE) return;

      const raw = localStorage.getItem('jamc_live_display');
      if (!raw) return;

      try {
        const payload = JSON.parse(raw) as ObsStatePayload;
        projectorWindowRef.current?.postMessage(
          { type: PROJECTOR_SYNC_MESSAGE_TYPE, payload },
          window.location.origin
        );
      } catch {
        // Ignore malformed projector sync cache.
      }
    };

    window.addEventListener('message', handleProjectorReady);
    return () => window.removeEventListener('message', handleProjectorReady);
  }, []);

  useEffect(() => {
    const frame = monitorFrameRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') return;

    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;

    const updateScale = () => {
      const nextScale = Math.min(
        frame.clientWidth / DESIGN_WIDTH,
        frame.clientHeight / DESIGN_HEIGHT
      );

      setMonitorScale(nextScale > 0 ? nextScale : 0.25);
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, [showMonitor]);

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
    projectorWindowRef.current?.postMessage(
      { type: PROJECTOR_SYNC_MESSAGE_TYPE, payload: data },
      window.location.origin
    );

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
  const selectedVideoBackground = videoBackgroundLibrary.find(item => item.id === selectedVideoBackgroundId) || null;
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
    if (!liveText || quickSlides.length === 0) {
      setLiveSlideIndex(prev => (prev === null ? prev : null));
      return;
    }

    setLiveSlideIndex(prev => {
      if (prev !== null && quickSlides[prev]?.text === liveText) return prev;
      const matchedIndex = quickSlides.findIndex(slide => slide.text === liveText);
      return matchedIndex >= 0 ? matchedIndex : null;
    });
  }, [liveText, quickSlides]);

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

  const handleUploadVideoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BACKGROUND_VIDEO_BYTES) {
      setUploadedVideoFile(null);
      setUploadedVideoStoragePath(null);
      setActiveVideoBlobKey(null);
      setVideoInputMode('upload');
      setBgType('video');
      setSelectedVideoBackgroundId(null);
      setVideoUrl('');
      Toast.fire({
        icon: 'warning',
        title: `Video is too large (${formatFileSize(file.size)}). Limit: ${MAX_BACKGROUND_VIDEO_MB} MB`
      });
      event.target.value = '';
      return;
    }

    if (draftUploadObjectUrlRef.current) {
      URL.revokeObjectURL(draftUploadObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    draftUploadObjectUrlRef.current = objectUrl;
    setUploadedVideoFile(file);
    setVideoInputMode('upload');
    setBgType('video');
    setSelectedVideoBackgroundId(null);
    setUploadedVideoStoragePath(null);
    setActiveVideoBlobKey(null);
    setVideoUrl(objectUrl);
    setIsUploadingVideo(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await instance.post('background-videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = response.data?.url;
      const storagePath = response.data?.path;

      if (!uploadedUrl || !storagePath) {
        throw new Error('Upload response missing URL or path');
      }

      setVideoUrl(resolveBackgroundVideoUrl(uploadedUrl, storagePath));
      setUploadedVideoStoragePath(storagePath);
      Toast.fire({ icon: 'success', title: `${file.name} uploaded` });
    } catch (error) {
      console.error('Failed to upload background video:', error);
      setVideoUrl('');
      setUploadedVideoStoragePath(null);
      setUploadedVideoFile(null);
      const errorTitle = axios.isAxiosError(error) && error.response?.status === 413
        ? `Upload rejected. Server limit is smaller than ${formatFileSize(file.size)}`
        : 'Video upload failed';
      Toast.fire({ icon: 'error', title: errorTitle });
    } finally {
      setIsUploadingVideo(false);
      event.target.value = '';
    }
  };

  const applyVideoBackground = (background: VideoBackgroundItem) => {
    setBgType('video');
    setVideoUrl(resolveBackgroundVideoUrl(background.url, background.storagePath));
    setSelectedVideoBackgroundId(background.id);
    setVideoInputMode(background.sourceType);
    setVideoLinkInput(background.sourceType === 'link' ? background.url : '');
    setUploadedVideoFile(null);
    setUploadedVideoStoragePath(background.storagePath || null);
    setActiveVideoBlobKey(null);
    Toast.fire({ icon: 'success', title: `${background.name} ready` });
  };

  const handleSaveVideoBackground = async () => {
    const trimmedUrl = videoInputMode === 'link' ? videoLinkInput.trim() : videoUrl.trim();
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
      const resolvedExistingUrl = resolveBackgroundVideoUrl(existingBackground.url, existingBackground.storagePath);
      setBgType('video');
      setVideoUrl(resolvedExistingUrl);
      setSelectedVideoBackgroundId(existingBackground.id);
      setVideoInputMode(existingBackground.sourceType);
      setVideoLinkInput(existingBackground.sourceType === 'link' ? existingBackground.url : '');
      setUploadedVideoFile(null);
      setUploadedVideoStoragePath(existingBackground.storagePath || null);
      broadcastData(liveText, previewFontSize, 'video', fontFamily, resolvedExistingUrl, isBold, isAllCaps);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
      Toast.fire({ icon: 'info', title: 'Already saved in library' });
      return;
    }

    const { isConfirmed, value } = await Swal.fire<{
      name: string;
      speed: BackgroundSpeed;
      mood: BackgroundMood;
    }>({
      title: 'Save Background',
      icon: 'question',
      width: 520,
      showCloseButton: true,
      confirmButtonText: 'Save Background',
      cancelButtonText: 'Cancel',
      html: `
        <div style="display:grid;gap:12px;text-align:left;padding-top:8px;">
          <label style="display:grid;gap:6px;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#71717a;">Background name</span>
            <input id="ew-bg-name" class="swal2-input" placeholder="Sunday Motion" value="Sunday Motion" style="margin:0;width:100%;">
          </label>
          <label style="display:grid;gap:6px;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#71717a;">Speed</span>
            <select id="ew-bg-speed" class="swal2-input" style="margin:0;width:100%;">
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </label>
          <label style="display:grid;gap:6px;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#71717a;">Mood</span>
            <select id="ew-bg-mood" class="swal2-input" style="margin:0;width:100%;">
              <option value="worship">Worship</option>
              <option value="praise">Praise</option>
              <option value="ambient">Ambient</option>
              <option value="prayer">Prayer</option>
            </select>
          </label>
        </div>
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
      url: isUploadMode
        ? resolveBackgroundVideoUrl(videoUrl, uploadedVideoStoragePath)
        : trimmedUrl,
      speed: value.speed,
      mood: value.mood,
      createdAt: Date.now(),
      sourceType: isUploadMode ? 'upload' : 'link',
      storagePath: isUploadMode ? uploadedVideoStoragePath || undefined : undefined
    };

    const resolvedNewUrl = resolveBackgroundVideoUrl(newBackground.url, newBackground.storagePath);
    setVideoBackgroundLibrary(prev => [newBackground, ...prev]);
    setBgType('video');
    setVideoUrl(resolvedNewUrl);
    setSelectedVideoBackgroundId(newBackground.id);
    setVideoLinkInput(newBackground.sourceType === 'link' ? newBackground.url : '');
    setUploadedVideoFile(null);
    setUploadedVideoStoragePath(newBackground.storagePath || null);
    setActiveVideoBlobKey(null);
    setVideoInputMode(newBackground.sourceType);
    broadcastData(liveText, previewFontSize, 'video', fontFamily, resolvedNewUrl, isBold, isAllCaps);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
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
          {!showMonitor && (
            <button onClick={() => setShowMonitor(true)} className="flex items-center gap-2 px-7 py-4 bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all">
              <MonitorPlay className="w-4 h-4" /> Show Live Monitor
            </button>
          )}
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

      {showMonitor && (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" cancel=".monitor-close,.no-drag,button,input,select,option" bounds="parent">
          <div ref={nodeRef} className="fixed top-28 right-3 md:right-6 lg:right-8 z-100 w-[min(calc(100vw-1.5rem),42rem)] bg-zinc-950 p-4 md:p-5 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between px-2 cursor-move drag-handle">
              <div className="flex items-center gap-2 text-zinc-500">
                <GripHorizontal className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Live Monitor</span>
              </div>
              <button onClick={() => setShowMonitor(false)} className="monitor-close text-zinc-600 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={monitorFrameRef} className={`no-drag aspect-video w-full rounded-2xl border border-zinc-900 overflow-hidden relative transition-all duration-1000 group/monitor ${bgType === 'praise' ? 'bg-indigo-900 animate-pulse' : bgType === 'worship' ? 'bg-zinc-950' : bgType === 'green' ? 'bg-[#00FF00]' : 'bg-black'}`}>
              <div
                className="absolute left-1/2 top-1/2 origin-center"
                style={{
                  width: '1920px',
                  height: '1080px',
                  transform: `translate(-50%, -50%) scale(${monitorScale})`,
                }}
              >
                {bgType === 'video' && videoUrl && (
                  <video key={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" src={videoUrl} />
                )}
                <div className="absolute inset-0 flex items-center justify-center p-24">
                  <p
                    className="text-white text-center leading-tight whitespace-pre-wrap select-none relative z-10 w-full"
                    style={{
                      fontSize: `${previewFontSize}px`,
                      fontFamily,
                      fontWeight: isBold ? 'bold' : 'normal',
                      textTransform: isAllCaps ? 'uppercase' : 'none',
                      WebkitTextStroke: '2px #000',
                      textShadow: '0 8px 40px rgba(0,0,0,0.85)'
                    }}
                  >
                    {liveText || (
                      <span className="text-white/10 italic text-[42px] tracking-[0.4em]" style={{ fontWeight: 'normal', WebkitTextStroke: 'unset', textTransform: 'none' }}>
                        CLEARED
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="absolute inset-0 z-10 rounded-2xl bg-black/85 backdrop-blur-sm opacity-0 group-hover/monitor:opacity-100 transition-opacity duration-200 flex flex-col gap-2 p-4 overflow-y-auto pointer-events-none">
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 mb-1">Projector Output</p>
                <div className="flex-1 overflow-y-auto">
                  {liveText ? (
                    <p className="text-white text-[11px] font-bold leading-relaxed whitespace-pre-wrap">{liveText}</p>
                  ) : (
                    <p className="text-zinc-600 italic text-[10px]">No output. Screen is cleared.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-700 mt-auto">
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[8px] font-bold uppercase tracking-wider">BG: {bgType}</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[8px] font-bold uppercase tracking-wider">Size: {previewFontSize}px</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[8px] font-bold uppercase tracking-wider" style={{ fontFamily }}>{fontFamily.split(',')[0]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${isBold ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>Bold: {isBold ? 'ON' : 'OFF'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${isAllCaps ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>Caps: {isAllCaps ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>

            <div className="no-drag space-y-4 px-1">
              <div className="rounded-[1.6rem] border border-zinc-800 bg-zinc-900/80 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">Monitor Status</p>
                    <p className="text-[11px] font-bold text-zinc-100">{liveText ? 'Live output on screen' : 'Screen is currently cleared'}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isProjectorOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
                    {isProjectorOpen ? 'Projector On' : 'Projector Off'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
                    <p className="text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">Live Slide</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-200">{currentLiveSlide ? `#${liveSlideIndex! + 1}` : 'None'}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
                    <p className="text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">Last Push</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-200">{lastBroadcastLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-zinc-800 bg-zinc-900/80 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">Background Presets</p>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Active: {bgType}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['none', 'praise', 'worship', 'green', 'video'] as BackgroundType[]).map(t => (
                    <button key={t} onClick={() => setBgType(t)} className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${bgType === t ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>
                      {t}
                    </button>
                  ))}
                </div>

                {bgType === 'video' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setVideoInputMode('link');
                          setUploadedVideoFile(null);
                          setUploadedVideoStoragePath(null);
                          setActiveVideoBlobKey(null);
                          setVideoLinkInput(selectedVideoBackground?.sourceType === 'link' ? selectedVideoBackground.url : '');
                          if (uploadInputRef.current) {
                            uploadInputRef.current.value = '';
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                          videoInputMode === 'link' ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'
                        }`}
                      >
                        Link
                      </button>
                      <button
                        onClick={() => setVideoInputMode('upload')}
                        className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                          videoInputMode === 'upload' ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'
                        }`}
                      >
                        Upload Video
                      </button>
                    </div>

                    {videoInputMode === 'link' ? (
                      <>
                        <input
                          key="link-url-input"
                          type="text"
                          placeholder="Paste video URL (.mp4)..."
                          value={videoLinkInput}
                          onChange={(e) => {
                            setUploadedVideoFile(null);
                            setUploadedVideoStoragePath(null);
                            setVideoLinkInput(e.target.value);
                          }}
                          className={`w-full text-[9px] rounded-xl px-3 py-2 border placeholder-zinc-700 outline-none ${
                            videoLinkInput.trim().length > 0 ? 'bg-zinc-900 text-zinc-300 border-zinc-800 focus:border-indigo-500' : 'bg-amber-950/30 text-amber-100 border-amber-800/70 focus:border-amber-500'
                          }`}
                        />
                        {!videoLinkInput.trim() && (
                          <p className="text-[8px] font-bold uppercase tracking-widest text-amber-400">Add a valid video source to avoid a blank background.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          key="file-upload-input"
                          ref={uploadInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={handleUploadVideoSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => uploadInputRef.current?.click()}
                          disabled={isUploadingVideo}
                          className="w-full px-3 py-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 text-zinc-300 text-[9px] font-black uppercase tracking-widest hover:border-indigo-500 hover:text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {isUploadingVideo ? (
                            <>
                              <LoaderCircle className="w-4 h-4 animate-spin" />
                              Uploading video...
                            </>
                          ) : uploadedVideoFile ? (
                            `Selected: ${uploadedVideoFile.name}`
                          ) : (
                            'Choose MP4 / WebM / OGG file'
                          )}
                        </button>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Upload sends the file to your Laravel backend for OBS-safe playback. Max: {MAX_BACKGROUND_VIDEO_MB} MB.</p>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={handleSaveVideoBackground} className="flex-1 px-3 py-2 rounded-xl bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
                        Save to Library
                      </button>
                      {selectedVideoBackground && (
                        <span className="px-2 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-[8px] font-bold uppercase tracking-widest text-zinc-400">
                          {selectedVideoBackground.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[1.6rem] border border-zinc-800 bg-zinc-900/80 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">Typography</p>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">{previewFontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <Type className="w-3 h-3 text-zinc-600 shrink-0" />
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="flex-1 bg-zinc-900 text-zinc-300 text-[9px] font-bold rounded-xl px-2 py-2 border border-zinc-800 outline-none focus:border-indigo-500 cursor-pointer"
                    style={{ fontFamily }}
                  >
                    {FONTS.map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                    ))}
                  </select>
                  <button onClick={() => setIsBold(b => !b)} className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all ${isBold ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>Bold</button>
                  <button onClick={() => setIsAllCaps(c => !c)} className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all ${isAllCaps ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500'}`}>Caps</button>
                </div>

                <div className="flex items-center gap-2">
                  <Settings2 className="w-3 h-3 text-zinc-600 shrink-0" />
                  <button onClick={() => setPreviewFontSize(s => Math.max(20, s - 1))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-black transition-colors shrink-0">-</button>
                  <input type="range" min="20" max="200" value={previewFontSize} onChange={(e) => setPreviewFontSize(parseInt(e.target.value))} className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                  <button onClick={() => setPreviewFontSize(s => Math.min(200, s + 1))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-black transition-colors shrink-0">+</button>
                  <span className="text-[10px] font-bold text-zinc-500 tabular-nums w-11 text-right">{previewFontSize}px</span>
                </div>
              </div>
            </div>
          </div>
        </Draggable>
      )}

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
