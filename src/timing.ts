export type TaskSchedule = {startAt:string;endAt:string;reminderMinutes:number};
export type TimedTask = {completed:boolean;completedAt?:string;schedule?:TaskSchedule;deliveredAlerts?:string[]};
export type ScheduleEvent = {key:string;kind:'start'|'reminder'|'end';at:number};
export function validZone(zone:unknown):zone is string {try {if(typeof zone!=='string')return false;new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true;}catch{return false;}}
export const defaultZone=()=>{const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;return validZone(zone)?zone:'UTC';};
export function validSchedule(value:unknown):value is TaskSchedule {
 if(!value||typeof value!=='object')return false;
 const s=value as TaskSchedule;return typeof s.startAt==='string'&&typeof s.endAt==='string'&&Number.isFinite(Date.parse(s.startAt))&&Date.parse(s.endAt)>Date.parse(s.startAt)&&[0,1,5,10,15,30].includes(s.reminderMinutes);
}
function partsAt(at:number,zone:string){return new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(at).reduce<Record<string,string>>((a,p)=>{a[p.type]=p.value;return a;},{});}
export function toDateTimeInput(iso:string,zone:string){const p=partsAt(Date.parse(iso),zone);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function fromDateTimeInput(value:string,zone:string):string {
 if(!validZone(zone)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Choose a valid date and time.');
 const [year,month,day,hour,minute]=value.split(/[-T:]/).map(Number);const naive=Date.UTC(year,month-1,day,hour,minute);const candidates=new Set<number>();
 // Sample surrounding offsets, including both sides of daylight-saving transitions.
 for(let h=-36;h<=36;h+=6){const sample=naive+h*3600000,p=partsAt(sample,zone);const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);const candidate=naive-(wall-sample);if(toDateTimeInput(new Date(candidate).toISOString(),zone)===value)candidates.add(candidate);}
 if(candidates.size===0)throw Error('That time does not exist in this timezone. Choose another time.');
 if(candidates.size>1)throw Error('That time occurs twice because the clocks change. Choose an unambiguous time, or use UTC.');
 return new Date([...candidates][0]).toISOString();
}
export function duration(ms:number){const seconds=Math.max(0,Math.floor(ms/1000));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
export function taskPhase(task:TimedTask,now:number){if(task.completed)return 'Completed';if(!task.schedule)return 'Unscheduled';if(now<Date.parse(task.schedule.startAt))return 'Scheduled';if(now>=Date.parse(task.schedule.endAt))return 'Time is up';return 'In progress';}
export function taskElapsed(task:TimedTask,now:number){if(!task.schedule)return 0;return Math.max(0,(task.completedAt?Date.parse(task.completedAt):now)-Date.parse(task.schedule.startAt));}
export function scheduleEvents(schedule:TaskSchedule):ScheduleEvent[]{const start=Date.parse(schedule.startAt),end=Date.parse(schedule.endAt),revision=`${schedule.startAt}/${schedule.endAt}/${schedule.reminderMinutes}`;const events:ScheduleEvent[]=[{key:`${revision}/start`,kind:'start',at:start},{key:`${revision}/end`,kind:'end',at:end}];const remind=end-schedule.reminderMinutes*60000;if(schedule.reminderMinutes>0&&remind>start)events.push({key:`${revision}/reminder`,kind:'reminder',at:remind});return events.sort((a,b)=>a.at-b.at);}
export function pendingEvents(task:TimedTask,now:number):ScheduleEvent[]{if(task.completed||!task.schedule)return [];return scheduleEvents(task.schedule).filter(e=>e.at<=now&&!task.deliveredAlerts?.includes(e.key));}
export function latestEvent(events:ScheduleEvent[]){return events.reduce<ScheduleEvent|undefined>((latest,event)=>!latest||event.at>latest.at?event:latest,undefined);}

