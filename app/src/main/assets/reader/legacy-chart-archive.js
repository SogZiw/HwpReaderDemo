/* Bounded VtChart 6 object archive, adapted from rhwp legacy_presentation.rs.
 * MIT; Copyright (c) 2025-2026 Edward Kim. See licenses/rhwp-LICENSE.txt.
 */
(function(global){
  'use strict';
  function parse(data){
    if(data.length<60||data.length>16*1024*1024)throw Error('图表归档长度无效');
    const v=new DataView(data.buffer,data.byteOffset,data.byteLength),types=new Map(),objects=new Map();let at=40,depth=0,budget=262144;
    const fail=()=>{throw Error('图表对象结构不支持（'+at+'）');};
    function take(n){if(n<0||at+n>data.length)fail();const start=at;at+=n;return start;}
    const u16=()=>v.getUint16(take(2),true),i16=()=>v.getInt16(take(2),true),i32=()=>v.getInt32(take(4),true),u32=()=>v.getUint32(take(4),true);
    const f32=()=>{const n=v.getFloat32(take(4),true);if(!Number.isFinite(n))fail();return n;};
    const f64=()=>{const n=v.getFloat64(take(8),true);if(!Number.isFinite(n))fail();return n;};
    const rect=()=>[f32(),f32(),f32(),f32()];
    function cls(){const id=i32();if(types.has(id))return types.get(id);const n=u16();if(id<0||types.size>=64||n<2||n>64)fail();const start=take(n);if(data[at-1]!==0)fail();const name=new TextDecoder().decode(data.subarray(start,at-1)),version=u16(),c={name,version};types.set(id,c);return c;}
    function base(expected){const c=cls();if(c.name!==expected)fail();return body(c);}
    function object(){if(--budget<0)fail();const id=i32();if(id===-1)return null;if(objects.has(id))return objects.get(id);if(id<0||objects.size>=32768||depth>=32)fail();const c=cls();depth++;const result=body(c);depth--;objects.set(id,result);return result;}
    function text(payload){let split=-1;for(let i=0;i<payload.length-1;i++)if(payload[i]===0&&payload[i+1]===0){split=i;break;}
      const tail=payload.subarray(split+2),unicode=split>=0&&tail.length>=2&&tail.length%2===0&&tail[tail.length-1]===0&&tail[tail.length-2]===0;
      return (unicode?new TextDecoder('utf-16le').decode(tail.subarray(0,-2)):new TextDecoder('euc-kr').decode(split>=0?payload.subarray(0,split):payload)).replace(/\0.*$/s,'');}
    function body(c){
      const n=c.name,expected={VtChartPlot:4,VtAxis:3,VtSeries:2,VtTextBlock:2,VtWindow:2}[n]||1;if(c.version!==expected)fail();
      switch(n){
        case 'VtObject':return null;
        case 'VtCollection':{const count=u16();base('VtObject');return {count};}
        case 'VtList':if(base('VtCollection').count!==0)fail();return null;
        case 'VtArray':{const capacity=u16(),count=base('VtCollection').count;if(count>capacity||capacity>budget)fail();return Array.from({length:capacity},object);}
        case 'VtMatrix':{base('VtCollection');const rows=u16(),cols=u16();if(rows*cols>10000)fail();return {rows,cols,cells:Array.from({length:rows*cols},object)};}
        case 'VtDataGrid':{const grid=base('VtMatrix'),counts=[u16(),u16(),u16(),u16()];if(counts[0]+counts[3]!==grid.rows||counts[1]+counts[2]!==grid.cols)fail();return {...grid,labelRows:counts[0],labelCols:counts[1]};}
        case 'VtValue':base('VtObject');return null;
        case 'VtDouble':{const value=f64();take(2);base('VtValue');return value;}
        case 'VtInteger':{const value=i32();base('VtValue');return value;}
        case 'VtString':{const length=u16();let value='';if(length){const p=take(length);value=text(data.subarray(p,at));take(1);}base('VtValue');return value;}
        case 'VtBackdrop':{const p=take(50),fill=object();base('VtObject');return {kind:'backdrop',color:v.getUint32(p+34,true),width:v.getFloat32(p+44,true),frame:!!v.getUint16(p+48,true),fill};}
        case 'VtFill':{const p=take(34),color=v.getUint32(p+6,true);object();const kind=i16();base('VtObject');return {kind,color};}
        case 'VtPicture':take(2);if(i16()){if(i32()!==-1)fail();}else object();base('VtObject');return null;
        case 'VtFont':{const family=object(),size=f32(),style=u16(),effects=u16(),version=u16(),color=u32();if(version!==1||size<=0)fail();base('VtObject');return {kind:'font',family,size,style,effects,color};}
        case 'VtTextBlock':{const p=take(12);if(v.getUint16(p,true)!==1)fail();object();const font=object();u16();const margin=i32(),box=[i32(),i32(),i32(),i32()],valid=u16(),value=object(),extent=[i32(),i32()],paint=[i32(),i32(),i32(),i32()];take(2);base('VtObject');return {kind:'text',value:value||'',font,margin,box,valid,extent,paint};}
        case 'VtChartText':{const title=object(),section=base('VtChartSection');return {kind:'title',title:section.visible?title:null,section};}
        case 'VtChartTitle':case 'VtChartFootnote':return base('VtChartText');
        case 'VtChartSection':{const external=i16(),internal=i16();if(u16()!==1||external<0||internal<0)fail();const visible=!!u16(),box=rect(),location=u16(),backdrop=object();base('VtObject');return {kind:'section',visible,box,location,backdrop,external,internal};}
        case 'VtChartLegend':{const font=object();take(10);const section=base('VtChartSection');return {kind:'legend',font:section.visible?font:null,section};}
        case 'VtLight3':object();take(10);base('VtObject');return null;
        case 'VtInfLight3':take(16);base('VtObject');return null;
        case 'VtSeriesLabel':return base('VtTextBlock');
        case 'VtSeriesPoint':object();take(12);object();object();base('VtObject');return null;
        case 'VtTextFormat':base('VtObject');take(2);object();return null;
        case 'VtValueBlock':object();object();take(2);object();take(3);return base('VtTextBlock');
        case 'VtAxisScaleBlock':object();take(4);return base('VtValueBlock');
        case 'VtAxis':{u16();const visible=!!u16();u16();const manual=!!i16(),p=take(74);object();const label=object();take(34);let scale=null;if(manual){scale={min:f64(),max:f64(),divisions:u16()};take(6);if(scale.max<=scale.min||scale.divisions<1||scale.divisions>100)fail();}take(16);base('VtObject');return {kind:'axis',scale,label,visible,color:v.getUint32(p+10,true)};}
        case 'VtCLineItem':take(48);object();base('VtObject');return null;
        case 'VtSurfaceDesc':take(46);object();object();take(2);object();object();take(14);base('VtObject');return null;
        case 'VtChartPlot':{object();const p=take(136),gap=v.getFloat32(p+8,true),xgap=v.getFloat32(p+12,true);object();const axes=Array.from({length:4},object);take(30);object();take(16);const section=base('VtChartSection');return {kind:'plot',gap,xgap,axes,section};}
        case 'VtSeries':{
          const p=take(62);for(const offset of [0,22,44])if(v.getUint16(p+offset,true)!==1)fail();const color=v.getUint32(p+10,true),fill=v.getUint32(p+50,true),width=v.getFloat32(p+14,true);
          object();object();take(12+22+16+16);object();object();const legend=object();take(2);object();object();const secondary=!!i16();take(2);if(u16()!==2)fail();take(34);object();take(2+8+12);const index=u16(),count=u16();if(count!==27)fail();const selectors=Array.from({length:count},i16),extra=u16();if(extra>27)fail();take(extra*2+10);base('VtObject');return {kind:'series',index,color,fill,width,legend,secondary,selectors};
        }
        case 'VtWindow':base('VtObject');take(2);return null;
        default:throw Error('图表对象 '+n+' 暂不支持（'+at+'）');
      }
    }
    const root=cls();if(root.name!=='VtChart'||root.version!==6)fail();const grid=object();take(2);const extent=rect(),backdrop=object();object();const legend=object(),plot=object(),series=object(),title=object();object();take(6);object();const rootOptions=u16();take(8);const chartType=i16();take(4);base('VtWindow');
    if(at!==data.length||!grid?.cells||plot?.kind!=='plot'||!Array.isArray(series)||!series.length||series.length>64)fail();
    const rows=grid.rows-grid.labelRows,cols=grid.cols-grid.labelCols;
    const names=series.map(s=>s.legend?.value||'');
    const label=(r,c)=>String(grid.cells[r*grid.cols+c]??'');
    const rowLabels=Array.from({length:rows},(_,i)=>label(i+grid.labelRows,0)),colLabels=Array.from({length:cols},(_,i)=>label(0,i+grid.labelCols));
    let orientation;
    // The presentation array can contain unused default styles beyond the
    // actual data series. Match the active prefix against complete grid labels.
    const rowMatch=rows<=series.length&&rowLabels.every((s,i)=>s&&names[i]===s),colMatch=cols<=series.length&&colLabels.every((s,i)=>s&&names[i]===s);
    if(rowMatch&&!colMatch)orientation='rows';else if(colMatch&&!rowMatch)orientation='columns';
    else if(series.length===rows&&series.length!==cols)orientation='rows';else if(series.length===cols&&series.length!==rows)orientation='columns';
    let sliceStyles=null;
    if([14,15].includes(chartType)&&rows===1&&colMatch){orientation='rows';sliceStyles=series.slice(0,cols).map((s,i)=>({...s,name:colLabels[i]}));}
    if(!orientation)throw Error('图表系列方向无法确定');
    const categories=orientation==='rows'?colLabels:rowLabels;
    const values=series.slice(0,orientation==='rows'?rows:cols).map((s,i)=>({...s,name:names[i]||(orientation==='rows'?rowLabels[i]:colLabels[i]),values:categories.map((_,j)=>grid.cells[(orientation==='rows'?i+grid.labelRows:j+grid.labelRows)*grid.cols+(orientation==='rows'?j+grid.labelCols:i+grid.labelCols)])}));
    return {chartType,rootOptions,grid,extent,backdrop,legend,plot,series:values,sliceStyles,title:title?.title,orientation,categories};
  }
  global.LegacyChartArchive={parse};
})(globalThis);
