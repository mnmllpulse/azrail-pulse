/** A tool refused the call before any file or external effect. */
export class ToolRejectedError extends Error {
 constructor(message:string){super(message);this.name='ToolRejectedError';}
}
