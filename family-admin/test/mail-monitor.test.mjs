import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function mailMonitoring('),source.indexOf('async function overview('));
const element=(tag,text='',className='')=>({tag,text:text??'',className,children:[],setAttribute(){},append(...items){this.children.push(...items);}});
const context=vm.createContext({el:element,Date,Number,Array});vm.runInContext(code,context);
const render=value=>{const card=element('article');context.mailMonitoring(card,value,1000000);const texts=[];const walk=n=>{texts.push(n.text);for(const child of n.children)walk(child);};walk(card);return texts.join('\n');};
test('Mail status distinguishes missing/stale monitoring, healthy checks and email evidence',()=>{
  for(const value of [undefined,{configured:false},{configured:true,checkedAt:0,alerts:[]}])assert.match(render(value),/not installed, is stale, or is unavailable/);
  const value={configured:true,checkedAt:999000,ok:true,alerts:[],emailState:'RELAY_ACCEPTED'};
  assert.match(render(value),/Current monitor checks passed/);assert.match(render(value),/inbox receipt and administrator acknowledgement are unverified/);
  assert.match(render({...value,emailState:'UNKNOWN'}),/Reconcile before retrying/);
  assert.match(render({...value,emailState:'CAPTURED'}),/no message sent/);
});
test('Mail alert display uses bounded readable labels and never prints arbitrary source fields',()=>{
  const text=render({configured:true,checkedAt:999000,ok:false,alerts:[{code:'LOCAL_BACKUP_STALE'},{code:'SECRET_PAYLOAD',customer:'private'}],emailState:'NOT_VERIFIED',secret:'never-show'});
  assert.match(text,/backup is missing or stale/);assert.match(text,/Monitoring requires review/);assert.doesNotMatch(text,/SECRET_PAYLOAD|private|never-show/);
});
