'use strict';
// Governed focused selection: use the normal runner and its source-drift/receipt gates.
// Whole mixed browser/API sections are explicitly unrun, never silently marked passed.
const fs = require('node:fs'), path = require('node:path'), {spawnSync} = require('node:child_process');
const BROWSER_FILES = new Set(['bw-browser-wizzard.cjs','dn-us-dated-history.cjs','dr-reader-evidence-delivery.cjs',
  'ed-account-browser.cjs','fl-report-concern-delivery.cjs','fz-signup-user-experience.cjs','ga-packet-review-mailing.cjs',
  'gd-admin-http-browser.cjs','ge-email-reset-browser.cjs','gi-audit-consumer-flow.cjs','go-homepage-signin-localization.cjs',
  'gq-public-analytics.cjs','gr-google-signin.cjs']);
const browserPattern = /require\([^\r\n]*(?:playwright|browser)|import\([^\r\n]*playwright|(?:chromium|firefox|webkit)\.launch|loadPlaywright|launchBrowser|launchPersistentContext/;
function select() {
  const source = fs.readFileSync(path.join(__dirname,'run-tests.cjs'),'utf8');
  const array = source.match(/const SECTION_FILES = \[([\s\S]*?)\];/);
  if (!array) throw Error('Current governed section list could not be read');
  const files = [...array[1].matchAll(/'([a-z0-9-]+\.cjs)'/g)].map(match=>match[1]);
  if (new Set(files).size !== files.length) throw Error('Duplicate governed section file');
  const generated = new Set(require('./fictional-regression.cjs').ids), selected=[], excluded=[];
  for (const file of files) {
    const filename=path.join(__dirname,'sections',file), text=fs.readFileSync(filename,'utf8');
    const section=require(filename);
    if (browserPattern.test(text) && !BROWSER_FILES.has(file)) throw Error('Unclassified browser dependency: '+file);
    if (BROWSER_FILES.has(file)) excluded.push({id:section.id,file,reason:'whole browser/mixed section not available without browser access; no subchecks counted passed'});
    else if (generated.has(section.id)) selected.push({id:section.id,file,execution:'declared fictional substitution; original captured branch unrun'});
    else selected.push({id:section.id,file,execution:'normal governed section'});
  }
  return {profile:'FICTIONAL_NON_BROWSER_FOCUSED',selected,excluded,totalCurrentSections:files.length,
    limits:['Not a full governed release run','No browser/AT/hosted provider acceptance','Generated substitutions retain the existing fictional policy; no original private-capture compatibility claim']};
}
function main() {
  const args=process.argv.slice(2);if(args.some(arg=>!arg.startsWith('--output='))||args.length>1)throw Error('Only --output=<private local directory> is supported');
  const outRoot=path.resolve(__dirname,'../out'), output=path.resolve(args[0]?.slice('--output='.length)||path.join(outRoot,'governed-non-browser-'+Date.now()+'-'+process.pid));
  const rel=path.relative(outRoot,output);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('Output must be inside this checkout service/out');
  fs.mkdirSync(output,{recursive:true});
  const receipt=path.join(output,'governed.json'),inventory=path.join(output,'selection.json');
  if(fs.existsSync(receipt)||fs.existsSync(inventory))throw Error('Run output already exists; preserve it and choose a fresh directory');
  const selection=select();fs.writeFileSync(inventory,JSON.stringify(selection,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({selected:selection.selected.length,excluded:selection.excluded.length,output}));
  const result=spawnSync(process.execPath,[path.join(__dirname,'run-tests.cjs'),'--generated-regression',...selection.selected.map(row=>row.id),'--receipt='+receipt],{
    stdio:'inherit',env:{...process.env,CRP_FICTIONAL_REGRESSION:'1'},windowsHide:true,timeout:3600000});
  if(result.error)throw result.error;process.exitCode=result.status??1;
}
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={select};
