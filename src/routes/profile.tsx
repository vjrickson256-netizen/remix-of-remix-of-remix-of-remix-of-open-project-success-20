import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Star, User } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { useWatchlist } from "@/store/watchlist-store";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — CALMALENG.NET" },
      { name: "description", content: "View and update your CALMALENG.NET account details and activity." },
      { property: "og:title", content: "My Profile — CALMALENG.NET" },
      { property: "og:description", content: "Your CALMALENG.NET account details and recent activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoggedIn, openAuth, openSubscribe, updateUser, activities } = useApp();
  const { ids } = useWatchlist();
  const { active: subscribed } = useSubscription();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  if (!isLoggedIn || !user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-16">
        <p className="text-xs text-mb-muted">Sign in to view your profile.</p>
        <button
          onClick={() => openAuth("login")}
          className="btn-indigo rounded-md px-4 py-2 text-[9px] font-extrabold tracking-[0.08em]"
        >
          SIGN IN
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-16">
      <div className="hairline-b px-6 pb-5 pt-7">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-extrabold tracking-[0.12em] text-mb-muted">
          <User className="size-2.5" />
          ACCOUNT
        </span>
        <h1 className="text-xl font-extrabold tracking-[0.06em] text-mb-text">MY PROFILE</h1>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 px-6 py-6">
        <div className="panel flex items-center gap-3 rounded-xl p-3.5">
          <img src={user.avatar} alt={user.name} className="size-14 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold tracking-[0.04em] text-mb-text">
              {user.name.toUpperCase()}
            </p>
            <p className="truncate text-[11px] text-mb-muted">{user.email}</p>
            <span className="mt-1 inline-block rounded border border-white/10 px-2 py-0.5 text-[8px] font-extrabold tracking-[0.1em] text-mb-dim">
              {user.provider.toUpperCase()} ACCOUNT
            </span>
          </div>
        </div>

        <section>
          <p className="mb-2.5 text-[10px] font-extrabold tracking-[0.12em] text-mb-muted">DISPLAY NAME</p>
          <div className="panel flex gap-2 rounded-xl p-3.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Display name"
              className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-mb-text focus:border-mb-green/50 focus:outline-none"
            />
            <button
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) {
                  toast.error("Name cannot be empty.");
                  return;
                }
                updateUser({ name: trimmed });
                toast.success("Profile updated");
              }}
              className="btn-indigo rounded-md px-4 text-[10px] font-extrabold tracking-[0.08em]"
            >
              SAVE
            </button>
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <Link to="/watchlist" className="panel flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:bg-mb-hover">
            <Bookmark className="size-4 text-mb-green" />
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-mb-text">MY WATCHLIST</p>
              <p className="text-[9px] font-bold tracking-[0.06em] text-mb-dim">{ids.length} SAVED TITLES</p>
            </div>
          </Link>
          <button
            onClick={openSubscribe}
            className="panel flex items-center gap-3 rounded-xl p-3.5 text-left transition-colors hover:bg-mb-hover"
          >
            <Star className="size-4 text-[#f59e0b]" />
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-mb-text">SUBSCRIPTION</p>
              <p className="text-[9px] font-bold tracking-[0.06em] text-mb-dim">
                {subscribed ? "ACTIVE" : "NOT ACTIVE — TAP TO SUBSCRIBE"}
              </p>
            </div>
          </button>
        </section>

        <section>
          <p className="mb-2.5 text-[10px] font-extrabold tracking-[0.12em] text-mb-muted">RECENT ACTIVITY</p>
          <div className="panel grid gap-2 rounded-xl p-3.5">
            {activities.length === 0 && <p className="text-[11px] text-mb-dim">No activity yet.</p>}
            {activities.slice(0, 15).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[11px] text-mb-muted">{a.detail}</p>
                <span className="shrink-0 text-[9px] text-mb-dim">{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
