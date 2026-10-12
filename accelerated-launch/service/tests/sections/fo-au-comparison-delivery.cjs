'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {buildWordPdf}=require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const issues=require('../../issues.cjs');
const {pdfText}=require('../packet-pdf-assertions.cjs');

function fixture() {
  const words=[],put=(text,x,y)=>words.push({text,x,y});
  put('Australian Consumer Credit Report - FICTIONAL TEST DATA',30,20);
  put('Report date: 12 Jun 2026',30,42);put('Australia',30,58);
  put('Credit Account Information',30,80);
  const headers=['Creditor / account','Account no.','Type','Opened','Status as reported','Balance','Key dates','Remarks as shown on report'];
  const xs=[30,240,330,470,570,710,820,1090];headers.forEach((text,i)=>put(text,xs[i],100));
  const rows=[
    ['Fictional Native Loan','TEST-4100','Personal loan','15 May 2020','Open','AUD 0','Closed 04 Dec 2024','Closed account reporting as open'],
    ['Fictional Original Lender','TEST-5100','Consumer loan','15 May 2020','Closed / sold','AUD 0','Sold 11 Nov 2023','Transferred to purchaser'],
    ['Fictional Recovery','REC-5100','Debt purchaser','12 Nov 2023','Open collection','AUD 400','Original creditor Fictional Original Lender','Source relationship to original lender']
  ];
  rows.forEach((row,i)=>row.forEach((text,j)=>put(text,xs[j],125+i*25)));
  put('Defaults',30,210);
  const dh=['Credit provider','Account','Default date','Default amount','Paid date','Status','Last updated'],dx=[30,240,370,520,660,780,900];
  dh.forEach((text,i)=>put(text,dx[i],230));
  ['Fictional Native Loan','TEST-4100','12 Mar 2019','$132','-','Unpaid','31 May 2026'].forEach((text,i)=>put(text,dx[i],255));
  put('Credit Enquiries',30,285);
  const eh=['Date','Credit provider','Application type','Amount requested','Role'],ex=[30,200,460,710,900];
  eh.forEach((text,i)=>put(text,ex[i],305));
  ['12 Mar 2019','Fictional Requestor','Personal loan','$1,000','Applicant'].forEach((text,i)=>put(text,ex[i],330));
  put('Consumer statement and dispute history',30,360);
  put('- I dispute Fictional Recovery because it appears to duplicate the Fictional Original Lender account locator.',30,385);
  return buildWordPdf([{words}],{page_size:{width:1480,height:470},font_size:8,producer:'Fictional AU native disclosure test',creator:'CRP local test fixture'});
}
async function run(t,check) {
  const owner=await t.account('au-source-delivery@example.test'),foreign=await t.unpaidAccount('au-source-foreign@example.test');
  const id=(await t.request('POST','/api/cases',{token:owner.token,body:{country:'AU',region:'AU-NSW',bureau:'EQUIFAX'}})).json.case.case_id;
  const endpoint='/api/cases/'+id,bytes=fixture();
  const uploaded=await t.request('POST',endpoint+'/files',{token:owner.token,body:{originalFilename:'fictional-au-native-disclosure.pdf',mimeType:'application/pdf',declaredBytes:bytes.length,contentBase64:bytes.toString('base64')}});
  check.equal(uploaded.status,201,'unbranded source disclosure uploads without fabricated bureau branding');
  check.equal((await t.request('POST',endpoint+'/evaluate',{token:owner.token})).status,201,'native mapped disclosure reaches real assessment');
  const stored=t.service.store.state().results.find(row=>row.case_id===id);
  check.equal(stored.extraction.admitted,true,'native content is actually admitted, rather than only saved as an upload');
  check.equal(stored.extraction.bureau,'Unidentified Australian reporting body','test bureau selection does not invent the unbranded source issuer');
  const internal=issues.issuesFor({extraction:stored.extraction,evaluation:stored.evaluation});
  for(const kind of ['OPEN_CLOSED_STATEMENT','AU_MINIMUM_DEFAULT_REVIEW','AU_CATEGORY_RETENTION_REVIEW','DEFAULT_OPENING_ORDER_REVIEW','PURCHASER_RELATIONSHIP_REVIEW']) {
    const issue=internal.find(row=>row.concern_kind===kind);
    check.ok(issue,kind+' reaches source-linked results');
    check.ok(issue&&issues.isEligible(issue),kind+' qualifies for a selected factual packet');
  }
  const conflict=internal.filter(row=>row.check_id==='COMMON-ERROR-STATUS-DATE-CONTRADICTION');
  check.equal(conflict.length,1,'one underlying printed status/date contradiction produces one card');
  check.equal(conflict[0]?.confidence,'DEFINITE','definite printed inconsistency is preserved');
  check.ok(internal.filter(row=>row.concern_kind==='AU_CATEGORY_RETENTION_REVIEW').every(row=>row.classification==='NON_VIOLATION'),
    'qualified category reviews do not become definite statutory breaches');
  check.ok(!/ACCOUNT-[a-f0-9]{40,}|[a-f0-9]{64}/i.test(JSON.stringify(internal.map(issue=>issues.publicIssue(issue)))),
    'public cards never expose private locator matching tokens');
  const packet=(await t.request('GET',endpoint+'/packet',{token:owner.token})).json.view;
  const chosen=packet.eligible_issues.filter(row=>row.au_comparison_concern||internal.some(issue=>issue.issue_id===row.issue_id&&issue.au_comparison_concern));
  check.ok(chosen.length>=5,'new governed native concerns reach consumer selection');
  check.equal((await t.request('POST',endpoint+'/packet/select',{token:owner.token,body:{issue_ids:chosen.map(row=>row.issue_id)}})).status,200,'consumer selects only their source-backed issues');
  await t.preparePostalPacket(owner,id);
  const ready=(await t.request('GET',endpoint+'/packet',{token:owner.token})).json.view;
  check.ok(/please check/i.test(ready.packet.correspondence_preview),'review letter uses plain factual verification wording');
  check.ok(!/definitely illegal|identity theft|court has found/i.test(ready.packet.correspondence_preview),'letter invents no legal finding or identity-theft conclusion');
  check.equal((await t.request('POST',endpoint+'/packet/approve',{token:owner.token})).status,200,'consumer approves current reviewed packet');
  const downloaded=await t.request('GET',endpoint+'/packet-download',{token:owner.token});
  check.equal(downloaded.status,200,'approved packet downloads as a real PDF');
  const text=pdfText(downloaded.bytes);
  check.ok(/original lender|purchaser/i.test(text),'download keeps the genuine original/purchaser alternative');
  check.ok(/legitimate transfer/i.test(text),'packet preserves the material benign purchaser alternative');
  check.ok(/default date does not establish|first collected/i.test(text),'packet preserves the bureau-collection clock distinction');
  check.ok(!/not legal advice|COMMON-ERROR-|ACCOUNT-[a-f0-9]{20}/i.test(text),'generated letter adds no disclaimer, private matching token or internal check ID');
  check.equal((await t.request('GET',endpoint+'/packet-download',{token:foreign.token})).status,403,'foreign owner cannot access the packet');
  const evidence=path.join(__dirname,'../../out/au-comparison-fixes');fs.mkdirSync(evidence,{recursive:true});
  fs.writeFileSync(path.join(evidence,'fictional-native-packet.pdf'),downloaded.bytes);
  const revised=await t.request('POST',endpoint+'/packet/select',{token:owner.token,body:{issue_ids:chosen.slice(0,1).map(row=>row.issue_id)}});
  check.equal(revised.status,200,'consumer can revise selection');
  check.ok((await t.request('GET',endpoint+'/packet-download',{token:owner.token})).status!==200,'selection change invalidates prior packet approval');
  return {scope:'fictional unbranded native AU upload to selected reviewed PDF; no original-corpus cycles or external provider purchases'};
}
module.exports={run,fixture,id:'fo-au-comparison-delivery',title:'Native AU concerns preserve consumer selection, approval and packet safeguards'};
