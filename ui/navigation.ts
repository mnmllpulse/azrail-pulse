import {studioById,type StudioId} from './studios';
export type Route = {page:'create'|'projects'|'studios'|'metatron'|'connections'|'not-found'} | {page:'studio';studio:StudioId};
export function routePath(route:Route):string {
 return route.page==='studio'?`/studios/${route.studio}`:route.page==='create'?'/':route.page==='connections'?'/settings/connections':route.page==='not-found'?'/404':`/${route.page}`;
}
export function readRoute(url:URL):Route {
 const offline=!/^https?:$/.test(url.protocol);
 let path=offline?(url.hash.slice(1)||'/'):url.pathname;
 const legacy=path.match(/^\/?(?:studio|studios)\/([a-z]+)\/?$/);
 if(legacy){const studio=studioById(legacy[1]);return studio?{page:'studio',studio:studio.id}:{page:'not-found'};}
 path=path.replace(/\/+$/,'')||'/';
 if(['/', '/create','create','/index.html','/app.html','/ultimate.html'].includes(path))return {page:'create'};
 if(['/projects','projects'].includes(path))return {page:'projects'};
 if(['/studios','studios'].includes(path))return {page:'studios'};
 if(['/metatron','metatron'].includes(path))return {page:'metatron'};
 if(['/settings/connections','settings/connections'].includes(path))return {page:'connections'};
 return {page:'not-found'};
}
/** Real URLs on the host; portable hash URLs for the standalone file. */
export function createNavigation(onRoute:(route:Route,initial:boolean)=>void) {
 const offline=!/^https?:$/.test(location.protocol);
 const href=(route:Route)=>`${offline?'#':''}${routePath(route)}`;
 const render=(initial=false)=>onRoute(readRoute(new URL(location.href)),initial);
 const navigate=(route:Route)=>{
  const target=href(route),current=offline?location.hash:location.pathname;
  if(current!==target)history.pushState(null,'',target);
  lastURL=location.href;
  render();
 };
 // Anchors retain native middle-click, modifier-click and "open in new tab".
 const link=(anchor:HTMLAnchorElement,route:Route)=>{
  anchor.href=href(route);
  anchor.addEventListener('click',event=>{
   if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   event.preventDefault();navigate(route);
  });
 };
 // Popstate also covers Back/Forward between hash routes. Only render a
 // hashchange that was not already handled, preserving the mounted draft.
 let lastURL=location.href;
 const change=()=>{if(location.href!==lastURL){lastURL=location.href;render();}};
 window.addEventListener('popstate',change);
 window.addEventListener('hashchange',()=>{if(offline)change();});
 return {href,link,navigate,render};
}
