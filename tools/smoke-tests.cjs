/* Run with Node.js 20+: node tools/smoke-tests.cjs [optional HWP path]. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { Blob } = require('node:buffer');
const root = path.resolve(__dirname, '..');

function run(extraFile) {
  const context = { console: { log() {}, error() {}, warn() {} }, Uint8Array, ArrayBuffer, DataView, TextDecoder, TextEncoder, URL, Blob };
  vm.createContext(context);
  for (const file of ['cfb.js', 'pako.min.js', 'crypto-js.js', 'distribution.js', 'hwp-parser.js', 'model.js', 'hwp-adapter.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'app/src/main/assets/reader', file), 'utf8'), context, { filename: file });
  }
  const reports = [];
  function inspect(file) {
    const bytes = new Uint8Array(fs.readFileSync(file));
    const source = context.HWPParser.parse(bytes);
    const model = context.HwpAdapter.parse(bytes);
    assert.equal(model.format, 'HWP');
    assert.equal(model.sections.length, source.sections.length);
    let tables = 0, images = 0, text = '';
    function walk(node) {
      if (node.type === 'text') text += node.text;
      if (node.type === 'image') images++;
      if (node.type === 'table') { tables++; node.cells.forEach(cell => cell.blocks.forEach(walk)); }
      if (node.inlines) node.inlines.forEach(walk);
      if (node.blocks) node.blocks.forEach(walk);
    }
    model.sections.forEach(section => section.blocks.forEach(walk));
    assert.ok(text.length > 20, 'Real HWP must yield readable text');
    assert.ok(model.sections.every(section => section.page.width > 100));
    model.urls.forEach(url => URL.revokeObjectURL(url));
    reports.push({ file: path.basename(file), sections: model.sections.length, characters: text.length, tables, images });
  }
  inspect(path.join(root, 'app/src/main/assets/samples/sample.hwp'));
  assert.ok(reports[0].tables > 0, 'Public sample includes actual tables');
  assert.ok(reports[0].images > 0, 'Public sample includes actual images');
  if (extraFile) inspect(extraFile);
  const empty = new Uint8Array(64);
  assert.throws(() => context.HwpAdapter.parse(empty));
  // An actual CFB with the encryption bit set must be rejected before rendering.
  const original = context.CFB.read(new Uint8Array(fs.readFileSync(path.join(root, 'app/src/main/assets/samples/sample.hwp'))), { type: 'array' });
  const header = context.CFB.find(original, 'FileHeader');
  header.content[36] |= 2;
  const encrypted = context.CFB.write(original, { type: 'array' });
  assert.throws(() => context.HwpAdapter.parse(new Uint8Array(encrypted)), /已加密/);
  return { reports, malformedRejected: true, encryptedRejected: true };
}
module.exports = { run };
if (require.main === module) console.log(JSON.stringify(run(process.argv[2]), null, 2));
