import { formatMoney } from './commerce'

export async function downloadQuotePdf(request) {
  const { jsPDF } = await import('jspdf')
  const quote = request.quote
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const rows = quote?.items ?? request.items
  const unitPrice = (item) => item.unitPrice ?? item.priceSnapshot
  const total = rows.reduce((sum, item) => sum + Number(item.subtotal ?? unitPrice(item) * item.quantity), 0) + Number(quote?.shippingAmount ?? 0)
  let y = 58
  doc.setFontSize(22)
  doc.text('NOBLESSE', 48, y)
  doc.setFontSize(12)
  y += 28
  doc.text('Official quotation', 48, y)
  y += 28
  doc.text(`Reference: ${request.inquiryId}`, 48, y)
  y += 18
  doc.text(`Status: ${request.status}`, 48, y)
  y += 18
  doc.text(`Customer: ${request.buyerCompanyName}`, 48, y)
  y += 18
  doc.text(`Currency: ${request.currency}`, 48, y)
  y += 32
  rows.forEach((item) => {
    if (y > 740) { doc.addPage(); y = 58 }
    doc.setFontSize(10)
    doc.text(`${item.productCode}  ${item.productName}`, 48, y)
    y += 15
    doc.text(`${item.quantity} pcs x ${formatMoney(unitPrice(item), request.currency)} = ${formatMoney(item.subtotal ?? unitPrice(item) * item.quantity, request.currency)}`, 60, y)
    y += 24
  })
  if (quote?.shippingAmount) {
    doc.text(`Shipping: ${formatMoney(quote.shippingAmount, request.currency)}`, 48, y)
    y += 20
  }
  doc.setFontSize(13)
  doc.text(`Total: ${formatMoney(total, request.currency)}`, 48, y + 8)
  if (quote?.leadTime) { y += 32; doc.setFontSize(10); doc.text(`Lead time: ${quote.leadTime}`, 48, y) }
  if (quote?.validUntil) { y += 18; doc.text(`Valid until: ${quote.validUntil}`, 48, y) }
  if (quote?.terms) { y += 18; doc.text(`Terms: ${quote.terms}`, 48, y) }
  doc.save(`${request.inquiryId}-quote.pdf`)
}
