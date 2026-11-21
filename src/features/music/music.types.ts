export interface SongArtist {
  id: string;
  name: string;
  role: string;
  type: string;
  url: string;
  image?: { quality: string; url: string }[];
}

export interface SongImage {
  quality: "50x50" | "150x150" | "500x500" | string;
  url: string;
}

export interface SongDownloadUrl {
  quality: "12kbps" | "48kbps" | "96kbps" | "160kbps" | "320kbps" | string;
  url: string;
}

export interface SongAlbum {
  id: string;
  name: string;
  url: string;
}

export interface SongArtistsMap {
  primary: SongArtist[];
  featured: SongArtist[];
  all: SongArtist[];
}

export interface SongData {
  id: string;
  name: string;
  type: string;
  year: string;
  releaseDate: string;
  duration: number; // in seconds
  label: string;
  explicitContent: boolean;
  playCount: number | string;
  language: string;
  hasLyrics: boolean;
  lyricsId: string | null;
  url: string;
  copyright: string;
  album: SongAlbum;
  artists: SongArtistsMap;
  image: SongImage[];
  downloadUrl: SongDownloadUrl[];
  category?: string;
  categoryFileName?: string;
}

export interface SongCategory {
  id: string;
  name: string;
  fileName: string;
  count: number;
}

export type SoundQuality = "12kbps" | "48kbps" | "96kbps" | "160kbps" | "320kbps";

export interface MusicSettings {
  soundQuality: SoundQuality;
  downloadQuality: SoundQuality;
  activeCategory: string; // "random" or category id e.g. "evergreen"
  lastSongId: string | null;
  playbackPosition: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  autoPlay: boolean;
  eqMode?: string;
  reverbPercent?: number;
  theme?: string;
  uiStyle?: string;
}

export interface PlayHistoryItem {
  id: number;
  songId: string;
  songName: string;
  artistName: string;
  category: string;
  duration: number;
  playedAt: number;
}

export interface MusicDatabaseStats {
  dbPath: string;
  sizeBytes: number;
  totalPlays: number;
  totalFavorites: number;
  settingsCount: number;
}

export interface GroupPlaybackState {
  active: boolean;
  serverGroupMode: boolean;
  song: SongData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  updatedAt: number;
  category: string;
  categoryName: string;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  sessionVersion: number;
  listenersCount: number;
  lastAction?: {
    type: string;
    by?: string;
    timestamp: number;
  };
}

export type GroupAction =
  | { type: "play"; by?: string }
  | { type: "pause"; by?: string }
  | { type: "toggle-play"; by?: string }
  | { type: "seek"; time: number; by?: string }
  | { type: "next"; by?: string }
  | { type: "prev"; by?: string }
  | { type: "set-song"; songId: string; by?: string }
  | { type: "set-category"; category: string; by?: string }
  | { type: "toggle-shuffle"; shuffle?: boolean; by?: string }
  | { type: "activate-group"; by?: string }
  | { type: "deactivate-group"; by?: string }
  | { type: "sync-time"; time: number; by?: string };

