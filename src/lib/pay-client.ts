import { auth } from "@/lib/firebase";
import { ADMIN_EMAIL } from "@/lib/firebase-config";
import { readPayConfig } from "@/lib/pay-config";

/**
 * Mobile money (Uganda) straight from the browser to the Relworx service the
 * admin configured in the dashboard. The website itself ships no server code.
 */

type Json = Record<string, unknown>;

async function call(path: string, init?: { method?: "GET" | "POST"; body?: Json }): Promise<Json> {
  const base = readPayConfig().apiUrl;
  const res = await fetch(`${base}${path}`, {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json", accept: "application/json" },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || data["success"] === false) {
    const message =
      (typeof data["message"] === "string" && data["message"]) ||
      (typeof data["error"] === "string" && data["error"]) ||
      `Payment backend error (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

export interface ChargeResponse {
  txRef: string;
  status: "pending" | "successful" | "failed";
  message: string;
}

/** Normalises 07XXXXXXXX / +2567XXXXXXXX / 2567XXXXXXXX to +2567XXXXXXXX. */
export function normalisePhone(raw: string): string | null {
  const digits = String(raw).replace(/\D+/g, "");
  if (/^0\d{9}$/.test(digits)) return `+256${digits.slice(1)}`;
  if (/^256\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\d{9}$/.test(digits)) return `+256${digits}`;
  return null;
}

function readReference(data: Json): string {
  const direct = data["internal_reference"];
  if (typeof direct === "string" && direct) return direct;
  const nested = data["data"];
  if (nested && typeof nested === "object") {
    const inner = (nested as Json)["internal_reference"];
    if (typeof inner === "string" && inner) return inner;
  }
  return "";
}

function readStatus(data: Json): ChargeResponse["status"] {
  const nested = (data["data"] && typeof data["data"] === "object" ? (data["data"] as Json) : {}) as Json;
  const raw = String(nested["status"] ?? data["status"] ?? "").toLowerCase();
  if (raw === "success" || raw === "successful" || raw === "completed") return "successful";
  if (raw === "failed" || raw === "cancelled" || raw === "canceled" || raw === "expired") return "failed";
  return "pending";
}

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to continue.");
  return user;
}

function requireAdmin() {
  const user = requireUser();
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) throw new Error("Admins only.");
  return user;
}

async function validatePhone(raw: string) {
  const phone = normalisePhone(raw);
  if (!phone) return { valid: false, name: "", message: "Invalid number format." };
  try {
    const data = await call("/api/validate-phone", { method: "POST", body: { msisdn: phone } });
    const nested = (data["data"] && typeof data["data"] === "object" ? (data["data"] as Json) : {}) as Json;
    return {
      valid: true,
      name: String(nested["customer_name"] ?? data["customer_name"] ?? ""),
      message: String(data["message"] ?? "Number verified."),
    };
  } catch (err) {
    return { valid: false, name: "", message: err instanceof Error ? err.message : "Invalid number." };
  }
}

async function requestStatus(txRef: string, waiting: string): Promise<ChargeResponse> {
  const data = await call(`/api/request-status?internal_reference=${encodeURIComponent(txRef)}`);
  return { txRef, status: readStatus(data), message: String(data["message"] ?? waiting) };
}

/**
 * Same call surface the UI already used (`payApi("init", …)` etc.), now handled
 * entirely in the browser against the configured payment backend.
 */
export async function payApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const out = await run(action, body);
  return out as T;
}

async function run(action: string, body: Record<string, unknown>): Promise<unknown> {
  switch (action) {
    case "validate":
      return validatePhone(String(body["phone"] ?? ""));

    case "init": {
      const user = requireUser();
      const phone = normalisePhone(String(body["phone"] ?? ""));
      if (!phone) throw new Error("Enter a valid Ugandan mobile money number.");
      const amount = Number(body["amount"]);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount.");
      const plan = String(body["plan"] ?? "Subscription");
      const data = await call("/api/deposit", {
        method: "POST",
        body: {
          msisdn: phone,
          amount,
          currency: "UGX",
          reference: `CAL-${user.uid.slice(0, 8)}-${Date.now()}`,
          description: `${plan} subscription`,
        },
      });
      const txRef = readReference(data);
      if (!txRef) throw new Error("Payment backend did not return a reference.");
      return {
        txRef,
        status: "pending" as const,
        message: String(data["message"] ?? "Approve the payment prompt on your phone."),
      };
    }

    case "status":
      return requestStatus(String(body["txRef"] ?? ""), "Waiting for confirmation…");

    case "withdraw-status":
      requireAdmin();
      return requestStatus(String(body["txRef"] ?? ""), "Waiting for the payout to complete…");

    case "balance": {
      requireAdmin();
      const data = await call("/api/wallet/balance?currency=UGX");
      const nested = (data["data"] && typeof data["data"] === "object" ? (data["data"] as Json) : {}) as Json;
      const raw = nested["balance"] ?? data["balance"] ?? nested["available_balance"] ?? 0;
      return {
        balance: Number(raw) || 0,
        currency: String(nested["currency"] ?? data["currency"] ?? "UGX"),
      };
    }

    case "withdraw": {
      requireAdmin();
      const phone = normalisePhone(String(body["phone"] ?? ""));
      if (!phone) throw new Error("Enter a valid Ugandan mobile money number.");
      const amount = Number(body["amount"]);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount.");
      const verify = await validatePhone(phone);
      if (!verify.valid) throw new Error(`Number check failed: ${verify.message}`);
      const data = await call("/api/withdraw", {
        method: "POST",
        body: {
          msisdn: phone,
          amount,
          currency: "UGX",
          description: String(body["note"] || "Admin withdrawal"),
        },
      });
      return {
        txRef: readReference(data),
        status: readStatus(data),
        message: String(data["message"] ?? "Withdrawal requested."),
        holder: verify.name,
      };
    }

    default:
      throw new Error("Unknown action.");
  }
}
