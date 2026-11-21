export class APIError extends Error {
 constructor(message:string,readonly status:number,readonly code?:string,readonly body?:any){super(message);}
}
