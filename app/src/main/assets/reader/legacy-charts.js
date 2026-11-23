/* Bounded VtArchive grid reader, adapted from rhwp ole_chart/grid.rs (MIT).
 * Copyright (c) 2025-2026 Edward Kim. See licenses/rhwp-LICENSE.txt.
 * Preserves the original grid; does not guess chart type or series orientation.
 */
(function(global){
  'use strict';
  function parse(bytes){
    const marker=new TextEncoder().encode('VtDataGrid\0');let start=-1;
    outer:for(let i=6;i<=bytes.length-marker.length;i++){for(let j=0;j<marker.length;j++)if(bytes[i+j]!==marker[j])continue outer;start=i-6;break;}
    if(start<0)return null;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),types=new Map(),objects=new Map(),cells=[];
    let offset=start,rows=0,cols=0,counts;
    const fail=()=>{throw new Error('旧版图表数据结构不支持');};
    function take(size){if(size<0||offset+size>bytes.length)fail();const at=offset;offset+=size;return at;}
    const u16=()=>view.getUint16(take(2),true),i16=()=>view.getInt16(take(2),true),i32=()=>view.getInt32(take(4),true);
    function type(){const id=i32();if(types.has(id))return types.get(id);const length=u16();if(length>40)fail();const name=new TextDecoder().decode(bytes.slice(take(length),offset)).replace(/\0$/,'');u16();if(!['VtDataGrid','VtMatrix','VtCollection','VtObject','VtDouble','VtInteger','VtString','VtValue'].includes(name))fail();types.set(id,name);return name;}
    function base(expected){const name=type();if(name!==expected)fail();return from(name);}
    function text(payload){let split=-1;for(let i=0;i<payload.length-1;i++)if(payload[i]===0&&payload[i+1]===0){split=i;break;}
      const tail=payload.slice(split+2),unicode=split>=0&&tail.length>=2&&tail.length%2===0&&tail[tail.length-1]===0&&tail[tail.length-2]===0;
      return (unicode?new TextDecoder('utf-16le').decode(tail.slice(0,-2)):new TextDecoder('euc-kr').decode(split>=0?payload.slice(0,split):payload)).replace(/\0/g,'').trim();}
    function from(name){
      if(name==='VtObject')return null;
      if(name==='VtValue'){base('VtObject');return null;}
      if(name==='VtCollection'){i16();base('VtObject');return null;}
      if(name==='VtDouble'){const n=view.getFloat64(take(8),true);if(!Number.isFinite(n))fail();i16();base('VtValue');return n;}
      if(name==='VtInteger'){const n=i32();base('VtValue');return n;}
      if(name==='VtString'){const length=i16();let value='';if(length>0){value=text(bytes.slice(take(length),offset));take(1);}base('VtValue');return value;}
      if(name==='VtMatrix'){
        base('VtCollection');rows=u16();cols=u16();if(rows<2||cols<2||rows*cols>10000)fail();
        for(let index=0;index<rows*cols;index++){
          const id=i32();if(id===-1){cells.push(null);continue;}
          if(objects.has(id)){cells.push(objects.get(id));continue;}
          const kind=type();if(!['VtDouble','VtInteger','VtString'].includes(kind))fail();const value=from(kind);objects.set(id,value);cells.push(value);
        }return null;
      }
      if(name==='VtDataGrid'){base('VtMatrix');counts=[u16(),u16(),u16(),u16()];return null;}
      fail();
    }
    if(type()!=='VtDataGrid')fail();from('VtDataGrid');
    if(counts[0]+counts[3]!==rows||counts[1]+counts[2]!==cols)fail();
    return {rows,cols,labelRows:counts[0],labelCols:counts[1],cells};
  }
  global.LegacyCharts={parse};
})(globalThis);
