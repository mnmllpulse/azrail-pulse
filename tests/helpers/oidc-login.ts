import { SignJWT, exportJWK, generateKeyPair } from 'jose';

export const OIDC_ISSUER = 'https://idp.example.com';
export const OIDC_CLIENT_ID = 'pulse-client';
// One key for the whole run: the worker caches the remote JWKS per jwks_uri.
const keys = generateKeyPair('RS256', { extractable: true }).then(async ({ privateKey, publicKey }) => ({ privateKey, jwk: { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' } }));

/** Wrap fetch so IdP endpoints are served locally; everything else goes to `next`. */
export function idpFetch(next: (input: any, init?: any) => Promise<Response>, claims: () => Record<string, unknown>, nonce: { value: string }) {
  return async (input: any, init?: any): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith(OIDC_ISSUER)) return next(input, init);
    const { privateKey, jwk } = await keys;
    if (url.endsWith('/.well-known/openid-configuration')) return Response.json({ issuer: OIDC_ISSUER, authorization_endpoint: `${OIDC_ISSUER}/authorize`, token_endpoint: `${OIDC_ISSUER}/token`, jwks_uri: `${OIDC_ISSUER}/jwks` });
    if (url.endsWith('/jwks')) return Response.json({ keys: [jwk] });
    if (url.endsWith('/token')) {
      const id_token = await new SignJWT({ nonce: nonce.value, name: 'OIDC User', ...claims() })
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(OIDC_ISSUER).setAudience(OIDC_CLIENT_ID)
        .setSubject(String(claims().sub ?? 'user-1')).setIssuedAt().setExpirationTime('5m').sign(privateKey);
      return Response.json({ id_token, token_type: 'Bearer' });
    }
    return new Response('not found', { status: 404 });
  };
}

/** Drive /auth/login → /auth/callback through the worker; returns the session cookie value. */
export async function oidcLogin(worker: { fetch: (r: Request, e: any, c: any) => Promise<Response> }, env: any, origin: string, nonce: { value: string }): Promise<string> {
  const login = await worker.fetch(new Request(`${origin}/auth/login`), env, {} as ExecutionContext);
  if (login.status !== 302) throw new Error(`login ${login.status}: ${await login.text()}`);
  const location = new URL(login.headers.get('Location')!);
  nonce.value = location.searchParams.get('nonce')!;
  const state = location.searchParams.get('state')!;
  const callback = await worker.fetch(new Request(`${origin}/auth/callback?code=c1&state=${state}`, { headers: { Cookie: `__Host-pulse-state=${state}` } }), env, {} as ExecutionContext);
  if (callback.status !== 302) throw new Error(`callback ${callback.status}: ${await callback.text()}`);
  const cookie = callback.headers.getSetCookie().find((c) => c.startsWith('__Host-pulse-session='))!;
  return cookie.split(';')[0]!.split('=')[1]!;
}
