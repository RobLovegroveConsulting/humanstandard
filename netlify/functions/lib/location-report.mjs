export function reportWindow(now=new Date()) {
  // Monday 08:00 Queensland = Sunday 22:00 UTC. Report complete local weeks.
  const local=new Date(now.getTime()+10*3600000);
  const day=(local.getUTCDay()+6)%7;
  const end=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-day)-10*3600000);
  return {start:new Date(end.getTime()-7*86400000),end};
}
export function csv(records) {
 const fields=['id','latitude','longitude','accuracy_m','url','timestamp','consent_version'];
 const cell=value => '"'+String(value??'').replace(/^[=+@\t\r]/,"'").replaceAll('"','""')+'"';
 return '\ufeff'+[fields.join(','),...records.map(record=>fields.map(field=>cell(record[field])).join(','))].join('\r\n')+'\r\n';
}
