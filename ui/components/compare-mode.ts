export type CompareItem={id:string;label:string;render:(host:HTMLElement)=>void};
export function mountCompareMode(host:HTMLElement){
 let a:CompareItem|null=null,b:CompareItem|null=null;
 const shell=document.createElement('section');shell.className='compare-mode';shell.hidden=true;
 const head=document.createElement('div');head.className='section-heading';head.innerHTML='<h3>Compare Mode · A | B</h3><span class="muted">Сравнение без изменения исходных версий</span>';
 const grid=document.createElement('div');grid.className='compare-mode-grid';const left=document.createElement('div'),right=document.createElement('div');left.className='compare-side';right.className='compare-side';grid.append(left,right);shell.append(head,grid);host.append(shell);
 const draw=()=>{shell.hidden=!(a||b);left.replaceChildren();right.replaceChildren();if(a){const h=document.createElement('strong');h.textContent='A · '+a.label;left.append(h);a.render(left);}else left.textContent='Выберите A';if(b){const h=document.createElement('strong');h.textContent='B · '+b.label;right.append(h);b.render(right);}else right.textContent='Выберите B';};
 return{setA(item:CompareItem){a=item;draw();},setB(item:CompareItem){b=item;draw();},clear(){a=b=null;draw();},destroy(){shell.remove();}};
}
