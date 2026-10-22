import { create } from 'zustand';
import { getTheme, backgroundDim, type ThemeId } from './themes';
import { arrangeCards } from './arrange';
import { readAttachments, readNotes, noteColors, type Attachment, type StickyNote } from './board';
import { defaultZone, validSchedule, validZone, type TaskSchedule } from './timing';
import { historyChanges, readHistory, snapshotTask, type TaskHistoryEvent } from './statistics';
export type Task = {id:string;title:string;description:string;completed:boolean;completedAt?:string;createdAt:string;updatedAt:string;schedule?:TaskSchedule;deliveredAlerts?:string[];attachments?:Attachment[]};
export type CardHandle = 'left'|'right';
export type Connection = {id:string;sourceTaskId:string;targetTaskId:string;sourceHandle?:CardHandle;targetHandle?:CardHandle};
type Position = {x:number;y:number};
type Prefs = {theme:ThemeId;backgroundDim:number;view:'list'|'canvas'|'notes';filter:'all'|'active'|'completed';timeZone:string;viewport:{x:number;y:number;zoom:number}};
type Data = {schemaVersion:1;tasks:Task[];notes:StickyNote[];positions:Record<string,Position>;connections:Connection[];preferences:Prefs;historyStartedAt:string;history:TaskHistoryEvent[]};
type Undo = {token:string;task:Task;index:number;position?:Position;connections:Connection[]};
export const KEY='taskspace-workspace-v1';
export const empty = ():Data => ({schemaVersion:1,tasks:[],notes:[],positions:{},connections:[],historyStartedAt:new Date().toISOString(),history:[],preferences:{theme:'cinematic',backgroundDim:0,view:'list',filter:'all',timeZone:defaultZone(),viewport:{x:0,y:0,zoom:1}}});
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
export function parseSaved(raw:string):Data {
 const x=JSON.parse(raw); if(x?.schemaVersion!==1||!Array.isArray(x.tasks)||!Array.isArray(x.connections)) throw Error('Unsupported data');
 const ids=new Set<string>(); const tasks:Task[]=x.tasks.filter((t:any)=>t&&typeof t.id==='string'&&!ids.has(t.id)&&typeof t.title==='string'&&t.title.trim()&&typeof t.description==='string'&&typeof t.completed==='boolean'&&typeof t.createdAt==='string'&&typeof t.updatedAt==='string'&&!!ids.add(t.id)).map((t:Task)=>({...t,schedule:validSchedule(t.schedule)?t.schedule:undefined,completedAt:t.completed&&typeof t.completedAt==='string'&&Number.isFinite(Date.parse(t.completedAt))?t.completedAt:undefined,deliveredAlerts:Array.isArray(t.deliveredAlerts)?t.deliveredAlerts.filter(k=>typeof k==='string').slice(-10):[]}));
 const pairs=new Set<string>(); const connections:Connection[]=x.connections.filter((c:any)=>{if(!c||typeof c.id!=='string'||!ids.has(c.sourceTaskId)||!ids.has(c.targetTaskId)||c.sourceTaskId===c.targetTaskId)return false; const k=[c.sourceTaskId,c.targetTaskId].sort().join(':');if(pairs.has(k))return false;pairs.add(k);return true;}).map((c:Connection)=>({...c,sourceHandle:c.sourceHandle==='left'?'left':'right',targetHandle:c.targetHandle==='right'?'right':'left'}));
 const positions:Record<string,Position>={};tasks.forEach((t,i)=>{const p=x.positions?.[t.id];positions[t.id]=finite(p?.x)&&finite(p?.y)?{x:p.x,y:p.y}:{x:(i%3)*300,y:Math.floor(i/3)*200};});
 const preferences=empty().preferences; if(['list','canvas'].includes(x.preferences?.view))preferences.view=x.preferences.view;if(['all','active','completed'].includes(x.preferences?.filter))preferences.filter=x.preferences.filter;
 preferences.theme=getTheme(x.preferences?.theme).id;preferences.backgroundDim=backgroundDim(x.preferences?.backgroundDim,getTheme(preferences.theme).dim);
 if(validZone(x.preferences?.timeZone))preferences.timeZone=x.preferences.timeZone;
 const v=x.preferences?.viewport;if(finite(v?.x)&&finite(v?.y)&&finite(v?.zoom)&&v.zoom>=.2&&v.zoom<=2)preferences.viewport=v;
 const observedAt=new Date().toISOString(),history=readHistory(x.history);
 for(const task of tasks)if(!history.some(e=>e.taskId===task.id))history.push({id:crypto.randomUUID(),taskId:task.id,at:observedAt,kind:'baseline',task:snapshotTask(task)});
 const historyStartedAt=Array.isArray(x.history)&&typeof x.historyStartedAt==='string'&&Number.isFinite(Date.parse(x.historyStartedAt))?x.historyStartedAt:observedAt;
 tasks.forEach(t=>t.attachments=readAttachments(t.attachments));
 if(x.preferences?.view==='notes')preferences.view='notes';
 return {schemaVersion:1,tasks,notes:readNotes(x.notes),connections,positions,preferences,history,historyStartedAt};
}
let initial=empty(), initialError='';
try{const raw=localStorage.getItem(KEY);if(raw)initial=parseSaved(raw);}catch{initialError='Saved workspace could not be loaded. You can start a new list.';}
type Store=Data & {undo:Undo|null;notice:string;storageError:string;add:(title:string,position?:Position)=>void;edit:(id:string,title:string,description:string)=>void;scheduleTask:(id:string,schedule?:TaskSchedule)=>void;markDelivered:(id:string,keys:string[])=>void;toggle:(id:string)=>void;remove:(id:string)=>void;restore:(token:string)=>void;clearUndo:(token:string)=>void;move:(id:string,p:Position)=>void;connect:(a:string,b:string,sourceHandle?:CardHandle,targetHandle?:CardHandle)=>void;disconnect:(id:string)=>void;setPrefs:(p:Partial<Prefs>)=>void;notify:(s:string)=>void;smartArrange:(ids:string[],heights?:Record<string,number>)=>void;addNote:()=>string;updateNote:(id:string,patch:Partial<Pick<StickyNote,'title'|'html'|'color'|'checklist'>>)=>void;removeNote:(id:string)=>void;attach:(kind:'task'|'note',id:string,file:Attachment)=>boolean;detach:(kind:'task'|'note',id:string,fileId:string)=>void};
export const useStore=create<Store>((set,get)=>({...initial,undo:null,notice:initialError,storageError:'',
 smartArrange:(ids,heights)=>{const s=get(),visible=s.tasks.filter(t=>ids.includes(t.id)),layout=arrangeCards(visible,heights),connections=[...s.connections];layout.ordered.forEach((task,i)=>{const next=layout.ordered[i+1];if(!next||connections.some(c=>(c.sourceTaskId===task.id&&c.targetTaskId===next.id)||(c.sourceTaskId===next.id&&c.targetTaskId===task.id)))return;const forward=Math.floor(i/3)%2===0;connections.push({id:crypto.randomUUID(),sourceTaskId:task.id,targetTaskId:next.id,sourceHandle:forward?'right':'left',targetHandle:Math.floor((i+1)/3)%2===0?'left':'right'});});set({positions:{...s.positions,...layout.positions},connections,notice:'Cards arranged. Your existing connections are kept.'});},
 addNote:()=>{const id=crypto.randomUUID(),now=new Date().toISOString();set(s=>({notes:[...s.notes,{id,title:'',html:'',color:noteColors[s.notes.length%noteColors.length],checklist:[],attachments:[],createdAt:now,updatedAt:now}]}));return id;},
 updateNote:(id,patch)=>set(s=>({notes:s.notes.map(n=>n.id===id?{...n,...patch,updatedAt:new Date().toISOString()}:n)})),
 removeNote:id=>set(s=>({notes:s.notes.filter(n=>n.id!==id)})),
 attach:(kind,id,file)=>{const key=kind==='task'?'tasks':'notes',items=get()[key];if(!items.some(t=>t.id===id))return false;if(kind==='task')set(s=>({tasks:s.tasks.map(t=>t.id===id?{...t,attachments:[...(t.attachments??[]),file]}:t)}));else set(s=>({notes:s.notes.map(n=>n.id===id?{...n,attachments:[...n.attachments,file]}:n)}));return true;},
 detach:(kind,id,fileId)=>{if(kind==='task')set(s=>({tasks:s.tasks.map(t=>t.id===id?{...t,attachments:(t.attachments??[]).filter(f=>f.id!==fileId)}:t)}));else set(s=>({notes:s.notes.map(n=>n.id===id?{...n,attachments:n.attachments.filter(f=>f.id!==fileId)}:n)}));},
 add:(title,position)=>{title=title.trim();if(!title)return;const s=get(),id=crypto.randomUUID(),now=new Date().toISOString();let p=position??{x:40,y:40};let n=0;while(Object.values(s.positions).some(q=>Math.abs(q.x-p.x)<280&&Math.abs(q.y-p.y)<170)&&n++<1000)p={x:p.x+35,y:p.y+190};set({tasks:[...s.tasks,{id,title,description:'',completed:false,createdAt:now,updatedAt:now}],positions:{...s.positions,[id]:p},notice:'Task added'});},
 edit:(id,title,description)=>{if(!title.trim())return;set(s=>({tasks:s.tasks.map(t=>t.id===id?{...t,title:title.trim(),description:description.trim(),updatedAt:new Date().toISOString()}:t)}));},
 scheduleTask:(id,schedule)=>{if(schedule&&!validSchedule(schedule))return;set(s=>({tasks:s.tasks.map(t=>{if(t.id!==id)return t;const changed=JSON.stringify(t.schedule)!==JSON.stringify(schedule);return {...t,schedule,deliveredAlerts:changed?[]:t.deliveredAlerts,updatedAt:new Date().toISOString()};})}));},
 markDelivered:(id,keys)=>set(s=>({tasks:s.tasks.map(t=>t.id===id?{...t,deliveredAlerts:[...new Set([...(t.deliveredAlerts??[]),...keys])].slice(-10)}:t)})),
 toggle:id=>set(s=>({tasks:s.tasks.map(t=>t.id===id?{...t,completed:!t.completed,completedAt:t.completed?undefined:new Date().toISOString(),updatedAt:new Date().toISOString()}:t)})),
 remove:id=>{const s=get(),index=s.tasks.findIndex(t=>t.id===id);if(index<0)return;const positions={...s.positions};delete positions[id];set({undo:{token:crypto.randomUUID(),task:s.tasks[index],index,position:s.positions[id],connections:s.connections.filter(c=>c.sourceTaskId===id||c.targetTaskId===id)},tasks:s.tasks.filter(t=>t.id!==id),positions,connections:s.connections.filter(c=>c.sourceTaskId!==id&&c.targetTaskId!==id),notice:'Task deleted'});},
 restore:token=>{const s=get(),u=s.undo;if(!u||u.token!==token)return;const tasks=[...s.tasks];tasks.splice(u.index,0,u.task);const ids=new Set(tasks.map(t=>t.id));set({tasks,positions:{...s.positions,[u.task.id]:u.position??{x:40,y:40}},connections:[...s.connections,...u.connections.filter(c=>ids.has(c.sourceTaskId)&&ids.has(c.targetTaskId))],undo:null,notice:'Task restored'});},
 clearUndo:token=>{if(get().undo?.token===token)set({undo:null});},
 move:(id,p)=>{if(get().tasks.some(t=>t.id===id))set(s=>({positions:{...s.positions,[id]:p}}));},
 connect:(a,b,sourceHandle='right',targetHandle='left')=>{const s=get();if(!['left','right'].includes(sourceHandle)||!['left','right'].includes(targetHandle))return;if(a===b||!s.tasks.some(t=>t.id===a)||!s.tasks.some(t=>t.id===b)||s.connections.some(c=>(c.sourceTaskId===a&&c.targetTaskId===b)||(c.sourceTaskId===b&&c.targetTaskId===a)))return;set({connections:[...s.connections,{id:crypto.randomUUID(),sourceTaskId:a,targetTaskId:b,sourceHandle,targetHandle}]});},
 disconnect:id=>set(s=>({connections:s.connections.filter(c=>c.id!==id)})),
 setPrefs:p=>set(s=>({preferences:{...s.preferences,...p}})),notify:notice=>set({notice})
}));
useStore.subscribe((state,previous)=>{
 if(state.tasks===previous.tasks||state.history!==previous.history)return;
 const events=historyChanges(previous.tasks,state.tasks,state.history);
 if(events.length)useStore.setState({history:[...state.history,...events]});
});
function saveWorkspace(){
 try{const current=useStore.getState();localStorage.setItem(KEY,JSON.stringify({schemaVersion:1,tasks:current.tasks,notes:current.notes,positions:current.positions,connections:current.connections,preferences:current.preferences,history:current.history,historyStartedAt:current.historyStartedAt}));if(current.storageError)useStore.setState({storageError:''});}catch{useStore.setState({storageError:'Changes could not be saved in this browser.'});}
}
useStore.subscribe((s,previous)=>{
 if(s.tasks===previous.tasks&&s.notes===previous.notes&&s.positions===previous.positions&&s.connections===previous.connections&&s.preferences===previous.preferences&&s.history===previous.history&&s.historyStartedAt===previous.historyStartedAt)return;
 saveWorkspace();
});
// Save imported snapshots immediately so their observation date survives a reload.
saveWorkspace();

// Listen to the shared action, so either view and the deadline's Complete button
// produce one completion sound. Loading or restoring completed tasks stays quiet.
export function onTaskCompleted(listener:(id:string)=>void){
 return useStore.subscribe((state,previous)=>{
  if(state.tasks===previous.tasks)return;
  const wasComplete=new Map(previous.tasks.map(task=>[task.id,task.completed]));
  for(const task of state.tasks)if(task.completed&&wasComplete.get(task.id)===false)listener(task.id);
 });
}

