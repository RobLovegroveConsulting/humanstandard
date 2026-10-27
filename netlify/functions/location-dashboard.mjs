import { getStore } from '@netlify/blobs';
import { readRecords, csv } from '../lib/location-data.mjs';
import { authorised, configured, matches, token, cookieName } from '../lib/location-auth.mjs';
const origins=new Set(['https://humanstandard.au','https://www.humanstandard.au','https://humanstandard.netlify.app']);
const base={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...base,...extra}});
export default async function(request) {
 const url=new URL(request.url),action=url.searchParams.get('action'),secret=process.env.LOCATION_DASHBOARD_PASSWORD;
 if(!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'},405);
 if(!configured(secret)) return json({error:'Dashboard setup is pending. Set a unique LOCATION_DASHBOARD_PASSWORD of at least 20 characters in Netlify function environment variables, then redeploy.'},503);
 if(request.method==='POST') {
   if(!origins.has(request.headers.get('origin'))) return json({error:'Forbidden'},403);
   if(action==='logout') return json({ok:true},200,{'Set-Cookie':cookieName+'=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'});
   if(action!=='login') return json({error:'Invalid action'},400);
   if(!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON required'},415);
   let input;
   try {const raw=await request.text();if(raw.length>1024)return json({error:'Request too large'},413);input=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
   if(!matches(input.password,secret)) return json({error:'Incorrect password'},401);
   return json({ok:true},200,{'Set-Cookie':cookieName+'='+token(secret)+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800'});
 }
 if(!authorised(request,secret)) return json({error:'Please sign in'},401);
 if(action==='session') return json({ok:true});
 try {
   let report;
   if(url.searchParams.get('period')==='weekly') {
     report=await getStore({name:'human-standard-location-snapshots',consistency:'strong'}).get('latest',{type:'json'});
     if(!report) return json({error:'The first Monday report has not been generated yet. Select Last 7 days to view live data.'},404);
   } else {
     const days=url.searchParams.get('period')==='30'?30:7,end=new Date(),start=new Date(end.getTime()-days*86400000);
     report={start:start.toISOString(),end:end.toISOString(),generated_at:end.toISOString(),records:await readRecords(start,end)};
   }
   if(action==='csv') return new Response(csv(report.records),{headers:{...base,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="Human-Standard-locations.csv"'}});
   if(action!=='data')return json({error:'Invalid action'},400);
   return json(report);
 } catch {return json({error:'Unable to load location data. Check Netlify function logs.'},503);}
}
export const config={rateLimit:{windowLimit:20,windowSize:60,aggregateBy:['ip','domain']}};
