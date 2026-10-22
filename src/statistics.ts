import type { Task } from './store';
import { validSchedule } from './timing';

export type TaskSnapshot = Pick<Task,'id'|'title'|'description'|'createdAt'|'completed'|'completedAt'|'schedule'>;
export type HistoryKind = 'baseline'|'created'|'updated'|'completed'|'reopened'|'deleted'|'restored';
export type TaskHistoryEvent = {id:string;taskId:string;at:string;kind:HistoryKind;task:TaskSnapshot};
export type DailyRow = {task:TaskSnapshot;status:'Completed'|'Unscheduled'|'Scheduled'|'In progress'|'Overdue'|'Deleted';deleted:boolean;counted:boolean;elapsedMs:number|null};

export function snapshotTask(task:Task):TaskSnapshot {
 return {id:task.id,title:task.title,description:task.description,createdAt:task.createdAt,completed:task.completed,completedAt:task.completedAt,schedule:task.schedule?{...task.schedule}:undefined};
}
export function historyChanges(previous:Task[],next:Task[],history:TaskHistoryEvent[],at=new Date().toISOString()):TaskHistoryEvent[]{
 const before=new Map(previous.map(t=>[t.id,t])),after=new Set(next.map(t=>t.id));const changes:TaskHistoryEvent[]=[];
 const append=(task:Task,kind:HistoryKind)=>changes.push({id:crypto.randomUUID(),taskId:task.id,at,kind,task:snapshotTask(task)});
 for(const task of next){const old=before.get(task.id);if(!old){const known=history.some(e=>e.taskId===task.id);append(task,known?'restored':'created');}else if(JSON.stringify(snapshotTask(task))!==JSON.stringify(snapshotTask(old))){append(task,task.completed!==old.completed?(task.completed?'completed':'reopened'):'updated');}}
 for(const task of previous)if(!after.has(task.id))append(task,'deleted');
 return changes;
}
export function readHistory(value:unknown):TaskHistoryEvent[]{
 if(!Array.isArray(value))return [];
 const kinds:HistoryKind[]=['baseline','created','updated','completed','reopened','deleted','restored'];const seen=new Set<string>();
 return value.filter((e:any)=>e&&typeof e.id==='string'&&!seen.has(e.id)&&typeof e.taskId==='string'&&typeof e.at==='string'&&Number.isFinite(Date.parse(e.at))&&kinds.includes(e.kind)&&e.task?.id===e.taskId&&typeof e.task.title==='string'&&typeof e.task.description==='string'&&typeof e.task.createdAt==='string'&&typeof e.task.completed==='boolean'&&!!seen.add(e.id)).map((e:TaskHistoryEvent)=>({...e,task:{...e.task,schedule:validSchedule(e.task.schedule)?e.task.schedule:undefined,completedAt:typeof e.task.completedAt==='string'&&Number.isFinite(Date.parse(e.task.completedAt))?e.task.completedAt:undefined}}));
}
const formatters=new Map<string,Intl.DateTimeFormat>();
export function dayKey(value:string|number,zone:string):string{
 const instant=typeof value==='number'?value:Date.parse(value);if(!Number.isFinite(instant))return '';
 let formatter=formatters.get(zone);if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});formatters.set(zone,formatter);}
 const parts=formatter.formatToParts(instant);return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}-${parts.find(p=>p.type==='day')!.value}`;
}
export function shiftDay(day:string,amount:number){const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
function endOfDay(day:string,zone:string){
 // Find the next local calendar date without assuming that every day is 24 hours.
 const center=Date.parse(`${day}T12:00:00Z`);let low=center-2*86400000,high=center+2*86400000;
 while(high-low>1){const middle=Math.floor((low+high)/2);if(dayKey(middle,zone)>day)high=middle;else low=middle;}
 return high-1;
}
export function dailyStatistics(history:TaskHistoryEvent[],historyStartedAt:string,day:string,zone:string,now=Date.now()){
 const available=day>=dayKey(historyStartedAt,zone)&&day<=dayKey(now,zone),cutoff=Math.min(now,endOfDay(day,zone));
 const state=new Map<string,{task:TaskSnapshot;deleted:boolean;lastAt:string}>();
 const completions=new Map<string,TaskSnapshot>();
 if(available)for(const event of [...history].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))){if(Date.parse(event.at)>cutoff)break;state.set(event.taskId,{task:event.task,deleted:event.kind==='deleted',lastAt:event.at});if(event.kind==='completed')completions.set(event.taskId,event.task);}
 const rows:DailyRow[]=[];
 for(const {task,deleted,lastAt} of state.values()){
  if(task.completed){if(!task.completedAt||dayKey(task.completedAt,zone)!==day)continue;}
  else if(deleted){if(dayKey(lastAt,zone)!==day)continue;}
  else if(task.schedule&&Date.parse(task.schedule.startAt)>cutoff&&dayKey(task.createdAt,zone)!==day)continue;
  const completion=completions.get(task.id),measured=completion&&completion.completedAt===task.completedAt?completion:task;
  const elapsed=task.completed&&measured.schedule&&measured.completedAt&&Date.parse(measured.completedAt)>=Date.parse(measured.schedule.startAt)?Date.parse(measured.completedAt)-Date.parse(measured.schedule.startAt):null;
  const status:DailyRow['status']=task.completed?'Completed':deleted?'Deleted':!task.schedule?'Unscheduled':cutoff<Date.parse(task.schedule.startAt)?'Scheduled':cutoff>=Date.parse(task.schedule.endAt)?'Overdue':'In progress';
  rows.push({task,status,deleted,counted:task.completed||!deleted,elapsedMs:elapsed});
 }
 const counted=rows.filter(r=>r.counted),completed=counted.filter(r=>r.task.completed),unfinished=counted.filter(r=>!r.task.completed),timed=completed.filter(r=>r.elapsedMs!==null);
 const totalMs=timed.reduce((sum,r)=>sum+r.elapsedMs!,0);
 const withDeadline=completed.filter(r=>{const original=completions.get(r.task.id);return !!(original&&original.completedAt===r.task.completedAt?original.schedule:r.task.schedule);});
 const onTime=withDeadline.filter(r=>{const original=completions.get(r.task.id),measured=original&&original.completedAt===r.task.completedAt?original:r.task;return Date.parse(measured.completedAt!)<=Date.parse(measured.schedule!.endAt);}).length;
 return {day,available,rows,total:counted.length,completed:completed.length,unfinished:unfinished.length,overdue:unfinished.filter(r=>r.status==='Overdue').length,inProgress:unfinished.filter(r=>r.status==='In progress').length,productivity:counted.length?Math.round(completed.length/counted.length*100):null,averageMs:timed.length?totalMs/timed.length:null,totalMs,timedCount:timed.length,onTime,deadlineCount:withDeadline.length};
}

