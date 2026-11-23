/* Run the pinned, offline compatibility engine against real supplied fixtures. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {initSync,HwpDocument} from '../app/src/main/assets/reader/rhwp/rhwp.js';
initSync({module:fs.readFileSync(fileURLToPath(new URL('../app/src/main/assets/reader/rhwp/rhwp_bg.wasm',import.meta.url)))});
const normalize=text=>JSON.parse(text).replace(/[\s\ufffc]/g,'');
const hml=Buffer.from('<?xml version="1.0" encoding="UTF-8"?><HWPML Version="2.91"><HEAD SecCnt="1"/><BODY><SECTION Id="0"><P ParaShape="0" Style="0"><TEXT CharShape="0"><CHAR>自制 HWPML fixture 한글 ABC 123</CHAR></TEXT></P></SECTION></BODY></HWPML>');
const inputs=[{name:'self-generated HWPML',bytes:hml},...process.argv.slice(2).map(file=>({name:file,bytes:fs.readFileSync(file)}))],cases=[];
for(const input of inputs){let doc,report,roundtrip;try{
  doc=new HwpDocument(input.bytes);report=doc.exportHwpxWithReport();const bytes=report.takeBytes();roundtrip=new HwpDocument(bytes);
  const before=normalize(doc.getTextFileUnicode()),after=normalize(roundtrip.getTextFileUnicode());assert.ok(before.length>0);assert.equal(after,before,'Format adaptation must preserve extracted text');
  cases.push({file:input.name,characters:before.length,textRoundtrip:true,loss:JSON.parse(report.contentLoss())});
}finally{roundtrip?.free();report?.free();doc?.free();}}
console.log(JSON.stringify({engine:'@rhwp/core 0.9.1',cases},null,2));
