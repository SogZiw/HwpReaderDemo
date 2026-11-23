/* SVG rendering of explicitly identified legacy chart types and series. */
(function(global){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const color=n=>'#'+[n&255,n>>>8&255,n>>>16&255].map(x=>x.toString(16).padStart(2,'0')).join('');
  const supported=new Map([[1,1],[3,6],[5,8],[7,10],[11,3],[14,24],[15,25]]);
  function eligible(chart){
    if(chart.series.some(s=>s.values.some(n=>n!==null&&(typeof n!=='number'||!Number.isFinite(n)))))return false;
    if(chart.chartType===9)return chart.series.every(s=>[1,6].includes(s.selectors[9]));
    return supported.has(chart.chartType)&&chart.series.every(s=>s.selectors[chart.chartType]===supported.get(chart.chartType));
  }
  // Stack/percentage variants can share the same ChartType and painter code.
  // Until their options are decoded, redraw only the verified normal flag word.
  const canDraw=chart=>eligible(chart)&&chart.rootOptions===(chart.chartType===11?0xffcf:0xffff);
  function make(node){
    const c=node.chart;if(!canDraw(c))throw Error('此图表绘制类型或选项尚不支持');
    const svg=document.createElementNS(NS,'svg'),w=720,h=720*(node.height||300)/(node.width||480);
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.classList.add('doc-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',c.title?.value||'图表');
    svg.style.width=(node.width||480)+'pt';svg.style.height=(node.height||300)+'pt';
    svg.dataset.chartType=String(c.chartType);svg.dataset.series=String(c.series.length);
    svg.dataset.values=JSON.stringify(c.series.map(s=>s.values));
    const font=c.legend?.font||c.series[0]?.legend?.font||{size:9,family:'sans-serif',color:0};
    const size=Math.max(9,Math.min(28,font.size*w/(node.width||480))),line=size*1.7;
    function add(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=String(text);svg.appendChild(e);return e;}
    function label(x,y,text,anchor='middle',fill=color(font.color)){return add('text',{x,y,fill,'font-family':font.family,'font-size':size,'text-anchor':anchor,'dominant-baseline':'middle'},text);}
    add('rect',{x:0,y:0,width:w,height:h,fill:c.backdrop?.fill?.kind?color(c.backdrop.fill.color):'#ffffff'});
    let top=size*1.8;if(c.title?.value){label(w/2,top,c.title.value);top+=line;}
    const pie=c.chartType===14||c.chartType===15,horizontal=c.chartType===11,legendItems=pie?c.sliceStyles:c.series;
    if(!legendItems?.length)throw Error('图例样式不完整');
    const legendWidth=c.legend?.font?Math.min(w*.28,Math.max(...legendItems.map(s=>s.name.length),4)*size*.75+line*2):0;
    const secondary=c.series.some(s=>s.secondary);
    const plot={left:Math.max(size*3.8,w*.09),top,right:w-legendWidth-size*(secondary?4:1.4),bottom:h-size*3.2};
    if(plot.bottom<=plot.top||plot.right<=plot.left)throw Error('图表显示区域过小');
    if(c.legend?.font){const x=w-legendWidth+size*.3,start=Math.max(top,(h-line*legendItems.length)/2);legendItems.forEach((s,i)=>{const y=start+i*line;add('rect',{x,y:y-size*.35,width:size,height:size*.7,fill:color(s.fill)});label(x+size*1.5,y,s.name,'start');});}
    if(pie){
      if(c.series.length!==1||c.series[0].values.some(n=>n<0))throw Error('饼图数据结构尚不支持');
      const values=c.series[0].values,total=values.reduce((a,b)=>a+(b||0),0);if(total<=0)throw Error('饼图没有正数数据');
      const cx=(plot.left+plot.right)/2,cy=(plot.top+plot.bottom)/2,r=Math.min(plot.right-plot.left,plot.bottom-plot.top)*.4,palette=c.sliceStyles.map(s=>s.fill);let angle=-Math.PI/2;
      values.forEach((n,i)=>{if(!n)return;const end=angle+n/total*2*Math.PI,x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);const fill=color(palette[i]);
        if(n===total)add('circle',{cx,cy,r,fill});else add('path',{d:`M${cx},${cy}L${x1},${y1}A${r},${r} 0 ${end-angle>Math.PI?1:0},1 ${x2},${y2}Z`,fill});
        const mid=(angle+end)/2;label(cx+r*.65*Math.cos(mid),cy+r*.65*Math.sin(mid),c.categories[i]);angle=end;});
      if(c.chartType===15)add('circle',{cx,cy,r:r*.5,fill:'#fff'});return svg;
    }
    const scales=[false,true].map(secondary=>{
      const stored=c.plot.axes[secondary?2:1]?.scale;if(stored)return stored;
      const values=c.series.filter(s=>s.secondary===secondary).flatMap(s=>s.values).filter(n=>typeof n==='number'),lo=Math.min(0,...values),hi=Math.max(0,...values),range=hi-lo||1;
      const power=10**Math.floor(Math.log10(range/5)),unit=[1,2,5,10].map(x=>x*power).find(x=>x>=range/5)||power*10,min=Math.floor(lo/unit)*unit,max=Math.ceil(hi/unit)*unit;
      return {min,max:max>min?max:min+unit,divisions:Math.max(1,Math.round((max-min)/unit))};
    });
    const spanX=plot.right-plot.left,spanY=plot.bottom-plot.top,axis=scales[0];
    const value=(n,s)=>horizontal?plot.left+(n-scales[+s.secondary].min)/(scales[+s.secondary].max-scales[+s.secondary].min)*spanX:plot.bottom-(n-scales[+s.secondary].min)/(scales[+s.secondary].max-scales[+s.secondary].min)*spanY;
    for(let i=0;i<=axis.divisions;i++){
      const n=axis.min+(axis.max-axis.min)*i/axis.divisions,text=Number(n.toPrecision(8)).toString();
      if(horizontal){const x=plot.left+spanX*i/axis.divisions;add('line',{x1:x,y1:plot.top,x2:x,y2:plot.bottom,stroke:'#dddddd','stroke-width':1});label(x,plot.bottom+line*.65,text);}
      else{const y=plot.bottom-spanY*i/axis.divisions;add('line',{x1:plot.left,y1:y,x2:plot.right,y2:y,stroke:'#dddddd','stroke-width':1});label(plot.left-size*.5,y,text,'end');}
    }
    add('path',{d:`M${plot.left},${plot.top}V${plot.bottom}H${plot.right}`,fill:'none',stroke:color(c.plot.axes[1]?.color||0x888888),'stroke-width':1.3});
    if(secondary&&!horizontal){const a=scales[1];for(let i=0;i<=a.divisions;i++){const n=a.min+(a.max-a.min)*i/a.divisions;label(plot.right+size*.5,plot.bottom-spanY*i/a.divisions,Number(n.toPrecision(8)),'start');}}
    const count=c.categories.length,step=(horizontal?spanY:spanX)/Math.max(1,count),bars=c.series.filter(s=>s.selectors[c.chartType]!==6&&s.selectors[c.chartType]!==8&&s.selectors[c.chartType]!==10),gap=Math.max(0,c.plot.xgap||0),barWidth=step/(Math.max(1,bars.length)+gap+Math.max(0,c.plot.gap||0)*(Math.max(1,bars.length)-1));
    c.categories.forEach((name,i)=>horizontal?label(plot.left-size*.5,plot.top+step*(i+.5),name,'end'):label(plot.left+step*(i+.5),plot.bottom+line*.7,name));
    c.series.forEach(s=>{
      const painter=s.selectors[c.chartType],fill=color(s.fill),stroke=color(s.color),points=[];
      s.values.forEach((n,i)=>{if(n===null){points.push(null);return;}const x=plot.left+step*(i+.5),y=value(n,s),zero=value(Math.max(scales[+s.secondary].min,Math.min(0,scales[+s.secondary].max)),s);
        if([6,8,10].includes(painter))points.push({x,y});else{const index=bars.indexOf(s),start=(horizontal?plot.top:plot.left)+i*step+(step-barWidth*bars.length)/2+index*barWidth;add('rect',horizontal?{x:Math.min(y,zero),y:start,width:Math.abs(y-zero),height:barWidth*.94,fill}:{x:start,y:Math.min(y,zero),width:barWidth*.94,height:Math.abs(y-zero),fill});}
      });
      const segments=[];let segment=[];for(const p of points){if(p)segment.push(p);else if(segment.length){segments.push(segment);segment=[];}}if(segment.length)segments.push(segment);
      for(const segment of segments){let d=segment.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join('');if(painter===10)d=segment.map((p,i)=>i?`H${p.x}V${p.y}`:`M${p.x},${p.y}`).join('');if(painter===8)d+=`L${segment.at(-1).x},${value(0,s)}L${segment[0].x},${value(0,s)}Z`;add('path',{d,fill:painter===8?fill:'none',stroke,'stroke-width':Math.max(1.5,Math.min(5,s.width*w/c.extent[2]))});}
    });
    return svg;
  }
  global.LegacyChartRenderer={eligible,canDraw,make};
})(globalThis);
