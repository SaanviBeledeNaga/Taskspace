import { flushSync } from 'react-dom';

let active:Animation|null=null;

export function prefersReducedMotion(){
 return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Move the live region only. Snapshot handoffs and ancestor opacity/filter
// effects can isolate glass cards from the video backdrop and flash on release.
export function switchContext(update:()=>void,selector='.workspace-content'){
 active?.cancel();active=null;
 flushSync(update);
 if(typeof document==='undefined'||prefersReducedMotion())return;
 const region=document.querySelector<HTMLElement>(selector);
 if(!region||typeof region.animate!=='function')return;
 try{
  const animation=region.animate(
   [{transform:'translateY(8px)'},{transform:'translateY(0)'}],
   {duration:460,easing:'cubic-bezier(.25,.1,.25,1)'}
  );
  active=animation;
  const finish=()=>{if(active===animation)active=null;};
  void animation.finished.then(finish,finish);
 }catch{/* The context change already succeeded. Motion never blocks the app. */}
}
