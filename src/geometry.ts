export type Corner = {
    enabled: boolean;
    cover: number;
    overlap: number;
};
export type Input = {
    width: number;
    bottom: number;
    lid: number;
    overlap: number;
    left: Corner;
    right: Corner;
    count?: number;
    start?: 'bottom' | 'lid';
    end?: 'bottom' | 'lid';
};
export type Board = {
    id: string;
    kind: 'bottom' | 'lid' | 'corner';
    number: number;
    start: number;
    end: number;
    visible: number;
};
export type Opening = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type PlacementConstraint = {
    x: number;
    kind: 'bottom' | 'lid';
    reference: 'edge' | 'center';
};
export type Layout = {
    width: number;
    length: number;
    offset: number;
    count: number;
    lidCount: number;
    gap: number | null;
    pitch: number | null;
    overlap: number | null;
    boards: Board[];
};
export class GeometryError extends Error {
    constructor(public field: string, message: string) { super(message); }
}
// Absolute comparison tolerance in millimetres. Coordinates retain full precision.
const EPS = 1e-7;
export function calculate(input: Input): Layout {
    const { width: W, bottom: B, lid: T, overlap: desired } = input;
    for (const [field, value] of Object.entries({ width: W, bottom: B, lid: T, overlap: desired }))
        if (!Number.isFinite(value) || value <= 0)
            throw new GeometryError(field, 'Ange ett positivt, ändligt mått.');
    if (desired < 20)
        throw new GeometryError('overlap', 'Överlappet måste vara minst 20 mm.');
    const start = input.start ?? 'bottom', finish = input.end ?? 'bottom';
    if (!['bottom', 'lid'].includes(start) || !['bottom', 'lid'].includes(finish)) throw new GeometryError('width', 'Välj giltig start- och slutbräda.');
    const leftLid = start === 'lid', rightLid = finish === 'lid';
    const k = Number(leftLid) + Number(rightLid);
    if ((leftLid && input.left.enabled) || (rightLid && input.right.enabled)) throw new GeometryError('width', 'Knutbräda kräver bottenbräda vid samma avslut.');
    const corners = [input.left, input.right].map((c, i) => {
        if (!c.enabled)
            return { cover: 0, overlap: 0, offset: 0 };
        if (!Number.isFinite(c.cover) || c.cover <= 0)
            throw new GeometryError(i ? 'rightCover' : 'leftCover', 'Ange positiv knuttäckning.');
        if (!Number.isFinite(c.overlap) || c.overlap < 0 || c.overlap > c.cover || c.overlap > B)
            throw new GeometryError(i ? 'rightOverlap' : 'leftOverlap', 'Överlappet ska rymmas inom knuttäckningen och bottenbrädan.');
        return { ...c, offset: c.cover - c.overlap };
    });
    const [left, right] = corners, L = W - left.offset - right.offset;
    if (L <= 0 || left.cover + right.cover > W + EPS)
        throw new GeometryError('width', 'Knutbrädorna ryms inte på väggen.');
    if (input.count !== undefined && (!Number.isSafeInteger(input.count) || input.count < 1))
        throw new GeometryError('count', 'Ange ett positivt heltalsantal.');
    let n: number, gap: number | null = null, pitch: number | null = null, overlap: number | null = null;
    if (k === 0 && Math.abs(L - B) <= EPS && (input.count === undefined || input.count === 1)) {
        n = 1;
    }
    else {
        if (T <= 2 * desired)
            throw new GeometryError('lid', 'Lockbredden måste överstiga två gånger önskat överlapp.');
        // L = (n - 1 + k/2) * pitch + B + k/2 * (T-B).
        // k counts lock ends. The smallest feasible n minimises overlap.
        const constant = B + k / 2 * (T - B);
        const maxPitch = B + T - 2 * desired;
        n = input.count ?? Math.max(k ? 1 : 2, Math.ceil((L - constant) / maxPitch + 1 - k / 2 - EPS));
        const intervals = n - 1 + k / 2;
        if (intervals <= 0) throw new GeometryError('count', 'En enda bottenbräda kräver att panelsträckan är lika med brädbredden.');
        pitch = (L - constant) / intervals;
        gap = pitch - B;
        overlap = (B + T - pitch) / 2;
        if (gap <= EPS || overlap < desired - EPS || overlap > B + EPS || overlap >= T - EPS || pitch < T - EPS)
            throw new GeometryError('count', 'Ingen giltig fördelning för dessa mått. Ändra brädbredd, sträcka eller antal.');
        if (left.overlap + overlap > B + EPS || right.overlap + overlap > B + EPS)
            throw new GeometryError('count', 'Knut och lock kolliderar på ändbrädan. Minska knutens överlapp eller välj andra mått.');
    }
    if (n > 10000)
        throw new GeometryError('width', 'Högst 10 000 bottenbrädor stöds. Dela upp den långa sträckan.');
    const boards: Board[] = [];
    const add = (kind: Board['kind'], number: number, start: number, end: number) => boards.push({ id: `${kind}-${number}`, kind, number, start, end, visible: end - start });
    const bottomOffset = left.offset + (leftLid ? T - overlap! : 0);
    for (let i = 0; i < n; i++)
        add('bottom', i + 1, bottomOffset + i * (pitch ?? 0), bottomOffset + i * (pitch ?? 0) + B);
    const lidCount = n - 1 + k;
    for (let i = 0; i < lidCount; i++) {
        const lidStart = leftLid ? left.offset + i * pitch! : bottomOffset + B - overlap! + i * pitch!;
        add('lid', i + 1, lidStart, lidStart + T);
    }
    if (left.cover)
        add('corner', 1, 0, left.cover);
    if (right.cover)
        add('corner', 2, W - right.cover, W);
    const lids = boards.filter(b => b.kind === 'lid');
    const knots = boards.filter(b => b.kind === 'corner');
    for (const b of boards.filter(b => b.kind === 'bottom')) {
        const covers = [lids[b.number - 2 + Number(leftLid)], lids[b.number - 1 + Number(leftLid)], ...knots].filter((c): c is Board => Boolean(c));
        const spans = covers.map(c => [Math.max(b.start, c.start), Math.min(b.end, c.end)]).filter(([a, z]) => z > a).sort((a, b) => a[0] - b[0]);
        let covered = 0, end = b.start;
        for (const [a, z] of spans) {
            covered += Math.max(0, z - Math.max(a, end));
            end = Math.max(end, z);
        }
        b.visible = Math.max(0, B - covered);
    }
    return { width: W, length: L, offset: left.offset, count: n, lidCount, gap: n > 1 ? gap : null, pitch: Math.max(n, lidCount) > 1 ? pitch : null, overlap, boards };
}
export function parseMeasure(value: string) { const clean = value.trim().replace(',', '.'); return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean) ? Number(clean) : NaN; }

// Positions may be negative when an opening begins outside a selected wall section.
export function parsePosition(value: string) { const clean=value.trim(); return clean.startsWith('-')?-parseMeasure(clean.slice(1)):parseMeasure(clean); }
