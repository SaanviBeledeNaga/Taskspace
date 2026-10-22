// Persist only text and the small set of formatting supported by the note toolbar.
// Images are stored separately as Blobs; pasted HTML cannot introduce active content.
export function safeNoteHTML(html:string){
 const template=document.createElement('template');template.innerHTML=html;
 const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','STRIKE','SPAN','FONT','UL','OL','LI']);
 const clean=(source:Node):Node|null=>{
  if(source.nodeType===Node.TEXT_NODE)return document.createTextNode(source.textContent??'');
  if(!(source instanceof HTMLElement))return null;
  if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE'].includes(source.tagName))return null;
  const out=document.createElement(allowed.has(source.tagName)?source.tagName.toLowerCase():'span');
  const color=source.style.color||(source.tagName==='FONT'?source.getAttribute('color'):'');
  const bg=source.style.backgroundColor,font=source.style.fontFamily||(source.tagName==='FONT'?source.getAttribute('face'):'');
  if(color&&/^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(color))out.style.color=color;
  if(bg&&/^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(bg))out.style.backgroundColor=bg;
  if(font&&/^[\w\s,'"-]+$/.test(font))out.style.fontFamily=font;
  for(const child of source.childNodes){const safe=clean(child);if(safe)out.appendChild(safe);}
  return out;
 };
 const result=document.createElement('div');for(const child of template.content.childNodes){const safe=clean(child);if(safe)result.appendChild(safe);}return result.innerHTML;
}
