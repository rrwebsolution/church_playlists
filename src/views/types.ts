// types.ts
export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  file_path?: string | null; // Importante ni
  lyrics?: string;
  chords?: string;
  offset?: number;
  isGenerating?: boolean;
}

export interface PlaylistFolder {
  id: string;
  name: string;
  songs: Song[];
}
