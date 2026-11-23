/* Preserve embedded HWPML pictures across the common-model adaptation. */
(function(global){
  'use strict';
  const all=(e,name)=>Array.from(e.getElementsByTagNameNS('*',name));
  const attr=(e,name,fallback='')=>e?.getAttribute(name)??fallback;
  function prepare(bytes){
    let encoding=bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8';
    if(encoding==='utf-8'&&/encoding\s*=\s*["'](?:euc-kr|cp949|ks_c_5601-1987)["']/i.test(new TextDecoder().decode(bytes.subarray(0,180))))encoding='euc-kr';
    const source=new TextDecoder(encoding).decode(bytes);
    if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('HWPML 含有不支持的 XML 声明。');
    const doc=new DOMParser().parseFromString(source,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw Error('HWPML XML 内容损坏。');
    const pictures=all(doc,'PICTURE'),items=all(doc,'BINITEM'),storage=new Map(all(doc,'BINDATA').map(e=>[attr(e,'Id'),e])),objects=new Map(),warnings=new Set();
    const prefix='HMLRESOURCE'+crypto.randomUUID().replace(/-/g,'')+'X';let total=0;
    for(const [index,picture]of pictures.entries()){
      const ref=all(picture,'IMAGE')[0]||picture,id=attr(ref,'BinItem'),item=items.find(e=>attr(e,'Id','-')===id)||items[Number(id)-1],binary=storage.get(attr(item,'BinData'));
      const size=all(picture,'SIZE')[0],width=DocModel.unit(attr(size,'Width')),height=DocModel.unit(attr(size,'Height'));
      const token=prefix+index+'END';let object={type:'unsupported',text:'此图片资源缺失或格式不支持'};
      try{
        if(!item||attr(item,'Type').toLowerCase()==='link'||!binary){warnings.add('HWPML 有图片资源缺失或仅包含外部链接');throw 0;}
        const encoded=binary.textContent.replace(/\s/g,'');if(encoded.length>44*1024*1024)throw Error('图像数据过大');
        const raw=atob(encoded);let data=Uint8Array.from(raw,c=>c.charCodeAt(0));
        if(attr(binary,'Compress','true').toLowerCase()!=='false'){
          let result=null;
          for(const raw of [true,false]){
            const stream=new pako.Inflate({raw}),chunks=[];let length=0;
            stream.onData=chunk=>{length+=chunk.length;if(length>32*1024*1024||total+length>128*1024*1024)throw Error('图像解压后的内容过大');chunks.push(chunk);};
            try{stream.push(data,true);if(stream.err||!stream.ended)continue;}catch(e){if(e.message.includes('过大'))throw e;continue;}
            result=new Uint8Array(length);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}break;
          }
          if(!result)throw Error('图片压缩数据损坏');data=result;
        }
        total+=data.length;if(total>128*1024*1024)throw Error('图片资源过大');
        const extension=attr(item,'Format').toLowerCase();object={resource:data,mime:'image/'+({jpg:'jpeg',svg:'svg+xml'}[extension]||extension),width,height};
      }catch(e){warnings.add(e?.message||'HWPML 部分图片无法显示');}
      objects.set(token,object);const text=doc.createElementNS(picture.namespaceURI,'CHAR');text.textContent=token;picture.replaceWith(text);
    }
    const supported=new Set(['CHAR','SECDEF','COLDEF','EQUATION','RECTANGLE','TABLE']);
    for(const text of all(doc,'TEXT'))for(const child of Array.from(text.children))if(!supported.has(child.localName))warnings.add('HWPML 部分旧版对象尚不支持完整显示');
    for(const e of [...all(doc,'SCRIPTCODE'),...all(doc,'BINDATASTORAGE')])e.remove();
    const serialized=new XMLSerializer().serializeToString(doc).replace(/encoding\s*=\s*["'][^"']+["']/i,'encoding="UTF-8"');
    return {bytes:new TextEncoder().encode(serialized),objects,warnings};
  }
  function restore(model,prepared){
    const replacements=new Map();
    for(const [token,value]of prepared.objects){const node=value.resource?DocModel.image(model,value.resource,value.mime,value.width,value.height):value;replacements.set(token,node);}
    function replace(node){
      if(node.inlines){const list=[];for(const child of node.inlines){
        if(child.type!=='text'){replace(child);list.push(child);continue;}
        let rest=child.text;while(rest){let token=null,at=Infinity;for(const key of replacements.keys()){const i=rest.indexOf(key);if(i>=0&&i<at){at=i;token=key;}}
          if(!token){list.push({...child,text:rest});break;}if(at)list.push({...child,text:rest.slice(0,at)});list.push({...replacements.get(token)});rest=rest.slice(at+token.length);
        }
      }node.inlines=list;}
      for(const p of node.blocks||[])replace(p);for(const cell of node.cells||[])cell.blocks.forEach(replace);for(const p of node.caption?.blocks||[])replace(p);for(const item of node.items||[])replace(item.node||item);
    }
    for(const section of model.sections){section.blocks.forEach(replace);for(const key of ['header','footer','background'])for(const p of section[key]||[])replace(p);}
    const strip=text=>{for(const token of replacements.keys())text=text.split(token).join('');return text;};
    if(model.expectedTextRecords)for(const r of model.expectedTextRecords)r.text=strip(r.text);
    if(model.expectedText)model.expectedText=model.expectedText.map(strip);
    for(const warning of prepared.warnings)model.warnings.add(warning);
  }
  global.HmlResources={prepare,restore};
})(globalThis);
