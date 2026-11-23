const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main/assets/reader'),c={Uint8Array,ArrayBuffer,DataView,TextDecoder,TextEncoder};vm.createContext(c);
for(const name of ['cfb.js','pako.min.js','model.js','legacy-charts.js','legacy-chart-archive.js','legacy-chart-renderer.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),c);
const cases=[],args=process.argv.slice(2),fallback=new Set(args.filter(a=>a.startsWith('--fallback=')).map(a=>a.slice(11)));
for(const file of [...args.filter(a=>!a.startsWith('--')), ...fallback]){
 const compound=c.CFB.read(new Uint8Array(fs.readFileSync(file)),{type:'array'});
 for(const entry of compound.FileIndex.filter(e=>/\.ole$/i.test(e.name))){
  let bytes=Uint8Array.from(entry.content);try{bytes=c.pako.inflate(bytes,{raw:true});}catch(_){}if(bytes[0]!==0xd0)bytes=bytes.slice(4);
  const ole=c.CFB.read(bytes,{type:'array'}),contents=ole.FileIndex.find(e=>e.name==='Contents');if(!contents)continue;
  const data=Uint8Array.from(contents.content),chart=c.LegacyChartArchive.parse(data);assert.ok(c.LegacyChartRenderer.eligible(chart));assert.ok(chart.series.every(s=>s.values.length===chart.categories.length));
  assert.equal(c.LegacyChartRenderer.canDraw(chart),!fallback.has(file),'Unknown stack/percentage options must preserve a preview or data fallback');
  const withoutPreview=c.CFB.utils.cfb_new();c.CFB.utils.cfb_add(withoutPreview,'Contents',data);
  const model=c.DocModel.documentModel('test'),node=c.DocModel.oleImage(model,new Uint8Array(c.CFB.write(withoutPreview,{type:'array'})));
  assert.equal(node.type,fallback.has(file)?'chart-data':'legacy-chart','A chart without a preview must select the correct rendering/fallback path');
  assert.throws(()=>c.LegacyChartArchive.parse(data.slice(0,-1)),'Truncated archive must not render a partial chart');
  const corrupt=data.slice();corrupt[55]=255;assert.throws(()=>c.LegacyChartArchive.parse(corrupt));
  cases.push({file,type:chart.chartType,rootOptions:chart.rootOptions,reconstructionAllowed:c.LegacyChartRenderer.canDraw(chart),noPreviewNode:node.type,orientation:chart.orientation,series:chart.series.length,categories:chart.categories.length,values:chart.series.map(s=>s.values),boundedFailure:true});
 }
}
assert.ok(cases.length,'Pass real HWP chart fixture paths');console.log(JSON.stringify({cases},null,2));
