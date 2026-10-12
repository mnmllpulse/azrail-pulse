type Schema=Record<string,any>;
/** A convenience editor only. The server validates the complete JSON Schema. */
export function toolForm(host:HTMLElement,schema:Schema):()=>Record<string,unknown>{
 const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const properties=Object.entries(schema.properties??{}) as [string,Schema][];
 const simple=properties.length<=30&&properties.every(([,s])=>s&&typeof s==='object'&&!Array.isArray(s)&&(['string','number','integer','boolean'].includes(s.type)||Array.isArray(s.enum)));
 const getters:Record<string,()=>unknown>=Object.create(null),required=new Set<string>(schema.required??[]);
 if(simple)for(const [name,s]of properties){
  const label=make('label',(s.title??name)+(required.has(name)?' *':''));let input:HTMLInputElement|HTMLSelectElement;
  if(Array.isArray(s.enum)||s.type==='boolean'){
   input=make('select');const values=s.enum??[true,false];if(!required.has(name)){const empty=make('option','Не передавать');empty.value='';input.append(empty);}
   for(const v of values){const option=make('option',typeof v==='boolean'?(v?'Да':'Нет'):String(v));option.value=JSON.stringify(v);input.append(option);}getters[name]=()=>input.value===''?undefined:JSON.parse(input.value);
  }else{
   input=make('input');input.type=['number','integer'].includes(s.type)?'number':'text';if(s.type==='integer')input.step='1';else if(s.type==='number')input.step='any';if(Number.isFinite(s.minimum))input.min=String(s.minimum);if(Number.isFinite(s.maximum))input.max=String(s.maximum);
   getters[name]=()=>input.value===''&&!required.has(name)?undefined:['number','integer'].includes(s.type)?(input.value===''?undefined:Number(input.value)):input.value;
  }
  input.required=required.has(name);input.setAttribute('aria-label',name);label.append(input);host.append(label);
 }
 const advanced=make('details');advanced.open=!simple;advanced.append(make('summary','Параметры JSON'));const enabled=make('input');enabled.type='checkbox';enabled.checked=!simple;enabled.disabled=!simple;const label=make('label','Использовать JSON вместо полей');label.prepend(enabled);const raw=make('textarea');raw.value='{}';raw.rows=6;raw.setAttribute('aria-label','Параметры инструмента в JSON');advanced.append(label,raw);host.append(advanced);
 return ()=>{
  let value:unknown;if(enabled.checked){try{value=JSON.parse(raw.value);}catch{throw Error('Проверьте синтаксис JSON параметров.');}}
  else{value=Object.fromEntries(Object.entries(getters).map(([k,get])=>[k,get()]).filter(([,v])=>v!==undefined));for(const k of required)if(!(k in (value as object))||(value as any)[k]==='')throw Error(`Заполните обязательное поле: ${k}`);}
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Параметры должны быть JSON-объектом.');return value as Record<string,unknown>;
 };
}
