import { auth } from "@/lib/firebase";

/** Calls one of the /api/pay/* endpoints with the signed-in user's ID token. */
export async function payApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/pay/${action}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || data.error) throw new Error(data.error || "Request failed.");
  return data;
}

export interface ChargeResponse {
  txRef: string;
  status: "pending" | "successful" | "failed";
  message: string;
}
