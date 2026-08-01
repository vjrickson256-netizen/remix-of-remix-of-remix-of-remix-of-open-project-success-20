import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ChevronDown, User, Bookmark, Star, LogOut, Download } from "lucide-react";
import { toast } from "sonner";
const logoAsset = { url: "/logo.png" };
import { useApp } from "@/store/app-store";
import { useInstallApp } from "@/lib/pwa-install";

export function AppHeader() {
  const { openAuth, openSubscribe, user, isLoggedIn, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const { installed, install } = useInstallApp();

  async function onInstall() {
    const out = await install();
    if (out.outcome === "accepted") toast.success("Installing CALMALENG.NET…");
    else if (out.outcome === "dismissed") toast.info("Install cancelled.");
    else toast.info(out.hint);
  }


  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <header className="z-50 flex shrink-0 flex-row items-center gap-2 rounded-none bg-mb-sidebar/70 px-2 py-1.5 md:m-2 md:h-14 md:gap-3 md:rounded-2xl md:px-4">
      <Link to="/" className="flex min-w-0 shrink-0 items-center gap-1.5">
        <img
          src={logoAsset.url}
          alt="CALMALENG.NET logo"
          className="size-7 shrink-0 rounded-xl object-cover md:size-8"
        />
        <span className="truncate text-[12px] font-extrabold tracking-wide text-mb-text sm:text-[13px]">
          CALMALENG<span className="text-mb-green">.NET</span>
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="relative max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[11px] -translate-y-1/2 text-mb-muted" />
          <input
            type="text"
            placeholder="Search movies / TV Shows"
            aria-label="Search movies and TV shows"
            className="w-full rounded-full border border-white/5 bg-mb-bg/80 py-1.5 pl-8 pr-3 text-[11px] text-mb-text placeholder:text-mb-muted transition-all focus:outline-none focus:ring-1 focus:ring-mb-green"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:hidden">
        <button
          onClick={openSubscribe}
          className="btn-gold rounded-full px-2.5 py-1.5 text-[10px] font-semibold tracking-wide transition-all active:scale-95"
        >
          Subscribe
        </button>
        {!isLoggedIn && (
          <button
            onClick={() => openAuth("login")}
            className="btn-ghost-line rounded-full px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-mb-text transition-all active:scale-95"
          >
            Log in
          </button>
        )}
      </div>


      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <button
          onClick={openSubscribe}
          className="btn-gold hidden rounded-full px-4 py-1.5 text-[10px] font-semibold tracking-wide transition-all hover:opacity-85 active:scale-95 md:block"
        >
          Subscribe
        </button>
        {!installed && (
          <button
            onClick={() => void onInstall()}
            className="btn-indigo hidden items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-semibold tracking-wide transition-all hover:opacity-85 active:scale-95 md:flex"
          >
            <Download className="size-3" />
            Download App
          </button>
        )}



        {isLoggedIn && user ? (
          <div className="relative" ref={avatarRef}>
            <button
              className="flex items-center gap-1.5 rounded-full px-1.5 py-1 transition-all hover:bg-mb-hover"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="size-6 rounded-full border-[1.5px] border-mb-green/50 object-cover"
              />
              <span className="max-w-[72px] truncate text-[10px] font-semibold text-mb-text">
                {user.name.split(" ")[0]}
              </span>
              <ChevronDown className="size-2" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-[100] min-w-[190px] rounded-2xl border border-white/10 bg-[rgba(16,23,34,0.98)] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                <div className="flex items-center gap-2 px-2.5 pb-2 pt-2">
                  <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-semibold text-mb-text">{user.name}</p>
                    <p className="text-[10px] text-mb-muted">{user.email}</p>
                  </div>
                </div>
                <div className="my-1 h-px bg-white/5" />
                <DropdownLink icon={<User className="size-3" />} label="Profile" to="/profile" onNavigate={() => setMenuOpen(false)} />
                <DropdownLink icon={<Bookmark className="size-3" />} label="My Watchlist" to="/watchlist" onNavigate={() => setMenuOpen(false)} />
                <DropdownItem
                  icon={<Star className="size-3" />}
                  label="Subscription"
                  onClick={() => {
                    openSubscribe();
                    setMenuOpen(false);
                  }}
                />
                <div className="my-1 h-px bg-white/5" />
                <DropdownItem
                  icon={<LogOut className="size-3" />}
                  label="Sign Out"
                  danger
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openAuth("login")}
            className="btn-ghost-line rounded-full px-4 py-1.5 text-[10px] font-medium tracking-wide text-mb-text transition-all hover:bg-mb-hover active:scale-95"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}

function DropdownLink({
  icon,
  label,
  to,
  onNavigate,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-mb-muted transition-all hover:bg-white/5 hover:text-mb-text"
    >
      {icon}
      {label}
    </Link>
  );
}

function DropdownItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-mb-muted transition-all hover:bg-white/5 hover:text-mb-text ${
        danger ? "hover:!bg-destructive/10 hover:!text-destructive" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
