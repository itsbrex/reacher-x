/**
 * Central registry of demo video URLs for the landing page.
 * Each key maps to light-mode and dark-mode variants.
 *
 * Replace placeholder URLs with real Screen Studio recordings
 * once they are uploaded to UploadThing.
 */

type VideoSource = {
  mp4Url: string;
  posterUrl?: string;
};

export type VideoAsset = {
  light: VideoSource;
  dark: VideoSource;
};

/** Placeholder video used until real Screen Studio recordings are ready. */
const PLACEHOLDER =
  "https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NgsGo9xphdWDIlwzXNZkSCAxQUf6RmpKqgTG2";

export const VIDEO_ASSETS = {
  hero: {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "how-step-1": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "how-step-2": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "how-step-3": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "how-step-4": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "smarter-writes": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "smarter-context": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "smarter-feedback": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "control-delegate": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
  "control-workspaces": {
    light: { mp4Url: PLACEHOLDER },
    dark: { mp4Url: PLACEHOLDER },
  },
} as const satisfies Record<string, VideoAsset>;

export type VideoAssetKey = keyof typeof VIDEO_ASSETS;
