'use strict';
(()=>{
  function boot(){
    const root=document.getElementById('credit-news');if(!root)return;
    const scope=root.querySelector('[data-news-scope]'),viewport=root.querySelector('[data-news-window]'),list=root.querySelector('ul'),position=root.querySelector('[data-news-position]'),coverage=root.querySelector('[data-news-coverage]');
    let index=0,nodes=[],touch=null;
    const narrow=matchMedia('(max-width:600px)'),tablet=matchMedia('(max-width:900px)');
    const columns=()=>narrow.matches?1:tablet.matches?2:3;
    function show(value){
      const count=nodes.length;if(!count)return;
      index=(value+count)%count;
      const ordered=nodes.slice(index).concat(nodes.slice(0,index));
      ordered.forEach((node,i)=>{node.hidden=i>=columns();});list.replaceChildren(...ordered);
      position.textContent=count===1?'1 report':'Report '+(index+1)+' of '+count;
    }
    function syncVisibility(){if(root.hasAttribute('data-news-auth-only'))root.hidden=!document.body.classList.contains('auth-entry');}
    function sourceLink(url,text){const target=new URL(url);if(target.protocol!=='https:')throw Error('unavailable');const link=document.createElement('a');link.href=target.href;link.textContent=text;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',text+' (opens in a new tab)');return link;}
    function card(item,i,count){
      const node=document.createElement('li'),caption=document.createElement('p'),heading=document.createElement('h3'),summary=document.createElement('p'),controls=document.createElement('div');
      node.className='credit-news-item';node.setAttribute('aria-label','Story '+(i+1)+' of '+count+': '+item.title);
      caption.className='credit-news-meta';caption.textContent=[item.country==='GB'?'UK':item.country,item.date_label||item.date,item.source].filter(Boolean).join(' · ');
      heading.textContent=item.title;summary.className='credit-news-summary';summary.textContent=String(item.summary||'').trim().split(/\s+/).slice(0,100).join(' ');
      const more=sourceLink(item.url,'Read more ↗');more.setAttribute('aria-label','Read more: '+item.title+' (opens in a new tab)');more.className='credit-news-more';controls.className='credit-news-card-controls';
      for(const direction of [-1,1]){const button=document.createElement('button');button.type='button';button.dataset.newsDirection=String(direction);button.textContent=direction<0?'← Previous':'Next →';button.setAttribute('aria-label',direction<0?'Previous story':'Next story');button.disabled=count<2;controls.append(button);}
      node.append(caption,heading,summary,more,controls);return node;
    }
    list.addEventListener('click',event=>{const button=event.target.closest?.('[data-news-direction]');if(!button||button.disabled)return;const direction=Number(button.dataset.newsDirection);show(index+direction);list.querySelector(`[data-news-direction="${direction}"]`)?.focus();});
    viewport.addEventListener('keydown',event=>{if(event.target!==viewport||!nodes.length)return;const value=event.key==='Home'?0:event.key==='End'?nodes.length-1:['ArrowRight','ArrowDown'].includes(event.key)?index+1:['ArrowLeft','ArrowUp'].includes(event.key)?index-1:null;if(value!==null){event.preventDefault();show(value);}});
    viewport.addEventListener('touchstart',event=>{touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
    viewport.addEventListener('touchend',event=>{if(!touch||event.changedTouches.length!==1)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1));},{passive:true});
    narrow.addEventListener('change',()=>show(index));tablet.addEventListener('change',()=>show(index));
    if(root.hasAttribute('data-news-auth-only')&&typeof MutationObserver==='function')new MutationObserver(syncVisibility).observe(document.body,{attributes:true,attributeFilter:['class']});
    syncVisibility();
    const model=window.CRPHomepagePromise||fetch('/api/homepage',{credentials:'omit',cache:'no-store'}).then(response=>{if(!response.ok)throw Error('unavailable');return response.json();});
    model.then(home=>{
      const data=home.news;if(!home.ok||!data?.ok||!Array.isArray(data.items))throw Error('unavailable');
      nodes=data.items.map((item,i)=>card(item,i,data.items.length));
      scope.textContent=data.scope+' · Past five years · Inventory updated '+(data.reviewed_at||'date unavailable');
      coverage.textContent='CRP helps you check the facts and prepare a dispute. You stay in control.';
      if(!nodes.length){scope.textContent=data.scope+' · No qualifying recent stories are included yet.';viewport.hidden=true;position.textContent='';return;}
      viewport.hidden=false;show(0);
    }).catch(()=>{scope.textContent='Stories could not be loaded. Please refresh this page to try again.';viewport.hidden=true;list.replaceChildren();position.textContent='';});
  }
  if(document.readyState==='complete')boot();else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();
