(() => {
  'use strict';
  const hosts = ['humanstandard.au', 'www.humanstandard.au', 'humanstandard.netlify.app'];
  if (!hosts.includes(location.hostname)) return;
  const measurementId = 'G-WS3JRYW0HP';
  const choiceKey = 'hs-analytics-consent';
  let choice;
  try { choice = localStorage.getItem(choiceKey); } catch (_) { /* Keep preferences in memory. */ }
  if (choice !== 'accepted' && choice !== 'declined') choice = undefined;
  let loaded = false;
  let regionResolved = false;
  let privacyOptOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  let preferencesOpened = false;
  let preferenceTrigger;
  function clearAnalyticsCookies() {
    const domains = [location.hostname, '.' + location.hostname, '.humanstandard.au'];
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (name === '_ga' || name.startsWith('_ga_')) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
        for (const domain of domains) document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + domain + '; SameSite=Lax';
      }
    }
  }
  function startAnalytics() {
    if (!regionResolved || loaded || choice === 'declined' || privacyOptOut) return;
    loaded = true;
    window['ga-disable-' + measurementId] = false;
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
  banner.innerHTML = '<div><h2>Help us make this more useful.</h2><p data-analytics-message>May we use analytics cookies to understand how this website is used? Your choice won’t affect access. <a href="/privacy/">Privacy information</a></p></div><div class="analytics-actions"><button type="button" data-analytics="declined">Decline analytics</button><button type="button" data-analytics="accepted">Accept analytics</button><button type="button" data-analytics-close hidden>Close</button></div>';
  document.body.appendChild(banner);
  function saveChoice(next) {
    choice = next;
    try { localStorage.setItem(choiceKey, next); } catch (_) { /* Keep choice for current page. */ }
    banner.hidden = true;
    preferenceTrigger?.focus();
    if (next === 'accepted') startAnalytics();
    else {
      window['ga-disable-' + measurementId] = true;
      clearAnalyticsCookies();
      // Unload the running Google script, including automatic-region visits.
      if (loaded) location.reload();
    }
  }
  banner.querySelectorAll('[data-analytics]').forEach(button => button.addEventListener('click', () => {
    saveChoice(button.dataset.analytics);
  }));
  banner.querySelector('[data-analytics-close]').addEventListener('click', () => {
    banner.hidden = true;
    preferenceTrigger?.focus();
  });
  document.querySelectorAll('.analytics-settings').forEach(button => button.addEventListener('click', () => {
    preferenceTrigger = button;
    preferencesOpened = true;
    banner.hidden = false;
    banner.querySelector('[data-analytics-close]').hidden = false;
    if (privacyOptOut) {
      banner.querySelector('[data-analytics-message]').textContent = 'Analytics is off because your browser sends a privacy signal. You can manage this signal in your browser settings.';
      banner.querySelector('[data-analytics="accepted"]').hidden = true;
    }
    banner.querySelector('button').focus();
  }));
  async function initialise() {
    if (privacyOptOut || choice === 'declined') {
      window['ga-disable-' + measurementId] = true;
      clearAnalyticsCookies();
      return;
    }
    // Always resolve the current region before any Google request. No geo caching across visits.
    let consentRequired = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/analytics-region.json', {
        cache: 'no-store', credentials: 'same-origin', signal: controller.signal
      });
      if (!response.ok) throw new Error('Region unavailable');
      const region = await response.json();
      consentRequired = region.consentRequired !== false;
      privacyOptOut = privacyOptOut || region.privacyOptOut === true;
    } catch (_) { /* Unknown region: require consent, never default to tracking. */ }
    finally { clearTimeout(timeout); regionResolved = true; }
    if (privacyOptOut || choice === 'declined') {
      window['ga-disable-' + measurementId] = true;
      clearAnalyticsCookies();
      return;
    }
    if (choice === 'accepted' || !consentRequired) startAnalytics();
    else if (!preferencesOpened) banner.hidden = false;
  }
  initialise();
})();
