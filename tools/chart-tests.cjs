const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context={Uint8Array,DataView,TextDecoder,TextEncoder};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/src/main/assets/reader/legacy-charts.js'),'utf8'),context);
const chunks=[],types=new Map();let next=100;
const i32=n=>{const b=Buffer.alloc(4);b.writeInt32LE(n);chunks.push(b);};
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16LE(n);chunks.push(b);};
function type(name){if(types.has(name)){i32(types.get(name));return;}types.set(name,next++);i32(types.get(name));const b=Buffer.from(name+'\0');u16(b.length);chunks.push(b);u16(1);}
function baseValue(){type('VtValue');type('VtObject');}
function string(id,text){i32(id);type('VtString');const payload=Buffer.concat([Buffer.from('ASCII'),Buffer.from([0,0]),Buffer.from(text+'\0','utf16le')]);u16(payload.length);chunks.push(payload,Buffer.from([0]));baseValue();}
type('VtDataGrid');type('VtMatrix');type('VtCollection');u16(6);type('VtObject');u16(2);u16(3);
i32(-1);string(801,'第一列');string(927,'第二列');string(1300,'Series');
i32(1401);type('VtInteger');i32(92);baseValue();
i32(2000);type('VtDouble');const n=Buffer.alloc(8);n.writeDoubleLE(-1.5);chunks.push(n);u16(0);baseValue();
[1,1,2,1].forEach(u16);
const bytes=new Uint8Array(Buffer.concat(chunks));const grid=context.LegacyCharts.parse(bytes);
assert.equal(grid.rows,2);assert.equal(grid.cols,3);assert.equal(grid.cells[1],'第一列');assert.equal(grid.cells[4],92);assert.equal(grid.cells[5],-1.5);
assert.throws(()=>context.LegacyCharts.parse(bytes.slice(0,-3)));
assert.equal(context.LegacyCharts.parse(new Uint8Array(100)),null);
console.log(JSON.stringify({gridDimensions:true,slotOrder:true,integerValues:true,doubleValues:true,unicodeLabels:true,truncationRejected:true}));
