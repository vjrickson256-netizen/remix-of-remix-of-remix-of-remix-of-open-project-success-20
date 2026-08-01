import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { useCatalog } from "@/store/catalog-store";
import { HomeSkeleton } from "@/components/Skeletons";
import { CategoryTabs } from "@/components/CategoryTabs";
import { allCategories, filterByCategory, MovieGrid, EmptyState, SortSelect, sortMovies } from "@/components/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CALMALENG.NET — Stream Luo translated Movies & Series Online" },
      {
        name: "description",
        content:
          "Watch and download Luo Translated trending movies, series and animation in HD on CALMALENG.NET. Stream anything, anywhere.",
      },
      { property: "og:title", content: "CALMALENG.NET — Stream Luo translated Movies & Series Online" },
      {
        property: "og:description",
        content: "Watch and download Luo Translated trending movies, series and animation in HD on CALMALENG.NET. Stream anything, anywhere.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { hero, all, ready, slides } = useCatalog();
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const categories = useMemo(() => allCategories(all), [all]);
  const list = useMemo(() => sortMovies(filterByCategory(all, category), sortBy), [all, category, sortBy]);

  if (!ready && !all.length) return <HomeSkeleton />;

  if (!all.length && !slides.length) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 p-20 text-center">
        <h1 className="text-sm font-extrabold tracking-[0.08em] text-mb-text">CALMALENG.NET</h1>
        <p className="text-xs text-mb-muted">No titles have been uploaded yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-10">
      <h1 className="sr-only">CALMALENG.NET — stream movies and series</h1>
      <HeroCarousel movies={hero} slides={slides} />
      <CategoryTabs items={categories} active={category} onChange={setCategory} />
      <div className="flex items-center justify-end px-4 pb-1 md:px-6">
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>
      {list.length ? <MovieGrid movies={list} /> : <EmptyState message="Nothing in this category yet." />}
    </div>
  );
}
