import { Music, Play } from "lucide-react";
import type { Song } from "@/data/songs";
import { useVideoPoster } from "@/hooks/useVideoPoster";

export function SongCard({
  song,
  playing,
  onToggle,
}: {
  song: Song;
  playing: boolean;
  onToggle: () => void;
}) {
  const src = song.videoUrl ?? song.audioUrl;
  const poster = useVideoPoster(song.videoUrl, song.coverUrl);

  return (
    <article className="group flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {playing && src ? (
          <video
            key={src}
            src={src}
            poster={poster}
            controls
            autoPlay
            playsInline
            className="size-full object-contain"
          />
        ) : (
          <button
            type="button"
            aria-label={`Play ${song.title} music video`}
            onClick={onToggle}
            className="size-full"
          >
            {poster ? (
              <img
                src={poster}
                alt={`${song.title} music video thumbnail`}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-white/[0.04] text-mb-dim">
                <Music className="size-6" />
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Play className="size-5 fill-white text-white" />
              </span>
            </span>
            {song.duration ? (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {song.duration}
              </span>
            ) : null}
          </button>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-xs font-bold leading-snug tracking-[0.02em] text-mb-text">
          {song.title.toUpperCase()}
        </h3>
        <p className="mt-0.5 truncate text-[10px] font-bold tracking-[0.08em] text-mb-muted">
          {song.artist.toUpperCase()}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-mb-dim">
          {song.genre} • {song.year}
        </p>
      </div>

      {playing && !src ? (
        <p className="text-[10px] text-mb-dim">No music video uploaded for this song yet.</p>
      ) : null}
    </article>
  );
}
