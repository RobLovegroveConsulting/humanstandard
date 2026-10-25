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
