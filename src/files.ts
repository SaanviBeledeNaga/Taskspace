import type { Attachment } from './board';
export const MAX_FILE_BYTES=20*1024*1024;
let opening:Promise<IDBDatabase>|undefined;
function database(){
 if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('taskspace-files-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=undefined;};resolve(db);};
  request.onerror=()=>{opening=undefined;reject(Error('File storage is unavailable in this browser.'));};
  request.onblocked=()=>{opening=undefined;reject(Error('Close other Taskspace tabs and try again.'));};
 });
 return opening;
}
export function fileMetadata(file:File):Attachment{
 if(file.size>MAX_FILE_BYTES)throw Error(`${file.name}: choose a file smaller than 20 MB.`);
 return {id:crypto.randomUUID(),name:file.name,type:file.type||'application/octet-stream',size:file.size};
}
export async function saveFile(file:File){
 const meta=fileMetadata(file),db=await database();
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id:meta.id,blob:file});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('File could not be saved. Browser storage may be full.'));tx.onabort=()=>reject(Error('File could not be saved.'));});
 return meta;
}
export async function loadFile(id:string):Promise<Blob>{
 const db=await database();return new Promise((resolve,reject)=>{const req=db.transaction('files').objectStore('files').get(id);req.onsuccess=()=>req.result?.blob instanceof Blob?resolve(req.result.blob):reject(Error('This file is no longer available in this browser.'));req.onerror=()=>reject(Error('File could not be read.'));});
}
export async function deleteFile(id:string){
 const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('File could not be removed.'));tx.onabort=()=>reject(Error('File could not be removed.'));});
}
export function fileSize(bytes:number){return bytes<1024?`${bytes} B`:bytes<1048576?`${Math.round(bytes/1024)} KB`:`${(bytes/1048576).toFixed(1)} MB`;}
