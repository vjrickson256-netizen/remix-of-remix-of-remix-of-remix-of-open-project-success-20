import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { Movie } from "@/data/movies";
import { useApp } from "@/store/app-store";

export function MovieCard({ movie, fluid = false }: { movie: Movie; fluid?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { logActivity } = useApp();

  return (
    <Link
      to="/watch/$id"
      params={{ id: String(movie.id) }}
      className={`cursor-pointer ${fluid ? "w-full" : "w-[110px] shrink-0 md:w-[130px]"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() =>
        logActivity("click", `Clicked movie card: ${movie.title} (${movie.year}) [${movie.type || "movie"}]`)
      }
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded border border-white/5">
        <img
          src={movie.poster}
          alt={`${movie.title} poster`}
          loading="lazy"
          className={`size-full object-cover transition-transform duration-300 ${hovered ? "scale-105" : ""}`}
        />
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-9 items-center justify-center rounded-full bg-mb-green/90 shadow-[0_2px_12px_rgba(124,141,252,0.5)]">
              <Play className="size-3 fill-white text-white" />
            </div>
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-medium leading-tight text-mb-text">{movie.title}</p>
      <p className="text-[10px] leading-tight text-mb-dim">{movie.year}</p>
    </Link>
  );
}
