"""Generate a deterministic HWPX fixture; no personal documents are bundled."""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED, ZIP_STORED

ROOT = Path(__file__).resolve().parents[1]
NS = 'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"'

def paragraph(text, style=0, page_break=False):
    return f'<hp:p paraPrIDRef="0" styleIDRef="0" pageBreak="{int(page_break)}"><hp:run charPrIDRef="{style}"><hp:t>{escape(text)}</hp:t></hp:run></hp:p>'

def cell(row, col, text, colspan=1):
    return f'''<hp:tc borderFillIDRef="1"><hp:subList vertAlign="CENTER">{paragraph(text)}</hp:subList>
    <hp:cellAddr colAddr="{col}" rowAddr="{row}"/><hp:cellSpan colSpan="{colspan}" rowSpan="1"/>
    <hp:cellSz width="{24000*colspan}" height="2600"/><hp:cellMargin left="500" right="500" top="350" bottom="350"/></hp:tc>'''

header = '''<?xml version="1.0" encoding="UTF-8"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"><hh:refList>
<hh:fontfaces><hh:fontface lang="HANGUL"><hh:font id="0" face="sans-serif"/></hh:fontface></hh:fontfaces>
<hh:charProperties>
<hh:charPr id="0" height="1100" textColor="#253D35" shadeColor="none"><hh:fontRef hangul="0"/></hh:charPr>
<hh:charPr id="1" height="2600" textColor="#246B61" shadeColor="none"><hh:fontRef hangul="0"/><hh:bold/></hh:charPr>
<hh:charPr id="2" height="1400" textColor="#376A5C" shadeColor="none"><hh:fontRef hangul="0"/><hh:bold/></hh:charPr>
<hh:charPr id="3" height="1100" textColor="#C06B24" shadeColor="none"><hh:fontRef hangul="0"/><hh:bold/><hh:underline type="BOTTOM"/></hh:charPr>
</hh:charProperties>
<hh:paraProperties><hh:paraPr id="0"><hh:align horizontal="LEFT" vertical="BASELINE"/>
<hh:margin><hc:prev value="0"/><hc:next value="700"/><hc:left value="0"/><hc:right value="0"/><hc:intent value="0"/></hh:margin>
<hh:lineSpacing type="PERCENT" value="170"/></hh:paraPr></hh:paraProperties>
<hh:borderFills><hh:borderFill id="1"><hh:leftBorder type="SOLID" width="0.12 mm" color="#88A499"/>
<hh:rightBorder type="SOLID" width="0.12 mm" color="#88A499"/><hh:topBorder type="SOLID" width="0.12 mm" color="#88A499"/>
<hh:bottomBorder type="SOLID" width="0.12 mm" color="#88A499"/><hc:fillBrush><hc:winBrush faceColor="#F1F6F3"/></hc:fillBrush></hh:borderFill></hh:borderFills>
</hh:refList></hh:head>'''
page_def = '''<hp:secPr><hp:pagePr width="59528" height="84189" landscape="WIDELY">
<hp:margin left="5669" right="5669" top="4252" bottom="4252" header="0" footer="0"/></hp:pagePr></hp:secPr>'''
intro = f'<hp:p paraPrIDRef="0"><hp:run charPrIDRef="1">{page_def}<hp:t>HWPX · 统一阅读</hp:t></hp:run></hp:p>'
intro += paragraph('同一个 Activity，两种文档格式。', 2)
intro += paragraph('离线打开 · 保留文本 · 呈现表格和图片')
intro += '<hp:p paraPrIDRef="0"><hp:run charPrIDRef="0"><hp:t>跨样式搜索：</hp:t></hp:run><hp:run charPrIDRef="3"><hp:t>统一</hp:t></hp:run><hp:run charPrIDRef="0"><hp:t>阅读，仍然是一个完整匹配。</hp:t></hp:run></hp:p>'
intro += paragraph('中文测试 / 한국어 문서 / English document / 1234567890')
intro += '<hp:p paraPrIDRef="0"><hp:run charPrIDRef="0"><hp:pic><hp:sz width="48000" height="15000"/><hc:img binaryItemIDRef="image1"/></hp:pic></hp:run></hp:p>'
intro += paragraph('可在原生工具栏中选择文件、搜索、切换日夜模式或跳到指定页。')
intro += paragraph('表格与图片', 1, True)
rows = '<hp:tr>' + cell(0, 0, '同一页面中的表格（合并单元格）', 2) + '</hp:tr>'
for i, values in enumerate([('项目', '实现'), ('HWP', '公开 hwp.js 解析器'), ('HWPX', 'ZIP + XML + 文档模型'), ('渲染', '本地 WebView'), ('搜索', '支持跨文字样式匹配'), ('页码', '定位真实页面元素')], 1):
    rows += '<hp:tr>' + cell(i, 0, values[0]) + cell(i, 1, values[1]) + '</hp:tr>'
intro += f'<hp:p paraPrIDRef="0"><hp:run charPrIDRef="0"><hp:tbl rowCnt="7" colCnt="2"><hp:sz width="48000" height="20000"/>{rows}</hp:tbl></hp:run></hp:p>'
intro += paragraph('这份示例由 Demo 自行生成，不包含用户文档。')
intro += paragraph('分页与连续阅读', 1, True)
for i in range(1, 11):
    intro += paragraph(f'{i:02d}  阅读验证：文字保留在文档中，搜索高亮不会改写内容。可以通过“上一页 / 下一页”或点击页码跳转。')
section = f'<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" {NS}>{intro}</hs:sec>'
hpf = '''<?xml version="1.0" encoding="UTF-8"?><opf:package xmlns:opf="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="demo"><opf:metadata><opf:title>HWPX 阅读示例</opf:title></opf:metadata><opf:manifest>
<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
<opf:item id="image1" href="BinData/demo.svg" media-type="image/svg+xml"/>
</opf:manifest><opf:spine><opf:itemref idref="section0"/></opf:spine></opf:package>'''
svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="300" viewBox="0 0 960 300"><rect width="960" height="300" rx="20" fill="#e6f1e9"/><circle cx="140" cy="150" r="78" fill="#246b61"/><path d="M110 115h60v75h-60z M120 135h40 M120 150h40 M120 165h30" fill="none" stroke="white" stroke-width="6"/><text x="260" y="145" font-size="48" font-family="sans-serif" fill="#246b61">HWP + HWPX</text><text x="264" y="198" font-size="28" font-family="sans-serif" fill="#526b60">ONE ACTIVITY / OFFLINE READER</text></svg>'''
files = {'mimetype': 'application/hwp+zip', 'Contents/content.hpf': hpf, 'Contents/header.xml': header,
         'Contents/section0.xml': section, 'BinData/demo.svg': svg,
         'META-INF/container.xml': '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></rootfiles></container>'}
target = ROOT / 'app/src/main/assets/samples/sample.hwpx'
with ZipFile(target, 'w') as archive:
    for name, content in files.items():
        info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_STORED if name == 'mimetype' else ZIP_DEFLATED
        archive.writestr(info, content.encode('utf-8'))
print(target)
