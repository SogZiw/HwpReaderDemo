/* Container/password dispatch. Passwords are never written to storage or logs. */
(function(global){
  'use strict';
  const fail=(code,message)=>Object.assign(new Error(message),{code});
  const local=(e,name)=>Array.from(e?.children||[]).find(n=>n.localName===name);
  const attr=(e,name)=>Array.from(e?.attributes||[]).find(a=>a.localName===name)?.value;
  function b64(value,size){try{const s=atob(value||''),b=Uint8Array.from(s,c=>c.charCodeAt(0));if(size&&b.length!==size||!b.length)throw 0;return b;}catch(_){throw fail('INVALID','加密清单参数无效。');}}
  function xml(source){if(/<!DOCTYPE|<!ENTITY/i.test(source))throw fail('INVALID','加密清单包含不支持的 XML 声明。');const d=new DOMParser().parseFromString(source,'application/xml');if(d.getElementsByTagName('parsererror').length)throw fail('INVALID','加密清单损坏。');return d;}
  const jobs=WorkerJobs.createRunner();
  let workerTimeout=45000,workerUrl='password-worker.js';
  function configure(options){
    workerTimeout=Number.isFinite(options.workerTimeoutMs)?Math.min(45000,Math.max(100,options.workerTimeoutMs)):45000;
    // The fault worker is shipped only in the Android debug source set.
    workerUrl=options.debugWorkerHang?'debug-hang-worker.js':'password-worker.js';
  }
  function worker(job){return jobs.run(workerUrl,job,workerTimeout);}
  global.addEventListener('pagehide',jobs.cancelAll,{once:true});
  async function unlock(job,ask,format){
    let retry=false;
    for(;;){let password=await ask({format,retry});if(password===null)throw fail('CANCELLED','已取消打开加密文档。');
      try{return await worker({...job,password});}catch(e){if(e.code!=='WRONG_PASSWORD')throw e;retry=true;}finally{password='';}
    }
  }
  async function open(bytes,ask){
    if([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((b,i)=>bytes[i]===b)){
      const cfb=CFB.read(bytes,{type:'array'}),h=CFB.find(cfb,'FileHeader');if(!h||h.content.length<48)throw fail('INVALID','不是有效的 HWP 5 文档。');
      const v=new DataView(Uint8Array.from(h.content).buffer),flags=v.getUint32(36,true);
      if(flags&(16|256|1024))throw fail('UNSUPPORTED_ENCRYPTION','此文件为 DRM 或证书保护文档，暂不支持。');
      if(!(flags&2))return {bytes};
      if(v.getUint32(44,true)!==4)throw fail('UNSUPPORTED_ENCRYPTION','暂不支持此 HWP 的密码加密版本。');
      return {bytes:await unlock({kind:'hwp5',bytes},ask,'HWP'),protected:true};
    }
    if(new TextDecoder().decode(bytes.subarray(0,24))==='HWP Document File V3.00 '){
      if(bytes.length<1166)throw fail('INVALID','HWP 3 文件头不完整。');
      if(new DataView(bytes.buffer,bytes.byteOffset).getUint16(126,true))return {bytes:await unlock({kind:'hwp3',bytes},ask,'HWP 3'),protected:true};
      return {bytes};
    }
    if(bytes[0]!==0x50||bytes[1]!==0x4b)return {bytes};
    const zip=await JSZip.loadAsync(bytes),files=Object.values(zip.files).filter(e=>!e.dir);let total=0;
    for(const e of files){total+=e._data?.uncompressedSize||0;if(files.length>2048||(e._data?.uncompressedSize||0)>32*1024*1024||total>128*1024*1024)throw fail('LIMIT','文档解压后的内容过大。');}
    const manifest=zip.file('META-INF/manifest.xml');if(!manifest)return {bytes,zip};
    const doc=xml(await manifest.async('string')),encrypted=Array.from(doc.getElementsByTagNameNS('*','encryption-data'));
    if(!encrypted.length)return {bytes,zip};
    const paths=new Set(),entries=[];
    for(const e of encrypted){
      const file=e.parentElement,path=attr(file,'full-path'),algorithm=local(e,'algorithm'),derivation=local(e,'key-derivation'),start=local(e,'start-key-generation');
      if(!path||paths.has(path)||path.split('/').some(p=>p==='..'||p==='.')||path.startsWith('/')||path.includes('\\')||!zip.file(path))throw fail('INVALID','加密资源路径缺失或无效。');paths.add(path);
      const iterations=Number(attr(derivation,'iteration-count'));
      if(attr(algorithm,'algorithm-name')!=='http://www.w3.org/2001/04/xmlenc#aes256-cbc'||Number(attr(derivation,'key-size'))!==32||!Number.isInteger(iterations)||iterations<1||iterations>1000000||attr(start,'start-key-generation-name')!=='http://www.w3.org/2000/09/xmldsig#sha256'||!String(attr(e,'checksum-type')).endsWith('#sha256-1k')||!String(attr(derivation,'key-derivation-name')).endsWith('#pbkdf2'))throw fail('UNSUPPORTED_ENCRYPTION','暂不支持此 HWPX 的密码加密算法。');
      entries.push({path,iterations,iv:b64(attr(algorithm,'initialisation-vector'),16),salt:b64(attr(derivation,'salt')),checksum:b64(attr(e,'checksum'),32),data:await zip.file(path).async('uint8array')});
    }
    const clear=await unlock({kind:'hwpx',entries},ask,'HWPX');
    for(const entry of clear)zip.file(entry.path,entry.data);
    encrypted.forEach(e=>e.remove());zip.file('META-INF/manifest.xml',new XMLSerializer().serializeToString(doc));
    return {bytes,zip,protected:true};
  }
  async function convert(bytes,format){
    const prepared=format==='HWPML'?HmlResources.prepare(bytes):null;
    const result=await worker({kind:'convert',bytes:prepared?.bytes||bytes});
    const model=await HwpxParser.parse(result.bytes);model.format=format;
    if(prepared)HmlResources.restore(model,prepared);
    if(result.loss.count)model.warnings.add('部分旧版对象无法完整转换（'+result.loss.count+' 项）');
    return model;
  }
  global.PasswordDocuments={open,convert,configure,cancelActive:jobs.cancelAll};
})(globalThis);
