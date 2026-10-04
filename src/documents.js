import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
const base=import.meta.env.BASE_URL;
pdfjs.GlobalWorkerOptions.workerSrc=`${base}pdf/pdf.worker.min.mjs`;
let worker,progressCallback;
export async function recognize(image,progress){
  progressCallback=progress;
  if(!worker) worker=await createWorker('slk+ces',1,{workerPath:`${base}ocr/worker.min.js`,corePath:`${base}ocr/core`,langPath:`${base}ocr/lang`,workerBlobURL:false,gzip:true,cacheMethod:'none',logger:m=>progressCallback(m.status,m.progress??0)});
  const {data}=await worker.recognize(image,{}, {text:true,blocks:true});
  return {text:data.text,confidence:data.confidence,blocks:data.blocks};
}
export async function stopOCR(){if(worker){await worker.terminate();worker=undefined;}}
export function dataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read the image.'));r.readAsDataURL(file);});}
export async function canvasFor(src){const image=new Image();image.src=src;await image.decode();const scale=Math.min(1,2200/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;}
export async function rotateImage(src){const c=await canvasFor(src),r=document.createElement('canvas');r.width=c.height;r.height=c.width;const ctx=r.getContext('2d');ctx.translate(r.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(c,0,0);return r.toDataURL('image/jpeg',.92);}
export async function importPDF(file,onPage){
  const bytes=new Uint8Array(await file.arrayBuffer());
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,cMapUrl:`${base}pdf/cmaps/`,cMapPacked:true,standardFontDataUrl:`${base}pdf/standard_fonts/`,wasmUrl:`${base}pdf/wasm/`});
  let doc;
  try{doc=await task.promise;if(doc.numPages>30)throw new Error('Please split PDFs longer than 30 pages.');
    for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),base=page.getViewport({scale:1}),view=page.getViewport({scale:Math.min(2,2000/Math.max(base.width,base.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;const content=await page.getTextContent();let text='';for(const item of content.items)if('str'in item)text+=item.str+(item.hasEOL?'\n':' ');await onPage({image:canvas.toDataURL('image/jpeg',.9),text:text.trim(),source:'PDF',pdfPage:i});page.cleanup();canvas.width=canvas.height=0;}
  }finally{if(doc)await doc.destroy();else await task.destroy();}
}
export function syntheticReport(){const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=1800;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,1400,1800);c.fillStyle='#162e2a';c.font='bold 38px Arial';c.fillText('SYNTETICKÁ LEKÁRSKA SPRÁVA',80,100);c.font='26px Arial';const lines=['Iba skúšobné údaje — nejde o skutočného pacienta.','','Pacient: Ján Skúšobný','Rodné číslo: 900101/1234','Dátum narodenia: 01.01.1990','Adresa: Testovacia 12, 811 01 Bratislava','Telefón: +421 900 123 456','Email: jan.skusobny@example.test','','Dátum vyšetrenia: 12.03.2025','Dôvod vyšetrenia: kontrolné vyšetrenie.','','Diagnóza: arteriálna hypertenzia.','Liečba: amlodipín 5 mg, 1 tableta denne.','Krvný tlak: 135/85 mmHg.','Alergie: v správe neuvedené.','','Odporúčanie: kontrola o 3 mesiace.','','Lekár: MUDr. Eva Príkladová'];lines.forEach((s,i)=>c.fillText(s,80,180+i*57));return canvas.toDataURL('image/png');}
