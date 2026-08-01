import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Pause, Play, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useCatalog } from "@/store/catalog-store";
import { SongCard } from "@/components/SongCard";
import { useVideoPoster } from "@/hooks/useVideoPoster";

export const Route = createFileRoute("/song")({
  head: () => ({
    meta: [
      { title: "Song of the Week — CALMALENG.NET" },
      { name: "description", content: "Hear the hand-picked song of the week and the full playlist on CALMALENG.NET." },
      { property: "og:title", content: "Song of the Week — CALMALENG.NET" },
      { property: "og:description", content: "Hear the hand-picked song of the week and the full playlist." },
    ],
  }),
  component: SongPage,
});

function SongPage() {
  const { songs, featuredSong: featured, songsReady } = useCatalog();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const isFeaturedPlaying = !!featured && playingId === featured.id;

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: featured?.title ?? "Song", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* dismissed */
    }
  }

  if (!featured && !songsReady) {
    return (
      <div className="min-h-full pb-12">
        <div className="skeleton h-[300px] w-full rounded-none" />
        <div className="grid gap-3 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="p-16 text-center text-xs text-mb-muted">
        No songs have been uploaded yet.
      </div>
    );
  }

  const featuredVideo = featured.videoUrl ?? featured.audioUrl;
  const featuredPoster = useVideoPoster(featured.videoUrl, featured.coverUrl);

  return (
    <div className="min-h-full pb-12">
      <h1 className="sr-only">Song of the week</h1>

      <div className="relative aspect-video max-h-[420px] w-full overflow-hidden bg-black">
        {isFeaturedPlaying && featuredVideo ? (
          <video
            key={featuredVideo}
            src={featuredVideo}
            poster={featuredPoster}
            controls
            autoPlay
            playsInline
            className="size-full object-contain"
          />
        ) : (
          <>
            <img
              src={featuredPoster}
              alt={`${featured.title} music video cover`}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,17,24,0.95),rgba(12,17,24,0.25))]" />
            <div className="btn-indigo absolute left-5 top-5 rounded-full px-3 py-1 text-[9px] font-extrabold tracking-[0.12em]">
              MUSIC VIDEO OF THE WEEK
            </div>
            <button
              aria-label="Play music video"
              onClick={() => setPlayingId(featured.id)}
              className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-transform hover:scale-105"
            >
              <Play className="size-6 fill-white text-white" />
            </button>
          </>
        )}
      </div>

      <div className="hairline-b flex flex-wrap items-end justify-between gap-4 px-6 py-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-[0.04em] text-mb-text">
            {featured.title.toUpperCase()}
          </h2>
          <p className="text-xs font-bold tracking-[0.1em] text-mb-green">
            {featured.artist.toUpperCase()}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold tracking-[0.06em] text-mb-muted">
            <span className="rounded border border-white/10 px-2 py-0.5">{featured.genre.toUpperCase()}</span>
            <span>{featured.year}</span>
            <span className="text-[#f5c518]">★ {featured.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPlayingId(isFeaturedPlaying ? null : featured.id)}
            className="btn-indigo flex items-center gap-2 rounded-md px-4 py-2 text-[10px] font-extrabold tracking-[0.08em] transition-all hover:opacity-90"
          >
            {isFeaturedPlaying ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
            {isFeaturedPlaying ? "CLOSE VIDEO" : "WATCH VIDEO"}
          </button>
          <button
            aria-label="Like"
            onClick={() => setLiked((v) => !v)}
            className={`rounded-md border border-white/[0.08] p-2 transition-all ${
              liked ? "border-mb-green/40 text-mb-green" : "text-mb-muted hover:text-mb-text"
            }`}
          >
            <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
          </button>
          <button
            aria-label="Share"
            onClick={handleShare}
            className="rounded-md border border-white/[0.08] p-2 text-mb-muted transition-all hover:text-mb-text"
          >
            <Share2 className="size-3.5" />
          </button>
        </div>
      </div>

      {isFeaturedPlaying && !featuredVideo ? (
        <p className="px-6 pb-2 text-[11px] text-mb-dim">No music video has been uploaded for this song yet.</p>
      ) : null}


      <section className="px-6 py-5">
        <p className="mb-3 text-[10px] font-extrabold tracking-[0.12em] text-mb-muted">ALL SONGS</p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {songs.map((s) => (
            <SongCard
              key={s.id}
              song={s}
              playing={playingId === s.id}
              onToggle={() => setPlayingId(playingId === s.id ? null : s.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
