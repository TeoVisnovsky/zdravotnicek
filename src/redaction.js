const patterns = [
  ['Birth number', /\b\d{6}\s*\/\s*\d{3,4}\b/gu],
  ['Email', /[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu],
  ['Phone', /(?<!\d)(?:\+421|00421|\+420|00420)[\s.-]*(?:\d[\s.-]*){8}\d(?!\d)|\b09\d{2}[ .-]*\d{3}[ .-]*\d{3}\b/gu],
];
const fields = [
  ['Name', /(?:meno\s+a\s+priezvisko|meno\s+pacienta|pacient(?:ka)?|priezvisko|meno|vyšetrujúci\s+lekár|lekár|patient\s+name)\s*[:：]\s*([^\n;]+)/giu],
  ['Address', /(?:adresa|bydlisko|trvalý\s+pobyt|address)\s*[:：]\s*([^\n;]+)/giu],
  ['Birth date', /(?:dátum\s+narodenia|naroden[ýá]|dát\.\s*nar\.|date\s+of\s+birth)\s*[:：]?\s*(\d{1,2}[./-]\s*\d{1,2}[./-]\s*\d{2,4})/giu],
  ['Identifier', /(?:rodné\s+číslo|r\.?\s*č\.?|číslo\s+poistenca|číslo\s+pacienta|patient\s+id|číslo\s+preukazu)\s*[:：]\s*([\w /-]+)/giu],
];
export function detect(text, terms = []) {
  const hits=[];
  const add=(start,end,kind,method)=>{if(end>start&&!hits.some(h=>h.start===start&&h.end===end))hits.push({id:`${start}:${end}`,start,end,kind,method,enabled:true});};
  for(const [kind,re] of patterns) for(const m of text.matchAll(re)) add(m.index,m.index+m[0].length,kind,'Pattern');
  for(const [kind,re] of fields) for(const m of text.matchAll(re)) {
    let value=m[1].trim().split(/\s+(?=(?:RČ|R\.Č\.|rodné číslo|dátum narodenia|poisťovňa|vek)\s*[:：])/iu)[0].trim();
    const start=m.index+m[0].indexOf(m[1]);add(start,start+value.length,kind,'Labeled field');
  }
  // Deliberately conservative suggestions, not a claim of complete name recognition.
  const names=/(?<![\p{L}])(?:MUDr\.?\s+|Mgr\.?\s+|Ing\.?\s+)?[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž]{2,}\s+[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž]{2,}(?![\p{L}])/gu;
  for(const m of text.matchAll(names)) if(!hits.some(h=>h.start<=m.index&&h.end>=m.index+m[0].length))add(m.index,m.index+m[0].length,'Possible name','Review suggestion');
  const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('sk');
  let hay='';const starts=[],ends=[];let offset=0;
  for(const char of text){const part=fold(char);for(let i=0;i<part.length;i++){starts.push(offset);ends.push(offset+char.length);}hay+=part;offset+=char.length;if(!part&&ends.length)ends[ends.length-1]=offset;}
  for(const raw of terms){const term=fold(raw.trim());if(!term)continue;let at=0;while((at=hay.indexOf(term,at))!==-1){add(starts[at],ends[at+term.length-1],'Custom term','Your term');at+=term.length;}}
  return hits.sort((a,b)=>a.start-b.start||b.end-a.end);
}
export function redact(text,hits){
  const spans=hits.filter(h=>h.enabled).sort((a,b)=>a.start-b.start||b.end-a.end);
  const merged=[];
  for(const h of spans){const prev=merged.at(-1);if(prev&&h.start<prev.end){prev.end=Math.max(prev.end,h.end);if(prev.kind!==h.kind)prev.kind='Sensitive information';}else merged.push({...h});}
  let out='',pos=0;for(const h of merged){out+=text.slice(pos,h.start)+`[${h.kind==='Name'||h.kind==='Possible name'?'PERSON':h.kind==='Address'?'ADDRESS':'REDACTED'}]`;pos=h.end;}return out+text.slice(pos);
}
export function canApprove(pages){return pages.length>0&&pages.every(p=>p.status==='done'&&p.reviewed&&p.text.trim());}
export function exportText(pages){if(!canApprove(pages))throw new Error('Review every readable page first.');return pages.map((p,i)=>`--- Page ${i+1} ---\n${redact(p.text,p.hits)}`).join('\n\n');}
