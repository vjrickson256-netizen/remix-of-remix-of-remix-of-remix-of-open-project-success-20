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

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "TV Series — CALMALENG.NET" },
      { name: "description", content: "Binge complete TV series and seasons on CALMALENG.NET." },
      { property: "og:title", content: "TV Series — CALMALENG.NET" },
      { property: "og:description", content: "Binge complete TV series and seasons on CALMALENG.NET." },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const { series, ready } = useCatalog();
  const [active, setActive] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const categories = useMemo(() => allCategories(series), [series]);
  const filtered = useMemo(
    () => sortMovies(filterByCategory(series, active), sortBy),
    [series, active, sortBy],
  );

  return (
    <div className="min-h-full pb-10">
      <h1 className="sr-only">TV Series</h1>
      <CategoryTabs items={categories} active={active} onChange={setActive} />
      <div className="flex items-center justify-end px-4 pb-1 md:px-6">
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>
      {filtered.length ? (
        <MovieGrid movies={filtered} />
      ) : !ready ? (
        <GridSkeleton />
      ) : (
        <EmptyState message="No series in this category yet." />
      )}
    </div>
  );
}
