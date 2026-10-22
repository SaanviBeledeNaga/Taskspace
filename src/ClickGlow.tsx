import { useEffect, useRef } from 'react';
export default function ClickGlow(){
 const glow=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const hide=()=>{if(glow.current)glow.current.style.opacity='0';};
  const move=(e:PointerEvent)=>{const el=glow.current,target=e.target;if(!el||!fine.matches||e.pointerType==='touch'||!(target instanceof Element)){hide();return;}const clickable=target.closest('button,a[href],select,input[type="checkbox"],input[type="color"],[role="button"],[role="menuitem"],.react-flow__edge');const disabled=clickable?.matches(':disabled,[aria-disabled="true"]');el.style.transform=`translate3d(${e.clientX-22}px,${e.clientY-22}px,0)`;el.style.opacity=clickable&&!disabled?'1':'0';};
  window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',hide);window.addEventListener('blur',hide);window.addEventListener('scroll',hide,true);
  return()=>{window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',hide);window.removeEventListener('blur',hide);window.removeEventListener('scroll',hide,true);};
 },[]);
 return <div ref={glow} className="click-glow" aria-hidden="true"/>;
}
