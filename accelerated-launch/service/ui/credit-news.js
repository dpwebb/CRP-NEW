'use strict';
(()=>{
  function boot(){
  const root=document.getElementById('credit-news');if(!root)return;
  const scope=root.querySelector('[data-news-scope]'),viewport=root.querySelector('[data-news-window]'),list=root.querySelector('ul');
  const pause=root.querySelector('[data-news-pause]'),previous=root.querySelector('[data-news-direction="-1"]'),next=root.querySelector('[data-news-direction="1"]');
  const country=root.querySelector('[data-news-country]'),position=root.querySelector('[data-news-position]'),coverage=root.querySelector('[data-news-coverage]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let paused=motion.matches,timer=null,hovering=false,inView=true,index=0,sequence=0,touch=null;
  function stop(){clearTimeout(timer);timer=null;}
  function visible(){return !root.hidden&&(!root.hasAttribute('data-news-auth-only')||document.body.classList.contains('auth-entry'));}
  function controls(){
    const multiple=list.children.length>1;
    previous.disabled=next.disabled=!multiple;
    pause.disabled=motion.matches||!multiple;
    pause.textContent=motion.matches?'Automatic rotation off':paused?'Resume stories':'Pause stories';
    pause.setAttribute('aria-pressed',String(paused||motion.matches));
    position.setAttribute('aria-live',paused||motion.matches?'polite':'off');
    root.querySelector('.credit-news-controls').hidden=!list.children.length;
  }
  function start(){
    stop();controls();
    if(paused||motion.matches||hovering||root.contains(document.activeElement)||document.hidden||!visible()||!inView||list.children.length<2)return;
    const words=list.children[index]?.textContent.trim().split(/\s+/).length||0;
    timer=setTimeout(()=>show(index+1),Math.max(15000,words*400));
  }
  function show(value){
    const count=list.children.length;if(!count)return;
    index=(value+count)%count;
    Array.from(list.children).forEach((item,i)=>{item.hidden=i!==index;});
    position.textContent='Story '+(index+1)+' of '+count;
    start();
  }
  function manual(value){paused=true;show(value);}
  function syncVisibility(){
    if(root.hasAttribute('data-news-auth-only'))root.hidden=!document.body.classList.contains('auth-entry');
    start();
  }
  pause.addEventListener('click',()=>{paused=!paused;start();});
  previous.addEventListener('click',()=>manual(index-1));next.addEventListener('click',()=>manual(index+1));
  root.addEventListener('mouseenter',()=>{hovering=true;stop();});root.addEventListener('mouseleave',()=>{hovering=false;start();});
  root.addEventListener('focusin',stop);root.addEventListener('focusout',()=>setTimeout(start,0));
  viewport.addEventListener('keydown',event=>{
    if(event.target!==viewport)return;
    if(event.key==='ArrowRight'||event.key==='ArrowDown'){event.preventDefault();manual(index+1);}
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp'){event.preventDefault();manual(index-1);}
    else if(event.key==='Home'){event.preventDefault();manual(0);}
    else if(event.key==='End'){event.preventDefault();manual(list.children.length-1);}
  });
  viewport.addEventListener('touchstart',event=>{paused=true;stop();controls();touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
  viewport.addEventListener('touchend',event=>{
    if(!touch||event.changedTouches.length!==1)return;
    const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)manual(index+(dx<0?1:-1));
  },{passive:true});
  motion.addEventListener('change',()=>{if(motion.matches)paused=true;start();});document.addEventListener('visibilitychange',start);
  if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;start();}).observe(root);
  if(root.hasAttribute('data-news-auth-only')&&typeof MutationObserver==='function')new MutationObserver(syncVisibility).observe(document.body,{attributes:true,attributeFilter:['class']});
  function sourceLink(url,title){
    const target=new URL(url);if(target.protocol!=='https:')throw Error('unavailable');
    const link=document.createElement('a');link.href=target.href;link.textContent=title;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',title+' (opens in a new tab)');return link;
  }
  function card(item,i,count){
    const li=document.createElement('li'),meta=document.createElement('p'),heading=document.createElement('h3'),summary=document.createElement('p'),status=document.createElement('p');
    li.className='credit-news-item';li.setAttribute('role','group');li.setAttribute('aria-roledescription','slide');li.setAttribute('aria-label','Story '+(i+1)+' of '+count);li.hidden=i!==0;
    meta.className='credit-news-meta';meta.textContent=[item.country==='GB'?'UK':item.country,item.type,item.date,item.source,item.bureau].filter(Boolean).join(' · ');
    heading.append(sourceLink(item.url,item.title));summary.textContent=item.summary;status.className='credit-news-outcome';status.textContent=item.status||item.type;
    li.append(meta,heading,summary,status);
    if(item.status_url){const detail=document.createElement('p');detail.className='credit-news-source';detail.append(sourceLink(item.status_url,'Read current settlement notice'));li.append(detail);}
    return li;
  }
  function coverageText(data){
    const rows=(data.coverage||[]).filter(row=>!data.country||row.country===data.country);
    const missing=rows.filter(row=>row.court_decisions===0).map(row=>row.country==='GB'?'the UK':row.name);
    return missing.length?'No court decisions are included in this carousel yet for '+missing.join(', ')+'. Available media reports remain shown.':'Court decisions, settlements and reported experiences are labelled separately.';
  }
  async function load(selection){
    const request=++sequence;stop();list.replaceChildren();position.textContent='';scope.textContent='Loading reports and decisions…';coverage.textContent='';viewport.hidden=false;controls();
    try{
      const response=await fetch('/api/credit-news'+(selection?'?country='+encodeURIComponent(selection):''),{credentials:'omit',cache:'no-store'});
      if(!response.ok)throw Error('unavailable');const data=await response.json();if(request!==sequence)return;
      if(!data.ok||!Array.isArray(data.items))throw Error('unavailable');
      const nodes=data.items.map((item,i)=>card(item,i,data.items.length));
      country.value=data.country||'ALL';scope.textContent=data.scope+' · Past five years · Sources reviewed '+(data.reviewed_at||'date unavailable');coverage.textContent=coverageText(data);
      list.append(...nodes);
      if(!nodes.length){scope.textContent=data.scope+' · No qualifying recent stories are included yet.';coverage.textContent='Choose another country or All countries to read the available stories.';viewport.hidden=true;controls();return;}
      show(0);
    }catch{
      if(request!==sequence)return;
      scope.textContent='Stories could not be loaded. Choose a country to try again.';viewport.hidden=true;controls();
    }
  }
  country.addEventListener('change',()=>{paused=true;load(country.value);});
  syncVisibility();load();
  }
  // Account entry scrubs recovery secrets synchronously in its later deferred
  // app script. Wait for every initial deferred script before making a request.
  if(document.readyState==='complete')boot();
  else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();
