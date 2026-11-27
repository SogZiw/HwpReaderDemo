"""Re-download pinned public dependencies and reproduce the browser import adaptation.

Optional maintenance tool, not a prerequisite for building/running the demo.
"""
import base64
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tarfile
import tempfile
import shutil
from urllib.request import urlopen

root = Path(__file__).resolve().parents[1]
lock = json.loads((root / 'tools/vendor-lock.json').read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--wasm-opt', type=Path, default=os.environ.get('WASM_OPT') or shutil.which('wasm-opt'))
args = parser.parse_args()
if 'readerOnly' in lock.get('rhwpCore', {}) and not args.wasm_opt:
    parser.error('Reader-only WASM requires Binaryen 132; pass --wasm-opt /path/to/wasm-opt')
destination = root / 'app/src/main/assets/reader'
for item in lock['files']:
    data = urlopen(item['url'], timeout=60).read()
    assert hashlib.sha256(data).hexdigest() == item['sha256'], item['file'] + ' checksum mismatch'
    (destination / item['file']).write_bytes(data)
    print('Verified', item['file'])
data = urlopen(lock['parser']['url'], timeout=60).read()
integrity = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode()
assert integrity == lock['parser']['integrity'], 'Parser archive checksum mismatch'
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
    source = archive.extractfile('package/dist/index.js').read().decode()
def imports(match):
    names, library = match.groups()
    return 'var {' + re.sub(r'\bas\b', ':', names) + '} = globalThis.' + ('CFB' if library == 'cfb' else 'pako') + ';'
source = re.sub(r'import \{([^}]+)\} from "(cfb|pako)";', imports, source)
source = re.sub(r'var \{ inflate\s*:\s*(\w+) \} = globalThis.pako;', r'var \1 = (...args) => globalThis.pako.inflate(...args);', source)
source = source.replace('var { inflate } = globalThis.pako;', 'var inflate = (...args) => globalThis.pako.inflate(...args);')
source = re.sub(r'export \{([\s\S]*?)\};', r'globalThis.HWPParser = {\1};', source)
source = source.replace('//# sourceMappingURL=index.js.map', '')
source = '/* @hwp.js/parser 0.0.4-alpha.0, Apache-2.0. Imports adapted to local browser globals; see third_party. */\n' + source
assert hashlib.sha256(source.encode()).hexdigest() == lock['parser']['adaptedSha256'], 'Adapted parser checksum mismatch'
import runpy
source = runpy.run_path(str(root / 'tools/patch-parser.py'))['patch'](source)
assert hashlib.sha256(source.encode()).hexdigest() == lock['parser']['patchedSha256'], 'Patched parser checksum mismatch'
(destination / 'hwp-parser.js').write_text(source)
print('Verified and adapted hwp-parser.js')
if 'rhwpCore' in lock:
    item = lock['rhwpCore']
    data = urlopen(item['url'], timeout=60).read()
    assert 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode() == item['integrity'], 'rhwp archive checksum mismatch'
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive, tempfile.TemporaryDirectory(prefix='rhwp-upstream-') as temporary:
        upstream = Path(temporary)
        for name, expected in item['files'].items():
            payload = archive.extractfile('package/' + name).read()
            assert hashlib.sha256(payload).hexdigest() == expected, name + ' checksum mismatch'
            (upstream / name).write_bytes(payload)
        adapter = runpy.run_path(str(root / 'tools/trim-rhwp.py'))
        print(adapter['trim'](upstream, destination / 'rhwp', args.wasm_opt.resolve()))
    print('Verified reader-only rhwp/core WASM compatibility adapter')
