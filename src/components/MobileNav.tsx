import { Link } from "@tanstack/react-router";
import { Home, Film, Tv, BadgeCheck, Flame, User, Shield } from "lucide-react";
import { useApp } from "@/store/app-store";

const items = [
  { label: "Home", route: "/", icon: Home, exact: true },
  { label: "Movies", route: "/movies", icon: Film },
  { label: "Series", route: "/series", icon: Tv },
  { label: "Agent", route: "/agent", icon: BadgeCheck },
  { label: "Trending", route: "/trending", icon: Flame },
];

export function MobileNav() {
  const { isLoggedIn, user, isAdmin, openAuth } = useApp();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch rounded-none bg-mb-sidebar/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map(({ label, route, icon: Icon, exact }) => (
        <Link
          key={route}
          to={route}
          activeOptions={{ exact: !!exact }}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-semibold tracking-wide text-mb-muted transition-colors"
          activeProps={{ className: "!text-mb-green" }}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
          <span>{label}</span>
        </Link>
      ))}
      {isLoggedIn && isAdmin ? (
        <Link
          to="/admin"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-semibold tracking-wide text-mb-muted transition-colors"
          activeProps={{ className: "!text-mb-green" }}
        >
          <Shield className="size-[18px]" strokeWidth={2} />
          <span>Admin</span>
        </Link>
      ) : null}
      {isLoggedIn && user ? (
        <Link
          to="/settings"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-semibold tracking-wide text-mb-muted transition-colors"
          activeProps={{ className: "!text-mb-green" }}
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="size-[18px] rounded-full object-cover"
          />
          <span>Me</span>
        </Link>
      ) : (
        <button
          onClick={() => openAuth("login")}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-semibold tracking-wide text-mb-muted"
        >
          <User className="size-[18px]" strokeWidth={2} />
          <span>Me</span>
        </button>
      )}
    </nav>
  );
}
