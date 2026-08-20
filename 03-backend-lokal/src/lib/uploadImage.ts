import fs from "fs";
import path from "path";

export function uploadsRoot() {
  const fromCwd = path.join(process.cwd(), "public", "uploads");
  const fromSrc = path.join(__dirname, "../../public/uploads");
  if (fs.existsSync(path.join(process.cwd(), "package.json"))) return fromCwd;
  return fromSrc;
}

export function saveUploadedImage(
  folder: string,
  id: string,
  raw: unknown
): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("/uploads/")) return s;
  const match = s.match(/^data:(image\/[a-z0-9.+-]+)(?:;[^,]*)*;base64,(.+)$/i);
  if (!match) return "";
  const mime = match[1].toLowerCase();
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : "jpg";
  const dir = path.join(uploadsRoot(), folder);
  fs.mkdirSync(dir, { recursive: true });
  const file = `${id}.${ext}`;
  fs.writeFileSync(path.join(dir, file), Buffer.from(match[2].replace(/\s/g, ""), "base64"));
  return `/uploads/${folder}/${file}`;
}

export function readKtpFile(courierId: string): Buffer | null {
  const dir = path.join(uploadsRoot(), "ktp");
  if (!fs.existsSync(dir)) return null;
  for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
    const file = path.join(dir, `${courierId}.${ext}`);
    if (fs.existsSync(file)) return fs.readFileSync(file);
  }
  return null;
}
