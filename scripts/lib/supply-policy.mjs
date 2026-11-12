const ALLOWED = new Set([
  '0BSD',
  'AFL-2.1',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'LGPL-2.1',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-or-later',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
  'BlueOak-1.0.0',
]);

export function licenseTokens(value) {
  return String(value).replace(/[()]/g, ' ').split(/\s+/).filter((token) => token && !['OR', 'AND', 'WITH'].includes(token));
}

export function unknownLicenseTokens(value) {
  return licenseTokens(value).filter((token) => !ALLOWED.has(token) && !token.endsWith('-exception'));
}

export function licenseText(meta) {
  if (typeof meta?.license === 'string') return meta.license;
  if (typeof meta?.license?.type === 'string') return meta.license.type;
  if (Array.isArray(meta?.licenses)) return meta.licenses.map((item) => (typeof item === 'string' ? item : item?.type)).filter(Boolean).join(' OR ');
  return '';
}
