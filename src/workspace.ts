import {isOpeningDraft,type OpeningDraft,type FacadeMode} from './facade';
export type Form = {
    width: string;
    bottom: string;
    lid: string;
    overlap: string;
    leftCover: string;
    leftOverlap: string;
    rightCover: string;
    rightOverlap: string;
    count: string;
    left: boolean;
    right: boolean;
    manual: boolean;
    rangeStart: string;
    rangeEnd: string;
    openingView: 'range'|'facade';
    wallHeight: string;
    facadeMode: FacadeMode;
    openings: OpeningDraft[];
    start: 'bottom' | 'lid';
    end: 'bottom' | 'lid';
};
export const initial: Form = { rangeStart:'wall-start',rangeEnd:'wall-end',openingView:'range', wallHeight: '3000', facadeMode: 'continuous', openings: [], start: 'bottom', end: 'bottom', width: '3000', bottom: '145', lid: '95', overlap: '20', leftCover: '95', leftOverlap: '40', rightCover: '95', rightOverlap: '40', count: '16', left: false, right: false, manual: false };
export const sample: Form = { ...initial, width: '13600', left: true, right: true };
const KEY = 'panel-kalkylator:v1';
export type Alternative = {
    id: string;
    name: string;
    form: Form;
};
export type Workspace = {
    alternatives: Alternative[];
    activeId: string;
};
export function isForm(value: unknown): value is Form {
    if (!value || typeof value !== 'object')
        return false;
    const f = value as Record<string, unknown>;
    return Array.isArray(f.openings) && f.openings.every(isOpeningDraft) && ['range','facade'].includes(String(f.openingView)) && ['continuous', 'segments'].includes(String(f.facadeMode)) && ['bottom', 'lid'].includes(String(f.start)) && ['bottom', 'lid'].includes(String(f.end)) && Object.keys(initial).every(k => typeof f[k] === typeof initial[k as keyof Form]);
}
export function readWorkspace(): Workspace {
    try {
        const data = JSON.parse(localStorage.getItem(KEY) || 'null');
        if ([2, 3, 4].includes(data?.version) && Array.isArray(data.alternatives)) {
            for (const a of data.alternatives)
                if (a?.form && typeof a.form === 'object') {
                    a.form.wallHeight ??= '3000';
                    a.form.facadeMode ??= 'continuous';
                    a.form.openings ??= [];
                    a.form.rangeStart ??= 'wall-start';
                    a.form.rangeEnd ??= a.form.openings[0] ? `${a.form.openings[0].id}:left` : 'wall-end';
                    a.form.openingView ??= 'range';
                }
            const seen = new Set<string>();
            const alternatives: Alternative[] = data.alternatives.filter((a: Alternative) => {
                if (!a || typeof a.id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(a.id) || seen.has(a.id) || typeof a.name !== 'string' || !isForm(a.form))
                    return false;
                seen.add(a.id);
                return true;
            });
            if (alternatives.length) {
                const activeId=alternatives.some(a=>a.id===data.activeId)?data.activeId:alternatives[0].id;
                const source=alternatives.find(a=>a.id===activeId)!;
                // Keep distinct opening IDs from older alternatives; active geometry wins for copied IDs.
                const merged = new Map<string,OpeningDraft>();
                for(const a of [source,...alternatives])for(const o of a.form.openings)if(!merged.has(o.id))merged.set(o.id,o);
                const openings=[...merged.values()];
                return {alternatives:alternatives.map(a=>({...a,form:{...a.form,openings:structuredClone(openings),wallHeight:source.form.wallHeight,rangeEnd:data.version<4&&openings.length&&a.form.rangeStart==='wall-start'&&a.form.rangeEnd==='wall-end'?`${openings[0].id}:left`:a.form.rangeEnd}})),activeId};
            }
        }
        if (data?.version === 1 && data.form) {
            const form = { rangeStart:'wall-start',rangeEnd:'wall-end',openingView:'range', wallHeight: '3000', facadeMode: 'continuous', openings: [], ...data.form, start: data.form.start ?? 'bottom', end: data.form.end ?? 'bottom' };
            if (isForm(form))
                return { alternatives: [{ id: 'first', name: 'Alternativ 1', form }], activeId: 'first' };
        }
    }
    catch { /* Storage is optional. */ }
    return { alternatives: [{ id: 'first', name: 'Alternativ 1', form: structuredClone(initial) }], activeId: 'first' };
}
