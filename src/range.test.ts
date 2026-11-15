import {describe,it,expect} from 'vitest';
import {resolveRange,measurePoints} from './range';
import type {OpeningDraft} from './facade';
const w:OpeningDraft={id:'w',name:'Fönster 1',kind:'window',x:'1000',y:'800',width:'800',height:'1200',flashing:true,left:'150',right:'200'};
describe('free spans at openings',()=>{
 it('resolves wall to hole, hole to wall and hole to hole',()=>{
  expect(resolveRange(5000,[w],'wall-start','w:left').width).toBe(1000);
  const after=resolveRange(5000,[w],'w:right','wall-end');expect(after.start.x).toBe(1800);expect(after.width).toBe(3200);
  expect(resolveRange(5000,[w,{...w,id:'w2',x:'3000'}],'w:right','w2:left').width).toBe(1200);
 });
 it('uses independent flashing edges without enforcing a shared module',()=>{
  expect(measurePoints(5000,[w]).find(p=>p.id==='w:plate-left')!.x).toBe(850);
  expect(resolveRange(5000,[w],'wall-start','w:plate-left').width).toBe(850);
  expect(resolveRange(5000,[w],'w:plate-right','wall-end').start.x).toBe(2000);
 });
 it('rejects reversed ranges, stale points, invalid values and passing through holes',()=>{
  for(const [a,b] of [['w:right','w:left'],['missing','wall-end'],['wall-start','wall-end']])expect(()=>resolveRange(5000,[w],a,b)).toThrow();
  expect(()=>resolveRange(5000,[{...w,x:''}],'wall-start','w:left')).toThrow();
  expect(()=>resolveRange(5000,[{...w,left:'2000'}],'w:plate-left','w:left')).toThrow('utanför');
 });
});

describe('openings extending beyond a wall section',()=>{
 it('ends at the near edge of a window continuing beyond the right boundary',()=>{
  expect(resolveRange(1200,[{...w,x:'1000',width:'800'}],'wall-start','w:left').width).toBe(1000);
  expect(resolveRange(1000,[w],'wall-start','w:left').width).toBe(1000);
 });
 it('starts after a window beginning outside the left boundary',()=>{
  const r=resolveRange(1200,[{...w,x:'-300',width:'800'}],'w:right','wall-end');
  expect(r.start.x).toBe(500);expect(r.width).toBe(700);
 });
 it('retains invalid point and hole-crossing checks',()=>{
  expect(()=>resolveRange(1200,[w],'w:right','wall-end')).toThrow();
  expect(()=>resolveRange(1200,[w],'wall-start','wall-end')).toThrow('passerar');
  expect(()=>resolveRange(1200,[{...w,x:'-300'}],'w:left','wall-end')).toThrow('utanför');
 });
});
