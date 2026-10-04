// Minimal synthetic two-page PDF: selectable text, then an image-only page.
export function makePDF(jpeg,width,height){
 const objects=[];const add=s=>objects.push(Buffer.isBuffer(s)?s:Buffer.from(s));
 add('<< /Type /Catalog /Pages 2 0 R >>');
 add('<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>');
 add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>');
 add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 7 0 R >> >> /Contents 8 0 R >>');
 add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const text='BT /F1 16 Tf 40 790 Td (Pacient: Jan Testovsky) Tj 0 -25 Td (Email: jan@example.test) Tj 0 -25 Td (Lieky: amlodipin 5 mg) Tj ET';
 add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
 add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,Buffer.from('\nendstream')]));
 const image='q 595 0 0 765 0 38 cm /Im1 Do Q';add(`<< /Length ${image.length} >>\nstream\n${image}\nendstream`);
 const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[0];let offset=chunks[0].length;
 objects.forEach((o,i)=>{offsets.push(offset);const chunk=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),o,Buffer.from('\nendobj\n')]);chunks.push(chunk);offset+=chunk.length;});
 chunks.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`));return Buffer.concat(chunks);
}
