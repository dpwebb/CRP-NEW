'use strict';

// Governed, source-linked AU accuracy/currency reviews. Nothing here accepts an
// expected outcome, a filename or a consumer-document instruction as authority.
const crypto = require('node:crypto');
const {calendar:{addCalendarYears,daysInMonth},normalizeFactDate}=require('../adapters/evaluation-primitives.cjs');
const {sourceForField,reportDateValue} = require('./report-fact-sources.cjs');
const VERSION='2026-10-12.au-uk-review.3';
const CHECK_BY_KIND=Object.freeze({
  CREATOR_SUMMARY_COUNT_REVIEW:'COMMON-ERROR-CREATOR-SUMMARY-COUNT-REVIEW',
  CREATOR_SUMMARY_AMOUNT_REVIEW:'COMMON-ERROR-CREATOR-SUMMARY-AMOUNT-REVIEW',
  CREATOR_COMPLETED_DATE_REVIEW:'COMMON-ERROR-CREATOR-COMPLETED-DATE-REVIEW',
  CREATOR_DATE_SEQUENCE_REVIEW:'COMMON-ERROR-CREATOR-DATE-SEQUENCE-REVIEW',
  CREATOR_PAYMENT_DATE_REVIEW:'COMMON-ERROR-CREATOR-PAYMENT-DATE-REVIEW',
  CREATOR_CURRENT_PERIOD_REVIEW:'COMMON-ERROR-CREATOR-CURRENT-PERIOD-REVIEW',
  ACCOUNT_OWNERSHIP_REVIEW:'COMMON-ERROR-ACCOUNT-OWNERSHIP-REVIEW',
  ACCOUNT_STATUS_DISPUTE:'COMMON-ERROR-ACCOUNT-STATUS-DISPUTE',
  ACCOUNT_BALANCE_DISPUTE:'COMMON-ERROR-ACCOUNT-BALANCE-DISPUTE',
  INQUIRY_PURPOSE_REVIEW:'COMMON-ERROR-INQUIRY-PURPOSE-REVIEW',
  OLD_COLLECTION_REVIEW:'COMMON-ERROR-OLD-COLLECTION-REVIEW',
  OLD_COURT_ENTRY_REVIEW:'COMMON-ERROR-OLD-COURT-ENTRY-REVIEW',
  SOURCE_DATE_CHRONOLOGY_REVIEW:'COMMON-ERROR-SOURCE-DATE-CHRONOLOGY-REVIEW',
  AU_CATEGORY_RETENTION_REVIEW:'COMMON-ERROR-AU-CATEGORY-RETENTION-REVIEW',
  AU_MINIMUM_DEFAULT_REVIEW:'COMMON-ERROR-AU-MINIMUM-DEFAULT-REVIEW',
  HARDSHIP_PERIOD_REVIEW:'COMMON-ERROR-HARDSHIP-PERIOD-REVIEW',
  PURCHASER_RELATIONSHIP_REVIEW:'COMMON-ERROR-PURCHASER-RELATIONSHIP-REVIEW',
  DEFAULT_OPENING_ORDER_REVIEW:'COMMON-ERROR-DEFAULT-OPENING-ORDER-REVIEW',
  AU_POSTCODE_FORMAT:'COMMON-ERROR-AU-POSTCODE-FORMAT',
  GB_POSTCODE_FORMAT:'COMMON-ERROR-GB-POSTCODE-FORMAT',
  GB_DEFAULT_RETENTION_REVIEW:'COMMON-ERROR-GB-DEFAULT-RETENTION-REVIEW',
  DEFAULT_SETTLEMENT_ORDER_REVIEW:'COMMON-ERROR-DEFAULT-SETTLEMENT-ORDER-REVIEW',
  FINANCIAL_ASSOCIATION_REVIEW:'COMMON-ERROR-FINANCIAL-ASSOCIATION-REVIEW',
  COURT_STATUS_REVIEW:'COMMON-ERROR-COURT-STATUS-REVIEW',
  SETTLEMENT_BALANCE_REVIEW:'COMMON-ERROR-SETTLEMENT-BALANCE-REVIEW',
  OPEN_CLOSED_STATEMENT:'COMMON-ERROR-STATUS-DATE-CONTRADICTION',
  CORROBORATED_PRINTED_DUPLICATE:'COMMON-ERROR-DUPLICATE-REPORTING',
  DEFAULT_PAID_STATEMENT:'COMMON-ERROR-PAID-CLAIM-STATUS-REVIEW'
  ,CA_POSTAL_PROVINCE_REVIEW:'COMMON-ERROR-CA-POSTAL-PROVINCE-REVIEW'
  ,US_ZIP_STATE_REVIEW:'COMMON-ERROR-US-ZIP-STATE-REVIEW'
  ,CA_POSTCODE_FORMAT:'COMMON-ERROR-CA-POSTCODE-FORMAT'
  ,US_POSTCODE_FORMAT:'COMMON-ERROR-US-POSTCODE-FORMAT'
  ,US_STATE_FORMAT:'COMMON-ERROR-US-STATE-FORMAT'
  ,CA_PROVINCE_FORMAT:'COMMON-ERROR-CA-PROVINCE-FORMAT'
  ,CA_IDENTITY_ASSERTION_REVIEW:'COMMON-ERROR-CA-IDENTITY-ASSERTION-REVIEW'
  ,CA_BIRTH_DATE_CONFLICT:'COMMON-ERROR-CA-BIRTH-DATE-CONFLICT'
  ,CA_FILE_COUNT_REVIEW:'COMMON-ERROR-CA-FILE-COUNT-REVIEW'
  ,CA_INQUIRY_PERIOD_REVIEW:'COMMON-ERROR-CA-INQUIRY-PERIOD-REVIEW'
  ,CA_HISTORY_DATE_REVIEW:'COMMON-ERROR-CA-HISTORY-DATE-REVIEW'
  ,CA_COMPLETED_DATE_CONFLICT:'COMMON-ERROR-CA-COMPLETED-DATE-CONFLICT'
  ,CA_ASSIGNMENT_SEQUENCE_REVIEW:'COMMON-ERROR-CA-ASSIGNMENT-SEQUENCE-REVIEW'

  ,CA_PANEL_STATUS_REVIEW:'COMMON-ERROR-CA-PANEL-STATUS-REVIEW'
  ,CA_COLLECTION_PAIR_REVIEW:'COMMON-ERROR-CA-COLLECTION-PAIR-REVIEW'
  ,US_COURT_INCLUSION_REVIEW:'COMMON-ERROR-US-COURT-INCLUSION-REVIEW'
});
const KINDS=Object.freeze(Object.keys(CHECK_BY_KIND));
const STATUTE='https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html';
const CORRECTION='https://www.oaic.gov.au/privacy/your-privacy-rights/credit-reporting/correct-your-credit-report';
const POSTCODE='https://auspost.com.au/about-us/corporate-information/our-organisation/policies/assignment-of-postcodes';
const clean=value=>String(value??'').trim().replace(/\s+/g,' ');
const upper=value=>clean(value).toUpperCase();
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const namedDate=value=>new Date(value+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
function trustedLocation(loc) {
  const b=Array.isArray(loc?.bbox)?loc.bbox:loc?.bbox?[loc.bbox.x0,loc.bbox.y0,loc.bbox.x1,loc.bbox.y1]:[];
  return loc?.trusted===true && Number.isInteger(loc.page) && loc.page>0 && b.length===4 && b.every(Number.isFinite) && b[2]>b[0] && b[3]>b[1];
}
function own(record,field) {
  const source=sourceForField(record,field);
  if(!source || !trustedLocation(source.location) || record.source_file_id && source.location.file_id && source.location.file_id!==record.source_file_id
    || typeof record.facts?.[field]==='object'&&record.fact_sources?.[field]&&JSON.stringify(record.fact_sources[field].normalized_value)!==JSON.stringify(record.facts[field])
    || record.fact_sources?.[field]?.record_index != null && record.fact_sources[field].record_index!==record.record_index) return null;
  return {...source,field,record_index:record.record_index,trusted:true};
}
function dateReading(record,field) {
  const resolved=own(record,field);
  if(resolved) return {...resolved,interpretations:[resolved.normalized_value]};
  const candidates=Object.values(record.printed||{}).filter(item=>item.kind==='date' && ({'liability.openedDate':/OPENED|OPENED DATE/i,'reportedAccount.reportedDate':/REPORTED|LAST UPDATED|LAST REPORTED/i,'enquiry.requestDate':/ENQUIRY DATE|APPLICATION/i,'collection.lastReportedDate':/LAST REPORTED/i,'publicRecord.filedDate':/FILED/i}[field]||/$a/).test(item.label||''));
  if(new Set(candidates.map(item=>item.raw)).size>1||candidates.some(item=>item.location?.trusted===false))return null;
  const raw=record.au_fields?.[field] || candidates.find(item=>item.interpretations?.length || item.uncertainty?.interpretations?.length);
  if(!raw || !trustedLocation(raw.location)) return null;
  const rawValue=raw.raw, interpretations=raw.interpretations || raw.uncertainty?.interpretations || [];
  if(!interpretations.length || !interpretations.every(value=>/^\d{4}-\d{2}(?:-\d{2})?$/.test(value))) return null;
  return {field,source_field:raw.label,raw_value:rawValue,normalized_value:null,interpretations,
    location:raw.location,record_index:record.record_index,trusted:true};
}
function reportSource(extraction,record) {
  const ref=record?.report_reference_date || extraction.reference_date;
  if(!(ref?.raw??ref?.raw_value) || !trustedLocation(ref.location)||record?.source_file_id&&ref.location.file_id&&record.source_file_id!==ref.location.file_id) return null;
  return {field:'report.referenceDate',source_field:'Report date',raw_value:ref.raw??ref.raw_value,normalized_value:reportDateValue(ref),
    interpretations:ref.interpretations || (ref.alternative?[ref.normalized,ref.alternative]:(ref.normalized??ref.normalized_value)?[ref.normalized??ref.normalized_value]:[]),
    location:ref.location,record_index:record?.record_index??null,trusted:true};
}
function bounds(value) {
  if(!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value||'')) return null;
  if(value.length===10) return normalizeFactDate(value)?{earliest:value,latest:value}:null;
  const [y,m]=value.split('-').map(Number);if(m<1||m>12)return null;
  const day=daysInMonth(y,m);
  return {earliest:value+'-01',latest:value+'-'+String(day).padStart(2,'0')};
}
function shift(value,years,months=0) {
  const anniversary=years?addCalendarYears(value,years):value;
  const [y,m,d]=anniversary.split('-').map(Number),date=new Date(Date.UTC(y,m-1+months,1));
  const last=daysInMonth(date.getUTCFullYear(),date.getUTCMonth()+1);
  return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,'0'),String(Math.min(d,last)).padStart(2,'0')].join('-');
}
function expired(reading,at,years,months=1) {
  return (reading?.interpretations||[]).map(value=>bounds(value)).filter(Boolean)
    .map(range=>({anchor:range.latest,deadline:shift(range.latest,years,months),expired:at>shift(range.latest,years,months)}));
}
function correlatedLater(ref,update) {
  if(upper(ref.raw_value)===upper(update.raw_value))return false;
  const interpreted=(reading,convention)=>{
    const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(clean(reading.raw_value));
    if(!m)return reading.interpretations;
    const date=m[3]+'-'+String(convention==='DMY'?m[2]:m[1]).padStart(2,'0')+'-'+String(convention==='DMY'?m[1]:m[2]).padStart(2,'0');
    return reading.interpretations.includes(date)?[date]:[];
  };
  return ['DMY','MDY'].some(c=>interpreted(ref,c).some(date=>interpreted(update,c).some(value=>value>date)));
}
function signature(issue) {
  return hash({version:issue.source_version,kind:issue.concern_kind,check:issue.check_id,report:issue.report_identity,
    record:issue.record_index,confidence:issue.confidence,classification:issue.classification,source_facts:issue.source_facts,
    explanation:issue.explanation,uncertainty:issue.uncertainty,request:issue.request_wording,evidence:issue.evidence});
}
function issue(extraction,evaluation,record,kind,sources,title,explanation,uncertainty,request,evidence={},confidence='POTENTIAL',breach=false) {
  sources=sources.filter(Boolean);
  if(!sources.length || sources.some(source=>!trustedLocation(source.location)||source.trusted!==true)) return null;
  const report={bureau:record?.source_bureau||record?.bureau||extraction.bureau||'Unidentified reporting body',
    reference_date:reportDateValue(record?.report_reference_date||extraction.reference_date),
    file_id:record?.source_file_id||sources[0]?.location?.file_id||extraction.source_file_id||null,
    segment_id:record?.source_report_segment_id||record?.report_segment_id||null,jurisdiction:evaluation.region};
  if(!report.reference_date&&!report.file_id&&!report.segment_id) return null;
  const result={report_concern:true,au_comparison_concern:true,concern_kind:kind,check_id:CHECK_BY_KIND[kind],
    non_violation:!breach,classification:breach?'VIOLATION':'NON_VIOLATION',confidence,
    basis_type:breach?'FACTUAL_CONSISTENCY':'REPORT_CONCERN',consumer_label:breach?'VIOLATION':'NON-VIOLATION CONCERN',
    request_type:'VERIFICATION',request_wording:request,title,explanation,uncertainty,source_version:VERSION,
    record_index:record?.record_index??null,record:record?{kind:record.kind,kind_label:record.kind_label,record_index:record.record_index}:{kind:'REPORT_PERSONAL_DETAILS',kind_label:'report details'},
    report_identity:report,source_facts:sources,location:sources[0].location,evidence,
    concern_sources:evaluation.country==='AU'?[{publisher:'OAIC',title:'Correct your credit report',url:CORRECTION,version:VERSION}]:[],
    ...(breach?{rule_assessment:{classification:'VIOLATION',rule_id:CHECK_BY_KIND[kind],requirement:title,
      supporting_statutes:[],source_version:VERSION,required_facts:sources.map(source=>({field:source.field,source})),unresolved:uncertainty}}:{})};
  const fingerprint=signature(result);
  result.issue_id=hash(['au-review',kind,fingerprint]).slice(0,16);
  result.concern_assessment={schema_version:1,source_version:VERSION,kind,fingerprint};
  result.eligible=isGovernedIssue(result);
  return result;
}
function isGovernedIssue(value) {
  if(value?.au_comparison_concern!==true || !KINDS.includes(value.concern_kind) || value.source_version!==VERSION
    || value.check_id!==CHECK_BY_KIND[value.concern_kind] || !['DEFINITE','PROBABLE','POTENTIAL'].includes(value.confidence)
    || value.request_type!=='VERIFICATION'||!value.request_wording||!value.report_identity?.bureau
    || !Array.isArray(value.source_facts)||!value.source_facts.length
    || value.source_facts.some(source=>source.trusted!==true||source.raw_value==null||!trustedLocation(source.location)
      || value.report_identity.file_id&&source.location.file_id&&source.location.file_id!==value.report_identity.file_id)
    || value.classification==='VIOLATION' && (value.non_violation!==false||value.confidence!=='DEFINITE'||value.basis_type!=='FACTUAL_CONSISTENCY')
    || value.classification!=='VIOLATION' && (value.classification!=='NON_VIOLATION'||value.non_violation!==true||value.basis_type!=='REPORT_CONCERN')) return false;
  const fingerprint=signature(value);
  return value.concern_assessment?.fingerprint===fingerprint && value.issue_id===hash(['au-review',value.concern_kind,fingerprint]).slice(0,16);
}

function concernsFor(extraction,evaluation) {
  if(extraction?.support!=='ACTUAL_REPORT_EVIDENCE'||!['AU','CA','GB','US'].includes(evaluation?.country)
    ||!String(evaluation.region||'').startsWith(evaluation.country+'-')) return [];
  const australian=evaluation.country==='AU';
  const british=evaluation.country==='GB';
  const output=[],records=extraction.records||[], add=(...args)=>{const value=issue(extraction,evaluation,...args);if(value)output.push(value);};
  const assessment=evaluation.assessment_clock?.date||evaluation.assessment_date||evaluation.assessment_clock?.assessment_date||null;
  require('./creator-comparison-concerns.cjs').collect(extraction,evaluation,{own,dateReading,reportSource,add,assessment,shift});
  if(['CA','US'].includes(evaluation.country))require('./north-america-concerns.cjs').collect(extraction,evaluation,{own,dateReading,reportSource,issue,bounds,shift,expired,add,assessment});
  for(const record of records) {
    const identity=own(record,'account.reported_identity')||(record.kind==='GENERAL_INQUIRY'?own(record,'enquiry.organisation'):null),status=own(record,'account.status'),balance=own(record,'account.balance'),remark=own(record,'account.consumerStatement')||own(record,'account.reportRemarks');
    const text=clean(remark?.normalized_value),f=record.facts||{},ref=reportSource(extraction,record),reportDate=ref?.normalized_value;
    const closed=own(record,'liability.closedDate');
    if(identity&&status&&closed&&['OPEN','ACTIVE'].includes(upper(status.normalized_value))&&(record.au_source_mapping===true||record.uk_source_mapping===true)
      &&reportDate&&bounds(closed.normalized_value)?.latest<=bounds(reportDate)?.earliest)
      add(record,'OPEN_CLOSED_STATEMENT',[identity,status,closed,ref],'Open and closed account details conflict',
        'The same account is shown as open and has a source-reported closing date before this report.',
        'The printed details conflict. This does not establish that the account actually closed on that date or that a statute was breached.',
        'please verify the actual account status and closing date and correct the conflicting reported details',{},'DEFINITE',true);
    if(identity&&remark&&/consumer\s+(?:states|says|reports|disputes)[^.;]*(?:does not belong|not (?:their|my|mine)|did not open|not responsible|finance was declined and no agreement was signed)/i.test(text))
      add(record,'ACCOUNT_OWNERSHIP_REVIEW',[identity,remark],'Account ownership needs checking','The report records a consumer statement that this account is not theirs.','The statement does not establish who opened the account or prove identity theft.','please verify who opened and is responsible for this account, and correct or remove any account incorrectly linked to me');
    if(identity&&remark&&status&&/consumer[^.;]*disput(?:es|ed)[^.;]*(?:status|past due|resolution)|consumer[^.;]*disput(?:es|ed)[^.;]*resolved|I dispute[^.;]*repayment history/i.test(text))
      add(record,'ACCOUNT_STATUS_DISPUTE',[identity,status,remark,own(record,'account.rhiPeriod'),own(record,'account.rhiRating'),own(record,'account.soldDate')],'Account status needs checking',
        own(record,'account.rhiPeriod')&&own(record,'account.rhiRating')?`The report shows repayment rating ${own(record,'account.rhiRating').raw_value} for ${own(record,'account.rhiPeriod').raw_value} and records this account's repayment-history dispute.`:`The report shows ${status.raw_value} and records a dispute about this status or repayment history.`,
        'A sale, an undated good-payment code or a remaining balance alone does not disprove earlier late payments.','please verify the disputed status and any dated repayment history against the account records, and correct any inaccurate entries');
    if(identity&&remark&&balance&&/balance[^.;]*disput(?:ed|es)[^.;]*consumer|consumer[^.;]*disput(?:es|ed)[^.;]*balance/i.test(text))
      add(record,'ACCOUNT_BALANCE_DISPUTE',[identity,balance,remark],'Balance needs checking',`The report shows ${balance.raw_value} and records a consumer dispute about the balance.`,'The correct balance is unknown. Fees, interest or an over-limit amount may be valid.','please verify the reported balance against the account statements and correct it if inaccurate');
    if(identity&&remark&&status&&['OPEN','ACTIVE'].includes(upper(status.normalized_value))&&/\bclosed account reporting as open\b|\baccount[^;.]*closed\b/i.test(text)&&!own(record,'liability.closedDate')&&!/\bnot closed|never closed|will close|may close\b/i.test(text))
      add(record,'OPEN_CLOSED_STATEMENT',[identity,status,remark],'Open and closed status statements conflict','The same account is shown as open and described as closed.','This is a conflict in the printed statements. The actual closure date and status need checking.','please verify the account status and correct the conflicting open and closed descriptions',{},'DEFINITE',true);
    const inquiry=record.kind==='GENERAL_INQUIRY';
    const purpose=own(record,'enquiry.purpose'),authorized=own(record,'enquiry.authorized');
    if(identity&&inquiry&&(authorized&&/^NO$/i.test(clean(authorized.normalized_value))||remark&&/consumer[^.;]*(?:no credit application|not an application|soft quote|no application|only a quotation search was authori[sz]ed)/i.test(text)))
      add(record,'INQUIRY_PURPOSE_REVIEW',[identity,purpose,authorized,remark,dateReading(record,'enquiry.requestDate')],'Credit enquiry needs checking','The report contains an explicit authorization or application-purpose concern for this enquiry.',australian?'Consent is not required for every credit application access. The actual request, permitted purpose and notice need checking.':'The report statement does not establish why access occurred. The actual request, recorded purpose and meaning of the statement need checking.','please verify whether a credit application or other permitted access occurred, explain the enquiry purpose and notice, and correct any inaccurate enquiry');
    if((australian||british)&&identity&&record.kind==='GENERAL_COLLECTION') {
      const date=dateReading(record,'collection.lastReportedDate')||dateReading(record,'reportedAccount.reportedDate');
      const period=british?6:5;
      const reportDates=british?ref?.interpretations||[]:reportDate?[reportDate]:[];
      const comparisons=reportDates.flatMap(at=>expired(date,at,period,british?0:1));
      if(date&&reportDates.length&&comparisons.length&&comparisons.every(row=>row.expired)&&(!british||!dateReading(record,'default.defaultDate')))
        add(record,'OLD_COLLECTION_REVIEW',[identity,date,status,balance,ref],'Older collection entry needs checking',`The collection was last reported as ${date.raw_value} and appears in this report.`,british?'The source-owned Last Reported date is the determining fallback because an original default date is not available. Verify the category and original default; this fallback is not a statutory start date.':'Last reported and assigned dates are not the first bureau collection date. The correct category, current status and retention start remain to be verified.','please verify the current status and applicable retention start for this older collection, and correct or remove information that should no longer be reported',{period_years:period,determining_fallback:british,statutory_anchor_established:false,source:british?'https://ico.org.uk/for-the-public/credit/':STATUTE});
    }
    if((australian||british)&&identity&&record.kind==='GENERAL_PUBLIC_RECORD'&&/judg/i.test(f['publicRecord.type']||f['account.reported_identity']||'')) {
      const filed=dateReading(record,'publicRecord.filedDate'),made=own(record,'publicRecord.judgmentEntryDate');
      const reportDates=ref?.interpretations||[];
      const period=british?6:5;
      if(filed&&reportDates.length&&!made&&reportDates.every(at=>expired(filed,at,period,british?0:1).every(row=>row.expired)))
        add(record,'OLD_COURT_ENTRY_REVIEW',[identity,filed,ref,own(record,'account.status'),own(record,'publicRecord.amount')],'Older court entry needs checking',`This report includes a court entry dated ${filed.raw_value}.`,'The printed filing or record date is not necessarily the date judgment was made. A later judgment or a lawful retention exception may explain the entry.','please verify the judgment-made date, the applicable retention period and any retention exception, and remove or correct information that should no longer appear',{period_years:period,statutory_anchor_established:false,source:british?'https://www.gov.uk/county-court-judgments-ccj-for-debt/ccjs-and-your-credit-rating':STATUTE});
    }
    if(australian&&identity&&record.kind==='AU_DEFAULT_INFORMATION') {
      const amount=own(record,'default.originalAmount'),date=dateReading(record,'default.defaultDate'),currency=own(record,'account.currency');
      const foreignAmount=amount&&(/\b(?:CAD|USD|GBP)\b|[£€]/i.test(amount.raw_value)||currency&&currency.normalized_value!=='AUD');
      if(amount&&!foreignAmount&&typeof amount.normalized_value==='number'&&amount.normalized_value>=0&&amount.normalized_value<150)
        add(record,'AU_MINIMUM_DEFAULT_REVIEW',[identity,amount,currency,own(record,'report.category')],'Default amount needs checking',`The printed default amount is ${amount.raw_value}, below the $150 consumer-credit default minimum.`,'The original overdue total or information category may differ from a later remaining amount. Notices and the time overdue are not established.','please verify the originally eligible overdue amount and category of this default, and correct or remove any ineligible or inaccurate listing',{minimum:150,source:STATUTE},'PROBABLE');
      if(date&&reportDate&&expired(date,reportDate,5).some(row=>row.expired))
        add(record,'AU_CATEGORY_RETENTION_REVIEW',[identity,date,ref,amount,status],'Older default needs checking',`The report includes default information dated ${date.raw_value}.`,'The default date does not establish when the bureau first collected it. Later payment or update dates do not restart that clock. A retention exception may apply.','please verify when the bureau first collected this default information and whether it remains eligible to be reported, correcting or removing expired information',{category:'DEFAULT',period_years:5,statutory_anchor_established:false,source:STATUTE});
      const printedNote=own(record,'account.reportRemarks'),paymentNote=printedNote&&/paid in full/i.test(printedNote.normalized_value)?printedNote:remark;
      const paymentText=clean(paymentNote?.normalized_value);
      if(identity&&paymentNote&&status&&upper(status.normalized_value)==='UNPAID'&&/paid in full/i.test(paymentText)
        &&!/(?:not|partially|partly) paid|revers(?:ed|al)|returned payment|reopened|new advance/i.test(paymentText)) {
        const printedConflict=paymentNote===printedNote&&!/\bconsumer|\bcustomer|\bI\b|claims?|says|alleges|disputes/i.test(paymentText);
        add(record,'DEFAULT_PAID_STATEMENT',[identity,status,paymentNote,own(record,'default.paidDate')],printedConflict?'Default payment statements conflict':'Default payment status needs checking',
          'The default says unpaid while its own report note says paid in full.','The printed statements conflict; actual payment clearance and the meaning of the status still need verification. A historical default amount can remain.',
          'please verify the payment and update any inaccurate unpaid status while preserving valid historical information',{},printedConflict?'DEFINITE':'POTENTIAL',printedConflict);
      }
    }
    const history=own(record,'account.datedRepaymentHistory');
    if(australian&&identity&&history&&assessment&&reportDate) {
      const expiredCells=history.normalized_value.filter(cell=>cell.trusted===true&&trustedLocation(cell.location)&&trustedLocation(cell.period_location)
        &&shift(bounds(cell.period).latest,2,1)<assessment&&shift(bounds(cell.period).latest,2,1)>=reportDate);
      if(expiredCells.length) add(record,'AU_CATEGORY_RETENTION_REVIEW',[identity,history,ref],'Older repayment history: check your current file',`The report dated ${ref.raw_value} shows repayment months whose two-year periods appear to have ended by ${namedDate(assessment)}.`,'This PDF shows a past snapshot, not your current credit file. Exact payment due dates and retention exceptions still need checking.','please provide or check the current file and verify whether these older repayment-history months have now been removed or lawfully retained',{category:'RHI',period_years:2,months:expiredCells.map(cell=>cell.period),assessment_date:assessment,report_date:reportDate,current_file_contents_unknown:true,source:STATUTE});
    }
    if(australian&&identity&&record.kind==='AU_HARDSHIP_INFORMATION') {
      const periods=own(record,'hardship.periods'), latest=periods?.normalized_value?.[1];
      if(latest&&reportDate&&shift(bounds(latest).latest,1,1)<reportDate)
        add(record,'AU_CATEGORY_RETENTION_REVIEW',[identity,periods,ref,own(record,'hardship.indicator')],'Older hardship information needs checking','The reported hardship months are more than one year old.','Verify the actual monthly payment due dates and any retention exception. An account update does not restart each hardship month.','please verify the payment due dates and retention of these hardship months, and remove or correct information whose reporting period has ended',{category:'HARDSHIP',period_years:1,source:STATUTE},'PROBABLE');
    }
    if(australian&&identity&&inquiry&&ref) {
      const date=dateReading(record,'enquiry.requestDate')||dateReading(record,'enquiry.date'),comparisons=expired(date,reportDate,5);
      if(comparisons.some(row=>row.expired)) add(record,'AU_CATEGORY_RETENTION_REVIEW',[identity,date,ref,purpose],'Older credit enquiry needs checking',`The report lists a credit enquiry dated ${date.raw_value}.`,'Verify the actual information-request date and any lawful retention exception. Alternative numeric-date readings are retained.','please verify the date and purpose of this information request and correct or remove any enquiry outside its applicable period',{category:'ENQUIRY',period_years:5,date_alternatives:date.interpretations,comparisons,source:STATUTE},comparisons.every(row=>row.expired)?'PROBABLE':'POTENTIAL');
    }
  }
  for(const entry of extraction.report_concern_evidence||[]) {
    if(british&&entry.kind==='ADDRESS_COMPONENTS'&&entry.components?.country==='GB'&&entry.trusted===true&&trustedLocation(entry.location)) {
      const postal=upper(entry.components.postcode).replace(/\s/g,'');
      const valid=/^(?:GIR0AA|(?:ASCN|STHL|TDCU|BBND|BIQQ|FIQQ|SIQQ|PCRN)1ZZ|TKCA1ZZ|[A-PR-UWYZ](?:[A-HK-Y]?\d{1,2}|\d[A-HJKPSTUW]|[A-HK-Y]\d[ABEHMNPRVWXY])\d[ABD-HJLNP-UW-Z]{2})$/.test(postal);
      if(!valid&&!/^BFPO\d+$/.test(postal)) {
        const src={field:'report.addressPostcode',source_field:entry.source_field,raw_value:entry.raw_value,normalized_value:entry.components.postcode,location:entry.location,record_index:null,trusted:true};
        add(null,'GB_POSTCODE_FORMAT',[src],'UK postcode format does not match',`The address has postcode ${entry.components.postcode}, which does not match the supported UK postal format.`,'The correct postcode and address ownership are unknown. This does not establish identity theft.','please verify and correct the printed postcode for this address',{address_role:entry.role,postcode:entry.components.postcode},'DEFINITE',true);
      }
    }
    if(!australian||entry.kind!=='ADDRESS_COMPONENTS'||entry.components?.country!=='AU'||entry.trusted!==true||entry.postal_exception===true
      ||!trustedLocation(entry.location)||!entry.components.postcode||/^\d{4}$/.test(entry.components.postcode))continue;
    const src={field:'report.addressPostcode',source_field:entry.source_field,raw_value:entry.raw_value,
      normalized_value:entry.components.postcode,location:entry.location,record_index:null,trusted:true};
    add(null,'AU_POSTCODE_FORMAT',[src],'Australian postcode format does not match',`The Australian address has postcode ${entry.components.postcode}. Australian postcodes have four numeric digits.`,
      'The intended postcode is unknown. This finding is about the printed format, not identity theft or the correct replacement address.',
      'please verify and correct the Australian postcode for this address',{address_role:entry.role,postcode:entry.components.postcode,source:POSTCODE},'DEFINITE',true);
  }
  if(british) for(const record of records) {
    const id=own(record,'account.reported_identity'),statement=own(record,'account.reportRemarks'),status=own(record,'account.status'),settled=own(record,'account.settlementDate'),defaultReading=own(record,'default.defaultDate');
    const settledDate=dateReading(record,'account.settlementDate'),remaining=own(record,'account.balance');
    if(id&&status?.normalized_value==='SETTLED'&&remaining?.normalized_value>0&&settledDate&&!/partial|remaining balance agreed/i.test(statement?.raw_value||''))
      add(record,'SETTLEMENT_BALANCE_REVIEW',[id,status,remaining,settledDate],'Settlement and balance need checking','The account records settlement and still shows a positive current balance.','A partial settlement or another valid balance may explain this. Verify the settlement terms and current amount.','please verify the settlement status, date and remaining balance and correct any inaccurate details',{},'PROBABLE');
    if(id&&settled&&defaultReading&&defaultReading.normalized_value>settled.normalized_value)
      add(record,'DEFAULT_SETTLEMENT_ORDER_REVIEW',[id,settled,defaultReading,status],'Default and settlement dates conflict','The same account has a printed default date after its settlement date.','The printed dates conflict; the actual events and correct dates need verification.','please verify the settlement and original default dates and correct the conflicting reported details',{},'DEFINITE',true);
    if(id&&record.kind==='GENERAL_ASSOCIATION'&&statement&&/consumer[^.;]*(?:no joint account|never held joint credit)/i.test(statement.raw_value))
      add(record,'FINANCIAL_ASSOCIATION_REVIEW',[id,status,statement],'Financial association needs checking','The report shows a financial link that the consumer disputes.','The statement does not establish whether a joint account or guarantor relationship exists.','please verify the source and basis of this financial association and remove or correct any inaccurate link');
    if(id&&record.kind==='GENERAL_PUBLIC_RECORD'&&statement&&/satisfied[^.;]*;?\s*summary[^.]*unsatisfied/i.test(statement.raw_value))
      add(record,'COURT_STATUS_REVIEW',[id,status,statement],'Court status descriptions need checking','The report describes satisfied and unsatisfied statuses for the same court entry.','The separate panels are not independently reproduced here; verify the underlying record and current status.','please verify the court entry status and correct inconsistent satisfaction descriptions',{},'PROBABLE');
    const link=own(record,'collection.sourceOriginalLocator'),originals=records.filter(r=>r!==record&&r.facts?.['account.sourceLocatorToken']===link?.normalized_value);
    if(id&&link&&originals.length===1){const original=originals[0],balance=own(record,'account.balance'),oldBalance=own(original,'account.balance'),oldStatus=own(original,'account.status'),oldDefault=own(original,'default.defaultDate'),newDefault=own(record,'default.defaultDate');
      const dual=balance?.normalized_value>0&&oldBalance?.normalized_value>0&&oldDefault&&newDefault&&oldDefault.normalized_value===newDefault.normalized_value;
      const settlement=balance?.normalized_value>0&&oldBalance?.normalized_value===0&&own(original,'account.settlementDate')&&oldStatus?.normalized_value==='DEFAULT'&&statement&&/same source account/i.test(statement.raw_value);
      if(dual||settlement)add(record,'PURCHASER_RELATIONSHIP_REVIEW',[id,link,own(record,'collection.originalCreditor'),balance,oldBalance,oldStatus,oldDefault,newDefault,statement],'Original lender and purchaser reporting needs checking',dual?'The source-linked lender and purchaser show the same original default date and a positive balance on both entries.':'The source-linked original account records settlement while its purchaser still reports a balance.',
        'Two related entries may describe a legitimate transfer. Verify the account relationship, settlement and balances without treating all lender and purchaser pairs as duplicates.','please verify the source-linked original lender and purchaser entries and correct any duplicate balance or misleading settlement reporting',{original_record:original.record_index,duplicate_debt_established:false},dual?'PROBABLE':'POTENTIAL');
    }
    const defaultDate=dateReading(record,'default.defaultDate'),identity=own(record,'account.reported_identity'),ref=reportSource(extraction,record);
    if(!identity||!defaultDate||!ref?.interpretations?.length)continue;
    if(ref.interpretations.every(at=>expired(defaultDate,at,6,0).length&&expired(defaultDate,at,6,0).every(row=>row.expired)))
      add(record,'GB_DEFAULT_RETENTION_REVIEW',[identity,defaultDate,ref,own(record,'account.status'),own(record,'account.balance')],'Older default information needs checking',`The original default date ${defaultDate.raw_value} is more than six years before this report.`,
        'Verify the original default and applicable retention period. A later update or debt purchase does not restart that original date.','please verify the original default date and remove or correct default information that should no longer appear',{period_years:6,anchor_type:'ORIGINAL_DEFAULT',source:'https://ico.org.uk/for-the-public/credit/'},'PROBABLE');
  }
  // Same-creditor duplicate corroboration preserves raw identifying-date
  // alternatives without choosing a convention. Different facilities remain possible.
  const pairs=new Set();
  for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++) {
    const a=records[i],b=records[j];
    if(a.kind!=='GENERAL_ACCOUNT'||b.kind!==a.kind||a.source_file_id!==b.source_file_id||a.report_segment_id!==b.report_segment_id||a.location?.page!==b.location?.page)continue;
    const ai=own(a,'account.reported_identity'),bi=own(b,'account.reported_identity'),aid=own(a,'account.masked_identifier'),bid=own(b,'account.masked_identifier');
    const openedA=dateReading(a,'liability.openedDate'),openedB=dateReading(b,'liability.openedDate');
    if(!ai||!bi||!aid||!bid||!openedA||!openedB||ai.normalized_value!==bi.normalized_value||aid.normalized_value!==bid.normalized_value
      ||upper(openedA.raw_value)!==upper(openedB.raw_value)||hash(openedA.interpretations)!==hash(openedB.interpretations))continue;
    const supporting=['account.status','account.balance','account.creditLimit','account.type'].map(field=>[own(a,field),own(b,field)]);
    if(supporting.some(([x,y])=>x&&y&&hash(x.normalized_value)!==hash(y.normalized_value))||supporting.filter(([x,y])=>x&&y).length<2)continue;
    // Fully resolved pairs belong to the existing guarded duplicate producer.
    if(openedA.normalized_value&&openedB.normalized_value)continue;
    const key=ai.normalized_value+'|'+aid.normalized_value;if(pairs.has(key))continue;pairs.add(key);
    add(a,'CORROBORATED_PRINTED_DUPLICATE',[ai,bi,aid,bid,openedA,openedB,...supporting.flat().filter(Boolean)],'Repeated account entries need checking',
      'The report lists two rows with the same lender, last account digits, printed opening date and matching account details.',
      'They could be different accounts with the same last digits. The printed opening date could mean '+openedA.interpretations.map(value=>value.length===10?namedDate(value):value).join(' or ')+'.',
      'please verify whether these two rows describe one account and correct any duplicate reporting',{other_record:b.record_index,pairing_basis:'SAME_CREDITOR_REFERENCE_PRINTED_DATE_AND_INDEPENDENT_FACTS'},'PROBABLE');
  }
  for(const defaultRecord of records.filter(record=>australian&&record.kind==='AU_DEFAULT_INFORMATION')) {
    const locator=own(defaultRecord,'account.sourceLocatorToken');if(!locator)continue;
    const accounts=records.filter(record=>record.kind==='GENERAL_ACCOUNT'&&record.facts?.['account.sourceLocatorToken']===locator.normalized_value);
    if(accounts.length!==1)continue;
    const account=accounts[0],opened=own(account,'liability.openedDate'),date=own(defaultRecord,'default.defaultDate');
    if(opened&&date&&date.normalized_value<opened.normalized_value)
      add(account,'DEFAULT_OPENING_ORDER_REVIEW',[own(account,'account.reported_identity'),locator,own(account,'account.sourceLocatorToken'),opened,date],
        'Default and opening dates need checking','The same source account reference has a default date before its opening date.',
        'A replacement or refinanced facility, or a different meaning for opening date, may explain the order.',
        'please verify the original facility and date meanings and correct any inaccurate opening or default date',{default_record:defaultRecord.record_index},'PROBABLE');
  }
  for(const hardship of records.filter(record=>australian&&record.kind==='AU_HARDSHIP_INFORMATION')) {
    const locator=own(hardship,'account.sourceLocatorToken'),periods=own(hardship,'hardship.periods');
    if(!locator||!periods)continue;
    const accounts=records.filter(record=>record.kind==='GENERAL_ACCOUNT'&&record.facts?.['account.sourceLocatorToken']===locator.normalized_value);
    if(accounts.length!==1)continue;
    const account=accounts[0],history=own(account,'account.datedRepaymentHistory');
    if(!history)continue;
    const months=history.normalized_value.filter(cell=>cell.trusted===true&&trustedLocation(cell.location)&&trustedLocation(cell.period_location)&&cell.code==='A').map(cell=>cell.period);
    if(!months.length||months.every(month=>month>=periods.normalized_value[0]&&month<=periods.normalized_value[1]))continue;
    add(account,'HARDSHIP_PERIOD_REVIEW',[own(account,'account.reported_identity'),locator,periods,history],
      'Hardship periods need checking','The same account has different months in its hardship summary and its dated A indicators.',
      'Multiple arrangements or an incomplete summary may explain the difference. No arrangement dates have been invented.',
      'please verify which arrangement each hardship indicator describes and correct any inaccurate period associations',{dated_indicator_months:months,summary_months:periods.normalized_value});
  }
  for(const purchaser of records) {
    const claim=own(purchaser,'account.consumerStatement'),originalName=own(purchaser,'collection.originalCreditor'),link=own(purchaser,'collection.sourceOriginalLocator');
    if(!claim||!originalName||!link||!/^GENERAL_ACCOUNT$/.test(purchaser.kind)||!/I dispute[^.;]*duplicate[^.;]*(?:account|locator)/i.test(claim.normalized_value))continue;
    const originals=records.filter(record=>record.kind==='GENERAL_ACCOUNT'&&record.facts?.['account.sourceLocatorToken']===link.normalized_value);
    if(originals.length!==1)continue;
    const original=originals[0];
    add(purchaser,'PURCHASER_RELATIONSHIP_REVIEW',[own(purchaser,'account.reported_identity'),originalName,link,claim,own(purchaser,'account.balance'),own(original,'account.balance'),own(original,'account.status')],
      'Original lender and purchaser reporting needs checking','The consumer disputes the source-linked original lender and purchaser entries.',
      'An original lender with zero balance and a purchaser with a positive balance can be a legitimate transfer. This is not a finding of duplicate debt.',
      'please verify the original lender and purchaser relationship and correct any duplicate or misleading reporting while preserving a valid transfer',{original_record:original.record_index,duplicate_debt_established:false});
  }
  // Header ambiguity is a concrete chronology concern, kept once per own report.
  const seenReports=new Set();
  for(const record of records) {
    const ref=reportSource(extraction,record),update=dateReading(record,'reportedAccount.reportedDate');
    if(!ref?.interpretations?.length||ref.normalized_value||!update)continue;
    const key=record.source_file_id||record.report_segment_id||'report';
    if(seenReports.has(key)||!correlatedLater(ref,update))continue;
    add(record,'SOURCE_DATE_CHRONOLOGY_REVIEW',[ref,update,own(record,'account.reported_identity')],'Report and update dates need checking',`The printed report date ${ref.raw_value} could mean ${ref.interpretations.map(namedDate).join(' or ')}. One reading precedes the account update ${update.raw_value}.`,'Another valid numeric-date reading may resolve the chronology. The report date has not been replaced with the upload or assessment date.','please verify the report-issued date, its date convention and the account update dates, and correct any inaccurate dates',{report_date_alternatives:ref.interpretations,update_date_alternatives:update.interpretations});seenReports.add(key);
  }
  const reportGroups=new Map();
  for(const value of output.filter(value=>value.concern_kind==='AU_CATEGORY_RETENTION_REVIEW'&&value.evidence.category==='RHI')) {
    const key=hash(value.report_identity);
    if(!reportGroups.has(key))reportGroups.set(key,[]);
    reportGroups.get(key).push(value);
  }
  const replaced=new Set(),groupedIssues=[];
  for(const current of reportGroups.values()) {
    if(current.length<2)continue;
    const grouped=JSON.parse(JSON.stringify(current[0]));
    grouped.source_facts=current.flatMap(value=>value.source_facts);
    grouped.evidence.months=[...new Set(current.flatMap(value=>value.evidence.months))].sort();
    grouped.evidence.account_records=current.map(value=>value.record_index);
    const fingerprint=signature(grouped);grouped.issue_id=hash(['au-review',grouped.concern_kind,fingerprint]).slice(0,16);
    grouped.concern_assessment.fingerprint=fingerprint;grouped.eligible=isGovernedIssue(grouped);
    current.forEach(value=>replaced.add(value));groupedIssues.push(grouped);
  }
  const postalGroups=new Map();
  for(const value of output.filter(value=>value.concern_kind==='GB_POSTCODE_FORMAT')) {
    const key=hash(value.report_identity);if(!postalGroups.has(key))postalGroups.set(key,[]);postalGroups.get(key).push(value);
  }
  for(const current of postalGroups.values()) {
    if(current.length<2)continue;
    const grouped=JSON.parse(JSON.stringify(current[0]));grouped.source_facts=current.flatMap(value=>value.source_facts);
    grouped.evidence.addresses=current.map(value=>value.evidence);grouped.explanation='The reported UK postcodes '+[...new Set(current.map(value=>value.evidence.postcode))].join(', ')+' do not match the supported postal format.';
    const fingerprint=signature(grouped);grouped.issue_id=hash(['au-review',grouped.concern_kind,fingerprint]).slice(0,16);grouped.concern_assessment.fingerprint=fingerprint;grouped.eligible=isGovernedIssue(grouped);
    current.forEach(value=>replaced.add(value));groupedIssues.push(grouped);
  }
  const defaultGroups=new Map();
  for(const value of output.filter(value=>value.concern_kind==='GB_DEFAULT_RETENTION_REVIEW')){
    const record=records.find(r=>r.record_index===value.record_index),locator=record?.facts?.['collection.sourceOriginalLocator']||record?.facts?.['account.sourceLocatorToken'];if(!locator)continue;
    const key=hash([value.report_identity,locator]);if(!defaultGroups.has(key))defaultGroups.set(key,[]);defaultGroups.get(key).push(value);
  }
  for(const current of defaultGroups.values()){
    if(current.length<2)continue;const grouped=JSON.parse(JSON.stringify(current[0]));grouped.source_facts=current.flatMap(value=>value.source_facts);grouped.evidence.related_records=current.map(value=>value.record_index);
    const fingerprint=signature(grouped);grouped.issue_id=hash(['au-review',grouped.concern_kind,fingerprint]).slice(0,16);grouped.concern_assessment.fingerprint=fingerprint;grouped.eligible=isGovernedIssue(grouped);current.forEach(value=>replaced.add(value));groupedIssues.push(grouped);
  }
  return output.filter(value=>value&&!replaced.has(value)).concat(groupedIssues);
}
module.exports={VERSION,KINDS,CHECK_BY_KIND,concernsFor,isGovernedIssue,own,dateReading,reportSource,issue,bounds,shift,expired};
