/* Independent OpenSSL/Node encryption fixtures exercise the browser decoder. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={Uint8Array,ArrayBuffer,DataView,TextDecoder,TextEncoder,console,Blob,URL};vm.createContext(ctx);
for(const name of ['cfb.js','pako.min.js','crypto-js.js','password-core.js','distribution.js','hwp-parser.js','model.js','hwp-adapter.js'])vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/reader',name),'utf8'),ctx,{filename:name});
const base=new Uint8Array(fs.readFileSync(path.join(root,'app/src/main/assets/samples/sample.hwp')));
function encryptStream(data,password){
  const pw=Buffer.from(password,'utf8'),seed=Buffer.alloc(pw.length*2);
  for(let i=0;i<pw.length;i++){let n=i?pw[i-1]:0xec;seed[i*2]=((n<<1)|(n>>7))&255;seed[i*2+1]=pw[i];}
  const key=crypto.createHash('sha1').update(seed).digest().subarray(0,16),cipher=crypto.createCipheriv('aes-128-cfb1',key,Buffer.alloc(16));
  const padded=Buffer.alloc(Math.ceil(data.length/16)*16);Buffer.from(data).copy(padded);padded.fill(padded.length-data.length,data.length);
  return Buffer.concat([cipher.update(padded),cipher.final()]);
}
function fixture(password,compressed=true){
  const c=ctx.CFB.read(base,{type:'array'}),h=ctx.CFB.find(c,'FileHeader');h.content=Uint8Array.from(h.content);const v=new DataView(h.content.buffer),flags=v.getUint32(36,true);
  for(let i=0;i<c.FullPaths.length;i++){
    const e=c.FileIndex[i],p=c.FullPaths[i];if(e.type!==2||!(/^Root Entry\/(DocInfo$|BodyText\/|BinData\/|Scripts\/)/i.test(p))||!e.content?.length)continue;
    let data=Uint8Array.from(e.content);
    if(p.endsWith('/DocInfo')||p.includes('/BodyText/')){
      if(flags&1)data=ctx.pako.inflate(data,{raw:true});
      if(p.endsWith('/DocInfo')){
        // Exercise the real Hancom 256-byte password verification prefix.
        const n=new Uint8Array(data.length+256);n.set(data.subarray(0,4));new DataView(n.buffer).setUint32(0,(282<<20)|16,true);n.fill(0xaa,4,260);n.set(data.subarray(4),260);data=n;
      }
      if(compressed)data=ctx.pako.deflateRaw(data);
    }else if(!compressed&&flags&1){try{data=ctx.pako.inflate(data,{raw:true});}catch(_){}}
    e.content=encryptStream(data,password);e.size=e.content.length;
  }
  v.setUint32(36,(flags&~1)|2|(compressed?1:0),true);v.setUint32(44,4,true);return new Uint8Array(ctx.CFB.write(c,{type:'array'}));
}
function textOf(m){let out='';function w(n){if(n.type==='text')out+=n.text;(n.inlines||n.blocks||[]).forEach(w);for(const c of n.cells||[])c.blocks.forEach(w);}m.sections.forEach(s=>s.blocks.forEach(w));return out;}
async function run(){
  const expected=textOf(ctx.HwpAdapter.parse(base)),cases=[],output=process.argv.find(x=>x.startsWith('--output='))?.slice(9);if(output)fs.mkdirSync(output,{recursive:true});
  for(const [name,password,compressed] of [['ascii','123456',true],['unicode','한글密码🔑',true],['uncompressed','hello',false]]){
    const input=fixture(password,compressed),hash=crypto.createHash('sha256').update(input).digest('hex');
    assert.throws(()=>ctx.PasswordCrypto.decryptHwp5(input,'wrong'),e=>e.code==='WRONG_PASSWORD');
    const clear=ctx.PasswordCrypto.decryptHwp5(input,password),model=ctx.HwpAdapter.parse(clear);assert.equal(textOf(model),expected);assert.equal(crypto.createHash('sha256').update(input).digest('hex'),hash);
    cases.push({name,compressed,characters:expected.length});if(output)fs.writeFileSync(path.join(output,name+'.hwp'),input);
  }
  const unsupported=ctx.CFB.read(fixture('123456'),{type:'array'}),h=ctx.CFB.find(unsupported,'FileHeader');h.content[44]=3;
  assert.throws(()=>ctx.PasswordCrypto.decryptHwp5(new Uint8Array(ctx.CFB.write(unsupported,{type:'array'})),'123456'),e=>e.code==='UNSUPPORTED_ENCRYPTION');
  const salt=Buffer.from('00112233445566778899aabbccddeeff','hex'),iv=Buffer.alloc(16,7),plain=Buffer.from('HWPX encrypted text 한글 中文'),password='한글密码🔑';
  for(const prf of ['sha1','sha256']){
    const key=crypto.pbkdf2Sync(crypto.createHash('sha256').update(password).digest(),salt,1024,32,prf),compressed=zlib.deflateRawSync(plain),padded=Buffer.alloc(Math.ceil((compressed.length+1)/16)*16);compressed.copy(padded);
    const cipher=crypto.createCipheriv('aes-256-cbc',key,iv);cipher.setAutoPadding(false);
    const entry={path:'Contents/section0.xml',data:Buffer.concat([cipher.update(padded),cipher.final()]),salt,iv,iterations:1024,checksum:crypto.createHash('sha256').update(plain.subarray(0,1024)).digest()};
    const result=await ctx.PasswordCrypto.decryptHwpx([entry],password);assert.deepEqual(Buffer.from(result[0].data),plain);
    await assert.rejects(ctx.PasswordCrypto.decryptHwpx([entry],'wrong'),e=>e.code==='WRONG_PASSWORD');cases.push({hwpxPrf:prf,unicodePassword:true});
  }
  // Independently construct the legacy DES/gzip-trailer password envelope.
  // This payload tests the crypto container, not the HWP3 paragraph parser.
  const h3=Buffer.alloc(1166);Buffer.from('HWP Document File V3.00 \x1a\x01\x02\x03\x04\x05','binary').copy(h3);h3.writeUInt16LE(2,126);h3[154]=1;
  const body=Buffer.from('HWP3 cipher payload 한글'),p3=Buffer.concat([Buffer.alloc(256),body]),gzip=zlib.gzipSync(p3),deflate=zlib.deflateRawSync(p3),payload=Buffer.concat([deflate,gzip.subarray(-8)]),aligned=Buffer.alloc(Math.ceil(payload.length/8)*8);payload.copy(aligned);
  const rolling=Buffer.alloc(7);for(const [i,b]of [...Buffer.from(password,'utf16le')].entries()){let n=rolling[i%7]^b;rolling[i%7]=((n<<1)|(n>>7))&255;}
  const des=Buffer.alloc(8);for(let bit=0;bit<56;bit++)des[Math.floor(bit/7)]|=((rolling[Math.floor(bit/8)]>>(7-bit%8))&1)<<(7-bit%7);
  const cipher3=crypto.createCipheriv('des-ede3',Buffer.concat([des,des,des]),null);cipher3.setAutoPadding(false);const encrypted3=new Uint8Array(Buffer.concat([h3,cipher3.update(aligned),cipher3.final()]));
  const plain3=ctx.PasswordCrypto.decryptHwp3(encrypted3,password);assert.deepEqual(Buffer.from(plain3.subarray(1166)),body);assert.equal(plain3[126],0);assert.equal(plain3[154],0);assert.throws(()=>ctx.PasswordCrypto.decryptHwp3(encrypted3,'wrong'),e=>e.code==='WRONG_PASSWORD');
  const damaged3=encrypted3.slice();damaged3[damaged3.length-8]^=0xff;assert.throws(()=>ctx.PasswordCrypto.decryptHwp3(damaged3,password));cases.push({hwp3Des:true,unicodePassword:true,crcChecked:true});
  console.log(JSON.stringify({cases,inputUnchanged:true,unsupportedVersionRejected:true,independentCipher:'Node/OpenSSL AES-CFB1 and AES-CBC'},null,2));
}
module.exports={fixture,encryptStream};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
