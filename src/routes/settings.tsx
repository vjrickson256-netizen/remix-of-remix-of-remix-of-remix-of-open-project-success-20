import { createFileRoute, Link } from "@tanstack/react-router";
import { deleteUser } from "firebase/auth";
import { Bookmark, SlidersHorizontal, User } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { useWatchlist } from "@/store/watchlist-store";
import { usePrefs } from "@/lib/prefs";
import { auth } from "@/lib/firebase";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CALMALENG.NET" },
      { name: "description", content: "Manage your CALMALENG.NET account, playback preferences and watch history." },
      { property: "og:title", content: "Settings — CALMALENG.NET" },
      { property: "og:description", content: "Manage your account, playback preferences and watch history." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, isLoggedIn, logout, openAuth, clearActivity } = useApp();
  const { ids } = useWatchlist();
  const { prefs, setPref } = usePrefs();

  async function handleDelete() {
    const current = auth.currentUser;
    if (!current) return;
    const ok = window.confirm(
      "This permanently deletes your account. This cannot be undone. Continue?",
    );
    if (!ok) return;
    try {
      await deleteUser(current);
      toast.success("Your account has been deleted.");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/requires-recent-login") {
        toast.error("Please sign out, sign in again, then delete your account.");
      } else {
        toast.error("Could not delete your account. Please try again.");
      }
    }
  }

  return (
    <div className="min-h-full pb-16">
      <div className="hairline-b px-6 pb-5 pt-7">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-extrabold tracking-[0.12em] text-mb-muted">
          <SlidersHorizontal className="size-2.5" />
          CONFIG
        </span>
        <h1 className="text-xl font-extrabold tracking-[0.06em] text-mb-text">SETTINGS</h1>
        <p className="mt-1 text-[10px] font-bold tracking-[0.1em] text-mb-muted">
          CUSTOMIZE YOUR EXPERIENCE
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 px-6 py-6">
        <Section title="ACCOUNT">
          <div className="panel flex items-center gap-3 rounded-xl p-3.5">
            {isLoggedIn && user ? (
              <>
                <img src={user.avatar} alt={user.name} className="size-12 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold tracking-[0.06em] text-mb-text">
                    {user.name.toUpperCase()}
                  </p>
                  <p className="truncate text-[11px] text-mb-muted">{user.email}</p>
                  <span className="mt-1 inline-block rounded border border-white/10 px-2 py-0.5 text-[8px] font-extrabold tracking-[0.1em] text-mb-dim">
                    {user.provider.toUpperCase()} ACCOUNT
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-[9px] font-extrabold tracking-[0.08em] text-destructive transition-colors hover:bg-destructive/20"
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-white/5">
                  <User className="size-5 text-mb-dim" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold tracking-[0.06em] text-mb-text">NOT SIGNED IN</p>
                  <p className="text-[11px] text-mb-muted">Sign in to sync your preferences</p>
                </div>
                <button
                  onClick={() => openAuth("login")}
                  className="btn-indigo rounded-md px-3.5 py-2 text-[9px] font-extrabold tracking-[0.08em]"
                >
                  SIGN IN
                </button>
              </>
            )}
          </div>

          {isLoggedIn && (
            <>
              <Row label="EDIT PROFILE" desc="CHANGE YOUR DISPLAY NAME AND REVIEW YOUR ACTIVITY">
                <LinkButton to="/profile" label="OPEN" />
              </Row>
              <Row label="MY WATCHLIST" desc={`${ids.length} TITLE${ids.length === 1 ? "" : "S"} SAVED TO WATCH LATER`}>
                <LinkButton to="/watchlist" label="VIEW" icon />
              </Row>
            </>
          )}
        </Section>

        <Section title="PLAYBACK">
          <Row label="AUTOPLAY" desc="START PLAYING AS SOON AS A TITLE PAGE OPENS">
            <Toggle
              on={prefs.autoplay}
              onToggle={() => setPref("autoplay", !prefs.autoplay)}
              label="Autoplay"
            />
          </Row>
          <Row label="START MUTED" desc="BEGIN PLAYBACK WITH SOUND TURNED OFF">
            <Toggle on={prefs.muted} onToggle={() => setPref("muted", !prefs.muted)} label="Start muted" />
          </Row>
        </Section>

        <Section title="DANGER ZONE" danger>
          <Row label="CLEAR WATCH HISTORY" desc="REMOVE ALL VIEWING AND ACTIVITY HISTORY FROM YOUR ACCOUNT">
            <DangerButton
              label="CLEAR"
              onClick={() => {
                clearActivity();
                toast.success("Watch history cleared");
              }}
            />
          </Row>
          {isLoggedIn && (
            <Row label="DELETE ACCOUNT" desc="PERMANENTLY DELETE YOUR ACCOUNT AND SIGN YOU OUT">
              <DangerButton label="DELETE" onClick={() => void handleDelete()} />
            </Row>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section>
      <p
        className={`mb-2.5 text-[10px] font-extrabold tracking-[0.12em] ${
          danger ? "text-destructive" : "text-mb-muted"
        }`}
      >
        {title}
      </p>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel flex items-center gap-4 rounded-xl px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold tracking-[0.06em] text-mb-text">{label}</p>
        <p className="mt-0.5 text-[9px] font-bold tracking-[0.06em] text-mb-dim">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function LinkButton({ to, label, icon }: { to: string; label: string; icon?: boolean }) {
  return (
    <Link
      to={to}
      className="btn-ghost-line flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[9px] font-extrabold tracking-[0.08em] text-mb-text"
    >
      {icon && <Bookmark className="size-3" />}
      {label}
    </Link>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-mb-green" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function DangerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-[9px] font-extrabold tracking-[0.08em] text-destructive transition-colors hover:bg-destructive/20"
    >
      {label}
    </button>
  );
}
