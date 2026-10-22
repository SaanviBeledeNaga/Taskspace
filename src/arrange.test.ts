import { describe, expect, it } from 'vitest';
import { arrangeCards } from './arrange';
describe('Smart Arrange',()=>{
 it('orders scheduled cards by instant, then untimed cards by creation',()=>{
  const tasks=[{id:'late',createdAt:'2026-01-01',schedule:{startAt:'2026-10-22T12:00:00Z'}},{id:'new',createdAt:'2026-10-21'},{id:'early',createdAt:'2026-01-02',schedule:{startAt:'2026-10-22T15:00:00+05:30'}},{id:'old',createdAt:'2026-10-20'}];
  expect(arrangeCards(tasks).ordered.map(t=>t.id)).toEqual(['early','late','old','new']);expect(tasks[0].id).toBe('late');
 });
 it('keeps creation ties stable and leaves enough room for tall cards',()=>{
  const tasks=['a','b','c','d','e','f','g'].map(id=>({id,createdAt:'2026-01-01'}));
  const layout=arrangeCards(tasks,{a:600});expect(layout.ordered[0].id).toBe('a');expect(layout.positions.d.y).toBe(748);expect(layout.positions.d.x).toBeGreaterThan(layout.positions.f.x);expect(layout.positions.g.y).toBeGreaterThan(layout.positions.d.y);
 });
});
