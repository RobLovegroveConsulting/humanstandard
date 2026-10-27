import { getStore } from '@netlify/blobs';
export default async function() {
 const store=getStore('human-standard-locations');
 const cutoff=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
 for await(const page of store.list({prefix:'records/',paginate:true})) {
   await Promise.all(page.blobs.filter(blob=>blob.key.split('/')[1]<cutoff).map(blob=>store.delete(blob.key)));
 }
}
export const config={schedule:'30 20 * * *'};
