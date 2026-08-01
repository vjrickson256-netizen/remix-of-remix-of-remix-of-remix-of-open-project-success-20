import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db, initAnalytics, isAdminEmail } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  provider: "local" | "google";
  isAdmin?: boolean;
}

export interface ActivityEntry {
  id: string;
  type: string;
  detail: string;
  at: string;
  email?: string | undefined;
}

function avatarFor(seed: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=6366f1`;
}

function toAuthUser(fbUser: FirebaseUser): AuthUser {
  const email = fbUser.email ?? "";
  const name = fbUser.displayName || email.split("@")[0] || "User";
  return {
    uid: fbUser.uid,
    name,
    email,
    avatar: fbUser.photoURL || avatarFor(name),
    provider: fbUser.providerData.some((p) => p.providerId === "google.com") ? "google" : "local",
    isAdmin: isAdminEmail(email),
  };
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised in Firebase Auth settings.";
    default:
      return (err as { message?: string })?.message || "Something went wrong. Please try again.";
  }
}

export type AuthResult = { ok: boolean; error?: string };
export type AuthTab = "login" | "register";

interface AppContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  activities: ActivityEntry[];
  logActivity: (type: string, detail: string) => void;
  clearActivity: () => void;
  authOpen: boolean;
  authTab: AuthTab;
  subscribeOpen: boolean;
  agentSubscribeOpen: boolean;
  openAuth: (tab?: AuthTab) => void;
  closeAuth: () => void;
  openSubscribe: () => void;
  closeSubscribe: () => void;
  openAgentSubscribe: () => void;
  closeAgentSubscribe: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

async function upsertProfile(user: AuthUser) {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        isAdmin: user.isAdmin ?? false,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Failed to save profile to Firestore", err);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [agentSubscribeOpen, setAgentSubscribeOpen] = useState(false);

  useEffect(() => {
    void initAnalytics();
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const profile = toAuthUser(fbUser);
        setUser(profile);
        void upsertProfile(profile);
      } else {
        setUser(null);
      }
      setReady(true);
    });
    return unsub;
  }, []);

  // Live activity feed from Firestore: admins see everything, users see their own.
  useEffect(() => {
    if (!user) {
      setActivities([]);
      return;
    }
    const base = collection(db, "activities");
    const q = user.isAdmin
      ? query(base, orderBy("at", "desc"), fsLimit(200))
      : query(base, where("uid", "==", user.uid), fsLimit(100)); // sorted client-side (no composite index needed)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setActivities(
          snap.docs
            .map((d) => {
            const data = d.data() as { type?: string; detail?: string; at?: string; email?: string };
            return {
              id: d.id,
              type: data.type ?? "event",
              detail: data.detail ?? "",
              at: data.at ?? new Date().toISOString(),
              email: data.email,
            };
            })
            .sort((a, b) => (a.at < b.at ? 1 : -1)),
        );
      },
      (err) => console.error("Activity listener failed", err),
    );
    return unsub;
  }, [user]);

  const logActivity = useCallback(
    (type: string, detail: string) => {
      const current = auth.currentUser;
      if (!current) return;
      void addDoc(collection(db, "activities"), {
        uid: current.uid,
        email: current.email ?? "",
        type,
        detail,
        at: new Date().toISOString(),
        createdAt: serverTimestamp(),
      }).catch((err) => console.error("Failed to log activity", err));
    },
    [],
  );

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!email || !password) return { ok: false, error: "All fields are required." };
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await upsertProfile(toAuthUser(cred.user));
      logActivity("login", "User signed in");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyError(err) };
    }
  }, [logActivity]);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      if (!name || !email || !password) return { ok: false, error: "All fields are required." };
      if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name, photoURL: avatarFor(name) });
        const profile = { ...toAuthUser(cred.user), name, avatar: avatarFor(name) };
        setUser(profile);
        await upsertProfile(profile);
        logActivity("register", "User registered");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    },
    [logActivity],
  );

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await upsertProfile(toAuthUser(cred.user));
      logActivity("login", "User signed in with Google");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyError(err) };
    }
  }, [logActivity]);

  const logout = useCallback(() => {
    logActivity("logout", "User signed out");
    void signOut(auth).catch((err) => console.error("Sign out failed", err));
  }, [logActivity]);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    const current = auth.currentUser;
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void upsertProfile(next);
      if (current && (patch.name || patch.avatar)) {
        void updateProfile(current, {
          displayName: next.name,
          photoURL: next.avatar,
        }).catch((err) => console.error("Failed to update profile", err));
      }
      return next;
    });
  }, []);

  const clearActivity = useCallback(() => {
    void (async () => {
      try {
        const current = auth.currentUser;
        if (!current) return;
        const base = collection(db, "activities");
        const q = isAdminEmail(current.email)
          ? query(base, orderBy("at", "desc"), fsLimit(500))
          : query(base, where("uid", "==", current.uid), fsLimit(500));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      } catch (err) {
        console.error("Failed to clear activity", err);
      }
    })();
    setActivities([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      isAdmin: !!user?.isAdmin,
      ready,
      login,
      register,
      loginWithGoogle,
      logout,
      updateUser,
      activities,
      logActivity,
      clearActivity,
      authOpen,
      authTab,
      subscribeOpen,
      agentSubscribeOpen,
      openAuth: (tab: AuthTab = "login") => {
        setAuthTab(tab);
        setAuthOpen(true);
      },
      closeAuth: () => setAuthOpen(false),
      openSubscribe: () => setSubscribeOpen(true),
      closeSubscribe: () => setSubscribeOpen(false),
      openAgentSubscribe: () => setAgentSubscribeOpen(true),
      closeAgentSubscribe: () => setAgentSubscribeOpen(false),
    }),
    [
      user,
      ready,
      login,
      register,
      loginWithGoogle,
      logout,
      updateUser,
      activities,
      logActivity,
      clearActivity,
      authOpen,
      authTab,
      subscribeOpen,
      agentSubscribeOpen,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const useAuth = useApp;
export const useModal = useApp;
