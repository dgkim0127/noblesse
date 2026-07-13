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
    quantity: "수량",
    unitPrice: "단가",
    subtotal: "금액",
    total: "합계",
    leadTime: "납기",
    shipping: "배송 조건",
    note: "고객 안내",
    footer: "견적 승인은 주문 또는 결제를 생성하지 않으며, 관리자 후속 처리 요청으로 기록됩니다."
  },
  en: {
    title: "OFFICIAL QUOTATION",
    quoteNumber: "Quote No.",
    issuedAt: "Issued",
    validUntil: "Valid until",
    buyer: "Buyer",
    product: "Product",
    option: "Option",
    quantity: "Qty",
    unitPrice: "Unit price",
    subtotal: "Amount",
    total: "Total",
    leadTime: "Lead time",
    shipping: "Shipping terms",
    note: "Customer note",
    footer: "Accepting this quote requests administrator follow-up. It does not create an order or payment."
  },
  jp: {
    title: "正式見積書",
    quoteNumber: "見積番号",
    issuedAt: "発行日",
    validUntil: "有効期限",
    buyer: "取引先",
    product: "商品",
    option: "オプション",
    quantity: "数量",
    unitPrice: "単価",
    subtotal: "金額",
    total: "合計",
    leadTime: "納期",
    shipping: "配送条件",
    note: "お客様向けメモ",
    footer: "見積承認は注文・決済を作成せず、管理者による後続対応の依頼として記録されます。"
  },
  "zh-TW": {
    title: "正式報價單",
    quoteNumber: "報價編號",
    issuedAt: "發行日",
    validUntil: "有效期限",
    buyer: "客戶",
    product: "商品",
    option: "選項",
    quantity: "數量",
    unitPrice: "單價",
    subtotal: "金額",
    total: "合計",
    leadTime: "交期",
    shipping: "運送條件",
    note: "客戶備註",
    footer: "接受報價只會提出管理員後續處理需求，不會建立訂單或付款。"
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
  doc.text(t.product, 56, y + 8, { width: 180 });
  doc.text(t.option, 238, y + 8, { width: 90 });
  doc.text(t.quantity, 330, y + 8, { width: 38, align: "right" });
  doc.text(t.unitPrice, 375, y + 8, { width: 75, align: "right" });
  doc.text(t.subtotal, 455, y + 8, { width: 84, align: "right" });
  y += 25;

  for (const item of snapshot.items || []) {
    const rowHeight = 38;
    if (y + rowHeight > 705) {
      doc.addPage();
      y = 48;
    }
    doc.moveTo(48, y + rowHeight).lineTo(547, y + rowHeight).strokeColor("#ececf0").lineWidth(0.6).stroke();
    doc.fillColor("#20212a").fontSize(8).text(item.productName || item.productCode, 56, y + 8, { width: 176, ellipsis: true });
    doc.fillColor("#6b6b73").fontSize(7).text(item.productCode, 56, y + 21, { width: 176, ellipsis: true });
    doc.fillColor("#34353d").fontSize(8).text([item.color, item.size].filter(Boolean).join(" / ") || "-", 238, y + 12, { width: 88, ellipsis: true });
    doc.text(String(item.quantity), 330, y + 12, { width: 38, align: "right" });
    doc.text(formatMoney(item.unitPrice, snapshot.currency), 375, y + 12, { width: 75, align: "right" });
    doc.text(formatMoney(item.subtotal, snapshot.currency), 455, y + 12, { width: 84, align: "right" });
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
