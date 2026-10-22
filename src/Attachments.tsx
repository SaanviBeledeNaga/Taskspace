import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { Attachment } from './board';
import { deleteFile, fileSize, loadFile, saveFile } from './files';
import { useStore } from './store';
function Picture({file}:{file:Attachment}){
 const [url,setUrl]=useState('');
 useEffect(()=>{let active=true,objectUrl='';loadFile(file.id).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(()=>{});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[file.id]);
 return url?<img className="attachment-picture" src={url} alt={file.name}/>:null;
}
export default function Attachments({kind,ownerId,files=[]}:{kind:'task'|'note';ownerId:string;files?:Attachment[]}){
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const download=async(file:Attachment)=>{try{const blob=await loadFile(file.id),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setError('');}catch(e){setError((e as Error).message);}};
 return <div className="attachments nodrag nopan" onClick={e=>e.stopPropagation()}><div className="attachment-list">{files.map(file=><div className="attachment-entry" key={file.id}>{kind==='note'&&/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)&&<Picture file={file}/>}<div className="attachment-row"><button type="button" className="attachment-download" onClick={()=>void download(file)} title={`Download ${file.name}`}><Download size={12}/><span>{file.name}</span><small>{fileSize(file.size)}</small></button><button type="button" className="attachment-remove" aria-label={`Remove ${file.name}`} onClick={()=>{useStore.getState().detach(kind,ownerId,file.id);void deleteFile(file.id).catch(e=>setError(e.message));}}><X size={12}/></button></div></div>)}</div><button type="button" className="attach-button" disabled={busy} onClick={()=>input.current?.click()}><span aria-hidden="true">📎</span>{busy?'Saving files…':kind==='task'?'Attach files':'Add pictures or files'}</button><input ref={input} type="file" multiple hidden aria-label={kind==='task'?'Attach files to task':'Attach pictures or documents to note'} onChange={async e=>{const chosen=Array.from(e.target.files??[]);e.target.value='';setBusy(true);setError('');const errors:string[]=[];for(const file of chosen){try{const meta=await saveFile(file);if(!useStore.getState().attach(kind,ownerId,meta))await deleteFile(meta.id);}catch(err){errors.push((err as Error).message);}}setError(errors.join(' '));setBusy(false);}}/>{error&&<p className="attachment-error" role="alert">{error}</p>}</div>;
}
