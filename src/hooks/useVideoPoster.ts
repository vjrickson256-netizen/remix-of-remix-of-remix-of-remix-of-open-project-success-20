import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/**
 * Grabs a frame from a video file to use as its poster when no cover art exists.
 * Returns the provided fallback immediately, then upgrades to the captured frame.
 */
export function useVideoPoster(videoUrl?: string, fallback?: string) {
  const [poster, setPoster] = useState<string | undefined>(
    fallback || (videoUrl ? cache.get(videoUrl) : undefined),
  );

  useEffect(() => {
    if (fallback) {
      setPoster(fallback);
      return;
    }
    if (!videoUrl) {
      setPoster(undefined);
      return;
    }
    const cached = cache.get(videoUrl);
    if (cached) {
      setPoster(cached);
      return;
    }

    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const capture = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (!canvas.width || !canvas.height) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", 0.7);
        cache.set(videoUrl, url);
        if (!cancelled) setPoster(url);
      } catch {
        /* cross-origin frame — keep placeholder */
      }
    };

    const onLoaded = () => {
      try {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      } catch {
        capture();
      }
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("seeked", capture);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("seeked", capture);
      video.src = "";
    };
  }, [videoUrl, fallback]);

  return poster;
}
