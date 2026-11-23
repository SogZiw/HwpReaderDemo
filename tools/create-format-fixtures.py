"""Create original HWPML picture fixtures for device verification (no user data)."""
import argparse
import base64
from pathlib import Path
import zlib

parser = argparse.ArgumentParser()
parser.add_argument('output', nargs='?', default='/tmp/hwp-format-fixtures')
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKyoAAAAASUVORK5CYII=')
for compressed in (True, False):
    payload = zlib.compress(png) if compressed else png
    xml = f'''<?xml version="1.0" encoding="UTF-8"?><HWPML Version="2.91"><HEAD SecCnt="1"><MAPPINGTABLE><BINDATALIST Count="1"><BINITEM Id="1" Type="Embedding" BinData="1" Format="png"/></BINDATALIST></MAPPINGTABLE></HEAD><BODY><SECTION Id="0"><P ParaShape="0" Style="0"><TEXT CharShape="0"><CHAR>图片前 한글</CHAR><PICTURE><SHAPEOBJECT><SIZE Width="5000" Height="3000"/><POSITION TreatAsChar="true"/></SHAPEOBJECT><IMAGE BinItem="1"/></PICTURE><CHAR>图片后 ABC</CHAR></TEXT></P></SECTION></BODY><TAIL><BINDATASTORAGE><BINDATA Id="1" Encoding="Base64" Compress="{str(compressed).lower()}" Size="{len(png)}">{base64.b64encode(payload).decode()}</BINDATA></BINDATASTORAGE></TAIL></HWPML>'''
    (out / f'hwp-hml-image-{str(compressed).lower()}.hml').write_text(xml)
(out / 'hwp-hml-utf16.hml').write_bytes(xml.replace('UTF-8', 'UTF-16').encode('utf-16'))
print(out)
