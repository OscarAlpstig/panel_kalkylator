import {initial,isForm,type Workspace,type Form} from './workspace';
import {isOpeningDraft} from './facade';
export const MAX_FILE=1_000_000;
const fail=()=>new Error('Filen eller länken är inte en giltig Panel-beräkning.');
function record(v:unknown):v is Record<string,unknown>{return Boolean(v)&&typeof v==='object'&&!Array.isArray(v)}
export function validateWorkspace(value:unknown):Workspace{
 if(!record(value)||!Array.isArray(value.alternatives)||!value.alternatives.length||value.alternatives.length>100||typeof value.activeId!=='string')throw fail();
 const ids=new Set<string>();
 const alternatives=value.alternatives.map(a=>{
  if(!record(a)||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(a.id)||ids.has(a.id)||typeof a.name!=='string'||a.name.length>200||!isForm(a.form))throw fail();
  ids.add(a.id);
  const rawForm=a.form;
  const form=Object.fromEntries(Object.keys(initial).map(k=>[k,rawForm[k as keyof Form]])) as Form;
  for(const v of Object.values(form))if(typeof v==='string'&&v.length>300)throw fail();
  if(form.openings.length>100||new Set(form.openings.map(o=>o.id)).size!==form.openings.length)throw fail();
  for(const o of form.openings)if(!isOpeningDraft(o)||Object.values(o).some(v=>typeof v==='string'&&v.length>300)||!/^[a-zA-Z0-9-]{1,100}$/.test(o.id))throw fail();
  return {id:a.id,name:a.name,form:structuredClone(form)};
 });
 if(!ids.has(value.activeId))throw fail();
 const active=alternatives.find(a=>a.id===value.activeId)!;
 // Shared geometry is canonical and cannot diverge on import.
 return {activeId:value.activeId,alternatives:alternatives.map(a=>({...a,form:{...a.form,openings:structuredClone(active.form.openings),wallHeight:active.form.wallHeight}}))};
}
export function exportProject(workspace:Workspace){
 const w=validateWorkspace(workspace),active=w.alternatives.find(a=>a.id===w.activeId)!;
 return JSON.stringify({format:'panel-kalkylator',version:1,shared:{openings:active.form.openings,wallHeight:active.form.wallHeight},activeId:w.activeId,alternatives:w.alternatives.map(a=>({...a,form:Object.fromEntries(Object.entries(a.form).filter(([k])=>k!=='openings'&&k!=='wallHeight'))}))});
}
export function importProject(text:string):Workspace{
 if(text.length>MAX_FILE)throw new Error('Beräkningen är för stor. Högst 1 MB stöds.');
 let v:unknown;try{v=JSON.parse(text)}catch{throw fail()}
 if(!record(v)||v.format!=='panel-kalkylator'||v.version!==1||!record(v.shared)||!Array.isArray(v.alternatives))throw fail();
 const shared=v.shared;
 return validateWorkspace({activeId:v.activeId,alternatives:v.alternatives.map(a=>record(a)&&record(a.form)?{...a,form:{...a.form,openings:shared.openings,wallHeight:shared.wallHeight}}:a)});
}
export function encodeProject(workspace:Workspace){
 const bytes=new TextEncoder().encode(exportProject(workspace));
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeProject(link:string):Workspace{
 const part=link.includes('#panel=')?link.split('#panel=')[1]:link;
 if(!part||part.length>MAX_FILE*1.4||!/^[A-Za-z0-9_-]+$/.test(part))throw fail();
 try{const binary=atob(part.replace(/-/g,'+').replace(/_/g,'/'));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return importProject(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch(e){if(e instanceof Error&&e.message.includes('stor'))throw e;throw fail()}
}
