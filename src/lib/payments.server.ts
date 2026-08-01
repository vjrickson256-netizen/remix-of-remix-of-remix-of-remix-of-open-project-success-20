import { createRemoteJWKSet, jwtVerify } from "jose";
import { firebaseConfig } from "@/lib/firebase-config";

/**
 * Mobile money payments (Uganda) through the Relworx backend deployed on
 * Railway. Every call is proxied from our server routes so the client never
 * talks to the payment backend directly.
 */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export interface TokenUser {
  uid: string;
  email: string;
}

export async function verifyUserToken(token: string): Promise<TokenUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      audience: firebaseConfig.projectId,
    });
    const uid = (payload.sub as string) || "";
    const email = typeof payload["email"] === "string" ? payload["email"] : "";
    return uid ? { uid, email } : null;
  } catch {
    return null;
  }
}

function baseUrl() {
  return (
    process.env["PAY_BACKEND_URL"] || "https://function-bun-production-341f.up.railway.app"
  ).replace(/\/+$/, "");
}

type Json = Record<string, unknown>;

async function call(path: string, init?: { method?: "GET" | "POST"; body?: Json }): Promise<Json> {
  const res = await fetch(`${baseUrl()}${path}`, {
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

export type Network = "MTN" | "AIRTEL";

export interface ChargeResult {
  txRef: string;
  status: "pending" | "successful" | "failed";
  message: string;
}

/** Normalises 07XXXXXXXX / +2567XXXXXXXX / 2567XXXXXXXX to +2567XXXXXXXX. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D+/g, "");
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

function readStatus(data: Json): ChargeResult["status"] {
  const nested = (data["data"] && typeof data["data"] === "object" ? (data["data"] as Json) : {}) as Json;
  const raw = String(nested["status"] ?? data["status"] ?? "").toLowerCase();
  if (raw === "success" || raw === "successful" || raw === "completed") return "successful";
  if (raw === "failed" || raw === "cancelled" || raw === "canceled" || raw === "expired") return "failed";
  return "pending";
}

/** Validates a mobile money number and returns the account holder name if any. */
export async function validatePhone(msisdn: string): Promise<{ valid: boolean; name: string; message: string }> {
  try {
    const data = await call("/api/validate-phone", { method: "POST", body: { msisdn } });
    const nested = (data["data"] && typeof data["data"] === "object" ? (data["data"] as Json) : {}) as Json;
    const name = String(nested["customer_name"] ?? data["customer_name"] ?? "");
    return { valid: true, name, message: String(data["message"] ?? "Number verified.") };
  } catch (err) {
    return { valid: false, name: "", message: err instanceof Error ? err.message : "Invalid number." };
  }
}

export interface ChargeInput {
  amount: number;
  phone: string;
  plan: string;
  user: TokenUser;
}

export async function initiateCharge(input: ChargeInput): Promise<ChargeResult> {
  const data = await call("/api/deposit", {
    method: "POST",
    body: {
      msisdn: input.phone,
      amount: input.amount,
      currency: "UGX",
      reference: `CAL-${input.user.uid.slice(0, 8)}-${Date.now()}`,
      description: `${input.plan} subscription`,
    },
  });
  const txRef = readReference(data);
  if (!txRef) throw new Error("Payment backend did not return a reference.");
  return {
    txRef,
    status: "pending",
    message: String(data["message"] ?? "Approve the payment prompt on your phone."),
  };
}

export async function checkCharge(txRef: string): Promise<ChargeResult> {
  const data = await call(`/api/request-status?internal_reference=${encodeURIComponent(txRef)}`);
  return {
    txRef,
    status: readStatus(data),
    message: String(data["message"] ?? "Waiting for confirmation…"),
  };
}

export async function walletBalance(): Promise<{ balance: number; currency: string }> {
  const data = await call("/api/wallet/balance?currency=UGX");
  const nested = (data["data"] && typeof data["data"] === "object" ? (data["data"] as Json) : {}) as Json;
  const raw = nested["balance"] ?? data["balance"] ?? nested["available_balance"] ?? 0;
  return { balance: Number(raw) || 0, currency: String(nested["currency"] ?? data["currency"] ?? "UGX") };
}

export async function sendWithdrawal(input: { msisdn: string; amount: number; note?: string }) {
  const data = await call("/api/withdraw", {
    method: "POST",
    body: {
      msisdn: input.msisdn,
      amount: input.amount,
      currency: "UGX",
      description: input.note || "Admin withdrawal",
    },
  });
  return {
    txRef: readReference(data),
    status: readStatus(data),
    message: String(data["message"] ?? "Withdrawal requested."),
  };
}

/** Polls the payment backend for the final state of a withdrawal (payout). */
export async function checkWithdrawal(txRef: string): Promise<ChargeResult> {
  const data = await call(`/api/request-status?internal_reference=${encodeURIComponent(txRef)}`);
  return {
    txRef,
    status: readStatus(data),
    message: String(data["message"] ?? "Waiting for the payout to complete\u2026"),
  };
}
