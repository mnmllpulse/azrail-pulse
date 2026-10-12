/** Lowercase hex SHA-256 of bytes or UTF-8 text (Web Crypto; Workers and browsers). */
export async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
