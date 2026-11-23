/* Keep a bounded DOM for very large documents; the full model remains searchable. */
(function (global) {
  'use strict';
  function textOf(n) {
    if (n.type === 'text' || n.type === 'equation' || n.type === 'unsupported') return n.text || '';
    if (n.type === 'ruby') return n.text + n.annotation;
    let result = (n.inlines || n.blocks || n.items || []).map(textOf).join('');
    if (n.cells) result += n.cells.map(c=>c.blocks.map(textOf).join('')).join('');
    if (n.caption) result += n.caption.blocks.map(textOf).join('');
    return result;
  }
  async function create(model, api) {
    const records = [], pages = [], mounted = new Set();
    let characters = 0, matches = [], matchIndex = -1, needle = '';
    for (const section of model.sections) {
      let record = null, previousY = -1;
      for (const block of section.blocks) {
        // HWP stores line positions relative to a page. A reset starts the next
        // page; a fallback bound also handles files without cached positions.
        if (!record || block.pageBreak || block.hasOriginalY && block.originalY < previousY || record.blocks.length >= 200) {
          record = { spec:section.page, blocks:[], text:'' }; records.push(record);
        }
        previousY = block.originalY;
        record.blocks.push(block); record.text += textOf(block);
      }
    }
    for (const record of records) {
      characters += record.text.length;
      const created = api.createPage(record.spec);
      record.created = created; record.page = created.page; pages.push(created.page);
      created.page.classList.add('virtual-page'); created.page.style.height = record.spec.height+'pt';
      if (pages.length%256 === 0) await new Promise(requestAnimationFrame);
    }
    function clearMarks(page) {
      for (const mark of page.querySelectorAll('mark')) mark.replaceWith(document.createTextNode(mark.textContent));
      page.normalize();
    }
    function highlight(record, occurrence = -1) {
      clearMarks(record.page);
      if (!needle) return [];
      const walker=document.createTreeWalker(record.created.body,NodeFilter.SHOW_TEXT), nodes=[];
      let n, combined='';
      while ((n=walker.nextNode())) { nodes.push({node:n,start:combined.length}); combined+=n.nodeValue; }
      const folded=combined.toLocaleLowerCase(), ranges=[];
      let start=0;
      while ((start=folded.indexOf(needle,start))!==-1 && ranges.length<10000) { ranges.push({start,end:start+needle.length}); start+=needle.length; }
      const selected=[];
      let rangeIndex=0;
      for (const entry of nodes) {
        while (rangeIndex<ranges.length && ranges[rangeIndex].end<=entry.start) rangeIndex++;
        const fragment=document.createDocumentFragment(); let cursor=0, touched=false;
        for (let i=rangeIndex;i<ranges.length && ranges[i].start<entry.start+entry.node.length;i++) {
          const r=ranges[i], a=Math.max(0,r.start-entry.start), b=Math.min(entry.node.length,r.end-entry.start);
          fragment.appendChild(document.createTextNode(entry.node.nodeValue.slice(cursor,a)));
          const mark=document.createElement('mark'); mark.textContent=entry.node.nodeValue.slice(a,b);
          if (i===occurrence) { mark.classList.add('current'); selected.push(mark); }
          fragment.appendChild(mark); cursor=b; touched=true;
        }
        if (touched) { fragment.appendChild(document.createTextNode(entry.node.nodeValue.slice(cursor))); entry.node.replaceWith(fragment); }
      }
      return selected;
    }
    function mount(i) {
      if (i<0 || i>=records.length || mounted.has(i)) return;
      const r=records[i]; r.blocks.forEach(b=>r.created.body.appendChild(api.makeNode(b)));
      api.placeObjects(r.page,r.spec); mounted.add(i); highlight(r);
    }
    function show(i) {
      for (const j of [...mounted]) if (Math.abs(j-i)>2) { records[j].created.body.replaceChildren(); mounted.delete(j); }
      for (let j=i-1;j<=i+1;j++) mount(j);
    }
    const observer=new IntersectionObserver(entries=>{
      for (const entry of entries) if (entry.isIntersecting) show(Number(entry.target.dataset.virtualIndex));
    });
    pages.forEach((page,i)=>{page.dataset.virtualIndex=String(i);observer.observe(page);});
    function goToPage(value) {
      const i=DocModel.clamp(value-1,0,pages.length-1); show(i); pages[i].scrollIntoView({block:'start',behavior:'instant'});
    }
    function selectMatch() {
      const match=matches[matchIndex]; if (!match) return;
      show(match.page); pages[match.page].scrollIntoView({block:'start',behavior:'instant'});
      for (const i of mounted) highlight(records[i]);
      highlight(records[match.page],match.occurrence)[0]?.scrollIntoView({block:'center',behavior:'instant'});
      api.notify('search',{current:matchIndex+1,total:matches.length});
    }
    function clearSearch() {
      needle=''; matches=[]; matchIndex=-1; for (const i of mounted) clearMarks(pages[i]);
      api.notify('search',{current:0,total:0});
    }
    function search(query) {
      clearSearch(); needle=String(query).trim().toLocaleLowerCase(); if (!needle) return;
      outer: for (let i=0;i<records.length;i++) {
        const text=records[i].text.toLocaleLowerCase(); let offset=0, occurrence=0;
        while ((offset=text.indexOf(needle,offset))!==-1) {
          matches.push({page:i,occurrence:occurrence++});offset+=needle.length;
          if (matches.length>=10000) break outer;
        }
      }
      if (matches.length) {matchIndex=0;selectMatch();} else api.notify('search',{current:0,total:0});
    }
    function searchStep(direction) { if (matches.length) {matchIndex=(matchIndex+direction+matches.length)%matches.length;selectMatch();} }
    async function verify() {
      goToPage(1); const first=records[0].created.body.textContent;
      const query=records[records.length-1].text.trim().slice(0,3);
      if (query) {search(query);if (!matches.length) throw new Error('Large document search failed');searchStep(-1);}
      search('<img src=x onerror=alert(1)>');
      if (matches.length) throw new Error('Unexpected injection search match');
      clearSearch();goToPage(records.length);
      if (records[records.length-1].created.body.textContent !== records[records.length-1].text) throw new Error('Last page lost text');
      goToPage(1); if (first!==records[0].created.body.textContent) throw new Error('Virtual page lost text');
      await Promise.all(Array.from(pages[0].querySelectorAll('img')).map(img=>img.decode().catch(()=>{})));
      return {pages:pages.length,characters,virtual:true,mountedPages:mounted.size,search:query?true:null,lastPage:true,textPreserved:true,safeQuery:true,
        images:pages[0].querySelectorAll('img').length,decodedImages:Array.from(pages[0].querySelectorAll('img')).filter(img=>img.naturalWidth>0).length};
    }
    show(0);
    return {pages,characters,goToPage,search,searchStep,clearSearch,verify};
  }
  global.LargeDocument={create};
})(globalThis);
