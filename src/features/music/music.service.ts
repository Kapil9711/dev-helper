import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { musicDatabase, DEFAULT_MUSIC_SETTINGS } from "./music.database.ts";
import type {
  MusicDatabaseStats,
  MusicSettings,
  SongCategory,
  SongData,
  SoundQuality,
} from "./music.types.ts";
import { createZipArchive, type ZipEntry } from "./zip.helper.ts";

export class MusicService {
  private songsDataDirs: string[] = [];
  private categories: Map<string, SongCategory> = new Map();
  private songsByCategory: Map<string, SongData[]> = new Map();
  private allSongsMap: Map<string, SongData> = new Map();
  private allSongsList: SongData[] = [];
  private randomPlayedHistory: Set<string> = new Set();

  constructor() {
    this.initPaths();
    this.loadAllSongData();
  }

  private initPaths(): void {
    const candidateDirs = [
      resolve(process.cwd(), "src/shared/songs-data"),
      resolve(process.cwd(), "dist/shared/songs-data"),
      resolve(__dirname, "../../shared/songs-data"),
      resolve(__dirname, "../../../src/shared/songs-data"),
    ];

    for (const dir of candidateDirs) {
      if (existsSync(dir) && !this.songsDataDirs.includes(dir)) {
        this.songsDataDirs.push(dir);
      }
    }
  }

  public reloadData(): void {
    this.initPaths();
    this.categories.clear();
    this.songsByCategory.clear();
    this.allSongsMap.clear();
    this.allSongsList = [];
    this.randomPlayedHistory.clear();
    this.loadAllSongData();
  }

  private loadAllSongData(): void {
    const loadedFiles = new Set<string>();

    for (const dir of this.songsDataDirs) {
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          if (extname(file).toLowerCase() === ".json" && !loadedFiles.has(file)) {
            const filePath = join(dir, file);
            try {
              const fileContent = readFileSync(filePath, "utf-8");
              const parsed = JSON.parse(fileContent);
              if (Array.isArray(parsed)) {
                loadedFiles.add(file);
                const categoryId = basename(file, extname(file)).toLowerCase();
                const displayName = categoryId
                  .split(/[-_]+/)
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");

                const categorySongs: SongData[] = [];
                for (const item of parsed) {
                  if (item && item.id && item.name) {
                    const song: SongData = {
                      ...item,
                      category: categoryId,
                      categoryFileName: file,
                    };
                    categorySongs.push(song);
                    if (!this.allSongsMap.has(song.id)) {
                      this.allSongsMap.set(song.id, song);
                      this.allSongsList.push(song);
                    }
                  }
                }

                this.categories.set(categoryId, {
                  id: categoryId,
                  name: displayName,
                  fileName: file,
                  count: categorySongs.length,
                });
                this.songsByCategory.set(categoryId, categorySongs);
              }
            } catch (err) {
              console.error(`[VH Music] Failed to parse song data from ${filePath}:`, err);
            }
          }
        }
      } catch (err) {
        // Directory may not exist or be accessible
      }
    }
  }

  public getCategories(): SongCategory[] {
    return Array.from(this.categories.values());
  }

  public getSongs(category?: string): SongData[] {
    if (!category || category === "random" || category === "all") {
      return [...this.allSongsList];
    }

    const catSongs = this.songsByCategory.get(category.toLowerCase());
    return catSongs ? [...catSongs] : [];
  }

  public getSongById(songId: string): SongData | undefined {
    return this.allSongsMap.get(songId);
  }

  /**
   * Returns a random song across all categories without repeating until all songs have been played.
   */
  public getNextRandomSong(category?: string, excludeSongId?: string): SongData | undefined {
    const pool = this.getSongs(category);
    if (pool.length === 0) return undefined;
    if (pool.length === 1) return pool[0];

    // If all songs have been played in random mode, reset the history pool
    if (this.randomPlayedHistory.size >= pool.length) {
      this.randomPlayedHistory.clear();
    }

    // Filter out already played songs and current song
    const unplayed = pool.filter(
      (s) => !this.randomPlayedHistory.has(s.id) && s.id !== excludeSongId,
    );

    const candidates = unplayed.length > 0 ? unplayed : pool.filter((s) => s.id !== excludeSongId);
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex] || pool[0];

    this.randomPlayedHistory.add(chosen.id);
    return chosen;
  }

  public getMusicSettings(): MusicSettings {
    return musicDatabase.getSettings();
  }

  public updateMusicSettings(partial: Partial<MusicSettings>): MusicSettings {
    return musicDatabase.updateSettings(partial);
  }

  public recordSongPlay(songId: string, category: string): void {
    const song = this.getSongById(songId);
    if (song) {
      musicDatabase.recordPlay(song, category);
      musicDatabase.saveSetting("lastSongId", songId);
    }
  }

  public getStats(): {
    totalSongs: number;
    totalCategories: number;
    categories: SongCategory[];
    dbStats: MusicDatabaseStats;
  } {
    return {
      totalSongs: this.allSongsList.length,
      totalCategories: this.categories.size,
      categories: this.getCategories(),
      dbStats: musicDatabase.getStats(),
    };
  }

  /**
   * Prepares a ZIP archive containing audio files for a whole category/playlist.
   */
  public async createCategoryZip(category: string, quality: SoundQuality = "320kbps"): Promise<Buffer> {
    const songs = this.getSongs(category);
    const entries: ZipEntry[] = [];

    // Include a playlist manifest JSON and M3U file
    const manifestContent = JSON.stringify(
      songs.map((s, idx) => ({
        track: idx + 1,
        id: s.id,
        name: s.name,
        artists: s.artists?.primary?.map((a) => a.name).join(", "),
        album: s.album?.name,
        duration: s.duration,
        streamUrl: s.downloadUrl.find((u) => u.quality === quality)?.url || s.downloadUrl[0]?.url,
      })),
      null,
      2,
    );

    entries.push({
      name: `${category}-playlist.json`,
      data: Buffer.from(manifestContent, "utf-8"),
    });

    const m3uContent = [
      "#EXTM3U",
      ...songs.map((s) => {
        const primaryArtist = s.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
        const url = s.downloadUrl.find((u) => u.quality === quality)?.url || s.downloadUrl[0]?.url || "";
        return `#EXTINF:${s.duration || 0},${primaryArtist} - ${s.name}\n${url}`;
      }),
    ].join("\n");

    entries.push({
      name: `${category}-playlist.m3u`,
      data: Buffer.from(m3uContent, "utf-8"),
    });

    return createZipArchive(entries);
  }
}

export const musicService = new MusicService();
