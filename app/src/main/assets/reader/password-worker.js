'use strict';
importScripts('cfb.js','pako.min.js','crypto-js.js','password-core.js');
self.onmessage=async event=>{
  let job=event.data;
  try{
    if(job.kind==='convert'){
      const api=await import('./rhwp/rhwp.js');
      await api.default({module_or_path:new URL('rhwp/rhwp_bg.wasm',self.location.href)});
      let input=job.bytes;
      if(new TextDecoder().decode(input.subarray(0,24))==='HWP Document File V3.00 '&&input.length>=1166&&input[154]){
        const start=1166+new DataView(input.buffer,input.byteOffset).getUint16(156,true),body=PasswordCrypto.inflate(input.subarray(start)).data;
        input=new Uint8Array(start+body.length);input.set(job.bytes.subarray(0,start));input.set(body,start);input[154]=0;
      }
      let doc,report;
      try{
        doc=new api.HwpDocument(input);report=doc.exportHwpxWithReport();
        const bytes=report.takeBytes();if(bytes.length>128*1024*1024)throw PasswordCrypto.error('LIMIT','转换后的文档过大。');
        self.postMessage({ok:true,result:{bytes,loss:JSON.parse(report.contentLoss())}});
      }finally{report?.free();doc?.free();}
      return;
    }
    const result=job.kind==='hwp5'?PasswordCrypto.decryptHwp5(job.bytes,job.password):job.kind==='hwp3'?PasswordCrypto.decryptHwp3(job.bytes,job.password):await PasswordCrypto.decryptHwpx(job.entries,job.password);
    job.password='';self.postMessage({ok:true,result});
  }catch(e){self.postMessage({ok:false,code:e.code||'INVALID',message:e.code?e.message:job.kind==='convert'?'此文档包含暂不支持的旧版结构，无法转换阅读。':'加密文件无法读取。'});}
  finally{job.password='';job=null;self.close();}
};
