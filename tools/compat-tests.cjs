/* Regression tests for actual HWP record boundaries, optional corpus argument. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = { console, Uint8Array, ArrayBuffer, DataView, TextDecoder, TextEncoder, URL, Blob };
vm.createContext(context);
for (const name of ['cfb.js','pako.min.js','crypto-js.js','distribution.js','hwp-parser.js','model.js','legacy-charts.js','hwp-adapter.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/reader',name),'utf8'),context,{filename:name});
}
function evaluate(source) { return vm.runInContext(source,context,{timeout:15000}); }
// 5.0.3 files can already contain all ten level starts, despite an old 5.1 gate.
evaluate(`var record = new ArrayBuffer(182), v = new DataView(record), offset = 0;
for (let i=0;i<7;i++) offset+=14;
v.setUint16(offset,1,true);offset+=2;
for(let i=0;i<7;i++){v.setUint32(offset,i+1,true);offset+=4;}
for(let i=0;i<3;i++) offset+=14;
for(let i=0;i<3;i++){v.setUint32(offset,8+i,true);offset+=4;}`);
assert.equal(evaluate('Numbering.fromRecord({id:23,data:record},new HWPVersion(5,0,3,2)).paragraphHeads[9].startNumber'),10);
assert.throws(()=>evaluate('Numbering.fromRecord({id:23,data:record.slice(0,178)},new HWPVersion(5,0,3,2))'));
assert.equal(evaluate(`var r = new ArrayBuffer(12), d = new DataView(r);d.setUint16(0,2,true);d.setUint16(2,1,true);d.setUint16(4,3,true);[111,108,101].forEach((x,i)=>d.setUint16(6+2*i,x,true));BinData.fromRecord({id:18,data:r}).extension`),'ole');
// Fill parsing must stop before the shadow in a shape record.
assert.equal(evaluate(`var r = new ArrayBuffer(30), d = new DataView(r);d.setUint32(0,1,true);d.setInt32(12,-1,true);var reader = new ByteReader(r);mapFill(reader);reader.offsetByte`),21);
assert.equal(evaluate(`var r = new ArrayBuffer(12), d = new DataView(r);d.setUint32(0,0x0204,true);d.setFloat32(4,1.75,true);EffectColorEffect.fromReader(new ByteReader(r)).kind`),0x0204);
assert.throws(()=>evaluate('mapFill(new ByteReader(new ArrayBuffer(8).slice(0,3)))'));
assert.equal(evaluate('DocModel.oleImage(DocModel.documentModel("test"),new Uint8Array(64))'),null);
const report = { recordBoundaries:true, tenNumberingLevels:true, storageExtension:true, effectCodes:true, corpus:[] };
if (process.argv[2]) {
  const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  for (const file of manifest.filter(f=>f.format==='hwp')) {
    context.input=new Uint8Array(fs.readFileSync(file.path));
    const start=Date.now();
    const model=evaluate('HwpAdapter.parse(input)');
    assert.ok(model.sections.length>0);
    // Every reference to the same binary must reuse its Blob URL.
    const images=[];
    function visit(n) {
      if(n.type==='image') images.push(n.url);
      for(const item of n.inlines || n.blocks || n.items || []) visit(item);
      for(const cell of n.cells || []) cell.blocks.forEach(visit);
      if(n.caption) n.caption.blocks.forEach(visit);
    }
    model.sections.forEach(s=>s.blocks.forEach(visit));
    assert.equal(model.urls.length,new Set(images).size);
    if(file.bytes>10*1024*1024) {
      assert.ok(model.sections.reduce((n,s)=>n+s.blocks.length,0)>100000);
      assert.ok(model.urls.length<10,'Repeated pictures must not allocate thousands of Blobs');
    }
    model.urls.forEach(url=>URL.revokeObjectURL(url));
    report.corpus.push({id:file.id,sections:model.sections.length,uniqueImages:model.urls.length,ms:Date.now()-start});
  }
}
console.log(JSON.stringify(report,null,2));
