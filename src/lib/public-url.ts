export class PublicUrlError extends Error {}

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^(22[4-9]|2[3-5]\d)\./];

/** Только публичные http(s)-адреса: без логинов в адресе, нестандартных портов, внутренних имён и частных IP. */
export function checkPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PublicUrlError("Адрес страницы не распознан.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new PublicUrlError("Открываются только http и https.");
  if (url.username || url.password) throw new PublicUrlError("Адрес с логином и паролем не открываю.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new PublicUrlError("Нестандартный порт не открываю.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.includes(":") || host.startsWith("[")) throw new PublicUrlError("Адреса IPv6 не открываю.");
  if (host === "localhost" || /\.(local|localhost|internal|lan|home|corp)$/.test(host) || !host.includes(".")) throw new PublicUrlError("Внутренние адреса не открываю.");
  if (/^[\d.]+$/.test(host) && PRIVATE_V4.some((re) => re.test(host))) throw new PublicUrlError("Внутренние адреса не открываю.");
  return url;
}

export function isPublicUrl(raw: string): boolean {
  try {
    checkPublicUrl(raw);
    return true;
  } catch {
    return false;
  }
}
