import { createRequire } from "node:module";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);

const fontCandidates = {
  kr: "@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff",
  en: "@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff",
  jp: "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff",
  "zh-TW": "@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-400-normal.woff"
};

const labels = {
  kr: {
    title: "\uc0c1\ud488 \uc900\ube44 \uacac\uc801\uc11c",
    quoteNumber: "\uacac\uc801 \ubc88\ud638",
    issuedAt: "\ubc1c\ud589\uc77c",
    validUntil: "\uc720\ud6a8\uae30\uac04",
    buyer: "\uac70\ub798\ucc98",
    image: "\uc0ac\uc9c4",
    product: "\uc0c1\ud488 / \ucf54\ub4dc",
    option: "\uc120\ud0dd \uc635\uc158",
    requested: "\uc694\uccad",
    prepared: "\uc900\ube44",
    cancelled: "\ucde8\uc18c",
    reason: "\ucde8\uc18c \uc0ac\uc720 / \ube44\uace0",
    unitPrice: "\ub2e8\uac00",
    subtotal: "\uae08\uc561",
    total: "\uc900\ube44 \ud569\uacc4",
    leadTime: "\ub0a9\uae30",
    shipping: "\ubc30\uc1a1 \uc870\uac74",
    note: "\uad6c\ub9e4\uc790 \uc548\ub0b4",
    noImage: "\uc774\ubbf8\uc9c0 \uc5c6\uc74c",
    page: "\ud398\uc774\uc9c0",
    footer: "\uc774 \ubb38\uc11c\ub294 \ub9e4\uc7a5\uc5d0\uc11c \uc0c1\ud488\uc744 \ucc59\uae30\uace0 \ubd84\ub958\ud558\uae30 \uc704\ud55c \uc900\ube44 \uacb0\uacfc \uacac\uc801\uc11c\uc785\ub2c8\ub2e4. \uc120\ud0dd \uc635\uc158\uacfc \uc900\ube44\u00b7\ucde8\uc18c \uc218\ub7c9\uc744 \ud655\uc778\ud55c \ub4a4 \ubcc4\ub3c4 \uacc4\uc88c \uc548\ub0b4\uc640 \ubc1c\uc1a1 \uc808\ucc28\ub97c \uc9c4\ud589\ud569\ub2c8\ub2e4. \uc0ac\uc774\ud2b8\uc5d0\uc11c\ub294 \uc8fc\ubb38\uc774\ub098 \uacb0\uc81c\uac00 \uc0dd\uc131\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4."
  },
  en: {
    title: "PICKING QUOTATION",
    quoteNumber: "Quote No.",
    issuedAt: "Issued",
    validUntil: "Valid until",
    buyer: "Buyer",
    image: "Image",
    product: "Product / code",
    option: "Selected options",
    requested: "Req.",
    prepared: "Ready",
    cancelled: "Cancel",
    reason: "Cancellation / note",
    unitPrice: "Unit price",
    subtotal: "Amount",
    total: "Prepared total",
    leadTime: "Lead time",
    shipping: "Shipping terms",
    note: "Buyer note",
    noImage: "No image",
    page: "Page",
    footer: "Use this document to pick and sort products. Verify selected options and prepared or cancelled quantities before providing bank-transfer and shipping instructions. No online order or payment is created."
  },
  jp: {
    title: "\u5546\u54c1\u6e96\u5099\u898b\u7a4d\u66f8",
    quoteNumber: "\u898b\u7a4d\u756a\u53f7",
    issuedAt: "\u767a\u884c\u65e5",
    validUntil: "\u6709\u52b9\u671f\u9650",
    buyer: "\u53d6\u5f15\u5148",
    image: "\u753b\u50cf",
    product: "\u5546\u54c1 / \u30b3\u30fc\u30c9",
    option: "\u9078\u629e\u30aa\u30d7\u30b7\u30e7\u30f3",
    requested: "\u4f9d\u983c",
    prepared: "\u6e96\u5099",
    cancelled: "\u53d6\u6d88",
    reason: "\u53d6\u6d88\u7406\u7531 / \u5099\u8003",
    unitPrice: "\u5358\u4fa1",
    subtotal: "\u91d1\u984d",
    total: "\u6e96\u5099\u5408\u8a08",
    leadTime: "\u7d0d\u671f",
    shipping: "\u914d\u9001\u6761\u4ef6",
    note: "\u8cfc\u5165\u8005\u6848\u5185",
    noImage: "\u753b\u50cf\u306a\u3057",
    page: "\u30da\u30fc\u30b8",
    footer: "\u3053\u306e\u6587\u66f8\u306f\u5e97\u8217\u3067\u5546\u54c1\u3092\u30d4\u30c3\u30ad\u30f3\u30b0\u30fb\u4ed5\u5206\u3051\u3059\u308b\u305f\u3081\u306e\u6e96\u5099\u7d50\u679c\u898b\u7a4d\u66f8\u3067\u3059\u3002\u9078\u629e\u30aa\u30d7\u30b7\u30e7\u30f3\u3068\u6e96\u5099\u30fb\u53d6\u6d88\u6570\u91cf\u3092\u78ba\u8a8d\u3057\u3001\u5225\u9014\u632f\u8fbc\u6848\u5185\u3068\u767a\u9001\u624b\u7d9a\u304d\u3092\u884c\u3044\u307e\u3059\u3002\u30b5\u30a4\u30c8\u4e0a\u3067\u306f\u6ce8\u6587\u3084\u6c7a\u6e08\u306f\u4f5c\u6210\u3055\u308c\u307e\u305b\u3093\u3002"
  },
  "zh-TW": {
    title: "\u5099\u8ca8\u63c0\u8ca8\u5831\u50f9\u55ae",
    quoteNumber: "\u5831\u50f9\u55ae\u865f",
    issuedAt: "\u767c\u884c\u65e5",
    validUntil: "\u6709\u6548\u671f\u9650",
    buyer: "\u5ba2\u6236",
    image: "\u5716\u7247",
    product: "\u5546\u54c1 / \u7de8\u865f",
    option: "\u9078\u64c7\u898f\u683c",
    requested: "\u9700\u6c42",
    prepared: "\u5099\u59a5",
    cancelled: "\u53d6\u6d88",
    reason: "\u53d6\u6d88\u539f\u56e0 / \u5099\u8a3b",
    unitPrice: "\u55ae\u50f9",
    subtotal: "\u91d1\u984d",
    total: "\u5099\u8ca8\u5408\u8a08",
    leadTime: "\u4ea4\u671f",
    shipping: "\u904b\u9001\u689d\u4ef6",
    note: "\u8cb7\u5bb6\u8aaa\u660e",
    noImage: "\u7121\u5716\u7247",
    page: "\u9801",
    footer: "\u672c\u6587\u4ef6\u4f9b\u9580\u5e02\u63c0\u8ca8\u8207\u5206\u985e\u4f7f\u7528\u3002\u8acb\u78ba\u8a8d\u6240\u9078\u898f\u683c\u53ca\u5099\u59a5\u3001\u53d6\u6d88\u6578\u91cf\u5f8c\uff0c\u518d\u53e6\u884c\u63d0\u4f9b\u532f\u6b3e\u8cc7\u8a0a\u4e26\u5b89\u6392\u51fa\u8ca8\u3002\u7db2\u7ad9\u4e0d\u6703\u5efa\u7acb\u8a02\u55ae\u6216\u7dda\u4e0a\u4ed8\u6b3e\u3002"
  }
};

const cancellationLabels = {
  kr: { out_of_stock: "\uc7ac\uace0 \uc5c6\uc74c", quantity_shortage: "\uc218\ub7c9 \ubd80\uc871", quality_issue: "\ud488\uc9c8 \ud655\uc778 \ubd88\uac00", discontinued: "\ucde8\uae09 \uc885\ub8cc", other: "\uae30\ud0c0" },
  en: { out_of_stock: "Out of stock", quantity_shortage: "Quantity shortage", quality_issue: "Quality issue", discontinued: "Discontinued", other: "Other" },
  jp: { out_of_stock: "\u5728\u5eab\u306a\u3057", quantity_shortage: "\u6570\u91cf\u4e0d\u8db3", quality_issue: "\u54c1\u8cea\u78ba\u8a8d\u4e0d\u53ef", discontinued: "\u53d6\u6271\u7d42\u4e86", other: "\u305d\u306e\u4ed6" },
  "zh-TW": { out_of_stock: "\u7121\u5eab\u5b58", quantity_shortage: "\u6578\u91cf\u4e0d\u8db3", quality_issue: "\u54c1\u8cea\u554f\u984c", discontinued: "\u5df2\u505c\u552e", other: "\u5176\u4ed6" }
};

const dateLocales = { kr: "ko-KR", en: "en-US", jp: "ja-JP", "zh-TW": "zh-TW" };
const columns = {
  image: { x: 32, width: 60 },
  product: { x: 92, width: 130 },
  option: { x: 222, width: 165 },
  requested: { x: 387, width: 43 },
  prepared: { x: 430, width: 43 },
  cancelled: { x: 473, width: 43 },
  reason: { x: 516, width: 105 },
  unitPrice: { x: 621, width: 85 },
  subtotal: { x: 706, width: 104 }
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

function formatMoney(value, currency, locale) {
  const amount = Number(value || 0);
  try {
    return `${currency} ${new Intl.NumberFormat(dateLocales[locale] || "en-US").format(amount)}`;
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

function localizedOptionLabel(labelsByLocale, locale) {
  const values = labelsByLocale && typeof labelsByLocale === "object" ? labelsByLocale : {};
  return values[locale] || values.en || values.kr || values.jp || values["zh-TW"] || "";
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
      .join("\n");
  }
  return [item.color, item.size].filter(Boolean).join(" / ");
}

function formatCancellation(item, locale) {
  const note = item.cancellationNote || item.itemNote || "";
  if (!Number(item.cancelledQuantity || 0)) return note;
  const reason = cancellationLabels[locale]?.[item.cancellationReason]
    || item.cancellationReason
    || cancellationLabels[locale]?.other;
  return [reason, note].filter(Boolean).join("\n");
}

function writeMeta(doc, label, value, x, y, width = 220) {
  doc.fillColor("#777781").fontSize(7).text(label, x, y, { width: 72 });
  doc.fillColor("#20212a").fontSize(8).text(value || "-", x + 74, y, { width: width - 74, ellipsis: true });
}

function drawTableHeader(doc, t, y) {
  doc.fillColor("#f0f0f4").rect(32, y, 778, 26).fill();
  doc.fillColor("#34353d").fontSize(6.7);
  for (const [key, column] of Object.entries(columns)) {
    const align = ["requested", "prepared", "cancelled", "unitPrice", "subtotal"].includes(key) ? "right" : "left";
    doc.text(t[key], column.x + 4, y + 8, { width: column.width - 8, align, ellipsis: true });
  }
  return y + 26;
}

function drawDocumentHeader(doc, t, snapshot, firstPage) {
  doc.fillColor("#2a234f").fontSize(9).text("NOBLESSE PIERCING", 32, 25, { characterSpacing: 0 });
  if (!firstPage) {
    doc.fillColor("#20212a").fontSize(12).text(`${t.title}  /  ${snapshot.quoteNumber}`, 32, 43);
    return drawTableHeader(doc, t, 64);
  }

  doc.fillColor("#20212a").fontSize(20).text(t.title, 32, 43);
  writeMeta(doc, t.quoteNumber, snapshot.quoteNumber, 32, 77, 250);
  writeMeta(doc, t.issuedAt, snapshot.issuedAt?.slice(0, 10), 32, 94, 250);
  writeMeta(doc, t.validUntil, snapshot.validUntil, 306, 77, 220);
  writeMeta(doc, t.buyer, [snapshot.buyer?.companyName, snapshot.buyer?.country].filter(Boolean).join(" / "), 306, 94, 300);
  doc.moveTo(32, 116).lineTo(810, 116).strokeColor("#d9d9df").lineWidth(1).stroke();
  return drawTableHeader(doc, t, 128);
}

function drawProductImage(doc, item, y, t) {
  const x = columns.image.x + 6;
  const size = 48;
  doc.fillColor("#f7f6f4").rect(x, y + 8, size, size).fill();
  if (Buffer.isBuffer(item.imageBuffer) && item.imageBuffer.length > 0) {
    try {
      doc.image(item.imageBuffer, x, y + 8, { fit: [size, size], align: "center", valign: "center" });
      return;
    } catch {
      // Keep the PDF usable when an individual product image cannot be decoded.
    }
  }
  doc.fillColor("#90909a").fontSize(5.5).text(t.noImage, x + 2, y + 28, { width: size - 4, align: "center" });
}

function drawItemRow(doc, item, snapshot, locale, t, y, rowHeight) {
  const optionText = formatItemOptions(item, locale) || "-";
  const cancellationText = formatCancellation(item, locale) || "-";
  const requestedQuantity = Number(item.requestedQuantity ?? item.quantity ?? 0);
  const preparedQuantity = Number(item.quantity || 0);
  const cancelledQuantity = Number(item.cancelledQuantity ?? Math.max(requestedQuantity - preparedQuantity, 0));

  drawProductImage(doc, item, y, t);
  doc.fillColor("#20212a").fontSize(7.6).text(item.productName || item.productCode, columns.product.x + 5, y + 9, {
    width: columns.product.width - 10,
    height: 30,
    lineGap: 1,
    ellipsis: true
  });
  doc.fillColor("#6b6b73").fontSize(6.3).text(item.productCode || "-", columns.product.x + 5, y + 42, {
    width: columns.product.width - 10,
    ellipsis: true
  });
  doc.fillColor("#34353d").fontSize(7).text(optionText, columns.option.x + 5, y + 9, {
    width: columns.option.width - 10,
    height: rowHeight - 16,
    lineGap: 2,
    ellipsis: true
  });
  doc.fillColor(cancelledQuantity > 0 ? "#a6354c" : "#6b6b73").fontSize(6.6).text(cancellationText, columns.reason.x + 5, y + 9, {
    width: columns.reason.width - 10,
    height: rowHeight - 16,
    lineGap: 2,
    ellipsis: true
  });

  const numericY = y + Math.max(19, (rowHeight - 8) / 2);
  doc.fillColor("#20212a").fontSize(7.2);
  doc.text(String(requestedQuantity), columns.requested.x + 4, numericY, { width: columns.requested.width - 8, align: "right" });
  doc.text(String(preparedQuantity), columns.prepared.x + 4, numericY, { width: columns.prepared.width - 8, align: "right" });
  doc.fillColor(cancelledQuantity > 0 ? "#a6354c" : "#20212a").text(String(cancelledQuantity), columns.cancelled.x + 4, numericY, { width: columns.cancelled.width - 8, align: "right" });
  doc.fillColor("#20212a").fontSize(6.8).text(formatMoney(item.unitPrice, snapshot.currency, locale), columns.unitPrice.x + 4, numericY, { width: columns.unitPrice.width - 8, align: "right" });
  doc.text(formatMoney(item.subtotal, snapshot.currency, locale), columns.subtotal.x + 4, numericY, { width: columns.subtotal.width - 8, align: "right" });

  doc.moveTo(32, y + rowHeight).lineTo(810, y + rowHeight).strokeColor("#e5e5ea").lineWidth(0.6).stroke();
}

function measureRow(doc, item, locale) {
  doc.fontSize(7);
  const optionHeight = doc.heightOfString(formatItemOptions(item, locale) || "-", { width: columns.option.width - 10, lineGap: 2 });
  const reasonHeight = doc.heightOfString(formatCancellation(item, locale) || "-", { width: columns.reason.width - 10, lineGap: 2 });
  return Math.max(64, Math.min(96, Math.max(optionHeight, reasonHeight) + 18));
}

function drawSummary(doc, t, snapshot, locale, y) {
  doc.moveTo(32, y).lineTo(810, y).strokeColor("#cfcfd6").lineWidth(1).stroke();
  doc.fillColor("#2a234f").fontSize(10).text(t.total, 608, y + 14, { width: 88, align: "right" });
  doc.fontSize(12).text(formatMoney(snapshot.total, snapshot.currency, locale), 700, y + 12, { width: 110, align: "right" });
  writeMeta(doc, t.leadTime, snapshot.leadTime, 32, y + 16, 270);
  writeMeta(doc, t.shipping, snapshot.shippingNote, 306, y + 16, 270);
  let nextY = y + 44;
  if (snapshot.customerNote) {
    doc.fillColor("#777781").fontSize(7).text(t.note, 32, nextY, { width: 72 });
    doc.fillColor("#20212a").fontSize(7.5).text(snapshot.customerNote, 106, nextY, { width: 704, height: 34, lineGap: 2, ellipsis: true });
    nextY += 40;
  }
  doc.fillColor("#6b6b73").fontSize(6.5).text(t.footer, 32, nextY + 4, { width: 778, lineGap: 2 });
}

export async function createQuotePdfBuffer(snapshot) {
  const locale = labels[snapshot.documentLocale] ? snapshot.documentLocale : "en";
  const t = labels[locale];
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 32,
    bufferPages: true,
    info: { Title: snapshot.quoteNumber, Author: "Noblesse Piercing" }
  });
  const chunks = [];
  const completed = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const fontPath = resolveFont(locale);
  if (fontPath) doc.font(fontPath);

  let y = drawDocumentHeader(doc, t, snapshot, true);
  for (const item of snapshot.items || []) {
    const rowHeight = measureRow(doc, item, locale);
    if (y + rowHeight > 510) {
      doc.addPage();
      if (fontPath) doc.font(fontPath);
      y = drawDocumentHeader(doc, t, snapshot, false);
    }
    drawItemRow(doc, item, snapshot, locale, t, y, rowHeight);
    y += rowHeight;
  }

  if (y + 104 > 538) {
    doc.addPage();
    if (fontPath) doc.font(fontPath);
    y = drawDocumentHeader(doc, t, snapshot, false);
  }
  drawSummary(doc, t, snapshot, locale, y + 10);

  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    if (fontPath) doc.font(fontPath);
    doc.fillColor("#8a8a92").fontSize(6).text(`${t.page} ${index + 1} / ${range.count}`, 710, 548, { width: 100, align: "right", lineBreak: false });
  }

  doc.end();
  return completed;
}
