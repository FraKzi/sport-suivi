/**
 * Génération CSV simple, conforme RFC 4180.
 * - Encadre les valeurs avec virgule, guillemet ou newline par des "..."
 * - Double les guillemets internes
 * - Sépare avec \r\n (recommandé pour compat Excel Windows)
 */

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) {
    return headers ? headers.map(escape).join(",") + "\r\n" : "";
  }
  const keys = headers ?? Object.keys(rows[0]);
  const head = keys.map(escape).join(",");
  const body = rows
    .map((r) => keys.map((k) => escape(r[k])).join(","))
    .join("\r\n");
  return head + "\r\n" + body + "\r\n";
}

function escape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Format date ISO court YYYY-MM-DD (compat Excel/Sheets en local). */
export function ymd(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
