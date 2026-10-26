(() => {
  'use strict';
  // Only production hosts report to this separate Human Standard GA4 property.
  const hosts = ['humanstandard.au', 'www.humanstandard.au', 'humanstandard.netlify.app'];
  if (!hosts.includes(location.hostname)) return;
  const measurementId = 'G-WS3JRYW0HP';
  const choiceKey = 'hs-analytics-consent';
  let choice;
  try { choice = localStorage.getItem(choiceKey); } catch (_) { /* Prompt for this visit. */ }
  let loaded = false;
  function startAnalytics() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: document.referrer ? document.referrer.split(/[?#]/)[0] : ''
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }
  const banner = document.createElement('section');
  banner.className = 'analytics-consent';
  banner.setAttribute('aria-label', 'Analytics cookie preferences');
  banner.hidden = true;
  banner.innerHTML = '<div><h2>Help us make this more useful.</h2><p>May we use analytics cookies to understand how this website is used? Your choice won’t affect access. <a href="/privacy/">Privacy information</a></p></div><div class="analytics-actions"><button type="button" data-analytics="declined">Decline analytics</button><button type="button" data-analytics="accepted">Accept analytics</button></div>';
  document.body.appendChild(banner);
  function saveChoice(next) {
    const wasAccepted = choice === 'accepted';
    choice = next;
    try { localStorage.setItem(choiceKey, next); } catch (_) { /* Keep choice for current page. */ }
    banner.hidden = true;
    if (next === 'accepted') startAnalytics();
    else {
      window['ga-disable-' + measurementId] = true;
      const domains = [location.hostname, '.' + location.hostname, '.humanstandard.au', '.netlify.app'];
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (name === '_ga' || name.startsWith('_ga_')) {
          document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
          for (const domain of domains) document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + domain + '; SameSite=Lax';
        }
      }
      // Unload the already-running Google script when withdrawing consent.
      if (wasAccepted) location.reload();
    }
  }
  banner.querySelectorAll('[data-analytics]').forEach(button => button.addEventListener('click', () => {
    window['ga-disable-' + measurementId] = false;
    saveChoice(button.dataset.analytics);
  }));
  document.querySelectorAll('.analytics-settings').forEach(button => button.addEventListener('click', () => {
    banner.hidden = false;
    banner.querySelector('button').focus();
  }));
  if (choice === 'accepted') startAnalytics();
  else if (choice !== 'declined') banner.hidden = false;
})();
