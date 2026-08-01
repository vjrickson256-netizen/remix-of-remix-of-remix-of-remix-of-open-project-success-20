import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { Movie } from "@/data/movies";
import type { HeroSlide } from "@/store/catalog-store";

interface Item {
  key: string;
  image: string;
  title: string;
  subtitle?: string;
  year?: number | string;
  genres?: string[];
  duration?: string;
  ageRating?: string;
  imdbRating?: number | string;
  watchId?: string;
}

function fromMovie(movie: Movie): Item {
  return {
    key: `m-${movie.id}`,
    image: movie.backdrop || movie.poster,
    title: movie.title,
    ...(movie.year ? { year: movie.year } : {}),
    ...(movie.genres ? { genres: movie.genres } : {}),
    ...(movie.duration ? { duration: movie.duration } : {}),
    ...(movie.ageRating ? { ageRating: movie.ageRating } : {}),
    ...(movie.imdbRating ? { imdbRating: movie.imdbRating } : {}),
    watchId: String(movie.id),
  };
}

function fromSlide(slide: HeroSlide): Item {
  return {
    key: `s-${slide.id}`,
    image: slide.image,
    title: slide.title,
    ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
    ...(slide.linkId ? { watchId: String(slide.linkId) } : {}),
  };
}

export function HeroCarousel({ movies, slides = [] }: { movies: Movie[]; slides?: HeroSlide[] }) {
  const items: Item[] = [...slides.map(fromSlide), ...movies.map(fromMovie)];
  const [current, setCurrent] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  useEffect(() => {
    setCurrent((c) => (c >= count ? 0 : c));
  }, [count]);

  const prev = () => setCurrent((c) => (c - 1 + count) % count);
  const next = () => setCurrent((c) => (c + 1) % count);

  if (!count) return null;

  return (
    <div className="relative h-[140px] w-full overflow-hidden bg-[#070b12] sm:h-[180px] md:aspect-[16/9] md:h-auto md:max-h-[360px]">
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((item) => (
          <div key={item.key} className="relative h-full w-full shrink-0 bg-[#070b12]">
            <img
              src={item.image}
              alt={`${item.title} backdrop`}
              className="absolute inset-0 size-full object-cover object-center"
            />

            {/* Mobile: watch button only */}
            {item.watchId ? (
              <div className="absolute bottom-2 left-2 sm:hidden">
                <Link
                  to="/watch/$id"
                  params={{ id: item.watchId }}
                  className="btn-indigo flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-[11px] font-semibold transition-all hover:opacity-90"
                >
                  <Play className="size-2.5 fill-current" />
                  Watch Now
                </Link>
              </div>
            ) : null}

            {/* Desktop / tablet: compact info card */}
            <div className="absolute bottom-2.5 left-2.5 hidden max-w-[42%] rounded-[10px] border border-[#22314a] bg-[#0d1520]/95 p-2 text-mb-text sm:block">
              {item.ageRating ? <div className="age-badge mb-1">{item.ageRating}</div> : null}
              <h2 className="mb-0.5 text-sm font-bold tracking-tight">{item.title}</h2>
              {item.subtitle ? (
                <p className="mb-1 text-[10px] text-mb-muted">{item.subtitle}</p>
              ) : (
                <div className="mb-1 flex items-center gap-1.5 text-[10px] text-mb-muted">
                  {item.year ? <span>{item.year}</span> : null}
                  <span className="text-mb-dim">|</span>
                  <span className="truncate">{(item.genres || []).join(", ")}</span>
                  {item.duration ? (
                    <>
                      <span className="text-mb-dim">|</span>
                      <span>{item.duration}</span>
                    </>
                  ) : null}
                </div>
              )}
              {item.watchId ? (
                <div className="mt-1.5 flex gap-1.5">
                  <Link
                    to="/watch/$id"
                    params={{ id: item.watchId }}
                    className="btn-indigo flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-semibold transition-all hover:opacity-90"
                  >
                    <Play className="size-2.5 fill-current" />
                    Watch Now
                  </Link>
                  <Link
                    to="/watch/$id"
                    params={{ id: item.watchId }}
                    className="flex items-center gap-1.5 rounded-lg border border-[#33455e] bg-[#1e293b] px-3 py-1 text-[10px] font-semibold text-mb-text transition-all hover:bg-[#273449]"
                  >
                    More Info
                  </Link>
                </div>
              ) : null}
            </div>

            {item.imdbRating ? (
              <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded border border-[rgba(245,197,24,0.2)] bg-[#0d1119] px-1.5 py-0.5 text-[10px] font-bold text-[#f5c518]">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
                {item.imdbRating}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button
        aria-label="Previous slide"
        onClick={prev}
        className="absolute bottom-3 right-[88px] z-20 flex size-7 items-center justify-center rounded-full border border-mb-green/20 bg-[#121c2a] transition-colors hover:bg-mb-green/20"
      >
        <ChevronLeft className="size-3.5 text-mb-text" />
      </button>
      <button
        aria-label="Next slide"
        onClick={next}
        className="absolute bottom-3 right-[52px] z-20 flex size-7 items-center justify-center rounded-full border border-mb-green/20 bg-[#121c2a] transition-colors hover:bg-mb-green/20"
      >
        <ChevronRight className="size-3.5 text-mb-text" />
      </button>

      <div className="absolute bottom-[22px] right-5 z-10 flex gap-1">
        {items.map((item, i) => (
          <button
            key={item.key}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === current ? "w-4 bg-[linear-gradient(90deg,#7c8dfc,#a78bfa)]" : "w-1 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
