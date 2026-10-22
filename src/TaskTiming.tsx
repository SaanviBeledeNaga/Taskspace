import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlarmClock, Bell, Clock3, Volume2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './components/ui/dialog';
import { onTaskCompleted, useStore, type Task } from './store';
import { loopDeadlineAlarm, TaskSounds } from './sounds';
import { switchContext } from './transitions';
import Presence from './Presence';
import { duration, fromDateTimeInput, latestEvent, pendingEvents, taskElapsed, taskPhase, toDateTimeInput, type TaskSchedule } from './timing';

const TimeContext=createContext(Date.now());
export const useCurrentTime=()=>useContext(TimeContext);
export function TimeProvider({children}:{children:ReactNode}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const tick=()=>setNow(Date.now());const id=setInterval(tick,1000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(id);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};},[]);
 return <TimeContext.Provider value={now}>{children}</TimeContext.Provider>;
}
function timezoneList(){
 const intl=Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]};
 const fallback=['Asia/Kolkata','UTC','Europe/London','Europe/Paris','Asia/Dubai','Asia/Singapore','Asia/Tokyo','Australia/Sydney','America/New_York','America/Los_Angeles'];
 try{return [...new Set(['UTC',...fallback,...(intl.supportedValuesOf?.('timeZone')??[])])].sort();}catch{return fallback;}
}
const zones=timezoneList();
export function HeaderClock(){
 const now=useContext(TimeContext),zone=useStore(s=>s.preferences.timeZone);
 const time=useMemo(()=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}),[zone]);
 const date=useMemo(()=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'numeric',month:'short',weekday:'short'}),[zone]);
 return <div className="header-clock"><time dateTime={new Date(now).toISOString()} aria-label={`Current time in ${zone}`}>{time.format(now)}</time><div className="clock-caption"><span>{date.format(now)}</span><label><span className="sr-only">Clock and task timezone</span><select value={zone} onChange={e=>{const timeZone=e.target.value;switchContext(()=>useStore.getState().setPrefs({timeZone}));}}>{[...new Set([zone,...zones])].map(z=><option key={z} value={z}>{z.replaceAll('_',' ')}</option>)}</select></label></div></div>;
}
function ScheduleForm({task,zone,onClose}:{task:Task;zone:string;onClose:()=>void}){
 const [start,setStart]=useState(()=>toDateTimeInput(task.schedule?.startAt??new Date(Math.ceil(Date.now()/60000)*60000).toISOString(),zone));
 const [end,setEnd]=useState(()=>toDateTimeInput(task.schedule?.endAt??new Date(Math.ceil(Date.now()/60000)*60000+30*60000).toISOString(),zone));
 const [reminder,setReminder]=useState(task.schedule?.reminderMinutes??5),[error,setError]=useState('');
 let estimate='';try {const ms=Date.parse(fromDateTimeInput(end,zone))-Date.parse(fromDateTimeInput(start,zone));if(ms>0)estimate=duration(ms);}catch{/* Validation runs on submit. */}
 return <><DialogTitle className="dialog-title">Make time for this task</DialogTitle><DialogDescription className="dialog-description">{task.title}<br/>Dates and times use {zone.replaceAll('_',' ')}. Changing the clock timezone changes the display, not the scheduled moment.</DialogDescription><form onSubmit={e=>{e.preventDefault();try{const schedule:TaskSchedule={startAt:fromDateTimeInput(start,zone),endAt:fromDateTimeInput(end,zone),reminderMinutes:reminder};if(Date.parse(schedule.endAt)<=Date.parse(schedule.startAt))throw Error('End time must be after the start time. Use the next date for an overnight task.');if(!task.completed&&Date.parse(schedule.endAt)<=Date.now())throw Error('Choose an end time in the future.');useStore.getState().scheduleTask(task.id,schedule);onClose();}catch(err){setError(err instanceof Error?err.message:'Check your dates and times.');}}}>
 <label htmlFor={`start-${task.id}`}>Start date and time</label><input type="datetime-local" required id={`start-${task.id}`} value={start} onChange={e=>{setStart(e.target.value);setError('');}}/>
 <label htmlFor={`end-${task.id}`}>End date and time</label><input type="datetime-local" required id={`end-${task.id}`} value={end} onChange={e=>{setEnd(e.target.value);setError('');}}/>
 {estimate&&<p className="duration-preview">Allocated time <strong>{estimate}</strong></p>}
 <label htmlFor={`reminder-${task.id}`}>Deadline reminder</label><select className="schedule-select" id={`reminder-${task.id}`} value={reminder} onChange={e=>setReminder(Number(e.target.value))}>{[0,1,5,10,15,30].map(m=><option key={m} value={m}>{m?`${m} minute${m===1?'':'s'} before the end`:'No early reminder'}</option>)}</select>
 <p className="schedule-note">The session starts automatically. A reminder fires only if its time falls after the start. The end alarm leaves completion up to you. Keep Taskspace open for alerts.</p>
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="dialog-actions">{task.schedule&&<button type="button" className="text-button danger" onClick={()=>{useStore.getState().scheduleTask(task.id);onClose();}}>Remove schedule</button>}<button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="save-button liquid-glass" type="submit">Save schedule</button></div></form></>;
}
const ScheduleEditorContext=createContext<((id:string)=>void)|null>(null);
// One stable schedule editor serves both task views. Clock ticks update only
// the countdown below, never modal ownership or its focus/pointer locks.
export function ScheduleEditorProvider({children}:{children:ReactNode}){
 const [taskId,setTaskId]=useState<string|null>(null);
 const task=useStore(s=>s.tasks.find(t=>t.id===taskId)),zone=useStore(s=>s.preferences.timeZone);
 return <ScheduleEditorContext.Provider value={setTaskId}>{children}<Dialog open={!!task} onOpenChange={open=>{if(!open)setTaskId(null);}}>{task&&<DialogContent><ScheduleForm key={task.id} task={task} zone={zone} onClose={()=>setTaskId(null)}/></DialogContent>}</Dialog></ScheduleEditorContext.Provider>;
}
function TaskCountdown({task}:{task:Task}){
 const now=useCurrentTime(),s=task.schedule!;
 const phase=taskPhase(task,now),start=Date.parse(s.startAt),end=Date.parse(s.endAt),elapsed=taskElapsed(task,now),progress=Math.min(100,elapsed/(end-start)*100);
 return <><div className={`timing-phase ${phase==='Time is up'?'overdue':''}`}><span>{phase}</span><span>Allocated {duration(end-start)}</span></div><div className="timing-counters">{task.completed?<span>Time taken <strong>{duration(elapsed)}</strong></span>:now<start?<span>Starts in <strong>{duration(start-now)}</strong></span>:now<end?<><span>Elapsed <strong>{duration(elapsed)}</strong></span><span>Left <strong>{duration(end-now)}</strong></span></>:<><span>Elapsed <strong>{duration(elapsed)}</strong></span><span>Overdue <strong>{duration(now-end)}</strong></span></>}</div><div className="time-progress" role="progressbar" aria-label={`Allocated session time for ${task.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width:`${progress}%`}}/></div></>;
}
export function TaskTiming({task}:{task:Task}){
 const zone=useStore(s=>s.preferences.timeZone),openEditor=useContext(ScheduleEditorContext),s=task.schedule;
 const timeFormat=useMemo(()=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),[zone]);
 return <div className="task-timing nodrag nopan"><button className="schedule-trigger" onClick={()=>openEditor?.(task.id)} aria-label={`${s?'Edit schedule':'Set start and end time'} for ${task.title}`}><Clock3 size={12}/>{s?`${timeFormat.format(Date.parse(s.startAt))} – ${timeFormat.format(Date.parse(s.endAt))}`:'Set start & end time'}</button>{s&&<TaskCountdown task={task}/>}</div>;
}

type AlertItem={id:string;key:string;kind:'start'|'reminder'|'end';message:string};
export function TaskAlerts(){
 const now=useContext(TimeContext),tasks=useStore(s=>s.tasks);const [alerts,setAlerts]=useState<AlertItem[]>([]),[enabled,setEnabled]=useState(false),[notificationStatus,setNotificationStatus]=useState(''),[volume,setVolume]=useState(.8),[testingAlarm,setTestingAlarm]=useState(false);
 const sounds=useRef<TaskSounds|null>(null);
 if(!sounds.current)sounds.current=new TaskSounds();
 const chime=()=>sounds.current?.play('reminder');
 const enable=async()=>{let notifications:Promise<NotificationPermission>|undefined;try{if('Notification'in window&&Notification.permission==='default')notifications=Notification.requestPermission();}catch{/* Notifications may be unavailable on this browser. */}try{const ready=await sounds.current!.enable();setEnabled(ready);if(ready)sounds.current!.play('completion');else setNotificationStatus('Sound is paused by the browser. Try enabling it again.');}catch{setNotificationStatus('This browser could not enable sound. In-app alerts remain enabled.');}if(notifications)try{const permission=await notifications;setNotificationStatus(permission==='granted'?'Desktop notifications enabled.':'Desktop notifications are off. In-app alerts still work.');}catch{setNotificationStatus('Desktop notifications are unavailable.');}};
 useEffect(()=>{sounds.current?.setVolume(volume);},[volume]);
 useEffect(()=>{const unsubscribe=onTaskCompleted(id=>{
  setAlerts(items=>items.filter(alert=>alert.id!==id));
  void sounds.current?.playFromGesture('completion');
 });return()=>{unsubscribe();sounds.current?.destroy();};},[]);
 useEffect(()=>{const incoming:AlertItem[]=[];for(const task of useStore.getState().tasks){const events=pendingEvents(task,now),event=latestEvent(events);if(!event)continue;useStore.getState().markDelivered(task.id,events.map(e=>e.key));const message=event.kind==='end'?`Time is up for “${task.title}”.`:event.kind==='start'?`“${task.title}” has started.`:`“${task.title}” is due in ${Math.max(1,Math.ceil((Date.parse(task.schedule!.endAt)-now)/60000))} minutes.`;incoming.push({id:task.id,key:event.key,kind:event.kind,message});if('Notification'in window&&Notification.permission==='granted')try{new Notification(event.kind==='end'?'Taskspace · Time is up':'Taskspace · Reminder',{body:message,tag:`taskspace-${task.id}-${event.key}`});}catch{/* In-app alert remains available, including on unsupported mobile browsers. */}}
 if(incoming.length){setAlerts(existing=>[...existing,...incoming.filter(a=>!existing.some(b=>a.id===b.id&&a.key===b.key))]);if(incoming.some(a=>a.kind!=='end'))chime();}
 },[now,tasks]);
 const liveAlerts=alerts.filter(a=>{const t=tasks.find(t=>t.id===a.id);return t&&!t.completed&&!!t.schedule&&a.key.startsWith(`${t.schedule.startAt}/${t.schedule.endAt}/${t.schedule.reminderMinutes}/`);});
 const alarmKey=liveAlerts.filter(a=>a.kind==='end').map(a=>`${a.id}:${a.key}`).join('|');
 useEffect(()=>{if((!alarmKey&&!testingAlarm)||!enabled||!sounds.current)return;return loopDeadlineAlarm(sounds.current);},[alarmKey,enabled,testingAlarm]);
 return <><div className="alert-settings"><button className="liquid-glass alert-enable" onClick={()=>{if(enabled){sounds.current?.mute();setEnabled(false);setTestingAlarm(false);}else void enable();}}><Bell size={13}/>{enabled?'Mute sound':'Enable alerts'}</button>{enabled&&<><label className="volume-control"><Volume2 size={13}/><span className="sr-only">Alarm volume</span><input type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button className="text-button test-sound" onClick={()=>sounds.current?.play('completion')}>Test completion</button><button className="text-button test-sound" aria-pressed={testingAlarm} onClick={()=>{if(testingAlarm)sounds.current?.stop('deadline');setTestingAlarm(value=>!value);}}>{testingAlarm?'Stop test alarm':'Test alarm'}</button></>}<p role="status">{enabled?'Sound on: a gentle chime for completion, a louder alarm that repeats until dismissed when time is up. ':'Sound off. Enable alerts to hear completion chimes and deadline alarms. '}{notificationStatus||'Keep this page open for timed alerts.'}</p></div><Presence present={liveAlerts.length>0}><section className="timed-alerts" aria-label="Task reminders"><div className="timed-alert-title"><AlarmClock size={17}/><span>{liveAlerts.some(a=>a.kind==='end')?'Task timer':'Task reminder'}</span><button className="icon-button" aria-label="Dismiss all task alerts and stop alarm" onClick={()=>{sounds.current?.stop('deadline');setTestingAlarm(false);setAlerts([]);}}><X size={16}/></button></div><div className="timed-alert-list">{liveAlerts.map(a=><div key={`${a.id}:${a.key}`} className="timed-alert-row"><p role="status">{a.message}</p><button onClick={()=>setAlerts(items=>items.filter(i=>i!==a))} aria-label={`Dismiss ${a.message}`}>Dismiss</button>{a.kind==='end'&&<button onClick={()=>useStore.getState().toggle(a.id)}>Complete</button>}</div>)}</div></section></Presence></>;
}




