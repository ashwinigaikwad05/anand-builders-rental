import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { getCleanPhoneNumber } from './alertMessaging.ts';
import { formatPartyName } from './marathiUtils.ts';

export interface BillShareItem {
  plateType: string;
  quantity: number;
  dailyRate?: number;
  days?: number;
  totalRent?: number;
}

export interface BillShareData {
  billNumber: string | number;
  partyName: string;
  partyMobile: string;
  partyAddress?: string;
  issueDate?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
  cycleDays?: number;
  items?: BillShareItem[];
  totalRent: number;
  paidAmount: number;
  pendingAmount: number;
  lang?: 'marathi' | 'english';
  phones?: string;
}

const AUTO_WHATSAPP_STORAGE_KEY = 'anand_auto_whatsapp_share';

export function getAutoWhatsAppShareSetting(): boolean {
  try {
    return localStorage.getItem(AUTO_WHATSAPP_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoWhatsAppShareSetting(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_WHATSAPP_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Builds a clean, professional WhatsApp text summary of the bill
 */
export function buildBillWhatsAppSummary(data: BillShareData): string {
  const isMr = data.lang !== 'english';
  const cleanParty = formatPartyName(data.partyName, isMr ? 'marathi' : 'english');
  const phones = data.phones || '7020914957 / 9881985058';
  const cycleDays = data.cycleDays || 40;

  const itemsList = (data.items || [])
    .map((it) => {
      const rateText = it.dailyRate ? (isMr ? ` (₹${it.dailyRate}/दिवस)` : ` (₹${it.dailyRate}/day)`) : '';
      return isMr
        ? `  • ${it.quantity} नग - स्टील प्लेट ${it.plateType}${rateText}`
        : `  • ${it.quantity} Nos - Steel Plate ${it.plateType}${rateText}`;
    })
    .join('\n');

  if (isMr) {
    return (
      `🧾 *आनंद बिल्डर्स अँड डेव्हलपर्स*\n` +
      `📋 *भाडे पावती व साहित्य चालान #${data.billNumber}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *ग्राहक:* ${cleanParty}\n` +
      `📱 *मोबाईल:* ${data.partyMobile || '-'}\n` +
      (data.partyAddress ? `📍 *ठिकाण:* ${data.partyAddress}\n` : '') +
      (data.cycleStartDate ? `📅 *वाटप दिनांक:* ${data.cycleStartDate}\n` : '') +
      `⏳ *भाडे मुदत:* ${cycleDays} दिवस\n` +
      (itemsList ? `\n📦 *साहित्य तपशील:*\n${itemsList}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *एकूण भाडे:* ₹${Number(data.totalRent || 0).toLocaleString('en-IN')}\n` +
      `💵 *जमा रक्कम:* ₹${Number(data.paidAmount || 0).toLocaleString('en-IN')}\n` +
      `🔴 *शिल्लक बाकी:* ₹${Number(data.pendingAmount || 0).toLocaleString('en-IN')}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *अधिकृत बिल PDF सोबत जोडली आहे.*\n` +
      `📞 संपर्क: ${phones}\n` +
      `🙏 धन्यवाद!`
    );
  }

  return (
    `🧾 *ANAND BUILDERS & DEVELOPERS*\n` +
    `📋 *Rental Bill & Challan #${data.billNumber}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Customer:* ${cleanParty}\n` +
    `📱 *Mobile:* ${data.partyMobile || '-'}\n` +
    (data.partyAddress ? `📍 *Site:* ${data.partyAddress}\n` : '') +
    (data.cycleStartDate ? `📅 *Dispatch Date:* ${data.cycleStartDate}\n` : '') +
    `⏳ *Rental Period:* ${cycleDays} Days\n` +
    (itemsList ? `\n📦 *Material Breakdown:*\n${itemsList}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total Rent:* ₹${Number(data.totalRent || 0).toLocaleString('en-IN')}\n` +
    `💵 *Amount Paid:* ₹${Number(data.paidAmount || 0).toLocaleString('en-IN')}\n` +
    `🔴 *Balance Due:* ₹${Number(data.pendingAmount || 0).toLocaleString('en-IN')}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📄 *Official Bill PDF is attached.*\n` +
    `📞 Contact: ${phones}\n` +
    `🙏 Thank you!`
  );
}

/**
 * Renders an HTML element to a high-resolution PDF Blob
 */
export async function generateBillPdfBlob(
  element: HTMLElement,
  title = 'Rental_Bill'
): Promise<{ blob: Blob; filename: string }> {
  // 1. Capture element to high-res canvas (scale 2.0 ensures crisp text and logo)
  const canvas = await html2canvas(element, {
    scale: 2.0,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 900,
  });

  // 2. Prepare jsPDF A4 document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210; // A4 width mm
  const pageHeight = 297; // A4 height mm
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Subsequent pages if long document (e.g. attached KYC documents)
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const safeTitle = title.replace(/[^a-zA-Z0-9_\u0900-\u097F-]/g, '_');
  const filename = `${safeTitle}.pdf`;
  const blob = pdf.output('blob');

  return { blob, filename };
}

/**
 * Triggers direct download of a Blob file
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Generates direct WhatsApp URL with prefilled bill summary text
 */
export function buildBillWhatsAppUrl(data: BillShareData): string {
  const summary = buildBillWhatsAppSummary(data);
  const { whatsappPhone } = getCleanPhoneNumber(data.partyMobile);
  const encodedMsg = encodeURIComponent(summary);
  return whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;
}

/**
 * Opens WhatsApp chat with customer with prefilled summary directly
 */
export function openCustomerWhatsAppChat(mobile: string, message: string): void {
  const { whatsappPhone } = getCleanPhoneNumber(mobile);
  const encodedMsg = encodeURIComponent(message);
  const waUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  // Native dynamic anchor click guarantees opening in new tab/app without popup blockers
  try {
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {
        // ignore
      }
    }, 100);
  } catch {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Copies the bill visual canvas directly to system clipboard as PNG image.
 * Allows user to simply press Ctrl+V in WhatsApp chat to paste the bill photo instantly.
 */
export async function copyBillImageToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2.0,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth || 900,
    });

    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
}

/**
 * Automated WhatsApp Bill PDF Sharing Handler
 * 1. On Mobile: uses native Web Share API to attach the actual PDF file directly into WhatsApp
 * 2. On Desktop: opens WhatsApp chat, auto-copies bill image to clipboard, and downloads PDF file
 */
export async function autoShareBillPdfViaWhatsApp(
  element: HTMLElement,
  data: BillShareData,
  onStatusChange?: (status: 'idle' | 'generating' | 'shared' | 'downloaded' | 'error', message?: string) => void
): Promise<{ success: boolean; method: 'direct-whatsapp-and-download'; filename: string }> {
  try {
    const summaryText = buildBillWhatsAppSummary(data);

    onStatusChange?.(
      'generating',
      data.lang === 'english' ? 'Generating official Bill PDF...' : 'बिलाची अधिकृत PDF तयार होत आहे...'
    );

    const cleanParty = (data.partyName || 'Customer').trim().replace(/\s+/g, '_');
    const pdfTitle = `Anand_Bill_#${data.billNumber}_${cleanParty}`;
    const { blob, filename } = await generateBillPdfBlob(element, pdfTitle);

    // 1. Mobile Web Share API: If device supports sharing files directly (Android / iOS)
    if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && navigator.canShare) {
      try {
        const pdfFile = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Bill #${data.billNumber} - Anand Builders`,
            text: summaryText,
          });
          onStatusChange?.(
            'shared',
            data.lang === 'english'
              ? 'Bill PDF attached and shared on WhatsApp!'
              : 'बिलाची PDF व्हॉट्सॲपवर थेट जोडली!'
          );
          return { success: true, method: 'direct-whatsapp-and-download', filename };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          // User dismissed the native share sheet
          return { success: true, method: 'direct-whatsapp-and-download', filename };
        }
        // Fall back to desktop method
      }
    }

    // 2. Desktop Fallback:
    // Open WhatsApp chat directly
    openCustomerWhatsAppChat(data.partyMobile, summaryText);

    // Download PDF file
    triggerFileDownload(blob, filename);

    // Also attempt copying bill photo to clipboard for instant Ctrl+V pasting
    copyBillImageToClipboard(element).catch(() => {});

    onStatusChange?.(
      'downloaded',
      data.lang === 'english'
        ? 'WhatsApp opened & PDF downloaded! (Tip: Press Ctrl+V in WhatsApp to paste bill photo)'
        : 'व्हॉट्सॲप उघडले व PDF डाउनलोड झाली! (टीप: व्हॉट्सॲपमध्ये Ctrl+V करून बिलाचा फोटो पेस्ट करू शकता)'
    );

    return { success: true, method: 'direct-whatsapp-and-download', filename };
  } catch (err: any) {
    onStatusChange?.('error', err?.message || 'Error sharing bill PDF');
    throw err;
  }
}
