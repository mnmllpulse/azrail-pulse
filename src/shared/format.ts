// Pure helpers shared by the Worker (src/) and the browser UI (ui/). No DOM, no Workers APIs.

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for interpolation into HTML markup. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** "512 B" / "1.5 KB" / "2.0 MB". compactKb drops the decimal for ≥100 KB. */
export function formatBytes(n: number, opts: { compactKb?: boolean } = {}): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(opts.compactKb && n > 99 * 1024 ? 0 : 1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
