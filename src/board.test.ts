import { describe, expect, it, vi } from 'vitest';
import { readNotes, readAttachments } from './board';
import { fileMetadata, MAX_FILE_BYTES } from './files';
vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
const { useStore, empty, parseSaved }=await import('./store');
describe('notes, attachments and graph persistence',()=>{
 it('migrates older workspaces and validates note metadata',()=>{
  expect(parseSaved(JSON.stringify({...empty(),notes:undefined})).notes).toEqual([]);
  const note={id:'one',title:'Ideas',html:'<b>Write</b>',checklist:[{id:'i',text:'Demo',done:true}],color:'bad',attachments:[{id:'f',name:'Demo.pdf',type:'application/pdf',size:20}]};
  const notes=readNotes([note,note,{title:'broken'}]);expect(notes).toHaveLength(1);expect(notes[0].color).toBe('#f4e3ad');expect(notes[0].checklist[0].done).toBe(true);expect(readAttachments([{id:'bad'},null])).toEqual([]);
 });
 it('saves rich notes and files across reload without changing task statistics',()=>{
  useStore.setState({...empty(),undo:null});const s=useStore.getState(),id=s.addNote();s.updateNote(id,{title:'Idea',html:'<b>Bold</b>',checklist:[{id:'i',text:'Review',done:false}]});expect(s.attach('note',id,{id:'f',name:'a.pdf',type:'application/pdf',size:10})).toBe(true);s.setPrefs({view:'notes'});
  const loaded=parseSaved(JSON.stringify(useStore.getState()));expect(loaded.notes[0].html).toBe('<b>Bold</b>');expect(loaded.notes[0].attachments[0].id).toBe('f');expect(loaded.preferences.view).toBe('notes');expect(loaded.history).toEqual([]);s.removeNote(id);expect(useStore.getState().notes).toEqual([]);
 });
 it('retains task attachments through deletion and undo, and rejects deleted owners',()=>{
  useStore.setState({...empty(),undo:null});const s=useStore.getState();s.add('File task');const id=useStore.getState().tasks[0].id;s.attach('task',id,{id:'file',name:'slides.pptx',type:'application/octet-stream',size:12});s.remove(id);expect(s.attach('task',id,{id:'missing',name:'x',type:'',size:0})).toBe(false);s.restore(useStore.getState().undo!.token);expect(parseSaved(JSON.stringify(useStore.getState())).tasks[0].attachments?.[0].id).toBe('file');s.detach('task',id,'file');expect(useStore.getState().tasks[0].attachments).toEqual([]);
 });
 it('changes no layout until explicitly invoked and preserves manual and hidden links',()=>{
  useStore.setState({...empty(),undo:null});const s=useStore.getState();s.add('A',{x:4,y:5});s.add('B',{x:7,y:8});s.add('Hidden');const [a,b,c]=useStore.getState().tasks;s.connect(a.id,c.id);s.setPrefs({view:'canvas'});expect(useStore.getState().positions[a.id]).toEqual({x:4,y:5});s.smartArrange([a.id,b.id]);expect(useStore.getState().connections).toHaveLength(2);s.smartArrange([a.id,b.id]);expect(useStore.getState().connections).toHaveLength(2);expect(useStore.getState().connections.some(e=>e.targetTaskId===c.id)).toBe(true);
 });
 it('rejects files over 20 MB before attempting storage',()=>{
  expect(()=>fileMetadata({size:MAX_FILE_BYTES+1,name:'large.pdf'} as File)).toThrow('20 MB');const meta=fileMetadata({size:1024,name:'sheet.xlsx',type:''} as File);expect(meta.type).toBe('application/octet-stream');expect(meta.name).toBe('sheet.xlsx');
 });
});
