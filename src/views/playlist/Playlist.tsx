// Playlist.tsx
import { useOutletContext } from 'react-router-dom';
import FolderList from './FolderList';
import SongList from './SongList';

export default function Playlist() {
  const contextData = useOutletContext<any>();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      {contextData.activeFolderId === null ? (
        <FolderList {...contextData} />
      ) : (
        <SongList {...contextData} />
      )}
    </div>
  );
}