"use client";

import { createContext, useContext, type RefObject } from "react";

import type { Episode } from "@/lib/episode-catalog";

export interface GlobalPlayerState {
  episode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadError: boolean;
  bufferedPct: number;
  isInitialLoading: boolean;
  isSeekBuffering: boolean;
  resumeNotice: string | null;
  resumeHintVisible: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  hasClearableProgress: boolean;
  programmaticVolume: boolean;
}

export interface GlobalPlayerControls {
  loadEpisode: (episode: Episode) => void;
  togglePlay: () => void;
  seek: (seconds: number, notice?: string) => void;
  skip: (deltaSecs: number) => void;
  dismiss: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRate: () => void;
  clearProgress: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
}

export type PlayerContextValue = GlobalPlayerState & GlobalPlayerControls;

const noop = () => {};

export const defaultPlayerState: GlobalPlayerState = {
  episode: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loadError: false,
  bufferedPct: 0,
  isInitialLoading: false,
  isSeekBuffering: false,
  resumeNotice: null,
  resumeHintVisible: false,
  volume: 1,
  muted: false,
  playbackRate: 1,
  hasClearableProgress: false,
  programmaticVolume: true,
};

export const PlayerContext = createContext<PlayerContextValue>({
  ...defaultPlayerState,
  loadEpisode: noop,
  togglePlay: noop,
  seek: noop,
  skip: noop,
  dismiss: noop,
  setVolume: noop,
  toggleMute: noop,
  cycleRate: noop,
  clearProgress: noop,
  audioRef: { current: null },
});

export function usePlayerContext(): PlayerContextValue {
  return useContext(PlayerContext);
}
