'use strict';
(async()=>{
  const root=document.getElementById('credit-news');if(!root)return;
  const status=root.querySelector('[data-news-scope]'), viewport=root.querySelector('[data-news-window]'),list=root.querySelector('ul'),pause=root.querySelector('[data-news-pause]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let paused=motion.matches, timer=null, hovering=false;
  function scrollable(){return viewport.scrollHeight>viewport.clientHeight+1;}
  function label(){if(list.children.length)root.querySelector('.credit-news-controls').hidden=!scrollable();pause.disabled=motion.matches;pause.textContent=motion.matches?'Automatic scrolling off':paused?'Resume scrolling':'Pause scrolling';pause.setAttribute('aria-pressed',String(paused));}
  function stop(){clearInterval(timer);timer=null;}
  function start(){stop();if(paused||motion.matches||hovering||root.contains(document.activeElement)||document.hidden||!scrollable())return;
    timer=setInterval(()=>{if(viewport.scrollHeight<=viewport.clientHeight)return;const end=viewport.scrollHeight-viewport.clientHeight;
      viewport.scrollTop=viewport.scrollTop>=end-1?0:viewport.scrollTop+1;
    },80);
  }
  pause.addEventListener('click',()=>{paused=!paused;label();start();});
  root.addEventListener('mouseenter',()=>{hovering=true;stop();});root.addEventListener('mouseleave',()=>{hovering=false;start();});
  root.addEventListener('focusin',stop);root.addEventListener('focusout',()=>setTimeout(start,0));
  viewport.addEventListener('wheel',()=>{paused=true;label();stop();},{passive:true});viewport.addEventListener('touchstart',()=>{paused=true;label();stop();},{passive:true});
  motion.addEventListener('change',()=>{paused=motion.matches;label();start();});document.addEventListener('visibilitychange',start);
  window.addEventListener('resize',()=>{label();start();});
  for(const button of root.querySelectorAll('[data-news-direction]'))button.addEventListener('click',()=>{paused=true;label();stop();viewport.scrollBy({top:Number(button.dataset.newsDirection)*viewport.clientHeight,behavior:'auto'});});
  label();
  try{
    const response=await fetch('/api/credit-news',{credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('unavailable');const data=await response.json();
    if(!data.ok||!Array.isArray(data.items))throw Error('unavailable');
    status.textContent=data.scope+' · Publications and decisions from the past five years';
    for(const item of data.items){const li=document.createElement('li'),meta=document.createElement('p'),heading=document.createElement('h3'),link=document.createElement('a'),summary=document.createElement('p');
      const url=new URL(item.url);if(url.protocol!=='https:')continue;
      li.className='credit-news-item';meta.className='credit-news-meta';meta.textContent=[item.country==='GB'?'UK':item.country,item.type,item.date,item.source].join(' · ');
      link.href=url.href;link.textContent=item.title;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',item.title+' — read source (opens in a new tab)');heading.append(link);summary.textContent=item.summary;li.append(meta,heading,summary);list.append(li);
    }
    if(!list.children.length){status.textContent='No recent items are available for this country.';root.querySelector('.credit-news-controls').hidden=true;viewport.hidden=true;return;}label();start();
  }catch{status.textContent='Reports could not be loaded. Please try again later.';root.querySelector('.credit-news-controls').hidden=true;viewport.hidden=true;}
})();
