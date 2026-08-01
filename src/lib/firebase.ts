import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

import { ADMIN_EMAIL, firebaseConfig } from "@/lib/firebase-config";

export { ADMIN_EMAIL, firebaseConfig };

export function isAdminEmail(email: string | null | undefined) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(firebaseApp);

/**
 * In the browser we enable the IndexedDB cache so repeat visits paint the
 * catalog instantly from disk while the network snapshot refreshes behind it.
 */
function createDb(): Firestore {
  if (typeof window === "undefined") return getFirestore(firebaseApp);
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db: Firestore = createDb();

/** Analytics is browser-only — call from an effect, never during SSR. */
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  return (await isSupported()) ? getAnalytics(firebaseApp) : null;
}
