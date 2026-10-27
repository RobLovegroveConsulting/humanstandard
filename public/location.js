(() => {
  if (!['humanstandard.au','www.humanstandard.au','humanstandard.netlify.app'].includes(location.hostname) || !navigator.geolocation) return;
  const key = 'hs-location-choice-v1';
  const getChoice = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const setChoice = value => { try { localStorage.setItem(key,value); } catch {} };
  let running = false;
  async function capture() {
    if (running || getChoice() !== 'allow') return;
    running = true;
    navigator.geolocation.getCurrentPosition(async position => {
      if (getChoice() !== 'allow') { running=false; return; }
      try {
        const response = await fetch('/.netlify/functions/location-collect', {
          method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
          body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,
            accuracy_m:position.coords.accuracy,path:location.pathname,consent_version:'2026-10-27'})
        });
        if (!response.ok) throw new Error('Location could not be saved');
      } catch { /* A collection failure must never block the site. */ }
      finally { running=false; }
    }, error => {
      running=false;
      if (error.code === 1) setChoice('decline');
    }, {enableHighAccuracy:true,timeout:20000,maximumAge:0});
  }
  function preferences() {
    if(document.querySelector('#location-choice')) return;
    const dialog=document.createElement('dialog');
    dialog.id='location-choice';
    dialog.setAttribute('aria-labelledby','location-choice-title');
    dialog.innerHTML='<h2 id="location-choice-title">Share your location?</h2><p>Help The Human Standard understand where visitors use this website. If you agree, we request your most accurate available location and store your coordinates, accuracy estimate, page path and time with Netlify. Rob receives a weekly CSV report by email through our email provider. Records are retained for up to 90 days on the website.</p><p>Sharing is optional. You can browse normally without it and stop future collection using Location preferences in the footer. Your location is not linked to enquiry forms or sent to Google Analytics. <a href="/privacy/#visitor-location">Privacy details</a>.</p><div><button type="button" class="button" data-choice="allow">Share location</button> <button type="button" class="button outline" data-choice="decline">Do not share</button></div>';
    dialog.addEventListener('click', event => {
      const choice=event.target.closest('[data-choice]')?.dataset.choice;
      if(!choice) return;
      setChoice(choice); dialog.close();
      if(choice==='allow') capture();
    });
    dialog.addEventListener('cancel',()=>setChoice('decline'));
    dialog.addEventListener('close',()=>dialog.remove());
    document.body.append(dialog); dialog.showModal();
  }
  const footer=document.querySelector('.site-footer > div');
  if(footer) {
    const button=document.createElement('button'); button.type='button';
    button.textContent='Location preferences'; button.addEventListener('click',preferences); footer.append(button);
  }
  if(getChoice()==='allow') capture();
  else if(!getChoice()) preferences();
})();
