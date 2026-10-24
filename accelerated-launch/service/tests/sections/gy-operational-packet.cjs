'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {composePacket}=require('../../packet-composer.cjs');
const {pdfText}=require('../packet-pdf-assertions.cjs');
const support=require('../../packet-support.cjs');
const lib=require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==','base64');
async function run(t,check){
 const id='a'.repeat(32),settings={bureau:'EQUIFAX',channel:'POSTAL',purpose:'ACCOUNT',document_ids:[id],use_account_profile:true,no_ssn_issued:false,identity_shows_address:true};
 check.equal('document_rotations' in support.normalize(settings,'CA'),false,'old packets retain material shape without an empty rotation map');
 check.equal('document_rotations' in support.normalize({...settings,document_rotations:{[id]:0}},'CA'),false,'no-op rotation has no new material');
 for(const rotations of [{[id]:45},{[id]:'90'},{['b'.repeat(32)]:90},[]]){let error;try{support.normalize({...settings,document_rotations:rotations},'CA');}catch(e){error=e;}check.equal(error?.code,'INVALID_REQUEST','invalid or unselected rotation rejected');}
 const signature={name:'Morgan Fiction',date:'2026-10-24'},letter=Array.from({length:46},(_,i)=>i===45?'Morgan Fiction':i===44?'Thank you,':'Fictional letter line '+(i+1)).join('\n');
 const signed=composePacket({letter_text:letter,signature});
 check.equal(signed.page_count,2,'long signed letter paginates normally');
 check.ok(signed.editable_fields.at(-1).text.split('\n').length>=4,'closing and name do not occupy an orphan line page');
 check.ok(signed.editable_fields.every(f=>f.font_size>=10&&f.y>=50),'letter minimum readability and page margins retained');
 check.ok(signed.editable_fields.at(-1).height < 150,'final signed field contracts so signature follows the closing without a large blank gap');
 check.ok(pdfText(signed.bytes).includes('Signed by: Morgan Fiction'),'signature rendered outside editable body');
 const docs=rotation=>[id,'b'.repeat(32)].map(file_id=>({bytes:png,content_type:'image/png',label:'IDENTITY',file_id,filename:'FICTIONAL-color-card.png',rotation}));
 const packets=[];
 for(const rotation of [0,90,180,270]){
  const packet=composePacket({letter_text:'Fictional short letter.\nThank you,\nMorgan Fiction',signature,documents:docs(rotation)});packets.push(packet);
  const copy=packet.review_pages.find(p=>p.grouped_identification).sources[0];
  check.equal(copy.original_sha256,hash(png),'rotation retains original file digest');check.equal(copy.rotation,rotation,'review records exact chosen image rotation');
  check.ok(copy.x>=0&&copy.y>=0&&copy.width>0&&copy.height>0,'rotated copy has valid bounded placement');
  check.equal((await lib.PDFDocument.load(packet.bytes)).getPageCount(),packet.page_count,'actual PDF opens with reported complete page count');
 }
 check.equal(new Set(packets.map(p=>p.sha256)).size,4,'different output rotations create different immutable artifacts');
 let refused;try{composePacket({letter_text:'Fictional',reports:[{bytes:png,content_type:'image/png',relevant_pages:[1],rotation:90}]});}catch(e){refused=e;}
 check.equal(refused?.code,'INVALID_REQUEST','report evidence cannot be silently rotated through supporting-copy controls');
 const context={console,URLSearchParams,Date,Map,Set,JSON,Object,Array,Number,String,Error,document:{getElementById:()=>null},navigator:{clipboard:{}},location:{search:''},setTimeout,clearTimeout};context.window=context;vm.createContext(context);
 const source=fs.readFileSync(path.join(__dirname,'../../ui/app.js'),'utf8');vm.runInContext(source.slice(0,source.indexOf('/* ------------------------------------------------------------------ bootstrap */')),context);
 context.fixture={support:{settings:{...settings,document_rotations:{[id]:90}},requirements:{country:'CA',bureau:'EQUIFAX',items:[],sources:[]},documents:[{file_id:id,original_filename:'FICTIONAL-color-card.png',content_type:'image/png',document_kind:'PASSPORT'}],selected_document_ids:[id],missing:[]}};
 vm.runInContext('state.packetRepair=null;',context);const html=vm.runInContext('packetSupportingDocuments(fixture)',context);
 check.ok(html.includes('Included documents')&&html.includes('data-packet-document="'+id+'" checked'),'complete preparation still offers selected copy controls');
 check.ok(html.includes('data-packet-rotation="'+id+'"')&&html.includes('value="90" selected'),'saved rotation is visible for review');
 check.ok(html.includes('We have not checked expiry dates.'),'review avoids claiming automated expiry verification');
 const proof=process.env.CRP_OPERATIONAL_PACKET_PROOF_DIR;if(proof){fs.mkdirSync(proof,{recursive:true});fs.writeFileSync(path.join(proof,'fictional-long-signed.pdf'),signed.bytes);packets.forEach((p,i)=>fs.writeFileSync(path.join(proof,'fictional-rotation-'+i*90+'.pdf'),p.bytes));}
 return {fictional_only:true,external_calls:0,provider_proof:false};
}
module.exports={id:'gy-operational-packet',title:'Operational packet document review, bounded rotation and signed letter layout',run};
