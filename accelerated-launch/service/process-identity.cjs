'use strict';
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
let own;
// Identity belongs to the operating-system process, not to lock creation time.
function identity(pid) {
  if(!Number.isInteger(pid)||pid<=0)return null;
  if(pid===process.pid&&own)return own;
  try {
    if(process.platform==='linux') {
      const stat=fs.readFileSync('/proc/'+pid+'/stat','utf8');
      const ticks=stat.slice(stat.lastIndexOf(')')+2).split(' ')[19];
      const boot=fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim();
      if(!/^\d+$/.test(ticks)||!boot)return null;
      const result='linux:'+boot+':'+ticks;if(pid===process.pid)own=result;return result;
    }
    if(process.platform==='win32') {
      const start=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks.ToString()`],{encoding:'utf8',timeout:10000,windowsHide:true}).trim();
      const result=/^\d+$/.test(start)?'win32:'+start:null;if(pid===process.pid&&result)own=result;return result;
    }
  }catch{}
  return null;
}
module.exports={identity};
