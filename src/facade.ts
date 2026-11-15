import { calculate, GeometryError, parseMeasure, parsePosition, type Board, type Input, type Layout } from './geometry';
export type OpeningDraft = {
    id: string;
    name: string;
    kind: 'window' | 'door';
    x: string;
    y: string;
    width: string;
    height: string;
    flashing: boolean;
    left: string;
    right: string;
};
export type FacadeOpening = {
    id: string;
    name: string;
    kind: 'window' | 'door';
    x: number;
    y: number;
    width: number;
    height: number;
    flashing: boolean;
    left: number;
    right: number;
};
export type FacadeMode = 'continuous' | 'segments';
export type FacadeZone = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    layout: Layout;
};
export type FacadePiece = Board & {
    zone: string;
    y: number;
    height: number;
};
export type Facade = {
    width: number;
    height: number;
    openings: FacadeOpening[];
    zones: FacadeZone[];
    pieces: FacadePiece[];
    conflicts: string[];
};
type Edge = {
    x: number;
    edge: 'start' | 'end';
    label: string;
};
const EPS = 1e-5;
const off = { enabled: false, cover: 0, overlap: 0 };
export function isOpeningDraft(o: unknown): o is OpeningDraft {
    if (!o || typeof o !== 'object')
        return false;
    const v = o as Record<string, unknown>;
    return ['window', 'door'].includes(String(v.kind)) && typeof v.flashing === 'boolean' && ['id', 'name', 'x', 'y', 'width', 'height', 'left', 'right'].every(k => typeof v[k] === 'string');
}
export function parseOpenings(drafts: OpeningDraft[]): FacadeOpening[] {
    return drafts.map(o => ({ ...o, x: parsePosition(o.x), y: parseMeasure(o.y), width: parseMeasure(o.width), height: parseMeasure(o.height), left: o.flashing ? parseMeasure(o.left) : 0, right: o.flashing ? parseMeasure(o.right) : 0 }));
}
function requirements(o: FacadeOpening, plateOnly = false): Edge[] {
    const result: Edge[] = [];
    if (!plateOnly)
        result.push({ x: o.x, edge: 'end', label: `${o.name}: vänster hålkant` }, { x: o.x + o.width, edge: 'start', label: `${o.name}: höger hålkant` });
    if (o.flashing)
        result.push({ x: o.x - o.left, edge: 'end', label: `${o.name}: vänster plåtkant` }, { x: o.x + o.width + o.right, edge: 'start', label: `${o.name}: höger plåtkant` });
    return result;
}
function solve(input: Input, edges: Edge[], forcedPitch?: number): Layout {
    const left = input.left.enabled ? input.left.cover - input.left.overlap : 0;
    const right = input.right.enabled ? input.right.cover - input.right.overlap : 0;
    const L = input.width - left - right, B = input.bottom, T = input.lid;
    const k = Number(input.start === 'lid') + Number(input.end === 'lid');
    const constant = B + k / 2 * (T - B);
    const min = Math.max(k ? 1 : 2, Math.ceil((L - constant) / (B + T - 2 * input.overlap) + 1 - k / 2 - 1e-7));
    const max = Math.min(10000, Math.floor((L - constant) / Math.max(B, T) + 1 - k / 2 + 1e-7));
    if (!edges.length && !forcedPitch)
        return calculate(input);
    for (let n = input.count ?? min; n <= (input.count ?? max); n++) {
        const intervals = n - 1 + k / 2;
        if (intervals <= 0)
            continue;
        const pitch = (L - constant) / intervals, overlap = (B + T - pitch) / 2;
        if (!Number.isFinite(pitch) || pitch <= B + 1e-7 || pitch < T - 1e-7 || overlap < input.overlap - 1e-7 || overlap > B + 1e-7 || overlap >= T - 1e-7)
            continue;
        if (forcedPitch !== undefined && Math.abs(pitch - forcedPitch) > EPS)
            continue;
        const first = input.start === 'lid' ? left : left + B - overlap;
        const count = n - 1 + k;
        if (!edges.every(e => { const i = (e.x - first - (e.edge === 'end' ? T : 0)) / pitch; return Math.abs(i - Math.round(i)) * pitch <= EPS && Math.round(i) >= 0 && Math.round(i) < count; }))
            continue;
        try {
            return calculate({ ...input, count: n });
        }
        catch { /* Candidate may collide with a corner. */ }
    }
    throw new GeometryError('openings', `Linjeringen går inte ihop med botten ${B} mm och lock ${T} mm. Prova andra botten- eller lockbredder i ett nytt alternativ, eller ändra öppningens läge, bredd eller plåtutstick. Inga brädbredder ändras automatiskt.`);
}
function cutRect(piece: FacadePiece, hole: FacadeOpening): FacadePiece[] {
    const x1 = Math.max(piece.start, hole.x), x2 = Math.min(piece.end, hole.x + hole.width), y1 = Math.max(piece.y, hole.y), y2 = Math.min(piece.y + piece.height, hole.y + hole.height);
    if (x2 <= x1 + EPS || y2 <= y1 + EPS)
        return [piece];
    const result: FacadePiece[] = [];
    const add = (suffix: string, start: number, end: number, y: number, top: number) => { if (end - start > EPS && top - y > EPS)
        result.push({ ...piece, id: `${piece.id}-${hole.id}-${suffix}`, start, end, y, height: top - y, visible: Math.min(piece.visible, end - start) }); };
    add('under', piece.start, piece.end, piece.y, y1);
    add('over', piece.start, piece.end, y2, piece.y + piece.height);
    add('left', piece.start, x1, y1, y2);
    add('right', x2, piece.end, y1, y2);
    return result;
}
export function calculateFacade(input: Input, height: number, openings: FacadeOpening[], mode: FacadeMode): Facade {
    if (!Number.isFinite(height) || height <= 0)
        throw new GeometryError('wallHeight', 'Ange positiv vägghöjd.');
    // Validate shared dimensions even when the full-width pattern has no solution.
    for (const [key, value] of Object.entries({ width: input.width, bottom: input.bottom, lid: input.lid, overlap: input.overlap }))
        if (!Number.isFinite(value) || value <= 0)
            throw new GeometryError(key, 'Ange ett positivt, ändligt mått.');
    if (input.overlap < 20)
        throw new GeometryError('overlap', 'Överlappet måste vara minst 20 mm.');
    if (openings.length > 100)
        throw new GeometryError('openings', 'Högst 100 öppningar stöds per alternativ.');
    const ids = new Set<string>();
    for (const o of openings) {
        if (ids.has(o.id))
            throw new GeometryError('openings', 'Öppningarna måste ha unika ID:n.');
        ids.add(o.id);
        for (const key of ['x', 'y', 'width', 'height', 'left', 'right'] as const) {
            if (!Number.isFinite(o[key]) || o[key] < 0 || (['width', 'height'].includes(key) && o[key] <= 0))
                throw new GeometryError(`${o.id}.${key}`, `${o.name}: kontrollera ${{ x: 'vänsterläge', y: 'underkant', width: 'hålbredd', height: 'hålhöjd', left: 'vänster plåtutstick', right: 'höger plåtutstick' }[key]}.`);
        }
        if (o.kind === 'door' && Math.abs(o.y) > EPS)
            throw new GeometryError(`${o.id}.y`, `${o.name}: dörrens underkant ska vara 0 mm.`);
        if (o.x <= 0 || o.x + o.width >= input.width || o.y + o.height > height + EPS || o.y < 0)
            throw new GeometryError(`${o.id}.width`, `${o.name}: hålet måste rymmas inom väggen med panel på båda sidor.`);
        if (o.flashing && (o.left <= 0 || o.right <= 0 || o.x - o.left < 0 || o.x + o.width + o.right > input.width || o.y + o.height >= height))
            throw new GeometryError(`${o.id}.left`, `${o.name}: ange positiva plåtutstick inom väggen och lämna väggyta ovanför plåten.`);
        const leftCorner = input.left.enabled ? input.left.cover : 0, rightCorner = input.right.enabled ? input.width - input.right.cover : input.width;
        if (o.x < leftCorner || o.x + o.width > rightCorner)
            throw new GeometryError('openings', `${o.name}: hålet kolliderar med en knutbräda.`);
    }
    for (let i = 0; i < openings.length; i++)
        for (let j = i + 1; j < openings.length; j++) {
            const a = openings[i], b = openings[j];
            if (a.x < b.x + b.width - EPS && a.x + a.width > b.x + EPS && a.y < b.y + b.height - EPS && a.y + a.height > b.y + EPS)
                throw new GeometryError('openings', `${a.name} och ${b.name}: hålen överlappar varandra.`);
            for (const [plate, hole] of [[a, b], [b, a]])
                if (plate.flashing && plate.y + plate.height > hole.y - EPS && plate.y + plate.height < hole.y + hole.height + EPS && plate.x - plate.left < hole.x + hole.width - EPS && plate.x + plate.width + plate.right > hole.x + EPS)
                    throw new GeometryError('openings', `${plate.name}: plåten kolliderar med ${hole.name}.`);
        }
    const result: Facade = { width: input.width, height, openings, zones: [], pieces: [], conflicts: [] };
    const addZone = (layout: Layout, x: number, y: number, zoneHeight: number) => {
        if (result.pieces.length + layout.boards.length > 50000)
            throw new GeometryError('openings', 'För många bräddelar. Dela upp väggen i flera alternativ eller färre öppningar.');
        const id = `Z${result.zones.length + 1}`;
        result.zones.push({ id, x, y, width: layout.width, height: zoneHeight, layout });
        for (const b of layout.boards)
            result.pieces.push({ ...b, id: `${id}-${b.id}`, start: b.start + x, end: b.end + x, zone: id, y, height: zoneHeight });
    };
    if (mode === 'continuous') {
        const forced = openings.filter(o => o.flashing).flatMap(o => [o.left, o.right]);
        if (forced.some(v => Math.abs(v - forced[0]) > EPS)) {
            result.conflicts.push('Sammanhängande panellinjer kräver samma modul för alla plåtutstick. Vänster och höger utstick måste därför vara lika stora när nästa lock ska linjera. Prova separata delsträckor eller justera utsticken.');
            return result;
        }
        try {
            addZone(solve(input, openings.flatMap(o => requirements(o)), forced[0]), 0, 0, height);
        }
        catch (e) {
            result.conflicts.push((e as Error).message);
            return result;
        }
        for (const hole of openings) {
            result.pieces = result.pieces.flatMap(p => cutRect(p, hole));
            if (result.pieces.length > 50000)
                throw new GeometryError('openings', 'För många bräddelar. Dela upp väggen i flera alternativ.');
        }
    }
    else {
        const levels = [...new Set([0, height, ...openings.flatMap(o => [o.y, o.y + o.height])])].sort((a, b) => a - b);
        for (let row = 0; row < levels.length - 1; row++) {
            const y = levels[row], top = levels[row + 1], mid = (y + top) / 2;
            const active = openings.filter(o => mid > o.y && mid < o.y + o.height).sort((a, b) => a.x - b.x);
            const spans = [0, ...active.flatMap(o => [o.x, o.x + o.width]), input.width];
            for (let i = 0; i < spans.length - 1; i += 2) {
                const x = spans[i], end = spans[i + 1];
                if (end - x <= EPS)
                    continue;
                const leftHole = active.find(o => Math.abs(o.x + o.width - x) < EPS), rightHole = active.find(o => Math.abs(o.x - end) < EPS);
                const edges: Edge[] = [];
                let forced: number | undefined;
                for (const [o, side] of [[leftHole, 'left'], [rightHole, 'right']] as const) {
                    if (!o)
                        continue;
                    const relevant = requirements(o).filter(e => side === 'left' ? e.edge === 'start' : e.edge === 'end');
                    edges.push(...relevant.map(e => ({ ...e, x: e.x - x })));
                    if (o.flashing) {
                        const p = side === 'left' ? o.right : o.left;
                        if (forced !== undefined && Math.abs(forced - p) > EPS)
                            result.conflicts.push(`Delsträcka vid y=${y}: olika plåtutstick kräver olika moduler i samma panelområde.`);
                        forced = p;
                    }
                }
                // Above each plate, align the new panel field with the plate ends.
                for (const o of openings.filter(o => o.flashing && Math.abs(o.y + o.height - y) < EPS))
                    for (const edge of requirements(o, true))
                        if (edge.x >= x - EPS && edge.x <= end + EPS)
                            edges.push({ ...edge, x: edge.x - x });
                const zoneInput: Input = { ...input, width: end - x, left: x === 0 ? input.left : off, right: end === input.width ? input.right : off, start: x === 0 ? input.start : 'lid', end: end === input.width ? input.end : 'lid', count: undefined };
                try {
                    addZone(solve(zoneInput, edges, forced), x, y, top - y);
                }
                catch (e) {
                    result.conflicts.push(`Område x=${Math.round(x)}–${Math.round(end)}, y=${Math.round(y)}–${Math.round(top)} mm: ${(e as Error).message}`);
                }
            }
        }
    }
    return result;
}
