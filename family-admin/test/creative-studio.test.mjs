import test from 'node:test';
import assert from 'node:assert/strict';
import { actions, reads, actionBody, nativePath } from '../src/catalog.mjs';
test('Studio actions remain native, owner-scoped and bounded with fresh-factor decisions',()=>{
 for(const [name,op]of Object.entries(actions.affiliate).filter(([k])=>k.startsWith('studio.'))){assert(op.owner&&op.sensitive,name);assert(op.path.startsWith('/api/studio/'));}
 assert.equal(reads.affiliate.studio.path,'/api/studio/library');
 assert.throws(()=>nativePath(reads.affiliate.studioPreview,null,{url:'https://evil.invalid'}),/INVALID_QUERY/);
 assert.throws(()=>actionBody(actions.affiliate['studio.message'],{name:'a',headline:'b',body:'c',cta:'d',logo:'upload'}),/INVALID_FIELDS/);
 assert.equal(actionBody(actions.affiliate['studio.template'],{name:'draft',layout:'stacked-v1',countries:['CA'],placements:['website'],sizes:['600x900'],allowCustom:false,minWidth:600,maxWidth:1200,minHeight:900,maxHeight:1600}).allowCustom,false);
});
