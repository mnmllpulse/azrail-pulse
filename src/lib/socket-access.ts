import type { Connection } from "agents";
import type { Env } from "../types";
import { activeAccount, requireResource } from "./accounts";

/** Recheck before every data-bearing send: an already-open socket is not a permanent grant. */
export async function socketAuthorized(env:Env,connection:Connection,project?:string,conversation?:string):Promise<boolean> {
  try {
    const session=connection.state as {account?:string;project?:string}|null;
    if(!session?.account||!session.project||!project||session.project!==project)throw new Error("Scope changed");
    const principal=await activeAccount(env,session.account);
    if(!principal)throw new Error("Revoked");
    await requireResource(env,principal,"project",project);
    if(conversation)await requireResource(env,principal,"conversation",conversation);
    return true;
  } catch {try{connection.close(1008,"Session unavailable");}catch{}return false;}
}
export async function sendProjectEvent(env:Env,connections:Iterable<Connection>,project:string|undefined,payload:unknown):Promise<void> {
  const message=JSON.stringify(payload);
  for(const connection of connections) {
    if(await socketAuthorized(env,connection,project))try{connection.send(message);}catch{}
  }
}
