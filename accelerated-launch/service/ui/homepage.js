'use strict';
// The public model uses server-observed IP only. No account/profile/currency
// value is a location input, and no public location is persisted.
(()=>{
  let start;
  const ready=new Promise(resolve=>{start=resolve;});
  window.CRPHomepagePromise=ready.then(async()=>{
    const response=await fetch('/api/homepage',{credentials:'omit',cache:'no-store'});
    if(!response.ok)throw Error('Homepage information could not be loaded.');
    const data=await response.json();
    if(!data.ok||!data.example||!Array.isArray(data.free_reports)||!data.news)throw Error('Homepage information is unavailable.');
    window.CRPHomepageData=data;
    const art=document.querySelector('.story-art');
    if(art){
      const consumer=document.querySelector('[data-home-consumer]'),context=document.querySelector('[data-home-report-context]'),fields=document.querySelector('[data-home-fields]');
      consumer.textContent=data.example.consumer;
      context.textContent=(data.country?data.scope+' · ':'')+'Report issued 16 October 2026';
      fields.replaceChildren(...data.example.fields.map(field=>{const row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=field.label;value.textContent=field.value;row.append(label,value);return row;}));
      document.querySelector('[data-home-headline]').textContent=data.example.headline;
      document.querySelector('[data-home-explanation]').textContent=data.example.explanation;
      document.querySelector('[data-home-caption]').textContent=data.example.caption;
      art.setAttribute('aria-label',data.example.consumer+' sample report. '+data.example.headline+' '+data.example.explanation);
      const source=document.querySelector('[data-home-source]');source.replaceChildren();
      if(data.example.source){const link=officialLink(data.example.source.url,data.example.source.title);source.append(link);}
      document.querySelector('[data-home-country]').textContent=data.country?'A clearer way forward · '+data.scope:'A clearer way forward';
      document.querySelector('[data-home-report-location]').textContent=data.country?'Your first step · '+data.scope:'Your first step';
      document.querySelector('[data-home-reports-note]').textContent=data.report_access_note;
      const reports=document.querySelector('[data-home-reports]');reports.replaceChildren(...data.free_reports.map(report=>{
        const link=officialLink(report.url,'');link.className='story-report-link';
        const copy=document.createElement('span'),heading=document.createElement('strong'),note=document.createElement('small'),arrow=document.createElement('span');
        heading.textContent=(data.country?'':report.country+' · ')+report.bureau;note.textContent=report.title;copy.append(heading,note);arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(copy,arrow);link.setAttribute('aria-label',report.title+' (opens in a new tab)');return link;
      }));
    }
    return data;
  });
  function officialLink(url,text){const target=new URL(url);if(target.protocol!=='https:')throw Error('Invalid report source.');const link=document.createElement('a');link.href=target.href;link.textContent=text;link.target='_blank';link.rel='noopener noreferrer';return link;}
  // Wait for the account script to synchronously scrub password-reset secrets.
  if(document.readyState==='complete')start();else document.addEventListener('DOMContentLoaded',()=>start(),{once:true});
  window.CRPHomepagePromise.catch(()=>{const note=document.querySelector('[data-home-reports-note]');if(note)note.textContent='Local report links could not be loaded. You can use the official report-access guides below.';});
})();
