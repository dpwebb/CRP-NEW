'use strict';
// Explicit educational/reference allowlist. Never enumerate/copy private captures.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),pins=require('../../accelerated-launch/service/tests/required-full-fixtures.json');
const permitted=[...['001','003','004','009','012','021'].map(n=>'SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-'+n+'.pdf'),
 'consumer-wizard/dist/app.js','consumer-wizard/dist/index.html',
 ...['experian-uk-consumer-code-guide.pdf','experian-uk-cais-faq.html','experian-us-consumer-report-code-guide.html'].map(n=>'SOURCE_CAPTURES/READER-CODE-DEFINITIONS-2026-10-07/'+n)];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
const copy=process.argv[2]==='--copy-public',rows=[];
for(const file of permitted){
 const pin=pins.files.find(p=>p.file===file);if(!pin)throw Error('REFERENCE_PIN_REQUIRED');
 const dest=path.join(root,file);let copied=false;
 if(!fs.existsSync(dest)&&copy){const source=path.join('C:/CRP-NEW',file);if(hash(source)!==pin.sha256)throw Error('REFERENCE_SOURCE_PIN_MISMATCH');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);copied=true;}
 const present=fs.existsSync(dest),verified=present&&hash(dest)===pin.sha256;rows.push({file,present,verified,copied,sha256:pin.sha256});
}
const result={version:1,checkedAt:new Date().toISOString(),scope:'Explicit public educational/reference and historical client prerequisites only; not private captured-profile certification',passed:rows.every(r=>r.verified),rows};
console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
