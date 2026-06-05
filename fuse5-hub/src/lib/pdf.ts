import "server-only";

// Minimal, dependency-free PDF writer for one-page text reports (audit exports).
// Emits a valid PDF 1.4 with Helvetica / Helvetica-Bold and absolute-positioned
// lines. Good enough for formal one-pagers; swap for a real lib if we ever need
// tables, images, or pagination.

export interface PdfLine { text: string; size?: number; bold?: boolean; gap?: number }

// Standard-14 fonts use WinAnsi; we render to latin1 bytes, so fold the few
// unicode glyphs we actually emit (—, ·, bullets) down to ASCII first.
function ascii(s: string): string {
  return s
    .replace(/[—–]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/[▲▼]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "");
}
const esc = (s: string) => ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function buildSimplePdf(lines: PdfLine[]): Buffer {
  let y = 760;
  const ops: string[] = ["BT"];
  for (const ln of lines) {
    const size = ln.size ?? 11;
    const font = ln.bold ? "F2" : "F1";
    ops.push(`/${font} ${size} Tf`);
    ops.push(`1 0 0 1 56 ${y} Tm`);
    ops.push(`(${esc(ln.text)}) Tj`);
    y -= ln.gap ?? size + 7;
  }
  ops.push("ET");
  const content = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
