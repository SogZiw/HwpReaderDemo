/* Compare the reader adapter with an upstream directory kept outside the APK.
 * node tools/rhwp-reader-tests.mjs /tmp/upstream-rhwp [extra .hwp/.hwpx/.hml ...]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {inflateRawSync} from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const reference = process.argv[2];
assert.ok(reference, 'Pass a directory containing upstream rhwp.js and rhwp_bg.wasm');
const current = path.join(root, 'app/src/main/assets/reader/rhwp');
const original = await import(pathToFileURL(path.resolve(reference, 'rhwp.js')));
const reader = await import(pathToFileURL(path.join(current, 'rhwp.js')));
original.initSync({module: fs.readFileSync(path.resolve(reference, 'rhwp_bg.wasm'))});
// Exercise the asynchronous initializer used by the actual conversion Worker.
const exports = await reader.default({module_or_path: fs.readFileSync(path.join(current, 'rhwp_bg.wasm'))});
assert.deepEqual(Object.keys(reader).sort(), ['DocumentExport', 'HwpDocument', 'default', 'initSync']);
assert.deepEqual(Object.keys(exports).filter(name => name.startsWith('hwpdocument_')).sort(),
  ['hwpdocument_exportHwpxWithReport', 'hwpdocument_getTextFileUnicode', 'hwpdocument_new']);
assert.ok(!Object.keys(exports).some(name => /^(pdf|qcms|hwpviewer)/i.test(name)), 'Unused PDF/viewer APIs must not be exported');

function prepare(input) {
  // Match the Worker's handling of compressed HWP3 before calling the WASM.
  if (input.length >= 1166 && input.subarray(0,24).toString() === 'HWP Document File V3.00 ' && input[154]) {
    const start = 1166 + input.readUInt16LE(156);
    const output = Buffer.concat([input.subarray(0,start), inflateRawSync(input.subarray(start))]);
    output[154] = 0;
    return output;
  }
  return input;
}
function convert(api, input) {
  let doc, report, roundtrip;
  try {
    doc = new api.HwpDocument(prepare(input));
    const text = doc.getTextFileUnicode();
    report = doc.exportHwpxWithReport();
    assert.equal(report.hasBytes(), true);
    const loss = report.contentLoss();
    const bytes = report.takeBytes();
    assert.equal(report.hasBytes(), false);
    assert.equal(report.contentLoss(), loss, 'Report survives taking the output bytes');
    roundtrip = new api.HwpDocument(bytes);
    return {text, loss, bytes: Buffer.from(bytes), roundtripText: roundtrip.getTextFileUnicode()};
  } finally {
    roundtrip?.free(); report?.free(); doc?.free();
  }
}

const hml = Buffer.from('<?xml version="1.0" encoding="UTF-8"?><HWPML Version="2.91"><HEAD SecCnt="1"/><BODY><SECTION Id="0"><P ParaShape="0" Style="0"><TEXT CharShape="0"><CHAR>只读转换回归 한글 ABC 123</CHAR></TEXT></P></SECTION></BODY></HWPML>');
const files = ['app/src/main/assets/samples/sample.hwp', 'app/src/main/assets/samples/sample.hwpx',
  'samples/SimpleTable.hwpx', 'samples/SimplePicture.hwpx', 'samples/sample1.hwpx'];
const cases = [{name: 'HWPML', bytes: hml}, ...files.map(name => ({name, bytes: fs.readFileSync(path.join(root,name))})),
  ...process.argv.slice(3).map(name => ({name, bytes: fs.readFileSync(name)}))];
const results = [];
for (const input of cases) {
  const before = convert(original, input.bytes), after = convert(reader, input.bytes);
  assert.deepEqual(after, before, input.name + ': bytes, text and loss report must match upstream');
  results.push({file: input.name, outputBytes: after.bytes.length, identicalToUpstream: true});
}
// The reduced module must preserve constructor failures for malformed input.
for (const input of [Buffer.alloc(0), Buffer.from('invalid HWP file')]) {
  let before, after;
  try { new original.HwpDocument(input); } catch (error) { before = String(error); }
  try { new reader.HwpDocument(input); } catch (error) { after = String(error); }
  assert.ok(before); assert.equal(after, before);
}
console.log(JSON.stringify({ok: true, cases: results, invalidInputs: 2}, null, 2));
