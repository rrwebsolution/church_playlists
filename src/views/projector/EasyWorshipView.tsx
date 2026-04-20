import { useCallback, useEffect, useRef, useState } from 'react';

type BackgroundType = 'none' | 'praise' | 'worship' | 'green' | 'video';

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

const API_URL = isLocalObsHost
  ? '/api/obs-state'
  : (import.meta.env.VITE_OBS_STATE_URL || '/api/obs-state');
const STREAM_URL = `${API_URL}/stream`;
const OBS_STATE_CHANNEL = 'jamc-obs-state';
const PROJECTOR_SYNC_MESSAGE_TYPE = 'jamc-projector-sync';
const PROJECTOR_READY_MESSAGE_TYPE = 'jamc-projector-ready';
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

const getObsLyricsText = (text: string) => {
  const trimmedText = text.trim();
  if (!trimmedText) return '';

  const stanzaBlocks = trimmedText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (stanzaBlocks.length >= 2) {
    return stanzaBlocks.slice(0, 2).join('\n\n');
  }

  const lines = trimmedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 4) {
    return lines.join('\n');
  }

  return [lines.slice(0, 4).join('\n'), lines.slice(4, 8).join('\n')]
    .filter(Boolean)
    .join('\n\n');
};

export default function EasyWorshipView() {
  const searchParams = new URLSearchParams(window.location.search);
  const isObsLyricsOnly = searchParams.get('obs') === 'lyrics';
  const [lyrics, setLyrics] = useState('');
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [fontFamily, setFontFamily] = useState('Oswald, sans-serif');
  const [isBold, setIsBold] = useState(true);
  const [isAllCaps, setIsAllCaps] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);
  const [resolvedUploadedVideoUrl, setResolvedUploadedVideoUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [needsFullscreen, setNeedsFullscreen] = useState(
    searchParams.get('fs') === '1'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastUpdatedAt = useRef(0);
  const lyricsRef = useRef(lyrics);
  const uploadedVideoObjectUrlRef = useRef<string | null>(null);
  lyricsRef.current = lyrics;

  const displayedLyrics = isObsLyricsOnly ? getObsLyricsText(lyrics) : lyrics;

  const handleEnterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {});
    setNeedsFullscreen(false);
  };

  const applyData = useCallback((data: any) => {
    if (!data || (data.updatedAt && data.updatedAt <= lastUpdatedAt.current)) return;
    if (data.updatedAt) lastUpdatedAt.current = data.updatedAt;

    const newText = data.text ?? '';

    if (newText === lyricsRef.current) {
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      if (data.uploadedVideoKey !== undefined) setUploadedVideoKey(data.uploadedVideoKey);
      if (data.bold !== undefined) setIsBold(data.bold);
      if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
      return;
    }

    const isClearing = newText.trim() === '';
    const wasCleared = lyricsRef.current.trim() === '';

    if (isClearing) {
      setIsVisible(false);
      setTimeout(() => {
        setLyrics('');
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.background) setBgType(data.background);
        if (data.fontFamily) setFontFamily(data.fontFamily);
        if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
        if (data.uploadedVideoKey !== undefined) setUploadedVideoKey(data.uploadedVideoKey);
        if (data.bold !== undefined) setIsBold(data.bold);
        if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
      }, 300);
      return;
    }

    if (wasCleared) {
      setLyrics(newText);
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      if (data.uploadedVideoKey !== undefined) setUploadedVideoKey(data.uploadedVideoKey);
      if (data.bold !== undefined) setIsBold(data.bold);
      if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
      setIsVisible(true);
      return;
    }

    setLyrics(newText);
    if (data.fontSize) setFontSize(data.fontSize);
    if (data.background) setBgType(data.background);
    if (data.fontFamily) setFontFamily(data.fontFamily);
    if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
    if (data.uploadedVideoKey !== undefined) setUploadedVideoKey(data.uploadedVideoKey);
    if (data.bold !== undefined) setIsBold(data.bold);
    if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    let active = true;

    const resolveUploadedVideo = async () => {
      if (!uploadedVideoKey) {
        if (uploadedVideoObjectUrlRef.current) {
          URL.revokeObjectURL(uploadedVideoObjectUrlRef.current);
          uploadedVideoObjectUrlRef.current = null;
        }
        setResolvedUploadedVideoUrl('');
        return;
      }

      const blob = await getVideoBlob(uploadedVideoKey).catch(() => null);
      if (!active || !blob) {
        setResolvedUploadedVideoUrl('');
        return;
      }

      if (uploadedVideoObjectUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoObjectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(blob);
      uploadedVideoObjectUrlRef.current = objectUrl;
      setResolvedUploadedVideoUrl(objectUrl);
    };

    resolveUploadedVideo();

    return () => {
      active = false;
    };
  }, [uploadedVideoKey]);

  useEffect(() => {
    return () => {
      if (uploadedVideoObjectUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isObsLyricsOnly) return;

    const previousBodyBackground = document.body.style.background;
    const previousHtmlBackground = document.documentElement.style.background;

    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';

    return () => {
      document.body.style.background = previousBodyBackground;
      document.documentElement.style.background = previousHtmlBackground;
    };
  }, [isObsLyricsOnly]);

  useEffect(() => {
    const syncFromLocalStorage = () => {
      const raw = localStorage.getItem('jamc_live_display');
      if (!raw) return;
      try {
        applyData(JSON.parse(raw));
      } catch {}
    };

    const syncOnFocus = () => {
      syncFromLocalStorage();
    };

    window.addEventListener('storage', syncFromLocalStorage);
    window.addEventListener('focus', syncOnFocus);
    window.addEventListener('pageshow', syncOnFocus);
    syncFromLocalStorage();

    return () => {
      window.removeEventListener('storage', syncFromLocalStorage);
      window.removeEventListener('focus', syncOnFocus);
      window.removeEventListener('pageshow', syncOnFocus);
    };
  }, [applyData]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PROJECTOR_SYNC_MESSAGE_TYPE) return;
      applyData(event.data.payload);
    };

    window.addEventListener('message', handleMessage);

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: PROJECTOR_READY_MESSAGE_TYPE }, window.location.origin);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [applyData]);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    let stream: EventSource | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(OBS_STATE_CHANNEL);
      channel.onmessage = (event) => {
        applyData(event.data);
      };
    }

    if (typeof EventSource !== 'undefined') {
      stream = new EventSource(STREAM_URL);

      stream.addEventListener('obs-state', (event) => {
        try {
          applyData(JSON.parse((event as MessageEvent).data));
        } catch {}
      });

      stream.onmessage = (event) => {
        try {
          applyData(JSON.parse(event.data));
        } catch {}
      };
    }

    return () => {
      channel?.close();
      stream?.close();
    };
  }, [applyData]);

  const getBgClass = (type: BackgroundType) => {
    if (isObsLyricsOnly) return 'bg-transparent';
    if (type === 'praise') return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 animate-gradient-fast';
    if (type === 'worship') return 'bg-gradient-to-t from-black via-indigo-950 to-black animate-gradient-slow';
    if (type === 'green') return 'bg-[#00FF00]';
    return 'bg-black';
  };

  return (
    <div className={`w-screen h-screen flex flex-col justify-center items-center p-10 md:p-24 overflow-hidden select-none transition-colors duration-1000 relative ${getBgClass(bgType)}`}>
      {needsFullscreen && (
        <button
          onClick={handleEnterFullscreen}
          className="absolute inset-0 z-50 w-full h-full bg-black flex flex-col items-center justify-center gap-4 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h4.5M3.75 3.75v4.5M3.75 3.75l5.25 5.25M20.25 3.75h-4.5m4.5 0v4.5m0-4.5-5.25 5.25M3.75 20.25h4.5m-4.5 0v-4.5m0 4.5 5.25-5.25M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5-5.25-5.25" />
          </svg>
          <span className="text-white/40 text-sm font-black uppercase tracking-widest">Click to enter fullscreen</span>
        </button>
      )}

      {!isObsLyricsOnly && bgType === 'video' && (resolvedUploadedVideoUrl || videoUrl) && (
        <video
          ref={videoRef}
          key={resolvedUploadedVideoUrl || videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={resolvedUploadedVideoUrl || videoUrl}
        />
      )}

      <div
        className={`transition-all duration-500 ease-in-out transform w-full flex justify-center relative z-10 ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{
          maxWidth: isObsLyricsOnly ? '70%' : '95%',
        }}
      >
        <h1
          className="text-white text-center font-bold leading-[1.2] tracking-wide"
          style={{
            fontSize: `${isObsLyricsOnly ? Math.max(42, Math.round(fontSize * 0.82)) : fontSize}px`,
            fontFamily,
            fontWeight: isBold ? 'bold' : 'normal',
            textTransform: isAllCaps ? 'uppercase' : 'none',
            textShadow: isObsLyricsOnly
              ? '0px 4px 18px rgba(0,0,0,0.95), 0px 0px 8px rgba(0,0,0,0.75)'
              : '0px 4px 40px rgba(0,0,0,1), 0px 0px 20px rgba(0,0,0,0.8)'
          }}
        >
          <span className="whitespace-pre-wrap">{displayedLyrics}</span>
        </h1>
      </div>
    </div>
  );
}
