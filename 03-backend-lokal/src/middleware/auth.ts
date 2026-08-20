import type { NextFunction, Response } from "express";
import { verifyToken } from "../lib/auth";
import { fail, type AuthedRequest } from "../lib/http";

export function auth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    fail(res, 401, "Login diperlukan");
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    fail(res, 401, "Token tidak valid");
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      fail(res, 403, "Akses ditolak");
      return;
    }
    next();
  };
}
