/**
 * Persian RTL prescription PDF (pdfkit + Vazirmatn + arabic-persian-reshaper).
 */
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PersianShaper } from 'arabic-persian-reshaper';
import { BRAND, PET_SPECIES_LABELS } from '@petdate/shared';

export type PrescriptionPdfInput = {
  vetName: string;
  patientName: string;
  petName: string;
  petSpecies?: string;
  petBreed?: string;
  medicationText: string;
  dateIso?: string;
  prescriptionId?: number;
};

function speciesLabel(species?: string): string | undefined {
  if (!species) return undefined;
  return PET_SPECIES_LABELS[species] || species;
}

function fontPath(): string {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'fonts', 'Vazirmatn-Regular.ttf'),
    path.join(__dirname, '..', '..', 'assets', 'fonts', 'Vazirmatn-Regular.ttf'),
    path.join(process.cwd(), 'assets', 'fonts', 'Vazirmatn-Regular.ttf'),
    path.join(process.cwd(), 'packages', 'api', 'assets', 'fonts', 'Vazirmatn-Regular.ttf'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('فونت Vazirmatn پیدا نشد — packages/api/assets/fonts/Vazirmatn-Regular.ttf');
}

/** شکل‌دهی و معکوس برای رسم RTL در pdfkit (LTR) */
export function rtlLine(text: string): string {
  const shaped = PersianShaper.convertArabic(String(text ?? ''));
  return [...shaped].reverse().join('');
}

function formatFaDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (!Number.isFinite(d.getTime())) {
    return new Date().toLocaleDateString('fa-IR');
  }
  try {
    return d.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function prescriptionsDir(): string {
  const dir = path.join(__dirname, '..', '..', 'data', 'prescriptions');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function generatePrescriptionPdf(
  input: PrescriptionPdfInput,
  outPath: string
): Promise<string> {
  const font = fontPath();
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const brandFa = 'همبازی';
  const brandEn = BRAND.name;
  const dateFa = formatFaDate(input.dateIso);
  const petBits = [input.petName, speciesLabel(input.petSpecies), input.petBreed]
    .filter(Boolean)
    .join(' — ');
  const disclaimer =
    'این نسخه صرفاً جهت اطلاع صاحب حیوان خانگی است و جایگزین معاینه حضوری نیست. در صورت بروز عارضه با دامپزشک خود تماس بگیرید.';

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 48, left: 48, right: 48 },
      info: {
        Title: `نسخه دارویی — ${input.petName}`,
        Author: brandFa,
        Subject: 'Prescription',
      },
    });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    doc.on('error', reject);
    stream.on('error', reject);
    stream.on('finish', () => resolve());

    doc.font(font);

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rightX = doc.page.margins.left;

    const drawRtl = (text: string, y: number, opts?: { size?: number; color?: string }) => {
      const size = opts?.size ?? 12;
      const color = opts?.color ?? '#1a1a1a';
      doc.fillColor(color).fontSize(size);
      doc.text(rtlLine(text), rightX, y, {
        width: pageW,
        align: 'right',
        lineGap: 4,
      });
      return doc.y;
    };

    // Header band
    doc.rect(0, 0, doc.page.width, 72).fill('#0f766e');
    doc.fillColor('#ffffff').fontSize(22);
    doc.text(rtlLine(`${brandFa}  ·  ${brandEn}`), rightX, 22, {
      width: pageW,
      align: 'right',
    });
    doc.fillColor('#ccfbf1').fontSize(11);
    doc.text(rtlLine('نسخه دارویی دامپزشکی'), rightX, 48, {
      width: pageW,
      align: 'right',
    });

    let y = 96;
    y = drawRtl(`تاریخ: ${dateFa}`, y, { size: 11, color: '#334155' }) + 8;
    if (input.prescriptionId) {
      y = drawRtl(`شماره نسخه: ${input.prescriptionId}`, y, { size: 10, color: '#64748b' }) + 10;
    }

    doc
      .moveTo(rightX, y)
      .lineTo(rightX + pageW, y)
      .strokeColor('#99f6e4')
      .lineWidth(1)
      .stroke();
    y += 16;

    y = drawRtl(`دامپزشک: ${input.vetName}`, y, { size: 13 }) + 6;
    y = drawRtl(`صاحب پت: ${input.patientName}`, y, { size: 13 }) + 6;
    y = drawRtl(`حیوان: ${petBits}`, y, { size: 13 }) + 14;

    doc
      .moveTo(rightX, y)
      .lineTo(rightX + pageW, y)
      .strokeColor('#e2e8f0')
      .stroke();
    y += 14;

    y = drawRtl('💊 دستور دارویی', y, { size: 14, color: '#0f766e' }) + 10;

    // Medication body — box
    const medLines = String(input.medicationText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const bodyText = medLines.length ? medLines.join('\n') : '—';

    const bodyStartY = y;
    doc.fontSize(12).fillColor('#1e293b');
    // Measure height with shaped lines
    const shapedBody = medLines.length
      ? medLines.map((l) => rtlLine(l)).join('\n')
      : rtlLine('—');
    const bodyHeight = Math.max(
      80,
      doc.heightOfString(shapedBody, { width: pageW - 24, lineGap: 6 }) + 24
    );
    doc
      .roundedRect(rightX, bodyStartY, pageW, bodyHeight, 8)
      .fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#1e293b').fontSize(12);
    doc.text(shapedBody, rightX + 12, bodyStartY + 12, {
      width: pageW - 24,
      align: 'right',
      lineGap: 6,
    });
    y = bodyStartY + bodyHeight + 24;

    doc
      .moveTo(rightX, y)
      .lineTo(rightX + pageW, y)
      .strokeColor('#e2e8f0')
      .stroke();
    y += 14;

    drawRtl(disclaimer, y, { size: 9, color: '#64748b' });

    // Footer
    const footerY = doc.page.height - 40;
    doc.fillColor('#94a3b8').fontSize(9);
    doc.text(rtlLine(`${brandFa} — همبازی برای پت`), rightX, footerY, {
      width: pageW,
      align: 'center',
    });

    doc.end();
  });

  return outPath;
}
