import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ADMIN_EMAIL } from "@/lib/firebase-config";

/**
 * Mobile money endpoints (Relworx backend on Railway).
 *  POST /api/pay/init      { plan, amount, phone }
 *  POST /api/pay/status    { txRef }
 *  POST /api/pay/validate  { phone }
 *  POST /api/pay/balance   {}                      (admin only)
 *  POST /api/pay/withdraw  { phone, amount, note } (admin only)
 * All require a valid Firebase ID token in the Authorization header.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const initSchema = z.object({
  plan: z.string().min(1).max(40),
  amount: z.number().int().positive().max(10_000_000),
  phone: z.string().min(7).max(20),
});

const statusSchema = z.object({ txRef: z.string().min(4).max(120) });
const phoneSchema = z.object({ phone: z.string().min(7).max(20) });
const withdrawSchema = z.object({
  phone: z.string().min(7).max(20),
  amount: z.number().int().positive().max(10_000_000),
  note: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/pay/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const pay = await import("@/lib/payments.server");
        const header = request.headers.get("authorization") ?? "";
        const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
        const user = token ? await pay.verifyUserToken(token) : null;
        if (!user) return json({ error: "Please sign in to continue." }, 401);
        const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }

        try {
          if (params.action === "init") {
            const input = initSchema.parse(body);
            const phone = pay.normalisePhone(input.phone);
            if (!phone) return json({ error: "Enter a valid Ugandan mobile money number." }, 400);
            return json(
              await pay.initiateCharge({
                amount: input.amount,
                phone,
                plan: input.plan,
                user,
              }),
            );
          }

          if (params.action === "withdraw-status") {
            if (!isAdmin) return json({ error: "Admins only." }, 403);
            const input = statusSchema.parse(body);
            return json(await pay.checkWithdrawal(input.txRef));
          }

          if (params.action === "status") {
            const input = statusSchema.parse(body);
            return json(await pay.checkCharge(input.txRef));
          }

          if (params.action === "validate") {
            const input = phoneSchema.parse(body);
            const phone = pay.normalisePhone(input.phone);
            if (!phone) return json({ valid: false, name: "", message: "Invalid number format." });
            return json(await pay.validatePhone(phone));
          }

          if (params.action === "balance") {
            if (!isAdmin) return json({ error: "Admins only." }, 403);
            return json(await pay.walletBalance());
          }

          if (params.action === "withdraw") {
            if (!isAdmin) return json({ error: "Admins only." }, 403);
            const input = withdrawSchema.parse(body);
            const phone = pay.normalisePhone(input.phone);
            if (!phone) return json({ error: "Enter a valid Ugandan mobile money number." }, 400);
            const verify = await pay.validatePhone(phone);
            if (!verify.valid) return json({ error: `Number check failed: ${verify.message}` }, 400);
            const out = await pay.sendWithdrawal({
              msisdn: phone,
              amount: input.amount,
              ...(input.note ? { note: input.note } : {}),
            });
            return json({ ...out, holder: verify.name });
          }

          return json({ error: "Unknown action." }, 404);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Payment request failed.";
          console.error("[pay]", params.action, message);
          return json({ error: message }, 400);
        }
      },
    },
  },
});
