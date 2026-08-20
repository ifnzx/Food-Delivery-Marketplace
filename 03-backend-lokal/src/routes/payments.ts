import { Router } from "express";
import { fail } from "../lib/http";
import { handleGatewayWebhook } from "../services/payment";

export const paymentRouter = Router();

/**
 * Endpoint siap diisi signature verification provider.
 * MVP: gateway OFF → 503. Mode STUB: body { event: "PAID"|"FAILED", paymentId }.
 */
paymentRouter.post("/payments/webhook", async (req, res) => {
  try {
    const result = await handleGatewayWebhook(req.body ?? {});
    if (!result.ok) {
      const status =
        result.code === "GATEWAY_DISABLED"
          ? 503
          : result.code === "PROVIDER_NOT_IMPLEMENTED"
            ? 501
            : 400;
      fail(res, status, result.message);
      return;
    }
    res.json(result);
  } catch (error) {
    fail(res, 400, error instanceof Error ? error.message : "Webhook gagal");
  }
});
