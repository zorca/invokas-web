/**
 * CSV export compatible with Excel in Lithuanian and Russian locales:
 * semicolon separator, CRLF line endings, UTF-8 with BOM.
 */
export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const lines = [headers, ...rows].map((r) => r.map(escape).join(";"));
  return lines.join("\r\n");
}

export function csvBlob(content: string): Blob {
  return new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
}
