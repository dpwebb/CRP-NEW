'use strict';
function validateProgram(p) {
 const ids=new Set(p.items.map(i=>i.id));
 if(p.version!==1||ids.size!==12||p.items.length!==12)throw Error('INVALID_PROGRAM');
 for(const i of p.items)if(!i.owner||!i.nextAction||i.dependencies.some(d=>!ids.has(d)||d===i.id)||i.deployment!=='NOT_AUTHORIZED')throw Error('INVALID_ITEM');
 const visiting=new Set(),done=new Set();
 function visit(id){if(visiting.has(id))throw Error('CYCLIC_DEPENDENCY');if(done.has(id))return;visiting.add(id);p.items.find(i=>i.id===id).dependencies.forEach(visit);visiting.delete(id);done.add(id);}
 ids.forEach(visit);return {valid:true,items:ids.size,deploymentAuthorized:false};
}
module.exports={validateProgram};

