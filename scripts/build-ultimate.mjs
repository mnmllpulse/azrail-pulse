import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
let html=readFileSync(new URL('public/ultimate.html',root),'utf8');
for(const [name,file,tag] of [['STYLE','ultimate.css','style'],['SCRIPT','ultimate.js','script']]){
  const content=readFileSync(new URL('public/'+file,root),'utf8');
  if(new RegExp('</'+tag,'i').test(content))throw Error('Unsafe inline closing tag in '+file);
  const start='<!-- AZRAIL:'+name+':START -->',end='<!-- AZRAIL:'+name+':END -->';
  const a=html.indexOf(start),b=html.indexOf(end,a);
  if(a<0||b<0)throw Error('Missing inline markers: '+name);
  html=html.slice(0,a+start.length)+'\n<'+tag+'>\n'+content+'\n</'+tag+'>\n'+html.slice(b);
}
writeFileSync(new URL('public/ultimate.html',root),html);
console.log('ultimate.html is self-contained: CSS + JS embedded.');
