const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;
const MAX_BODY = 35 * 1024 * 1024;

function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function send(res,status,data,type){res.writeHead(status,{'Content-Type':type||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}
function safeName(name){return String(name||'asset').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);}
function parseDataUrl(value){
  const m=/^data:([^;,]+);base64,(.+)$/s.exec(value||'');
  if(!m) throw new Error('Reference image harus berupa data URL base64.');
  return {mime:m[1].toLowerCase(),buffer:Buffer.from(m[2],'base64')};
}
async function asVisualAsset(asset){
  const {mime,buffer}=parseDataUrl(asset.data);
  if(mime.startsWith('image/')) return {mime,buffer,name:safeName(asset.name||'reference.png')};
  if(mime==='application/pdf'||/\.pdf$/i.test(asset.name||'')) return convertDocument(buffer,asset.name||'reference.pdf','pdf');
  if(mime.includes('word')||/\.docx?$/i.test(asset.name||'')) return convertDocument(buffer,asset.name||'reference.docx','docx');
  return null;
}
async function convertDocument(buffer,name,kind){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yudhania-'));
  try{
    const original=path.join(dir,safeName(name)); fs.writeFileSync(original,buffer);
    let pdf=original;
    if(kind==='docx'){
      await execFileAsync('libreoffice',['--headless','--convert-to','pdf','--outdir',dir,original],{timeout:60000});
      pdf=path.join(dir,path.basename(original).replace(/\.docx?$/i,'.pdf'));
    }
    const prefix=path.join(dir,'page');
    await execFileAsync('pdftoppm',['-png','-f','1','-singlefile','-r','120',pdf,prefix],{timeout:60000});
    return {mime:'image/png',buffer:fs.readFileSync(prefix+'.png'),name:'reference-page.png'};
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
async function collectImages(assets){
  const out=[];
  for(const asset of (assets||[]).slice(0,8)){
    try{const v=await asVisualAsset(asset);if(v)out.push(v);}catch(e){console.warn('Skipping asset:',asset?.name,e.message);}
  }
  return out;
}
function sizeFor(format){
  const f=String(format||'').toLowerCase();
  if(f.includes('9:16')) return '1024x1536';
  if(f.includes('4:5')) return '1024x1280';
  if(f.includes('1:1')) return '1024x1024';
  if(f.includes('16:9')) return '1536x1024';
  if(f.includes('2:3')) return '1024x1536';
  return '1024x1536';
}
function buildPrompt(body){
  const base=String(body.prompt||'').trim(), neg=String(body.negative||'').trim(), staff=String(body.staff||'').trim();
  return [base,
    'Attached client assets are primary identity references. Preserve logos, product shape, packaging, faces, colors, and identifying details unless the brief explicitly requests a change.',
    'Create a commercially usable, physically believable, hierarchy-first design. One primary focal point. Intentional negative space. Do not add generic AI decoration.',
    neg?`Avoid: ${neg}.`:'',staff?`Staff production note: ${staff}`:''
  ].filter(Boolean).join('\n\n');
}
async function openaiRequest(url,options){
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw Object.assign(new Error('OPENAI_API_KEY belum dipasang. Set environment variable tersebut sebelum menjalankan aplikasi.'),{code:'NO_KEY'});
  const headers=new Headers(options.headers||{}); headers.set('Authorization','Bearer '+key);
  const res=await fetch(url,{...options,headers});
  const text=await res.text();
  let data; try{data=JSON.parse(text);}catch{data={error:{message:text||'OpenAI response tidak valid.'}};}
  if(!res.ok){throw new Error(data?.error?.message||`OpenAI API error ${res.status}`);}
  return data;
}
async function generate(body){
  const model=process.env.OPENAI_IMAGE_MODEL||'gpt-image-2.5-sunburst';
  const prompt=buildPrompt(body); const size=sizeFor(body.format); const images=await collectImages(body.assets);
  let data;
  if(images.length){
    const form=new FormData();
    form.append('model',model); form.append('prompt',prompt); form.append('size',size); form.append('quality','medium'); form.append('output_format','png'); form.append('n','1');
    for(const img of images) form.append('image[]',new Blob([img.buffer],{type:img.mime}),img.name);
    data=await openaiRequest('https://api.openai.com/v1/images/edits',{method:'POST',body:form});
  }else{
    data=await openaiRequest('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,prompt,size,quality:'medium',output_format:'png',n:1})});
  }
  const b64=data?.data?.[0]?.b64_json;
  if(!b64) throw new Error('OpenAI tidak mengembalikan image data.');
  return {image:`data:image/png;base64,${b64}`,model,usedReferences:images.length,size};
}
function readBody(req){return new Promise((resolve,reject)=>{let total=0,chunks=[];req.on('data',c=>{total+=c.length;if(total>MAX_BODY){reject(Object.assign(new Error('Request terlalu besar. Maksimum 35 MB.'),{code:'TOO_LARGE'}));req.destroy();return;}chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));}catch(e){reject(new Error('Payload JSON tidak valid.'));}});req.on('error',reject);});}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='GET'&&req.url==='/health') return json(res,200,{ok:true,service:'yudhania-staff-ai'});
    if(req.method==='POST'&&req.url==='/api/generate'){const body=await readBody(req);const out=await generate(body);return json(res,200,{ok:true,...out});}
    if(req.method==='GET'){
      const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,''); const file=path.resolve(ROOT,relative||'index.html');
      if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) return json(res,404,{error:'Not found'});
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
      return send(res,200,fs.readFileSync(file),types[path.extname(file)]||'application/octet-stream');
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(err){console.error(err);const status=err.code==='NO_KEY'?503:err.code==='TOO_LARGE'?413:500;return json(res,status,{ok:false,error:err.message||'Generation failed'});}
});
server.listen(PORT,HOST,()=>console.log(`YUDHANIA.AI Staff App running at http://${HOST}:${PORT}`));
