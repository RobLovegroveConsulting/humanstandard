const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu(){nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();menu?.focus();}});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('.motion-toggle');
let paused = motion.matches;
const art = document.querySelector('[data-parallax]');
const orbit = document.querySelector('.orbit');
let scheduled=false;
function render(){scheduled=false;if(paused || motion.matches || innerWidth<721){art?.style.removeProperty('transform');orbit?.style.removeProperty('transform');return;}const y=scrollY;if(art)art.style.transform=`translateY(${Math.min(y,1000)*0.09}px)`;if(orbit)orbit.style.transform=`translateY(${-Math.min(y,5000)*0.025}px) rotate(-18deg)`;}
function sync(){document.body.classList.toggle('motion-paused',paused);toggle?.setAttribute('aria-pressed',String(paused));if(toggle)toggle.textContent=paused?'Enable background motion':'Pause background motion';render();}
toggle?.addEventListener('click',()=>{paused=!paused;sync();});
motion.addEventListener('change',()=>{paused=motion.matches;sync();});
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(render);}},{passive:true});
addEventListener('resize',render);
sync();

const requestedTier = new URLSearchParams(location.search).get("tier");
const tierSelect = document.querySelector("#tier");
if(tierSelect && [...tierSelect.options].some(option => option.value === requestedTier)) tierSelect.value = requestedTier;

// Resource requests are submitted to Netlify Forms before a file link is shown.
// The PDF files remain public static assets; this is lead capture, not access control.
const downloadResources = {
  workbook: {path:'/downloads/map-your-business-for-ai.pdf', filename:'map-your-business-for-ai.pdf'},
  templates: {path:'/downloads/marketing-pr-template-pack.pdf', filename:'marketing-pr-template-pack.pdf'}
};
const downloadDialog = document.querySelector('.download-dialog');
let downloadTrigger;
function resetDownloadFlow(flow, resource){
  const form = flow.querySelector('.download-form');
  form.reset();
  if(downloadResources[resource]) form.elements.resource.value = resource;
  form.elements['request-page'].value = location.pathname;
  form.hidden = false;
  form.querySelector('.download-status').textContent = '';
  const success = flow.querySelector('.download-success');
  success.hidden = true;
  success.querySelector('.download-file').removeAttribute('href');
}
document.querySelectorAll('[data-download-resource]').forEach(link => {
  link.addEventListener('click', event => {
    if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if(!downloadDialog || typeof downloadDialog.showModal !== 'function') return;
    event.preventDefault();
    downloadTrigger = link;
    resetDownloadFlow(downloadDialog.querySelector('.download-flow'),link.dataset.downloadResource);
    downloadDialog.showModal();
    downloadDialog.querySelector('input[name="name"]').focus();
  });
});
downloadDialog?.querySelector('.download-close').addEventListener('click',()=>downloadDialog.close());
downloadDialog?.addEventListener('close',()=>downloadTrigger?.focus());
downloadDialog?.addEventListener('cancel',event=>{if(downloadDialog.querySelector('[aria-busy="true"]')) event.preventDefault();});
downloadDialog?.addEventListener('click',event=>{
  if(event.target !== downloadDialog || downloadDialog.querySelector('[aria-busy="true"]')) return;
  const bounds=downloadDialog.getBoundingClientRect();
  if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) downloadDialog.close();
});
document.querySelectorAll('.download-flow').forEach(flow=>{
  const form=flow.querySelector('.download-form');
  const fromQuery=new URLSearchParams(location.search).get('resource');
  resetDownloadFlow(flow,fromQuery);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity()) return;
    const name=form.elements.name;
    name.value=name.value.trim();
    if(!name.value){name.setCustomValidity('Please enter your name.');name.reportValidity();return;}
    const resource=downloadResources[form.elements.resource.value];
    if(!resource) return;
    const button=form.querySelector('button[type="submit"]');
    if(button.disabled) return;
    const status=form.querySelector('.download-status');
    const close=downloadDialog?.querySelector('.download-close');
    button.disabled=true;
    if(close && downloadDialog.contains(form)) close.disabled=true;
    form.setAttribute('aria-busy','true');
    status.textContent='Saving your request…';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const data=new FormData(form);
      data.set('email',form.elements.email.value.trim());
      const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});
      if(!response.ok) throw new Error('Submission failed');
      const success=flow.querySelector('.download-success');
      const file=success.querySelector('.download-file');
      file.href=resource.path;
      file.download=resource.filename;
      form.hidden=true;
      success.hidden=false;
      success.focus();
    }catch(error){
      status.textContent='We could not save your request. Please try again in a moment, or contact us through the enquiry page.';
    }finally{
      clearTimeout(timeout);
      button.disabled=false;
      if(close) close.disabled=false;
      form.removeAttribute('aria-busy');
    }
  });
  form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
});
