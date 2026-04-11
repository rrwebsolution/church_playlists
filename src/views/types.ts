// types.ts
export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  lyrics?: string | null;
  chords?: string | null; // BAG-ONG GIDUGANG
}

export interface PlaylistFolder {
  id: string;
  name: string;
  songs: Song[];
}