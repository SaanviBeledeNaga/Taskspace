type Card={id:string;createdAt:string;schedule?:{startAt:string}};
export function arrangeCards<T extends Card>(tasks:T[],heights:Record<string,number>={}){
 const ordered=[...tasks].sort((a,b)=>{
  const at=a.schedule?Date.parse(a.schedule.startAt):Infinity,bt=b.schedule?Date.parse(b.schedule.startAt):Infinity;
  if(at!==bt)return at<bt?-1:1;
  return (Date.parse(a.createdAt)||0)-(Date.parse(b.createdAt)||0);
 });
 const positions:Record<string,{x:number;y:number}>={};let y=48;
 for(let row=0;row<Math.ceil(ordered.length/3);row++){
  const cards=ordered.slice(row*3,row*3+3);
  cards.forEach((task,i)=>{positions[task.id]={x:48+(row%2?2-i:i)*360,y};});
  y+=Math.max(190,...cards.map(t=>heights[t.id]??260))+100;
 }
 return {ordered,positions};
}
