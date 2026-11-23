"""Re-run an already prepared device corpus against an installed debug Demo.

Manifest: JSON array of {id, relative, format, bytes, uri}; uri points to a copy
the app can read. No original is modified. Requires adb and a connected device.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import quote

parser = argparse.ArgumentParser()
parser.add_argument('manifest')
parser.add_argument('output')
parser.add_argument('--timeout', type=int, default=60)
args = parser.parse_args()
manifest = json.loads(Path(args.manifest).read_text())
results = []

def adb(*argv):
    process = subprocess.run(['adb', *argv], text=True, capture_output=True, timeout=15)
    if process.returncode and not (argv[:2] == ('shell', 'pidof')):
        raise RuntimeError(process.stderr or process.stdout)
    return process.stdout

for item in manifest:
    started = time.monotonic()
    since = adb('shell', 'date', '+%m-%dT%H:%M:%S').strip().replace('T', ' ') + '.000'
    # One URI argument; percent-encoding also avoids remote-shell metacharacters.
    uri = quote(item['uri'], safe=':/%')
    adb('shell', 'am', 'start', '-S', '-W', '-f', '0x10008000', '-n',
        'com.example.hwpreader.demo/com.example.hwpreader.HwpReaderActivity',
        '-a', 'android.intent.action.VIEW', '-d', uri, '--ez', 'verify', 'true')
    pid = ''
    for _ in range(5):
        pid = adb('shell', 'pidof', 'com.example.hwpreader.demo').strip()
        if pid:
            break
        time.sleep(.3)
    status, log = ('timeout' if pid else 'no-pid'), ''
    while pid and time.monotonic() - started < args.timeout:
        log = adb('logcat', '-d', '--pid=' + pid, '-T', since, '-s', 'HwpReaderDemo', 'AndroidRuntime')
        if 'LOADED {' in log:
            status = 'loaded'
            break
        if 'READER_ERROR' in log or 'FATAL EXCEPTION' in log:
            status = 'error'
            break
        time.sleep(.7)
    def message(marker):
        matches = re.findall(marker + r' (\{[^\n]+\})', log)
        return json.loads(matches[-1]) if matches else None
    loaded, smoke = message('LOADED'), message('SMOKE_OK')
    if status == 'loaded' and (not smoke or not loaded or
            not re.search(r'PAGE_START session=' + re.escape(loaded['session']), log)):
        status = 'missing-verification'
    results.append({**{k: item[k] for k in ('id', 'relative', 'format', 'bytes')},
        'status': status, 'ms': round((time.monotonic() - started) * 1000),
        'loaded': loaded, 'smoke': smoke, 'log': log})
    Path(args.output).write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(item['id'], status, results[-1]['ms'], flush=True)
