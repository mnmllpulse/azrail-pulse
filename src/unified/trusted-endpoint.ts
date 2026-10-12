/** Shared SSRF boundary for operator-controlled HTTPS endpoints. */
export function validateTrustedHttpsUrl(value:string,label:string,options:{allowSearch?:boolean}={}):URL {
 let url:URL;try{url=new URL(value);}catch{throw new Error(`${label}: некорректный URL.`);}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:' || (url.port&&url.port!=='443') || url.username || url.password || url.hash || (!options.allowSearch&&url.search) || !host.includes('.') || host.endsWith('.') || /^[\d.]+$|[:\[\]]/.test(host) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) {
  throw new Error(`${label}: недоверенный HTTPS endpoint.`);
 }
 return url;
}
