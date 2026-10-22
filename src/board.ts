export type Attachment = {id:string;name:string;type:string;size:number};
export type ChecklistItem = {id:string;text:string;done:boolean};
export type StickyNote = {id:string;title:string;html:string;color:string;checklist:ChecklistItem[];attachments:Attachment[];createdAt:string;updatedAt:string};
export const noteColors=['#f4e3ad','#e7d5ed','#c9e1d1','#c9ddec','#f1cec0'];
export function readAttachments(value:unknown):Attachment[]{
 if(!Array.isArray(value))return [];
 return value.filter((a):a is Attachment=>!!a&&typeof a.id==='string'&&typeof a.name==='string'&&typeof a.type==='string'&&Number.isFinite(a.size)&&a.size>=0);
}
export function readNotes(value:unknown):StickyNote[]{
 if(!Array.isArray(value))return [];
 const ids=new Set<string>();
 return value.filter(n=>n&&typeof n.id==='string'&&!ids.has(n.id)&&!!ids.add(n.id)&&typeof n.title==='string'&&typeof n.html==='string').map(n=>({id:n.id,title:n.title,html:n.html,color:noteColors.includes(n.color)?n.color:noteColors[0],createdAt:typeof n.createdAt==='string'?n.createdAt:new Date().toISOString(),updatedAt:typeof n.updatedAt==='string'?n.updatedAt:new Date().toISOString(),attachments:readAttachments(n.attachments),checklist:Array.isArray(n.checklist)?n.checklist.filter((i:ChecklistItem)=>i&&typeof i.id==='string'&&typeof i.text==='string'&&typeof i.done==='boolean'):[]}));
}
