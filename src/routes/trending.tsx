import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog } from "@/store/catalog-store";
import { EmptyState, allCategories, filterByCategory } from "@/components/catalog";
import { CategoryTabs } from "@/components/CategoryTabs";
import { GridSkeleton } from "@/components/Skeletons";
import { MovieCard } from "@/components/MovieCard";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending Now — CALMALENG.NET" },
      { name: "description", content: "The most watched movies and series this week on CALMALENG.NET." },
      { property: "og:title", content: "Trending Now — CALMALENG.NET" },
      { property: "og:description", content: "The most watched movies and series this week." },
    ],
  }),
  component: TrendingPage,
});

function TrendingPage() {
  const { all, ready } = useCatalog();
  const [active, setActive] = useState("All");

  const ranked = useMemo(
    () => [...all].sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0)),
    [all],
  );

  const categories = useMemo(() => allCategories(ranked), [ranked]);

  const filtered = useMemo(() => filterByCategory(ranked, active), [active, ranked]);

  return (
    <div className="min-h-full pb-10">
      <h1 className="sr-only">Trending now</h1>
      <CategoryTabs items={categories} active={active} onChange={setActive} />
      {filtered.length ? (
        <div className="grid grid-cols-4 gap-1.5 px-1 py-1.5 md:py-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 md:px-6 md:py-5 xl:grid-cols-8">
          {filtered.map((m, i) => (
            <div key={m.id} className="relative">
              <span className="pointer-events-none absolute -left-1 bottom-7 z-0 text-4xl font-extrabold leading-none text-white/[0.06]">
                {i + 1}
              </span>
              <MovieCard movie={m} fluid />
            </div>
          ))}
        </div>
      ) : !ready ? (
        <GridSkeleton />
      ) : (
        <EmptyState message="No trending titles in this category." />
      )}
    </div>
  );
}
