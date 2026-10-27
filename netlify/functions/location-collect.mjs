import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
const origins=new Set(['https://humanstandard.au','https://www.humanstandard.au','https://humanstandard.netlify.app']);
export default async function(request) {
  const headers={'Cache-Control':'no-store'};
  if(request.method!=='POST') return new Response(null,{status:405,headers});
  if(!origins.has(request.headers.get('origin'))) return new Response(null,{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json')) return new Response(null,{status:415,headers});
  try {
    const raw=await request.text();
    if(raw.length>2048) return new Response(null,{status:413,headers});
    const data=JSON.parse(raw);
    if(typeof data.latitude!=='number'||!Number.isFinite(data.latitude)||Math.abs(data.latitude)>90 ||
       typeof data.longitude!=='number'||!Number.isFinite(data.longitude)||Math.abs(data.longitude)>180 ||
       typeof data.accuracy_m!=='number'||!Number.isFinite(data.accuracy_m)||data.accuracy_m<0 ||
       typeof data.path!=='string'||!data.path.startsWith('/')||data.path.startsWith('//')||data.path.length>500||
       /[?#\r\n]/.test(data.path)||data.consent_version!=='2026-10-27') return new Response(null,{status:400,headers});
    const now=new Date(), id=randomUUID();
    await getStore('human-standard-locations').setJSON('records/'+now.toISOString().slice(0,10)+'/'+id,{
      id,latitude:data.latitude,longitude:data.longitude,accuracy_m:data.accuracy_m,
      url:'https://humanstandard.au'+data.path,timestamp:now.toISOString(),consent_version:data.consent_version
    });
    return new Response(null,{status:204,headers});
  } catch { return new Response(null,{status:503,headers}); }
}
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip','domain']}};
