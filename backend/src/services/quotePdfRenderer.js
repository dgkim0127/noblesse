import { createRequire } from "node:module";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);

const fontCandidates = {
  kr: "@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2",
  en: "@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff2",
  jp: "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2",
  "zh-TW": "@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-400-normal.woff2"
};

const labels = {
  kr: {
    title: "공식 견적서",
    quoteNumber: "견적 번호",
    issuedAt: "발행일",
    validUntil: "유효기간",
    buyer: "거래처",
    product: "상품",
    option: "옵션",
    requested: "요청",
    prepared: "준비",
    cancelled: "취소",
    unitPrice: "단가",
    subtotal: "금액",
    total: "합계",
    leadTime: "납기",
    shipping: "배송 조건",
    note: "고객 안내",
    footer: "이 문서는 준비 가능한 품목을 정리한 견적 결과입니다. 영수증과 입금 안내는 별도 SNS로 전달되며 사이트에서 주문 또는 결제가 생성되지 않습니다."
  },
  en: {
    title: "OFFICIAL QUOTATION",
    quoteNumber: "Quote No.",
    issuedAt: "Issued",
    validUntil: "Valid until",
    buyer: "Buyer",
    product: "Product",
    option: "Option",
    requested: "Req.",
    prepared: "Ready",
    cancelled: "Cancel",
    unitPrice: "Unit price",
    subtotal: "Amount",
    total: "Total",
    leadTime: "Lead time",
    shipping: "Shipping terms",
    note: "Customer note",
    footer: "This document lists the items Noblesse can prepare. Receipt and bank-transfer instructions are sent separately by SNS; no online order or payment is created."
  },
  jp: {
    title: "正式見積書",
    quoteNumber: "見積番号",
    issuedAt: "発行日",
    validUntil: "有効期限",
    buyer: "取引先",
    product: "商品",
    option: "オプション",
    requested: "依頼",
    prepared: "準備",
    cancelled: "取消",
    unitPrice: "単価",
    subtotal: "金額",
    total: "合計",
    leadTime: "納期",
    shipping: "配送条件",
    note: "お客様向けメモ",
    footer: "本書は準備可能な商品をまとめた見積結果です。領収書と振込案内は別途SNSでお送りし、サイト上で注文・決済は作成されません。"
  },
  "zh-TW": {
    title: "正式報價單",
    quoteNumber: "報價編號",
    issuedAt: "發行日",
    validUntil: "有效期限",
    buyer: "客戶",
    product: "商品",
    option: "選項",
    requested: "需求",
    prepared: "備妥",
    cancelled: "取消",
    unitPrice: "單價",
    subtotal: "金額",
    total: "合計",
    leadTime: "交期",
    shipping: "運送條件",
    note: "客戶備註",
    footer: "本文件列出可備妥的品項。收據與銀行匯款說明將另行透過 SNS 傳送，網站不會建立訂單或付款。"
  }
};

function resolveFont(locale) {
  const candidates = [fontCandidates[locale], fontCandidates.kr].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      // Try the fallback font package.
    }
  }
  return null;
}

function formatMoney(value, currency) {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

function localizedOptionLabel(labelsByLocale, locale) {
  const labels = labelsByLocale && typeof labelsByLocale === "object" ? labelsByLocale : {};
  return labels[locale] || labels.en || labels.kr || labels.jp || labels["zh-TW"] || "";
}

function formatItemOptions(item, locale) {
  if (Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
    return item.selectedOptions
      .map((option) => {
        const group = localizedOptionLabel(option.groupLabels, locale);
        const value = localizedOptionLabel(option.valueLabels, locale);
        return group && value ? `${group}: ${value}` : value || group;
      })
      .filter(Boolean)
      .join(" / ");
  }
  return [item.color, item.size].filter(Boolean).join(" / ");
}

const cancellationLabels = {
  kr: { out_of_stock: "재고 없음", quantity_shortage: "수량 부족", quality_issue: "품질 확인 불가", discontinued: "취급 종료", other: "기타" },
  en: { out_of_stock: "Out of stock", quantity_shortage: "Quantity shortage", quality_issue: "Quality issue", discontinued: "Discontinued", other: "Other" },
  jp: { out_of_stock: "在庫なし", quantity_shortage: "数量不足", quality_issue: "品質確認不可", discontinued: "取扱終了", other: "その他" },
  "zh-TW": { out_of_stock: "缺貨", quantity_shortage: "數量不足", quality_issue: "品質問題", discontinued: "停止供應", other: "其他" }
};

function formatCancellation(item, locale) {
  if (!item.cancelledQuantity) return "";
  const reason = cancellationLabels[locale]?.[item.cancellationReason] || item.cancellationReason || cancellationLabels[locale]?.other;
  return [reason, item.cancellationNote].filter(Boolean).join(" - ");
}

function writeKeyValue(doc, label, value, y) {
  doc.fillColor("#6b6b73").fontSize(8).text(label, 48, y, { width: 100 });
  doc.fillColor("#20212a").fontSize(9).text(value || "-", 150, y, { width: 390 });
}

export async function createQuotePdfBuffer(snapshot) {
  const locale = labels[snapshot.documentLocale] ? snapshot.documentLocale : "en";
  const t = labels[locale];
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: snapshot.quoteNumber, Author: "Noblesse Piercing" } });
  const chunks = [];
  const completed = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const fontPath = resolveFont(locale);
  if (fontPath) doc.font(fontPath);

  doc.fillColor("#2a234f").fontSize(11).text("NOBLESSE PIERCING", { characterSpacing: 0 });
  doc.moveDown(0.7);
  doc.fillColor("#20212a").fontSize(24).text(t.title);
  doc.moveTo(48, 112).lineTo(547, 112).strokeColor("#d9d9df").lineWidth(1).stroke();

  writeKeyValue(doc, t.quoteNumber, snapshot.quoteNumber, 132);
  writeKeyValue(doc, t.issuedAt, snapshot.issuedAt?.slice(0, 10), 150);
  writeKeyValue(doc, t.validUntil, snapshot.validUntil, 168);
  writeKeyValue(doc, t.buyer, snapshot.buyer?.companyName, 186);

  let y = 226;
  doc.fillColor("#f3f3f6").rect(48, y, 499, 25).fill();
  doc.fillColor("#34353d").fontSize(8);
  doc.text(t.product, 56, y + 8, { width: 132 });
  doc.text(t.option, 192, y + 8, { width: 79 });
  doc.text(t.requested, 275, y + 8, { width: 31, align: "right" });
  doc.text(t.prepared, 309, y + 8, { width: 36, align: "right" });
  doc.text(t.cancelled, 348, y + 8, { width: 38, align: "right" });
  doc.text(t.unitPrice, 390, y + 8, { width: 67, align: "right" });
  doc.text(t.subtotal, 461, y + 8, { width: 78, align: "right" });
  y += 25;

  for (const item of snapshot.items || []) {
    const optionText = formatItemOptions(item, locale) || "-";
    const cancellationText = formatCancellation(item, locale);
    doc.fontSize(7.5);
    const rowHeight = Math.max(42, Math.min(78, Math.max(
      doc.heightOfString(optionText, { width: 77, lineGap: 1 }) + 16,
      cancellationText ? doc.heightOfString(cancellationText, { width: 132, lineGap: 1 }) + 31 : 42
    )));
    if (y + rowHeight > 705) {
      doc.addPage();
      y = 48;
    }
    doc.moveTo(48, y + rowHeight).lineTo(547, y + rowHeight).strokeColor("#ececf0").lineWidth(0.6).stroke();
    doc.fillColor("#20212a").fontSize(8).text(item.productName || item.productCode, 56, y + 8, { width: 132, ellipsis: true });
    doc.fillColor("#6b6b73").fontSize(7).text(item.productCode, 56, y + 21, { width: 132, ellipsis: true });
    if (cancellationText) doc.fillColor("#b0445a").fontSize(6.5).text(cancellationText, 56, y + 32, { width: 132, height: rowHeight - 34, lineGap: 1, ellipsis: true });
    doc.fillColor("#34353d").fontSize(7.5).text(optionText, 192, y + 8, { width: 79, height: rowHeight - 12, lineGap: 1, ellipsis: true });
    const requestedQuantity = item.requestedQuantity ?? item.quantity;
    const cancelledQuantity = item.cancelledQuantity ?? Math.max(Number(requestedQuantity || 0) - Number(item.quantity || 0), 0);
    doc.text(String(requestedQuantity), 275, y + 12, { width: 31, align: "right" });
    doc.text(String(item.quantity), 309, y + 12, { width: 36, align: "right" });
    doc.text(String(cancelledQuantity), 348, y + 12, { width: 38, align: "right" });
    doc.text(formatMoney(item.unitPrice, snapshot.currency), 390, y + 12, { width: 67, align: "right" });
    doc.text(formatMoney(item.subtotal, snapshot.currency), 461, y + 12, { width: 78, align: "right" });
    y += rowHeight;
  }

  y += 14;
  doc.fillColor("#2a234f").fontSize(11).text(t.total, 360, y, { width: 80, align: "right" });
  doc.fontSize(13).text(formatMoney(snapshot.total, snapshot.currency), 445, y - 2, { width: 94, align: "right" });
  y += 42;
  writeKeyValue(doc, t.leadTime, snapshot.leadTime, y);
  y += 20;
  writeKeyValue(doc, t.shipping, snapshot.shippingNote, y);
  y += 20;
  if (snapshot.customerNote) {
    writeKeyValue(doc, t.note, snapshot.customerNote, y);
    y += 34;
  }

  doc.fillColor("#6b6b73").fontSize(7.5).text(t.footer, 48, Math.min(760, y + 24), { width: 499, lineGap: 2 });
  doc.end();
  return completed;
}
