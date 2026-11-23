/* Independently encrypt synthetic fixtures with Node's AES implementation. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),context={Uint8Array,ArrayBuffer,DataView,TextDecoder,TextEncoder,URL,Blob,console};vm.createContext(context);
for(const name of ['cfb.js','pako.min.js','crypto-js.js','distribution.js','hwp-parser.js','model.js','legacy-charts.js','hwp-adapter.js'])vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/reader',name),'utf8'),context,{filename:name});
const C=context.CFB;
function packet(payload,flags,seed,extended=false){
  const clear=Buffer.alloc(256);let state=BigInt(seed>>>0);
  const rand=()=>{state=(state*214013n+2531011n)&0xffffffffn;return Number(state>>16n)&32767;};
  const mask=Buffer.alloc(256);let offset=0;
  while(offset<256){const value=rand()&255,count=(rand()&15)+1;for(let i=0;i<count&&offset<256;i++)mask[offset++]=value;}
  const start=(seed&15)+4,hash=crypto.createHash('sha1').update('synthetic-fixture-'+seed).digest('hex');
  Buffer.from(hash,'utf16le').copy(clear,start);clear.writeUInt16LE(0x8000|flags,start+80);
  const key=clear.subarray(start,start+16),encoded=Buffer.from(clear.map((b,i)=>b^mask[i]));encoded.writeUInt32LE(seed>>>0,0);
  const aligned=Buffer.alloc(Math.ceil(payload.length/16)*16);Buffer.from(payload).copy(aligned);
  const cipher=crypto.createCipheriv('aes-128-ecb',key,null);cipher.setAutoPadding(false);const body=Buffer.concat([cipher.update(aligned),cipher.final()]);
  const record=Buffer.alloc(extended?8:4);record.writeUInt32LE(((extended?4095:256)*0x100000+28)>>>0,0);if(extended)record.writeUInt32LE(256,4);
  return Buffer.concat([record,encoded,body]);
}
function fixture(bytes,flags,compressed,seed,extended=false){
  const c=C.read(new Uint8Array(bytes),{type:'array'}),header=C.find(c,'FileHeader');header.content=Uint8Array.from(header.content);const h=new DataView(header.content.buffer),old=h.getUint32(36,true);
  if(Boolean(old&1)!==compressed){
    const info=C.find(c,'DocInfo');info.content=compressed?context.pako.deflateRaw(info.content):context.pako.inflate(info.content,{windowBits:-15});info.size=info.content.length;
  }
  h.setUint32(36,(old&~7)|4|(compressed?1:0),true);
  const body=C.find(c,'Root Entry/BodyText/Section0').content;
  const plain=Boolean(old&1)===compressed?body:compressed?context.pako.deflateRaw(body):context.pako.inflate(body,{windowBits:-15});
  C.utils.cfb_add(c,'ViewText/Section0',packet(plain,flags,seed,extended));
  return new Uint8Array(C.write(c,{type:'array'}));
}
function textOf(model){let out='';function walk(n){if(n.type==='text')out+=n.text;for(const item of n.inlines||n.blocks||[])walk(item);for(const cell of n.cells||[])cell.blocks.forEach(walk);}model.sections.forEach(s=>s.blocks.forEach(walk));return out;}
const manifestPath='/tmp/hwp-device-validation/manifest.json';
const supplied=process.argv.includes('--corpus')&&fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)):null;
const base=supplied?fs.readFileSync(supplied.find(f=>f.id===30).path):fs.readFileSync(path.join(root,'app/src/main/assets/samples/sample.hwp'));
const expected=textOf(context.HwpAdapter.parse(new Uint8Array(base))),cases=[];
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);if(output)fs.mkdirSync(output,{recursive:true});
for(const flags of [0,1,2,3]){
  const bytes=fixture(base,flags,true,flags===0?0:flags===3?0xffffffff:0x675b87e5,flags===2),before=crypto.createHash('sha256').update(bytes).digest('hex');
  const model=context.HwpAdapter.parse(bytes);assert.equal(textOf(model),expected);assert.equal(model.permissions.allowCopy,!(flags&1));assert.equal(model.permissions.allowPrint,!(flags&2));assert.equal(model.permissions.readOnly,true);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),before,'Original bytes must not change');
  cases.push({flags,compressed:true,permissions:model.permissions,characters:expected.length});if(output)fs.writeFileSync(path.join(output,'distribution-'+flags+'.hwp'),bytes);
}
if(supplied){const bytes=fixture(base,3,false,0x12345678);assert.equal(textOf(context.HwpAdapter.parse(bytes)),expected);cases.push({uncompressed:true});if(output)fs.writeFileSync(path.join(output,'distribution-uncompressed.hwp'),bytes);}
const mixed=C.read(fixture(base,1,true,123),{type:'array'}),docInfo=C.find(mixed,'DocInfo');
const info=context.pako.inflate(docInfo.content,{windowBits:-15});new DataView(info.buffer).setUint16(4,2,true);docInfo.content=context.pako.deflateRaw(info);docInfo.size=docInfo.content.length;
const second=C.find(mixed,'Root Entry/BodyText/Section0').content;C.utils.cfb_add(mixed,'ViewText/Section1',packet(second,2,456));
const multiple=context.HwpAdapter.parse(new Uint8Array(C.write(mixed,{type:'array'})));
assert.equal(multiple.sections.length,2);assert.equal(multiple.permissions.allowCopy,false);assert.equal(multiple.permissions.allowPrint,false);assert.equal(textOf(multiple),expected+expected);cases.push({multipleSections:true,mostRestrictivePermissions:true});
const malformed=fixture(base,3,true,17),cfb=C.read(malformed,{type:'array'}),view=C.find(cfb,'Root Entry/ViewText/Section0');view.content=view.content.slice(0,-1);view.size=view.content.length;
assert.throws(()=>context.HwpAdapter.parse(new Uint8Array(C.write(cfb,{type:'array'}))),/长度/);
const missing=C.utils.cfb_new();
cfb.FullPaths.forEach((name,i)=>{const entry=cfb.FileIndex[i];if(entry.type===2&&!name.includes('/ViewText/'))C.utils.cfb_add(missing,name,entry.content);});
assert.throws(()=>context.HwpAdapter.parse(new Uint8Array(C.write(missing,{type:'array'}))),/ViewText/,'Never fall back to BodyText');
const drm=C.read(new Uint8Array(base),{type:'array'}),drmHeader=C.find(drm,'FileHeader');drmHeader.content[36]|=16;
assert.throws(()=>context.HwpAdapter.parse(new Uint8Array(C.write(drm,{type:'array'}))),/DRM/);
let real=null;
if(supplied){const bytes=new Uint8Array(fs.readFileSync(supplied.find(f=>f.id===31).path)),model=context.HwpAdapter.parse(bytes);const text=textOf(model);assert.ok(text.includes('강남세움복지관'));assert.ok(text.length>2000);assert.equal(model.permissions.allowCopy,false);assert.equal(model.permissions.allowPrint,true);real={characters:text.length,sections:model.sections.length,permissions:model.permissions};}
console.log(JSON.stringify({cases,real,inputUnchanged:true,malformedRejected:true,noBodyTextFallback:true},null,2));
module.exports={fixture,packet};
