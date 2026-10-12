export type CommandPaletteAction={id:string;label:string;keywords?:string[];run:()=>void|Promise<void>;disabled?:()=>boolean};
export function mountCommandPalette(actions:()=>CommandPaletteAction[]){
 const dialog=document.createElement('dialog');dialog.className='command-palette';dialog.setAttribute('aria-label','Command Palette');
 const input=document.createElement('input');input.type='search';input.placeholder='Команда, студия, модель, история…';input.setAttribute('aria-label','Поиск команд');
 const list=document.createElement('div');list.className='command-palette-list';dialog.append(input,list);document.body.append(dialog);
 let filtered:CommandPaletteAction[]=[];
 function render(){const q=input.value.trim().toLowerCase();filtered=actions().filter(a=>!a.disabled?.()).filter(a=>!q||[a.label,...(a.keywords??[])].join(' ').toLowerCase().includes(q)).slice(0,18);list.replaceChildren();for(const action of filtered){const b=document.createElement('button');b.type='button';b.className='command-palette-item';b.textContent=action.label;b.onclick=()=>{dialog.close();Promise.resolve(action.run()).catch(error=>console.error(error));};list.append(b);}if(!filtered.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Команда не найдена.';list.append(empty);}}
 function open(){input.value='';render();if(!dialog.open)dialog.showModal();queueMicrotask(()=>input.focus());}
 input.oninput=render;input.onkeydown=e=>{if(e.key==='Enter'&&filtered[0]){e.preventDefault();dialog.close();void Promise.resolve(filtered[0].run());}if(e.key==='Escape')dialog.close();};
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}};document.addEventListener('keydown',key);
 return{open,destroy(){document.removeEventListener('keydown',key);dialog.remove();}};
}
