/** Metadata/reference only. No downloader, DRM bypass, or unauthorized audio retrieval. */
export type BeatportReference={url:string;title:string;artist?:string;release?:string;label?:string;bpm?:number;key?:string;chart?:string;rank?:number;capturedAt:number;previewUrl?:string|null};
export function normalizeBeatportReference(input:BeatportReference):BeatportReference{
 const url=new URL(input.url);if(url.protocol!=='https:'||!/(^|\.)beatport\.com$/i.test(url.hostname))throw new Error('Нужна HTTPS-ссылка Beatport.');
 return {...input,url:url.toString(),title:input.title.trim().slice(0,240),artist:input.artist?.trim().slice(0,240),release:input.release?.trim().slice(0,240),label:input.label?.trim().slice(0,240),capturedAt:Number.isFinite(input.capturedAt)?input.capturedAt:Date.now(),previewUrl:input.previewUrl??null};
}
