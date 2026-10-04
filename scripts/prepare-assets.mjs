import {mkdir,copyFile,cp,writeFile,access,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
await mkdir('public/ocr/core',{recursive:true});await mkdir('public/ocr/lang',{recursive:true});await mkdir('public/pdf',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const variant of ['lstm','simd-lstm','relaxedsimd-lstm'])await copyFile(`node_modules/tesseract.js-core/tesseract-core-${variant}.wasm.js`,`public/ocr/core/tesseract-core-${variant}.wasm.js`);
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/pdf/pdf.worker.min.mjs');
for(const dir of ['cmaps','standard_fonts','wasm'])await cp(`node_modules/pdfjs-dist/${dir}`,`public/pdf/${dir}`,{recursive:true});
let manifest={};try{manifest=JSON.parse(await readFile('scripts/model-checksums.json','utf8'));}catch{}
for(const lang of ['slk','ces']){
 const path=`public/ocr/lang/${lang}.traineddata.gz`;
 try{await access(path);}catch{const r=await fetch(`https://tessdata.projectnaptha.com/4.0.0_fast/${lang}.traineddata.gz`);if(!r.ok)throw new Error(`Language download failed: ${r.status}`);await writeFile(path,Buffer.from(await r.arrayBuffer()));}
 const hash=createHash('sha256').update(await readFile(path)).digest('hex');if(manifest[lang]&&manifest[lang]!==hash)throw new Error(`Checksum mismatch: ${lang}`);manifest[lang]=hash;
}
await writeFile('scripts/model-checksums.json',JSON.stringify(manifest,null,2)+'\n');
for(const size of [192,512]){const canvas=createCanvas(size,size),c=canvas.getContext('2d');c.fillStyle='#123b35';c.fillRect(0,0,size,size);c.fillStyle='#c5f17c';c.fillRect(size*.43,size*.24,size*.14,size*.52);c.fillRect(size*.24,size*.43,size*.52,size*.14);await writeFile(`public/icon-${size}.png`,canvas.toBuffer('image/png'));}
console.log('Local OCR, PDF assets, verified language files and app icons ready.');
