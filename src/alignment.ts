import type {Layout} from './geometry';
import type {OpeningDraft} from './facade';
import {measurePoints} from './range';
export type AlignmentReference={id:string;label:string;kind:'plate'|'hole';x:number;edge:'start'|'end';board:number|null;actual:number|null;delta:number|null};
export function alignmentReferences(layout:Layout,origin:number,openings:OpeningDraft[]):AlignmentReference[]{
 const lids=layout.boards.filter(b=>b.kind==='lid');
 return measurePoints(origin+layout.width,openings).filter(p=>p.id!=='wall-start'&&p.id!=='wall-end'&&Number.isFinite(p.x)&&p.x>=origin-1e-7&&p.x<=origin+layout.width+1e-7).map(p=>{
  const edge=p.id.endsWith(':left')||p.id.endsWith(':plate-left')?'end':'start';
  const x=p.x-origin;
  const nearest=lids.reduce<(typeof lids)[number]|null>((best,b)=>!best||Math.abs(b[edge]-x)<Math.abs(best[edge]-x)?b:best,null);
  return {id:p.id,label:p.label,kind:p.id.includes(':plate-')?'plate':'hole',x,edge,board:nearest?.number??null,actual:nearest?.[edge]??null,delta:nearest?nearest[edge]-x:null};
 });
}
