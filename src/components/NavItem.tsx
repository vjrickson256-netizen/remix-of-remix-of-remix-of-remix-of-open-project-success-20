import { Link } from "@tanstack/react-router";
import {
  Home,
  Film,
  Tv,
  Smile,
  Clock,
  Flame,
  Music,
  Settings,
  BadgeCheck,
  Info,
  type LucideIcon,
} from "lucide-react";

export type NavIcon =
  | "home"
  | "film"
  | "tv"
  | "animation"
  | "latest"
  | "fire"
  | "music"
  | "agent"
  | "about"
  | "settings";

const icons: Record<NavIcon, LucideIcon> = {
  home: Home,
  film: Film,
  tv: Tv,
  animation: Smile,
  latest: Clock,
  fire: Flame,
  music: Music,
  agent: BadgeCheck,
  about: Info,
  settings: Settings,
};

export interface NavEntry {
  label: string;
  route: string;
  icon: NavIcon;
}

export function NavItem({ item }: { item: NavEntry }) {
  const Icon = icons[item.icon];
  return (
    <Link
      to={item.route}
      activeOptions={{ exact: item.route === "/" }}
      className="flex w-full items-center gap-2 border-l-[2px] border-transparent px-3 py-2 text-left text-[11px] font-medium text-mb-muted transition-all hover:bg-mb-hover hover:text-mb-text"
      activeProps={{
        className:
          "flex w-full items-center gap-2 border-l-[2px] px-3 py-2 text-left text-[11px] font-medium transition-all !border-mb-green !bg-mb-active !text-mb-green",
      }}
    >
      <Icon className="size-[13px] shrink-0" strokeWidth={2} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
