import { useMemo, useState } from 'react';
import { calculateFacade, parseOpenings, type Facade, type FacadeMode, type OpeningDraft } from './facade';
import { parseMeasure, type Input } from './geometry';
const f = (v: number) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 }).format(v);
export function OpeningEditor({ openings, height, mode, width, onChange, onHeight, onMode, advanced=false }: {
    openings: OpeningDraft[];
    height: string;
    mode: FacadeMode;
    width: number;
    onChange: (v: OpeningDraft[]) => void;
    onHeight: (v: string) => void;
    onMode: (v: FacadeMode) => void;
    advanced?: boolean;
}) {
    const [expanded,setExpanded]=useState<string|null>(null);
    const edit = (id: string, key: keyof OpeningDraft, value: string | boolean) => onChange(openings.map(o => o.id === id ? { ...o, [key]: value } : o));
    const add = (kind: 'window' | 'door') => {
        const id=crypto.randomUUID();setExpanded(id);
        const n = openings.filter(o => o.kind === kind).length + 1;
        onChange([...openings, { id, name: `${kind === 'window' ? 'Fönster' : 'Dörr'} ${n}`, kind, x: String(Math.max(1, Math.round((Number.isFinite(width) ? width : 3000) * .25))), y: kind === 'door' ? '0' : '800', width: '800', height: kind === 'door' ? '2100' : '1200', flashing: false, left: '200', right: '200' }]);
    };
    return <section className="card opening-editor" aria-label="Dörrar och fönster"><div className="opening-header"><div><h2>Dörrar & fönster</h2><p>Gemensamt för alla alternativ. Använd hålkanter som start eller stopp. I sträckläget får öppningar fortsätta utanför väggen; negativt vänsterläge går också bra.</p></div><div className="opening-actions"><button onClick={() => add('window')}>+ Lägg till fönster</button><button onClick={() => add('door')}>+ Lägg till dörr</button></div></div>
 {openings.length > 0 && <><div className="opening-global"><label className="field"><span>Vägghöjd</span><div className="input-wrap"><input aria-label="Vägghöjd" inputMode="decimal" value={height} onChange={e => onHeight(e.target.value)}/><span>mm</span></div></label>{advanced&&<label className="field end-select"><span>Fördelning runt öppningar</span><select aria-label="Fördelning runt öppningar" value={mode} onChange={e => onMode(e.target.value as FacadeMode)}><option value="continuous">Sammanhängande panellinjer</option><option value="segments">Separata delsträckor</option></select></label>}</div>
 {advanced&&<p className="opening-mode-help">{mode === 'continuous' ? 'Samma lodräta panellinjer på hela väggen, även ovanför och under hålen. Alla hålkanter och plåtkanter måste passa samma fördelning.' : 'Väggen delas i horisontella band vid öppningarnas över- och underkanter. Varje fritt område får en egen fördelning. Streckade gränser visar var linjeringen kan bytas; skarvar och montage behöver planeras separat.'}</p>}
 <div className="opening-list">{openings.map(o => <details className="opening-item" key={o.id} open={expanded===o.id}><summary>{o.name || 'Öppning'} <span>{o.kind === 'door' ? 'DÖRR' : 'FÖNSTER'} · {o.width || '—'} × {o.height || '—'} mm</span></summary><div className="opening-item-body"><label className="opening-name">Namn<input aria-label={`${o.name}: namn`} value={o.name} maxLength={60} onChange={e => edit(o.id, 'name', e.target.value)}/></label><div className="opening-fields">{(['x', 'y', 'width', 'height'] as const).map(key => <label className="field" key={key}><span>{{ x: 'Vänsterläge', y: 'Underkant', width: 'Hålbredd', height: 'Hålhöjd' }[key]}</span><div className="input-wrap"><input aria-label={`${o.name}: ${{ x: 'Vänsterläge', y: 'Underkant', width: 'Hålbredd', height: 'Hålhöjd' }[key]}`} inputMode="decimal" value={o[key]} disabled={o.kind === 'door' && key === 'y'} onChange={e => edit(o.id, key, e.target.value)}/><span>mm</span></div></label>)}</div><div className="opening-flashing"><label className="check"><input type="checkbox" checked={o.flashing} onChange={e => edit(o.id, 'flashing', e.target.checked)}/><span>{o.name}: plåt ovanför</span></label>{o.flashing && <div className="two-col">{(['left', 'right'] as const).map(side => <label className="field" key={side}><span>Utstick {side === 'left' ? 'vänster' : 'höger'}</span><div className="input-wrap"><input aria-label={`${o.name}: plåtutstick ${side === 'left' ? 'vänster' : 'höger'}`} inputMode="decimal" value={o[side]} onChange={e => edit(o.id, side, e.target.value)}/><span>mm</span></div></label>)}</div>}</div><button className="remove-opening" onClick={() => onChange(openings.filter(v => v.id !== o.id))}>Ta bort {o.name || 'öppning'}</button></div></details>)}</div>
 {advanced&&<details className="opening-rule"><summary>Så linjerar locken med hål och plåt</summary><p>På vänster sida slutar ett lock vid hålkanten; närmaste lock utåt slutar vid plåtens vänstra ände. På höger sida börjar ett lock vid hålkanten och nästa lock utåt börjar vid plåtens högra ände. Utsticket mäts från hålkanten till plåtänden. Appen flyttar inte hålet eller ändrar virket för att få det att passa.</p><svg viewBox="0 0 600 145" role="img" aria-label="Princip: två intilliggande stående lock linjerar med plåtens vänstra ände respektive hålets vänsterkant"><rect x="65" y="23" width="62" height="104" className="lid"/><rect x="220" y="23" width="62" height="104" className="lid"/><rect x="282" y="67" width="270" height="60" className="opening-hole"/><path d="M127 60H552" className="flashing-line"/><path d="M127 7V136M282 7V136" className="opening-guide"/><text x="127" y="18" textAnchor="middle">Plåtkant</text><text x="282" y="18" textAnchor="middle">Hålkant</text><text x="405" y="108" textAnchor="middle">Dörr- eller fönsterhål</text></svg></details>}</>}
 </section>;
}
export function FacadeResults({ input, openings, height, mode, dimensions, zoom, onZoom, onDimensions }: {
    input: Input;
    openings: OpeningDraft[];
    height: string;
    mode: FacadeMode;
    dimensions: boolean;
    zoom: number;
    onZoom: (z: number) => void;
    onDimensions: (v: boolean) => void;
}) {
    const [page, setPage] = useState(0), [copied, setCopied] = useState('');
    const outcome = useMemo(() => { try {
        return { facade: calculateFacade(input, parseMeasure(height), parseOpenings(openings), mode), error: null };
    }
    catch (e) {
        return { facade: null, error: (e as Error).message };
    } }, [input, height, openings, mode]);
    const scene = outcome.facade;
    const valid = scene && !scene.conflicts.length;
    const totalPages = Math.max(1, Math.ceil((scene?.pieces.length ?? 0) / 40)), safePage = Math.min(page, totalPages - 1);
    async function copy() { if (!scene || !valid)
        return; try {
        await navigator.clipboard.writeText(['Panel med öppningar – mm, x från vänster, y från underkant', 'Zon\tTyp\tVänster\tHöger\tUnderkant\tÖverkant', ...scene.pieces.map(p => [p.zone, p.kind === 'bottom' ? 'Botten' : p.kind === 'lid' ? 'Lock' : 'Knut', f(p.start), f(p.end), f(p.y), f(p.y + p.height)].join('\t'))].join('\n'));
        setCopied('Delarnas mått är kopierade.');
    }
    catch {
        setCopied('Kunde inte kopiera måtten.');
    } }
    return <div className="facade-results">
 <div className="card drawing-card"><div className="drawing-header"><div className="section-title"><span className="step">02</span><h2>Din vägg med öppningar</h2></div><span className={`pill ${valid ? '' : 'conflict-pill'}`}>{valid ? 'GILTIG LINJERING' : 'KONTROLLERA MÅTTEN'}</span></div>
 <div className="drawing-toolbar"><div className="legend"><span><i className="bottom"/>Botten</span><span><i className="lid"/>Lock</span><span><i className="corner"/>Knut</span><span><i className="plate-key"/>Plåt</span></div><div className="view-controls"><label><input type="checkbox" checked={dimensions} onChange={e => onDimensions(e.target.checked)}/> Mått</label><button aria-label="Zooma ut" onClick={() => onZoom(Math.max(1, zoom - .5))}>−</button><button aria-label="Zooma in" onClick={() => onZoom(Math.min(8, zoom + .5))}>+</button><button onClick={() => onZoom(1)}>Anpassa</button></div></div>
 {outcome.error ? <div className="facade-error" role="alert">{outcome.error}</div> : scene && <><FacadeDrawing scene={scene} dimensions={dimensions} zoom={zoom}/>{scene.conflicts.length > 0 && <div className="facade-error" role="alert"><h3>Linjeringen går inte ihop</h3><ul>{[...new Set(scene.conflicts)].slice(0, 12).map((c, i) => <li key={i}>{c}</li>)}</ul><p>Olösta områden visas utan panel. Ritningen är inte ett färdigt utsättningsunderlag.</p></div>}<div className="drawing-foot"><span>{mode === 'continuous' ? 'SAMMANHÄNGANDE PANELLINJER' : 'SEPARATA PANELFÄLT'}</span><span>Verklig vägghöjd · y = 0 vid underkant</span></div></>}
 </div>
 {scene && valid && <><div className="card facade-summary"><h3>{scene.zones.length} panelområde{scene.zones.length === 1 ? '' : 'n'}</h3><p>{scene.pieces.filter(p => p.kind === 'bottom').length} bottenbrädsdelar · {scene.pieces.filter(p => p.kind === 'lid').length} lockbrädsdelar efter utskärning. Antalen avser ritade delar, inte inköpsmängd.</p><div className="table-scroll"><table><thead><tr><th>Område</th><th>Vänster x</th><th>Underkant y</th><th>c/c</th><th>Springa botten</th><th>Överlapp</th></tr></thead><tbody>{scene.zones.map(z => <tr key={z.id}><td>{z.id}</td><td>{f(z.x)}</td><td>{f(z.y)}</td><td>{z.layout.pitch === null ? '—' : f(z.layout.pitch)}</td><td>{z.layout.gap === null ? '—' : f(z.layout.gap)}</td><td>{z.layout.overlap === null ? '—' : f(z.layout.overlap)}</td></tr>)}</tbody></table></div></div><div className="card schedule"><div className="schedule-head"><div className="section-title"><span className="step">03</span><h2>Utsättning & bräddelar</h2></div><button className="primary" onClick={copy}>Kopiera delar ↗</button></div><p className="table-note">Alla mått i mm. Delar över och under samma hål redovisas separat. Kapmått behöver kontrolleras mot montage och plåt.</p><div className="table-scroll"><table><thead><tr><th>Område / del</th><th>Vänster</th><th>Höger</th><th>Underkant</th><th>Överkant</th><th>Höjd</th></tr></thead><tbody>{scene.pieces.slice(safePage * 40, (safePage + 1) * 40).map(p => <tr key={p.id}><td>{p.zone} · {p.kind === 'bottom' ? 'Botten' : p.kind === 'lid' ? 'Lock' : 'Knut'} {p.number}</td><td>{f(p.start)}</td><td>{f(p.end)}</td><td>{f(p.y)}</td><td>{f(p.y + p.height)}</td><td>{f(p.height)}</td></tr>)}</tbody></table></div><div className="pagination"><span>{safePage * 40 + 1}–{Math.min((safePage + 1) * 40, scene.pieces.length)} av {scene.pieces.length} delar</span><div><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>←</button><button disabled={safePage + 1 >= totalPages} onClick={() => setPage(safePage + 1)}>→</button></div></div><p role="status" className="notice">{copied}</p></div></>}
 </div>;
}
function FacadeDrawing({ scene: s, dimensions, zoom }: {
    scene: Facade;
    dimensions: boolean;
    zoom: number;
}) {
    const scale = 760 / s.width, wallHeight = s.height * scale, svgHeight = wallHeight + 180, top = 90, x = (v: number) => 70 + v * scale, y = (v: number) => top + (s.height - v) * scale;
    const [pan, setPan] = useState(0);
    // Cull horizontally on large walls. The SVG itself remains scrollable.
    const [viewport, setViewport] = useState(1000);
    return <div className="facade-scroll" onScroll={e => { setPan(e.currentTarget.scrollLeft); setViewport(e.currentTarget.clientWidth); }}><svg viewBox={`0 0 900 ${svgHeight}`} style={{ width: `${zoom * 100}%`, minWidth: '100%' }} role="img" aria-label={`Vägg med ${s.openings.filter(o => o.kind === 'window').length} fönster och ${s.openings.filter(o => o.kind === 'door').length} dörrar${s.conflicts.length ? ', olöst linjering' : ''}`}>
 <rect x={x(0)} y={y(s.height)} width={s.width * scale} height={wallHeight} fill="#ecebe2" stroke="#b9c2ad"/>
 {s.pieces.filter(p => { const left = x(p.start) / 900 * viewport * zoom, right = x(p.end) / 900 * viewport * zoom; return right >= pan - 100 && left <= pan + viewport + 100; }).map(p => <rect key={p.id} className={p.kind} x={x(p.start)} y={y(p.y + p.height)} width={(p.end - p.start) * scale} height={p.height * scale}><title>{p.zone} {p.kind === 'bottom' ? 'Botten' : p.kind === 'lid' ? 'Lock' : 'Knut'} {p.number}: x {f(p.start)}–{f(p.end)}, y {f(p.y)}–{f(p.y + p.height)} mm</title></rect>)}
 {s.zones.length > 1 && s.zones.map(z => <g key={z.id}><rect className="zone-boundary" x={x(z.x)} y={y(z.y + z.height)} width={z.width * scale} height={z.height * scale}/><text className="zone-label" x={x(z.x) + 6} y={y(z.y + z.height) + 18}>{z.id}</text></g>)}
 {s.openings.map(o => <g key={o.id}><rect className={`opening-hole ${o.kind}`} x={x(o.x)} y={y(o.y + o.height)} width={o.width * scale} height={o.height * scale}/>{o.kind === 'window' ? <path d={`M${x(o.x + o.width / 2)} ${y(o.y)}V${y(o.y + o.height)} M${x(o.x)} ${y(o.y + o.height / 2)}H${x(o.x + o.width)}`} className="window-cross"/> : <circle cx={x(o.x + o.width * .85)} cy={y(o.y + o.height * .5)} r="3" fill="#596d6a"/>}<text className="opening-title" x={x(o.x + o.width / 2)} y={y(o.y + o.height * .65)} textAnchor="middle">{o.name}</text>{dimensions && <><text className="opening-dimension" x={x(o.x + o.width / 2)} y={y(o.y + o.height * .65) + 18} textAnchor="middle">{f(o.width)} × {f(o.height)} mm</text><text className="opening-dimension" x={x(o.x + o.width / 2)} y={y(o.y + o.height * .65) + 34} textAnchor="middle">x {f(o.x)} · y {f(o.y)}</text></>}{o.flashing && <><path d={`M${x(o.x - o.left)} ${y(o.y + o.height)}H${x(o.x + o.width + o.right)}`} className="flashing-line"/>{dimensions && <><path d={`M${x(o.x - o.left)} ${y(o.y + o.height) - 25}H${x(o.x)} M${x(o.x + o.width)} ${y(o.y + o.height) - 25}H${x(o.x + o.width + o.right)}`} className="plate-dimension-line"/><text className="plate-dimension" x={x(o.x - o.left / 2)} y={y(o.y + o.height) - 32} textAnchor="middle">{f(o.left)}</text><text className="plate-dimension" x={x(o.x + o.width + o.right / 2)} y={y(o.y + o.height) - 32} textAnchor="middle">{f(o.right)}</text></>}</>}</g>)}
 {dimensions && <><path className="guide-measure" d={`M${x(0)} 55H${x(s.width)} M${x(0)} 50V60 M${x(s.width)} 50V60`}/><text className="facade-dimension" x="450" y="43" textAnchor="middle">VÄGGBREDD {f(s.width)} mm</text><text className="facade-dimension" transform={`translate(32 ${top + wallHeight / 2}) rotate(-90)`} textAnchor="middle">VÄGGHÖJD {f(s.height)} mm</text></>}
 <text className="svg-note" x="70" y={top + wallHeight + 27}>x = 0, y = 0 · väggens vänstra nederhörn</text>
 </svg></div>;
}
