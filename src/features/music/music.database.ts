import Database from "better-sqlite3";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  MusicDatabaseStats,
  MusicSettings,
  PlayHistoryItem,
  SongData,
  SoundQuality,
} from "./music.types.ts";

export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  soundQuality: "320kbps",
  downloadQuality: "320kbps",
  activeCategory: "random",
  lastSongId: null,
  playbackPosition: 0,
  volume: 0.8,
  isMuted: false,
  shuffle: true,
  repeat: "all",
  autoPlay: true,
  eqMode: "flat",
  reverbPercent: 40,
  theme: "midnight",
  uiStyle: "cyberpunk",
};

function resolveDatabasePath(customPath?: string): string {
  if (customPath) return customPath;
  if (process.env.VH_MUSIC_DB_PATH) return process.env.VH_MUSIC_DB_PATH;

  const primaryDir = join(homedir(), ".vh-dev-helper");
  try {
    mkdirSync(primaryDir, { recursive: true });
    return join(primaryDir, "vh-music.sqlite");
  } catch {
    // Fallback for sandboxed or permission-restricted environments
    const fallbackDir = join(process.cwd(), ".vh-dev-helper");
    try {
      mkdirSync(fallbackDir, { recursive: true });
      return join(fallbackDir, "vh-music.sqlite");
    } catch {
      return join(tmpdir(), "vh-music.sqlite");
    }
  }
}

export class MusicDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(customPath?: string) {
    this.dbPath = resolveDatabasePath(customPath);
    try {
      mkdirSync(dirname(this.dbPath), { recursive: true });
    } catch {
      // Ignore if directory already exists
    }

    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");

    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS music_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS music_play_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id TEXT NOT NULL,
        song_name TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        category TEXT NOT NULL,
        duration INTEGER NOT NULL,
        played_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS music_favorites (
        song_id TEXT PRIMARY KEY,
        added_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_history_played_at ON music_play_history (played_at DESC);
    `);

    // Ensure default settings are populated if table is empty
    const countRow = this.db
      .prepare(`SELECT COUNT(*) as c FROM music_settings`)
      .get() as { c: number };

    if (countRow.c === 0) {
      this.populateDefaultSettings();
    }
  }

  private populateDefaultSettings(): void {
    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO music_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    const now = Date.now();
    const defaults = DEFAULT_MUSIC_SETTINGS as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(defaults)) {
      insertStmt.run(key, JSON.stringify(value), now);
    }
  }

  public getSettings(): MusicSettings {
    const rows = this.db
      .prepare(`SELECT key, value FROM music_settings`)
      .all() as { key: string; value: string }[];

    const settingsMap: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        settingsMap[row.key] = JSON.parse(row.value);
      } catch {
        settingsMap[row.key] = row.value;
      }
    }

    return {
      soundQuality: (settingsMap.soundQuality as SoundQuality) || DEFAULT_MUSIC_SETTINGS.soundQuality,
      downloadQuality: (settingsMap.downloadQuality as SoundQuality) || DEFAULT_MUSIC_SETTINGS.downloadQuality,
      activeCategory: (settingsMap.activeCategory as string) || DEFAULT_MUSIC_SETTINGS.activeCategory,
      lastSongId: (settingsMap.lastSongId as string) || DEFAULT_MUSIC_SETTINGS.lastSongId,
      playbackPosition: typeof settingsMap.playbackPosition === "number" ? settingsMap.playbackPosition : DEFAULT_MUSIC_SETTINGS.playbackPosition,
      volume: typeof settingsMap.volume === "number" ? settingsMap.volume : DEFAULT_MUSIC_SETTINGS.volume,
      isMuted: typeof settingsMap.isMuted === "boolean" ? settingsMap.isMuted : DEFAULT_MUSIC_SETTINGS.isMuted,
      shuffle: typeof settingsMap.shuffle === "boolean" ? settingsMap.shuffle : DEFAULT_MUSIC_SETTINGS.shuffle,
      repeat: (settingsMap.repeat as "off" | "all" | "one") || DEFAULT_MUSIC_SETTINGS.repeat,
      autoPlay: typeof settingsMap.autoPlay === "boolean" ? settingsMap.autoPlay : DEFAULT_MUSIC_SETTINGS.autoPlay,
      eqMode: (settingsMap.eqMode as string) || DEFAULT_MUSIC_SETTINGS.eqMode,
      reverbPercent: typeof settingsMap.reverbPercent === "number" ? settingsMap.reverbPercent : DEFAULT_MUSIC_SETTINGS.reverbPercent,
      theme: (settingsMap.theme as string) || DEFAULT_MUSIC_SETTINGS.theme,
      uiStyle: (settingsMap.uiStyle as string) || DEFAULT_MUSIC_SETTINGS.uiStyle,
    };
  }

  public saveSetting(key: string, value: unknown): void {
    const now = Date.now();
    const strValue = JSON.stringify(value);
    this.db
      .prepare(`
        INSERT INTO music_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `)
      .run(key, strValue, now);
  }

  public updateSettings(partial: Partial<MusicSettings>): MusicSettings {
    const now = Date.now();
    const updateStmt = this.db.prepare(`
      INSERT INTO music_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    const transaction = this.db.transaction((updates: Partial<MusicSettings>) => {
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) {
          updateStmt.run(key, JSON.stringify(val), now);
        }
      }
    });

    transaction(partial);
    return this.getSettings();
  }

  public recordPlay(song: SongData, category: string): void {
    const primaryArtist = song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist";
    this.db
      .prepare(`
        INSERT INTO music_play_history (song_id, song_name, artist_name, category, duration, played_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(song.id, song.name, primaryArtist, category, song.duration || 0, Date.now());
  }

  public getPlayHistory(limit = 50): PlayHistoryItem[] {
    const rows = this.db
      .prepare(`
        SELECT id, song_id as songId, song_name as songName, artist_name as artistName,
               category, duration, played_at as playedAt
        FROM music_play_history
        ORDER BY played_at DESC
        LIMIT ?
      `)
      .all(limit) as PlayHistoryItem[];

    return rows;
  }

  public toggleFavorite(songId: string): boolean {
    const existing = this.db
      .prepare(`SELECT song_id FROM music_favorites WHERE song_id = ?`)
      .get(songId);

    if (existing) {
      this.db.prepare(`DELETE FROM music_favorites WHERE song_id = ?`).run(songId);
      return false;
    } else {
      this.db.prepare(`INSERT INTO music_favorites (song_id, added_at) VALUES (?, ?)`).run(songId, Date.now());
      return true;
    }
  }

  public getFavorites(): string[] {
    const rows = this.db
      .prepare(`SELECT song_id FROM music_favorites ORDER BY added_at DESC`)
      .all() as { song_id: string }[];
    return rows.map((r) => r.song_id);
  }

  public getStats(): MusicDatabaseStats {
    let sizeBytes = 0;
    try {
      if (existsSync(this.dbPath)) {
        sizeBytes = statSync(this.dbPath).size;
      }
    } catch {
      // ignore
    }

    const playsRow = this.db.prepare(`SELECT COUNT(*) as c FROM music_play_history`).get() as { c: number };
    const favsRow = this.db.prepare(`SELECT COUNT(*) as c FROM music_favorites`).get() as { c: number };
    const settingsRow = this.db.prepare(`SELECT COUNT(*) as c FROM music_settings`).get() as { c: number };

    return {
      dbPath: this.dbPath,
      sizeBytes,
      totalPlays: playsRow?.c || 0,
      totalFavorites: favsRow?.c || 0,
      settingsCount: settingsRow?.c || 0,
    };
  }

  public clearHistory(): void {
    this.db.prepare(`DELETE FROM music_play_history`).run();
  }

  public resetSettings(): MusicSettings {
    this.db.prepare(`DELETE FROM music_settings`).run();
    this.populateDefaultSettings();
    return this.getSettings();
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}

export const musicDatabase = new MusicDatabase();
