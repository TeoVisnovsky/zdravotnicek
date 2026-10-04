import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function walk(dir){let files=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${item.name}`;files.push(...(item.isDirectory()?await walk(p):[p]));}return files;}
const base=process.env.BASE_PATH||'/';
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw new Error('BASE_PATH must be an absolute directory path ending in /.');
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
manifest.id=base;manifest.start_url=base;manifest.scope=base;
manifest.icons=manifest.icons.map(icon=>({...icon,src:base+icon.src.split('/').pop()}));
await writeFile('dist/manifest.webmanifest',JSON.stringify(manifest,null,2)+'\n');
await writeFile('dist/.nojekyll','');
const files=(await walk('dist')).filter(p=>!p.endsWith('/sw.js')&&!p.endsWith('/.nojekyll'));
const hash=createHash('sha256').update(await readFile('scripts/build-sw.mjs'));for(const p of files)hash.update(await readFile(p));
const version=hash.digest('hex').slice(0,16),urls=files.map(p=>base+p.slice(5));
await writeFile('dist/sw.js',`
const PREFIX='zdravotnik-${base.replaceAll('/','_')}-';
const CACHE=PREFIX+'${version}';
const version='${version}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{for(let i=0;i<ASSETS.length;i+=6)await cache.addAll(ASSETS.slice(i,i+6));}
 catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE')self.skipWaiting();if(event.data==='STATUS')event.waitUntil((async()=>{const c=await caches.open(CACHE);const keys=await c.keys();event.ports[0]?.postMessage({ready:keys.length===ASSETS.length,version,assets:ASSETS.length});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;
 if(event.request.mode==='navigate'&&url.pathname.startsWith('${base}')){event.respondWith(caches.open(CACHE).then(c=>c.match('${base}index.html')).then(r=>r||fetch(event.request)));return;}
 if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(c=>c.match(url.pathname)).then(r=>r||fetch(event.request)));
});
`);
console.log(`Offline bundle ${version}: ${urls.length} assets.`);
