import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog } from "@/store/catalog-store";
import { EmptyState, MovieGrid, allCategories, filterByCategory } from "@/components/catalog";
import { CategoryTabs } from "@/components/CategoryTabs";
import { GridSkeleton } from "@/components/Skeletons";

export const Route = createFileRoute("/animation")({
  head: () => ({
    meta: [
      { title: "Animation — CALMALENG.NET" },
      { name: "description", content: "Family friendly animated movies and shows on CALMALENG.NET." },
      { property: "og:title", content: "Animation — CALMALENG.NET" },
      { property: "og:description", content: "Family friendly animated movies and shows." },
    ],
  }),
  component: AnimationPage,
});

function AnimationPage() {
  const { all, ready } = useCatalog();
  const [active, setActive] = useState("All");

  const animations = useMemo(
    () => all.filter((m) => m.genres.some((g) => g.toLowerCase() === "animation")),
    [all],
  );
  const categories = useMemo(() => allCategories(animations), [animations]);
  const filtered = useMemo(() => filterByCategory(animations, active), [animations, active]);

  return (
    <div className="min-h-full pb-10">
      <h1 className="sr-only">Animation</h1>
      <CategoryTabs items={categories} active={active} onChange={setActive} />
      {filtered.length ? (
        <MovieGrid movies={filtered} />
      ) : !ready ? (
        <GridSkeleton />
      ) : (
        <EmptyState message="No animation titles in this category yet." />
      )}
    </div>
  );
}
