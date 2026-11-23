/* HWP equation script -> native MathML. No HTML interpolation or remote engine. */
(function(global) {
  'use strict';
  const symbols={sum:'∑',prod:'∏',int:'∫',iint:'∬',oint:'∮',infty:'∞',times:'×',cdot:'⋅',div:'÷',pm:'±',mp:'∓',leq:'≤',geq:'≥',neq:'≠',approx:'≈',equiv:'≡',rightarrow:'→',leftarrow:'←',rarrow:'→',larrow:'←',cdots:'⋯',ldots:'…',partial:'∂',nabla:'∇',alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',psi:'ψ',omega:'ω',Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',lbrace:'{',rbrace:'}',langle:'⟨',rangle:'⟩'};
  function ast(script) {
    const tokens=String(script).match(/"[^"\n]*"|[A-Za-z]+|\d+(?:\.\d+)?|[^\s]/g)||[];
    if(tokens.length>10000) throw new Error('公式过大');
    let i=0,depth=0;
    const row=items=>({tag:'mrow',items});
    function expression(stops=[]) {
      if(++depth>80) throw new Error('公式嵌套过深');
      const items=[];
      while(i<tokens.length && !stops.includes(tokens[i])) {
        if(tokens[i].toLowerCase()==='over') {i++; const numerator=row(items.splice(0));items.push({tag:'mfrac',items:[numerator,atom()]});continue;}
        items.push(atom());
      }
      depth--;return row(items);
    }
    function base() {
      const t=tokens[i++];if(t==null) throw new Error('公式不完整');
      const lower=t.toLowerCase();
      if(t==='{') {const value=expression(['}']);if(tokens[i++]!=='}')throw new Error('公式括号不匹配');return value;}
      if(t==='}') throw new Error('公式括号不匹配');
      if(lower==='sqrt') return {tag:'msqrt',items:[atom()]};
      if(lower==='root') {const index=base();if(tokens[i]?.toLowerCase()==='of')i++;return {tag:'mroot',items:[base(),index]};}
      if(['rm','it','bold'].includes(lower)) return {tag:'mstyle',attrs:{mathvariant:lower==='rm'?'normal':lower==='bold'?'bold':'italic'},items:[base()]};
      if(['left','right'].includes(lower)) {const delimiter=tokens[i++];return {tag:'mo',text:symbols[delimiter]||delimiter||'',attrs:{stretchy:'true'}};}
      if(['bar','vec','hat','dot','ddot','tilde','overline','underline'].includes(lower)) return {tag:lower==='underline'?'munder':'mover',attrs:{accent:'true'},items:[base(),{tag:'mo',text:({bar:'¯',vec:'→',hat:'^',dot:'˙',ddot:'¨',tilde:'~',overline:'¯',underline:'_'})[lower]}]};
      if(['matrix','pmatrix','bmatrix','cases','pile'].includes(lower)) {
        if(tokens[i++]!=='{') throw new Error('矩阵缺少括号');
        const rows=[];let cells=[];
        while(i<tokens.length && tokens[i]!=='}') {cells.push({tag:'mtd',items:[expression(['&','#','}'])]});if(tokens[i]==='&')i++;else if(tokens[i]==='#'){i++;rows.push({tag:'mtr',items:cells});cells=[];}}
        if(cells.length)rows.push({tag:'mtr',items:cells});if(tokens[i++]!=='}')throw new Error('矩阵不完整');
        const table={tag:'mtable',items:rows};const brackets=lower==='pmatrix'?['(',')']:lower==='bmatrix'?['[',']']:lower==='cases'?['{','']:null;
        return brackets?row([{tag:'mo',text:brackets[0]},table,{tag:'mo',text:brackets[1]}]):table;
      }
      if(t==='`'||t==='~') return {tag:'mspace',attrs:{width:t==='`'?'0.2em':'0.4em'}};
      if(t.startsWith('"'))return {tag:'mtext',text:t.slice(1,-1)};
      if(symbols[t]||symbols[lower])return {tag:'mo',text:symbols[t]||symbols[lower]};
      return {tag:/^\d/.test(t)?'mn':/^[A-Za-z]+$/.test(t)?'mi':'mo',text:t};
    }
    function atom() {
      let value=base(),sub=null,sup=null;
      while(tokens[i]==='_'||tokens[i]==='^'){const kind=tokens[i++],child=base();if(kind==='_')sub=child;else sup=child;}
      if(sub&&sup)value={tag:'msubsup',items:[value,sub,sup]};else if(sub||sup)value={tag:sub?'msub':'msup',items:[value,sub||sup]};
      return value;
    }
    const result=expression();if(i!==tokens.length)throw new Error('公式语法不支持');return result;
  }
  function make(script) {
    const tree=ast(script), ns='http://www.w3.org/1998/Math/MathML';
    function element(n){const e=document.createElementNS(ns,n.tag);if(n.text!=null)e.textContent=n.text;for(const [k,v] of Object.entries(n.attrs||{}))e.setAttribute(k,v);for(const child of n.items||[])e.appendChild(element(child));return e;}
    const math=document.createElementNS(ns,'math');math.classList.add('doc-equation');math.setAttribute('aria-label',script);math.appendChild(element(tree));return math;
  }
  global.Equations={ast,make};
})(globalThis);
