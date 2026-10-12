export type ConnectorHealthState = 'connected'|'degraded'|'rate_limited'|'auth_expired'|'unavailable';

export interface ConnectorCapability {
  name:string;
  description?:string;
  risk:'read'|'review'|'approval';
  inputSchema:Record<string,unknown>;
}

export interface ConnectorExecutionContext {
  signal?:AbortSignal;
  idempotencyKey:string;
}

/** Stable gateway contract. Provider-specific transports live behind this interface. */
export interface ConnectorAdapter {
  connect():Promise<void>;
  health():Promise<{state:ConnectorHealthState;latencyMs?:number;detail?:string}>;
  listCapabilities():Promise<ConnectorCapability[]>;
  execute(name:string,args:Record<string,unknown>,context:ConnectorExecutionContext):Promise<unknown>;
  cancel?(operationId:string):Promise<{cancelled:boolean}>;
  reconcile?(operationId:string):Promise<unknown>;
  close():Promise<void>;
}
