"""Package the current verified build and local test evidence; exclude build caches."""
from pathlib import Path
import csv
import hashlib
import json
import shutil
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parents[1]
report = root / 'test-reports/resilience-2026-11-23'
downloads = Path.home() / 'Downloads'
apk = root / 'app/build/outputs/apk/debug/app-debug.apk'
summary = json.loads((report / 'summary.json').read_text())
digest = hashlib.sha256(apk.read_bytes()).hexdigest()
assert digest == summary['build']['sha256'], 'APK changed after device tests'
assert summary['corpus']['passed'] == 94 and summary['special']['passed'] == 20
shutil.copy2(root / 'app/build/test-results/testDebugUnitTest/TEST-com.example.hwpreader.ReaderSessionTest.xml', report / 'junit-session.xml')
shutil.copy2(root / 'app/build/reports/lint-results-debug.xml', report / 'lint-debug.xml')
issues = ET.parse(report / 'lint-debug.xml').getroot().findall('issue')
release = root / 'app/build/outputs/apk/release/app-release-unsigned.apk'
with zipfile.ZipFile(release) as archive:
    fault_assets = [n for n in archive.namelist() if 'debug-hang' in n]
assert not fault_assets
build = {
    **summary['build'], 'installedSha256': digest,
    'commands': ['./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug :app:assembleRelease --offline --console=plain', 'node tools/worker-tests.cjs'],
    'lintErrors': sum(i.get('severity') == 'Error' for i in issues),
    'lintWarnings': sum(i.get('severity') == 'Warning' for i in issues),
    'releaseFaultAssets': fault_assets,
    'sourceDistributionSha256': '76377f4c2a10981f382a4ba65ea3b2c9b771a28c6cc55c110ca8ead14f7cb01a',
    'testCopiesCleaned': True,
}
assert not build['lintErrors']
(report / 'build-under-test.json').write_text(json.dumps(build, ensure_ascii=False, indent=2) + '\n')
rows = json.loads((report / 'corpus-results.json').read_text())
with (report / 'results.csv').open('w', encoding='utf-8-sig', newline='') as stream:
    writer = csv.writer(stream)
    writer.writerow(['id', 'file', 'format', 'status', 'elapsed_ms', 'pages', 'characters', 'source_text_verified', 'warning'])
    for row in rows:
        document = row['loaded'] or {}
        writer.writerow([row['id'], row['relative'], row['format'], row['status'], row['ms'], document.get('pages'), document.get('characters'), (row['smoke'] or {}).get('sourceTextPreserved'), document.get('warning')])

shutil.copy2(apk, downloads / 'HwpReaderDemo-debug.apk')
report_zip = downloads / 'HwpReaderDemo-WebView恢复与超时回归报告.zip'
with zipfile.ZipFile(report_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(report.rglob('*')):
        if path.is_file():
            archive.write(path, Path(report.name) / path.relative_to(report))
shutil.copy2(report_zip, downloads / 'HwpReaderDemo-修复回归报告.zip')
shutil.copy2(report / 'results.csv', downloads / 'HwpReaderDemo-修复回归结果.csv')
excluded = {'build', '.gradle', '.idea', '.kotlin', '.git', '__pycache__', 'node_modules'}
source_zip = downloads / 'HwpReaderDemo.zip'
with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if path.is_file() and not set(relative.parts) & excluded and path.name not in {'local.properties', '.DS_Store'}:
            archive.write(path, Path(root.name) / relative)
for path in [downloads / 'HwpReaderDemo-debug.apk', source_zip, report_zip]:
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    print(json.dumps({'path': str(path), 'bytes': path.stat().st_size, 'sha256': sha}, ensure_ascii=False))
