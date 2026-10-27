import { getStore } from '@netlify/blobs';
export function reportWindow(now=new Date()) {
 const local=new Date(now.getTime()+10*3600000),day=(local.getUTCDay()+6)%7;
 const end=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-day)-10*3600000);
 return {start:new Date(end.getTime()-7*86400000),end};
}
export async function readRecords(start,end) {
 const store=getStore({name:'human-standard-locations',consistency:'strong'}),records=[];
 for(let time=Date.parse(start.toISOString().slice(0,10));time<end.getTime();time+=86400000) {
   for await(const page of store.list({prefix:'records/'+new Date(time).toISOString().slice(0,10)+'/',paginate:true})) {
     const values=await Promise.all(page.blobs.map(blob=>store.get(blob.key,{type:'json'})));
     records.push(...values.filter(r=>r&&Date.parse(r.timestamp)>=start.getTime()&&Date.parse(r.timestamp)<end.getTime()));
   }
 }
 return records.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
export function csv(records) {
 const fields=['id','latitude','longitude','accuracy_m','url','timestamp','consent_version'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@\t\r]/,"'").replaceAll('"','""')+'"';
 return '\ufeff'+[fields.join(','),...records.map(r=>fields.map(f=>cell(r[f])).join(','))].join('\r\n')+'\r\n';
}
