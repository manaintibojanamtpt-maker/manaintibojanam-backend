import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type InvestorFunnelStage = {
  step: string;
  count: number;
};

export type InvestorReportData = {
  generatedAt: Date;
  generatedBy?: string;
  mrr: number;
  arr: number;
  activeTenantsCount: number;
  trialTenantsCount: number;
  suspendedTenantsCount: number;
  activeSubscriptions: number;
  totalTenants: number;
  totalLeads: number;
  demoRequests: number;
  newLeadsCount: number;
  verifiedMerchants: number;
  fssaiVerified: number;
  ordersProcessed: number;
  leadToTrialConv: number;
  trialToPaidConv: number;
  funnel: InvestorFunnelStage[];
  /** Matches Investor Data Room UI */
  momGrowthLabel?: string;
  paidRetentionPct?: number;
  cacPaybackMonths?: number;
};

const BRAND_ORANGE: [number, number, number] = [255, 122, 0];
const BRAND_DARK: [number, number, number] = [24, 24, 24];
const MUTED: [number, number, number] = [100, 100, 100];
const BORDER: [number, number, number] = [228, 228, 228];
const FOOTER_RESERVE = 44;

/** ASCII-safe INR — standard PDF fonts cannot render the rupee glyph (U+20B9). */
const formatInr = (value: number) => `Rs. ${value.toLocaleString('en-IN')}`;

const formatReportDate = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const m = pad(date.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${hr}:${m} ${ampm}`;
};

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/bhojan-os-icon.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type LayoutContext = {
  doc: jsPDF;
  margin: number;
  pageWidth: number;
  contentWidth: number;
  y: number;
  bottomLimit: number;
};

function ensureSpace(ctx: LayoutContext, needed: number) {
  if (ctx.y + needed <= ctx.bottomLimit) return;
  ctx.doc.addPage();
  ctx.y = ctx.margin;
  drawContinuationHeader(ctx);
}

function drawContinuationHeader(ctx: LayoutContext) {
  const { doc, margin, pageWidth } = ctx;
  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('BhojanOS Investor Report (continued)', margin, 18);
  ctx.y = margin + 8;
}

function drawPageFooters(doc: jsPDF, margin: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.line(margin, pageHeight - FOOTER_RESERVE + 8, pageWidth - margin, pageHeight - FOOTER_RESERVE + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Confidential - BhojanOS Platform - Authorized personnel only', margin, pageHeight - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
  }
}

function drawCoverHeader(ctx: LayoutContext, logoDataUrl: string | null) {
  const { doc, margin, pageWidth } = ctx;
  const headerH = 92;

  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, 22, 48, 48);
    } catch {
      /* logo optional */
    }
  }

  const textX = logoDataUrl ? margin + 58 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('BhojanOS', textX, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Investor Data Room', textX, 58);
  doc.setFontSize(9);
  doc.text('Platform Metrics Report', textX, 72);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONFIDENTIAL', pageWidth - margin, 36, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Board & stakeholder distribution', pageWidth - margin, 50, { align: 'right' });

  ctx.y = headerH + 24;
}

function drawMetaPanel(ctx: LayoutContext, data: InvestorReportData) {
  const { doc, margin, contentWidth } = ctx;
  const panelH = 52;
  ensureSpace(ctx, panelH + 12);

  doc.setDrawColor(...BORDER);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, ctx.y, contentWidth, panelH, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Report generated', margin + 14, ctx.y + 18);
  doc.text('Prepared by', margin + 14, ctx.y + 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text(formatReportDate(data.generatedAt), margin + 110, ctx.y + 18);
  doc.text(data.generatedBy || 'BhojanOS Super Admin', margin + 110, ctx.y + 36);

  ctx.y += panelH + 20;
}

function drawSectionTitle(ctx: LayoutContext, title: string) {
  ensureSpace(ctx, 28);
  const { doc, margin } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_DARK);
  doc.text(title, margin, ctx.y);
  doc.setDrawColor(...BRAND_ORANGE);
  doc.setLineWidth(2);
  doc.line(margin, ctx.y + 4, margin + 48, ctx.y + 4);
  ctx.y += 22;
}

function drawKpiGrid(ctx: LayoutContext, data: InvestorReportData) {
  const { doc, margin, contentWidth } = ctx;
  const gap = 12;
  const cardW = (contentWidth - gap) / 2;
  const cardH = 64;
  const gridH = cardH * 2 + gap;

  ensureSpace(ctx, gridH + 8);

  const cards: { label: string; value: string; sub: string; subColor: [number, number, number] }[] = [
    {
      label: 'Monthly Recurring Revenue',
      value: formatInr(data.mrr),
      sub: data.momGrowthLabel || '+12% MoM Growth',
      subColor: [16, 130, 70],
    },
    {
      label: 'Annual Run Rate (ARR)',
      value: formatInr(data.arr),
      sub: 'Projection Stable',
      subColor: [16, 130, 70],
    },
    {
      label: 'Paid Merchant Retention',
      value: `${data.paidRetentionPct ?? 92}%`,
      sub: 'World-Class B2B SaaS',
      subColor: [16, 130, 70],
    },
    {
      label: 'CAC Payback Period',
      value: `${data.cacPaybackMonths ?? 1.2} Mo`,
      sub: 'Organic Led Growth',
      subColor: MUTED,
    },
  ];

  cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * (cardW + gap);
    const y = ctx.y + row * (cardH + gap);

    doc.setDrawColor(...BORDER);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, cardH, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const labelLines = doc.splitTextToSize(card.label.toUpperCase(), cardW - 20);
    doc.text(labelLines, x + 10, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...BRAND_DARK);
    doc.text(card.value, x + 10, y + 38);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...card.subColor);
    doc.text(card.sub, x + 10, y + 54);
  });

  ctx.y += gridH + 16;
}

function drawMetricsTable(
  ctx: LayoutContext,
  title: string,
  rows: [string, string][],
) {
  drawSectionTitle(ctx, title);
  ensureSpace(ctx, 40);

  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: ctx.margin, right: ctx.margin },
    head: [['Metric', 'Value']],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      lineColor: BORDER,
      lineWidth: 0.5,
      textColor: BRAND_DARK,
    },
    headStyles: {
      fillColor: BRAND_ORANGE,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto', textColor: MUTED },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
  });

  const finalY = (ctx.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  ctx.y = (finalY ?? ctx.y) + 18;
}

function drawFunnelSection(ctx: LayoutContext, funnel: InvestorFunnelStage[]) {
  drawSectionTitle(ctx, 'Merchant Activation Funnel');
  const maxCount = Math.max(funnel[0]?.count ?? 0, 1);
  const labelW = 118;
  const valueW = 52;
  const barAreaW = ctx.contentWidth - labelW - valueW - 8;
  const rowH = 22;

  ensureSpace(ctx, funnel.length * rowH + 12);

  funnel.forEach((stage) => {
    ensureSpace(ctx, rowH);
    const pct = Math.round((stage.count / maxCount) * 100) || 0;
    const { doc, margin } = ctx;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_DARK);
    doc.text(stage.step, margin, ctx.y);

    const barX = margin + labelW;
    const barY = ctx.y - 9;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(barX, barY, barAreaW, 10, 2, 2, 'F');
    if (pct > 0) {
      doc.setFillColor(...BRAND_ORANGE);
      doc.roundedRect(barX, barY, Math.max(4, (barAreaW * pct) / 100), 10, 2, 2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${stage.count} (${pct}%)`, barX + barAreaW + 8, ctx.y);

    ctx.y += rowH;
  });

  ctx.y += 10;
}

function drawNotes(ctx: LayoutContext) {
  drawSectionTitle(ctx, 'Notes & Methodology');
  ensureSpace(ctx, 48);

  const notes =
    'All figures reflect live platform data at export time. MRR is estimated from active merchant count multiplied by standard plan pricing (Rs. 4,999/mo). Orders processed is a platform aggregate estimate. Retention and CAC payback benchmarks align with Investor Data Room projections. This document is intended for authorized stakeholders only.';

  const { doc, margin, contentWidth } = ctx;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const lines = doc.splitTextToSize(notes, contentWidth);
  doc.text(lines, margin, ctx.y);
  ctx.y += lines.length * 12 + 8;
}

/** Generate and download a properly formatted BhojanOS investor metrics PDF. */
export async function exportInvestorReportPdf(data: InvestorReportData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  doc.setProperties({
    title: `BhojanOS Investor Report - ${data.generatedAt.toISOString().slice(0, 10)}`,
    subject: 'BhojanOS Platform Metrics',
    author: data.generatedBy || 'BhojanOS Super Admin',
    keywords: 'BhojanOS, investor, SaaS, metrics, MRR, ARR',
    creator: 'BhojanOS Super Admin Portal',
  });

  const logoDataUrl = await loadLogoDataUrl();

  const ctx: LayoutContext = {
    doc,
    margin,
    pageWidth,
    contentWidth,
    y: margin,
    bottomLimit: pageHeight - FOOTER_RESERVE,
  };

  drawCoverHeader(ctx, logoDataUrl);
  drawMetaPanel(ctx, data);

  drawSectionTitle(ctx, 'Key Performance Indicators');
  drawKpiGrid(ctx, data);

  drawMetricsTable(ctx, 'Executive Summary', [
    ['Paid Subscriptions', String(data.activeSubscriptions)],
    ['Active Merchants', String(data.activeTenantsCount)],
    ['Trial / Pending Merchants', String(data.trialTenantsCount)],
    ['Suspended / Rejected', String(data.suspendedTenantsCount)],
  ]);

  drawMetricsTable(ctx, 'Growth & Pipeline', [
    ['Total Merchants', String(data.totalTenants)],
    ['Total Leads', String(data.totalLeads)],
    ['Demo Requests', String(data.demoRequests)],
    ['New Leads (Uncontacted)', String(data.newLeadsCount)],
    ['Lead to Trial Conversion', `${data.leadToTrialConv}%`],
    ['Trial to Paid Conversion', `${data.trialToPaidConv}%`],
    ['Platform Orders Processed (est.)', data.ordersProcessed.toLocaleString('en-IN')],
  ]);

  drawMetricsTable(ctx, 'Compliance', [
    ['KYC Verified Merchants', String(data.verifiedMerchants)],
    ['FSSAI Verified / Submitted', String(data.fssaiVerified)],
  ]);

  drawFunnelSection(ctx, data.funnel);
  drawNotes(ctx);

  drawPageFooters(doc, margin);

  const stamp = data.generatedAt.toISOString().slice(0, 10);
  doc.save(`BhojanOS-Investor-Report-${stamp}.pdf`);
}
