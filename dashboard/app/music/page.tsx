"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMusicCategoriesQuery,
  useMusicSongsQuery,
  useMusicSettingsQuery,
  useMusicStatsQuery,
  useServerInfoQuery,
  queryKeys,
} from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { useDashboardPreferences, playTone } from "@/lib/prefrences";
import { CdPlayer } from "@/components/music/cd-player";
import { CategorySelector } from "@/components/music/category-selector";
import { UpNextCard } from "@/components/music/up-next-card";
import { MusicSettingsTab } from "@/components/music/music-settings";
import { BatchDownloadModal } from "@/components/music/batch-download-modal";
import type { SongData, SoundQuality, MusicSettings, GroupPlaybackState } from "@/types/music";
import { audioFXEngine } from "@/lib/audio-engine";
import {
  Minimize2,
  Disc,
  Maximize2,
  CheckCircle2,
  DownloadCloud,
  Loader2,
  Radio,
  Users,
  Wifi,
} from "lucide-react";

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
  const serverInfoQuery = useServerInfoQuery();

  // Group Sync Session State
  const [isGroupMode, setIsGroupMode] = useState<boolean>(false);
  const [groupListenersCount, setGroupListenersCount] = useState<number>(1);
  const [audioBlocked, setAudioBlocked] = useState<boolean>(false);

  // Initialize group mode automatically if server was started with `vh music group`
  useEffect(() => {
    if (serverInfoQuery.data?.groupMode !== undefined) {
      setIsGroupMode(Boolean(serverInfoQuery.data.groupMode));
    }
  }, [serverInfoQuery.data?.groupMode]);

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
        eqMode: "flat",
        reverbPercent: 40,
        theme: "midnight",
        uiStyle: "cyberpunk",
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
  const [eqMode, setEqMode] = useState<string>("flat");
  const [reverbPercent, setReverbPercent] = useState<number>(40);

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
      if (s.eqMode) {
        setEqMode(s.eqMode);
        audioFXEngine.setEQ(s.eqMode);
      } else {
        setEqMode("flat");
        audioFXEngine.setEQ("flat");
      }
      if (typeof s.reverbPercent === "number") {
        setReverbPercent(s.reverbPercent);
        audioFXEngine.setReverb(s.reverbPercent);
      } else {
        setReverbPercent(40);
        audioFXEngine.setReverb(40);
      }
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

  // Best album art for current song
  const currentSongAlbumArt = useMemo(() => {
    if (currentSong?.image?.length) {
      const high = currentSong.image.find((i) => i.quality === "500x500");
      const mid = currentSong.image.find((i) => i.quality === "150x150");
      const found = high?.url || mid?.url || currentSong.image[0]?.url;
      if (found) return found;
    }
    const artistImg = currentSong?.artists?.primary?.[0]?.image;
    if (artistImg?.length) {
      const high = artistImg.find((i) => i.quality === "500x500");
      const found = high?.url || artistImg[0]?.url;
      if (found) return found;
    }
    return "";
  }, [currentSong]);

  // Group Sync Session Realtime Synchronization via SSE
  useEffect(() => {
    if (!isGroupMode) return;

    const es = new EventSource("/api/music/group/events");

    const handleIncomingState = (groupState: GroupPlaybackState) => {
      if (typeof groupState.listenersCount === "number") {
        setGroupListenersCount(groupState.listenersCount);
      }

      // Sync song
      if (groupState.song) {
        setCurrentSong((prev) => {
          if (prev?.id !== groupState.song?.id) {
            const url = getAudioUrl(groupState.song, soundQuality);
            if (audioRef.current) {
              audioRef.current.src = url;
              audioFXEngine.init(audioRef.current, eqMode, reverbPercent);
              const targetTime =
                groupState.currentTime +
                (groupState.isPlaying ? (Date.now() - groupState.updatedAt) / 1000 : 0);
              audioRef.current.currentTime = Math.max(0, targetTime);
              if (groupState.isPlaying) {
                audioRef.current
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setAudioBlocked(false);
                  })
                  .catch((err) => {
                    console.warn("Browser blocked audio autoplay:", err);
                    setAudioBlocked(true);
                  });
              } else {
                audioRef.current.pause();
                setIsPlaying(false);
              }
            }
            return groupState.song;
          } else {
            // Same song: check play/pause and drift
            if (audioRef.current) {
              if (groupState.isPlaying && audioRef.current.paused) {
                audioRef.current
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setAudioBlocked(false);
                  })
                  .catch(() => setAudioBlocked(true));
              } else if (!groupState.isPlaying && !audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
              }

              // Re-align time if drift > 1.8 seconds
              const targetTime =
                groupState.currentTime +
                (groupState.isPlaying ? (Date.now() - groupState.updatedAt) / 1000 : 0);
              if (Math.abs(audioRef.current.currentTime - targetTime) > 1.8) {
                audioRef.current.currentTime = Math.max(
                  0,
                  Math.min(groupState.duration || 9999, targetTime),
                );
              }
            }
            return prev;
          }
        });
      }

      // Sync category & shuffle
      if (groupState.category) {
        setActiveCategory(groupState.category);
      }
      if (typeof groupState.shuffle === "boolean") {
        setShuffle(groupState.shuffle);
      }
    };

    es.addEventListener("sync", (e: MessageEvent) => {
      try {
        const state = JSON.parse(e.data) as GroupPlaybackState;
        handleIncomingState(state);
      } catch (err) {
        console.error("Failed to parse sync event:", err);
      }
    });

    es.addEventListener("state", (e: MessageEvent) => {
      try {
        const state = JSON.parse(e.data) as GroupPlaybackState;
        handleIncomingState(state);
      } catch (err) {
        console.error("Failed to parse state event:", err);
      }
    });

    es.addEventListener("peer-joined", (e: MessageEvent) => {
      try {
        const state = JSON.parse(e.data) as GroupPlaybackState;
        setGroupListenersCount(state.listenersCount);
        showToast(`👋 A device joined the session (${state.listenersCount} listeners)`, "success");
      } catch {}
    });

    es.addEventListener("peer-left", (e: MessageEvent) => {
      try {
        const state = JSON.parse(e.data) as GroupPlaybackState;
        setGroupListenersCount(state.listenersCount);
      } catch {}
    });

    return () => {
      es.close();
    };
  }, [isGroupMode, soundQuality, eqMode, reverbPercent, getAudioUrl]);

  // Periodic time sync report to server in Group Mode
  useEffect(() => {
    if (!isGroupMode || !isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        void apiClient.sendMusicGroupAction({
          type: "sync-time",
          time: audioRef.current.currentTime,
        });
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isGroupMode, isPlaying]);

  // Play a specific song
  const playSong = useCallback(
    (song: SongData, resumeTime = 0) => {
      if (isGroupMode) {
        playTone("click");
        void apiClient.sendMusicGroupAction({ type: "set-song", songId: song.id });
        return;
      }

      setCurrentSong(song);
      const url = getAudioUrl(song, soundQuality);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.currentTime = resumeTime;
        audioFXEngine.init(audioRef.current, eqMode, reverbPercent);
        audioFXEngine.resume();
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
    [isGroupMode, getAudioUrl, soundQuality, activeCategory, saveSettingsToDb, eqMode, reverbPercent],
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
    if (isGroupMode) {
      playTone("click");
      void apiClient.sendMusicGroupAction({ type: "next" });
      showToast("⏭ Skipped to Next Track (Group Sync)", "success");
      return;
    }

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
  }, [isGroupMode, nextUpcomingSong, playedSongIds.size, songs, isRandomMode, shuffle, playSong]);

  // Previous Track Action
  const handlePrev = useCallback(() => {
    if (isGroupMode) {
      playTone("click");
      void apiClient.sendMusicGroupAction({ type: "prev" });
      return;
    }

    if (songs.length === 0) return;
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs[prevIndex], 0);
  }, [isGroupMode, songs, currentSong?.id, currentTime, playSong]);

  // Handle Track Finished Event
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (isGroupMode) {
        void apiClient.sendMusicGroupAction({ type: "next" });
        return;
      }

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
  }, [isGroupMode, repeat, autoPlay, handleNext]);

  // Play / Pause Toggle
  const handlePlayPause = () => {
    if (isGroupMode) {
      playTone("click");
      if (audioBlocked && audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setAudioBlocked(false);
          })
          .catch(() => {});
      }
      void apiClient.sendMusicGroupAction({ type: isPlaying ? "pause" : "play" });
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      void saveSettingsToDb({ playbackPosition: Math.floor(currentTime) });
    } else {
      audioFXEngine.init(audioRef.current, eqMode, reverbPercent);
      audioFXEngine.resume();
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

  // EQ Mode Change
  const handleEQChange = (newMode: string) => {
    setEqMode(newMode);
    audioFXEngine.setEQ(newMode);
    void saveSettingsToDb({ eqMode: newMode });
    showToast(`Equalizer: ${newMode.toUpperCase()}`, "success");
  };

  // Reverb Percent Change
  const handleReverbChange = (newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, newPercent));
    setReverbPercent(clamped);
    audioFXEngine.setReverb(clamped);
    void saveSettingsToDb({ reverbPercent: clamped });
  };

  // Seek
  const handleSeek = (newTime: number) => {
    if (isGroupMode) {
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
      void apiClient.sendMusicGroupAction({ type: "seek", time: newTime });
      return;
    }

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
    if (isGroupMode) {
      playTone("click");
      void apiClient.sendMusicGroupAction({ type: "toggle-shuffle" });
      return;
    }

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
    if (isGroupMode) {
      playTone("click");
      setActiveCategory(catId);
      void apiClient.sendMusicGroupAction({ type: "set-category", category: catId });
      showToast(`Category: ${catId.toUpperCase()} (Group Sync)`, "success");
      return;
    }

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
        eqMode: "flat",
        reverbPercent: 0,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.musicSettings });
      setSoundQuality("320kbps");
      setDownloadQuality("320kbps");
      setActiveCategory("random");
      setVolume(0.8);
      setIsMuted(false);
      setShuffle(true);
      setRepeat("all");
      setEqMode("flat");
      setReverbPercent(40);
      audioFXEngine.setEQ("flat");
      audioFXEngine.setReverb(40);
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

      {/* IMMERSIVE FULL SCREEN THEATER OVERLAY WITH DYNAMIC ALBUM ART GLASS BACKGROUND */}
      {isFullscreen && (
        <div
          className="fixed inset-0 overflow-y-auto overflow-x-hidden flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-300 bg-[#05070d]"
          style={{ zIndex: 100 }}
        >
          {/* FULL SCREEN BACKGROUND: VISIBLE AMBIENT GLASS EFFECT WITH BLURRED PLAYING SONG IMAGE */}
          <div
            className="fixed inset-0 pointer-events-none overflow-hidden select-none"
            style={{ zIndex: 0 }}
          >
            {/* Dynamic Album Art Image with Visible Vibrant Blur */}
            {currentSongAlbumArt ? (
              <img
                src={currentSongAlbumArt}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-700 ease-in-out"
                style={{
                  filter: "blur(40px) saturate(180%) brightness(0.65)",
                  WebkitFilter: "blur(40px) saturate(180%) brightness(0.65)",
                  transform: "scale(1.25)",
                  transformOrigin: "center center",
                  opacity: 0.85,
                }}
              />
            ) : (
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background:
                    "radial-gradient(ellipse at center, #1e1b4b 0%, #0c0a1f 60%, #03050a 100%)",
                }}
              />
            )}

            {/* Frosted Glass Layer Over Image */}
            <div className="absolute inset-0 pointer-events-none bg-black/40 backdrop-blur-md" />

            {/* Ambient Radial Vignette darkening edges for cinematic depth */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)",
              }}
            />

            {/* Subtle Frosted Dot Grid Texture for tactile glass depth */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40 pointer-events-none" />
          </div>

          {/* Fullscreen Header with Frosted Glass styling */}
          <div
            className="relative flex items-center justify-between pb-4 border-b border-white/15 backdrop-blur-md rounded-2xl px-5 py-3.5 bg-black/50 shadow-xl"
            style={{ zIndex: 10 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Disc size={22} className={isPlaying ? "animate-spin" : ""} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  VH Music · Immersive Glass Theater
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-300">
                  {isGroupMode && (
                    <>
                      <span className="flex items-center gap-1.5 rounded-md bg-cyan-500/25 text-cyan-300 px-2 py-0.5 border border-cyan-500/40 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                        GROUP SYNC ({groupListenersCount})
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span>{activeCategoryName}</span>
                  <span>·</span>
                  <span className="text-rose-300 font-bold">{soundQuality}</span>
                  <span>·</span>
                  <span className="text-violet-300 uppercase">EQ: {eqMode}</span>
                  <span>·</span>
                  <span className="text-emerald-300">REV: {reverbPercent}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition shadow-lg backdrop-blur-sm"
            >
              <Minimize2 size={15} />
              <span>Exit Full Screen (Esc)</span>
            </button>
          </div>

          {/* Fullscreen Center Player */}
          <div className="relative my-auto py-6 max-w-5xl mx-auto w-full" style={{ zIndex: 10 }}>
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
              eqMode={eqMode}
              reverbPercent={reverbPercent}
              isGroupMode={isGroupMode}
              groupListenersCount={groupListenersCount}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              onQualityChange={handleQualityChange}
              onEQChange={handleEQChange}
              onReverbChange={handleReverbChange}
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

          <div
            className="relative text-center font-mono text-[11px] text-zinc-400 pt-4 border-t border-white/15 backdrop-blur-xs"
            style={{ zIndex: 10 }}
          >
            VH DevTools · System 900 Ambient Glass Theater · SQLite Persistence Active
          </div>
        </div>
      )}

      {/* STANDARD DASHBOARD VIEW */}
      <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Tab Bar: Song Player vs Settings & Group Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b vh-border pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-2xl border vh-border vh-bg-card p-1 shadow-sm">
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

            {/* Group Session Mode Toggle Badge */}
            {isGroupMode ? (
              <button
                onClick={() => {
                  setIsGroupMode(false);
                  void apiClient.sendMusicGroupAction({ type: "deactivate-group" });
                  showToast("Switched to Solo Mode", "success");
                }}
                className="flex items-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-mono font-bold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:bg-cyan-500/25 transition cursor-pointer"
                title="Click to switch to Solo Local Mode"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
                <span className="tracking-wide">GROUP SYNC</span>
                <span className="rounded-lg bg-cyan-500/30 px-1.5 py-0.5 text-[10px] text-cyan-200">
                  {groupListenersCount} {groupListenersCount === 1 ? "device" : "devices"}
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsGroupMode(true);
                  void apiClient.sendMusicGroupAction({ type: "activate-group" });
                  showToast("Switched to Synchronized Group Session", "success");
                }}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition cursor-pointer"
                title="Click to enable Synchronized Group Session"
              >
                <Radio size={14} className="text-zinc-400" />
                <span>Solo Mode</span>
                <span className="text-[10px] text-zinc-500 hover:text-cyan-300">(Join Group)</span>
              </button>
            )}
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
            <span className="mx-1">·</span>
            <span className="text-violet-400 font-bold uppercase">EQ: {eqMode}</span>
            <span className="mx-1">·</span>
            <span className="text-emerald-400 font-bold">REV: {reverbPercent}%</span>
          </div>
        </div>

        {/* TAB 1: SONG PLAYER TAB */}
        {activeTab === "song" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Audio Autoplay Unblock Banner for newly connected laptops */}
            {audioBlocked && (
              <div
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current
                      .play()
                      .then(() => {
                        setIsPlaying(true);
                        setAudioBlocked(false);
                      })
                      .catch(() => {});
                  }
                }}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 text-cyan-200 shadow-xl cursor-pointer hover:border-cyan-400 transition animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <Radio size={22} className="text-cyan-400 animate-spin" />
                  <div>
                    <div className="font-bold text-sm text-white">Group Session Audio is Live!</div>
                    <div className="text-xs text-cyan-300">Tap anywhere to join synchronized playback on this device</div>
                  </div>
                </div>
                <button className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-4 py-2 text-xs shadow-md transition">
                  Listen Now
                </button>
              </div>
            )}

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
              eqMode={eqMode}
              reverbPercent={reverbPercent}
              isGroupMode={isGroupMode}
              groupListenersCount={groupListenersCount}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              onQualityChange={handleQualityChange}
              onEQChange={handleEQChange}
              onReverbChange={handleReverbChange}
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
                eqMode,
                reverbPercent,
              }}
              stats={statsQuery.data}
              onUpdateSettings={(partial) => {
                if (partial.soundQuality) setSoundQuality(partial.soundQuality);
                if (partial.downloadQuality) setDownloadQuality(partial.downloadQuality);
                if (partial.autoPlay !== undefined) setAutoPlay(partial.autoPlay);
                if (partial.shuffle !== undefined) setShuffle(partial.shuffle);
                if (partial.eqMode) {
                  setEqMode(partial.eqMode);
                  audioFXEngine.setEQ(partial.eqMode);
                }
                if (partial.reverbPercent !== undefined) {
                  setReverbPercent(partial.reverbPercent);
                  audioFXEngine.setReverb(partial.reverbPercent);
                }
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
