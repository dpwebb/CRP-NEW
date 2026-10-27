async (page)=>{
  if(new URL(page.url()).origin!=='http://127.0.0.1:4499')throw Error('FICTIONAL_LOOPBACK_ONLY');
  const region=page.getByRole('region',{name:'Mail health and backup alerts'}),results=[];
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await region.getByText('Mail backup is missing or stale',{exact:true}).waitFor();
    if(!await region.getByText('Email capture prepared; no message sent.',{exact:true}).isVisible())throw Error('CAPTURE_QUALIFICATION_MISSING');
    const geometry=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    if(geometry.document>width||geometry.body>width)throw Error('DOCUMENT_OVERFLOW '+JSON.stringify(geometry));
    await region.screenshot({path:'output/playwright/mail-monitor-'+width+'.png'});results.push({width,...geometry,alerts:2,captureOnly:true});
  }
  return {passed:true,scope:'Actual local Family UI with explicitly fictional native-contract upstreams; no hosted/email delivery proof',results};
}
