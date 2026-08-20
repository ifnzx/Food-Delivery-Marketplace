import type { NextFunction, Request, Response } from "express";
import type { AuthUser } from "./auth";

export type AuthedRequest = Request & { user?: AuthUser };

export function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

export function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : String(value ?? "");
}

export function asyncHandler(
  handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void> | void
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
