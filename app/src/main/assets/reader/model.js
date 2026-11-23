/* Shared, format-independent model. All dimensions use points (1/72 inch). */
(function (global) {
  'use strict';
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const unit = (value, fallback = 0) => number(value, fallback * 100) / 100;
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const color = (value, fallback = '#222222') => {
    if (value && typeof value === 'object' && 'red' in value) {
      return `rgb(${clamp(value.red, 0, 255)},${clamp(value.green, 0, 255)},${clamp(value.blue, 0, 255)})`;
    }
    return /^#[\da-f]{6}$/i.test(value || '') ? value : fallback;
  };
  const text = (value, style = {}) => ({ type: 'text', text: String(value), style });
  const paragraph = (inlines = [], style = {}) => ({ type: 'paragraph', inlines, style });
  const page = () => ({ width: 595.28, height: 841.89, left: 56.7, right: 56.7, top: 56.7, bottom: 56.7 });
  function documentModel(format) {
    return { format, sections: [], warnings: new Set(), urls: [], resources: new Map() };
  }
  function image(model, bytes, mime, width = 0, height = 0) {
    mime = ({'image/svg':'image/svg+xml','image/jpg':'image/jpeg'})[mime.toLowerCase()] || mime;
    if (/^image\/(x-)?(wmf|emf)$/i.test(mime)) return {type:'metafile',bytes:Uint8Array.from(bytes),mime,width,height};
    if (!/^image\/(png|jpeg|jpg|gif|bmp|webp|svg\+xml)$/i.test(mime)) {
      model.warnings.add('部分图像格式暂不支持');
      return { type: 'unsupported', text: '图像：' + mime };
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    model.urls.push(url);
    return { type: 'image', url, width, height };
  }
  function oleImage(model, bytes) {
    // Extract a static bitmap from an OLE compound file. Never activate OLE,
    // follow links, or execute embedded code. Other OLE classes stay explicit.
    const signature = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
    const offset = [0,4].find(start => signature.every((b,i)=>bytes[start+i]===b));
    if (offset == null || bytes.length > 32*1024*1024) return null;
    try {
      const compound=CFB.read(bytes.slice(offset),{type:'array'});
      const native=compound.FileIndex.find(e=>e.name==='\u0001Ole10Native')?.content;
      if (native) {
      const data=Uint8Array.from(native), view=new DataView(data.buffer);
      for (let i=0;i<Math.min(4096,data.length-54);i++) {
        if (data[i]!==0x42 || data[i+1]!==0x4d) continue;
        const size=view.getUint32(i+2,true), header=view.getUint32(i+14,true);
        if (size>=54 && i+size<=data.length && [40,52,56,108,124].includes(header) && view.getUint16(i+26,true)===1) return image(model,data.slice(i,i+size),'image/bmp');
      }
      }
      const contents=compound.FileIndex.find(e=>e.name==='Contents')?.content;
      let chart=null;
      if(contents&&global.LegacyChartArchive&&global.LegacyChartRenderer)try{const parsed=LegacyChartArchive.parse(Uint8Array.from(contents));if(LegacyChartRenderer.eligible(parsed))chart=parsed;}catch(_){}
      for (const entry of compound.FileIndex.filter(e=>/^\u0002OlePres/.test(e.name))) {
        const data=Uint8Array.from(entry.content), view=new DataView(data.buffer);
        if(data.length<40 || view.getUint32(0,true)!==0xffffffff)continue;
        const format=view.getUint32(4,true), targetSize=view.getUint32(8,true), header=8+targetSize;
        if(targetSize<4 || header+28>data.length)continue;
        const size=view.getUint32(header+24,true), offset=header+28;
        if(size>data.length-offset)continue;
        if(format===3||format===14){const preview=image(model,data.slice(offset,offset+size),'image/'+(format===3?'wmf':'emf'));return chart?{type:'legacy-chart',chart,preview}:preview;}
      }
      if(contents&&global.LegacyCharts){
        const data=Uint8Array.from(contents);
        if(chart&&LegacyChartRenderer.canDraw(chart))return {type:'legacy-chart',chart};
        const grid=LegacyCharts.parse(data);if(grid){model.warnings.add('此旧版图表的样式尚不支持，已显示原始数据表');return {type:'chart-data',grid};}
      }
    } catch (_) { /* Malformed/unsupported OLE receives the normal placeholder. */ }
    return null;
  }
  // Supported CSS values are assigned as properties; document text never becomes HTML.
  const borderStyle = value => ({ NONE: 'none', SOLID: 'solid', DASH: 'dashed', DOT: 'dotted', DOUBLE: 'double', DOUBLE_SLIM: 'double' })[String(value).toUpperCase()] || 'solid';
  global.DocModel = { number, unit, clamp, color, text, paragraph, page, documentModel, image, oleImage, borderStyle };
})(globalThis);
