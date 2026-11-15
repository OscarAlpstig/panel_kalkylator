export function WidthInfo({kind}:{kind:'bottom'|'lid'}){
 const label=kind==='bottom'?'bottenbräda':'lockbräda';
 return <details className={`width-info ${kind}`}><summary aria-label={`Visa vanliga bredder för ${label}`}><span aria-hidden="true">i</span></summary><div className="width-info-content"><strong>Vanliga nominella bredder</strong><p>70 · 95 · 120 · 145 · 170 · 195 · 220 mm</p><small>Utbudet varierar mellan profiler och leverantörer. Ange brädans faktiska bredd i kalkylen – mät gärna ditt virke.</small></div></details>;
}
