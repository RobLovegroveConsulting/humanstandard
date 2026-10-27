import { getStore } from '@netlify/blobs';
import { readRecords,reportWindow,csv } from '../lib/location-data.mjs';
export default async function() {
 const {start,end}=reportWindow(),records=await readRecords(start,end);
 const store=getStore({name:'human-standard-location-snapshots',consistency:'strong'});
 const report={start:start.toISOString(),end:end.toISOString(),generated_at:new Date().toISOString(),records};
 // All report content remains private in Netlify. Only job status is exposed to ChatGPT.
 await store.setJSON('latest',report);
 await store.set('latest.csv',csv(records));
 await store.setJSON('status',{ready:true,start:report.start,end:report.end,generated_at:report.generated_at});
}
export const config={schedule:'0 22 * * 0'};
