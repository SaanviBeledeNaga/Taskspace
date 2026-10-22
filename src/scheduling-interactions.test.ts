import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
const {useStore,empty}=await import('./store');
beforeEach(()=>useStore.setState({...empty(),undo:null,notice:'',storageError:''}));
describe('workspace interactions with scheduled tasks',()=>{
 it.each(['upcoming','running','overdue'] as const)('keeps task and note actions available when a task is %s',phase=>{
  const s=useStore.getState(),now=Date.now(),start=phase==='upcoming'?now+60000:now-60000,end=phase==='overdue'?now-1000:now+120000;
  s.add('Scheduled');s.add('Other');const [scheduled,other]=useStore.getState().tasks;
  s.scheduleTask(scheduled.id,{startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString(),reminderMinutes:0});
  s.markDelivered(scheduled.id,['start']);
  s.edit(other.id,'Edited other task','Still editable');s.remove(other.id);
  expect(useStore.getState().tasks.map(t=>t.id)).toEqual([scheduled.id]);
  s.restore(useStore.getState().undo!.token);expect(useStore.getState().tasks[1].title).toBe('Edited other task');
  const id=s.addNote();s.updateNote(id,{title:'Editable note',html:'<b>Details</b>',checklist:[{id:'check',text:'Done',done:true}]});
  expect(useStore.getState().notes[0].checklist[0].done).toBe(true);
  s.removeNote(id);expect(useStore.getState().notes).toEqual([]);
  s.remove(scheduled.id);expect(useStore.getState().tasks.some(t=>t.id===scheduled.id)).toBe(false);
 });
});
