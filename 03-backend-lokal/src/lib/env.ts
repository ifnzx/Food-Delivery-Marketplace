import fs from "fs";
import path from "path";

/** Load 03-backend-lokal/.env without extra packages. */
export function loadEnv(): void {
  const file = path.join(__dirname, "../../.env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const idx = text.indexOf("=");
    if (idx < 1) continue;
    const key = text.slice(0, idx).trim();
    const value = text.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

export function googleServerKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    ""
  ).trim();
}

export function googleBrowserKey(): string {
  return (
    process.env.GOOGLE_MAPS_BROWSER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}
