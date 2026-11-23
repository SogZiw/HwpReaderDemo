/* rtf.js WMF/EMF bridge. Validate record lengths before the third-party parser. */
(function(global){
  'use strict';
  function make(node) {
    const data=node.bytes, view=new DataView(data.buffer,data.byteOffset,data.byteLength);
    const emf=/emf/i.test(node.mime);let pos=emf?0:(view.getUint32(0,true)===0x9ac6cdd7?22:0), count=0;
    if(!emf)pos+=18;
    while(pos<data.length){if(++count>100000)throw new Error('矢量图记录过多');const size=emf?view.getUint32(pos+4,true):view.getUint32(pos,true)*2;if(size<(emf?8:6)||pos+size>data.length)throw new Error('矢量图记录损坏');pos+=size;}
    const width=Math.max(1,(node.width||300)*96/72),height=Math.max(1,(node.height||200)*96/72);
    const lib=emf?EMFJS:WMFJS;lib.loggingEnabled(false);
    let wExt=width,hExt=height;
    if(emf&&data.length>=24){wExt=Math.max(1,view.getInt32(16,true)-view.getInt32(8,true));hExt=Math.max(1,view.getInt32(20,true)-view.getInt32(12,true));}
    const svg=new lib.Renderer(data.slice().buffer).render({width:width+'px',height:height+'px',xExt:width,yExt:height,wExt,hExt,mapMode:8});
    // Only the library's static vector output belongs in the document.
    for(const e of [svg,...svg.querySelectorAll('*')]){
      if(['script','foreignobject','iframe','use','a'].includes(e.localName.toLowerCase())){e.remove();continue;}
      for(const a of Array.from(e.attributes)){if(/^on/i.test(a.name)||(/href$/i.test(a.name)&&!/^#|^data:image\/(png|jpeg|bmp);base64,/i.test(a.value)))e.removeAttribute(a.name);}
    }
    svg.classList.add('doc-metafile');return svg;
  }
  global.Metafiles={make};
})(globalThis);
