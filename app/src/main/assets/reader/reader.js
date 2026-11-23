(function () {
  'use strict';
  const M = DocModel;
  const session = new URL(location.href).searchParams.get('session');
  const container = document.getElementById('pages');
  let pageElements = [], model, pageIndex = 1, matchGroups = [], matchIndex = -1, scrollPending = false, virtual = null;
  const positioned = new WeakMap();
  const layoutIssues=[];
  const fetchAbort=new AbortController();
  let stopped=false;
  window.addEventListener('pagehide',()=>{stopped=true;fetchAbort.abort();PasswordDocuments.cancelActive();passwordReply?.resolve(null);passwordReply=null;},{once:true});
  function permissions(){return model?.permissions || {readOnly:false,allowCopy:true,allowPrint:true};}
  for(const event of ['copy','cut','dragstart','contextmenu'])document.addEventListener(event,e=>{if(!permissions().allowCopy)e.preventDefault();},true);
  function notify(type, fields = {}) {
    if (window.AndroidReader) AndroidReader.postMessage(JSON.stringify({ type, session, ...fields }));
  }
  function style(element, values = {}) {
    const points = new Set(['fontSize', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'textIndent', 'letterSpacing']);
    for (const [key, value] of Object.entries(values)) {
      if (value == null || value === '') continue;
      element.style[key] = points.has(key) && typeof value === 'number' ? `${value}pt` : String(value);
    }
  }
  function makeNode(node) {
    const content = makeContent(node);
    if (!node.position && !node.caption) return content;
    const object = document.createElement('span'); object.className = 'doc-object';
    if (node.width > 0) object.style.width = node.width + 'pt';
    object.appendChild(content);
    if (node.caption) {
      const caption = document.createElement('div'); caption.className = 'doc-caption';
      caption.style.marginTop = (node.caption.gap || 0) + 'pt';
      node.caption.blocks.forEach(p => caption.appendChild(makeNode(p)));
      if (node.caption.side === 'TOP') object.prepend(caption); else object.appendChild(caption);
    }
    if (node.position) {
      object.classList.add('positioned-object'); positioned.set(object, { ...node.position, width: node.width, height: node.height });
      object.dataset.layoutPosition=JSON.stringify({ ...node.position, width:node.width, height:node.height });
      object.style.zIndex = String(Math.round(node.zOrder || 0));
    }
    return object;
  }
  function makeContent(node) {
    if(node.type==='legacy-chart'){
      try{
        const figure=document.createElement('span');figure.className='legacy-chart-figure';
        figure.dataset.chartType=String(node.chart.chartType);figure.dataset.series=String(node.chart.series.length);figure.dataset.values=JSON.stringify(node.chart.series.map(s=>s.values));figure.dataset.preview=String(!!node.preview);
        figure.appendChild(node.preview?makeContent({...node.preview,width:node.width,height:node.height}):LegacyChartRenderer.make(node));
        const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='图表原始数据';details.appendChild(summary);details.appendChild(makeContent({type:'chart-data',grid:node.chart.grid}));figure.appendChild(details);return figure;
      }catch(_){model.warnings.add('此图表样式无法绘制，已保留原始数据表');return makeContent({type:'chart-data',grid:node.chart.grid});}
    }
    if(node.type==='chart-data'){
      const figure=document.createElement('figure');figure.className='doc-chart-data';
      const caption=document.createElement('figcaption');caption.textContent='旧版图表 · 原始数据';figure.appendChild(caption);
      const table=document.createElement('table');table.className='doc-table';const body=document.createElement('tbody');table.appendChild(body);
      for(let r=0;r<node.grid.rows;r++){const row=document.createElement('tr');for(let c=0;c<node.grid.cols;c++){const cell=document.createElement(r<node.grid.labelRows||c<node.grid.labelCols?'th':'td');cell.textContent=String(node.grid.cells[r*node.grid.cols+c]??'');row.appendChild(cell);}body.appendChild(row);}figure.appendChild(table);return figure;
    }
    if (node.type === 'textart') return DocDrawing.textArt(node);
    if (node.type === 'note') {
      const details=document.createElement('details');details.className='doc-note';
      const summary=document.createElement('summary');summary.textContent=node.label;details.appendChild(summary);
      node.blocks.forEach(p=>details.appendChild(makeNode(p)));return details;
    }
    if (node.type === 'equation') {
      try { return Equations.make(node.text); }
      catch (_) { model.warnings.add('部分公式语法尚不支持，已保留源表达式'); const text=document.createElement('span');text.className='doc-equation';text.textContent=node.text;return text; }
    }
    if (node.type === 'metafile') {
      try {return Metafiles.make(node);}
      catch (e) {model.warnings.add('部分矢量图无法绘制：'+e.message);const text=document.createElement('span');text.className='unsupported';text.textContent='矢量图无法显示';return text;}
    }
    if (node.type === 'text') {
      const span = document.createElement('span'); span.textContent = node.text; if(node.sourceId)span.dataset.sourceTextId=node.sourceId;style(span, node.style); return span;
    }
    if (node.type === 'paragraph') {
      const div = document.createElement('div'); div.className = 'paragraph'; style(div, node.style);
      for (const item of node.inlines) div.appendChild(makeNode(item));
      return div;
    }
    if (node.type === 'image') {
      const img = document.createElement('img'); img.className = 'doc-image'; img.src = node.url; img.alt = '文档图片';
      if (node.width > 0) img.style.width = node.width + 'pt';
      if (node.height > 0) img.style.height = node.height + 'pt';
      img.addEventListener('error', () => { model.warnings.add('部分图片无法解码'); img.alt = '图片无法显示'; });
      return img;
    }
    if (node.type === 'table') {
      const table = document.createElement('table'); table.className = 'doc-table';
      if (node.width > 0) table.style.width = node.width + 'pt';
      const tbody = document.createElement('tbody'); table.appendChild(tbody);
      const rows = new Map();
      for (const cell of [...node.cells].sort((a, b) => a.row - b.row || a.column - b.column)) {
        let row = rows.get(cell.row);
        if (!row) { row = document.createElement('tr'); rows.set(cell.row, row); tbody.appendChild(row); }
        const td = document.createElement('td'); td.colSpan = cell.colSpan; td.rowSpan = cell.rowSpan;
        if (cell.width > 0) td.style.width = cell.width + 'pt';
        if (cell.height > 0) td.style.minHeight = cell.height + 'pt';
        if (cell.padding) td.style.padding = `${cell.padding[2]}pt ${cell.padding[1]}pt ${cell.padding[3]}pt ${cell.padding[0]}pt`;
        style(td, cell.style);
        cell.blocks.forEach(block => td.appendChild(makeNode(block)));
        row.appendChild(td);
      }
      return table;
    }
    if (node.type === 'box') {
      const box = document.createElement('div'); box.className = 'doc-box ' + (node.shape || 'rect');
      if (node.width > 0) box.style.width = node.width + 'pt';
      if (node.height > 0) box.style.minHeight = node.height + 'pt';
      style(box, node.style); node.blocks.forEach(block => box.appendChild(makeNode(block))); return box;
    }
    if (node.type === 'shape') return DocDrawing.make(node, makeNode);
    if (node.type === 'group') {
      const group = document.createElement('span'); group.className = 'doc-group';
      group.style.width = node.width + 'pt'; group.style.height = node.height + 'pt';
      for (const item of node.items) {
        const element = makeNode(item); element.style.position = 'absolute';
        element.style.left = (item.x || 0) + 'pt'; element.style.top = (item.y || 0) + 'pt'; group.appendChild(element);
      }
      return group;
    }
    if (node.type === 'ruby') {
      const ruby = document.createElement('ruby'); ruby.textContent = node.text;
      const rt = document.createElement('rt'); rt.textContent = node.annotation; ruby.appendChild(rt); return ruby;
    }
    const result = document.createElement('span');
    result.className = node.type === 'equation' ? 'doc-equation' : 'unsupported';
    result.textContent = node.text || '暂不支持的对象'; return result;
  }
  function createPage(spec) {
    if (pageElements.length >= 50000) throw new Error('文档页数超过 50000 页限制。');
    const page = document.createElement('article'); page.className = 'page';
    page.style.width = spec.width + 'pt'; page.style.minHeight = spec.height + 'pt';
    page.style.padding = `${spec.top}pt ${spec.right}pt ${spec.bottom}pt ${spec.left}pt`;
    const body = document.createElement('div'); body.className = 'page-body'; page.appendChild(body);
    if(spec.backgroundBlocks?.length){const background=document.createElement('div');background.className='page-background';background.style.left=spec.left+'pt';background.style.top=spec.top+'pt';
      for(const block of spec.backgroundBlocks){const e=makeNode(block);e.style.position='absolute';e.style.top=(block.originalY||0)+'pt';background.appendChild(e);}page.prepend(background);}
    const columns = [];
    const declaredWidth = spec.columnSizes?.reduce((sum,s,i)=>sum+s.width+(i<(spec.columns||1)-1?s.gap:0),0) || 0;
    const columnScale = declaredWidth > 0 ? (spec.width-spec.left-spec.right)/declaredWidth : 1;
    for (let i = 0; i < (spec.columns || 1); i++) {
      const column = document.createElement('div'); column.className = 'page-column'; columns.push(column); body.appendChild(column);
      const size = spec.columnSizes?.[i];
      column.style.flex = size?.width ? `0 0 ${size.width*columnScale}pt` : '1 1 0';
      if (i < (spec.columns || 1)-1) column.style.marginRight = ((size?.gap ?? spec.columnGap ?? 0)*columnScale) + 'pt';
    }
    for (const kind of ['header','footer']) for (const definition of spec[kind + 'Blocks'] || []) {
      const pageNumber = pageElements.length+1;
      if (definition.apply === 'EVEN' && pageNumber%2 || definition.apply === 'ODD' && !(pageNumber%2)) continue;
      const running = document.createElement('div'); running.className = 'running-' + kind;
      running.style.left = spec.left + 'pt'; running.style.right = spec.right + 'pt';
      if (kind === 'header') running.style.top = Math.max(8, spec.top-42) + 'pt';
      else running.style.bottom = Math.max(24, spec.bottom-42) + 'pt';
      definition.blocks.forEach(p=>running.appendChild(makeNode(p))); page.appendChild(running);
    }
    const footer = document.createElement('div'); footer.className = 'page-footer';
    footer.textContent = String(pageElements.length + 1); page.appendChild(footer);
    container.appendChild(page); pageElements.push(page);
    return { page, body: columns[0], columns, columnIndex: 0, spec, capacity: Math.max(60, (spec.height - spec.top - spec.bottom) * 96 / 72) };
  }
  function placeObjects(page, spec) {
    for (const e of page.querySelectorAll('.positioned-object')) {
      const p = positioned.get(e) || JSON.parse(e.dataset.layoutPosition || 'null'); if (!p) continue;
      const column = e.closest('.page-column');
      const areaWidth = p.horizontal === 'PAPER' ? spec.width : p.horizontal === 'COLUMN' ? (column?.offsetWidth || 0)*72/96 : spec.width-spec.left-spec.right;
      const areaHeight = p.vertical === 'PAPER' ? spec.height : spec.height-spec.top-spec.bottom;
      let x=p.x, y=p.y;
      if (p.alignX === 'CENTER') x += (areaWidth-p.width)/2;
      if (p.alignX === 'RIGHT') x += areaWidth-p.width;
      if (p.alignY === 'CENTER') y += (areaHeight-p.height)/2;
      if (p.alignY === 'BOTTOM') y += areaHeight-p.height;
      if (p.horizontal === 'PAPER') x -= spec.left;
      if (p.vertical === 'PAPER') y -= spec.top;
      if (p.horizontal === 'COLUMN') x += (column?.offsetLeft || 0)*72/96;
      if (p.vertical === 'PARA') y += (e.closest('.paragraph')?.offsetTop || 0)*72/96;
      e.style.left=x+'pt'; e.style.top=y+'pt';
    }
  }
  function nextColumn(current) {
    if (current.columnIndex+1 < current.columns.length) { current.body=current.columns[++current.columnIndex]; return current; }
    placeObjects(current.page, current.spec); return createPage(current.spec);
  }
  function splitTableBlock(element, capacity) {
    const table=element.querySelector('table');if(!table)return null;
    const rows=Array.from(table.tBodies[0]?.rows||[]);if(!rows.length)return null;
    const top=element.getBoundingClientRect().top;
    function clones() {
      const first=element.cloneNode(true),rest=element.cloneNode(true);
      const original=Array.from(element.querySelectorAll('.positioned-object'));
      for(const clone of [first,rest]) Array.from(clone.querySelectorAll('.positioned-object')).forEach((e,i)=>{if(positioned.has(original[i]))positioned.set(e,positioned.get(original[i]));});
      const a=first.querySelector('table'),b=rest.querySelector('table');
      const prefix=document.createRange();prefix.setStart(rest,0);prefix.setEndBefore(b);prefix.deleteContents();
      const suffix=document.createRange();suffix.setStartAfter(a);suffix.setEnd(first,first.childNodes.length);suffix.deleteContents();
      return [first,rest];
    }
    // A cut through a row-spanning cell would drop or duplicate its text.
    let safe=0,spanEnd=0;
    for(let i=0;i<rows.length-1;i++){
      for(const cell of rows[i].cells)spanEnd=Math.max(spanEnd,i+cell.rowSpan);
      if(spanEnd<=i+1 && rows[i].getBoundingClientRect().bottom-top<=capacity)safe=i+1;
    }
    if(safe){
      const [first,rest]=clones();
      Array.from(first.querySelector('table').tBodies[0].rows).slice(safe).forEach(r=>r.remove());
      Array.from(rest.querySelector('table').tBodies[0].rows).slice(0,safe).forEach(r=>r.remove());
      return [first,rest];
    }
    // Split an overlong row by its cell contents. Each fragment retains one
    // copy of every character and the same column grid and cell borders.
    if(Array.from(rows[0].cells).every(c=>c.rowSpan===1)){
      const [first,rest]=clones();
      Array.from(first.querySelector('table').tBodies[0].rows).slice(1).forEach(r=>r.remove());
      const a=Array.from(first.querySelector('table').rows[0].cells),b=Array.from(rest.querySelector('table').rows[0].cells);
      let splitAny=false;
      for(let i=0;i<a.length;i++){
        const original=rows[0].cells[i],limit=Math.max(20,capacity-(original.offsetHeight-original.clientHeight)-12);
        const wrapper=document.createElement('div');wrapper.className='paragraph';
        Array.from(original.childNodes).forEach(n=>wrapper.appendChild(n.cloneNode(true)));original.appendChild(wrapper);
        Array.from(original.childNodes).filter(n=>n!==wrapper).forEach(n=>n.remove());
        const parts=splitTableBlock(wrapper,limit)||splitContainer(wrapper,limit)||splitParagraph(wrapper,limit);
        if(parts){a[i].replaceChildren(parts[0]);b[i].replaceChildren(parts[1]);splitAny=true;}
        else if(wrapper.offsetHeight<=limit){b[i].replaceChildren();}
        else {a[i].replaceChildren();}
        wrapper.replaceWith(...wrapper.childNodes);
      }
      if(splitAny)return[first,rest];
    }
    return null;
  }
  function splitContainer(element,capacity) {
    const children=Array.from(element.children);if(children.length<2)return null;
    const top=element.getBoundingClientRect().top;let best=null;
    for(const child of children.slice(0,-1))if(child.getBoundingClientRect().bottom-top<=capacity)best=child;
    if(!best)return null;
    const a=document.createRange(),b=document.createRange();a.setStart(element,0);a.setEndAfter(best);b.setStartAfter(best);b.setEnd(element,element.childNodes.length);
    const first=element.cloneNode(false),rest=element.cloneNode(false);first.appendChild(a.cloneContents());rest.appendChild(b.cloneContents());return[first,rest];
  }
  // Split large paragraphs at text offsets without discarding their styling or characters.
  function splitParagraph(element, capacity) {
    const textNodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let textNode, length = 0;
    while ((textNode = walker.nextNode())) {
      // Objects are indivisible. A text split before/after them keeps each
      // picture, formula or nested table in exactly one resulting fragment.
      const atomic=textNode.parentElement.closest('table,svg,math,.doc-object,.doc-box,.doc-equation,.doc-shape,.doc-group,.doc-note');
      if(atomic&&element.contains(atomic))continue;
      textNodes.push({ node: textNode, start: length }); length += textNode.length;
    }
    if (length < 2) return null;
    function position(offset) {
      const entry = [...textNodes].reverse().find(e => e.start < offset) || textNodes[0];
      return [entry.node, Math.min(entry.node.length, offset - entry.start)];
    }
    let lo = 1, hi = length - 1, best = 0;
    const measure = element.cloneNode(false);
    element.parentNode.appendChild(measure); element.hidden = true;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2), range = document.createRange();
      range.setStart(element, 0); range.setEnd(...position(mid));
      measure.replaceChildren(range.cloneContents());
      if (measure.offsetHeight <= capacity) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    element.hidden = false; measure.remove();
    if (!best) return null;
    const prefix = document.createRange(), suffix = document.createRange();
    prefix.setStart(element, 0); prefix.setEnd(...position(best));
    suffix.setStart(...position(best)); suffix.setEnd(element, element.childNodes.length);
    const first = element.cloneNode(false), rest = element.cloneNode(false);
    first.appendChild(prefix.cloneContents()); rest.appendChild(suffix.cloneContents());
    return [first, rest];
  }
  async function render() {
    if (model.sections.reduce((n,s)=>n+s.blocks.length,0) > 2000) {
      virtual = await LargeDocument.create(model, { container, makeNode, createPage, placeObjects, notify });
      pageElements = virtual.pages; fit(); virtual.goToPage(1); updatePage(); return;
    }
    let batches = 0;
    for (const section of model.sections) {
      let current = createPage(section.page);
      let previousY = -1;
      for (const block of section.blocks) {
        if (block.pageBreak && current.body.childNodes.length) { placeObjects(current.page, section.page); current = createPage(section.page); }
        else if ((block.columnBreak || section.page.columns > 1 && block.hasOriginalY && block.originalY < previousY) && current.body.childNodes.length) current = nextColumn(current);
        previousY = block.originalY;
        let element = makeNode(block);
        current.body.appendChild(element);
        const cachedColumns = section.page.columns > 1 && block.hasOriginalY;
        if (!cachedColumns && current.body.offsetHeight > current.capacity + 2 && current.body.childNodes.length > 1) {
          element.remove(); current = nextColumn(current); current.body.appendChild(element);
        }
        // All text is preserved even when one paragraph is longer than a page.
        while (!cachedColumns && current.body.offsetHeight > current.capacity + 2) {
          const available=current.capacity-Math.max(0,current.body.offsetHeight-element.offsetHeight);
          const split = splitTableBlock(element, available) || splitContainer(element,available) || splitParagraph(element, available);
          if (!split) {
            model.warnings.add('超长表格或对象按完整内容显示');
            if(layoutIssues.length<10)layoutIssues.push({height:element.offsetHeight,capacity:current.capacity,rows:element.querySelector('table')?.rows.length,spans:Array.from(element.querySelector('table')?.rows[0]?.cells||[]).map(c=>c.rowSpan),images:element.querySelectorAll('img').length,boxes:element.querySelectorAll('.doc-box').length,text:element.textContent.length,blockers:Array.from(element.querySelectorAll('table,.doc-shape,.doc-equation,.doc-group,.doc-note')).map(e=>({tag:e.tagName,cls:e.className,height:e.getBoundingClientRect().height})),paragraphs:Array.from(element.querySelectorAll('.paragraph')).map(p=>({height:p.offsetHeight,children:Array.from(p.children).map(e=>e.tagName)})).slice(0,8)});
            break;
          }
          element.replaceWith(split[0]);
          current = nextColumn(current); element = split[1]; current.body.appendChild(element);
        }
        if (++batches % 20 === 0) await new Promise(requestAnimationFrame);
      }
      placeObjects(current.page, section.page);
    }
    if (!pageElements.length) throw new Error('文档没有可显示的正文。');
    await Promise.all(Array.from(container.querySelectorAll('img')).map(img => img.decode().catch(() => {})));
    fit(); updatePage();
  }
  function fit() {
    const width = Math.max(...pageElements.map(page => page.offsetWidth), 1);
    const viewport = document.documentElement.clientWidth;
    container.style.zoom = String(Math.min(1.5, Math.max(.15, (viewport - 24) / (width + 24))));
  }
  function goToPage(value) {
    const page = M.clamp(Math.round(Number(value) || 1), 1, pageElements.length);
    if (virtual) virtual.goToPage(page); else pageElements[page - 1]?.scrollIntoView({ block: 'start', behavior: 'instant' });
    pageIndex = page; notify('page', { page, total: pageElements.length });
  }
  function updatePage() {
    if (!pageElements.length) return;
    const target = window.innerHeight * .25;
    let best = 0, distance = Infinity;
    for (let i = 0; i < pageElements.length; i++) {
      const rect = pageElements[i].getBoundingClientRect();
      const gap = rect.top <= target && rect.bottom >= target ? 0 : Math.min(Math.abs(rect.top - target), Math.abs(rect.bottom - target));
      if (gap < distance) { best = i; distance = gap; }
    }
    pageIndex = best + 1; notify('page', { page: pageIndex, total: pageElements.length });
  }
  function clearSearch() {
    if (virtual) { virtual.clearSearch(); return; }
    for (const mark of container.querySelectorAll('mark,.reader-search-hit')) mark.replaceWith(document.createTextNode(mark.textContent));
    container.normalize(); matchGroups = []; matchIndex = -1;
    notify('search', { current: 0, total: 0 });
  }
  // Match across spans, then highlight each piece of a logical match as one search result.
  function search(query) {
    if (virtual) { virtual.search(query); return; }
    clearSearch(); query = String(query).trim();
    if (!query) return;
    const needle = query.toLocaleLowerCase();
    for (const body of container.querySelectorAll('.page-body,.running-header,.running-footer,.page-background')) {
      const nodes = [], walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let node, combined = '', previousParagraph = null;
      while ((node = walker.nextNode())) {
        const paragraph = node.parentElement.closest('.paragraph');
        if (previousParagraph && paragraph !== previousParagraph) combined += '\n';
        previousParagraph = paragraph;
        nodes.push({ node, start: combined.length, length: node.length }); combined += node.nodeValue;
      }
      const folded = combined.toLocaleLowerCase(), matches = [];
      let offset = 0;
      while ((offset = folded.indexOf(needle, offset)) !== -1) {
        const group = []; matchGroups.push(group); matches.push({ start: offset, end: offset + needle.length, group });
        offset += Math.max(1, needle.length);
        if (matchGroups.length >= 10000) break;
      }
      for (const entry of nodes) {
        const pieces = matches.filter(m => m.start < entry.start + entry.length && m.end > entry.start);
        if (!pieces.length) continue;
        const fragment = document.createDocumentFragment(); let cursor = 0;
        for (const part of pieces) {
          const start = Math.max(0, part.start - entry.start), end = Math.min(entry.length, part.end - entry.start);
          fragment.appendChild(document.createTextNode(entry.node.nodeValue.slice(cursor, start)));
          const mark = entry.node.parentElement.namespaceURI==='http://www.w3.org/2000/svg'?document.createElementNS('http://www.w3.org/2000/svg','tspan'):document.createElement('mark');
          mark.classList.add('reader-search-hit');mark.textContent = entry.node.nodeValue.slice(start, end);
          fragment.appendChild(mark); part.group.push(mark); cursor = end;
        }
        fragment.appendChild(document.createTextNode(entry.node.nodeValue.slice(cursor))); entry.node.replaceWith(fragment);
      }
    }
    if (matchGroups.length) { matchIndex = 0; selectMatch(); }
    else notify('search', { current: 0, total: 0 });
  }
  function selectMatch() {
    for (const mark of container.querySelectorAll('mark.current,.reader-search-hit.current')) mark.classList.remove('current');
    const group = matchGroups[matchIndex];
    if (group?.length) { group.forEach(mark => {mark.classList.add('current');for(let p=mark.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}); group[0].scrollIntoView({ block: 'center' }); }
    notify('search', { current: matchIndex + 1, total: matchGroups.length });
  }
  function searchStep(direction) {
    if (virtual) { virtual.searchStep(direction); return; }
    if (!matchGroups.length) return;
    matchIndex = (matchIndex + direction + matchGroups.length) % matchGroups.length; selectMatch();
  }
  let passwordReply=null,passwordSequence=0;
  async function requestPassword(details){
    const requestId=String(++passwordSequence);
    const result=new Promise(resolve=>{passwordReply={requestId,resolve};});
    notify('passwordRequired',{requestId,...details});
    const value=await result;
    if(value!==null)notify('passwordWorking');
    return value;
  }
  window.Reader = { fit, goToPage, search, searchStep, clearSearch,
    password: reply=>{if(reply?.requestId===passwordReply?.requestId){const callback=passwordReply.resolve;passwordReply=null;callback(typeof reply.password==='string'?reply.password:null);}},
    preparePrint: () => { clearSearch(); return !virtual&&permissions().allowPrint; }, theme: dark => document.documentElement.classList.toggle('dark', Boolean(dark)) };
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(() => { scrollPending = false; updatePage(); }); }
  }, { passive: true });
  window.addEventListener('resize', () => { fit(); updatePage(); });
  function fail(error) {
    if(stopped)return;
    stopped=true;fetchAbort.abort();PasswordDocuments.cancelActive();
    if(error?.code==='CANCELLED'){notify('cancelled');return;}
    const message = error?.message || String(error);
    console.error(error?.stack || message);
    const box = document.getElementById('error'); box.hidden = false; box.textContent = message;
    notify('error', { message, code:error?.code||'PARSE_ERROR' });
  }
  window.addEventListener('error', event => fail(event.error || event.message));
  window.addEventListener('unhandledrejection', event => fail(event.reason));
  function verifyPermissions(){
    const copyBlocked=!document.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}));
    const printAllowed=Reader.preparePrint();
    if(copyBlocked===permissions().allowCopy || printAllowed!==(!virtual&&permissions().allowPrint))throw new Error('文档复制或打印权限检查失败');
    return {permissions:permissions(),copyBlocked,printAllowed};
  }
  async function verify() {
    if (virtual) { const report = {...await virtual.verify(),...verifyPermissions()}; console.log('SMOKE_OK '+JSON.stringify(report)); return report; }
    const bodies = Array.from(container.querySelectorAll('.page-body,.running-header,.running-footer,.page-background'));
    const before = bodies.map(e => e.textContent).join('');
    const sample = Array.from(container.querySelectorAll('.paragraph span,svg.doc-chart text,.doc-chart-data th')).find(e => !e.children.length && e.textContent.trim().length >= 3)?.textContent.trim().slice(0, 3);
    if (sample) { search(sample); if (!matchGroups.length) throw new Error('Search smoke test failed'); }
    let crossSpan = null;
    if (bodies.some(e => e.textContent.includes('跨样式搜索：'))) {
      search('统一阅读');
      crossSpan = matchGroups.some(group => group.length > 1);
      if (!crossSpan) throw new Error('Cross-style search smoke test failed');
    }
    clearSearch();
    if (before !== bodies.map(e => e.textContent).join('')) throw new Error('Search changed document text');
    search('<img src=x onerror=alert(1)>'); clearSearch();
    Reader.theme(true); Reader.theme(false);
    goToPage(pageElements.length); goToPage(1);
    const normalizeText = value => value.replace(/\s+/g, '');
    const renderedText = normalizeText(before + Array.from(container.querySelectorAll('.running-header,.running-footer')).map(e=>e.textContent).join(''));
    const sourceFragments=new Map();
    const bodyFragments=new Map();
    for(const span of container.querySelectorAll('[data-source-text-id]')){
      const id=span.dataset.sourceTextId;sourceFragments.set(id,(sourceFragments.get(id)||'')+span.textContent);
      if(span.closest('.page-body'))bodyFragments.set(id,(bodyFragments.get(id)||'')+span.textContent);
    }
    const missingSourceText = model.expectedTextRecords ? model.expectedTextRecords.filter(r=>!normalizeText(sourceFragments.get(r.id)||'').includes(normalizeText(r.text))).map(r=>r.text) : model.expectedText?.filter(t => !renderedText.includes(normalizeText(t))) || [];
    if (missingSourceText.length) throw new Error('XML 正文核对失败：'+missingSourceText.length+' 段文字未完整显示');
    const duplicatedSourceText=model.expectedTextRecords?.filter(r=>bodyFragments.has(r.id)&&normalizeText(bodyFragments.get(r.id))!==normalizeText(r.text))||[];
    if(duplicatedSourceText.length)throw new Error('XML 正文核对失败：'+duplicatedSourceText.length+' 段文字重复或改变');
    const report = { pages: pageElements.length, characters: before.length, shapes: container.querySelectorAll('.doc-shape').length,
      ...verifyPermissions(),
      equations:container.querySelectorAll('math').length,metafiles:container.querySelectorAll('.doc-metafile').length,notes:container.querySelectorAll('.doc-note').length,layoutIssues,
      sourceTextPreserved: model.expectedText ? missingSourceText.length === 0 : null,
      missingSourceText,
      legacyCharts:container.querySelectorAll('.legacy-chart-figure').length,
      chartSeries:Array.from(container.querySelectorAll('.legacy-chart-figure')).map(e=>({type:Number(e.dataset.chartType),series:Number(e.dataset.series),preview:e.dataset.preview==='true',values:JSON.parse(e.dataset.values)})),
      columns: Math.max(...Array.from(container.querySelectorAll('.page-body')).map(b=>b.querySelectorAll(':scope > .page-column').length)),
      pageWidth: model.sections[0].page.width, pageHeight: model.sections[0].page.height, captions: container.querySelectorAll('.doc-caption').length,
      tables: container.querySelectorAll('table').length,
      images: container.querySelectorAll('img').length, decodedImages: Array.from(container.querySelectorAll('img')).filter(e => e.naturalWidth > 0).length,
      search: sample ? true : null, crossSpan, textPreserved: true, safeQuery: true };
    console.log('SMOKE_OK ' + JSON.stringify(report));
    return report;
  }
  (async function () {
    notify('phase',{phase:'reading'});
    const suffix = '?session=' + encodeURIComponent(session);
    const [metaResponse, dataResponse] = await Promise.all([fetch('/metadata' + suffix,{signal:fetchAbort.signal}), fetch('/document' + suffix,{signal:fetchAbort.signal})]);
    if (!metaResponse.ok || !dataResponse.ok) throw new Error('无法读取本地文件，请重新选择。');
    const metadata = await metaResponse.json();
    PasswordDocuments.configure({workerTimeoutMs:metadata.workerTimeoutMs,debugWorkerHang:metadata.debugFault==='worker-hang'});
    const input = new Uint8Array(await dataResponse.arrayBuffer());
    notify('phase',{phase:'parsing'});
    if(['main-hang','silent-wait','crash-loading'].includes(metadata.debugFault)){
      const fault=await import('./debug-hang.js');
      await fault.beforeParse(metadata.debugFault);
    }
    const opened=await PasswordDocuments.open(input,requestPassword),bytes=opened.bytes;
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (ole.every((b, i) => bytes[i] === b)) {
      try{model=HwpAdapter.parse(bytes);}catch(e){
        const c=CFB.read(bytes,{type:'array'}),h=CFB.find(c,'FileHeader');
        // Distribution policy must remain attached to ViewText. Never turn a
        // distribution parsing failure into a permission-free conversion.
        if(!h||new DataView(Uint8Array.from(h.content).buffer).getUint32(36,true)&4)throw e;
        model=await PasswordDocuments.convert(bytes,'HWP');
      }
    }
    else if (bytes[0] === 0x50 && bytes[1] === 0x4b) model = await HwpxParser.parse(bytes,opened);
    else if(new TextDecoder().decode(bytes.subarray(0,24))==='HWP Document File V3.00 ')model=await PasswordDocuments.convert(bytes,'HWP 3/97');
    else {
      const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
      const text=new TextDecoder(encoding).decode(bytes);
      if(!/<(?:\w+:)?HWPML(?:\s|>)/i.test(text.slice(0,4096)))throw new Error('仅支持 HWP 5、HWPX、HWP 3/97 和 HWPML。');
      if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('HWPML 含有不支持的 XML 声明。');
      model=await PasswordDocuments.convert(bytes,'HWPML');
    }
    document.documentElement.classList.toggle('copy-restricted',!permissions().allowCopy);
    notify('phase',{phase:'rendering'});
    await render();
    if (metadata.verify) await verify();
    const characters = virtual ? virtual.characters : Array.from(container.querySelectorAll('.page-body,.running-header,.running-footer,.page-background')).reduce((sum, e) => sum + e.textContent.length, 0);
    const protection=model.permissions?['分发文档 · 只读',!permissions().allowCopy?'禁止复制':'',!permissions().allowPrint?'禁止打印':''].filter(Boolean).join(' · '):'';
    notify('loaded', { pages: pageElements.length, format: model.format, characters, permissions:permissions(), warning: [protection,...model.warnings].filter(Boolean).join('；') });
    updatePage();
    if(metadata.debugFault==='ready-hang'){
      const fault=await import('./debug-hang.js');setTimeout(fault.block,500);
    }
  })().catch(fail);
})();
