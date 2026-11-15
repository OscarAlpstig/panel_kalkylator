import {describe,it,expect} from 'vitest';
import {calculate} from './geometry';
import {alignmentReferences} from './alignment';
import type {OpeningDraft} from './facade';
const off={enabled:false,cover:0,overlap:0};
const opening:OpeningDraft={id:'w',name:'Fönster',kind:'window',x:'1220',y:'800',width:'800',height:'1000',flashing:true,left:'200',right:'200'};
const input={width:1220,bottom:145,lid:95,overlap:20,left:off,right:off,start:'bottom' as const,end:'lid' as const};
describe('lock alignment readout',()=>{
 it('finds actual lock edges at the plate and opening boundary',()=>{
  const refs=alignmentReferences(calculate(input),0,[opening]);
  expect(refs).toHaveLength(2);expect(refs.map(r=>r.x)).toEqual([1220,1020]);
  for(const r of refs){expect(r.edge).toBe('end');expect(r.delta).toBeCloseTo(0)}
 });
 it('reports a real offset when the range ends on a bottom board',()=>{
  const refs=alignmentReferences(calculate({...input,end:'bottom'}),0,[opening]);expect(refs.every(r=>Math.abs(r.delta!)>1)).toBe(true);
 });
 it('subtracts the selected range origin for right-hand edges',()=>{
  const r=alignmentReferences(calculate({...input,start:'lid',end:'bottom'}),1800,[{...opening,x:'1000',width:'800'}]);
  expect(r.find(p=>p.id==='w:right')!.x).toBe(0);expect(r.find(p=>p.id==='w:right')!.edge).toBe('start');expect(r.find(p=>p.id==='w:right')!.delta).toBeCloseTo(0);
 });
 it('handles spans with no lock boards',()=>{
  const refs=alignmentReferences(calculate({...input,width:145,end:'bottom'}),0,[{...opening,x:'145',flashing:false}]);expect(refs[0].board).toBeNull();expect(refs[0].delta).toBeNull();
 });
});
