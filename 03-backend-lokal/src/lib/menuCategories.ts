export const MENU_CATEGORIES = [
  "Makanan",
  "Ayam",
  "Nasi",
  "Burger",
  "Pizza",
  "Kopi",
  "Minuman",
  "Salad",
  "Snack",
  "Lainnya",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export function normalizeMenuCategory(value: unknown): MenuCategory {
  const raw = String(value ?? "").trim();
  if (!raw) return "Makanan";
  const hit = MENU_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  return hit ?? "Lainnya";
}
