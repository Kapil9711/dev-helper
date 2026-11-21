"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMusicCategoriesQuery,
  useMusicSongsQuery,
  useMusicSettingsQuery,
  useMusicStatsQuery,
  queryKeys,
} from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import { CdPlayer } from "@/components/music/cd-player";
import { CategorySelector } from "@/components/music/category-selector";
import { UpNextCard } from "@/components/music/up-next-card";
import { MusicSettingsTab } from "@/components/music/music-settings";
import { BatchDownloadModal } from "@/components/music/batch-download-modal";
import type { SongData, SoundQuality, MusicSettings } from "@/types/music";
import { Minimize2, Disc, Maximize2, CheckCircle2, DownloadCloud, Loader2 } from "lucide-react";

// Fisher-Yates pure array shuffle
function shuffleList<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function MusicDashboardPage() {
  const queryClient = useQueryClient();
  const { preferences, updatePreferences } = useDashboardPreferences();

  // Active view tab: "song" | "settings"
  const [activeTab, setActiveTab] = useState<"song" | "settings">("song");

  // Full Screen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Background download feedback toast
  const [downloadToast, setDownloadToast] = useState<{
    status: "downloading" | "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, status: "downloading" | "success" | "error" = "success") => {
    setDownloadToast({ status, text });
    if (status !== "downloading") {
      setTimeout(() => setDownloadToast(null), 3000);
    }
  };

  // Sync tab with URL search parameter & custom events from sidebar
  useEffect(() => {
    const syncTab = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "song" || tab === "settings") {
        setActiveTab(tab);
      }
    };

    syncTab();

    const handleCustomTab = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "song" || detail === "settings") {
        setActiveTab(detail);
      }
    };

    window.addEventListener("vh-music-tab-change", handleCustomTab);
    window.addEventListener("popstate", syncTab);

    return () => {
      window.removeEventListener("vh-music-tab-change", handleCustomTab);
      window.removeEventListener("popstate", syncTab);
    };
  }, []);

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Queries
  const categoriesQuery = useMusicCategoriesQuery();
  const settingsQuery = useMusicSettingsQuery();
  const statsQuery = useMusicStatsQuery();

  // Persistent Settings from SQLite
  const persistentSettings: MusicSettings = useMemo(() => {
    return (
      settingsQuery.data?.settings || {
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
        theme: "midnight",
        uiStyle: "modern",
      }
    );
  }, [settingsQuery.data?.settings]);

  // Local state initialized with fallback
  const [activeCategory, setActiveCategory] = useState<string>("random");
  const [soundQuality, setSoundQuality] = useState<SoundQuality>("320kbps");
  const [downloadQuality, setDownloadQuality] = useState<SoundQuality>("320kbps");
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(true);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("all");
  const [autoPlay, setAutoPlay] = useState<boolean>(true);

  const isRandomMode = activeCategory === "random" || !activeCategory;

  // Sync state once persistent settings are loaded from SQLite
  const [isSettingsInitialized, setIsSettingsInitialized] = useState(false);
  useEffect(() => {
    if (settingsQuery.data?.settings && !isSettingsInitialized) {
      const s = settingsQuery.data.settings;
      setActiveCategory(s.activeCategory || "random");
      setSoundQuality(s.soundQuality || "320kbps");
      setDownloadQuality(s.downloadQuality || "320kbps");
      setVolume(typeof s.volume === "number" ? s.volume : 0.8);
      setIsMuted(Boolean(s.isMuted));
      setShuffle(typeof s.shuffle === "boolean" ? s.shuffle : true);
      setRepeat(s.repeat || "all");
      setAutoPlay(typeof s.autoPlay === "boolean" ? s.autoPlay : true);
      setIsSettingsInitialized(true);
    }
  }, [settingsQuery.data?.settings, isSettingsInitialized]);

  // Fetch songs for the active category
  const songsQuery = useMusicSongsQuery(activeCategory);
  const songs = songsQuery.data?.songs ?? [];

  // Playback & HTML5 Audio State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<SongData | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Shuffled Queue State
  const [shuffledQueue, setShuffledQueue] = useState<SongData[]>([]);
  // Pool of played song IDs in "random" / shuffle mode to ensure NO repeats
  const [playedSongIds, setPlayedSongIds] = useState<Set<string>>(new Set());

  // Batch download modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalCategory, setDownloadModalCategory] = useState<string>("random");

  // Helper to persist partial settings to SQLite
  const saveSettingsToDb = useCallback(
    async (partial: Partial<MusicSettings>) => {
      try {
        await apiClient.updateMusicSettings(partial);
        void queryClient.invalidateQueries({ queryKey: queryKeys.musicSettings });
        void queryClient.invalidateQueries({ queryKey: queryKeys.musicStats });
      } catch (err) {
        console.error("Failed to save settings to SQLite DB:", err);
      }
    },
    [queryClient],
  );

  // Compute Audio URL matching sound quality
  const getAudioUrl = useCallback(
    (song: SongData | null, quality: SoundQuality): string => {
      if (!song?.downloadUrl?.length) return "";
      const matched = song.downloadUrl.find((u) => u.quality === quality);
      return (
        matched?.url ||
        song.downloadUrl[song.downloadUrl.length - 1]?.url ||
        song.downloadUrl[0]?.url ||
        ""
      );
    },
    [],
  );

  // Keep shuffledQueue populated whenever songs change or category switches
  useEffect(() => {
    if (songs.length > 0) {
      if (isRandomMode || shuffle) {
        setShuffledQueue((prev) => {
          // If queue is empty or doesn't match current songs length, generate a fresh shuffle
          if (prev.length === 0 || prev.length !== songs.length) {
            return shuffleList(songs);
          }
          return prev;
        });
      } else {
        setShuffledQueue([...songs]);
      }
    }
  }, [songs, isRandomMode, shuffle]);

  // Initial song selection once songs are loaded
  useEffect(() => {
    if (songs.length > 0 && !currentSong) {
      const lastId = persistentSettings.lastSongId;
      const matchedLast = lastId ? songs.find((s) => s.id === lastId) : null;

      if (matchedLast) {
        setCurrentSong(matchedLast);
        if (persistentSettings.playbackPosition > 0) {
          setCurrentTime(persistentSettings.playbackPosition);
        }
      } else if (isRandomMode) {
        // In Random mode: pick a truly random song on initial start!
        const randomInitial = songs[Math.floor(Math.random() * songs.length)];
        setCurrentSong(randomInitial);
      } else {
        setCurrentSong(songs[0]);
      }
    }
  }, [songs, currentSong, persistentSettings.lastSongId, persistentSettings.playbackPosition, isRandomMode]);

  // Initialize Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audio) setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio) setDuration(audio.duration || 0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.src = "";
    };
  }, []);

  // Update volume and mute state on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Play a specific song
  const playSong = useCallback(
    (song: SongData, resumeTime = 0) => {
      setCurrentSong(song);
      const url = getAudioUrl(song, soundQuality);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.currentTime = resumeTime;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Auto-play prevented by browser policy:", err);
            setIsPlaying(false);
          });
      }

      // Record in play history & update last played song in SQLite
      void apiClient.recordMusicHistory(song.id, activeCategory);
      void saveSettingsToDb({ lastSongId: song.id, playbackPosition: resumeTime });

      // Add to played set
      setPlayedSongIds((prev) => {
        const next = new Set(prev);
        next.add(song.id);
        return next;
      });
    },
    [getAudioUrl, soundQuality, activeCategory, saveSettingsToDb],
  );

  // Compute ONLY the single NEXT upcoming track based on active shuffle mode
  const nextUpcomingSong: SongData | null = useMemo(() => {
    if (songs.length === 0) return null;
    if (songs.length === 1) return songs[0];

    const effectiveShuffle = isRandomMode || shuffle;

    if (effectiveShuffle) {
      const activeQueue = shuffledQueue.length > 0 ? shuffledQueue : songs;

      // Find the next track in shuffledQueue that hasn't been played yet
      const nextCandidate = activeQueue.find(
        (s) => !playedSongIds.has(s.id) && s.id !== currentSong?.id,
      );

      if (nextCandidate) return nextCandidate;

      // If all tracks in activeQueue have been played, cycle to an unplayed from songs or pick other
      const fallback = songs.filter((s) => s.id !== currentSong?.id);
      return fallback[Math.floor(Math.random() * fallback.length)] || songs[0];
    } else {
      // Pure sequential mode in category
      const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
      if (currentIndex === -1) return songs[0];
      return songs[(currentIndex + 1) % songs.length];
    }
  }, [songs, isRandomMode, shuffle, shuffledQueue, playedSongIds, currentSong?.id]);

  // Next Track Action
  const handleNext = useCallback(() => {
    if (nextUpcomingSong) {
      // If we just exhausted the played set, clear it for the next round
      if (playedSongIds.size >= songs.length - 1) {
        setPlayedSongIds(new Set());
        if (isRandomMode || shuffle) {
          setShuffledQueue(shuffleList(songs));
        }
      }
      playSong(nextUpcomingSong, 0);
    }
  }, [nextUpcomingSong, playedSongIds.size, songs, isRandomMode, shuffle, playSong]);

  // Previous Track Action
  const handlePrev = useCallback(() => {
    if (songs.length === 0) return;
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs[prevIndex], 0);
  }, [songs, currentSong?.id, currentTime, playSong]);

  // Handle Track Finished Event
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
      } else if (repeat === "all" || autoPlay) {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [repeat, autoPlay, handleNext]);

  // Play / Pause Toggle
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      void saveSettingsToDb({ playbackPosition: Math.floor(currentTime) });
    } else {
      if (!audioRef.current.src && currentSong) {
        playSong(currentSong, currentTime);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  // Seek
  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      void saveSettingsToDb({ playbackPosition: Math.floor(newTime) });
    }
  };

  // Volume Change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(false);
    void saveSettingsToDb({ volume: newVolume, isMuted: false });
  };

  // Mute Toggle
  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      void saveSettingsToDb({ isMuted: next });
      return next;
    });
  };

  // Shuffle Toggle
  const handleToggleShuffle = () => {
    if (isRandomMode) {
      // In Random Mode, shuffle is permanently ON. Clicking it re-shuffles the entire library!
      const freshShuffle = shuffleList(songs);
      setShuffledQueue(freshShuffle);
      setPlayedSongIds(new Set([currentSong?.id || ""]));
      playTone("click");
      showToast("🔀 Entire Library Re-Shuffled!", "success");
      return;
    }

    setShuffle((prev) => {
      const next = !prev;
      if (next) {
        setShuffledQueue(shuffleList(songs));
        showToast("🔀 Shuffle Enabled", "success");
      } else {
        showToast("▶ Sequential Order Enabled", "success");
      }
      void saveSettingsToDb({ shuffle: next });
      return next;
    });
  };

  // Repeat Mode Toggle
  const handleToggleRepeat = () => {
    setRepeat((prev) => {
      const next = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      void saveSettingsToDb({ repeat: next });
      return next;
    });
  };

  // Change Sound Quality
  const handleQualityChange = (newQuality: SoundQuality) => {
    setSoundQuality(newQuality);
    void saveSettingsToDb({ soundQuality: newQuality });

    if (currentSong && audioRef.current) {
      const wasPlaying = isPlaying;
      const preserveTime = audioRef.current.currentTime;
      const newUrl = getAudioUrl(currentSong, newQuality);

      audioRef.current.src = newUrl;
      audioRef.current.currentTime = preserveTime;
      if (wasPlaying) {
        void audioRef.current.play();
      }
    }
  };

  // Category Selection
  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    setPlayedSongIds(new Set());

    const becomesRandom = catId === "random";
    if (becomesRandom) {
      setShuffle(true);
      void saveSettingsToDb({ activeCategory: "random", shuffle: true });
    } else {
      void saveSettingsToDb({ activeCategory: catId });
    }

    void apiClient.getMusicSongs(catId).then((res) => {
      if (res.songs?.length > 0) {
        if (becomesRandom) {
          const fresh = shuffleList(res.songs);
          setShuffledQueue(fresh);
          playSong(fresh[0], 0);
          showToast("🔀 Random Shuffle Active", "success");
        } else {
          setShuffledQueue(shuffle ? shuffleList(res.songs) : [...res.songs]);
          playSong(res.songs[0], 0);
        }
      }
    });
  };

  // Same-Tab Background Downloader (Zero tab opening, zero redirection!)
  const handleDownloadSong = async (song: SongData) => {
    const audioUrl = getAudioUrl(song, downloadQuality);
    if (!audioUrl) return;

    const primaryArtist =
      song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
    const cleanFileName = `${song.name} - ${primaryArtist}.mp4`.replace(/[\\/:*?"<>|]/g, "_");

    showToast(`Downloading "${song.name}"...`, "downloading");

    // Method 1: Fetch directly as a local Blob (Same-origin object URL ensures 100% background save in same tab)
    try {
      const res = await fetch(audioUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = cleanFileName;
        // NO target="_blank"! Download happens seamlessly in the current tab.
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        showToast(`✓ Saved "${cleanFileName}" to Downloads`, "success");
        return;
      }
    } catch {
      // Method 2: Fallback to server attachment stream via invisible iframe in the same tab
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = `/api/music/file-download?songId=${encodeURIComponent(
        song.id,
      )}&quality=${downloadQuality}`;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 45000);
      showToast(`✓ Downloading "${cleanFileName}"`, "success");
    }
  };

  // Toggle Fullscreen Mode
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen) {
          void document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  // Reset Settings
  const handleResetSettings = async () => {
    try {
      await apiClient.updateMusicSettings({
        soundQuality: "320kbps",
        downloadQuality: "320kbps",
        activeCategory: "random",
        volume: 0.8,
        isMuted: false,
        shuffle: true,
        repeat: "all",
        autoPlay: true,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.musicSettings });
      setSoundQuality("320kbps");
      setDownloadQuality("320kbps");
      setActiveCategory("random");
      setVolume(0.8);
      setIsMuted(false);
      setShuffle(true);
      setRepeat("all");
      showToast("Settings reset to defaults", "success");
    } catch (err) {
      console.error("Failed to reset settings:", err);
    }
  };

  const categories = categoriesQuery.data?.categories ?? [];
  const totalLibrarySongs =
    statsQuery.data?.totalSongs ?? categories.reduce((sum, c) => sum + c.count, 0);

  const activeCategoryObj = categories.find((c) => c.id === activeCategory);
  const activeCategoryName =
    activeCategory === "random" ? "Random Library" : activeCategoryObj?.name || activeCategory;

  const remainingQueueCount = Math.max(0, songs.length - playedSongIds.size);

  return (
    <>
      {/* Toast Notification (Never redirects, stays in same tab!) */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-zinc-950/95 px-4 py-3 text-xs font-semibold text-rose-300 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {downloadToast.status === "downloading" ? (
            <Loader2 size={16} className="animate-spin text-rose-400" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400" />
          )}
          <span>{downloadToast.text}</span>
        </div>
      )}

      {/* IMMERSIVE FULL SCREEN THEATER OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#060a12] p-6 sm:p-10 overflow-y-auto flex flex-col justify-between animate-in fade-in duration-300">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Disc size={22} className="animate-spin" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  VH Music · Immersive Hi-Fi Theater
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  {activeCategoryName} · {soundQuality} Lossless Stream
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition shadow-lg"
            >
              <Minimize2 size={15} />
              <span>Exit Full Screen (Esc)</span>
            </button>
          </div>

          {/* Fullscreen Center Player */}
          <div className="my-auto py-6 max-w-5xl mx-auto w-full">
            <CdPlayer
              currentSong={currentSong}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              soundQuality={soundQuality}
              shuffle={shuffle}
              repeat={repeat}
              isFullscreen={true}
              isRandomMode={isRandomMode}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              onQualityChange={handleQualityChange}
              onDownloadCurrentSong={() => {
                if (currentSong) void handleDownloadSong(currentSong);
              }}
              onToggleFullscreen={handleToggleFullscreen}
            />

            {/* Next Track Preview inside Fullscreen */}
            <div className="mt-6">
              <UpNextCard
                nextSong={nextUpcomingSong}
                categoryName={activeCategoryName}
                totalQueueCount={remainingQueueCount}
                downloadQuality={downloadQuality}
                onPlayNext={handleNext}
                onDownloadSong={handleDownloadSong}
              />
            </div>
          </div>

          <div className="text-center font-mono text-[11px] text-zinc-500 pt-4 border-t border-white/10">
            VH DevTools · System 900 Audio Engine · SQLite Persistence Active
          </div>
        </div>
      )}

      {/* STANDARD DASHBOARD VIEW */}
      <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Tab Bar: Song Player vs Settings */}
        <div className="flex items-center justify-between border-b vh-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("song");
                playTone("click");
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "song"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs"
                  : "vh-text-dim hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Song Player</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("settings");
                playTone("click");
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "settings"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs"
                  : "vh-text-dim hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Settings</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-xs font-mono vh-text-dim">
            <span>Streaming:</span>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300 border border-rose-500/30">
              {soundQuality}
            </span>
            <span className="mx-1">·</span>
            <span>Download:</span>
            <span className="rounded bg-sky-500/20 px-2 py-0.5 font-bold text-sky-300 border border-sky-500/30">
              {downloadQuality}
            </span>
          </div>
        </div>

        {/* TAB 1: SONG PLAYER TAB */}
        {activeTab === "song" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Running CD / Turntable Retro Player Chassis */}
            <CdPlayer
              currentSong={currentSong}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              soundQuality={soundQuality}
              shuffle={shuffle}
              repeat={repeat}
              isFullscreen={false}
              isRandomMode={isRandomMode}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              onQualityChange={handleQualityChange}
              onDownloadCurrentSong={() => {
                if (currentSong) void handleDownloadSong(currentSong);
              }}
              onToggleFullscreen={handleToggleFullscreen}
            />

            {/* Category / Playlist Buttons Bar (Random, Evergreen, etc.) */}
            <CategorySelector
              categories={categories}
              activeCategory={activeCategory}
              totalSongs={totalLibrarySongs}
              downloadQuality={downloadQuality}
              onSelectCategory={handleSelectCategory}
              onDownloadWholeList={(catId) => {
                setDownloadModalCategory(catId);
                setIsDownloadModalOpen(true);
              }}
            />

            {/* ONLY ONE UPCOMING SONG CARD (Replaces the long list of songs!) */}
            <UpNextCard
              nextSong={nextUpcomingSong}
              categoryName={activeCategoryName}
              totalQueueCount={remainingQueueCount}
              downloadQuality={downloadQuality}
              onPlayNext={handleNext}
              onDownloadSong={handleDownloadSong}
            />
          </div>
        )}

        {/* TAB 2: SETTINGS TAB (Theme, Icon Style, Accent Color, Spacing, Audio Quality) */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in duration-200">
            <MusicSettingsTab
              settings={{
                soundQuality,
                downloadQuality,
                activeCategory,
                lastSongId: currentSong?.id || null,
                playbackPosition: Math.floor(currentTime),
                volume,
                isMuted,
                shuffle,
                repeat,
                autoPlay,
              }}
              stats={statsQuery.data}
              onUpdateSettings={(partial) => {
                if (partial.soundQuality) setSoundQuality(partial.soundQuality);
                if (partial.downloadQuality) setDownloadQuality(partial.downloadQuality);
                if (partial.autoPlay !== undefined) setAutoPlay(partial.autoPlay);
                if (partial.shuffle !== undefined) setShuffle(partial.shuffle);
                void saveSettingsToDb(partial);
              }}
              onResetSettings={handleResetSettings}
            />
          </div>
        )}

        {/* Whole List Batch Download Modal */}
        <BatchDownloadModal
          isOpen={isDownloadModalOpen}
          category={downloadModalCategory}
          categoryName={activeCategoryName}
          songs={songs}
          downloadQuality={downloadQuality}
          onClose={() => setIsDownloadModalOpen(false)}
        />
      </main>
    </>
  );
}
