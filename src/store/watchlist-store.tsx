import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/store/app-store";

const COLLECTION = "watchlist";

interface WatchlistValue {
  ids: number[];
  ready: boolean;
  has: (id: number) => boolean;
  /** Adds or removes a title. Returns false when the visitor is not signed in. */
  toggle: (id: number) => boolean;
  remove: (id: number) => void;
}

const WatchlistContext = createContext<WatchlistValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user, logActivity } = useApp();
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setIds([]);
      setReady(true);
      return;
    }
    const q = query(collection(db, COLLECTION), where("uid", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIds(snap.docs.map((d) => Number((d.data() as { titleId?: number }).titleId)).filter(Boolean));
        setReady(true);
      },
      (err) => {
        console.error("Watchlist listener failed", err);
        setReady(true);
      },
    );
    return unsub;
  }, [user]);

  const value = useMemo<WatchlistValue>(() => {
    const key = (id: number) => `${user?.uid}_${id}`;
    return {
      ids,
      ready,
      has: (id: number) => ids.includes(id),
      toggle: (id: number) => {
        if (!user) return false;
        if (ids.includes(id)) {
          void deleteDoc(doc(db, COLLECTION, key(id))).catch((err) =>
            console.error("Failed to remove from watchlist", err),
          );
          logActivity("watchlist", `Removed title ${id} from watchlist`);
        } else {
          void setDoc(doc(db, COLLECTION, key(id)), {
            uid: user.uid,
            titleId: id,
            at: new Date().toISOString(),
          }).catch((err) => console.error("Failed to add to watchlist", err));
          logActivity("watchlist", `Added title ${id} to watchlist`);
        }
        return true;
      },
      remove: (id: number) => {
        if (!user) return;
        void deleteDoc(doc(db, COLLECTION, key(id))).catch((err) =>
          console.error("Failed to remove from watchlist", err),
        );
      },
    };
  }, [ids, ready, user, logActivity]);

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside WatchlistProvider");
  return ctx;
}
