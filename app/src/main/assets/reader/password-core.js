/* Password read support, adapted from rhwp-password-crypto (MIT).
 * Copyright (c) 2025-2026 Edward Kim. See licenses/rhwp-LICENSE.txt.
 * Crypto algorithms run in a disposable worker. No decrypted file is saved.
 */
(function(global){
  'use strict';
  const MAX=128*1024*1024, C=global.CryptoJS;
  function error(code,message){const e=new Error(message);e.code=code;return e;}
  const wrong=()=>error('WRONG_PASSWORD','密码不正确或加密内容损坏，请重试。');
  const unsupported=message=>error('UNSUPPORTED_ENCRYPTION',message);
  function words(bytes){return C.lib.WordArray.create(bytes);}
  function bytes(value){const out=new Uint8Array(value.sigBytes);for(let i=0;i<out.length;i++)out[i]=value.words[i>>>2]>>>(24-(i&3)*8)&255;return out;}
  function inflate(data,budget=MAX){
    const stream=new pako.Inflate({raw:true}),chunks=[];let size=0;
    stream.onData=chunk=>{size+=chunk.length;if(size>budget)throw error('LIMIT','文档解压后的内容过大。');chunks.push(chunk);};
    try{stream.push(data,true);}catch(e){if(e.code==='LIMIT')throw e;throw wrong();}
    if(stream.err||!stream.ended)throw wrong();
    const out=new Uint8Array(size);let at=0;for(const chunk of chunks){out.set(chunk,at);at+=chunk.length;}
    return {data:out,consumed:stream.strm.next_in};
  }
  function records(data,firstTag,padded=false){
    const view=new DataView(data.buffer,data.byteOffset,data.byteLength);let at=0,count=0;
    while(at<data.length){
      const left=data.length-at;
      if(padded&&count&&left<=15&&(data.subarray(at).every(b=>b===0)||data.subarray(at).every(b=>b===left)))break;
      if(left<4)throw wrong();const header=view.getUint32(at,true),tag=header&1023,level=header>>>10&1023;let size=header>>>20;at+=4;
      if(size===4095){if(at+4>data.length)throw wrong();size=view.getUint32(at,true);at+=4;}
      if(!count&&(tag!==firstTag||level!==0)||tag<16||size>data.length-at)throw wrong();at+=size;count++;
    }
    if(!count)throw wrong();return data.slice(0,at);
  }
  function hwp5Key(password){
    const raw=new TextEncoder().encode(password),input=new Uint8Array(raw.length*2);
    for(let i=0;i<raw.length;i++){const prev=i?raw[i-1]:0xec;input[i*2]=(prev<<1|prev>>>7)&255;input[i*2+1]=raw[i];}
    const key=C.SHA1(words(input));key.sigBytes=16;key.clamp();raw.fill(0);input.fill(0);return key;
  }
  function hwp5Stream(input,key){
    // HWP5 EncryptVersion 4 uses AES-128 CFB with one-bit feedback, not CFB128.
    const aes=C.algo.AES.createEncryptor(key),block=[0,0,0,0],out=new Uint8Array(input.length);let a=0,b=0,c=0,d=0;
    for(let i=0;i<input.length;i++)for(let bit=7;bit>=0;bit--){
      block[0]=a;block[1]=b;block[2]=c;block[3]=d;aes.encryptBlock(block,0);
      const feedback=input[i]>>>bit&1;out[i]|=(feedback^(block[0]>>>31))<<bit;
      a=a<<1|b>>>31;b=b<<1|c>>>31;c=c<<1|d>>>31;d=d<<1|feedback;
    }
    block.fill(0);return out;
  }
  function decryptHwp5(input,password){
    const cfb=CFB.read(input,{type:'array'}),header=CFB.find(cfb,'FileHeader');
    if(!header||header.content.length<48)throw error('INVALID','HWP 文件头不完整。');
    header.content=Uint8Array.from(header.content);const view=new DataView(header.content.buffer),flags=view.getUint32(36,true);
    if(flags&(16|256|1024))throw unsupported('此文件为 DRM 或证书保护文档，暂不支持。');
    if(!(flags&2))return input;
    if(view.getUint32(44,true)!==4)throw unsupported('暂不支持此 HWP 的密码加密版本。');
    const key=hwp5Key(password);let expanded=0;
    try{
      const info=CFB.find(cfb,'DocInfo');if(!info)throw error('INVALID','HWP 缺少文档信息。');
      let clear=hwp5Stream(Uint8Array.from(info.content),key);
      let doc=flags&1?inflate(clear,MAX).data:records(clear,16,true);
      records(doc,16);expanded+=doc.length;
      // Hancom password files can prepend 256 verification bytes to the
      // DOCUMENT_PROPERTIES payload. The actual properties remain 26 bytes.
      const dv=new DataView(doc.buffer,doc.byteOffset,doc.byteLength),first=dv.getUint32(0,true),size=first>>>20;
      if(size===282){const normalized=new Uint8Array(doc.length-256);new DataView(normalized.buffer).setUint32(0,(26<<20)|(first&0xfffff),true);normalized.set(doc.subarray(260),4);doc=normalized;}
      // Encrypted BinData follows the document compression flag even when the
      // stored per-item compression field says NoCompress (Hancom behavior).
      const infoView=new DataView(doc.buffer,doc.byteOffset,doc.byteLength);let at=0,hasMappings=false;
      while(at<doc.length){const h=infoView.getUint32(at,true),tag=h&1023;let n=h>>>20;at+=4;if(n===4095){n=infoView.getUint32(at,true);at+=4;}if(tag===17)hasMappings=true;if(tag===18&&n>=2)infoView.setUint16(at,infoView.getUint16(at,true)&~0x30,true);at+=n;}
      if(!hasMappings)throw wrong();
      info.content=flags&1?pako.deflateRaw(doc):doc;info.size=info.content.length;
      for(let i=0;i<cfb.FileIndex.length;i++){
        const entry=cfb.FileIndex[i],path=cfb.FullPaths[i];
        if(entry.type!==2||!entry.content?.length||!/^Root Entry\/(BodyText|BinData|Scripts)\//i.test(path))continue;
        clear=hwp5Stream(Uint8Array.from(entry.content),key);
        if(/\/BodyText\/Section\d+$/i.test(path)){
          const body=flags&1?inflate(clear,MAX-expanded).data:records(clear,66,true);
          records(body,66);expanded+=body.length;if(!(flags&1))clear=body;
        }
        entry.content=clear;entry.size=clear.length;
      }
      // Only the temporary in-memory container is adapted for the existing parser.
      view.setUint32(36,flags&~2,true);view.setUint32(44,0,true);
      return new Uint8Array(CFB.write(cfb,{type:'array'}));
    }finally{key.words.fill(0);}
  }
  function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=crc>>>1^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
  function decryptHwp3(input,password){
    if(input.length<1166)throw error('INVALID','HWP 3 文件头不完整。');
    const v=new DataView(input.buffer,input.byteOffset,input.byteLength),start=1166+v.getUint16(156,true);
    if(!input[154])throw unsupported('暂不支持未压缩的 HWP 3 密码文档。');
    if(start>=input.length||(input.length-start)%8)throw error('INVALID','HWP 3 加密数据不完整。');
    const rolling=new Uint8Array(7),raw=C.enc.Utf16LE.parse(password),pw=bytes(raw),keyBytes=new Uint8Array(8);
    for(let i=0;i<pw.length;i++){const s=i%7,n=rolling[s]^pw[i];rolling[s]=(n<<1|n>>>7)&255;}
    for(let i=0;i<56;i++)keyBytes[Math.floor(i/7)]|=(rolling[i>>>3]>>>(7-(i&7))&1)<<(7-i%7);
    const key=words(keyBytes);
    try{
      const clear=bytes(C.DES.decrypt({ciphertext:words(input.subarray(start))},key,{mode:C.mode.ECB,padding:C.pad.NoPadding}));
      const result=inflate(clear),end=result.consumed,plain=result.data;
      if(plain.length<=256||end+8>clear.length)throw wrong();const trailer=new DataView(clear.buffer,clear.byteOffset+end,8);
      if(trailer.getUint32(0,true)!==crc32(plain)||trailer.getUint32(4,true)!==plain.length)throw wrong();
      const out=new Uint8Array(start+plain.length-256);out.set(input.subarray(0,start));out.set(plain.subarray(256),start);out[126]=out[127]=out[154]=0;return out;
    }finally{key.words.fill(0);raw.words.fill(0);pw.fill(0);rolling.fill(0);keyBytes.fill(0);}
  }
  async function decryptHwpx(entries,password){
    let total=0;const out=[];
    for(const entry of entries){
      if(!entry.data.length||entry.data.length%16)throw wrong();let plain=null;
      const start=C.SHA256(password);
      try{for(const hasher of [C.algo.SHA1,C.algo.SHA256]){
        const key=C.PBKDF2(start,words(entry.salt),{keySize:8,iterations:entry.iterations,hasher});
        try{
          const clear=bytes(C.AES.decrypt({ciphertext:words(entry.data)},key,{iv:words(entry.iv),mode:C.mode.CBC,padding:C.pad.NoPadding}));
          let data;try{data=inflate(clear,Math.min(32*1024*1024,MAX-total)).data;}catch(e){if(e.code==='LIMIT')throw e;continue;}
          const hash=bytes(C.SHA256(words(data.subarray(0,1024))));
          if(hash.every((b,i)=>b===entry.checksum[i])){plain=data;break;}
        }finally{key.words.fill(0);}
      }}finally{start.words.fill(0);}
      if(!plain)throw wrong();total+=plain.length;out.push({path:entry.path,data:plain});
    }
    return out;
  }
  global.PasswordCrypto={decryptHwp5,decryptHwp3,decryptHwpx,hwp5Stream,hwp5Key,inflate,records,error};
})(globalThis);
