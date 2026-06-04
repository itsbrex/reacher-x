export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxPosterUrl(
  playbackId: string,
  options: {
    time?: number;
    width?: number;
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.time !== undefined) {
    params.set("time", String(options.time));
  }

  if (options.width !== undefined) {
    params.set("width", String(options.width));
  }

  const query = params.toString();
  const suffix = query.length > 0 ? `?${query}` : "";

  return `https://image.mux.com/${playbackId}/thumbnail.webp${suffix}`;
}
