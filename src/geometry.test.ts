import { describe, it, expect } from 'vitest';
import { calculate, parseMeasure, type Input } from './geometry';
const off = { enabled: false, cover: 95, overlap: 40 };
const base: Input = { width: 3000, bottom: 145, lid: 145, overlap: 20, left: off, right: off };
describe('panel geometry', () => {
    it('distributes full boards exactly across the span', () => { const r = calculate(base); expect(r.count).toBe(13); expect(r.gap).toBeCloseTo(92.9166667); expect(r.overlap).toBeCloseTo(26.0416667); expect(r.boards.filter(b => b.kind === 'bottom').at(-1)?.end).toBeCloseTo(3000); });
    it('reproduces the pictured wall without accumulated rounding', () => { const r = calculate({ ...base, width: 13600, lid: 95, left: { ...off, enabled: true }, right: { ...off, enabled: true } }); expect(r.count).toBe(68); expect(r.length).toBe(13490); expect(r.pitch).toBeCloseTo(199.179104); expect(r.overlap).toBeCloseTo(20.410448); expect(r.boards[0].start).toBe(55); expect(r.boards[67].end).toBeCloseTo(13545); });
    it('supports exact minimum overlap and different board widths', () => { const r = calculate({ ...base, width: 545, lid: 95 }); expect(r.count).toBe(3); expect(r.overlap).toBe(20); expect(r.gap).toBe(55); });
    it('supports one or asymmetric corners with global coordinates', () => { for (const right of [off, { enabled: true, cover: 120, overlap: 30 }]) {
        const r = calculate({ ...base, left: { ...off, enabled: true }, right });
        expect(r.offset).toBe(55);
        expect(r.boards[0].start).toBe(55);
        expect(r.boards[r.count - 1].end).toBeCloseTo(3000 - (right.enabled ? 90 : 0));
    } });
    it('clips visible widths including single-board corner coverage', () => { const r = calculate({ ...base, width: 255, left: { ...off, enabled: true }, right: { ...off, enabled: true } }); expect(r.count).toBe(1); expect(r.gap).toBeNull(); expect(r.boards[0].visible).toBe(65); });
    it('rejects collisions, short walls, impossible arrangements and invalid counts', () => {
        for (const change of [{ width: 100 }, { count: 1 }, { count: 1.5 }, { count: 30 }, { width: 150, lid: 95 }, { left: { enabled: true, cover: 145, overlap: 140 } }, { left: { enabled: true, cover: 95, overlap: 100 } }, { width: NaN }, { bottom: Infinity }, { overlap: 19 }, { lid: 40 }])
            expect(() => calculate({ ...base, ...change })).toThrow();
    });
    it('maintains coverage and symmetry across many feasible spans', () => { for (let width = 600; width < 20000; width += 137) {
        const r = calculate({ ...base, width, lid: 95 });
        const b = r.boards.filter(b => b.kind === 'bottom'), l = r.boards.filter(b => b.kind === 'lid');
        expect(b.at(-1)!.end).toBeCloseTo(width, 6);
        for (let i = 0; i < l.length; i++) {
            expect(b[i].end - l[i].start).toBeCloseTo(r.overlap!, 6);
            expect(l[i].end - b[i + 1].start).toBeCloseTo(r.overlap!, 6);
        }
    } });
    it('parses Swedish decimals and rejects empty or malformed text', () => { expect(parseMeasure('12,5')).toBe(12.5); for (const s of ['', 'Infinity', '12x', '-2', '1,2,3'])
        expect(parseMeasure(s)).toBeNaN(); });
});

describe('selectable end boards', () => {
    for (const start of ['bottom', 'lid'] as const) for (const end of ['bottom', 'lid'] as const) {
        it(`fits ${start} to ${end} exactly with 20 mm overlap`, () => {
            const k = Number(start === 'lid') + Number(end === 'lid');
            const width = 545 + 75 * k;
            const r = calculate({...base, width, lid:95, start, end});
            expect(r.count).toBe(3);
            expect(r.lidCount).toBe(2+k);
            expect(r.pitch).toBeCloseTo(200);
            expect(r.overlap).toBeCloseTo(20);
            const ordered=[...r.boards].sort((a,b)=>a.start-b.start);
            expect(ordered[0].kind).toBe(start);
            expect(ordered[0].start).toBeCloseTo(0);
            expect(ordered.at(-1)!.kind).toBe(end);
            expect(ordered.at(-1)!.end).toBeCloseTo(width);
            const lids=r.boards.filter(b=>b.kind==='lid');
            for(const b of r.boards.filter(b=>b.kind==='bottom')) {
                const coverage=lids.filter(l=>l.start<b.end&&l.end>b.start).map(l=>Math.min(l.end,b.end)-Math.max(l.start,b.start));
                for(const covered of coverage) expect(covered).toBeCloseTo(20);
                expect(b.visible).toBeCloseTo(145-coverage.length*20);
            }
        });
    }
    it('supports one bottom between two end locks',()=>{
        const r=calculate({...base,width:295,lid:95,start:'lid',end:'lid'});
        expect(r.count).toBe(1);expect(r.lidCount).toBe(2);expect(r.gap).toBeNull();expect(r.pitch).toBeCloseTo(200);expect(r.boards[0].visible).toBeCloseTo(105);
    });
    it('supports a corner on the bottom end of a mixed span',()=>{
        const r=calculate({...base,width:675,lid:95,end:'lid',left:{...off,enabled:true}});
        expect(r.boards[0].start).toBe(55);expect(r.boards.filter(b=>b.kind==='lid').at(-1)!.end).toBeCloseTo(675);
    });
    it('rejects a corner on a lock end',()=>{
        expect(()=>calculate({...base,start:'lid',left:{...off,enabled:true}})).toThrow('Knutbräda kräver');
    });
    it('respects a manually chosen count for lock-to-lock',()=>{
        expect(calculate({...base,width:695,lid:95,start:'lid',end:'lid',count:3}).count).toBe(3);
        expect(()=>calculate({...base,width:695,lid:95,start:'lid',end:'lid',count:2})).toThrow();
    });
});
