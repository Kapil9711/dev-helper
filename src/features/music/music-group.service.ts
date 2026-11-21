import type { ServerResponse } from "node:http";
import { musicService } from "./music.service.ts";
import type { GroupAction, GroupPlaybackState, SongData } from "./music.types.ts";

export class MusicGroupService {
  private active = false;
  private serverGroupMode = false;
  private currentSong: SongData | null = null;
  private isPlaying = false;
  private currentTime = 0; // seconds
  private duration = 0; // seconds
  private updatedAt = Date.now();
  private category = "random";
  private categoryName = "Random Shuffle";
  private shuffle = true;
  private repeat: "off" | "all" | "one" = "all";
  private sessionVersion = 1;
  private clients = new Set<ServerResponse>();
  private tickInterval: NodeJS.Timeout | null = null;
  private playedSongIds = new Set<string>();
  private lastAction?: { type: string; by?: string; timestamp: number };

  public init(options: { groupMode: boolean }): void {
    this.serverGroupMode = options.groupMode;
    this.active = options.groupMode;

    // Pick initial song if group mode is enabled or library is ready
    this.ensureCurrentSong();

    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tick(), 1000);
    }
  }

  public isGroupMode(): boolean {
    return this.serverGroupMode || this.active;
  }

  public setGroupMode(active: boolean): void {
    this.active = active;
    if (active && !this.currentSong) {
      this.ensureCurrentSong();
    }
    this.bumpVersion("group-mode-changed");
  }

  private ensureCurrentSong(): void {
    if (!this.currentSong) {
      const initial = musicService.getNextRandomSong(this.category);
      if (initial) {
        this.currentSong = initial;
        this.duration = initial.duration || 0;
        this.currentTime = 0;
        this.updatedAt = Date.now();
        this.playedSongIds.add(initial.id);
      }
    }
  }

  private getCurrentCalculatedTime(): number {
    if (!this.isPlaying) return this.currentTime;
    const elapsed = (Date.now() - this.updatedAt) / 1000;
    const calculated = this.currentTime + elapsed;
    if (this.duration > 0 && calculated > this.duration) {
      return this.duration;
    }
    return Math.max(0, calculated);
  }

  private tick(): void {
    if (!this.active || !this.isPlaying || !this.currentSong) {
      // Send keep-alive SSE comment every ~15s
      if (Date.now() % 15000 < 1000) {
        this.sendPingToClients();
      }
      return;
    }

    const elapsed = (Date.now() - this.updatedAt) / 1000;
    const current = this.currentTime + elapsed;

    // Auto-advance to next song if track finished
    if (this.duration > 0 && current >= this.duration) {
      if (this.repeat === "one") {
        this.currentTime = 0;
        this.updatedAt = Date.now();
        this.bumpVersion("repeat-one");
      } else {
        this.advanceToNextSong("auto-advance");
      }
    } else if (Date.now() % 15000 < 1000) {
      this.sendPingToClients();
    }
  }

  private advanceToNextSong(reason = "next", by?: string): void {
    const allSongsInCat = musicService.getSongs(this.category);
    if (allSongsInCat.length === 0) return;

    if (this.playedSongIds.size >= allSongsInCat.length) {
      this.playedSongIds.clear();
    }

    const nextSong = musicService.getNextRandomSong(this.category, this.currentSong?.id);
    if (nextSong) {
      this.currentSong = nextSong;
      this.duration = nextSong.duration || 0;
      this.currentTime = 0;
      this.updatedAt = Date.now();
      this.isPlaying = true;
      this.playedSongIds.add(nextSong.id);
      this.bumpVersion(reason, by);
    }
  }

  public getState(): GroupPlaybackState {
    return {
      active: this.active,
      serverGroupMode: this.serverGroupMode,
      song: this.currentSong,
      isPlaying: this.isPlaying,
      currentTime: Math.round(this.getCurrentCalculatedTime() * 10) / 10,
      duration: this.duration,
      updatedAt: this.updatedAt,
      category: this.category,
      categoryName: this.categoryName,
      shuffle: this.shuffle,
      repeat: this.repeat,
      sessionVersion: this.sessionVersion,
      listenersCount: this.clients.size,
      lastAction: this.lastAction,
    };
  }

  public addClient(res: ServerResponse): void {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    });

    // Send initial full snapshot
    const initialData = JSON.stringify(this.getState());
    res.write(`event: sync\ndata: ${initialData}\n\n`);

    this.clients.add(res);

    // Notify all peers of new listener count
    this.broadcast("peer-joined");

    const cleanup = () => {
      this.clients.delete(res);
      this.broadcast("peer-left");
    };

    res.on("close", cleanup);
    res.on("error", cleanup);
  }

  private sendPingToClients(): void {
    for (const res of this.clients) {
      try {
        res.write(": ping\n\n");
      } catch {
        this.clients.delete(res);
      }
    }
  }

  public broadcast(eventName = "state"): void {
    const data = JSON.stringify(this.getState());
    const payload = `event: ${eventName}\ndata: ${data}\n\n`;

    for (const res of this.clients) {
      try {
        res.write(payload);
      } catch {
        this.clients.delete(res);
      }
    }
  }

  private bumpVersion(actionType: string, by?: string): void {
    this.sessionVersion++;
    this.lastAction = { type: actionType, by, timestamp: Date.now() };
    this.broadcast("state");
  }

  public handleAction(action: GroupAction): GroupPlaybackState {
    const now = Date.now();

    switch (action.type) {
      case "activate-group": {
        this.active = true;
        this.ensureCurrentSong();
        this.bumpVersion("activate-group", action.by);
        break;
      }

      case "deactivate-group": {
        this.active = false;
        this.bumpVersion("deactivate-group", action.by);
        break;
      }

      case "play": {
        this.ensureCurrentSong();
        this.isPlaying = true;
        this.updatedAt = now;
        this.bumpVersion("play", action.by);
        break;
      }

      case "pause": {
        if (this.isPlaying) {
          this.currentTime = this.getCurrentCalculatedTime();
          this.isPlaying = false;
          this.updatedAt = now;
          this.bumpVersion("pause", action.by);
        }
        break;
      }

      case "toggle-play": {
        this.ensureCurrentSong();
        if (this.isPlaying) {
          this.currentTime = this.getCurrentCalculatedTime();
          this.isPlaying = false;
        } else {
          this.isPlaying = true;
        }
        this.updatedAt = now;
        this.bumpVersion(this.isPlaying ? "play" : "pause", action.by);
        break;
      }

      case "seek": {
        this.currentTime = Math.max(0, Math.min(this.duration, action.time));
        this.updatedAt = now;
        this.bumpVersion("seek", action.by);
        break;
      }

      case "next": {
        this.advanceToNextSong("next", action.by);
        break;
      }

      case "prev": {
        const current = this.getCurrentCalculatedTime();
        if (current > 3 || !this.currentSong) {
          this.currentTime = 0;
          this.updatedAt = now;
          this.bumpVersion("prev-restart", action.by);
        } else {
          this.advanceToNextSong("prev", action.by);
        }
        break;
      }

      case "set-song": {
        const song = musicService.getSongById(action.songId);
        if (song) {
          this.currentSong = song;
          this.duration = song.duration || 0;
          this.currentTime = 0;
          this.updatedAt = now;
          this.isPlaying = true;
          this.playedSongIds.add(song.id);
          this.bumpVersion("set-song", action.by);
        }
        break;
      }

      case "set-category": {
        this.category = action.category.toLowerCase();
        const cat = musicService.getCategories().find((c) => c.id === this.category);
        this.categoryName = cat ? cat.name : "Random Shuffle";
        this.playedSongIds.clear();

        const catSongs = musicService.getSongs(this.category);
        const song = catSongs[0] || musicService.getNextRandomSong(this.category);
        if (song) {
          this.currentSong = song;
          this.duration = song.duration || 0;
          this.currentTime = 0;
          this.updatedAt = now;
          this.isPlaying = true;
          this.playedSongIds.add(song.id);
        }
        this.bumpVersion("set-category", action.by);
        break;
      }

      case "toggle-shuffle": {
        this.shuffle = typeof action.shuffle === "boolean" ? action.shuffle : !this.shuffle;
        this.bumpVersion("toggle-shuffle", action.by);
        break;
      }

      case "sync-time": {
        if (this.isPlaying && typeof action.time === "number") {
          const serverCurrent = this.getCurrentCalculatedTime();
          if (Math.abs(serverCurrent - action.time) > 2.5) {
            this.currentTime = Math.max(0, Math.min(this.duration, action.time));
            this.updatedAt = now;
          }
        }
        break;
      }
    }

    return this.getState();
  }

  public destroy(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const res of this.clients) {
      try {
        res.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }
}

export const musicGroupService = new MusicGroupService();
