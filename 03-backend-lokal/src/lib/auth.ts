import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.LOCAL_AUTH_SECRET ?? "local-review-secret";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  displayName: string;
};

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createToken(user: AuthUser): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): AuthUser {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new Error("Invalid token");
  }
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid token");
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (data.exp && Date.now() > data.exp) {
    throw new Error("Token expired");
  }
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    displayName: data.displayName,
  };
}

export function newId(prefix: string): string {
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}
