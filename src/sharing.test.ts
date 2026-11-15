import {describe,it,expect} from 'vitest';
import {initial,type Workspace} from './workspace';
import {exportProject,importProject,encodeProject,decodeProject,MAX_FILE} from './sharing';
const project:Workspace={activeId:'second',alternatives:[{id:'first',name:'145 mm – fönster',form:structuredClone(initial)},{id:'second',name:'120 mm – dörr',form:{...structuredClone(initial),bottom:'120',openings:[{id:'window-1',name:'Fönster ÄÖÅ',kind:'window',x:'3000',y:'800',width:'800',height:'1200',flashing:true,left:'200',right:'200'}]}}]};
describe('sharing calculations',()=>{
 it('round trips all alternatives, selected option and shared geometry',()=>{
  const restored=importProject(exportProject(project));expect(restored.activeId).toBe('second');expect(restored.alternatives.map(a=>a.form.bottom)).toEqual(['145','120']);expect(restored.alternatives[0].form.openings[0].name).toBe('Fönster ÄÖÅ');expect(restored.alternatives[1].form.openings).toEqual(restored.alternatives[0].form.openings);
 });
 it('supports Unicode in full links and raw payloads without a server',()=>{const data=encodeProject(project);expect(decodeProject(`https://example.org/panel/#panel=${data}`).alternatives[1].name).toBe('120 mm – dörr');expect(decodeProject(data).activeId).toBe('second')});
 it('rejects unknown versions, malformed files, corrupted links and oversized data',()=>{
  for(const bad of ['{}','not json',JSON.stringify({...JSON.parse(exportProject(project)),version:9}),'x'.repeat(MAX_FILE+1)])expect(()=>importProject(bad)).toThrow();
  for(const bad of ['#panel=oops!!','https://example.org/','#panel=ABCD'])expect(()=>decodeProject(bad)).toThrow();
 });
 it('rejects duplicated IDs and missing form fields instead of partially importing',()=>{
  const p=JSON.parse(exportProject(project));p.alternatives[1].id='first';expect(()=>importProject(JSON.stringify(p))).toThrow();
  const q=JSON.parse(exportProject(project));delete q.alternatives[0].form.bottom;expect(()=>importProject(JSON.stringify(q))).toThrow();
 });
});
