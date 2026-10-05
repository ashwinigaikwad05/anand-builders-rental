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
 * Opens WhatsApp chat with customer with prefilled summary directly
 */
export function openCustomerWhatsAppChat(mobile: string, message: string): void {
  const { whatsappPhone } = getCleanPhoneNumber(mobile);
  const encodedMsg = encodeURIComponent(message);
  const waUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  try {
    const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = waUrl;
    }
  } catch {
    window.location.href = waUrl;
  }
}

/**
 * Automated WhatsApp Bill PDF Sharing Handler
 * 1. Opens WhatsApp directly to customer chat without popup blockers
 * 2. Generates and downloads the official bill PDF simultaneously
 */
export async function autoShareBillPdfViaWhatsApp(
  element: HTMLElement,
  data: BillShareData,
  onStatusChange?: (status: 'idle' | 'generating' | 'shared' | 'downloaded' | 'error', message?: string) => void
): Promise<{ success: boolean; method: 'direct-whatsapp-and-download'; filename: string }> {
  try {
    const summaryText = buildBillWhatsAppSummary(data);

    // 1. OPEN WHATSAPP CHAT DIRECTLY FIRST (Guaranteed 0ms synchronous action)
    openCustomerWhatsAppChat(data.partyMobile, summaryText);

    onStatusChange?.(
      'generating',
      data.lang === 'english' ? 'WhatsApp opened! Generating PDF...' : 'व्हॉट्सॲप उघडले! PDF तयार होत आहे...'
    );

    // 2. Generate and download PDF so customer receives both
    const cleanParty = (data.partyName || 'Customer').trim().replace(/\s+/g, '_');
    const pdfTitle = `Anand_Bill_#${data.billNumber}_${cleanParty}`;
    const { blob, filename } = await generateBillPdfBlob(element, pdfTitle);

    triggerFileDownload(blob, filename);

    onStatusChange?.(
      'downloaded',
      data.lang === 'english'
        ? 'WhatsApp opened directly & bill PDF downloaded!'
        : 'व्हॉट्सॲप थेट उघडले व बिलाची PDF डाउनलोड झाली!'
    );

    return { success: true, method: 'direct-whatsapp-and-download', filename };
  } catch (err: any) {
    onStatusChange?.('error', err?.message || 'Error sharing bill PDF');
    throw err;
  }
}
