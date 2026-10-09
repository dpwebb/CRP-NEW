'use strict';
// This isolated, local worker receives private values only through stdin, never through argv or files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const lib = require('./pdf-vendor/pdf-lib-1.17.1.min.js');
const fontkit = require('./pdf-vendor/fontkit-1.1.1.min.js');
const { MAPS, province } = require('./bureau-form-mappings.cjs');
const { PDFDocument, PDFTextField, PDFDropdown, PDFOptionList, PDFCheckBox, PDFRadioGroup, PDFSignature, rgb } = lib;
const ROOT = path.join(__dirname, 'bureau-forms');
const clean = value => String(value ?? '').normalize('NFC').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
const single = value => clean(value).replace(/\s+/g,' ');
const dateUs = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(5,7)}/${value.slice(8)}/${value.slice(0,4)}` : value;
const digits = value => clean(value).replace(/[^0-9]/g,'');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function location(value) {
  if(typeof value==='string')return clean(value);
  if(value&&typeof value==='object')return [value.page!=null?`Page ${clean(value.page)}`:'',value.line!=null?`line ${clean(value.line)}`:''].filter(Boolean).join(', ');
  return '';
}

function inventory(form) {
  return form.getFields().map(f => ({ name:f.getName(), type:f instanceof PDFTextField?'TEXT':f instanceof PDFDropdown?'DROPDOWN':f instanceof PDFOptionList?'OPTIONS':f instanceof PDFCheckBox?'CHECKBOX':f instanceof PDFRadioGroup?'RADIO':f instanceof PDFSignature?'SIGNATURE':'OTHER',
    read_only:f.isReadOnly(), ...(typeof f.getOptions==='function'?{options:f.getOptions()}:{}),
    widgets:f.acroField.getWidgets().map(w=>w.getRectangle()) }));
}
function applicableItems(descriptor, payload) {
  const items=payload.items || [];
  if(descriptor.purpose==='ALL') return items;
  return items.filter(item=>{
    const kind=single(item.kind).toLowerCase();
    if(descriptor.purpose==='ACCOUNT') return !/collection|judgment|bankrupt|public.record|tax.lien|personal|identity/.test(kind);
    if(descriptor.purpose==='PUBLIC_RECORD') return /collection|judgment|bankrupt|public.record|tax.lien|consolidated|recovery/.test(kind);
    return /personal|identity|name|address/.test(kind) || payload.settings?.purpose==='PERSONAL' || payload.settings?.purpose==='NEW_ADDRESS';
  });
}
function groupAccountItems(items) {
  const result=[], byRecord=new Map();
  for(const item of items) {
    const index=item.record_index;
    const key=Number.isInteger(index)&&index>=0?`number:${index}`:typeof index==='string'&&index.length?`string:${index}`:null;
    if(key===null||!byRecord.has(key)) {result.push(item);if(key!==null)byRecord.set(key,result.length-1);continue;}
    const at=byRecord.get(key), first=result[at], members=[...(first.form_items||[first]),item];
    result[at]={...first,form_items:members,
      name:[...new Set(members.map(value=>clean(value.name)).filter(Boolean))].join(' / '),
      account_reference:[...new Set(members.map(value=>clean(value.account_reference)).filter(Boolean))].join(' / ')};
  }
  return result;
}

async function populate(descriptor, payload) {
  const map=MAPS[descriptor.id];
  if(!map) throw new Error('MAPPING');
  const original=fs.readFileSync(path.join(ROOT,descriptor.filename));
  if(hash(original)!==descriptor.sha256) throw new Error('TEMPLATE');
  const doc=await PDFDocument.load(original,{updateMetadata:false});
  if(doc.getPageCount()!==map.pages) throw new Error('PAGES');
  doc.registerFontkit(fontkit);
  const fontBytes=fs.readFileSync(path.join(__dirname,'packet-fonts','NotoSans-Regular.ttf'));
  const face=fontkit.create(fontBytes), font=await doc.embedFont(fontBytes,{subset:true});
  const form=doc.getForm(), native_fields=inventory(form), fields=[], continued=[];
  const pages=doc.getPages(), profile=payload.profile||{}, settings=payload.settings||{}, items=applicableItems(descriptor,payload);
  const personalItems=items.filter(item=>/personal|identity/.test(single(item.kind).toLowerCase()));
  const accountItems=groupAccountItems(items.filter(item=>!personalItems.includes(item)));
  // Unsupported glyphs are refused rather than silently printed as empty boxes.
  const validate=value=>{for(const ch of clean(value)) if(!/\s/.test(ch)&&!face.hasGlyphForCodePoint(ch.codePointAt(0))) throw new Error('GLYPH');};
  function record(label,value,printed,page,type='OVERLAY',field) { fields.push({label,value:clean(value),printed_value:clean(printed),page:page+1,type,...(field?{field}:{})}); }
  function overflow(label,value,context) { continued.push({label,value:clean(value),...(context?{context}:{})}); }
  function wrap(value,width,size) {
    const lines=[];
    for(const paragraph of clean(value).split(/\r?\n/)) {
      let line='';
      for(const ch of paragraph) {
        if(line && font.widthOfTextAtSize(line+ch,size)>width) { const at=line.lastIndexOf(' '); if(at>0){lines.push(line.slice(0,at)); line=line.slice(at+1);}else{lines.push(line);line='';} }
        line+=ch;
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }
  function overlay(label,value,b,context) {
    value=clean(value); if(!value) return;
    validate(value);
    let printed=value, size=10, lines;
    if(b.date_parts&&/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      value.split('-').forEach((part,i)=>pages[b.page].drawText(part,{x:b.x+i*b.width/3+4,y:b.y+(b.height-10)/2+1,size:10,font,color:rgb(0,0,0)}));
    }else if(b.cells) {
      const maxRows=Math.max(1,Math.floor(b.height/18));
      const capacity=b.cells*maxRows;
      if([...value].length>capacity) {overflow(label,value,context); printed=capacity>=8?'SEE PAGE':capacity>=4?'PAGE':'*';}
      const chars=[...printed], cellWidth=b.width/b.cells, rows=Math.max(1,Math.ceil(chars.length/b.cells));
      size=Math.min(10,Math.max(8,b.height/rows*.55));
      chars.forEach((ch,i)=>{const col=i%b.cells,row=Math.floor(i/b.cells),position=b.positions?.[i]; pages[b.page].drawText(ch,{x:position?position[0]+(position[2]-font.widthOfTextAtSize(ch,size))/2:b.x+col*cellWidth+(cellWidth-font.widthOfTextAtSize(ch,size))/2,y:position?position[1]+(position[3]-size)/2+1:b.y+b.height-(row+1)*(b.height/Math.max(maxRows,rows))+(b.height/Math.max(maxRows,rows)-size)/2+1,size,font,color:rgb(0,0,0)});});
    }else{
      for(size=10;size>=8;size-=.5) {lines=wrap(value,b.width-6,size);if(lines.length*(size+2)<=b.height-2) break;}
      if(size<8) {overflow(label,value,context);printed='See attached page';size=8;lines=wrap(printed,b.width-6,size);}
      lines.forEach((line,i)=>pages[b.page].drawText(line,{x:b.x+3,y:b.y+b.height-2-size-i*(size+2),size,font,color:rgb(0,0,0)}));
    }
    record(label,value,printed,b.page,'OVERLAY');
  }
  function mark(label,coord) {const [page,x,y]=coord; pages[page].drawText('X',{x:x-2,y:y-4,size:9,font,color:rgb(0,0,0)}); record(label,'Selected','X',page,'CHECKBOX');}
  function nativeText(name,value,label=name,context) {
    value=clean(value); if(!value)return;
    validate(value);
    const field=form.getField(name); if(!(field instanceof PDFTextField)||field.isReadOnly()) throw new Error('FIELD');
    const widgets=field.acroField.getWidgets(), bounds=widgets.map(w=>w.getRectangle());
    const width=Math.min(...bounds.map(b=>b.width))-5,height=Math.min(...bounds.map(b=>b.height))-3;
    let printed=single(value),size=10;
    if(field.isMultiline()) {
      for(size=10;size>=8;size-=.5) if(wrap(printed,width,size).length*(size+2)<=height)break;
    }else size=Math.min(10,height*.85,(width/font.widthOfTextAtSize(printed,10))*10);
    if(size<8){overflow(label,value,context);const max=field.getMaxLength();printed=max&&max<8?'*':'See page';size=8;}
    field.setText(printed);field.setFontSize(size);
    if(descriptor.id==='us-experian'&&name.startsWith('Other - Must explain:')) {
      // The original widget lies partly below its printed underline. Keep that widget and
      // position its text above the line; do not move/recreate the bureau's page artwork.
      size=Math.min(size,8);
      field.updateAppearances(font,(f,w,face)=>[lib.beginText(),lib.setFillingRgbColor(0,0,0),lib.setFontAndSize(face.name,size),lib.moveText(2,5),lib.showText(face.encodeText(printed)),lib.endText()]);
    }else field.updateAppearances(font);
    const widgetRef=widgets[0].P(),page=Math.max(0,pages.findIndex(p=>p.ref.toString()===widgetRef?.toString()));
    record(label,value,printed,page,'TEXT',name);
  }
  function nativeNameParts() {
    const parts=map.name_columns.map(column=>({...column,value:clean(profile[column.key])}));
    if(!parts.some(part=>part.value))return;
    const field=form.getTextField('Name'), widget=field.acroField.getWidgets()[0], bounds=widget.getRectangle();
    const page=Math.max(0,pages.findIndex(p=>p.ref.toString()===widget.P()?.toString()));
    for(const part of parts) {
      validate(part.value);part.printed=part.value;
      part.size=part.value?Math.min(10,(part.width/font.widthOfTextAtSize(part.value,10))*10):10;
      if(part.size<8){overflow(part.label,part.value);part.printed='See page';part.size=8;}
      if(part.value)record(part.label,part.value,part.printed,page,'TEXT','Name');
    }
    // Keep the source's single widget. Each explicit component is displayed above its
    // own printed Last / First / Middle / Jr-Sr label, with no inferred name split.
    field.setText(parts.map(part=>part.value).filter(Boolean).join(' '));field.setFontSize(10);
    field.updateAppearances(font,()=>parts.filter(part=>part.printed).flatMap(part=>[
      lib.beginText(),lib.setFillingRgbColor(0,0,0),lib.setFontAndSize(font.name,part.size),
      lib.moveText(part.x-bounds.x,(bounds.height-part.size)/2+1),lib.showText(font.encodeText(part.printed)),lib.endText()
    ]));
  }
  function nativeChoice(name,value,label=name) {
    const field=form.getField(name);
    if(!(field instanceof PDFDropdown||field instanceof PDFRadioGroup||field instanceof PDFOptionList)||field.isReadOnly()||!field.getOptions().includes(value)) return false;
    field.select(value);
    if(field instanceof PDFDropdown){field.setFontSize(9);field.updateAppearances(font);}
    if(field instanceof PDFRadioGroup) {
      // These bureau radio groups are drawn as square checkboxes. Preserve their Off
      // appearances and export values; supply an embedded-font X for the selected value.
      // The original On appearance depends on an unembedded Symbol font on some hosts.
      for(const w of field.acroField.getWidgets()) {
        const on=w.getOnValue();if(!on||w.getAppearanceState()?.toString()!==on.toString())continue;
        const {width,height}=w.getRectangle(),size=Math.min(width,height)*.8;
        const ops=[lib.beginText(),lib.setFillingRgbColor(0,0,0),lib.setFontAndSize(font.name,size),lib.moveText((width-font.widthOfTextAtSize('X',size))/2,(height-size)/2+1),lib.showText(font.encodeText('X')),lib.endText()];
        const stream=doc.context.formXObject(ops,{BBox:doc.context.obj([0,0,width,height]),Resources:doc.context.obj({Font:{[font.name]:font.ref}})});
        w.getNormalAppearance().set(on,doc.context.register(stream));
      }
    }
    const widget=field.acroField.getWidgets()[0],page=Math.max(0,pages.findIndex(p=>p.ref.toString()===widget.P()?.toString()));
    record(label,value,value,page,field instanceof PDFRadioGroup?'RADIO':'DROPDOWN',name);return true;
  }
  const fullName=clean(profile.full_name||payload.correspondence?.consumer_name);
  const streetName=clean(descriptor.country==='US'?[profile.address_line1,profile.address_line2].filter(Boolean).join(', '):
    descriptor.id==='ca-equifax-public-record'?[profile.street_name||profile.address_line1,profile.address_line2].filter(Boolean).join(', '):profile.street_name||profile.address_line1);
  const letterNumbers=item=>[...new Set((item.form_items||[item]).map(member=>member.letter_item||items.indexOf(member)+1))];
  const numberList=values=>values.length<3?values.join(' and '):values.slice(0,-1).join(', ')+' and '+values.at(-1);
  const itemReason=item=>item.form_items?item.form_items.map(member=>`Item ${letterNumbers(member)[0]}: ${clean(member.request||member.explanation||'Please check this entry.')}`).join('\n'):
    clean(item.request||item.explanation||`Please check this entry. See item ${letterNumbers(item)[0]} in my letter.`);
  const itemLink=item=>`See ${letterNumbers(item).length>1?'items':'item'} ${numberList(letterNumbers(item))} in my letter for the details and copies.`;
  const accountValue=item=>item.account_reference||`See letter ${letterNumbers(item).length>1?'items':'item'} ${numberList(letterNumbers(item))}`;
  for(const item of accountItems)if(!item.account_reference)overflow('Entry without a printed account number',`${item.name||'Entry'}\nReport reference: ${item.report_reference||'See attached report'}\nLocation: ${location(item.source_location)||'See the marked copy with my letter'}\n${itemLink(item)}`);
  if(descriptor.country==='US'&&settings.no_ssn_issued)overflow('Social Security number','I have never been issued a Social Security number.');
  if(map.mode==='ORIGINAL_OVERLAY') {
    for(const [key,b] of Object.entries(map.profile)) {
      let value=key==='identity_reference'?settings.identity_reference:key==='street_name'?streetName:profile[key];
      if(key==='date_of_birth')value=descriptor.country==='US'?digits(dateUs(clean(value))):digits(value);
      if(key==='phone')value=digits(value);
      if(key==='postal_code'&&descriptor.country==='CA')value=clean(value).replace(/\s+/g,'');
      if(key==='region'&&descriptor.country==='CA')value=province(value)||value;
      if(key==='middle_name'&&descriptor.country==='US')value=clean(value).slice(0,1);
      // Canada only stores a generic identification reference. It is not an attested SIN.
      if(key==='identity_reference')value=descriptor.country==='US'&&digits(value).length===9&&/^[\d\s-]+$/.test(clean(value))?digits(value):'';
      if(descriptor.id==='ca-equifax-public-record'&&key==='date_of_birth')value=clean(profile.date_of_birth);
      overlay(key.replace(/_/g,' '),value,b);
    }
    if(profile.previous_address&&map.previous_address)overlay('previous address',profile.previous_address,map.previous_address);
    if(payload.letter_date&&map.letter_date)overlay('letter date',descriptor.id==='ca-equifax-public-record'?payload.letter_date:digits(payload.letter_date),map.letter_date);
    if(map.proof_choices)for(const kind of settings.document_kinds||[])if(map.proof_choices[kind])mark(`Proof: ${kind}`,map.proof_choices[kind]);
    if(map.update_choice&&items.length)mark('Update the details of an existing public record',map.update_choice);
    if(map.record_choices) {
      const chosen=new Set();
      for(const item of items){const kind=single(item.kind).toLowerCase();const k=/collection/.test(kind)?'collection':/bankrupt/.test(kind)?'bankruptcy':/judgment/.test(kind)?'judgment':/consolidated/.test(kind)?'consolidated':/recovery/.test(kind)?'recovery':null;if(k&&!chosen.has(k)){mark(`Record type: ${k}`,map.record_choices[k]);chosen.add(k);}}
    }
    if(map.personal_choices) {
      const selected=new Set();
      for(const item of items){for(const key of item.personal_fields||[])if(!selected.has(key)&&map.personal_choices[key]){mark(`Update ${key}`,map.personal_choices[key]);selected.add(key);}}
    }
    for(let i=0;i<Math.min(accountItems.length,map.capacity);i++) {
      const item=accountItems[i],slot=map.slots[i],context=`${item.name||'Entry'} - ${item.account_reference||'account number not printed'} - letter item ${item.letter_item||i+1}`;
      overlay('company or agency',item.name,slot.name,context);overlay('account reference',accountValue(item),slot.account,context);
      if(slot.reason)overlay('reason',descriptor.id==='us-equifax'?itemLink(item):`${itemReason(item)} ${itemLink(item)}`,slot.reason,context);
      if(slot.details)overlay('dispute details',itemReason(item),slot.details,context);
      if(slot.other)mark('Other or multiple updates required',slot.other);
    }
    if(map.comments&&items.length)overlay('comments',`Please check the entries listed in my attached letter. The letter explains what I am disputing and includes my supporting copies.`,map.comments);
  }else if(descriptor.id==='ca-transunion') {
    nativeNameParts();nativeText('Address',profile.address_line1,'street address');nativeText('Apartment',profile.address_line2,'unit or apartment');nativeText('City',profile.city,'city');nativeText('Postal Code',profile.postal_code,'postal code');
    if(profile.region&&!nativeChoice('Prov1',province(profile.region),'province'))overflow('province',profile.region);
    nativeText('Address2',profile.previous_address,'previous address');nativeText('DOB',dateUs(clean(profile.date_of_birth)),'date of birth');nativeText('Home Phone optional',profile.phone,'phone');nativeText('EMail',profile.contact_email,'email');
    // The optional SIN is left blank: this app has not collected a specifically identified SIN.
    if(fullName||items.length)nativeChoice('Would you like your investigation','Mailed','Results by mail');nativeText('Date',dateUs(clean(payload.letter_date)),'letter date');
    for(let i=0;i<Math.min(6,accountItems.length);i++){const item=accountItems[i],context=`${item.name} - ${item.account_reference||'number not printed'}`;nativeText('Company'+(i+1),item.name,'company or agency',context);nativeText('Account'+(i+1),accountValue(item),'account reference',context);nativeText('Other'+(i+1),item.form_items?`${itemReason(item)}\n${itemLink(item)}`:itemLink(item),'reason',context);}
    if(items.length)nativeText('AdditionalComments','Please read my attached letter. It explains each entry I am disputing and includes supporting copies.','additional comments');
  }else if(descriptor.id==='us-experian') {
    nativeText('Name:',[profile.given_name,profile.family_name].filter(Boolean).join(' '),'name');nativeText('Middle Initial:',clean(profile.middle_name).slice(0,1),'middle initial');nativeText('Generation:',profile.suffix,'suffix');nativeText('Date of Birth',dateUs(clean(profile.date_of_birth)),'date of birth');
    nativeText('Mailing Address',[profile.address_line1,profile.address_line2,[profile.city,profile.region,profile.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', '),'mailing address');
    nativeText('Enter email',profile.contact_email,'email');
    const ssn=digits(settings.identity_reference);if(ssn.length===9&&/^[\d\s-]+$/.test(clean(settings.identity_reference))) {nativeText('Social Security number:_1',ssn.slice(0,3),'SSN first part');nativeText('Social Security number:_2',ssn.slice(3,5),'SSN middle part');nativeText('Social Security number:_3',ssn.slice(5),'SSN last part');}
    if(profile.previous_address)overflow('previous addresses',profile.previous_address);
    for(let i=0;i<Math.min(accountItems.length,3);i++){const suffix=i?'_'+i:'',item=accountItems[i],context=`${item.name} - ${item.account_reference||'number not printed'}`;nativeText('Company name'+suffix,item.name,'company or agency',context);nativeText('Your partial account number'+suffix,accountValue(item),'account reference',context);nativeChoice('I believe this item is incorrect because (Choose only one)'+suffix,'Other','dispute reason');nativeText('Other - Must explain:'+suffix,item.form_items?`${itemReason(item)}\n${itemLink(item)}`:itemLink(item),'reason details',context);}
  }
  for(let i=map.capacity;i<accountItems.length;i++) {
    const item=accountItems[i];
    overflow(`Letter ${letterNumbers(item).length>1?'items':'item'} ${numberList(letterNumbers(item))}`,`${item.name||'Entry'}\nAccount reference: ${item.account_reference||'Not printed on my report'}\n${itemReason(item)}\n${itemLink(item)}`);
  }
  for(const item of personalItems)overflow(`Letter item ${item.letter_item||items.indexOf(item)+1}`,`${item.name||'Personal information'}\n${itemReason(item)}\n${itemLink(item)}`);
  // Every full value survives small form spaces. Continuation is separate from the unchanged original artwork.
  if(continued.length) {
    let page,y;
    const start=()=>{page=doc.addPage([612,792]);y=735;page.drawText('Additional information for my dispute',{x:42,y,size:14,font});y-=24;for(const line of wrap([fullName,profile.address_line1,profile.address_line2,profile.city,profile.region,profile.postal_code].filter(Boolean).join(' | '),528,10)){page.drawText(line,{x:42,y,size:10,font});y-=14;}y-=10;page.drawText(`Attached to: ${descriptor.label}`,{x:42,y,size:10,font});y-=24;};
    const sign=p=>p.drawText('Signature: __________________________  Date: __________________',{x:42,y:48,size:10,font});
    start();
    for(const entry of continued) {
      const rows=wrap(`${entry.label}${entry.context?' ('+entry.context+')':''}:\n${entry.value}`,528,10);
      for(const row of rows){if(y<80){sign(page);start();}page.drawText(row,{x:42,y,size:10,font});y-=14;}
      y-=10;
      record(entry.label,entry.value,entry.value,doc.getPageCount()-1,'CONTINUATION');
    }
    // The consumer completes this by hand if the bureau requires signed additional pages.
    sign(page);
  }
  // Keep native controls and their original supported options. Do not flatten or auto-sign/consent.
  const bytes=fields.length||continued.length?Buffer.from(await doc.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false})):original;
  return {bytes:bytes.toString('base64'),sha256:hash(bytes),page_count:doc.getPageCount(),fields,native_fields,continuation_count:continued.length,selected_item_count:items.length,account_entry_count:accountItems.length,template_sha256:descriptor.sha256,mapping_version:descriptor.mapping_version};
}
if(require.main===module){
  try{
    const input=fs.readFileSync(0,'utf8');if(Buffer.byteLength(input)>2*1024*1024)throw new Error('LIMIT');
    const {descriptor,payload}=JSON.parse(input);
    populate(descriptor,payload).then(value=>process.stdout.write(JSON.stringify(value))).catch(()=>{process.stdout.write('{"error":"FORM_POPULATION_FAILED"}');process.exitCode=1;});
  }catch{process.stdout.write('{"error":"FORM_POPULATION_FAILED"}');process.exitCode=1;}
}
module.exports={populate,applicableItems,groupAccountItems};
