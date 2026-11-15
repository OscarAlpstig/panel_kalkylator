import {useRef} from 'react';
const widths=[70,95,120,145,170,195,220];
export function WidthInfo({kind,value,onSelect}:{kind:'bottom'|'lid';value:string;onSelect:(width:string)=>void}){
 const label=kind==='bottom'?'bottenbräda':'lockbräda';
 const details=useRef<HTMLDetailsElement>(null),summary=useRef<HTMLElement>(null);
 function choose(width:number){onSelect(String(width));if(details.current)details.current.open=false;summary.current?.focus()}
 return <details ref={details} className={`width-info ${kind}`}><summary ref={summary} aria-label={`Visa vanliga bredder för ${label}`}><span aria-hidden="true">i</span></summary><div className="width-info-content"><strong>Välj bredd för {label}</strong><div className="width-options" role="group" aria-label={`Vanliga bredder för ${label}`}>{widths.map(width=><button type="button" key={width} aria-label={`Välj ${width} mm för ${label}`} aria-pressed={Number(value.trim().replace(',','.'))===width} onClick={()=>choose(width)}>{width} <span>mm</span></button>)}</div><small>Utbudet varierar mellan profiler och leverantörer. Ange brädans faktiska bredd i kalkylen – mät gärna ditt virke.</small></div></details>;
}
