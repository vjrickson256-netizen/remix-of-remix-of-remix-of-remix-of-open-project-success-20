import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Movie } from "@/data/movies";
import type { Song } from "@/data/songs";

/** A carousel slide the admin uploads manually (not tied to any title). */
export interface HeroSlide {
  id: number;
  title: string;
  image: string;
  subtitle?: string;
  linkId?: number | null;
}

const TITLES = "titles";
const SLIDES = "slides";
const SONGS = "songs";
const CACHE_TITLES = "calmaleng:titles";
const CACHE_SONGS = "calmaleng:songs";

/** Warm cache so a returning visitor sees the library on the very first frame. */
function readCache<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeCache(key: string, list: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota exceeded — cache is best-effort only */
  }
}

function dedupe<T extends { id: number }>(list: T[]): T[] {
  const seen = new Set<number>();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

interface CatalogValue {
  ready: boolean;
  songsReady: boolean;
  all: Movie[];
  /** Everything, including Agent-marked titles (admin only). */
  allTitles: Movie[];
  /** Titles marked for the Agent page. */
  agent: Movie[];
  hero: Movie[];
  movies: Movie[];
  series: Movie[];
  songs: Song[];
  slides: HeroSlide[];
  featuredSong: Song | undefined;
  getById: (id: number) => Movie | undefined;
  related: (movie: Movie, limit?: number) => Movie[];
  saveTitle: (movie: Movie) => Promise<void>;
  removeTitle: (id: number) => Promise<void>;
  saveSong: (song: Song) => Promise<void>;
  removeSong: (id: number) => Promise<void>;
  saveSlide: (slide: HeroSlide) => Promise<void>;
  removeSlide: (id: number) => Promise<void>;
}

const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [titles, setTitles] = useState<Movie[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [ready, setReady] = useState(false);
  const [songsReady, setSongsReady] = useState(false);

  useEffect(() => {
    // 1. Paint instantly from the last known catalog…
    const cachedTitles = readCache<Movie>(CACHE_TITLES);
    const cachedSongs = readCache<Song>(CACHE_SONGS);
    if (cachedTitles.length) setTitles(dedupe(cachedTitles));
    if (cachedSongs.length) {
      setSongs(dedupe(cachedSongs));
      setSongsReady(true);
    }

    // 2. …then let Firestore stream the fresh data over the top.
    const unsubTitles = onSnapshot(
      collection(db, TITLES),
      (snap) => {
        const next = dedupe(snap.docs.map((d) => d.data() as Movie));
        setTitles(next);
        setReady(true);
        if (!snap.metadata.fromCache) writeCache(CACHE_TITLES, next);
      },
      (err) => {
        console.error("Catalog listener failed", err);
        setReady(true);
      },
    );
    const unsubSongs = onSnapshot(
      collection(db, SONGS),
      (snap) => {
        const next = dedupe(snap.docs.map((d) => d.data() as Song));
        setSongs(next);
        setSongsReady(true);
        if (!snap.metadata.fromCache) writeCache(CACHE_SONGS, next);
      },
      (err) => {
        console.error("Songs listener failed", err);
        setSongsReady(true);
      },
    );
    const unsubSlides = onSnapshot(
      collection(db, SLIDES),
      (snap) => setSlides(snap.docs.map((d) => d.data() as HeroSlide)),
      (err) => console.error("Slides listener failed", err),
    );
    return () => {
      unsubTitles();
      unsubSongs();
      unsubSlides();
    };
  }, []);

  const value = useMemo<CatalogValue>(() => {
    const allTitles = titles;
    const all = titles.filter((m) => !m.agent);
    const flagged = all.filter((m) => m.hero);
    const hero = flagged.length ? flagged : all.filter((m) => !!m.backdrop).slice(0, 5);
    const sortedSongs = [...songs].sort((a, b) => (b.year || 0) - (a.year || 0));
    return {
      ready,
      songsReady,
      all,
      allTitles,
      agent: allTitles.filter((m) => !!m.agent),
      hero: hero.length ? hero : all.slice(0, 5),
      movies: all.filter((m) => (m.type ?? "movie") === "movie"),
      series: all.filter((m) => m.type === "series"),
      songs: sortedSongs,
      slides,
      featuredSong: sortedSongs.find((s) => s.featured) ?? sortedSongs[0],
      getById: (id: number) => allTitles.find((m) => m.id === id),
      related: (movie: Movie, limit = 8) => {
        const others = all.filter((m) => m.id !== movie.id);
        const sameGenre = others.filter((m) => (m.genres || []).some((g) => (movie.genres || []).includes(g)));
        const sameType = others.filter((m) => !sameGenre.includes(m) && m.type === movie.type);
        const rest = others.filter((m) => !sameGenre.includes(m) && !sameType.includes(m));
        return [...sameGenre, ...sameType, ...rest].slice(0, limit);
      },
      saveTitle: async (movie: Movie) => {
        await setDoc(doc(db, TITLES, String(movie.id)), movie, { merge: true });
      },
      removeTitle: async (id: number) => {
        await deleteDoc(doc(db, TITLES, String(id)));
      },
      saveSong: async (song: Song) => {
        await setDoc(doc(db, SONGS, String(song.id)), song, { merge: true });
      },
      removeSong: async (id: number) => {
        await deleteDoc(doc(db, SONGS, String(id)));
      },
      saveSlide: async (slide: HeroSlide) => {
        await setDoc(doc(db, SLIDES, String(slide.id)), slide, { merge: true });
      },
      removeSlide: async (id: number) => {
        await deleteDoc(doc(db, SLIDES, String(id)));
      },
    };
  }, [titles, songs, slides, ready, songsReady]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside CatalogProvider");
  return ctx;
}
