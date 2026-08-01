import { Star } from "lucide-react";
import { NavItem, type NavEntry } from "@/components/NavItem";
import { useApp } from "@/store/app-store";

const navItems: NavEntry[] = [
  { label: "HOME", route: "/", icon: "home" },
  { label: "MOVIES", route: "/movies", icon: "film" },
  { label: "SERIES", route: "/series", icon: "tv" },
  { label: "ANIMATION", route: "/animation", icon: "animation" },
  { label: "LATEST", route: "/latest", icon: "latest" },
  { label: "TRENDING", route: "/trending", icon: "fire" },
  { label: "SONG OF THE WEEK", route: "/song", icon: "music" },
  { label: "AGENT", route: "/agent", icon: "agent" },
  { label: "ABOUT US", route: "/about", icon: "about" },
];

export function AppSidebar() {
  const { openSubscribe, isAdmin } = useApp();

  return (
    <aside className="hide-scrollbar hidden w-40 shrink-0 flex-col overflow-y-auto rounded-2xl bg-mb-sidebar/70 py-2 md:flex">
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavItem key={item.route} item={item} />
        ))}
        {isAdmin && <NavItem item={{ label: "ADMIN", route: "/admin", icon: "settings" }} />}
      </nav>

      <div className="px-2.5 pb-2 pt-2">
        <button
          onClick={openSubscribe}
          className="btn-gold flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[9px] font-bold uppercase tracking-[0.1em] transition-all hover:opacity-90 active:scale-95"
        >
          <Star className="size-2.5 fill-current" />
          Subscribe
        </button>
      </div>

      <div className="px-2.5 pb-1">
        <NavItem item={{ label: "SETTINGS", route: "/settings", icon: "settings" }} />
      </div>
    </aside>
  );
}
