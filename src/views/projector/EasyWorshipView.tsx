import { useEffect, useState, useRef } from 'react';
import { type CSSProperties } from 'react';

// Define CSS styles directly within the component
const styles = {
  container: {
    height: '1080px', // Set height to 1080px
    width: '1920px', // Set width to 1920px
    margin: 0,
    overflow: 'hidden',
    backgroundColor: '#000', // Default background, will be overridden
    fontFamily: "'Oswald', sans-serif",
    display: 'flex',        // Use flexbox for centering
    alignItems: 'center',   // Vertically center the content
    justifyContent: 'center', // Horizontally center the content
  } as CSSProperties,
  heading: {
    color: '#fff',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.1,
    // Thicker outline with additional shadow directions
    textShadow: `
      -6px -6px 0 #000, 6px -6px 0 #000,
      -6px 6px 0 #000, 6px 6px 0 #000,
      -6px 0px 0 #000, 6px 0px 0 #000,
      0px -6px 0 #000, 0px 6px 0 #000,
      -5px -5px 0 #000, 5px -5px 0 #000,
      -5px 5px 0 #000, 5px 5px 0 #000,
      0px 10px 30px rgba(0,0,0,0.8)
    `,
    // Add padding to the heading itself
    padding: '20px', // Adjust this value as needed for your desired padding
    boxSizing: 'border-box',
  } as CSSProperties,
};

export default function EasyWorshipView() {
  const [lyrics, setLyrics] = useState("");
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('ew_fontSize');
    return saved ? parseInt(saved) : 90;
  });
  // State to hold the background type and color, synced from the controller
  const [background, setBackground] = useState<{ type: string; color?: string }>({
    type: localStorage.getItem('ew_background_type') || 'none',
    color: localStorage.getItem('ew_background_color') || '#000000',
  });


  // New text styling states matching the controller
  const[fontFamily, setFontFamily] = useState(() => localStorage.getItem('ew_fontFamily') || "'Oswald', sans-serif");
  const [isBold, setIsBold] = useState(() => {
    const saved = localStorage.getItem('ew_isBold');
    return saved ? JSON.parse(saved) : true;
  });
  const [isUppercase, setIsUppercase] = useState(() => {
    const saved = localStorage.getItem('ew_isUppercase');
    return saved ? JSON.parse(saved) : true;
  });
  const [hasOutline, setHasOutline] = useState(() => {
    const saved = localStorage.getItem('ew_hasOutline');
    return saved ? JSON.parse(saved) : true;
  });

  const lyricsRef = useRef("");

  const applyData = (data: any) => {
    if (data.fontSize) setFontSize(data.fontSize);
    // Update background type and color
    if (data.background !== undefined) {
      if (typeof data.background === 'string' && data.background.startsWith('#')) {
        setBackground({ type: 'custom', color: data.background });
      } else {
        setBackground({ type: data.background });
      }
    }
    if (data.fontFamily !== undefined) setFontFamily(data.fontFamily);
    if (data.isBold !== undefined) setIsBold(data.isBold);
    if (data.isUppercase !== undefined) setIsUppercase(data.isUppercase);
    if (data.hasOutline !== undefined) setHasOutline(data.hasOutline);

    const newText: string = data.text ?? "";
      lyricsRef.current = newText;
      setLyrics(newText);
  };

  useEffect(() => {
    const sync = async () => {
      try {
        // Fetch from the deployed URL for obs-state
        const res = await fetch('/obs-state');
        if (res.ok) { applyData(await res.json()); return; }
      } catch {
        // If fetching from relative path fails, try localStorage fallback
      }
      // Fallback: localStorage (for pop-out window in same browser)
      const raw = localStorage.getItem('jamc_live_display');
      if (raw) { try { applyData(JSON.parse(raw)); } catch {} }
    };

    // Fetch initial state
    sync();

    // Set up interval to poll for updates
    const interval = setInterval(sync, 300);

    // Listen for storage events from other tabs/windows (important for the popped-out projector)
    window.addEventListener('storage', () => {
      const raw = localStorage.getItem('jamc_live_display');
      if (raw) { try { applyData(JSON.parse(raw)); } catch {} }
    });

    return () => {
      clearInterval(interval);
      // Clean up the event listener when the component unmounts
      // NOTE: If you need to remove the listener, store the handler function and use removeEventListener.
      // For simplicity in this example, it's omitted, but be mindful in complex apps.
    };
  }, []); // Empty dependency array means this runs only on mount and unmount

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('ew_fontSize', fontSize.toString());
    localStorage.setItem('ew_background_type', background.type);
    if (background.type === 'custom' && background.color) {
      localStorage.setItem('ew_background_color', background.color);
    }
    localStorage.setItem('ew_fontFamily', fontFamily);
    localStorage.setItem('ew_isBold', JSON.stringify(isBold));
    localStorage.setItem('ew_isUppercase', JSON.stringify(isUppercase));
    localStorage.setItem('ew_hasOutline', JSON.stringify(hasOutline));
  }, [fontSize, background, fontFamily, isBold, isUppercase, hasOutline]);


  // Function to determine background styles
  const getBgStyle = (): CSSProperties => {
    if (background.type === 'praise') return { backgroundImage: 'linear-gradient(to bottom right, #4f46e5, #7c3aed, #4f46e5)' };
    if (background.type === 'worship') return { backgroundImage: 'linear-gradient(to top, #000000, #171717, #000000)' };
    if (background.type === 'green') return { backgroundColor: '#00FF00' };
    if (background.type === 'custom' && background.color) return { backgroundColor: background.color };
    return { backgroundColor: '#000' }; // Default to black
  };

  return (
    <div style={{ ...styles.container, ...getBgStyle() }}>
      <h1
        style={{
          ...styles.heading,
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
        }}
      >
        <span style={{ whiteSpace: 'pre-wrap', padding: '20px', boxSizing: 'border-box', display: 'inline-block' }}>{lyrics}</span>
      </h1>
    </div>
  );
}