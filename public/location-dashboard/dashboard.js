(() => {
const endpoint='/.netlify/functions/location-dashboard',signin=document.querySelector('#signin'),dashboard=document.querySelector('#dashboard'),status=document.querySelector('#status'),period=document.querySelector('#period');
let map,markers,circle;
const fmt=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
function showLogin(){signin.hidden=false;dashboard.hidden=true;if(markers)markers.clearLayers();if(circle)circle.remove();document.querySelector('#rows').replaceChildren();}
async function api(action,options={},extra=''){
 const response=await fetch(endpoint+'?action='+action+extra,{credentials:'same-origin',cache:'no-store',...options});
 const data=await response.json();
 if(!response.ok){if(response.status===401)showLogin();throw new Error(data.error||'Unable to load dashboard');}return data;
}
function render(report){
 const records=report.records;
 document.querySelector('#count').textContent=records.length.toLocaleString('en-AU');
 const accuracy=records.map(r=>r.accuracy_m).sort((a,b)=>a-b),n=accuracy.length;
 const median=n?(n%2?accuracy[(n-1)/2]:(accuracy[n/2-1]+accuracy[n/2])/2):null;
 document.querySelector('#accuracy').textContent=median===null?'—':Math.round(median).toLocaleString('en-AU')+' m';
 document.querySelector('#dates').textContent=fmt(report.start)+' – '+fmt(report.end);
 document.querySelector('#updated').textContent='Prepared '+fmt(report.generated_at);
 document.querySelector('#empty').hidden=records.length>0;
 const rows=document.querySelector('#rows');rows.replaceChildren();
 for(const r of [...records].reverse()){
  const tr=document.createElement('tr');
  for(const text of [fmt(r.timestamp),new URL(r.url).pathname,Number(r.latitude).toFixed(6),Number(r.longitude).toFixed(6),Math.round(r.accuracy_m)+' m']){
   const td=document.createElement('td');td.textContent=text;tr.append(td);
  }rows.append(tr);
 }
 document.querySelector('#csv').href=endpoint+'?action=csv&period='+encodeURIComponent(period.value);
 if(!window.L){status.textContent='The map library could not load. The table and CSV are still available.';return;}
 if(!map){
  map=L.map('map',{minZoom:2,maxZoom:18}).setView([-25,135],4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  markers=L.layerGroup().addTo(map);
 }
 markers.clearLayers();if(circle)circle.remove();
 for(const r of records){
  const popup=document.createElement('div');
  for(const text of [new URL(r.url).pathname,fmt(r.timestamp),'Accuracy estimate: '+Math.round(r.accuracy_m)+' m']){
   const p=document.createElement('p');p.textContent=text;popup.append(p);
  }
  L.circleMarker([r.latitude,r.longitude],{radius:6,color:'#203e32',fillColor:'#dc76a0',fillOpacity:.8,weight:2}).bindPopup(popup).on('click',()=>{
   if(circle)circle.remove();circle=L.circle([r.latitude,r.longitude],{radius:r.accuracy_m,weight:1,color:'#203e32',fillOpacity:.08}).addTo(map);
  }).addTo(markers);
 }
 map.invalidateSize();
 if(records.length)map.fitBounds(records.map(r=>[r.latitude,r.longitude]),{padding:[30,30],maxZoom:12});
}
async function load(){
 status.textContent='Loading locations…';document.querySelector('#refresh').disabled=true;
 try{const report=await api('data',{},'&period='+encodeURIComponent(period.value));status.textContent='';render(report);}
 catch(error){status.textContent=error.message;document.querySelector('#rows').replaceChildren();if(markers)markers.clearLayers();document.querySelector('#count').textContent='—';}
 finally{document.querySelector('#refresh').disabled=false;}
}
document.querySelector('#login').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;status.textContent='Signing in…';
 try{await api('login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value})});document.querySelector('#password').value='';signin.hidden=true;dashboard.hidden=false;await load();}
 catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
document.querySelector('#logout').addEventListener('click',async()=>{try{await api('logout',{method:'POST'});showLogin();status.textContent='Signed out.';}catch(error){status.textContent=error.message;}});
period.addEventListener('change',load);document.querySelector('#refresh').addEventListener('click',load);
api('session').then(()=>{signin.hidden=true;dashboard.hidden=false;return load();}).catch(error=>{if(error.message!=='Please sign in')status.textContent=error.message;});
})();
