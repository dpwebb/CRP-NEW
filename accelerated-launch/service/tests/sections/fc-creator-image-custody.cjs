'use strict';

const reader = require('../../north-america-disclosure-fields.cjs');
const { normalizePrintedDate } = require('../../general-intake.cjs');

function page() {
  const words=[];
  const add=(value,x,y,confidence=96)=>{
    for(const text of value.split(' ')){words.push({text,x0:x,y0:y,x1:x+text.length*5,y1:y+8,
      confidence,trusted:confidence>=70});x+=text.length*5+4;}
  };
  add('PUBLIC RECORDS (1)',50,25);add('REPORTABLE UNTIL',50,40);add('12/31/2030',50,55);
  add('COLLECTIONS (1)',50,90);add('NORTHERN RECOVERY AGENCY',60,115);add('IN COLLECTION',540,115);
  add('ORIGINAL CREDITOR',60,140);add('PLACED',230,140);
  add('DATE OF FIRST DELINQUENCY',380,140);add('BALANCE',650,140);
  add('HARBOR CREDIT',60,155);add('06/01/2018',230,155);add('(DOFD)',380,155);add('$740',650,155);
  add('01/15/2018',380,170);add('REPORTABLE UNTIL',60,185);add('07/14/2025',60,200);
  add('NOTICES',50,230);add('REPORTABLE UNTIL',50,245);add('12/31/2040',50,260);
  return {page:1,source:'LOCAL_OCR',words};
}

async function run(t,check){
  const positive=page(), mapped=reader.extract([positive],normalizePrintedDate);
  check.equal(mapped.records.length,1,'one own OCR collection card is read');
  const r=mapped.records[0];
  check.equal(r.kind,'GENERAL_COLLECTION','collection is not a tradeline');
  check.equal(r.facts['account.reported_identity'],'NORTHERN RECOVERY AGENCY','agency title owns collection identity');
  check.equal(r.facts['collection.originalCreditor'],'HARBOR CREDIT','original creditor remains a distinct role');
  check.equal(r.facts['tradeline.firstDelinquencyDate'],'2018-01-15','wrapped DOFD stays in its own caption column');
  check.equal(r.facts['collection.reportableUntilDate'],'2025-07-14','public-record and notice expiry dates are not borrowed');
  check.equal(r.facts['account.balance'],740,'own collection balance is preserved');
  check.equal(r.facts['collection.assignedDate'],undefined,'ambiguous placement order is not forced');
  check.equal(r.au_fields['collection.assignedDate'].interpretations.length,2,'placement alternatives remain preserved');
  check.equal(r.fact_sources['tradeline.firstDelinquencyDate'].location.source,'LOCAL_OCR','OCR sources are not marked native');
  check.equal(r.fact_sources['tradeline.firstDelinquencyDate'].location.word_evidence[0].confidence,96,'decisive word confidence survives');
  check.equal(r.report_reference_date,undefined,'partial capture does not manufacture a cover report date');
  const uncertain=page();uncertain.words.find(w=>w.text==='01/15/2018').trusted=false;
  const low=reader.extract([uncertain],normalizePrintedDate).records[0];
  check.equal(low.facts['tradeline.firstDelinquencyDate'],undefined,'untrusted decisive date is not promoted to a fact');
  check.equal(low.printed['tradeline.firstDelinquencyDate'].status,'EXTRACTION_UNRESOLVED','uncertain source reading is retained');
  const invoice=page();invoice.words=invoice.words.filter(w=>w.y0!==90);
  check.equal(reader.extract([invoice],normalizePrintedDate).records.length,0,'invoice captions without a collection section are not admitted as collection cards');
  const wrongCaption=page();wrongCaption.words.find(w=>w.text==='DELINQUENCY').text='ACTIVITY';
  check.equal(reader.extract([wrongCaption],normalizePrintedDate).records.length,0,'similar date caption is not substituted for first delinquency');
  const absentDate=page();absentDate.words=absentDate.words.filter(w=>w.text!=='01/15/2018');
  check.equal(reader.extract([absentDate],normalizePrintedDate).records.length,0,'placement and other expiry do not supply a missing DOFD');

  const general=require('../../general-intake.cjs'),ocr=require('../../ocr/local-ocr.cjs'),originalImageReader=ocr.readImage;
  const texts=['CREDIT ACCOUNTS','FICTIONAL RETAIL BANK CLOSED','ACCOUNT TYPE ACCOUNT NUMBER OWNERSHIP RESPONSIBILITY','Credit Card ****1234 Individual Individual','OPENED CLOSED LAST PAYMENT LAST ACTIVITY','15/03/2022 15/08/2024 15/08/2024 15/08/2024','STATUS STATUS DATE PAYMENT RATING HIGH CREDIT','Closed 15/08/2024 0 $500','Equifax Australia Consumer Credit Report'];
  function fakeReading(lines){const word_evidence=[],line_evidence=lines.map((text,i)=>{let x=30;const trusted=!/Equifax/.test(text),confidence=trusted?96:48,words=text.split(' ').map(value=>{const w={text:value,x0:x,y0:20+i*20,x1:x+value.length*5,y1:28+i*20,confidence,trusted};x=w.x1+6;word_evidence.push(w);return w;});return {text,words,x0:30,y0:20+i*20,x1:x,y1:28+i*20,confidence,min_confidence:confidence,trusted};});return {available:true,pages:[{page:1,lines,line_evidence,word_evidence}]};}
  try{ocr.readImage=()=>fakeReading(texts);const partial=general.extract({is_image:true,path:'fictional-ocr-custody.png',pages:[]});check.equal(partial.admitted,true,'measured partial credit-report structure survives an unverified small footer');check.equal(partial.bureau,'Unidentified reporting body (partial credit report)','low-confidence footer does not assert a verified issuer');check.equal(partial.evidence_readings.factual_view.source_issuer_identified,false,'unknown issuer is explicit in factual metadata');ocr.readImage=()=>fakeReading(['FICTIONAL INVOICE $100','Equifax']);check.equal(general.extract({is_image:true,path:'fictional-invoice.png',pages:[]}).admitted,false,'an untrusted issuer word on an invoice cannot establish report structure');}finally{ocr.readImage=originalImageReader;}
  return {inputs:'fictional OCR card geometry with distinct source roles, neighboring expiry dates and confidence controls',
    outcome:'bounded source-owned collection custody',boundaries:'no inferred reference date, date order, issuer, reinsertion or deletion'};
}
module.exports={id:'fc-creator-image-custody',title:'Small-image collection fields keep source roles, confidence and date custody',run};
