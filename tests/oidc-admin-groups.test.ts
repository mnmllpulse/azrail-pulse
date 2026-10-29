import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('../src/core/azrail-sandbox',()=>({Sandbox:class{}}));
import worker from '../src/unified/entry';
import {sqliteD1} from './stubs/sqlite-d1';
import {oidcRoleFromClaims,oidcAdminGroups,oidcAdminEmails} from '../src/unified/oidc';
import {idpFetch,oidcLogin,OIDC_ISSUER,OIDC_CLIENT_ID} from './helpers/oidc-login';
import type {Env} from '../src/types';
afterEach(()=>{vi.unstubAllGlobals();});
const ORIGIN='https://app.example.com';
function fixture(extra:Partial<Env>={}){
 const {db,sqlite}=sqliteD1();
 const env={AZRAIL_D1:db,AUTH_MODE:'oidc',PUBLIC_ORIGINS:ORIGIN,OIDC_ISSUER,OIDC_CLIENT_ID,...extra} as unknown as Env;
 const idp={claims:{} as Record<string,unknown>,nonce:{value:''}};
 vi.stubGlobal('fetch',idpFetch(async()=>new Response('unexpected',{status:500}),()=>idp.claims,idp.nonce));
 const role=async(claims:Record<string,unknown>)=>{idp.claims=claims;const session=await oidcLogin(worker,env,ORIGIN,idp.nonce);
  const status=await worker.fetch(new Request(ORIGIN+'/auth/status',{headers:{Cookie:`__Host-pulse-session=${session}`}}),env,{} as ExecutionContext);
  return ((await status.json()) as any).account.role as string;};
 return{env,sqlite,role};
}
describe('OIDC admin groups',()=>{
 it('grants admin to a member of the default group and editor to a non-member',async()=>{
  const f=fixture();
  expect(await f.role({sub:'a',groups:['pulse-admins']})).toBe('admin');
  expect(await f.role({sub:'b',groups:['staff']})).toBe('editor');
 });
 it('missing, empty and wrongly typed claims fail closed to editor',async()=>{
  const f=fixture({OIDC_ADMIN_GROUPS:'pulse-admins'});
  expect(await f.role({sub:'c'})).toBe('editor');
  expect(await f.role({sub:'d',groups:[]})).toBe('editor');
  expect(await f.role({sub:'e',groups:'pulse-admins'})).toBe('editor');
  expect(await f.role({sub:'g',groups:[{name:'pulse-admins'}]})).toBe('editor');
 });
 it('re-login without the group downgrades; emptying the config revokes live sessions',async()=>{
  const f=fixture({OIDC_ADMIN_GROUPS:'ops, pulse-admins'});
  expect(await f.role({sub:'h',groups:['ops']})).toBe('admin');
  expect(await f.role({sub:'h',groups:['staff']})).toBe('editor');
  expect(await f.role({sub:'h',groups:['ops']})).toBe('admin');
  (f.env as any).OIDC_ADMIN_GROUPS='';
  expect(await f.role({sub:'h',groups:['ops']})).toBe('editor');
 });
 it('grants admin to a configured owner email and editor to any other address',async()=>{
  const f=fixture({OIDC_ADMIN_EMAILS:'Owner@Example.com'});
  expect(await f.role({sub:'mail-owner',email:'owner@example.com'})).toBe('admin');
  expect(await f.role({sub:'mail-other',email:'other@example.com'})).toBe('editor');
  expect(await f.role({sub:'mail-blank',email:'  '})).toBe('editor');
 });
 it('keeps a manual viewer downgrade across logins',async()=>{
  const f=fixture();
  expect(await f.role({sub:'v',groups:['pulse-admins']})).toBe('admin');
  f.sqlite.prepare("UPDATE access_accounts SET role='viewer' WHERE id LIKE 'oidc_%'").run();
  expect(await f.role({sub:'v',groups:['pulse-admins']})).toBe('viewer');
 });
});
describe('oidcRoleFromClaims',()=>{
 const env=(v:Record<string,string|undefined>)=>v as unknown as Env;
 it('defaults to pulse-admins and the groups claim, falling back to roles',()=>{
  expect(oidcAdminGroups(env({}))).toEqual(['pulse-admins']);
  expect(oidcRoleFromClaims({roles:['pulse-admins']},env({}))).toBe('admin');
  expect(oidcRoleFromClaims({groups:['x'],roles:['pulse-admins']},env({}))).toBe('editor');
 });
 it('honours a custom claim name',()=>{
  expect(oidcRoleFromClaims({teams:['pulse-admins']},env({OIDC_GROUPS_CLAIM:'teams'}))).toBe('admin');
  expect(oidcRoleFromClaims({groups:['pulse-admins']},env({OIDC_GROUPS_CLAIM:'teams'}))).toBe('editor');
 });
 it('grants admin from the owner email list without a group',()=>{
  expect(oidcAdminEmails(env({OIDC_ADMIN_EMAILS:' A@B.com , no-at '}))).toEqual(['a@b.com']);
  expect(oidcRoleFromClaims({email:'a@b.com'},env({OIDC_ADMIN_EMAILS:'a@b.com',OIDC_ADMIN_GROUPS:''}))).toBe('admin');
  expect(oidcRoleFromClaims({email:'c@d.com'},env({OIDC_ADMIN_EMAILS:'a@b.com'}))).toBe('editor');
 });
 it('never grants admin when the group list is empty',()=>{
  for(const v of ['',' , ',','])expect(oidcRoleFromClaims({groups:['pulse-admins','']},env({OIDC_ADMIN_GROUPS:v}))).toBe('editor');
 });
});
