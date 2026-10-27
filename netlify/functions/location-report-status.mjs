import { getStore } from '@netlify/blobs';
export default async function(request) {
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
 if(request.method!=='GET')return new Response(null,{status:405,headers});
 try {
 const status=await getStore({name:'human-standard-location-snapshots',consistency:'strong'}).get('status',{type:'json'});
 return new Response(JSON.stringify(status?{ready:true,start:status.start,end:status.end,generated_at:status.generated_at}:{ready:false}),{headers});
 }catch{return new Response(JSON.stringify({ready:false,error:'Status unavailable'}),{status:503,headers});}
}
