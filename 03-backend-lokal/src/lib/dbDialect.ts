/** True bila backend memakai Supabase / PostgreSQL (DATABASE_URL). */
export function isPostgres(): boolean {
  const url = String(process.env.DATABASE_URL || "").trim();
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

/** Nama tabel Prisma — PostgreSQL butuh quote karena huruf besar. */
export function qTable(name: string): string {
  return isPostgres() ? `"${name}"` : name;
}

export function sqlIfNull(expr: string, fallback: string | number): string {
  return isPostgres() ? `COALESCE(${expr}, ${fallback})` : `IFNULL(${expr}, ${fallback})`;
}

export function sqlOrderDesc(column: string): string {
  return isPostgres() ? `${column} DESC` : `datetime(${column}) DESC`;
}

export function sqlOrderAsc(column: string): string {
  return isPostgres() ? `${column} ASC` : `datetime(${column}) ASC`;
}

/** Nama kolom Prisma — PostgreSQL butuh quote untuk camelCase. */
export function qCol(name: string): string {
  return isPostgres() ? `"${name}"` : name;
}
