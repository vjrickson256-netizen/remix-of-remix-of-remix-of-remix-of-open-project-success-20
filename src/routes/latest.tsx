import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog } from "@/store/catalog-store";
import { EmptyState, MovieGrid, allCategories, filterByCategory } from "@/components/catalog";
import { CategoryTabs } from "@/components/CategoryTabs";
import { GridSkeleton } from "@/components/Skeletons";

export const Route = createFileRoute("/latest")({
  head: () => ({
    meta: [
      { title: "Latest Releases — CALMALENG.NET" },
      { name: "description", content: "Freshly added movies and series, newest first, on CALMALENG.NET." },
      { property: "og:title", content: "Latest Releases — CALMALENG.NET" },
      { property: "og:description", content: "Freshly added movies and series, newest first." },
    ],
  }),
  component: LatestPage,
});

function LatestPage() {
  const { all: catalog, ready } = useCatalog();
  const [active, setActive] = useState("All");
  const categories = useMemo(() => allCategories(catalog), [catalog]);
  const all = useMemo(
    () => [...filterByCategory(catalog, active)].sort((a, b) => (b.year || 0) - (a.year || 0)),
    [catalog, active],
  );

  return (
    <div className="min-h-full pb-10">
      <h1 className="sr-only">Latest releases</h1>
      <CategoryTabs items={categories} active={active} onChange={setActive} />
      {all.length ? (
        <MovieGrid movies={all} />
      ) : !ready ? (
        <GridSkeleton />
      ) : (
        <EmptyState message="No content uploaded yet." />
      )}
    </div>
  );
}
