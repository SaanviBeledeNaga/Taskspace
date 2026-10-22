import { cloneElement, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { prefersReducedMotion } from './transitions';

type PresenceAttributes={'data-presence'?:'open'|'closed';inert?:boolean;'aria-hidden'?:boolean};
// Keep ephemeral UI visible during its short exit, with interaction disabled.
// Stateful workspaces and the alarm controller never live in this wrapper.
export default function Presence({present,children}:{present:boolean;children:ReactElement}){
 const retained=useRef(children);if(present)retained.current=children;
 const [mounted,setMounted]=useState(present);
 useLayoutEffect(()=>{
  if(present){setMounted(true);return;}
  if(prefersReducedMotion()){setMounted(false);return;}
  const timer=setTimeout(()=>setMounted(false),180);return()=>clearTimeout(timer);
 },[present]);
 return present||mounted?cloneElement(retained.current as ReactElement<PresenceAttributes>,{'data-presence':present?'open':'closed',inert:!present,'aria-hidden':!present?true:undefined}):null;
}
