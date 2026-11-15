import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { calculate, GeometryError, parseMeasure, type Layout } from './geometry';
import './style.css';
import {WidthInfo} from './width-info';
import {InstallGuide} from './install-guide';
import {alignmentReferences,type AlignmentReference} from './alignment';
import {AlignmentReadout} from './alignment-view';
import {resolveRange} from './range';
import {RangePicker} from './range-picker';
import { OpeningEditor, FacadeResults } from './facade-view';
import {type OpeningDraft} from './facade';
import {initial,sample,readWorkspace,type Form,type Workspace} from './workspace';
import {ProjectStorage} from './project-storage';
const fmt = (n: number | null, digits = 1) => n === null ? '—' : new Intl.NumberFormat('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const names = { bottom: 'Botten', lid: 'Lock', corner: 'Knut' };
function App() {
    const [workspace, setWorkspace] = useState<Workspace>(readWorkspace);
    const current = workspace.alternatives.find(a => a.id === workspace.activeId)!;
    const form = current.form;
    const setForm = (value: React.SetStateAction<Form>) => setWorkspace(w => ({ ...w, alternatives: w.alternatives.map(a => a.id === w.activeId ? { ...a, form: typeof value === 'function' ? value(a.form) : value } : a) }));
    const [selected, setSelected] = useState<string | null>(null), [dimensions, setDimensions] = useState(true), [zoom, setZoom] = useState(1), [whole, setWhole] = useState(false), [page, setPage] = useState(0), [notice, setNotice] = useState(''), [update, setUpdate] = useState(false);
    const updateSW = useRef<((reload?: boolean) => Promise<void>) | null>(null);
    useEffect(() => { updateSW.current = registerSW({ onNeedRefresh: () => setUpdate(true) }); }, []);
    const calculationInput = { start: form.start, end: form.end, width: parseMeasure(form.width), bottom: parseMeasure(form.bottom), lid: parseMeasure(form.lid), overlap: parseMeasure(form.overlap), left: { enabled: form.left, cover: parseMeasure(form.leftCover), overlap: parseMeasure(form.leftOverlap) }, right: { enabled: form.right, cover: parseMeasure(form.rightCover), overlap: parseMeasure(form.rightOverlap) }, count: form.manual ? parseMeasure(form.count) : undefined };
    const outcome = useMemo(() => {
        try {
            const range=form.openings.length&&form.openingView==='range'?resolveRange(parseMeasure(form.width),form.openings,form.rangeStart,form.rangeEnd):null;
            return { layout: calculate({...calculationInput,width:range?.width??calculationInput.width,left:range&&form.rangeStart!=='wall-start'?{...calculationInput.left,enabled:false}:calculationInput.left,right:range&&form.rangeEnd!=='wall-end'?{...calculationInput.right,enabled:false}:calculationInput.right}), range, error: null };
        }
        catch (e) {
            return { layout: null, error: e instanceof GeometryError ? e : new GeometryError('width', 'Kontrollera måtten.') };
        }
    }, [form]);
    useEffect(() => {
        try {
            localStorage.setItem('panel-kalkylator:v1', JSON.stringify({ version: 4, ...workspace }));
        }
        catch { /* The calculator works without storage. */ }
    }, [workspace]);
    function clearView() { setSelected(null); setPage(0); setNotice(''); }
    function switchAlternative(id: string) { setWorkspace(w => ({ ...w, activeId: id })); clearView(); }
    function addAlternative() {
        const id = crypto.randomUUID();
        setWorkspace(w => {
            let number = w.alternatives.length + 1;
            while (w.alternatives.some(a => a.name === `Alternativ ${number}`))
                number++;
            const active = w.alternatives.find(a => a.id === w.activeId)!;
            return { alternatives: [...w.alternatives, { id, name: `Alternativ ${number}`, form: structuredClone(active.form) }], activeId: id };
        });
        clearView();
    }
    function removeAlternative() {
        if (workspace.alternatives.length < 2 || !window.confirm(`Ta bort ”${current.name || 'Namnlöst alternativ'}”?`))
            return;
        setWorkspace(w => {
            const index = w.alternatives.findIndex(a => a.id === w.activeId);
            const alternatives = w.alternatives.filter(a => a.id !== w.activeId);
            return { alternatives, activeId: alternatives[Math.min(index, alternatives.length - 1)].id };
        });
        clearView();
    }
    function setOpenings(openings:OpeningDraft[]) {
        setWorkspace(w=>({...w,alternatives:w.alternatives.map(a=>{
            const wasEmpty=!a.form.openings.length;
            const has=(ref:string)=>ref==='wall-start'||ref==='wall-end'||openings.some(o=>ref===`${o.id}:left`||ref===`${o.id}:right`||(o.flashing&&(ref===`${o.id}:plate-left`||ref===`${o.id}:plate-right`)));
            return {...a,form:{...a.form,openings:structuredClone(openings),rangeStart:has(a.form.rangeStart)?a.form.rangeStart:'wall-start',rangeEnd:wasEmpty&&openings.length?`${openings[0].id}:left`:has(a.form.rangeEnd)?a.form.rangeEnd:(openings[0]?`${openings[0].id}:left`:'wall-end')}};
        })}));clearView();setZoom(1);
    }
    function setHeight(wallHeight:string){setWorkspace(w=>({...w,alternatives:w.alternatives.map(a=>({...a,form:{...a.form,wallHeight}}))}));}
    const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm(f => ({ ...f, [key]: value })); setPage(0); setSelected(null); };
    const field = (key: keyof Form, label: string, hint?: string) => <div className="field" key={key}><div className="field-label-row"><label htmlFor={`field-${key}`}>{label}</label>{(key==='bottom'||key==='lid')&&<WidthInfo kind={key} value={String(form[key])} onSelect={value=>set(key,value)}/>}</div><div className={'input-wrap ' + (outcome.error?.field === key ? 'invalid' : '')}><input id={`field-${key}`} inputMode="decimal" value={String(form[key])} onChange={e => set(key, e.target.value as never)} aria-invalid={outcome.error?.field === key} aria-describedby={[hint?`help-${key}`:'',outcome.error?.field === key?`error-${key}`:''].filter(Boolean).join(' ')||undefined}/><span>{key === 'count' ? 'st' : 'mm'}</span></div>{hint && <small id={`help-${key}`}>{hint}</small>}{outcome.error?.field === key && <small id={`error-${key}`} className="field-error">{outcome.error.message}</small>}</div>;
    const r = outcome.layout;
    const references=r&&outcome.range?alignmentReferences(r,outcome.range.start.x,form.openings):[];
    const rows = r ? [...r.boards].sort((a, b) => a.start - b.start || a.kind.localeCompare(b.kind)) : [];
    const active = r?.boards.find(b => b.id === selected);
    async function copy() {
        if (!r)
            return;
        const text = [`Panel – utsättningsmått från ${outcome.range?'vald startpunkt':'väggens vänsterkant'}, mm${outcome.range?`. Lägg till ${fmt(outcome.range.start.x)} mm för väggläge.`:''}`, `Sträcka ${fmt(r.width)}; panel ${fmt(r.length)}; c/c ${fmt(r.pitch)}; springa ${fmt(r.gap)}; överlapp ${fmt(r.overlap)}`, 'Typ\tNr\tVänster\tCentrum\tHöger', ...rows.map(b => [names[b.kind], b.number, fmt(b.start, whole ? 0 : 1), fmt((b.start + b.end) / 2, whole ? 0 : 1), fmt(b.end, whole ? 0 : 1)].join('\t'))].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setNotice('Måttlistan är kopierad.');
        }
        catch {
            setNotice('Kunde inte kopiera. Markera måtten i tabellen i stället.');
        }
    }
    function reset(f: Form) { setForm({...structuredClone(f),openings:form.openings,wallHeight:form.wallHeight,rangeStart:form.rangeStart,rangeEnd:form.rangeEnd}); setSelected(null); setPage(0); setZoom(1); setNotice(''); }
    return <><header className="topbar"><a className="brand" href="#"><span className="brand-mark">▥</span> PANEL<span className="brand-sub">VERKTYG FÖR FASADEN</span></a><span className="version">LOCKPANEL / V1.0</span></header>
 <main><section className="intro"><div><p className="eyebrow">FRÅN VÄGGMÅTT TILL SISTA BRÄDAN</p><h1>Jämn panel.<br /><em>Hela vägen.</em></h1><p>Räkna ut fördelningen av din lockpanel.<br />Se väggen, kontrollera måtten och sätt ut brädorna.</p></div><div className="intro-note"><span className="status-dot"/> EN STRÄCKA · TVÅ LAGER<div>Välj start och slut.<br />Lock eller bottenbräda.</div></div></section>
 <ProjectStorage workspace={workspace} onLoad={value=>{setWorkspace(value);clearView();setZoom(1)}}/>
 <section className="card alternatives" aria-label="Jämför alternativ">
    <div className="alternatives-heading"><div><h2>Dina alternativ</h2><p>Växla för att jämföra. Ett nytt alternativ är en kopia av det du visar.</p></div><button className="primary" onClick={addAlternative}>+ Lägg till alternativ</button></div>
    <div className="alternative-tabs" role="tablist" aria-label="Beräkningsalternativ">{workspace.alternatives.map((a, index) => <button key={a.id} id={`alternative-${a.id}`} role="tab" aria-selected={a.id === workspace.activeId} aria-controls="alternative-panel" tabIndex={a.id === workspace.activeId ? 0 : -1} onClick={() => switchAlternative(a.id)} onKeyDown={e => {
                let next = index;
                if (e.key === 'ArrowRight')
                    next = (index + 1) % workspace.alternatives.length;
                else if (e.key === 'ArrowLeft')
                    next = (index - 1 + workspace.alternatives.length) % workspace.alternatives.length;
                else if (e.key === 'Home')
                    next = 0;
                else if (e.key === 'End')
                    next = workspace.alternatives.length - 1;
                else
                    return;
                e.preventDefault();
                const id = workspace.alternatives[next].id;
                switchAlternative(id);
                document.getElementById(`alternative-${id}`)?.focus();
            }}><strong>{a.name || 'Namnlöst alternativ'}</strong><span>Botten {a.form.bottom || '—'} / Lock {a.form.lid || '—'} mm</span></button>)}</div>
    <div className="alternative-edit"><label>Namn på alternativ<input value={current.name} maxLength={60} onChange={e => { const name = e.target.value; setWorkspace(w => ({ ...w, alternatives: w.alternatives.map(a => a.id === w.activeId ? { ...a, name } : a) })); }}/></label><button disabled={workspace.alternatives.length === 1} onClick={removeAlternative}>Ta bort alternativ</button><span>Virkesval sparas per alternativ. Öppningarnas mått är gemensamma.</span></div>
 </section>
 <OpeningEditor openings={form.openings} height={form.wallHeight} mode={form.facadeMode} width={parseMeasure(form.width)} onChange={setOpenings} onHeight={setHeight} advanced={form.openingView==='facade'} onMode={v => { setForm(f => ({ ...f, facadeMode: v, manual: v === 'segments' ? false : f.manual })); clearView(); }}/>
 {form.openings.length>0&&<><label className="calculation-view">Beräkningssätt<select aria-label="Beräkningssätt" value={form.openingView} onChange={e=>{set('openingView',e.target.value as 'range'|'facade');setZoom(1)}}><option value="range">Vald sträcka – start och stopp</option><option value="facade">Hela väggen – avancerad linjering</option></select></label>{form.openingView==='range'&&<RangePicker width={parseMeasure(form.width)} openings={form.openings} start={form.rangeStart} end={form.rangeEnd} onChange={(key,value)=>{set(key,value);setZoom(1)}}/>}</>}

 <div id="alternative-panel" role="tabpanel" aria-labelledby={`alternative-${current.id}`} className="workspace"><aside className="card settings"><div className="section-title"><span className="step">01</span><h2>Vägg & virke</h2><span className="unit">ALLA MÅTT I MM</span></div>{field('width', form.openings.length?'Väggens bredd':'Sträckans bredd', form.openings.length?'Hela väggmåttet. Sträckans längd räknas från valda start- och stoppunkter.':'Ytterkant till ytterkant av valda ändbrädor, exempelvis mellan foder.')}<div className="two-col">{field('bottom', 'Bottenbräda')}{field('lid', 'Lockbräda')}</div>{field('overlap', 'Minsta önskade överlapp', 'Per sida av locket. Minst 20 mm.')}<div className="divider"/>
 <h3>Start och slut</h3><p className="help">Välj vilken bräda som börjar och slutar den valda sträckan. Måttet går från ytterkant till ytterkant. Ändlock överlappar bottenbrädan inåt sträckan.</p><div className="two-col">{(['start', 'end'] as const).map(key => <label className="field end-select" key={key}><span>{key === 'start' ? 'Vänster avslut' : 'Höger avslut'}</span><select value={form[key]} onChange={e => { const value = e.target.value as 'bottom' | 'lid'; setForm(f => ({ ...f, [key]: value, ...(value === 'lid' ? { [key === 'start' ? 'left' : 'right']: false } : {}) })); setPage(0); setSelected(null); }}><option value="bottom">Bottenbräda</option><option value="lid">Lockbräda</option></select></label>)}</div><p className="help">Lock till lock passar exempelvis mellan två fönster. Knut kan väljas vid bottenbräda.</p><h3>Avslut mot knut</h3><p className="help">Knutbrädan täcker ändens bottenbräda vid väggkanten.</p>{(['left', 'right'] as const).map(side => <div className="corner-settings" key={side}><label className="check"><input type="checkbox" disabled={form[side === 'left' ? 'start' : 'end'] === 'lid'||(form.openings.length>0&&form.openingView==='range'&&form[side==='left'?'rangeStart':'rangeEnd']!==(side==='left'?'wall-start':'wall-end'))} checked={form[side]&&!(form.openings.length>0&&form.openingView==='range'&&form[side==='left'?'rangeStart':'rangeEnd']!==(side==='left'?'wall-start':'wall-end'))} onChange={e => set(side, e.target.checked)}/><span>{side === 'left' ? 'Vänster' : 'Höger'} knutbräda</span></label>{form[side] && <div className="two-col">{field(`${side}Cover`, 'Täckning K')}{field(`${side}Overlap`, 'Överlapp Q')}</div>}</div>)}<details><summary>Hur mäts knuten?</summary><a href="#corner-guide" onClick={()=>document.getElementById('corner-guide')?.setAttribute('open','')}>Visa måttbild för knut och bottenbräda ↓</a><p>K är täckningen in över just denna vägg, inte alltid virkesbredden. Q är den del av knuten som täcker bottenbrädan. Ändavdraget blir K − Q. Båda mäts horisontellt i millimeter.</p><p>Exempelknuten K = 95 och Q = 40 är ett valbart räkneexempel.</p></details><div className="divider"/><label className="check"><input type="checkbox" disabled={form.openings.length > 0 && form.openingView==='facade' && form.facadeMode === 'segments'} checked={form.manual} onChange={e => set('manual', e.target.checked)}/><span>Välj antal bottenbrädor själv</span></label>{form.openings.length > 0 && form.openingView==='facade' && form.facadeMode === 'segments' && <p className="help">Antalet väljs separat för varje panelområde.</p>}{form.manual && field('count', 'Antal bottenbrädor')}<div className="examples"><button onClick={() => reset(initial)}>Enkelt exempel</button><button onClick={() => reset(sample)}>13,6 m med knutar ↗</button></div></aside>
 <section className="results" aria-label="Resultat">{form.openings.length > 0 && form.openingView==='facade' ? <FacadeResults key={current.id} input={calculationInput} openings={form.openings} height={form.wallHeight} mode={form.facadeMode} dimensions={dimensions} zoom={zoom} onZoom={setZoom} onDimensions={setDimensions}/> : r ? <><div className="metrics"><Metric label="BOTTENBRÄDOR" value={String(r.count)} suffix="st"/><Metric label="LOCKBRÄDOR" value={String(r.lidCount)} suffix="st"/><Metric label="CENTRUMAVSTÅND" value={fmt(r.pitch)} suffix="mm"/><Metric label="SPRINGA" value={fmt(r.gap)} suffix="mm"/></div><CornerGuide expanded={r.boards.some(b=>b.kind==='corner')}/><div className="card drawing-card"><div className="drawing-header"><div className="section-title"><span className="step">02</span><h2>{outcome.range?'Vald sträcka':'Din vägg'}</h2></div><span className="pill"><span className="status-dot"/> GILTIG FÖRDELNING</span></div><div className="drawing-toolbar"><div className="legend"><span><i className="bottom"/>Botten</span><span><i className="lid"/>Lock</span><span><i className="corner"/>Knut</span></div><div className="view-controls"><label><input type="checkbox" checked={dimensions} onChange={e => setDimensions(e.target.checked)}/> Mått</label><button aria-label="Zooma ut" onClick={() => setZoom(z => Math.max(1, z - 0.5))}>−</button><button aria-label="Zooma in" onClick={() => setZoom(z => Math.min(8, z + 0.5))}>+</button><button onClick={() => setZoom(1)}>Anpassa</button></div></div><Wall references={references} layout={r} selected={selected} onSelect={setSelected} zoom={zoom} dimensions={dimensions}/><AlignmentReadout references={references} onSelect={setSelected}/><div className="drawing-foot"><span>FASAD FRAMIFRÅN · ILLUSTRERAD HÖJD</span><span>Klicka på en bräda för mått ↗</span></div><div className="detail-metrics"><div><span>Effektiv panelsträcka</span><strong>{fmt(r.length)} mm</strong></div><div><span>Faktiskt överlapp / sida</span><strong>{fmt(r.overlap)} mm</strong></div><div><span>Synlig botten, innerbräda</span><strong>{r.count > 2 ? fmt(r.boards[1].visible) + ' mm' : '—'}</strong></div></div>{active && <div className="selection" role="status"><strong>{names[active.kind]} {active.number}</strong><span>Vänster {fmt(active.start)} · Centrum {fmt((active.start + active.end) / 2)} · Höger {fmt(active.end)} mm{active.kind === 'bottom' ? ` · Synligt ${fmt(active.visible)} mm` : ''}</span><button onClick={() => setSelected(null)} aria-label="Avmarkera">×</button></div>}<Section layout={r} dimensions={dimensions}/></div>
 <div className="card schedule"><div className="schedule-head"><div className="section-title"><span className="step">03</span><h2>Utsättningsmått</h2></div><button className="primary" onClick={copy}>Kopiera lista ↗</button></div><div className="table-note"><p>Alla mått från <strong>{outcome.range?'vald startpunkt, x = 0':'väggens vänsterkant, x = 0'}</strong>.{outcome.range&&<> Lägg till {fmt(outcome.range.start.x)} mm för läget på väggen.</>}</p><label><input type="checkbox" checked={whole} onChange={e => setWhole(e.target.checked)}/> Hela millimeter</label></div><div className="table-scroll"><table><thead><tr><th>Bräda</th><th>Vänsterkant</th><th>Centrum</th><th>Högerkant</th><th>Synlig bredd</th></tr></thead><tbody>{rows.slice(page * 40, (page + 1) * 40).map(b => <tr key={b.id} className={selected === b.id ? 'selected' : ''}><td><button onClick={() => setSelected(b.id)}><i className={b.kind}/>{names[b.kind]} {b.number}</button></td><td>{fmt(b.start, whole ? 0 : 1)}</td><td>{fmt((b.start + b.end) / 2, whole ? 0 : 1)}</td><td>{fmt(b.end, whole ? 0 : 1)}</td><td>{fmt(b.visible, whole ? 0 : 1)}</td></tr>)}</tbody></table></div><div className="pagination"><span>{page * 40 + 1}–{Math.min((page + 1) * 40, rows.length)} av {rows.length} brädor · mm</span><div><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button><button disabled={(page + 1) * 40 >= rows.length} onClick={() => setPage(p => p + 1)}>→</button></div></div></div></> : <div className="card error-panel" role="alert" id="calculation-error"><span>!</span><h2>Kontrollera fördelningen</h2><p>{outcome.error?.message}</p><p>Ändra måtten till vänster för att visa väggen och nya utsättningsmått.</p></div>}<p role="status" className="notice">{notice}</p></section></div>
 <InstallGuide/>
 <footer><div className="footer-brand">▥ PANEL</div><p>Valbara ändbrädor. Jämn springa, centrerade lock.<br />Mät verkliga brädbredder. Verktyget beräknar utsättning, inte fasadens konstruktion.</p><a href="https://www.traguiden.se/konstruktion/konstruktionsexempel/vaggar/" target="_blank" rel="noreferrer">Om överlapp · TräGuiden ↗</a></footer></main>{update && <div className="update" role="status">En ny version finns.<button onClick={() => void updateSW.current?.(true)}>Uppdatera</button><button onClick={() => setUpdate(false)}>Senare</button></div>}</>;
}
function CornerGuide({expanded=false}:{expanded?:boolean}) {
    return <details className="card corner-guide" id="corner-guide" open={expanded}>
        <summary>Så mäter du knuten <span>HÖGER AVSLUT · UPPIFRÅN</span></summary>
        <figure>
            <svg viewBox="0 0 520 290" role="img" aria-labelledby="corner-title corner-description">
                <title id="corner-title">Knutbrädans täckning och överlapp över sista bottenbrädan</title>
                <desc id="corner-description">Exempel med höger väggkant till höger. Knutbrädan täcker 95 millimeter av väggen. Sista bottenbrädan går in 40 millimeter under knutbrädan och slutar 55 millimeter före väggkanten.</desc>
                <defs><pattern id="corner-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-1 1L1 -1M0 7L7 0M6 8L8 6" stroke="#8d512f" strokeWidth="1"/></pattern></defs>
                <text x="36" y="25" className="guide-label">UTSIDA / FASAD</text>
                <path d="M450 40V254" stroke="#75846c" strokeDasharray="4 4"/>
                <text x="450" y="275" textAnchor="end" className="guide-label">Väggens högra kant</text>
                <path d="M36 182H450" stroke="#cbd0c1" strokeWidth="2"/>
                <rect x="36" y="145" width="321" height="30" className="bottom"/>
                <rect x="288" y="115" width="162" height="30" className="corner"/>
                <rect x="288" y="115" width="69" height="60" fill="url(#corner-hatch)" opacity=".65"/>
                <text x="48" y="164" className="guide-board-label">Sista bottenbrädan</text>
                <text x="369" y="134" textAnchor="middle" className="guide-board-label light">Knutbräda</text>
                <path d="M288 60V110M450 60V110M288 70H450M288 65V75M450 65V75" className="guide-measure"/>
                <text x="369" y="56" textAnchor="middle" className="guide-value">K = 95 mm</text>
                <path d="M288 180V215M357 180V251M288 204H357M288 199V209M357 199V209" className="guide-measure overlap-measure"/>
                <text x="270" y="208" textAnchor="end" className="guide-value overlap-label">Q = 40 mm</text>
                <path d="M357 240H450M357 235V245M450 235V245" className="guide-measure"/>
                <text x="403" y="227" textAnchor="middle" className="guide-value">55 mm</text>
                <path d="M191 91H240L298 120" fill="none" stroke="#9a603e"/>
                <text x="36" y="89" className="guide-label overlap-label">Skrafferat = överlapp</text>
            </svg>
            <figcaption>Räkneexempel: K = 95 mm, Q = 40 mm. Vänster avslut mäts spegelvänt. Brädtjocklek och längd är schematiska.</figcaption>
        </figure>
        <dl><div><dt>K · Täckning</dt><dd>Från väggens kant till knutbrädans inre kant, längs denna vägg.</dd></div><div><dt>Q · Överlapp</dt><dd>Den del av sista bottenbrädan som ligger under knutbrädan.</dd></div><div><dt>K − Q · Ändavdrag</dt><dd>Från bottenbrädans ytterände till väggkanten. I exemplet: 95 − 40 = 55 mm.</dd></div></dl>
        <p className="guide-note">Ange verklig täckning över väggytan. Den kan skilja sig från knutbrädans nominella bredd beroende på hörnets uppbyggnad.</p>
    </details>;
}
function Metric({ label, value, suffix }: {
    label: string;
    value: string;
    suffix: string;
}) { return <div className="card metric"><span>{label}</span><div>{value}<small>{suffix}</small></div></div>; }
function Dim({ x1, x2, y, label }: {
    x1: number;
    x2: number;
    y: number;
    label: string;
}) { return <g className="dimension"><path d={`M${x1},${y - 5}v10 M${x1},${y}H${x2} M${x2},${y - 5}v10`}/><text x={(x1 + x2) / 2} y={y - 9} textAnchor="middle">{label}</text></g>; }
function Wall({ layout: r, selected, onSelect, zoom, dimensions, references=[] }: {
    references?: AlignmentReference[];
    layout: Layout;
    selected: string | null;
    onSelect: (id: string) => void;
    zoom: number;
    dimensions: boolean;
}) {
    const scroller = useRef<HTMLDivElement>(null), [scroll, setScroll] = useState(0), [viewport, setViewport] = useState(800);
    useEffect(() => {
        const el = scroller.current;
        if (!el)
            return;
        const obs = new ResizeObserver(() => setViewport(el.clientWidth));
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const width = Math.max(viewport, 320) * zoom, scale = (width - 100) / r.width, x = (v: number) => 50 + v * scale;
    const shown = r.boards.filter(b => x(b.end) >= scroll - 100 && x(b.start) <= scroll + viewport + 100);
    return <div className="wall-scroll" ref={scroller} onScroll={e => setScroll(e.currentTarget.scrollLeft)}><svg width={width} height={references.length?385:330} role="img" aria-label={`Fasad med ${r.count} bottenbrädor och ${r.lidCount} lock. Väggbredd ${fmt(r.width)} millimeter.`}><defs><pattern id="grain" width="9" height="50" patternUnits="userSpaceOnUse"><path d="M3 0v50 M7 8v25" stroke="#fff" strokeOpacity=".12"/></pattern></defs>{dimensions && <><Dim x1={x(0)} x2={x(r.width)} y={43} label={`STRÄCKA ${fmt(r.width)} mm`}/><Dim x1={x(r.offset)} x2={x(r.offset + r.length)} y={76} label={`PANEL ${fmt(r.length)} mm`}/></>}<rect x="50" y="106" width={r.width * scale} height="160" fill="#e3e0d7"/>{shown.map(b => <g key={b.id} className="board" tabIndex={0} role="button" aria-label={`${names[b.kind]} ${b.number}, vänster ${fmt(b.start)}, höger ${fmt(b.end)} millimeter`} aria-pressed={selected === b.id} onClick={() => onSelect(b.id)} onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(b.id);
                }
            }}><rect className={`${b.kind} ${selected === b.id ? 'active' : ''}`} x={x(b.start)} y={b.kind === 'bottom' ? 110 : 104} width={Math.max(.4, (b.end - b.start) * scale)} height={b.kind === 'bottom' ? 154 : 166}/><rect x={x(b.start)} y="111" width={Math.max(.4, (b.end - b.start) * scale)} height="152" fill="url(#grain)" pointerEvents="none"/></g>)}{references.map(ref=><g key={ref.id} className={`wall-reference ${ref.kind}`} role="img" aria-label={`${ref.label}, referens vid ${fmt(ref.x)} mm`}><path d={`M${x(ref.x)} 99V${ref.kind==='plate'?326:354}`}/><text x={x(ref.x)} y={ref.kind==='plate'?337:369} textAnchor={x(ref.x)>width-150?'end':x(ref.x)<150?'start':'middle'}>{ref.label} · {fmt(ref.x)} mm</text></g>)}<path d={`M50 280v12h24`} stroke="#6b766d" fill="none"/><text x="50" y="311" className="svg-note">x = 0</text>{dimensions && !references.length && r.pitch && r.pitch * scale > 65 && <Dim x1={x(r.boards[0].start + (r.boards[0].end - r.boards[0].start) / 2)} x2={x(r.boards[0].start + (r.boards[0].end - r.boards[0].start) / 2 + r.pitch)} y={300} label={`c/c ${fmt(r.pitch)}`}/>}</svg></div>;
}
function Section({ layout: r, dimensions }: {
    layout: Layout;
    dimensions: boolean;
}) {
    const bottoms = r.boards.filter(b => b.kind === 'bottom').slice(0, 3);
    const lids = r.boards.filter(b => b.kind === 'lid').slice(0, 2);
    const end = Math.max(...bottoms.map(b => b.end), ...lids.map(b => b.end));
    const scale = 640 / Math.max(end, 1), x = (v: number) => 40 + v * scale;
    const first = r.boards.filter(b => b.start < end && b.end > 0);
    const bottomPair = bottoms.length >= 2 ? [bottoms[0], bottoms[1]] : null;
    const lidPair = lids.length >= 2 ? [lids[0], lids[1]] : null;
    const overlapLid = lids[0];
    const overlapBottom = overlapLid && bottoms.find(b => b.start < overlapLid.end && b.end > overlapLid.start);
    const overlapStart = overlapBottom && overlapLid ? Math.max(overlapBottom.start, overlapLid.start) : null;
    const overlapEnd = overlapBottom && overlapLid ? Math.min(overlapBottom.end, overlapLid.end) : null;
    const extension = (from: number, to: number, y1: number, y2: number) => <path className="section-extension" d={`M${x(from)} ${y1}V${y2} M${x(to)} ${y1}V${y2}`}/>;
    return <details className="section-detail" open>
        <summary>Så möts brädorna <span>SEKTION UPPIFRÅN</span></summary>
        <div className="legend section-legend"><span><i className="bottom"/>Bottenbräda · undre lager</span><span><i className="lid"/>Lockbräda · yttre lager</span><span><i className="corner"/>Knut</span></div>
        <p className="section-hint">Detalj av vänster avslut och de första facken. Dra i sidled på en liten skärm.</p>
        <div className="section-scroll measured-section"><svg viewBox="0 0 740 340" role="img" aria-label="Måttsatt sektion uppifrån med springa mellan bottenbrädor, avstånd mellan lockbrädor och överlapp">
            <text x="40" y="25" className="svg-note">UTSIDA / FASAD</text>
            <path d="M40 203H700" stroke="#b9bcb1"/>
            {first.map(b => <g key={b.id}><rect className={b.kind} x={x(b.start)} y={b.kind === 'bottom' ? 162 : 132} width={Math.max(.5, (Math.min(b.end, end) - b.start) * scale)} height="30"/>{(b.kind === 'bottom' ? bottoms : lids).some(v => v.id === b.id) && <text className={`section-board-label ${b.kind === 'lid' ? 'on-lid' : ''}`} x={x((b.start + Math.min(b.end, end)) / 2)} y={b.kind === 'bottom' ? 182 : 152} textAnchor="middle">{names[b.kind]} {b.number}</text>}</g>)}
            {dimensions && <>
                {lidPair && <>{extension(lidPair[0].end, lidPair[1].start, 128, 65)}<Dim x1={x(lidPair[0].end)} x2={x(lidPair[1].start)} y={65} label={`Mellan lock ${fmt(lidPair[1].start - lidPair[0].end)} mm`}/></>}
                {bottomPair && <>{extension(bottomPair[0].end, bottomPair[1].start, 196, 242)}<Dim x1={x(bottomPair[0].end)} x2={x(bottomPair[1].start)} y={242} label={`Springa botten ${fmt(bottomPair[1].start - bottomPair[0].end)} mm`}/></>}
                {overlapStart !== null && overlapEnd !== null && <g className="section-overlap"><rect x={x(overlapStart)} y="132" width={x(overlapEnd) - x(overlapStart)} height="60"/>{extension(overlapStart, overlapEnd, 196, 310)}<Dim x1={x(overlapStart)} x2={x(overlapEnd)} y={310} label={`Överlapp ${fmt(overlapEnd - overlapStart)} mm / sida`}/></g>}
            </>}
            <text x="40" y="330" className="svg-note">x = 0</text>
        </svg></div>
        <p>Springan mäts mellan bottenbrädornas kanter. Avståndet mellan lock mäts mellan lockbrädornas kanter och motsvarar den synliga bottenbredden i ett vanligt innerfack. Överlappet visar hur långt locket täcker bottenbrädan på en sida.</p>
        {(!bottomPair || !lidPair) && <p>{!bottomPair ? 'Ingen springa mellan bottenbrädor: sträckan har bara en bottenbräda. ' : ''}{!lidPair ? 'Avstånd mellan lock kräver minst två lockbrädor.' : ''}</p>}
        <p>Knutens täckning K mäts från väggkanten. Bottenbrädan börjar vid K − Q vid ett knutavslut. Brädtjockleken är schematisk.</p>
        <div className="end-widths">{r.boards.filter(b => b.kind === 'corner').map(b => { const q = b.number === 1 ? b.end - r.offset : r.boards[r.count - 1].end - b.start; return <div key={b.id}>{b.number === 1 ? 'Vänster' : 'Höger'} knut: K = {fmt(b.end - b.start)} mm · Q = {fmt(q)} mm · ändavdrag = {fmt(b.end - b.start - q)} mm</div>; })}</div>
        <div className="end-widths">Synlig botten vid vänster avslut: <strong>{fmt(r.boards[0].visible)} mm</strong> · höger: <strong>{fmt(r.boards[r.count - 1].visible)} mm</strong></div>
    </details>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
