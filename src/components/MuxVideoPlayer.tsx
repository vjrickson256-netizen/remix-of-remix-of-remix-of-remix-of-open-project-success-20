import { Suspense, lazy } from "react";

const MuxPlayer = lazy(() => import("@mux/mux-player-react"));

/**
 * Mux Player handles both Mux-hosted playback IDs and plain MP4/HLS sources
 * (our R2 uploads). It is a web component, so it is loaded lazily on the client.
 */
export function MuxVideoPlayer({
  src,
  playbackId,
  poster,
  title,
  autoPlay,
  muted,
}: {
  src?: string | undefined;
  playbackId?: string | undefined;
  poster?: string | undefined;
  title?: string | undefined;
  autoPlay?: boolean | undefined;
  muted?: boolean | undefined;
}) {
  return (
    <Suspense fallback={<div className="skeleton size-full" />}>
      <MuxPlayer
        {...(playbackId ? { playbackId } : { src: src ?? "" })}
        {...(poster ? { poster } : {})}
        {...(title ? { metadata: { video_title: title } } : {})}
        {...(autoPlay ? { autoPlay: "muted" as const } : {})}
        muted={!!muted}
        streamType="on-demand"
        accentColor="#7c8dfc"
        playsInline
        style={{ width: "100%", height: "100%", ["--controls" as string]: undefined }}
      />
    </Suspense>
  );
}
