/* HWPX adapter written for this demo. ZIP -> namespace-aware XML -> shared model.
 * No code from the inspected Android application's HWPX parser is used here.
 */
(function (global) {
  'use strict';
  const M = global.DocModel;
  const elements = e => Array.from(e?.children || []);
  const children = (e, name) => elements(e).filter(n => n.localName === name);
  const child = (e, name) => children(e, name)[0];
  const descendants = (e, name) => Array.from(e?.getElementsByTagNameNS('*', name) || []);
  const attr = (e, name, fallback = '') => e?.getAttribute(name) ?? fallback;
  const num = (e, name, fallback = 0) => M.number(attr(e, name, fallback), fallback);
  const signed = (e, name, fallback = 0) => {const n=num(e,name,fallback);return n>=0x80000000&&n<=0xffffffff?n-0x100000000:n;};
  function xml(source, name) {
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error(name + ' 含有不支持的 XML 声明。');
    const doc = new DOMParser().parseFromString(source, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error(name + ' 的 XML 内容损坏。');
    return doc;
  }
  function normalize(path) {
    const result = [];
    for (const part of path.replace(/\\/g, '/').split('/')) {
      if (part === '..') { if (!result.length) throw new Error('文档资源路径无效。'); result.pop(); }
      else if (part && part !== '.') result.push(part);
    }
    return result.join('/');
  }
  async function parseHwpx(bytes, options = {}) {
    const model = M.documentModel('HWPX');
    const sourceIds = new WeakMap();
    model.expectedTextRecords=[];
    const zip = options.zip || await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files).filter(e => !e.dir);
    if (entries.length > 2048) throw new Error('HWPX 中的资源数量过多。');
    let total = 0;
    for (const entry of entries) {
      total += entry._data?.uncompressedSize || 0;
      if ((entry._data?.uncompressedSize || 0) > 32 * 1024 * 1024 || total > 128 * 1024 * 1024) throw new Error('HWPX 解压后的内容过大。');
    }
    async function readXml(path) {
      const entry = zip.file(path);
      if (!entry) throw new Error('HWPX 缺少 ' + path);
      return xml(await entry.async('string'), path);
    }
    const packagePath = zip.file('Contents/content.hpf') ? 'Contents/content.hpf' : 'content.hpf';
    const hpf = await readXml(packagePath);
    const base = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/') + 1) : '';
    function resolve(href) {
      const direct = normalize(href);
      if (zip.file(direct)) return direct;
      return normalize(base + href);
    }
    const manifest = new Map(descendants(hpf, 'item').map(e => [attr(e, 'id'), {
      id: attr(e, 'id'), path: resolve(attr(e, 'href')), mime: attr(e, 'media-type')
    }]));
    const encryptionPath = zip.file('META-INF/manifest.xml');
    if (encryptionPath) {
      const encryption = xml(await encryptionPath.async('string'), 'manifest.xml');
      if (descendants(encryption, 'encryption-data').length) throw new Error('此 HWPX 已加密，请先移除密码。');
    }
    const headerItem = Array.from(manifest.values()).find(e => /(^|\/)header\.xml$/i.test(e.path));
    const header = await readXml(headerItem?.path || 'Contents/header.xml');
    const fonts = new Map(), charStyles = new Map(), paraStyles = new Map(), borders = new Map();
    for (const face of descendants(header, 'fontface')) {
      for (const font of children(face, 'font')) fonts.set(attr(face, 'lang') + ':' + attr(font, 'id'), attr(font, 'face'));
    }
    for (const c of descendants(header, 'charPr')) {
      const ref = child(c, 'fontRef');
      const rel = num(child(c, 'relSz'), 'hangul', 100) / 100;
      charStyles.set(attr(c, 'id'), {
        fontSize: M.unit(num(c, 'height', 1000)) * rel,
        fontFamily: fonts.get('HANGUL:' + attr(ref, 'hangul')) || fonts.get('LATIN:' + attr(ref, 'latin')) || 'sans-serif',
        color: M.color(attr(c, 'textColor')), backgroundColor: M.color(attr(c, 'shadeColor'), 'transparent'),
        fontWeight: child(c, 'bold') ? 'bold' : 'normal', fontStyle: child(c, 'italic') ? 'italic' : 'normal',
        letterSpacing: num(child(c, 'spacing'), 'hangul') / 100,
        textDecoration: [child(c, 'underline') && attr(child(c, 'underline'), 'type') !== 'NONE' ? 'underline' : '',
          child(c, 'strikeout') && attr(child(c, 'strikeout'), 'shape') !== 'NONE' ? 'line-through' : ''].filter(Boolean).join(' '),
        verticalAlign: child(c, 'supscript') ? 'super' : child(c, 'subscript') ? 'sub' : 'baseline'
      });
    }
    for (const p of descendants(header, 'paraPr')) {
      const margin = child(p, 'margin') || descendants(p, 'margin')[0];
      const spacing = child(p, 'lineSpacing') || descendants(p, 'lineSpacing')[0];
      const horizontal = attr(child(p, 'align'), 'horizontal', 'LEFT').toLowerCase();
      paraStyles.set(attr(p, 'id'), {
        textAlign: ['left', 'right', 'center', 'justify'].includes(horizontal) ? horizontal : 'justify',
        marginTop: M.unit(num(child(margin, 'prev'), 'value')),
        marginBottom: M.unit(num(child(margin, 'next'), 'value')),
        marginLeft: Math.max(0, M.unit(num(child(margin, 'left'), 'value'))),
        marginRight: Math.max(0, M.unit(num(child(margin, 'right'), 'value'))),
        textIndent: M.unit(num(child(margin, 'intent'), 'value')),
        lineHeight: attr(spacing, 'type') === 'PERCENT' ? M.clamp(num(spacing, 'value', 160) / 100, .8, 4) : 1.5
      });
    }
    for (const b of descendants(header, 'borderFill')) {
      const style = {};
      for (const side of ['left', 'right', 'top', 'bottom']) {
        const edge = child(b, side + 'Border');
        if (edge) {
          const width = attr(edge, 'width', '0.12 mm');
          const safeWidth = /^\d*\.?\d+\s*(mm|pt|px)$/.test(width) ? width : '0.5pt';
          style['border' + side[0].toUpperCase() + side.slice(1)] = `${safeWidth} ${M.borderStyle(attr(edge, 'type'))} ${M.color(attr(edge, 'color'))}`;
        }
      }
      const brush = descendants(b, 'winBrush')[0];
      if (brush) style.backgroundColor = M.color(attr(brush, 'faceColor'), 'transparent');
      borders.set(attr(b, 'id'), style);
    }
    for (const item of manifest.values()) {
      const entry = zip.file(item.path);
      if (!entry) continue;
      if (item.mime.startsWith('image/')) model.resources.set(item.id, M.image(model, await entry.async('uint8array'), item.mime));
      else if (/\.ole$/i.test(item.path)) {
        const image = M.oleImage(model, await entry.async('uint8array'));
        if (image) model.resources.set(item.id, image);
      }
    }
    function commonSize(e) {
      const size = child(e, 'sz') || (num(child(e, 'curSz'), 'width') ? child(e, 'curSz') : child(e, 'orgSz'));
      return { width: M.unit(num(size, 'width')), height: M.unit(num(size, 'height')) };
    }
    function objectInfo(e, depth) {
      const pos = child(e, 'pos'), caption = child(e, 'caption');
      const size = commonSize(e);
      return { ...size, zOrder: num(e, 'zOrder'),
        position: pos && attr(pos, 'treatAsChar') !== '1' ? {
          x: M.unit(signed(pos, 'horzOffset')), y: M.unit(signed(pos, 'vertOffset')),
          horizontal: attr(pos, 'horzRelTo'), vertical: attr(pos, 'vertRelTo'),
          alignX: attr(pos, 'horzAlign'), alignY: attr(pos, 'vertAlign'), wrap: attr(e, 'textWrap')
        } : null,
        caption: caption ? { side: attr(caption, 'side'), gap: M.unit(num(caption, 'gap')),
          blocks: children(child(caption, 'subList'), 'p').map(p => paragraph(p, depth + 1)) } : null
      };
    }
    function shape(e, depth) {
      const line = child(e, 'lineShape'), brush = child(e, 'fillBrush');
      const win = child(brush, 'winBrush'), grad = child(brush, 'gradation'), image = descendants(brush, 'img')[0];
      const original = child(e, 'orgSz'), current = child(e, 'curSz'), draw = child(e, 'drawText'), list = child(draw, 'subList');
      const point = p => ({ x: num(p, 'x'), y: num(p, 'y') });
      return { type: 'shape', kind: e.localName, ...objectInfo(e, depth),
        viewWidth: num(original, 'width', num(current, 'width', 100)), viewHeight: num(original, 'height', num(current, 'height', 100)),
        points: elements(e).filter(p => /^pt[0-3]?$/.test(p.localName)).map(point),
        start: point(child(e, 'startPt')), end: point(child(e, 'endPt')),
        center: point(child(e, 'center')), axis1: point(child(e, 'ax1')), axis2: point(child(e, 'ax2')),
        arcType: attr(e, 'type'),
        segments: children(e, 'seg').map(s => ({ kind: attr(s, 'type'), x1: num(s, 'x1'), y1: num(s, 'y1'), x2: num(s, 'x2'), y2: num(s, 'y2') })),
        stroke: M.color(attr(line, 'color')), strokeWidth: num(line, 'width', 33), lineStyle: attr(line, 'style', 'SOLID'),
        head: attr(line, 'headStyle'), tail: attr(line, 'tailStyle'),
        fill: win ? M.color(attr(win, 'faceColor'), 'none') : 'none',
        gradient: grad ? { angle: num(grad, 'angle'), colors: children(grad, 'color').map(c => M.color(attr(c, 'value'))) } : null,
        fillImage: model.resources.get(attr(image, 'binaryItemIDRef'))?.url,
        shadow: child(e, 'shadow') ? { kind: attr(child(e, 'shadow'), 'type'), color: M.color(attr(child(e, 'shadow'), 'color')), alpha: M.clamp(num(child(e, 'shadow'), 'alpha'),0,255), x: M.unit(num(child(e, 'shadow'), 'offsetX')), y: M.unit(num(child(e, 'shadow'), 'offsetY')) } : null,
        angle: num(child(e, 'rotationInfo'), 'angle'), flipX: attr(child(e, 'flip'), 'horizontal') === '1', flipY: attr(child(e, 'flip'), 'vertical') === '1',
        blocks: children(list, 'p').map(p => paragraph(p, depth + 1)), verticalAlign: attr(list, 'vertAlign', 'TOP'),
        textMargin: ['top', 'right', 'bottom', 'left'].map(s => M.unit(num(child(draw, 'textMargin'), s, 283)))
      };
    }
    let visited = 0;
    function paragraph(e, depth = 0) {
      if (depth > 30 || ++visited > 100000) throw new Error('文档结构过于复杂。');
      const result = M.paragraph([], paraStyles.get(attr(e, 'paraPrIDRef')) || {});
      result.pageBreak = attr(e, 'pageBreak') === '1';
      result.columnBreak = attr(e, 'columnBreak') === '1';
      result.hasOriginalY = descendants(e, 'lineseg').length > 0;
      result.originalY = M.unit(num(descendants(e, 'lineseg')[0], 'vertpos'));
      for (const item of elements(e)) {
        if (item.localName === 'run') parseRun(item, result.inlines, charStyles.get(attr(item, 'charPrIDRef')) || {}, depth);
      }
      return result;
    }
    function table(e, depth) {
      const cells = [];
      for (const row of children(e, 'tr')) {
        for (const cell of children(row, 'tc')) {
          const address = child(cell, 'cellAddr'), span = child(cell, 'cellSpan');
          const size = child(cell, 'cellSz'), margin = child(cell, 'cellMargin');
          const list = child(cell, 'subList');
          cells.push({
            row: num(address, 'rowAddr'), column: num(address, 'colAddr'),
            colSpan: M.clamp(num(span, 'colSpan', 1), 1, 256), rowSpan: M.clamp(num(span, 'rowSpan', 1), 1, 256),
            width: M.unit(num(size, 'width')), height: M.unit(num(size, 'height')),
            padding: ['left', 'right', 'top', 'bottom'].map(side => {
              const value=signed(margin,side,-1),inherited=num(child(e,'inMargin'),side,150);
              return M.unit(Math.max(0,value<0?inherited:value));
            }),
            style: { ...(borders.get(attr(cell, 'borderFillIDRef')) || {}), verticalAlign: attr(list, 'vertAlign', 'CENTER').toLowerCase() === 'center' ? 'middle' : attr(list, 'vertAlign', 'top').toLowerCase() },
            blocks: children(list, 'p').map(p => paragraph(p, depth + 1))
          });
          if (cells.length > 10000) throw new Error('表格单元格数量过多。');
        }
      }
      return { type: 'table', cells, ...objectInfo(e, depth), position: null };
    }
    function parseText(e, output, style) {
      let pending = '';
      for (const part of e.childNodes) {
        if (part.nodeType === 3 || part.nodeType === 4) pending += part.nodeValue;
        else if (part.nodeType === 1) {
          switch (part.localName) {
            case 'tab': pending += '\t'; break;
            case 'lineBreak': pending += '\n'; break;
            case 'nbSpace': pending += '\u00a0'; break;
            case 'fwSpace': pending += '\u3000'; break;
            default: pending += part.textContent || '';
          }
        }
      }
      if (pending) output.push({ ...M.text(pending, style), sourceId:sourceIds.get(e) });
    }
    function parseRun(e, output, style, depth) {
      if (depth > 30) throw new Error('文档嵌套层数过多。');
      for (const item of elements(e)) {
        switch (item.localName) {
          case 't': parseText(item, output, style); break;
          case 'tbl': output.push(table(item, depth + 1)); break;
          case 'pic': {
            const ref = descendants(item, 'img')[0];
            const image = model.resources.get(attr(ref, 'binaryItemIDRef'));
            output.push(image ? { ...image, ...objectInfo(item, depth) } : { type: 'unsupported', text: '缺失的图片资源' });
            break;
          }
          case 'equation': {
            const script = child(item, 'script')?.textContent || '';
            output.push({ type: 'equation', text: script });
            break;
          }
          case 'rect': case 'ellipse': case 'line': case 'polygon': case 'arc': case 'curve': case 'connectLine': {
            output.push(shape(item, depth));
            break;
          }
          case 'container': {
            const items = []; parseRun(item, items, style, depth + 1);
            output.push({ type: 'group', ...objectInfo(item, depth), items: items.map((node, i) => {
              const source = elements(item).filter(e => ['pic','rect','ellipse','line','polygon','arc','curve','connectLine','container'].includes(e.localName))[i];
              const offset = child(source, 'offset');
              const matrices = children(child(source, 'renderingInfo'), 'scaMatrix');
              const sx = matrices.reduce((v,m) => v * num(m, 'e1', 1), 1), sy = matrices.reduce((v,m) => v * num(m, 'e5', 1), 1);
              return { ...node, position: null, x: M.unit(signed(offset, 'x')), y: M.unit(signed(offset, 'y')),
                width: node.width * sx, height: node.height * sy };
            }) }); break;
          }
          case 'textart': {
            const properties=child(item,'textartPr');
            output.push({ type:'textart', ...objectInfo(item,depth),text:attr(item,'text').replace(/␍␊/g,'\n'),shape:attr(properties,'textShape'),font:attr(properties,'fontName'),fill:M.color(attr(descendants(item,'winBrush')[0],'faceColor')) });break;
          }
          case 'dutmal': output.push({ type: 'ruby', text: child(item, 'mainText')?.textContent || '', annotation: child(item, 'subText')?.textContent || '' }); break;
          case 'autoNum': output.push(M.text(attr(child(item, 'autoNumFormat'), 'prefixChar') + attr(item, 'num') + attr(child(item, 'autoNumFormat'), 'suffixChar'), style)); break;
          case 'button': case 'checkBtn': case 'radioBtn': case 'comboBox': case 'edit': {
            const prefix = item.localName === 'checkBtn' ? (attr(item, 'value') === 'CHECKED' ? '☑ ' : '☐ ') : item.localName === 'radioBtn' ? '◯ ' : '';
            output.push({ type: 'box', ...objectInfo(item, depth), blocks: [M.paragraph([M.text(prefix + (attr(item, 'caption') || child(item, 'text')?.textContent || attr(item, 'selectedValue') || ' '), style)])],
              style: { border: '.5pt solid #777', backgroundColor: M.color(attr(item, 'backColor'), '#fff') } }); break;
          }
          case 'video': {
            const image = model.resources.get(attr(item, 'imageIDRef'));
            output.push(image ? { ...image, ...objectInfo(item, depth) } : { type: 'unsupported', text: '视频预览不可用' });
            model.warnings.add('视频源仅链接外部 Windows 文件，文档未嵌入视频；已显示封面'); break;
          }
          case 'ole': {
            const image = model.resources.get(attr(item, 'binaryItemIDRef'));
            output.push(image ? { ...image, ...objectInfo(item, depth) } : { type: 'unsupported', ...objectInfo(item, depth), text: '嵌入 OLE 对象（暂不支持）' });
            if (!image) model.warnings.add('OLE 对象暂不支持，已显示占位'); break;
          }
          case 'ctrl': case 'drawText': parseRun(item, output, style, depth + 1); break;
          case 'lineBreak': output.push(M.text('\n', style)); break;
          case 'fieldBegin': {
            const list = child(item, 'subList');
            if (list) {
              output.push({ type:'note', label:'批注 / 字段提示', blocks:children(list,'p').map(p=>paragraph(p,depth+1)) });
            }
            break;
          }
          case 'secPr': case 'colPr': case 'fieldEnd': case 'bookmark': break;
          case 'header': case 'footer': break; // Read once at section scope and repeat per page.
          default:
            if (elements(item).length) parseRun(item, output, style, depth + 1);
        }
      }
    }
    const spine = descendants(hpf, 'itemref').map(e => manifest.get(attr(e, 'idref'))).filter(Boolean);
    let sectionItems = spine.filter(e => /(^|\/)section\d*\.xml$/i.test(e.path) || /^section/i.test(e.id));
    if (!sectionItems.length) sectionItems = Array.from(manifest.values()).filter(e => /^section/i.test(e.id) || /(^|\/)section\d*\.xml$/i.test(e.path));
    if (!sectionItems.length) throw new Error('HWPX 没有可读取的正文 section。');
    for (const item of sectionItems) {
      const section = await readXml(item.path);
      for(const text of descendants(section,'t')){const id='source-'+model.expectedTextRecords.length;sourceIds.set(text,id);model.expectedTextRecords.push({id,text:text.textContent});}
      model.expectedText ||= [];
      model.expectedText.push(...descendants(section, 't').map(t=>t.textContent.trim()).filter(Boolean));
      const definition = descendants(section, 'pagePr')[0];
      const margin = child(definition, 'margin');
      const page = M.page();
      if (definition) {
        page.width = M.unit(num(definition, 'width', 59528)); page.height = M.unit(num(definition, 'height', 84189));
        if (attr(definition, 'landscape') === 'NARROWLY') [page.width, page.height] = [page.height, page.width];
        for (const side of ['left', 'right', 'top', 'bottom']) page[side] = M.unit(num(margin, side, 4252));
        page.top += M.unit(num(margin, 'header')); page.bottom += M.unit(num(margin, 'footer'));
      }
      if (page.width < 72 || page.height < 72 || page.width > 5000 || page.height > 5000) throw new Error('页面尺寸无效。');
      const root = section.documentElement;
      const columns = descendants(section, 'colPr')[0];
      page.columns = M.clamp(num(columns, 'colCount', 1), 1, 16);
      page.columnGap = M.unit(num(columns, 'sameGap', 0));
      page.columnSizes = children(columns, 'colSz').map(c => ({ width: M.unit(num(c, 'width')), gap: M.unit(num(c, 'gap')) }));
      for (const kind of ['header', 'footer']) page[kind + 'Blocks'] = descendants(section, kind).map(h => ({ apply: attr(h, 'applyPageType'), blocks: children(child(h, 'subList'), 'p').map(p => paragraph(p)) }));
      model.sections.push({ page, blocks: children(root, 'p').map(p => paragraph(p)) });
    }
    return model;
  }
  global.HwpxParser = { parse: parseHwpx };
})(globalThis);
