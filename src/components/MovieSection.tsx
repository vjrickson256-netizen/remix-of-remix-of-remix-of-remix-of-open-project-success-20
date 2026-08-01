import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";

export function MovieSection({ title, movies }: { title: string; movies: Movie[] }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);

  const onScroll = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setScrollPos(el.scrollLeft);
    setReachedEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    onScroll();
  }, [onScroll, movies]);

  return (
    <section className="px-1 py-1.5 md:px-6 md:py-2.5">
      <div className="mb-1.5 flex items-center justify-between md:mb-4">
        <h2 className="text-[13px] font-semibold md:text-[15px] tracking-tight text-mb-text">{title}</h2>
        <button className="flex items-center gap-0.5 text-xs font-medium text-mb-muted transition-colors hover:text-mb-green">
          More
          <ChevronRight className="size-3" />
        </button>
      </div>

      <div className="group relative">
        {scrollPos > 4 && (
          <button
            aria-label="Scroll left"
            onClick={() => rowRef.current?.scrollBy({ left: -450, behavior: "smooth" })}
            className="absolute bottom-5 left-0 top-0 z-10 flex w-10 items-center justify-center"
          >
            <span className="flex size-7 items-center justify-center rounded-full border border-mb-green/25 bg-mb-green/15">
              <ChevronLeft className="size-3.5 text-mb-green" />
            </span>
          </button>
        )}

        <div ref={rowRef} onScroll={onScroll} className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:gap-3">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>

        {!reachedEnd && (
          <button
            aria-label="Scroll right"
            onClick={() => rowRef.current?.scrollBy({ left: 450, behavior: "smooth" })}
            className="absolute bottom-5 right-0 top-0 z-10 flex w-10 items-center justify-center"
          >
            <span className="flex size-7 items-center justify-center rounded-full border border-mb-green/25 bg-mb-green/15">
              <ChevronRight className="size-3.5 text-mb-green" />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
