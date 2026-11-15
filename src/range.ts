import {GeometryError,parseMeasure,parsePosition} from './geometry';
import type {OpeningDraft} from './facade';
export type MeasurePoint={id:string;label:string;x:number};
export function measurePoints(width:number,openings:OpeningDraft[]):MeasurePoint[]{
 const points:MeasurePoint[]=[{id:'wall-start',label:'Väggens vänsterkant',x:0}];
 for(const o of openings){
  const x=parsePosition(o.x),w=parseMeasure(o.width);
  points.push({id:`${o.id}:left`,label:`${o.name} – vänster hålkant`,x},{id:`${o.id}:right`,label:`${o.name} – höger hålkant`,x:x+w});
  if(o.flashing)points.push({id:`${o.id}:plate-left`,label:`${o.name} – vänster plåtkant`,x:x-parseMeasure(o.left)},{id:`${o.id}:plate-right`,label:`${o.name} – höger plåtkant`,x:x+w+parseMeasure(o.right)});
 }
 points.push({id:'wall-end',label:'Väggens högerkant',x:width});
 return points;
}
export function resolveRange(width:number,openings:OpeningDraft[],startId:string,endId:string){
 if(!Number.isFinite(width)||width<=0)throw new GeometryError('width','Ange en positiv väggbredd.');
 const points=measurePoints(width,openings),start=points.find(p=>p.id===startId),end=points.find(p=>p.id===endId);
 if(!start||!end)throw new GeometryError('range','Välj start- och stoppunkt igen. En vald kant finns inte längre.');
 if(!Number.isFinite(start.x)||!Number.isFinite(end.x))throw new GeometryError('range','Kontrollera måtten för den valda öppningen eller plåten.');
 if(start.x<0||end.x>width)throw new GeometryError('range','Den valda sträckan ligger utanför väggen. Kontrollera öppningens läge och plåtutstick.');
 if(end.x<=start.x)throw new GeometryError('range','Stoppunkten måste ligga till höger om startpunkten.');
 for(const o of openings){const x=parsePosition(o.x),w=parseMeasure(o.width);if(!Number.isFinite(x)||!Number.isFinite(w)||w<=0)throw new GeometryError('range',`${o.name}: kontrollera vänsterläge och hålbredd.`);if(x<end.x-1e-7&&x+w>start.x+1e-7)throw new GeometryError('range',`Sträckan passerar hålet ${o.name}. Välj kanten före hålet som stopp eller kanten efter hålet som start. Beräkna panelen ovanför och under i helväggsläget.`);}
 return {start,end,width:end.x-start.x};
}
