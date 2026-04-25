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

const CONFIGURED_OBS_STATE_URL = import.meta.env.VITE_OBS_STATE_URL || '';
const API_URL = CONFIGURED_OBS_STATE_URL || (isLocalObsHost ? '/api/obs-state' : '/api/obs-state');
const STREAM_URL = `${API_URL}/stream`;
const isLocalObsApi =
  typeof window !== 'undefined' &&
  (() => {
    try {
      return isPrivateNetworkHost(new URL(API_URL, window.location.origin).hostname);
    } catch {
      return isLocalObsHost;
    }
  })();
const SHOULD_USE_OBS_STREAM =
  isLocalObsApi || import.meta.env.VITE_OBS_STATE_STREAM === 'true';
const SHOULD_USE_LOCAL_PROJECTOR_SYNC =
  isLocalObsHost || import.meta.env.VITE_PROJECTOR_LOCAL_SYNC === 'true';
const OBS_STATE_FAST_POLL_INTERVAL_MS = 250;
const OBS_STATE_IDLE_POLL_INTERVAL_MS = 200;
const OBS_STATE_FAST_POLL_WINDOW_MS = 15000;
const OBS_STATE_REQUEST_TIMEOUT_MS = 3000;
const OBS_STATE_STREAM_FALLBACK_DELAY_MS = 5000;
const OBS_STATE_CHANNEL = 'jamc-obs-state';
const PROJECTOR_SYNC_MESSAGE_TYPE = 'jamc-projector-sync';
const PROJECTOR_READY_MESSAGE_TYPE = 'jamc-projector-ready';
const PROJECTOR_SCENE_STORAGE_KEY = 'jamc_projector_scene';
const PROJECTOR_SCENE_SYNC_TYPE = 'jamc-projector-scene-sync';
const VIDEO_LIBRARY_DB = 'ew-video-library';
const VIDEO_LIBRARY_STORE = 'videos';

const withCacheBuster = (url: string) => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_obsTs=${Date.now()}`;
};

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

export default function EasyWorshipView() {
  const searchParams = new URLSearchParams(window.location.search);
  const [lyrics, setLyrics] = useState('');
  const [fontSize, setFontSize] = useState(60);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [fontFamily, setFontFamily] = useState('Oswald, sans-serif');
  const [isBold, setIsBold] = useState(true);
  const [isAllCaps, setIsAllCaps] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);
  const [resolvedUploadedVideoUrl, setResolvedUploadedVideoUrl] = useState('');
  const [projectorScene, setProjectorScene] = useState<any>(null);
  const [needsFullscreen, setNeedsFullscreen] = useState(
    searchParams.get('fs') === '1'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastUpdatedAt = useRef(0);
  const lyricsRef = useRef(lyrics);
  const isOutputClearedRef = useRef(true);
  const uploadedVideoObjectUrlRef = useRef<string | null>(null);
  const pollControlRef = useRef<{
    start: (delay?: number) => void;
    stop: () => void;
    hasStream: () => boolean;
  } | null>(null);
  lyricsRef.current = lyrics;

  const isAnnouncementMode = projectorScene?.mode === 'announcement' && projectorScene?.payload;

  const handleEnterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {});
    setNeedsFullscreen(false);
  };

  const applyData = useCallback((data: any) => {
    if (projectorScene?.mode === 'announcement') return;
    if (!data) return;

    const incomingVersion = Math.max(
      Number(data.clientSequence || 0),
      Number(data.updatedAt || 0)
    );

    if (incomingVersion && incomingVersion < lastUpdatedAt.current) return;
    if (incomingVersion) lastUpdatedAt.current = incomingVersion;

    const newText = data.text ?? '';
    isOutputClearedRef.current = newText.trim() === '';
    const applyVisualState = () => {
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      if (data.uploadedVideoKey !== undefined) setUploadedVideoKey(data.uploadedVideoKey);
      if (data.bold !== undefined) setIsBold(data.bold);
      if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
    };

    if (newText === lyricsRef.current) {
      applyVisualState();
      return;
    }

    const isClearing = newText.trim() === '';

    if (isClearing) {
      setLyrics('');
      applyVisualState();
      return;
    }

    setLyrics(newText);
    applyVisualState();
  }, [projectorScene]);

  const applyProjectorScene = useCallback((scene: any) => {
    if (!scene) return;

    if (scene.mode === 'announcement') {
      localStorage.removeItem(PROJECTOR_SCENE_STORAGE_KEY);
      setProjectorScene(null);
      return;
    }

    setProjectorScene(null);

    const raw = localStorage.getItem('jamc_live_display');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      setLyrics(data.text ?? '');
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.background) setBgType(data.background);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.videoUrl !== undefined) setVideoUrl(data.videoUrl);
      if (data.uploadedVideoKey !== undefined) setUploadedVideoKey(data.uploadedVideoKey);
      if (data.bold !== undefined) setIsBold(data.bold);
      if (data.allCaps !== undefined) setIsAllCaps(data.allCaps);
    } catch {}
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
    if (!SHOULD_USE_LOCAL_PROJECTOR_SYNC) return;

    const syncFromLocalStorage = () => {
      const raw = localStorage.getItem('jamc_live_display');
      if (!raw) return;
      try {
        applyData(JSON.parse(raw));
      } catch {}
    };

    const syncProjectorScene = () => {
      const raw = localStorage.getItem(PROJECTOR_SCENE_STORAGE_KEY);
      if (!raw) return;

      try {
        applyProjectorScene(JSON.parse(raw));
      } catch {}
    };

    const syncOnFocus = () => {
      syncProjectorScene();
      syncFromLocalStorage();
    };

    window.addEventListener('storage', syncFromLocalStorage);
    window.addEventListener('storage', syncProjectorScene);
    window.addEventListener('focus', syncOnFocus);
    window.addEventListener('pageshow', syncOnFocus);
    syncProjectorScene();
    syncFromLocalStorage();

    return () => {
      window.removeEventListener('storage', syncFromLocalStorage);
      window.removeEventListener('storage', syncProjectorScene);
      window.removeEventListener('focus', syncOnFocus);
      window.removeEventListener('pageshow', syncOnFocus);
    };
  }, [applyData, applyProjectorScene]);

  useEffect(() => {
    if (!SHOULD_USE_LOCAL_PROJECTOR_SYNC) return;

    const resumeProjectorSync = (payload?: any) => {
      if (payload) {
        const nextText = String(payload.text ?? '').trim();
        if (nextText) {
          pollControlRef.current?.start();
        } else {
          pollControlRef.current?.stop();
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === PROJECTOR_SCENE_SYNC_TYPE) {
        applyProjectorScene(event.data.payload);
        return;
      }
      if (event.data?.type !== PROJECTOR_SYNC_MESSAGE_TYPE) return;
      resumeProjectorSync(event.data.payload);
      applyData(event.data.payload);
    };

    window.addEventListener('message', handleMessage);

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: PROJECTOR_READY_MESSAGE_TYPE }, window.location.origin);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [applyData, applyProjectorScene]);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    let stream: EventSource | null = null;
    let pollTimer: number | null = null;
    let streamFallbackTimer: number | null = null;
    let isPolling = false;
    let stopped = false;
    let lastSeenVersion = lastUpdatedAt.current;
    let lastActivityAt = Date.now();

    const clearStreamFallbackTimer = () => {
      if (streamFallbackTimer !== null) {
        window.clearTimeout(streamFallbackTimer);
        streamFallbackTimer = null;
      }
    };

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const shouldFullyPausePolling = () =>
      isOutputClearedRef.current && SHOULD_USE_LOCAL_PROJECTOR_SYNC;

    const fetchLatestState = async () => {
      if (isPolling || stopped) return;
      isPolling = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), OBS_STATE_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(withCacheBuster(API_URL), {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          const incomingVersion = Math.max(
            Number(data.clientSequence || 0),
            Number(data.updatedAt || 0)
          );

          if (incomingVersion && incomingVersion !== lastSeenVersion) {
            lastSeenVersion = incomingVersion;
            lastActivityAt = Date.now();
          }

          applyData(data);
        }
      } catch {
        // Polling is a fallback path for OBS/projector sync, so keep it quiet and retry.
      } finally {
        window.clearTimeout(timeoutId);
        isPolling = false;
      }
    };

    const startPolling = (delay = 0) => {
      if (pollTimer !== null || stopped) return;

      const poll = async () => {
        pollTimer = null;
        await fetchLatestState();

        if (!stopped) {
          if (shouldFullyPausePolling()) return;

          const recentlyChanged = Date.now() - lastActivityAt < OBS_STATE_FAST_POLL_WINDOW_MS;
          const nextDelay = recentlyChanged
            ? OBS_STATE_FAST_POLL_INTERVAL_MS
            : OBS_STATE_IDLE_POLL_INTERVAL_MS;

          pollTimer = window.setTimeout(
            poll,
            nextDelay
          );
        }
      };

      pollTimer = window.setTimeout(poll, delay);
    };

    pollControlRef.current = {
      start: (delay = 0) => {
        if (stream) return;
        startPolling(delay);
      },
      stop: () => {
        stopPolling();
      },
      hasStream: () => stream !== null,
    };

    const schedulePollingFallback = () => {
      if (pollTimer !== null || streamFallbackTimer !== null || stopped) return;

      streamFallbackTimer = window.setTimeout(() => {
        streamFallbackTimer = null;
        stream?.close();
        stream = null;
        startPolling();
      }, OBS_STATE_STREAM_FALLBACK_DELAY_MS);
    };

    if (SHOULD_USE_LOCAL_PROJECTOR_SYNC && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(OBS_STATE_CHANNEL);
      channel.onmessage = (event) => {
        applyData(event.data);
        if (isOutputClearedRef.current) {
          stopPolling();
          return;
        }

        if (!stream && pollTimer === null) {
          startPolling();
        }
      };
    }

    if (SHOULD_USE_OBS_STREAM && typeof EventSource !== 'undefined') {
      stream = new EventSource(STREAM_URL);

      stream.onopen = () => {
        lastActivityAt = Date.now();
        clearStreamFallbackTimer();
      };

      stream.addEventListener('obs-state', (event) => {
        try {
          lastActivityAt = Date.now();
          clearStreamFallbackTimer();
          applyData(JSON.parse((event as MessageEvent).data));
        } catch {}
      });

      stream.onmessage = (event) => {
        try {
          lastActivityAt = Date.now();
          clearStreamFallbackTimer();
          applyData(JSON.parse(event.data));
        } catch {}
      };

      stream.onerror = () => {
        schedulePollingFallback();
      };
    } else {
      startPolling();
    }

    return () => {
      stopped = true;
      clearStreamFallbackTimer();
      channel?.close();
      stream?.close();
      stopPolling();
      pollControlRef.current = null;
    };
  }, [applyData]);

  const getBgClass = (type: BackgroundType) => {
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

      {!isAnnouncementMode && bgType === 'video' && (resolvedUploadedVideoUrl || videoUrl) && (
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

      {isAnnouncementMode ? (
        <div className="relative z-10 w-full max-w-6xl">
          <div className="rounded-[3rem] border border-white/15 bg-black/35 p-10 backdrop-blur-md">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.35em] text-rose-300">
                  {String(projectorScene.payload.audience || 'church-wide').replace('-', ' ')}
                </p>
                <h1 className="mt-4 text-6xl font-black uppercase leading-[0.95] text-white">
                  {projectorScene.payload.title}
                </h1>
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-amber-200">
                {projectorScene.payload.priority}
              </div>
            </div>

            {(projectorScene.payload.eventDate || projectorScene.payload.eventTime || projectorScene.payload.venue) && (
              <div className="mt-8 flex flex-wrap gap-4 text-lg font-bold text-white/85">
                {projectorScene.payload.eventDate && <span>{projectorScene.payload.eventDate}</span>}
                {projectorScene.payload.eventTime && <span>{projectorScene.payload.eventTime}</span>}
                {projectorScene.payload.venue && <span>{projectorScene.payload.venue}</span>}
              </div>
            )}

            {projectorScene.payload.shortText && (
              <p className="mt-8 text-3xl font-semibold leading-relaxed text-rose-100">
                {projectorScene.payload.shortText}
              </p>
            )}

            {projectorScene.payload.body && (
              <p className="mt-10 whitespace-pre-wrap text-2xl leading-relaxed text-white/92">
                {projectorScene.payload.body}
              </p>
            )}

            {projectorScene.payload.contactPerson && (
              <div className="mt-12 border-t border-white/10 pt-6 text-xl font-bold text-amber-200">
                Contact: {projectorScene.payload.contactPerson}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="w-full flex justify-center relative z-10"
          style={{
            maxWidth: '95%',
          }}
        >
          <h1
            className="text-white text-center font-bold leading-[1.2] tracking-wide"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              fontWeight: isBold ? 'bold' : 'normal',
              textTransform: isAllCaps ? 'uppercase' : 'none',
              WebkitTextStroke: '2px #000',
              textShadow: '0 8px 40px rgba(0,0,0,0.85)'
            }}
          >
            <span className="whitespace-pre-wrap">{lyrics}</span>
          </h1>
        </div>
      )}
    </div>
  );
}
