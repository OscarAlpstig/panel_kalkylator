import { describe, it, expect } from 'vitest';
import { calculateFacade, parseOpenings, type FacadeOpening } from './facade';
import type { Input } from './geometry';
const off = { enabled: false, cover: 95, overlap: 40 };
const base: Input = { width: 2945, bottom: 145, lid: 95, overlap: 20, left: off, right: off, start: 'bottom', end: 'bottom' };
const window: FacadeOpening = { id: 'w1', name: 'Fönster 1', kind: 'window', x: 820, y: 800, width: 505, height: 1200, flashing: true, left: 200, right: 200 };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;
describe('facade openings', () => {
    it('keeps one grid and aligns hole and adjacent plate edges', () => {
        const r = calculateFacade(base, 3000, [window], 'continuous');
        expect(r.conflicts).toEqual([]);
        expect(r.zones).toHaveLength(1);
        const lids = r.zones[0].layout.boards.filter(b => b.kind === 'lid');
        for (const edge of [620, 820])
            expect(lids.some(b => near(b.end, edge))).toBe(true);
        for (const edge of [1325, 1525])
            expect(lids.some(b => near(b.start, edge))).toBe(true);
        for (const p of r.pieces) {
            expect(p.start).toBeGreaterThanOrEqual(0);
            expect(p.end).toBeLessThanOrEqual(2945.00001);
            expect(p.y + p.height).toBeLessThanOrEqual(3000);
            expect(p.height).toBeGreaterThan(0);
            expect(p.start >= 1325 - 1e-5 || p.end <= 820 + 1e-5 || p.y >= 2000 - 1e-5 || p.y + p.height <= 800 + 1e-5).toBe(true);
        }
        // Removed area in each material layer equals its actual intersection with the hole.
        const original = r.zones[0].layout.boards.reduce((sum, b) => sum + (b.end - b.start) * 3000, 0);
        const removed = r.zones[0].layout.boards.reduce((sum, b) => sum + Math.max(0, Math.min(b.end, 1325) - Math.max(b.start, 820)) * 1200, 0);
        expect(r.pieces.reduce((sum, p) => sum + (p.end - p.start) * p.height, 0)).toBeCloseTo(original - removed, 4);
    });
    it('searches beyond the initial board count when constraints require it', () => {
        const r = calculateFacade({ ...base, width: 3545 }, 3000, [{ ...window, x: 715, width: 585, left: 170, right: 170 }], 'continuous');
        expect(r.conflicts).toEqual([]);
        expect(r.zones[0].layout.count).toBe(21);
        expect(r.zones[0].layout.pitch).toBeCloseTo(170);
    });
    it('supports separate zones and no pieces inside a door', () => {
        const door = { ...window, kind: 'door' as const, y: 0, height: 2100 };
        const r = calculateFacade(base, 3000, [door], 'segments');
        expect(r.conflicts).toEqual([]);
        expect(r.zones.length).toBeGreaterThan(1);
        for (const p of r.pieces)
            expect(p.end <= 820 + 1e-5 || p.start >= 1325 - 1e-5 || p.y >= 2100 - 1e-5).toBe(true);
    });
    it('allows independently distributed side zones when one grid cannot fit', () => {
        const o = { ...window, x: 1905, width: 875, left: 170, right: 190 };
        expect(calculateFacade({ ...base, width: 3755 }, 3000, [o], 'continuous').conflicts.length).toBeGreaterThan(0);
        const r = calculateFacade({ ...base, width: 3755 }, 3000, [o], 'segments');
        expect(r.conflicts).toEqual([]);
        expect(r.zones.some(z => near(z.layout.pitch ?? 0, 170))).toBe(true);
        expect(r.zones.some(z => near(z.layout.pitch ?? 0, 190))).toBe(true);
    });
    it('reports impossible alignment instead of changing widths or hole positions', () => {
        const r = calculateFacade(base, 3000, [{ ...window, x: 821 }], 'continuous');
        expect(r.conflicts.join(' ')).toContain('Prova andra');
        expect(r.pieces).toHaveLength(0);
        expect(calculateFacade(base, 3000, [{ ...window, left: 199 }], 'continuous').conflicts.length).toBeGreaterThan(0);
    });
    it('supports several openings on the same grid', () => {
        const r = calculateFacade({ ...base, width: 4945 }, 3000, [window, { ...window, id: 'w2', name: 'Fönster 2', x: 2820 }], 'continuous');
        expect(r.conflicts).toEqual([]);
        expect(r.openings).toHaveLength(2);
    });
    it('validates bounds, overlaps, door base, flashing and numeric values', () => {
        for (const bad of [{ x: -1 }, { height: 2500 }, { width: 0 }, { x: NaN }, { kind: 'door' as const, y: 50 }, { left: 900 }, { right: NaN }])
            expect(() => calculateFacade(base, 3000, [{ ...window, ...bad }], 'continuous')).toThrow();
        expect(() => calculateFacade(base, NaN, [window], 'continuous')).toThrow();
        expect(() => calculateFacade(base, 3000, [window, { ...window, id: 'w2' }], 'continuous')).toThrow('överlappar');
    });
    it('ignores disabled flashing drafts and supports decimal comma', () => {
        const [o] = parseOpenings([{ ...window, x: '820,5', y: '800', width: '505', height: '1200', flashing: false, left: '', right: 'oops' }]);
        expect(o.x).toBe(820.5);
        expect(o.left).toBe(0);
        expect(o.right).toBe(0);
    });
});
