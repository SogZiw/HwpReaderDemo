/* Read-only HWP distribution streams, Hancom public specification revision 1.2.
 * 본 제품은 한글과컴퓨터의 글 문서 파일(.hwp) 공개 문서를 참고하여 개발하였습니다.
 * Decoded streams stay in memory; original files and their restrictions remain.
 */
(function(global){
  'use strict';
  function header(stream){
    const bytes=Uint8Array.from(stream);
    if(bytes.length<4)throw new Error('分发文档记录不完整。');
    const view=new DataView(bytes.buffer),record=view.getUint32(0,true);
    let size=record>>>20,start=4;
    if(size===4095){if(bytes.length<8)throw new Error('分发文档记录不完整。');size=view.getUint32(4,true);start=8;}
    if((record&1023)!==28 || (record>>>10&1023)!==0 || size!==256 || bytes.length<start+256)throw new Error('分发文档头部损坏或格式不支持。');
    const data=bytes.slice(start,start+256),seed=new DataView(data.buffer).getUint32(0,true);
    let state=seed,at=0;
    const rand=()=>{state=(Math.imul(state,214013)+2531011)>>>0;return state>>>16&32767;};
    while(at<256){const value=rand()&255,count=(rand()&15)+1;for(let i=0;i<count&&at<256;i++,at++)data[at]^=value;}
    const offset=(seed&15)+4,flags=new DataView(data.buffer).getUint16(offset+80,true),key=data.slice(offset,offset+16);
    data.fill(0);
    return {bytes,start:start+256,key,permissions:{readOnly:true,allowCopy:!(flags&1),allowPrint:!(flags&2)}};
  }
  function permissions(stream){const info=header(stream);info.key.fill(0);return info.permissions;}
  function decode(stream,compressed){
    const info=header(stream),ciphertext=info.bytes.subarray(info.start);
    if(!ciphertext.length||ciphertext.length%16!==0){info.key.fill(0);throw new Error('分发文档正文长度不正确。');}
    const key=CryptoJS.lib.WordArray.create(info.key);
    let plain;
    try {
      plain=CryptoJS.AES.decrypt({ciphertext:CryptoJS.lib.WordArray.create(ciphertext)},key,{mode:CryptoJS.mode.ECB,padding:CryptoJS.pad.NoPadding});
      const data=new Uint8Array(plain.sigBytes);
      for(let i=0;i<data.length;i++)data[i]=plain.words[i>>>2]>>>(24-i%4*8)&255;
      if(compressed)return data; // The bounded inflater consumes the raw DEFLATE stream.
      // Uncompressed records may end with up to 15 AES block-alignment zeros.
      const view=new DataView(data.buffer);let at=0,count=0;
      while(at<data.length){
        if(data.length-at<=15&&data.subarray(at).every(x=>x===0))return data.slice(0,at);
        if(at+4>data.length||++count>1000000)throw new Error('分发文档正文记录损坏。');
        const record=view.getUint32(at,true);let size=record>>>20;at+=4;
        if((record&1023)<16)throw new Error('分发文档正文记录损坏。');
        if(size===4095){if(at+4>data.length)throw new Error('分发文档正文记录损坏。');size=view.getUint32(at,true);at+=4;}
        if(at+size>data.length)throw new Error('分发文档正文记录损坏。');at+=size;
      }
      return data;
    } finally { info.key.fill(0);key.words.fill(0);if(plain)plain.words.fill(0); }
  }
  global.HwpDistribution={decode,permissions};
})(globalThis);
