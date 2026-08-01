import { useState, type FormEvent } from "react";
import { Eye, EyeOff, X } from "lucide-react";
const logoAsset = { url: "/logo.png" };
import { useApp, type AuthTab } from "@/store/app-store";

export function AuthModal() {
  const { authOpen, authTab, closeAuth, openAuth, login, register, loginWithGoogle } = useApp();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  if (!authOpen) return null;

  function setTab(tab: AuthTab) {
    setError("");
    openAuth(tab);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(loginEmail, loginPassword);
    setLoading(false);
    if (!res.ok) return setError(res.error || "Login failed.");
    setLoginEmail("");
    setLoginPassword("");
    closeAuth();
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) return setError("Passwords do not match.");
    setLoading(true);
    const res = await register(regName, regEmail, regPassword);
    setLoading(false);
    if (!res.ok) return setError(res.error || "Registration failed.");
    closeAuth();
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    setGoogleLoading(false);
    if (!res.ok) return setError("Google sign-in failed.");
    closeAuth();
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(6,11,18,0.85)] p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuth();
      }}
    >
      <div className="relative w-full max-w-[320px] rounded-[10px] border border-white/10 bg-[rgba(14,20,30,0.98)] px-5 pb-[18px] pt-[22px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <button
          aria-label="Close"
          onClick={closeAuth}
          className="absolute right-2.5 top-2.5 rounded p-1.5 text-mb-muted transition-all hover:bg-white/5 hover:text-mb-text"
        >
          <X className="size-3.5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <img
            src={logoAsset.url}
            alt="CALMALENG.NET logo"
            className="size-10 shrink-0 rounded-lg object-cover shadow-[0_0_12px_rgba(251,163,39,0.35)]"
          />
          <div>
            <p className="text-[13px] font-extrabold leading-none tracking-[0.02em] text-mb-text">
              CALMALENG<span className="text-mb-green">.NET</span>
            </p>
            <p className="mt-0.5 text-[8px] font-bold tracking-[0.1em] text-mb-dim">
              STREAM ANYTHING, ANYWHERE
            </p>
          </div>
        </div>

        <div className="mb-3 flex gap-[3px] rounded-lg border border-white/5 bg-white/[0.04] p-[3px]">
          {(["login", "register"] as AuthTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`flex-1 rounded-md py-2 text-[10px] font-extrabold tracking-[0.08em] transition-all ${
                authTab === tab ? "bg-mb-green/20 text-mb-green" : "text-mb-muted hover:text-mb-text"
              }`}
            >
              {tab === "login" ? "SIGN IN" : "REGISTER"}
            </button>
          ))}
        </div>

        <button
          disabled={loading}
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-2.5 text-[10px] font-extrabold tracking-[0.08em] text-mb-text transition-all hover:bg-white/[0.08] disabled:opacity-60"
        >
          {googleLoading ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-mb-green border-t-transparent" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          CONTINUE WITH GOOGLE
        </button>

        <div className="my-3 flex items-center gap-2 text-[9px] font-bold tracking-[0.1em] text-mb-dim">
          <span className="h-px flex-1 bg-white/[0.07]" />
          OR
          <span className="h-px flex-1 bg-white/[0.07]" />
        </div>

        {error ? (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[10px] font-bold text-destructive">
            {error}
          </div>
        ) : null}

        {authTab === "login" ? (
          <form onSubmit={handleLogin} className="grid gap-3">
            <Field label="EMAIL">
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={inputClass}
              />
            </Field>
            <Field label="PASSWORD">
              <div className="relative">
                <input
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={inputClass}
                />
                <PwdToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-3 accent-[#7c8dfc]"
                />
                <span className="text-[10px] font-bold tracking-[0.04em] text-mb-muted">REMEMBER ME</span>
              </label>
              <button type="button" className="text-[10px] font-bold tracking-[0.04em] text-mb-green hover:underline">
                FORGOT?
              </button>
            </div>
            <SubmitButton loading={loading && !googleLoading} label="SIGN IN" />
            <p className="text-center text-[10px] font-bold tracking-[0.04em] text-mb-muted">
              NO ACCOUNT?{" "}
              <button type="button" className="text-mb-green hover:underline" onClick={() => setTab("register")}>
                REGISTER FREE
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="grid gap-3">
            <Field label="FULL NAME">
              <input
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                type="text"
                placeholder="Your name"
                autoComplete="name"
                required
                className={inputClass}
              />
            </Field>
            <Field label="EMAIL">
              <input
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={inputClass}
              />
            </Field>
            <Field label="PASSWORD">
              <div className="relative">
                <input
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  type={showPwd ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
                <PwdToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />
              </div>
            </Field>
            <Field label="CONFIRM PASSWORD">
              <input
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                type={showPwd ? "text" : "password"}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </Field>
            <SubmitButton loading={loading && !googleLoading} label="CREATE ACCOUNT" />
            <p className="text-center text-[10px] font-bold tracking-[0.04em] text-mb-muted">
              HAVE AN ACCOUNT?{" "}
              <button type="button" className="text-mb-green hover:underline" onClick={() => setTab("login")}>
                SIGN IN
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-mb-text placeholder:text-mb-dim focus:border-mb-green/50 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[9px] font-extrabold tracking-[0.1em] text-mb-muted">{label}</span>
      {children}
    </label>
  );
}

function PwdToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={show ? "Hide password" : "Show password"}
      onClick={onToggle}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-muted hover:text-mb-text"
    >
      {show ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
    </button>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-indigo flex items-center justify-center rounded-lg py-2.5 text-[10px] font-extrabold tracking-[0.1em] transition-all hover:opacity-90 disabled:opacity-60"
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        label
      )}
    </button>
  );
}
