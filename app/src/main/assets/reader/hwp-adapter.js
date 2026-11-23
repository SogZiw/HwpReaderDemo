/* Adapt the public @hwp.js/parser model into the same nodes used by HWPX. */
(function (global) {
  'use strict';
  const M = global.DocModel;
  function parseHwp(bytes) {
    const model = M.documentModel('HWP');
    const cfb = CFB.read(bytes, { type: 'array' });
    const header = CFB.find(cfb, 'FileHeader');
    if (!header || header.content.length < 40) throw new Error('文件不是有效的 HWP 5 文档。');
    const flags = new DataView(Uint8Array.from(header.content).buffer).getUint32(36, true);
    if (flags & 2) throw new Error('此 HWP 已加密，请先在韩文办公软件中移除密码。');
    if (flags & (16 | 256 | 1024)) throw new Error('此文件为 DRM 或证书保护文档，Demo 暂不支持。');
    if(flags&4){
      const streams=cfb.FullPaths.map((path,i)=>({path,entry:cfb.FileIndex[i]})).filter(x=>/\/ViewText\/Section\d+$/i.test(x.path));
      if(!streams.length)throw new Error('分发文档缺少 ViewText 正文。');
      model.permissions={readOnly:true,allowCopy:true,allowPrint:true};
      for(const {entry} of streams){const p=HwpDistribution.permissions(entry.content);model.permissions.allowCopy&&=p.allowCopy;model.permissions.allowPrint&&=p.allowPrint;}
    }
    let inflated = 0;
    const inflate = pako.inflate;
    // Bound expanded records before passing them to the public parser.
    const boundedInflate = function (data, options) {
      const stream = new pako.Inflate(options);
      const chunks = [];
      stream.onData = chunk => {
        inflated += chunk.length;
        if (inflated > 128 * 1024 * 1024) throw new Error('HWP 解压后的内容过大。');
        chunks.push(chunk);
      };
      stream.push(data, true);
      if (stream.err) throw new Error(stream.msg || 'HWP 压缩数据损坏。');
      const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.length; });
      return result;
    };
    pako.inflate = boundedInflate;
    let source;
    try {
      // The vendored parser imports an indirection so the bound applies to every inflate call.
      source = HWPParser.parse(bytes);
    } finally { pako.inflate = inflate; }
    const maps = source.info.idMappings;
    const binaries = new Map(source.binDataList.map(item => [item.name.toLowerCase(), item.data]));
    const charStyles = new Map(), paraStyles = new Map(), images = new Map();
    const masterControls = new Set();
    let noteNumber = 0, autoNumber = 0;
    const controlName = id => String.fromCharCode(id>>>24&255,id>>>16&255,id>>>8&255,id&255);
    function charStyle(id) {
      if (charStyles.has(id)) return charStyles.get(id);
      const style = maps.charShapes[id];
      if (!style) return {};
      const font = maps.koreanFonts[style.fontIds[0]];
      const result = {
        fontSize: M.unit(style.fontBaseSize, 10) * (style.fontSizes[0] || 100) / 100,
        fontFamily: font?.name || 'sans-serif', color: M.color(style.color),
        fontWeight: style.bold ? 'bold' : 'normal', fontStyle: style.italic ? 'italic' : 'normal',
        textDecoration: [style.underlineKind ? 'underline' : '', style.strike ? 'line-through' : ''].filter(Boolean).join(' '),
        letterSpacing: (style.fontSpacings[0] || 0) / 100,
        verticalAlign: style.supscript ? 'super' : style.subscript ? 'sub' : 'baseline'
      };
      charStyles.set(id, result); return result;
    }
    function paraStyle(id) {
      if (paraStyles.has(id)) return paraStyles.get(id);
      const style = maps.paragraphShapes[id];
      if (!style) return {};
      const result = {
        textAlign: ['justify', 'left', 'right', 'center', 'justify', 'justify'][style.align] || 'left',
        marginTop: M.unit(style.marginTop) / 2, marginBottom: M.unit(style.marginBottom) / 2,
        marginLeft: Math.max(0, M.unit(style.paddingLeft) / 2), marginRight: Math.max(0, M.unit(style.paddingRight) / 2),
        textIndent: M.unit(style.indent) / 2,
        lineHeight: style.lineSpacingKind === 0 ? M.clamp((style.lineSpacing || 160) / 100, .8, 4) : 1.5
      };
      paraStyles.set(id, result); return result;
    }
    function cellStyle(id) {
      const fill = maps.borderFills[id];
      if (!fill) return {};
      const result = {};
      for (const side of ['left', 'right', 'top', 'bottom']) {
        const edge = fill.borders?.[['left', 'right', 'top', 'bottom'].indexOf(side)];
        if (edge) result['border' + side[0].toUpperCase() + side.slice(1)] = `${Math.max(.4, (edge.width || 1) * .25)}pt ${edge.kind ? 'solid' : 'none'} ${M.color(edge.color)}`;
      }
      const background = fill.fill?.content?.backgroundColor;
      if (background) result.backgroundColor = M.color(background, '#ffffff');
      return result;
    }
    function recordParagraphs(records) {
      let i = 0;
      const iterator = { isDone: () => i >= records.length, peek: () => records[i], next: () => records[i++] };
      const paragraphs = [];
      while (!iterator.isDone()) {
        if (iterator.peek().id === 66) paragraphs.push(HWPParser.Paragraph.fromRecord(iterator, source.header.version));
        else iterator.next();
      }
      return paragraphs;
    }
    function control(wrapper, depth) {
      const node = controlContent(wrapper, depth), common = wrapper.content?.commonProperties;
      if (!node || !common) return node;
      if (!common.treatAsChar && common.textWrap >= 3 && node.type !== 'table') node.position = {
        x: M.unit(common.offset.horizontal), y: M.unit(common.offset.vertical), horizontal: ['PAPER','PAGE','COLUMN','PARA'][common.horizontalRelativeTo],
        vertical: ['PAPER','PAGE','PARA'][common.verticalRelativeTo], alignX:'LEFT', alignY:'TOP'
      };
      if (common.caption) node.caption = { side:['LEFT','RIGHT','TOP','BOTTOM'][common.caption.align], gap:M.unit(common.caption.gap),
        blocks:Array.from(common.caption.paragraphs).map(p=>paragraph(p,depth+1)) };
      return node;
    }
    function controlContent(wrapper, depth) {
      if (depth > 30) throw new Error('文档嵌套层数过多。');
      const c = wrapper.content;
      if (!c) return null;
      const name = controlName(wrapper.id);
      if (['%clk','%hlk','%unk','bokm','cold','head','foot','secd'].includes(name)) return null;
      if (name === 'atno') return M.text(String(++autoNumber));
      if (name === 'eqed') {
        const record=c.records.find(r=>r.id===88);
        if(record && record.data.byteLength>=6){const view=new DataView(record.data),length=view.getUint16(4,true);if(6+length*2>record.data.byteLength)throw new Error('HWP 公式记录损坏');return {type:'equation',text:new TextDecoder('utf-16le').decode(record.data.slice(6,6+length*2))};}
      }
      if (['fn  ','en  ','tcmt'].includes(name)) return {type:'note',label:(name==='fn  '?'脚注 ':name==='en  '?'尾注 ':'隐藏说明 ')+(++noteNumber),blocks:recordParagraphs(c.records).map(p=>paragraph(p,depth+1))};
      if (c.cells) {
        return {
          type: 'table', width: M.unit(c.commonProperties?.width),
          cells: c.cells.map(cell => ({
            row: cell.row, column: cell.column, colSpan: cell.colSpan || 1, rowSpan: cell.rowSpan || 1,
            width: M.unit(cell.width), height: M.unit(cell.height), style: cellStyle(cell.borderFillId),
            padding: (cell.padding || [100, 100, 100, 100]).map(value => M.unit(value)),
            blocks: (cell.paragraphs?.paragraphs || []).map(p => paragraph(p, depth + 1))
          }))
        };
      }
      const picture = c.content?.image || c.image;
      if (picture) {
        const id = picture.binItemId;
        const info = maps.binaryData[id - 1];
        if (info) {
          const name = `BIN${info.id.toString(16).toUpperCase().padStart(4, '0')}.${info.extension}`.toLowerCase();
          const bytes = binaries.get(name);
          if (bytes) {
            if (!images.has(name)) images.set(name, M.image(model, bytes, 'image/' + (info.extension === 'jpg' ? 'jpeg' : info.extension)));
            return { ...images.get(name), width: M.unit(c.commonProperties?.width), height: M.unit(c.commonProperties?.height) };
          }
        }
      }
      if (c.elementProperties) {
        const ep = c.elementProperties, records = c.content?.records || [], fill = ep.fill?.content || {}, outline = ep.outline;
        const ole = records.find(r=>r.id===84);
        if (ole?.data.byteLength >= 14) {
          const ref = new DataView(ole.data).getUint16(12,true), info = maps.binaryData[ref-1];
          if (info) {
            const name='BIN'+info.id.toString(16).padStart(4,'0')+'.ole';
            if (!images.has(name)) {
              const entry=CFB.find(cfb,'Root Entry/BinData/'+name);
              if (entry) {
                const data=Uint8Array.from(entry.content);
                images.set(name,M.oleImage(model,info.compressed(source.header)?boundedInflate(data,{windowBits:-15}):data));
              }
            }
            const image=images.get(name);
            if (image) return { ...image, width:M.unit(c.commonProperties.width), height:M.unit(c.commonProperties.height) };
          }
        }
        const kind = ({610626668:'ellipse',611476835:'rect',610830190:'line'})[ep.ctrlId];
        const names = {78:'line',79:'rect',80:'ellipse',81:'arc',82:'polygon',83:'curve'};
        const geometry = records.find(r => names[r.id]);
        const shape = geometry ? names[geometry.id] : kind;
        const blocks = Array.from(c.drawText?.paragraphs || recordParagraphs(records)).map(p=>paragraph(p,depth+1));
        if (shape) {
          const node = { type:'shape', kind:shape, width:M.unit(c.commonProperties.width), height:M.unit(c.commonProperties.height),
            viewWidth:ep.originalWidth || 1, viewHeight:ep.originalHeight || 1, points:[], segments:[],
            stroke:M.color(outline?.color), strokeWidth:outline?.width || 0, lineStyle:outline?.kind ? 'SOLID':'NONE',
            fill:M.color(fill.backgroundColor,'none'), gradient:fill.colors ? {angle:fill.angle,colors:fill.colors.map(c=>M.color(c))}:null,
            blocks, verticalAlign:c.drawText?.paragraphs.header.verticalAlign===1?'CENTER':'TOP',
            angle:ep.angle, flipX:ep.horizontalFlip, flipY:ep.verticalFlip };
          if (geometry) {
            const view=new DataView(geometry.data); let offset=0;
            const u32=()=>{const n=view.getUint32(offset,true);offset+=4;return n;};
            const point=()=>{const p={x:view.getInt32(offset,true),y:view.getInt32(offset+4,true)};offset+=8;return p;};
            if (shape==='line' && view.byteLength>=16) {node.start=point();node.end=point();}
            if (shape==='rect' && view.byteLength>=33) {offset=1;node.points=Array.from({length:4},point);}
            if (shape==='ellipse' && view.byteLength>=28) {offset=4;node.center=point();node.axis1=point();node.axis2=point();}
            if (shape==='arc' && view.byteLength>=25) {node.arcType=view.getUint8(offset++)===1?'PIE':'NORMAL';node.center=point();node.axis1=point();node.axis2=point();}
            if ((shape==='polygon'||shape==='curve') && view.byteLength>=4) {
              const count=u32();if(count>100000 || count*8>view.byteLength-offset) throw new Error('HWP 图形坐标损坏。');
              node.points=Array.from({length:count},point);
              if(shape==='curve') node.segments=node.points.slice(0,-1).map((p,i)=>({kind:offset+i<view.byteLength && view.getUint8(offset+i)?'CURVE':'LINE',x1:p.x,y1:p.y,x2:node.points[i+1].x,y2:node.points[i+1].y}));
            }
          }
          if (shape==='line' && !node.start) {node.start={x:0,y:0};node.end={x:node.viewWidth,y:node.viewHeight};}
          return node;
        }
        if (blocks.length) {model.warnings.add('部分图形按文字框显示');return {type:'box',width:M.unit(c.commonProperties.width),blocks};}
        model.warnings.add('部分 HWP 图形对象暂不支持，已显示占位');
        return {type:'unsupported',text:'特殊图形对象',width:M.unit(c.commonProperties.width)};
      }
      if (c.drawText?.paragraphs) return { type: 'box', blocks: Array.from(c.drawText.paragraphs).map(p => paragraph(p, depth + 1)), width: M.unit(c.commonProperties?.width) };
      // Structural controls (section settings, counters, bookmarks) have no visible body.
      if (c.records?.length) {
        const blocks = (c.paragraphs || recordParagraphs(c.records)).map(p=>paragraph(p,depth+1));
        model.warnings.add('部分特殊对象按文字或占位显示');
        return blocks.length ? {type:'box',blocks} : {type:'unsupported',text:'特殊对象'};
      }
      return null;
    }
    function paragraph(p, depth = 0) {
      const result = M.paragraph([], paraStyle(p.header.paragraphShapeId));
      result.pageBreak = p.header.pageBreak || maps.paragraphShapes[p.header.paragraphShapeId]?.pageBreakBefore;
      let position = 0, shape = 0, ctrl = 0, pending = '', styleId = p.charShapes[0]?.shapeId || 0;
      function flush() { if (pending) { result.inlines.push(M.text(pending, charStyle(styleId))); pending = ''; } }
      for (const ch of p.chars.chars) {
        while (shape + 1 < p.charShapes.length && p.charShapes[shape + 1].startPosition <= position) {
          flush(); shape++; styleId = p.charShapes[shape].shapeId;
        }
        if (ch instanceof HWPParser.ExtendedControl) {
          flush();
          const object = p.controls[ctrl++];
          if (object) { const visible = control(object, depth); if (visible) result.inlines.push(visible); }
        } else if (ch instanceof HWPParser.InlineControl) {
          if (ch.code === 9) pending += '\t';
        } else if (ch instanceof HWPParser.CharCode) pending += String.fromCharCode(ch.code);
        else if (ch.control === 10) pending += '\n';
        else if (ch.control === 30 || ch.control === 31) pending += ' ';
        position += ch.bytes;
      }
      flush();
      for (const extra of p.controls.slice(ctrl)) {
        const content = extra.content;
        if (masterControls.has(extra)) continue;
        if (content?.paragraphs) result.inlines.push(...content.paragraphs.flatMap(p => paragraph(p, depth + 1).inlines));
        else if (content?.records?.some(r=>![71,72,87].includes(r.id))) model.warnings.add('部分特殊对象未绘制');
      }
      result.originalY = M.unit(p.lineSegments[0]?.verticalPosition);
      result.hasOriginalY = p.lineSegments.length > 0;
      return result;
    }
    for (const section of source.sections) {
      const definition = section.paragraphs.flatMap(p => p.controls).find(c => c.content?.pageDefinition)?.content.pageDefinition;
      const page = M.page();
      const sectionMasters=[];
      for(const p of section.paragraphs) if(p.controls.some(c=>controlName(c.id)==='secd')) for(const c of p.controls) if(c.id===0&&c.content?.paragraphs?.length){masterControls.add(c);sectionMasters.push(c);}
      page.backgroundBlocks = sectionMasters.flatMap(c=>c.content.paragraphs.map(p=>paragraph(p)));
      for (const kind of ['header','footer']) {
        const id=kind==='header'?'head':'foot';
        page[kind+'Blocks']=section.paragraphs.flatMap(p=>p.controls).filter(c=>controlName(c.id)===id).map(c=>({apply:'BOTH',blocks:recordParagraphs(c.content.records).map(p=>paragraph(p))}));
      }
      if (definition) {
        page.width = M.unit(definition.width); page.height = M.unit(definition.height);
        if (definition.landscape === 1 && page.width < page.height) [page.width, page.height] = [page.height, page.width];
        for (const side of ['left', 'right', 'top', 'bottom']) page[side] = M.unit(definition.padding[side]);
        page.top += M.unit(definition.padding.header); page.bottom += M.unit(definition.padding.footer);
      }
      model.sections.push({ page, blocks: section.paragraphs.map(p => paragraph(p)) });
    }
    return model;
  }
  global.HwpAdapter = { parse: parseHwp };
})(globalThis);
