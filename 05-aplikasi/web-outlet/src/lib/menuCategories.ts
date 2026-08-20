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
