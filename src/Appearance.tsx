import { useEffect, useRef, useState } from 'react';
import { Check, Palette, Pause, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { useStore } from './store';
import { getTheme, themeImage, themeVideo, themes } from './themes';

export function BackgroundScene(){
 const themeId=useStore(s=>s.preferences.theme),dim=useStore(s=>s.preferences.backgroundDim),theme=getTheme(themeId);
 const video=useRef<HTMLVideoElement>(null),choice=useRef<boolean|null>(null);
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false);setPlaying(false);},[theme.id]);
 useEffect(()=>{
  if(failed)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>{const el=video.current;if(!el)return;if(media.matches||choice.current===false)el.pause();else void el.play().catch(()=>setPlaying(false));};
  update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
 },[theme.id,failed]);
 return <><div className="video-backdrop scene-backdrop" style={{backgroundColor:theme.fallback}}>{!failed?<video key={theme.id} ref={video} loop muted playsInline preload="metadata" poster={themeImage(theme.image)} aria-hidden="true" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}><source src={themeVideo(theme.video)} type="video/mp4" onError={()=>setFailed(true)}/></video>:<img key={theme.id} src={themeImage(theme.image)} alt="" aria-hidden="true" decoding="async" fetchPriority="high" onError={()=>setFailed(true)}/>}<div className="scene-shade" style={{opacity:dim}}/></div>{<button className="video-control liquid-glass" disabled={failed} aria-label={failed?'Background video unavailable':playing?'Pause background video':'Play background video'} onClick={()=>{const el=video.current;if(!el)return;choice.current=!playing;if(playing)el.pause();else void el.play().catch(()=>setFailed(true));}}>{playing?<Pause size={13}/>:<Play size={13}/>}<span>{failed?'Background unavailable':playing?'Pause scenery':'Play scenery'}</span></button>}{failed&&<p className="scene-error" role="status">Showing a still image. Choose another theme to try another video.</p>}</>;
}

export function ThemePicker(){
 const themeId=useStore(s=>s.preferences.theme),dim=useStore(s=>s.preferences.backgroundDim),[open,setOpen]=useState(false);
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button className="theme-trigger liquid-glass" aria-label="Choose background theme"><Palette size={15}/><span>Themes</span></button></DialogTrigger><DialogContent className="theme-dialog"><DialogTitle className="dialog-title">A change of scenery</DialogTitle><DialogDescription className="dialog-description">Five little escapes, plus your original cinematic background. Pick a scene to preview it behind your workspace.</DialogDescription><div className="theme-grid" role="group" aria-label="Background themes">{themes.map(theme=><button type="button" key={theme.id} className={`theme-option ${themeId===theme.id?'selected':''}`} aria-pressed={themeId===theme.id} aria-label={`${theme.name} background`} onClick={()=>{if(theme.id!==themeId)useStore.getState().setPrefs({theme:theme.id,backgroundDim:theme.dim});}}><div className="theme-preview" style={{backgroundColor:theme.fallback}}><img src={themeImage(theme.image)} alt="" loading="lazy" decoding="async"/>{<span className="theme-video-tag"><Play size={10}/>Video</span>}{themeId===theme.id&&<span className="theme-selected" aria-hidden="true"><Check size={14}/></span>}</div><span className="theme-name">{theme.name}</span><span className="theme-caption">{theme.subtitle}</span></button>)}</div><div className="theme-dimming"><label htmlFor="background-dim">Background dimming</label><input id="background-dim" type="range" min="0" max=".6" step=".05" value={dim} onChange={e=>useStore.getState().setPrefs({backgroundDim:Number(e.target.value)})}/><output htmlFor="background-dim">{Math.round(dim*100)}%</output></div><p className="theme-note">Saved in this browser. Your tasks, notes, and timers stay in place.</p><div className="dialog-actions"><button type="button" className="text-button" onClick={()=>useStore.getState().setPrefs({theme:'cinematic',backgroundDim:0})}>Restore original</button><button type="button" className="liquid-glass save-button" onClick={()=>setOpen(false)}>Done</button></div></DialogContent></Dialog>;
}
