import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog } from "@/store/catalog-store";
import {
  EmptyState,
  MovieGrid,
  SortSelect,
  sortMovies,
  allCategories,
  filterByCategory,
} from "@/components/catalog";
import { CategoryTabs } from "@/components/CategoryTabs";
import { GridSkeleton } from "@/components/Skeletons";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movies — CALMALENG.NET" },
      { name: "description", content: "Browse the full CALMALENG.NET movie library by category." },
      { property: "og:title", content: "Movies — CALMALENG.NET" },
      { property: "og:description", content: "Browse the full CALMALENG.NET movie library." },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { movies, ready } = useCatalog();
  const [active, setActive] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const categories = useMemo(() => allCategories(movies), [movies]);
  const filtered = useMemo(
    () => sortMovies(filterByCategory(movies, active), sortBy),
    [movies, active, sortBy],
  );

  return (
    <div className="min-h-full pb-10">
      <h1 className="sr-only">Movies</h1>
      <CategoryTabs items={categories} active={active} onChange={setActive} />
      <div className="flex items-center justify-end px-4 pb-1 md:px-6">
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>
      {filtered.length ? (
        <MovieGrid movies={filtered} />
      ) : !ready ? (
        <GridSkeleton />
      ) : (
        <EmptyState message="No titles in this category yet." />
      )}
    </div>
  );
}
