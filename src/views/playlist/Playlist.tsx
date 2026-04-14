import { useParams, useOutletContext } from 'react-router-dom';
import { useEffect } from 'react';
import FolderList from './FolderList';
import SongList from './SongList';

export default function Playlist() {
  // 1. Kuhaon ang folderId gikan sa URL (e.g. /app/playlist/123)
  const { folderId } = useParams(); 
  
  // 2. Kuhaon ang context gikan sa App.tsx
  const contextData = useOutletContext<any>();
  const { setActiveFolderId } = contextData;

  // 3. I-sync ang URL ngadto sa Global State
  // Inig refresh o inig click sa 'Back', mo-update ang activeFolderId base sa URL
  useEffect(() => {
    if (folderId) {
      setActiveFolderId(folderId);
    } else {
      setActiveFolderId(null);
    }
  }, [folderId, setActiveFolderId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      {/* 
         Imbes nga contextData.activeFolderId ang basehan, 
         mas maayo ang 'folderId' gikan sa URL ang gamiton 
         para paspas ang reaction sa UI inig usab sa URL.
      */}
      {!folderId ? (
        <FolderList {...contextData} />
      ) : (
        <SongList {...contextData} />
      )}
    </div>
  );
}