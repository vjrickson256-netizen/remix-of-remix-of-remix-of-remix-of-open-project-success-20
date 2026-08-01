import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/store/watchlist-store";
import { useCatalog } from "@/store/catalog-store";
import { useApp } from "@/store/app-store";
import { MovieGrid, EmptyState } from "@/components/catalog";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "My Watchlist — CALMALENG.NET" },
      { name: "description", content: "Every movie and series you saved to watch later on CALMALENG.NET." },
      { property: "og:title", content: "My Watchlist — CALMALENG.NET" },
      { property: "og:description", content: "Your saved movies and series on CALMALENG.NET." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { isLoggedIn, openAuth } = useApp();
  const { ids, ready } = useWatchlist();
  const { all } = useCatalog();
  const saved = all.filter((m) => ids.includes(m.id));

  return (
    <div className="min-h-full pb-16">
      <div className="hairline-b px-6 pb-5 pt-7">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-extrabold tracking-[0.12em] text-mb-muted">
          <Bookmark className="size-2.5" />
          SAVED
        </span>
        <h1 className="text-xl font-extrabold tracking-[0.06em] text-mb-text">MY WATCHLIST</h1>
        <p className="mt-1 text-[10px] font-bold tracking-[0.1em] text-mb-muted">
          {saved.length} TITLE{saved.length === 1 ? "" : "S"} SAVED TO WATCH LATER
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="flex flex-col items-center gap-3 p-16">
          <p className="text-xs text-mb-muted">Sign in to build your watchlist.</p>
          <button
            onClick={() => openAuth("login")}
            className="btn-indigo rounded-md px-4 py-2 text-[9px] font-extrabold tracking-[0.08em]"
          >
            SIGN IN
          </button>
        </div>
      ) : !ready ? (
        <p className="p-16 text-center text-xs text-mb-muted">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-16">
          <EmptyState message="Nothing saved yet." />
          <Link to="/movies" className="btn-indigo rounded-md px-4 py-2 text-[9px] font-extrabold tracking-[0.08em]">
            BROWSE MOVIES
          </Link>
        </div>
      ) : (
        <MovieGrid movies={saved} />
      )}
    </div>
  );
}
