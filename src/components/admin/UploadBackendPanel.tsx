import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RotateCcw, Server } from "lucide-react";
import { Card, inputClass } from "@/components/admin/ui";
import { defaultUploadConfig, pingUploadBackend, useUploadConfig } from "@/lib/upload-config";
import { defaultPayConfig, pingPayBackend, usePayConfig } from "@/lib/pay-config";

/** Lets the admin point the app at any R2 signing server without a redeploy. */
export function UploadBackendPanel() {
  const { config, save, reset } = useUploadConfig();
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [token, setToken] = useState(config.token);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiUrl(config.apiUrl);
    setToken(config.token);
  }, [config.apiUrl, config.token]);

  const dirty = apiUrl.trim().replace(/\/+$/, "") !== config.apiUrl || token.trim() !== config.token;

  async function handleTest() {
    const target = apiUrl.trim();
    if (!target) {
      toast.error("Enter the backend link first.");
      return;
    }
    setTesting(true);
    try {
      await pingUploadBackend(target);
      toast.success("Upload backend is online.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach that server.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-3.5">
      <Card title="UPLOAD BACKEND">
        <p className="mb-3 text-[11px] leading-relaxed text-mb-muted">
          The website itself runs without any server of its own. Uploads are signed by this
          external service, and file bytes go straight from the browser to Cloudflare R2.
          Change the link below to switch to a different upload server — it applies immediately,
          no redeploy needed.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[9px] font-semibold tracking-[0.1em] text-mb-dim">BACKEND LINK</span>
            <input
              className={inputClass}
              placeholder="https://your-upload-server.up.railway.app"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[9px] font-semibold tracking-[0.1em] text-mb-dim">UPLOAD TOKEN</span>
            <input
              className={inputClass}
              placeholder="UPLOAD_TOKEN from that server"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              spellCheck={false}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              save({ apiUrl, token });
              toast.success("Upload backend updated.");
            }}
            className="btn-solid-blue px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-mb-text disabled:opacity-50"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              SAVE LINK
            </span>
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="btn-solid-slate px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-mb-muted hover:text-mb-text disabled:opacity-50"
          >
            <span className="flex items-center gap-1.5">
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Server className="size-3.5" />}
              TEST CONNECTION
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              toast.success("Reset to the default upload backend.");
            }}
            className="btn-solid-slate px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-mb-muted hover:text-mb-text"
          >
            <span className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5" />
              RESET
            </span>
          </button>
        </div>

        <div className="mt-3 grid gap-1 text-[10px] text-mb-dim">
          <span>
            In use: <span className="text-mb-text">{config.apiUrl}</span>
          </span>
          <span>Default: {defaultUploadConfig.apiUrl}</span>
        </div>
      </Card>

      <PayBackendCard />
    </div>
  );
}

/** Lets the admin point mobile-money payments at any Relworx server. */
function PayBackendCard() {
  const { config, save, reset } = usePayConfig();
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiUrl(config.apiUrl);
  }, [config.apiUrl]);

  const dirty = apiUrl.trim().replace(/\/+$/, "") !== config.apiUrl;

  async function handleTest() {
    const target = apiUrl.trim();
    if (!target) {
      toast.error("Enter the payment link first.");
      return;
    }
    setTesting(true);
    try {
      await pingPayBackend(target);
      toast.success("Payment backend is online.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach that server.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card title="PAYMENT BACKEND">
      <p className="mb-3 text-[11px] leading-relaxed text-mb-muted">
        Mobile money deposits, withdrawals and wallet balance are handled by this external
        service. Change the link to switch payment servers — it applies immediately, no
        redeploy needed.
      </p>

      <label className="grid gap-1.5">
        <span className="text-[9px] font-semibold tracking-[0.1em] text-mb-dim">PAYMENT LINK</span>
        <input
          className={inputClass}
          placeholder="https://your-payment-server.up.railway.app"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          spellCheck={false}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            save({ apiUrl });
            toast.success("Payment backend updated.");
          }}
          className="btn-solid-blue px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-mb-text disabled:opacity-50"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" />
            SAVE LINK
          </span>
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="btn-solid-slate px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-mb-muted hover:text-mb-text disabled:opacity-50"
        >
          <span className="flex items-center gap-1.5">
            {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Server className="size-3.5" />}
            TEST CONNECTION
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            toast.success("Reset to the default payment backend.");
          }}
          className="btn-solid-slate px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-mb-muted hover:text-mb-text"
        >
          <span className="flex items-center gap-1.5">
            <RotateCcw className="size-3.5" />
            RESET
          </span>
        </button>
      </div>

      <div className="mt-3 grid gap-1 text-[10px] text-mb-dim">
        <span>
          In use: <span className="text-mb-text">{config.apiUrl}</span>
        </span>
        <span>Default: {defaultPayConfig.apiUrl}</span>
      </div>
    </Card>
  );
}
