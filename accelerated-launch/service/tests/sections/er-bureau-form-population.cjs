'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const forms = require('../../bureau-forms.cjs');
const lib = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
const { MAPS } = require('../../bureau-form-mappings.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function refusal(check, callback, predicate, label) {
  let caught;
  try { callback(); } catch (error) { caught = error; }
  check.ok(Boolean(caught && predicate(caught)), label);
}
const PROFILE = { full_name:'Zoë Fiction', given_name:'Zoë', family_name:'Fiction', middle_name:'Émile', suffix:'',
  address_line1:'12 Example Street', street_number:'12', street_name:'Example Street', address_line2:'4',
  city:'Halifax', region:'NS', postal_code:'B3H 0A0', date_of_birth:'1980-04-12', phone:'555-010-0000', contact_email:'zoe@example.test', previous_address:'' };
function payload(form, count=2) {
  const publicRecord=form.purpose==='PUBLIC_RECORD', personal=form.purpose==='PERSONAL';
  return { profile:{...PROFILE,...(form.country==='US'?{city:'Baltimore',region:'MD',postal_code:'21201'}:{})},
    settings:{purpose:form.purpose==='ALL'?'ACCOUNT':form.purpose,identity_reference:'123-45-6789',document_kinds:['SOCIAL_SECURITY','UTILITY_BILL']},
    correspondence:{consumer_name:PROFILE.full_name}, letter_date:'2026-10-09',
    items:Array.from({length:count},(_,i)=>({issue_id:`fictional-${i}`,letter_item:i+1,kind:publicRecord?'Collection':personal?'Personal information':'Credit account',
      name:'Fictional Agency '+(i+1),account_reference:'****123'+i,explanation:'The report shows two different closing dates. Please check both dates and correct the wrong one.',
      request:'Please check and correct this entry.',report_reference:'FICTIONAL-REPORT',source_location:'Page 2, lines 14-20',personal_fields:personal?['name']:[]})) };
}
function contentStreams(doc,page) {
  const value=page.node.lookup(lib.PDFName.of('Contents'));
  const streams=value instanceof lib.PDFArray?value.asArray().map(ref=>doc.context.lookup(ref)):[value];
  return streams.filter(s=>s instanceof lib.PDFRawStream).map(s=>Buffer.from(s.getContents()));
}
async function run(t,check) {
  const descriptors=[...forms.materialForms('CA','EQUIFAX','ACCOUNT'),...forms.materialForms('CA','EQUIFAX','PUBLIC_RECORD'),...forms.materialForms('CA','EQUIFAX','PERSONAL'),...forms.materialForms('CA','TRANSUNION','ACCOUNT'),...forms.materialForms('US','EQUIFAX','ACCOUNT'),...forms.materialForms('US','EXPERIAN','ACCOUNT')];
  for(const descriptor of descriptors) {
    const original=forms.bytesFor(descriptor), data=payload(descriptor), filled=forms.populateForm(descriptor,data), repeat=forms.populateForm(descriptor,data);
    check.equal(digest(original.bytes),descriptor.sha256,'verified original template bytes: '+descriptor.id);
    check.ok(filled.bytes.equals(repeat.bytes),'repeat rendering has identical approved bytes: '+descriptor.id);
    check.notEqual(filled.sha256,descriptor.sha256,'actual populated PDF differs from blank template: '+descriptor.id);
    check.equal(filled.template_sha256,descriptor.sha256,'populated output retains template identity: '+descriptor.id);
    check.equal(filled.sha256,digest(filled.bytes),'populated output hash matches exported bytes: '+descriptor.id);
    check.equal(forms.missingFormFields(descriptor,data).length,0,'complete profile has no invented extra prerequisite: '+descriptor.id);
    const source=await lib.PDFDocument.load(original.bytes), result=await lib.PDFDocument.load(filled.bytes);
    check.ok(result.getPageCount()>=source.getPageCount(),'original pages retained: '+descriptor.id);
    for(let i=0;i<source.getPageCount();i++) {
      const sourceStreams=contentStreams(source,source.getPage(i)), outputStreams=contentStreams(result,result.getPage(i));
      check.ok(sourceStreams.every(s=>outputStreams.some(o=>o.equals(s))),'original artwork content is preserved on page '+(i+1)+': '+descriptor.id);
    }
    const blank=forms.populateForm(descriptor,{profile:{},settings:{},items:[]});
    check.ok(blank.bytes.equals(original.bytes),'empty template rendering preserves exact original appearance: '+descriptor.id);
    if(t?.dataDir)fs.writeFileSync(path.join(t.dataDir,'populated-'+descriptor.filename),filled.bytes);
  }
  const tu=descriptors.find(f=>f.id==='ca-transunion'), tuData=payload(tu), filledTu=forms.populateForm(tu,tuData);
  const tuForm=(await lib.PDFDocument.load(filledTu.bytes)).getForm();
  check.equal(tuForm.getTextField('Name').getText(),'Zoë Fiction','native form contains non-ASCII consumer name');
  check.equal(tuForm.getTextField('Account1').getText(),'****1230','native field preserves printed masked number without inferring digits');
  check.equal(tuForm.getDropdown('Prov1').getSelected()[0],'NS','native original dropdown is selected');
  check.deepEqual(tuForm.getDropdown('Prov1').getOptions(),[' ','AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'],'original province options remain available');
  check.equal(tuForm.getRadioGroup('Would you like your investigation').getSelected(),'Mailed','mail preference uses original native option');
  check.equal(tuForm.getRadioGroup('request that it be incorporated into').getSelected(),undefined,'consumer consent is never selected automatically');
  check.equal(tuForm.getTextField('Signature').getText(),undefined,'consumer signature remains blank');
  check.equal(tuForm.getTextField('SIN').getText(),undefined,'generic Canadian nine-digit reference is not asserted as a SIN');
  check.ok(descriptors.filter(f=>f.country==='CA'&&f.bureau==='EQUIFAX').every(f=>!forms.populateForm(f,payload(f)).fields.some(value=>value.label==='identity reference')),'original Canadian SIN boxes stay blank without a specifically collected SIN');
  const alias=payload(tu);alias.profile.region='Québec';
  check.equal((await lib.PDFDocument.load(forms.populateForm(tu,alias).bytes)).getForm().getDropdown('Prov1').getSelected()[0],'QC','known full province name maps exactly to an original option');
  const unknown=payload(tu);unknown.profile.region='Unknown Province';
  check.ok(forms.missingFormFields(tu,unknown).some(s=>s.includes('province or territory')),'unknown province gives a readable request');
  check.deepEqual((await lib.PDFDocument.load(forms.populateForm(tu,unknown).bytes)).getForm().getDropdown('Prov1').getSelected().map(s=>s.trim()).filter(Boolean),[],'unsupported choice retains the original blank selection');
  const ex=descriptors.find(f=>f.id==='us-experian'), exData=payload(ex), exFilled=forms.populateForm(ex,exData);
  const exForm=(await lib.PDFDocument.load(exFilled.bytes)).getForm();
  check.equal(exForm.getRadioGroup('I believe this item is incorrect because (Choose only one)').getSelected(),'Other','general report-data concern selects accurate Other option');
  check.equal(exForm.getTextField('Your partial account number').getText(),'****1230','Experian uses original partial-account field');
  check.equal(exForm.getTextField('Social Security number:_1').getText(),'123','SSN first native comb section populated');
  check.equal(exForm.getTextField('Social Security number:_2').getText(),'45','SSN second native comb section populated');
  check.equal(exForm.getTextField('Social Security number:_3').getText(),'6789','SSN last native comb section populated');
  check.ok(forms.missingFormFields(ex,{profile:{full_name:'Zoë Fiction'}}).length===2,'full name does not silently invent required given/family name parts');
  const many=payload(ex,8);many.profile.given_name='Zoë '.repeat(35).trim();many.profile.full_name=many.profile.given_name+' Fiction';
  const large=forms.populateForm(ex,many);
  check.ok(large.continuation_count>=6&&large.page_count>2,'long names and more than original account capacity create linked printable continuation');
  check.ok(many.items.every(item=>large.fields.some(f=>f.value.includes(item.name))),'every selected company or agency survives original-form capacity');
  check.ok(large.fields.some(f=>f.value===many.profile.given_name+' Fiction'),'long complete consumer name survives small native field');
  const noNumber=payload(ex,1);noNumber.items[0].account_reference='';
  const noNumberFilled=forms.populateForm(ex,noNumber), noNumberForm=(await lib.PDFDocument.load(noNumberFilled.bytes)).getForm();
  check.equal(noNumberForm.getTextField('Your partial account number').getText(),'See letter item 1','report reference is not passed off as an account number');
  check.ok(noNumberFilled.fields.some(f=>f.value.includes('FICTIONAL-REPORT')&&f.value.includes('Page 2, lines 14-20')),'unprinted account number retains exact report identity and location');
  noNumber.items[0].source_location={page:2,line:14};
  const objectLocation=forms.populateForm(ex,noNumber);
  check.ok(objectLocation.fields.some(f=>f.value.includes('Page 2, line 14'))&&!objectLocation.fields.some(f=>f.value.includes('[object Object]')),'actual page-line object remains a readable source location');
  const mixed=payload(descriptors[0],2);mixed.items[1].kind='Collection';
  check.equal(forms.populateForm(descriptors[0],mixed).selected_item_count,1,'ordinary account form excludes collection entries');
  check.equal(forms.populateForm(descriptors[1],mixed).selected_item_count,1,'public-record form includes selected collection independently');
  for(const bad of [{...ex,bureau:'EQUIFAX'},{...ex,sha256:'0'.repeat(64)},{...ex,mapping_version:'old-renderer'},{...ex,filename:'../outside.pdf'}]) {
    refusal(check,()=>forms.populateForm(bad,exData),error=>error.code==='SERVICE_STATE_UNAVAILABLE','wrong bureau, source drift, stale mapping or path cannot fill an unrelated form');
  }
  refusal(check,()=>forms.populateForm(ex,{...exData,items:new Array(201).fill(exData.items[0])}),error=>error.code==='INVALID_REQUEST','form worker has an explicit selected-item bound');
  const edited=payload(ex);edited.profile.phone='555-019-9999';edited.profile.given_name='Renée';
  check.notEqual(forms.populateForm(ex,edited).sha256,exFilled.sha256,'material consumer input changes actual filled output');
  check.ok(Object.values(MAPS).every(map=>map.version),'each distinct original layout is versioned');
  const usEq=descriptors.find(f=>f.id==='us-equifax'), unitData=payload(usEq);unitData.profile.address_line2='Apartment 407';
  check.ok(forms.populateForm(usEq,unitData).fields.some(f=>f.label==='street name'&&f.value.includes('12 Example Street')&&f.value.includes('Apartment 407')),'US mailing street retains the consumer unit');
  const caEq=descriptors.find(f=>f.id==='ca-equifax-account'), freeStreet=payload(caEq);delete freeStreet.profile.street_number;delete freeStreet.profile.street_name;freeStreet.profile.address_line1='12345 Long Example Street with Complete Address';
  check.ok(forms.populateForm(caEq,freeStreet).fields.some(f=>f.value===freeStreet.profile.address_line1&&f.type==='CONTINUATION'),'unstructured complete street address survives a small original box without a new component gate');
  check.ok(forms.populateForm(usEq,unitData).fields.some(f=>f.label==='dispute details'&&f.value===unitData.items[0].request),'filled form uses the consumer letter request before internal evaluator wording');
}
module.exports={id:'er-bureau-form-population',title:'Original bureau templates, native controls, populated evidence and readable overflow',run};
