/* Safe SVG drawing: only known elements and numeric geometry are created. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let serial = 0;
  function svgElement(name, attrs = {}) {
    const e = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) if (value != null) e.setAttribute(key, String(value));
    return e;
  }
  function make(node, makeNode) {
    const box = document.createElement('span'); box.className = 'doc-shape'; box.dataset.shape = node.kind;
    box.style.width = Math.max(.1, node.width || node.viewWidth / 100) + 'pt';
    box.style.height = Math.max(.1, node.height || node.viewHeight / 100) + 'pt';
    const w = Math.max(1, node.viewWidth), h = Math.max(1, node.viewHeight);
    const svg = svgElement('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', 'aria-label': node.kind });
    const defs = svgElement('defs'); svg.appendChild(defs);
    let fill = node.fill || 'none';
    if (node.gradient?.colors.length >= 2) {
      const id = 'gradient-' + (++serial), gradient = svgElement('linearGradient', { id, gradientTransform: `rotate(${node.gradient.angle},.5,.5)` });
      node.gradient.colors.forEach((color,i,a) => gradient.appendChild(svgElement('stop', { offset: i / (a.length-1), 'stop-color': color })));
      defs.appendChild(gradient); fill = `url(#${id})`;
    }
    if (node.fillImage) {
      const id = 'pattern-' + (++serial), pattern = svgElement('pattern', { id, width: 1, height: 1, patternContentUnits: 'objectBoundingBox' });
      pattern.appendChild(svgElement('image', { href: node.fillImage, width: 1, height: 1, preserveAspectRatio: 'xMidYMid slice' }));
      defs.appendChild(pattern); fill = `url(#${id})`;
    }
    let geometry;
    const points = node.points || [];
    if (node.kind === 'rect') geometry = points.length >= 4 ? svgElement('polygon', { points: points.map(p => `${p.x},${p.y}`).join(' ') }) : svgElement('rect', { width: w, height: h });
    else if (node.kind === 'ellipse') geometry = svgElement('ellipse', { cx: w/2, cy: h/2, rx: w/2, ry: h/2 });
    else if (node.kind === 'line' || node.kind === 'connectLine') geometry = svgElement('line', { x1: node.start.x, y1: node.start.y, x2: node.end.x, y2: node.end.y });
    else if (node.kind === 'polygon') geometry = svgElement('polygon', { points: points.map(p => `${p.x},${p.y}`).join(' ') });
    else if (node.kind === 'arc') {
      const c = node.center, a = node.axis1, b = node.axis2;
      const rx = Math.max(1, Math.abs(b.x-c.x) || w), ry = Math.max(1, Math.abs(a.y-c.y) || h);
      geometry = svgElement('path', { d: `${node.arcType === 'PIE' ? `M${c.x},${c.y} L` : 'M'}${a.x},${a.y} A${rx},${ry} 0 0 1 ${b.x},${b.y}${node.arcType === 'PIE' ? ' Z' : ''}` });
    } else if (node.kind === 'curve') {
      const segs = node.segments || [], p = segs.map(s => ({x:s.x1,y:s.y1}));
      const last = segs[segs.length-1];
      const closed = last && p.length > 2 && last.x2 === p[0].x && last.y2 === p[0].y;
      if (last && !closed) p.push({x:last.x2,y:last.y2});
      const at = i => p[closed ? (i+p.length)%p.length : Math.max(0,Math.min(p.length-1,i))];
      let d = p.length ? `M${p[0].x},${p[0].y}` : '';
      segs.forEach((s,i) => {
        if (s.kind !== 'CURVE') { d += ` L${s.x2},${s.y2}`; return; }
        const a=at(i-1), b=at(i), c=at(i+1), e=at(i+2);
        d += ` C${b.x+(c.x-a.x)/6},${b.y+(c.y-a.y)/6} ${c.x-(e.x-b.x)/6},${c.y-(e.y-b.y)/6} ${c.x},${c.y}`;
      });
      geometry = svgElement('path', { d: d + (closed ? ' Z' : '') });
    } else geometry = svgElement('rect', { width:w, height:h });
    geometry.setAttribute('fill', ['line','connectLine'].includes(node.kind) ? 'none' : fill);
    geometry.setAttribute('stroke', node.lineStyle === 'NONE' ? 'none' : node.stroke || '#222');
    geometry.setAttribute('stroke-width', Math.max(0, node.strokeWidth || 0));
    if (/DOT|DASH/.test(node.lineStyle)) geometry.setAttribute('stroke-dasharray', `${Math.max(33,node.strokeWidth)*(node.lineStyle==='DOT'?1:4)} ${Math.max(33,node.strokeWidth)*2}`);
    if (node.shadow?.kind && node.shadow.kind !== 'NONE') {
      // SVG shape filter behavior varies between WebViews. Paint a shadow path
      // explicitly so it is also retained by Android's print renderer.
      const shadow = geometry.cloneNode(true), s = node.shadow;
      const dx = (Math.abs(s.x)||2.83)*100*(s.kind.includes('LEFT')?-1:1);
      const dy = (Math.abs(s.y)||2.83)*100*(s.kind.includes('TOP')?-1:1);
      shadow.setAttribute('transform',`translate(${dx},${dy})`);
      shadow.setAttribute('fill',['line','connectLine'].includes(node.kind)?'none':s.color);
      shadow.setAttribute('stroke',s.color); shadow.setAttribute('opacity',String(1-(s.alpha||0)/255));
      svg.appendChild(shadow);
    }
    for (const [end,value] of [['start',node.head],['end',node.tail]]) {
      if (!value || value === 'NORMAL') continue;
      const id = 'arrow-' + (++serial), marker = svgElement('marker', { id, viewBox:'0 0 10 10', refX:5, refY:5, markerWidth:8, markerHeight:8, orient:'auto-start-reverse', markerUnits:'strokeWidth' });
      const attrs = { stroke:node.stroke, 'stroke-width':1, fill: /EMPTY/.test(value)?'#fff':node.stroke };
      marker.appendChild(/BOX/.test(value) ? svgElement('rect', {x:1,y:1,width:8,height:8,...attrs}) : svgElement('path', {d:'M0 0 L10 5 L0 10 Z',...attrs}));
      defs.appendChild(marker); geometry.setAttribute('marker-'+end,`url(#${id})`);
    }
    svg.appendChild(geometry); box.appendChild(svg);
    if (node.angle || node.flipX || node.flipY) box.style.transform = `rotate(${node.angle || 0}deg) scale(${node.flipX?-1:1},${node.flipY?-1:1})`;
    if (node.blocks?.length) {
      const text = document.createElement('span'); text.className = 'shape-text';
      text.style.justifyContent = ({CENTER:'center',BOTTOM:'flex-end'})[node.verticalAlign] || 'flex-start';
      text.style.padding = (node.textMargin || [0,0,0,0]).map(v=>v+'pt').join(' ');
      node.blocks.forEach(p=>text.appendChild(makeNode(p))); box.appendChild(text);
    }
    return box;
  }
  function textArt(node) {
    const w=Math.max(10,node.width),h=Math.max(10,node.height),svg=svgElement('svg',{viewBox:`0 0 ${w} ${h}`,width:w+'pt',height:h+'pt',role:'img','aria-label':node.text});svg.classList.add('doc-textart');
    const lines=node.text.split('\n'),defs=svgElement('defs');svg.appendChild(defs);
    lines.forEach((line,i)=>{
      const y=(i+1)*h/(lines.length+1),id='text-art-'+(++serial),bend=node.shape==='THIN_CURVE_DOWN1'?h*.25:0;
      defs.appendChild(svgElement('path',{id,d:`M2 ${y} Q${w/2} ${y+bend} ${w-2} ${y}`}));
      const text=svgElement('text',{fill:node.fill,'font-family':node.font||'sans-serif','font-size':h/(lines.length+1)*.65});
      const path=svgElement('textPath',{href:'#'+id,textLength:w-4,lengthAdjust:'spacingAndGlyphs'});path.textContent=line;text.appendChild(path);svg.appendChild(text);
    });return svg;
  }
  global.DocDrawing = { make, textArt };
})(globalThis);
