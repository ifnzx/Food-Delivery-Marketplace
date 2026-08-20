import fs from "fs";
import path from "path";

export function saveMenuImage(menuId: string, raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("/uploads/")) return s;
  const match = s.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!match) return "";
  const mime = match[1].toLowerCase();
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const dir = path.join(__dirname, "../../public/uploads/menus");
  fs.mkdirSync(dir, { recursive: true });
  const file = `${menuId}.${ext}`;
  fs.writeFileSync(path.join(dir, file), Buffer.from(match[2], "base64"));
  return `/uploads/menus/${file}`;
}
