import type { Movie } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 px-1 py-1.5 md:py-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 md:px-0 md:py-4 xl:grid-cols-8">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} fluid />
      ))}
    </div>
  );
}

export function FilterChip({
  label,
  active,
  onClick,
  tone = "indigo",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "indigo" | "gold" | "red" | "green";
}) {
  const activeTone = {
    indigo: "bg-[rgba(124,141,252,0.15)] border-[rgba(124,141,252,0.35)] text-mb-text",
    gold: "bg-[rgba(251,154,84,0.15)] border-[rgba(251,154,84,0.35)] text-mb-text",
    red: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)] text-[#f87171]",
    green: "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)] text-[#4ade80]",
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`rounded-[5px] border px-3 py-1 text-[9px] font-extrabold tracking-[0.08em] transition-all ${
        active ? activeTone : "border-white/[0.08] text-mb-muted hover:border-white/[0.18] hover:text-mb-text"
      }`}
    >
      {label}
    </button>
  );
}

export function SortSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label="Sort by"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none rounded-[5px] border border-white/[0.08] bg-white/5 py-1 pl-2.5 pr-6 text-[9px] font-extrabold tracking-[0.06em] text-mb-text outline-none"
    >
      <option value="newest">NEWEST FIRST</option>
      <option value="rating">TOP RATED</option>
      <option value="title">A → Z</option>
    </select>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5 p-20 text-mb-dim">
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

export function sortMovies(list: Movie[], sortBy: string): Movie[] {
  const copy = [...list];
  if (sortBy === "rating") return copy.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
  if (sortBy === "title") return copy.sort((a, b) => a.title.localeCompare(b.title));
  return copy.sort((a, b) => (b.year || 0) - (a.year || 0));
}

/** Build artwork-backed category cards from the catalog. */
export function buildCategories(
  list: Movie[],
  defs: { value: string; label: string; match?: ((m: Movie) => boolean) | undefined }[],
) {
  return defs.map((d) => {
    const hit = d.match ? list.find(d.match) : list[0];
    const fallback = list[0];
    const source = hit || fallback;
    return {
      value: d.value,
      label: d.label,
      image: source?.backdrop || source?.poster,
    };
  });
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Every category present in a catalog: All, Movies/Series (when both exist)
 * and one entry per genre, most common first.
 */
export function allCategoryDefs(list: Movie[]) {
  const defs: { value: string; label: string; match?: ((m: Movie) => boolean) | undefined }[] = [
    { value: "All", label: "All" },
  ];
  const hasMovies = list.some((m) => (m.type ?? "movie") === "movie");
  const hasSeries = list.some((m) => m.type === "series");
  if (hasMovies && hasSeries) {
    defs.push({ value: "Movies", label: "Movies", match: (m) => (m.type ?? "movie") === "movie" });
    defs.push({ value: "Series", label: "Series", match: (m) => m.type === "series" });
  }

  const counts = new Map<string, number>();
  for (const m of list) {
    for (const g of m.genres || []) {
      const key = g.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([genre]) => {
      const label = titleCase(genre);
      defs.push({
        value: label,
        label,
        match: (m) => (m.genres || []).some((g) => g.toLowerCase() === genre),
      });
    });

  return defs;
}

/** Artwork-backed cards for every category present in a catalog. */
export function allCategories(list: Movie[]) {
  return buildCategories(list, allCategoryDefs(list));
}

/** Filter a catalog by a category value produced by `allCategoryDefs`. */
export function filterByCategory(list: Movie[], category: string): Movie[] {
  if (category === "All") return list;
  if (category === "Movies") return list.filter((m) => (m.type ?? "movie") === "movie");
  if (category === "Series") return list.filter((m) => m.type === "series");
  return list.filter((m) => (m.genres || []).some((g) => g.toLowerCase() === category.toLowerCase()));
}


