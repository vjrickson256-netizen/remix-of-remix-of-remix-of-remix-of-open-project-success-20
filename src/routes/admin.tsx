import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  CreditCard,
  Film,
  LayoutGrid,
  Lock,
  Music,
  Tv,
  Users,
  Server,
  Wallet as WalletIcon,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { useCatalog } from "@/store/catalog-store";
import { ADMIN_EMAIL } from "@/lib/firebase";
import { StatCard, Card, Pill } from "@/components/admin/ui";
import { ContentPanel } from "@/components/admin/ContentPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { ActivitiesPanel } from "@/components/admin/ActivitiesPanel";
import { SubscriptionsPanel, WalletPanel } from "@/components/admin/BillingPanels";
import { UploadBackendPanel } from "@/components/admin/UploadBackendPanel";
import { isActive, useAdminUsers, useSubscriptions, useTransactions, walletBalance } from "@/lib/admin-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — CALMALENG.NET" },
      { name: "description", content: "Manage content, users, subscriptions, activity and wallet on CALMALENG.NET." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Dashboard — CALMALENG.NET" },
      { property: "og:description", content: "Manage content, users, subscriptions, activity and wallet." },
    ],
  }),
  component: AdminPage,
});

type SectionKey = "overview" | "content" | "users" | "activities" | "subscriptions" | "wallet" | "settings";

const sections: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "OVERVIEW", icon: <LayoutGrid className="size-3.5" /> },
  { key: "content", label: "CONTENT", icon: <Film className="size-3.5" /> },
  { key: "users", label: "USERS", icon: <Users className="size-3.5" /> },
  { key: "activities", label: "ACTIVITIES", icon: <Activity className="size-3.5" /> },
  { key: "subscriptions", label: "SUBSCRIPTIONS", icon: <CreditCard className="size-3.5" /> },
  { key: "wallet", label: "WALLET", icon: <WalletIcon className="size-3.5" /> },
  { key: "settings", label: "SETTINGS", icon: <Server className="size-3.5" /> },
];

function AdminPage() {
  const { user, isLoggedIn, isAdmin, ready, activities, openAuth, clearActivity } = useApp();
  const { all, movies, series, songs } = useCatalog();
  const [active, setActive] = useState<SectionKey>("overview");

  const allowed = isLoggedIn && isAdmin;
  const users = useAdminUsers(allowed);
  const subscriptions = useSubscriptions(allowed);
  const transactions = useTransactions(allowed);

  if (!ready)
    return (
      <div className="grid gap-3 p-6">
        <div className="skeleton h-9 w-56" />
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="skeleton h-52 w-full" />
          <div className="skeleton h-52 w-full" />
        </div>
      </div>
    );

  if (!allowed) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-20 text-center">
        <Lock className="size-8 text-mb-dim" />
        <h1 className="text-sm font-extrabold tracking-[0.08em] text-mb-text">
          {isLoggedIn ? "ACCESS DENIED" : "SIGN IN REQUIRED"}
        </h1>
        <p className="max-w-sm text-xs text-mb-muted">
          {isLoggedIn
            ? `This dashboard is restricted to ${ADMIN_EMAIL}.`
            : `Sign in with ${ADMIN_EMAIL} to access the admin dashboard.`}
        </p>
        {isLoggedIn ? (
          <Link to="/" className="liquid-btn-accent px-5 py-2.5 text-[10px] font-semibold tracking-[0.1em]">
            GO HOME
          </Link>
        ) : (
          <button
            onClick={() => openAuth("login")}
            className="liquid-btn-accent px-5 py-2.5 text-[10px] font-semibold tracking-[0.1em]"
          >
            SIGN IN
          </button>
        )}
      </div>
    );
  }

  const activeSubs = subscriptions.filter(isActive);
  const balance = walletBalance(transactions);

  return (
    <div className="min-h-full pb-10">
      <div className="sticky top-0 z-10 mx-4 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#1f2c3d] bg-[#0e1520] px-4 py-3 shadow-[0_18px_40px_-20px_rgba(6,10,18,0.9)]">
        <h1 className="mr-auto text-[11px] font-semibold tracking-[0.12em] text-mb-text">
          ADMIN DASHBOARD
          <span className="ml-2 text-[9px] font-normal tracking-normal text-mb-dim">{user?.email}</span>
        </h1>
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[9px] font-semibold tracking-[0.1em] transition-colors ${
              active === s.key
                ? "btn-solid-blue"
                : "btn-solid-slate text-mb-muted hover:text-mb-text"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3.5 px-4 py-4">
        {active === "overview" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard tone="indigo" icon={<Film className="size-4" />} label="MOVIES" value={movies.length} />
              <StatCard tone="violet" icon={<Tv className="size-4" />} label="SERIES" value={series.length} />
              <StatCard tone="pink" icon={<Music className="size-4" />} label="SONGS" value={songs.length} />
              <StatCard tone="cyan" icon={<Users className="size-4" />} label="USERS" value={users.length} />
              <StatCard
                tone="green"
                icon={<CreditCard className="size-4" />}
                label="ACTIVE SUBS"
                value={activeSubs.length}
                hint={`${subscriptions.length - activeSubs.length} expired`}
              />
              <StatCard tone="gold" icon={<WalletIcon className="size-4" />} label="WALLET" value={`UGX ${balance.toLocaleString()}`} />
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <Card title="LATEST ACTIVITY">
                {activities.length === 0 && <p className="text-[11px] text-mb-dim">Nothing recorded yet.</p>}
                <div className="grid gap-1.5">
                  {activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-[10px] text-mb-muted">
                      <Pill tone="green">{a.type.toUpperCase()}</Pill>
                      <span className="min-w-0 flex-1 truncate text-mb-text">{a.detail}</span>
                      <span className="shrink-0 text-mb-dim">{new Date(a.at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="LATEST TRANSACTIONS">
                {transactions.length === 0 && <p className="text-[11px] text-mb-dim">No transactions yet.</p>}
                <div className="grid gap-1.5">
                  {transactions.slice(0, 8).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-[10px] text-mb-muted">
                      {t.type === "credit" ? <Pill tone="green">IN</Pill> : <Pill tone="red">OUT</Pill>}
                      <span className="min-w-0 flex-1 truncate text-mb-text">{t.detail}</span>
                      <span className="shrink-0">UGX {t.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <p className="text-[10px] text-mb-dim">
              {all.length} titles live — every page reads only what you upload here.
            </p>
          </>
        )}

        {active === "content" && <ContentPanel />}
        {active === "users" && <UsersPanel users={users} subscriptions={subscriptions} />}
        {active === "activities" && <ActivitiesPanel activities={activities} onClearAll={clearActivity} />}
        {active === "subscriptions" && <SubscriptionsPanel subscriptions={subscriptions} />}
        {active === "wallet" && <WalletPanel transactions={transactions} />}
      </div>
    </div>
  );
}
