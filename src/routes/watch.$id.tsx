import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Download,
  Lock,
  MessageSquare,
  Play,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import type { Episode, Movie as MovieType } from "@/data/movies";
import { db } from "@/lib/firebase";
import { useApp } from "@/store/app-store";
import { useCatalog } from "@/store/catalog-store";
import { useWatchlist } from "@/store/watchlist-store";
import { usePrefs } from "@/lib/prefs";
import { useSubscription } from "@/hooks/use-subscription";
import { MuxVideoPlayer } from "@/components/MuxVideoPlayer";

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: "Watch — CALMALENG.NET" },
      { name: "description", content: "Stream titles uploaded to CALMALENG.NET in HD." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WatchPage,
});

interface Comment {
  id: string;
  user: string;
  initials: string;
  time: string;
  text: string;
  at?: string;
}

function WatchPage() {
  const { id } = Route.useParams();
  const { getById, ready: catalogReady } = useCatalog();

  const movie = getById(Number(id));

  if (!movie) {
    return (
      <div className="p-16 text-center text-xs text-mb-muted">
        {catalogReady ? "This title is no longer available." : "Loading…"}
      </div>
    );
  }

  return <WatchDetail movie={movie} />;
}

function WatchDetail({ movie }: { movie: MovieType }) {
  const { logActivity, user, isLoggedIn, openAuth, openSubscribe, openAgentSubscribe } = useApp();
  const { related: relatedFor } = useCatalog();
  const { active, agentActive, loading: subLoading } = useSubscription();
  // Agent titles are unlocked by the separate Agent plan only.
  const subscribed = movie.agent ? agentActive : active;
  const promptSubscribe = () => (movie.agent ? openAgentSubscribe() : openSubscribe());

  function requireSubscription() {
    if (!isLoggedIn) {
      toast.info("Sign in to continue");
      openAuth("login");
      return false;
    }
    if (!subscribed) {
      toast.info("An active subscription is required");
      promptSubscribe();
      return false;
    }
    return true;
  }

  const related = useMemo(() => relatedFor(movie, 8), [movie, relatedFor]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);
  const { has: inWatchlist, toggle: toggleWatchlist } = useWatchlist();
  const { prefs } = usePrefs();
  const bookmarked = inWatchlist(movie.id);
  const episodeList = movie.episodes ?? [];
  const currentEpisode =
    movie.type === "series" && episodeList.length
      ? episodeList.find((ep) => ep.number === activeEpisode) ??
        episodeList.find((ep) => ep.videoUrl) ??
        episodeList[0]
      : undefined;
  const playbackUrl = currentEpisode?.videoUrl || movie.videoUrl;
  const playbackPoster = currentEpisode?.thumbnail || movie.backdrop || movie.poster;
  const playbackTitle = currentEpisode
    ? `${movie.title} — EP ${currentEpisode.number}: ${currentEpisode.title}`
    : movie.title;
  const [likes, setLikes] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const playerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logActivity("watch", `Started watching: ${movie.title}`);
    setActiveSeason(1);
    setActiveEpisode(null);
    setLikes(0);
  }, [movie.id, movie.title, logActivity]);

  // Comments live in Firestore so they are shared across every visitor.
  useEffect(() => {
    // No orderBy: keeps the query index-free, sorted client-side instead.
    const q = query(collection(db, "comments"), where("titleId", "==", movie.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs
            .map((d) => {
            const data = d.data() as { user?: string; text?: string; at?: string };
            const name = data.user || "Guest";
            return {
              id: d.id,
              user: name,
              initials: name.slice(0, 2).toUpperCase(),
              time: data.at ? new Date(data.at).toLocaleString() : "just now",
              text: data.text ?? "",
              at: data.at ?? "",
            };
            })
            .sort((a, b) => (a.at < b.at ? 1 : -1)),
        );
      },
      (err) => console.error("Comment listener failed", err),
    );
    return unsub;
  }, [movie.id]);

  function postComment() {
    const text = newComment.trim();
    if (!text) return;
    const name = user?.name || "Guest";
    setNewComment("");
    void addDoc(collection(db, "comments"), {
      titleId: movie.id,
      uid: user?.uid ?? null,
      user: name,
      text,
      at: new Date().toISOString(),
      createdAt: serverTimestamp(),
    })
      .then(() => toast.success("Comment posted"))
      .catch((err) => {
      console.error("Failed to post comment", err);
      toast.error("Could not post your comment.");
    });
    logActivity("comment", `Commented on: ${movie.title}`);
  }

  function fileNameFor(url: string) {
    const clean = url.split("?")[0] ?? "";
    const ext = clean.slice(clean.lastIndexOf(".")).match(/^\.[a-z0-9]{2,5}$/i)?.[0] ?? ".mp4";
    return `${movie.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")}${ext}`;
  }

  /**
   * Hands the file straight to the browser's own download manager instead of
   * buffering it in memory, so the user sees the native download UI/progress
   * and can pause, resume or cancel it like any other browser download.
   */
  async function handleDownload() {
    if (!requireSubscription()) return;
    const url = playbackUrl;
    if (!url) {
      toast.error("No file available for this title yet.");
      return;
    }
    const name = fileNameFor(url);
    logActivity("download", `Downloaded: ${movie.title}`);
    // Fully client-side. Video files are large (tens/hundreds of MB), so we
    // stream them with visible progress instead of silently buffering.
    const toastId = toast.loading("Starting download…");
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`File request failed (${res.status}).`);
      const total = Number(res.headers.get("content-length") || 0);
      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;
      let lastTick = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value as unknown as BlobPart);
          received += value.byteLength;
          const now = Date.now();
          if (now - lastTick > 400) {
            lastTick = now;
            const mb = (received / 1048576).toFixed(1);
            toast.loading(
              total
                ? `Downloading… ${Math.round((received / total) * 100)}% (${mb} MB)`
                : `Downloading… ${mb} MB`,
              { id: toastId },
            );
          }
        }
      }
      const blob = new Blob(chunks, { type: res.headers.get("content-type") || "video/mp4" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
      toast.success("Saved — check your browser downloads", { id: toastId });
    } catch (err) {
      console.error(err);
      // Last resort: hand the raw URL to the browser's own download manager.
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.info("Opened the file — use your browser's save option", { id: toastId });
    }
  }


  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: movie.title, text: `Watch ${movie.title} on CALMALENG.NET`, url };
    try {
      if (typeof navigator !== "undefined" && navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }
      await copyLink(url);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      await copyLink(url);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Could not copy the link.");
      }
      ta.remove();
    }
  }

  return (
    <div className="min-h-full pb-12">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <div
            ref={playerRef}
            className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
          >
            {playbackUrl || movie.muxPlaybackId ? (
              subscribed ? (
                <MuxVideoPlayer
                  key={playbackUrl ?? movie.muxPlaybackId ?? "player"}
                  src={playbackUrl}
                  playbackId={movie.muxPlaybackId}
                  poster={playbackPoster}
                  title={playbackTitle}
                  autoPlay={prefs.autoplay || activeEpisode !== null}
                  muted={prefs.muted}
                />
              ) : (
                <>
                  <img
                    src={movie.backdrop || movie.poster}
                    alt={`${movie.title} backdrop`}
                    className="size-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-6 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#f59e0b]">
                      <Lock className="size-5 text-[#1a1206]" />
                    </div>
                    <span className="text-[11px] font-extrabold tracking-[0.08em] text-white">
                      {movie.agent ? "AGENT PLAN REQUIRED TO WATCH" : "SUBSCRIPTION REQUIRED TO WATCH"}
                    </span>
                    <button
                      disabled={subLoading}
                      onClick={() => (isLoggedIn ? promptSubscribe() : openAuth("login"))}
                      className="btn-solid-gold px-5 py-2 text-[10px] font-extrabold tracking-[0.1em] transition-colors disabled:opacity-60"
                    >
                      {isLoggedIn ? "SUBSCRIBE WITH MOBILE MONEY" : "SIGN IN TO SUBSCRIBE"}
                    </button>
                  </div>
                </>
              )
            ) : (
              <>
                <img
                  src={movie.backdrop || movie.poster}
                  alt={`${movie.title} backdrop`}
                  className="size-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/15">
                    <Play className="size-6 fill-white text-white" />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.08em] text-white/50">
                    NO VIDEO AVAILABLE FOR THIS TITLE
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="hairline-b mt-3 flex flex-wrap items-center gap-2 pb-3">
            <h1 className="text-sm font-extrabold tracking-[0.04em] text-mb-text">
              {movie.title.toUpperCase()}
            </h1>
            <span className="text-mb-dim">·</span>
            <span className="text-xs text-mb-muted">{movie.year}</span>
            {movie.duration ? (
              <>
                <span className="text-mb-dim">·</span>
                <span className="text-xs text-mb-muted">{movie.duration}</span>
              </>
            ) : null}

            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={handleDownload}
                className="btn-solid-green flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-extrabold tracking-[0.08em] transition-colors"
              >
                {subscribed ? <Download className="size-3.5" /> : <Lock className="size-3.5" />}
                DOWNLOAD
              </button>
              <ActionButton icon={<Share2 className="size-3.5" />} label="SHARE" onClick={handleShare} />
              <ActionButton
                icon={<MessageSquare className="size-3.5" />}
                label="COMMENT"
                onClick={() => setCommentOpen((v) => !v)}
              />
              <IconButton
                active={bookmarked}
                label="Bookmark"
                onClick={() => {
                  if (!toggleWatchlist(movie.id)) {
                    toast.info("Sign in to save titles to your watchlist");
                    openAuth("login");
                    return;
                  }
                  toast.success(bookmarked ? "Removed from your watchlist" : "Saved to your watchlist");
                }}
                icon={<Bookmark className={`size-3.5 ${bookmarked ? "fill-current" : ""}`} />}
              />
              <IconButton
                label={`Like (${likes})`}
                onClick={() => setLikes((v) => v + 1)}
                icon={<ThumbsUp className="size-3.5" />}
              />
            </div>
          </div>

          {commentOpen && (
            <div className="panel mt-3 rounded-xl p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-[0.1em] text-mb-muted">COMMENTS</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-mb-text">
                  {comments.length}
                </span>
              </div>
              <div className="mb-3 grid gap-2.5">
                {comments.length === 0 && (
                  <p className="text-[11px] text-mb-dim">Be the first to comment.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mb-green/20 text-[9px] font-extrabold text-mb-green">
                      {c.initials}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold tracking-[0.06em] text-mb-text">
                        {c.user.toUpperCase()}
                      </span>
                      <span className="ml-2 text-[9px] text-mb-dim">{c.time}</span>
                      <p className="mt-0.5 text-xs text-mb-muted">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && postComment()}
                  placeholder="WRITE A COMMENT..."
                  aria-label="Write a comment"
                  className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] tracking-[0.04em] text-mb-text placeholder:text-mb-dim focus:border-mb-green/50 focus:outline-none"
                />
                <button
                  onClick={postComment}
                  className="btn-indigo rounded-md px-4 text-[10px] font-extrabold tracking-[0.08em]"
                >
                  SEND
                </button>
              </div>
            </div>
          )}

          {movie.type === "series" && movie.episodes?.length ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-[0.1em] text-mb-muted">EPISODES</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: movie.seasons || 1 }, (_, i) => i + 1).map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveSeason(s)}
                      className={`rounded-[5px] border px-2.5 py-1 text-[9px] font-extrabold tracking-[0.06em] transition-all ${
                        activeSeason === s
                          ? "border-mb-green/35 bg-mb-green/15 text-mb-text"
                          : "border-white/[0.08] text-mb-muted hover:text-mb-text"
                      }`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {movie.episodes.map((ep: Episode) => (
                  <button
                    key={ep.number}
                    type="button"
                    onClick={() => {
                      if (!ep.videoUrl) {
                        toast.info("No video uploaded for this episode yet.");
                        return;
                      }
                      setActiveEpisode(ep.number);
                      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`panel group flex gap-2.5 overflow-hidden rounded-lg p-2 text-left transition-colors hover:bg-mb-hover ${
                      currentEpisode?.number === ep.number ? "ring-1 ring-mb-green/50" : ""
                    }`}
                  >
                    <img
                      src={ep.thumbnail}
                      alt={`${movie.title} episode ${ep.number}`}
                      loading="lazy"
                      className="h-14 w-24 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-[0.06em] text-mb-muted">
                        EP {ep.number}
                      </p>
                      <p className="truncate text-xs font-semibold text-mb-text">{ep.title}</p>
                      <p className="text-[10px] text-mb-dim">
                        {ep.duration}
                        {ep.videoUrl ? "" : " · no video yet"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel mt-5 rounded-xl p-4">
            {movie.description ? (
              <p className="mb-3 text-xs leading-relaxed text-mb-muted">{movie.description}</p>
            ) : null}
            <div className="grid gap-2">
              {movie.director ? <CrewRow label="DIRECTOR" value={movie.director} /> : null}
              {movie.cast?.length ? <CrewRow label="CAST" value={movie.cast.join(", ")} /> : null}
              <CrewRow label="GENRES" value={movie.genres.join(", ")} />
              <CrewRow label="LANGUAGE" value={movie.language.toUpperCase()} />
              <CrewRow label="TYPE" value={(movie.type || "movie").toUpperCase()} />
            </div>
          </div>
        </div>

        <aside className="min-w-0">
          <p className="mb-2.5 text-[10px] font-extrabold tracking-[0.1em] text-mb-muted">MORE LIKE THIS</p>
          <div className="grid gap-2">
            {related.map((rel) => (
              <Link
                key={rel.id}
                to="/watch/$id"
                params={{ id: String(rel.id) }}
                className="panel group flex gap-2.5 rounded-lg p-2 transition-colors hover:bg-mb-hover"
              >
                <div className="relative h-[68px] w-11 shrink-0 overflow-hidden rounded">
                  <img
                    src={rel.poster}
                    alt={`${rel.title} poster`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="size-3 fill-white text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold tracking-[0.02em] text-mb-text">
                    {rel.title.toUpperCase()}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] text-mb-muted">
                    <span>{rel.year}</span>

                    {rel.imdbRating ? (
                      <span className="font-bold text-[#f5c518]">★ {rel.imdbRating}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[9px] font-bold tracking-[0.06em] text-mb-dim">
                    {rel.genres.slice(0, 2).map((g) => g.toUpperCase()).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CrewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-[11px]">
      <span className="w-20 shrink-0 font-extrabold tracking-[0.08em] text-mb-dim">{label}</span>
      <span className="text-mb-muted">{value}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[9px] font-extrabold tracking-[0.08em] transition-all hover:opacity-90 ${
        accent ? "btn-indigo" : "border border-white/[0.08] text-mb-muted hover:text-mb-text"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`rounded-md border border-white/[0.08] p-1.5 transition-all hover:text-mb-text ${
        active ? "border-mb-green/40 text-mb-green" : "text-mb-muted"
      }`}
    >
      {icon}
    </button>
  );
}
