import { getSupabase } from '../lib/supabase'

const mapItem = (item) => ({
  productId: item.product_id ?? item.productId,
  productCode: item.product_code ?? item.productCode,
  productName: item.product_name ?? item.productName,
  thumbnailUrl: item.thumbnail_url ?? item.thumbnailUrl,
  material: item.material,
  color: item.color,
  size: item.size,
  moq: Number(item.moq),
  quantity: Number(item.quantity),
  priceSnapshot: Number(item.price_snapshot ?? item.priceSnapshot),
  subtotal: Number(item.subtotal),
})

const mapRequest = (request) => ({
  inquiryId: request.reference,
  requestId: request.id,
  buyerId: request.buyer_id,
  buyerCompanyName: request.buyer_company_name,
  buyerCountry: request.shipping_country,
  buyerLanguage: request.buyer_language,
  currency: request.currency,
  status: request.status,
  totalItems: Number(request.total_items),
  totalQuantity: Number(request.total_quantity),
  estimatedTotal: Number(request.estimated_total),
  requestMemo: request.request_memo ?? '',
  contactName: request.contact_name ?? '',
  contactEmail: request.contact_email ?? '',
  createdAt: request.created_at,
  updatedAt: request.updated_at,
  items: (request.quote_request_items ?? []).map(mapItem),
  quote: request.quotes?.[0] ? mapQuote(request.quotes[0]) : null,
})

const mapQuote = (quote) => ({
  id: quote.id,
  status: quote.status,
  currency: quote.currency,
  shippingAmount: Number(quote.shipping_amount ?? 0),
  leadTime: quote.lead_time ?? '',
  validUntil: quote.valid_until ?? '',
  terms: quote.terms ?? '',
  adminNote: quote.admin_note ?? '',
  items: (quote.quote_items ?? []).map((item) => ({
    ...mapItem(item),
    unitPrice: Number(item.unit_price),
  })),
  publishedAt: quote.published_at,
  acceptedAt: quote.accepted_at,
})

const quoteSelect = '*, quote_request_items(*), quotes(*, quote_items(*))'

export async function fetchBuyerRequests() {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('quote_requests').select(quoteSelect).order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapRequest)
}

export async function fetchAdminRequests() {
  return fetchBuyerRequests()
}

export async function createQuoteRequest({ rows, requestMemo, shippingCountry, contactName, contactEmail }) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: requestId, error } = await supabase.rpc('create_quote_request', {
    p_shipping_country: shippingCountry,
    p_contact_name: contactName,
    p_contact_email: contactEmail,
    p_request_memo: requestMemo ?? '',
    p_items: rows.map((row) => ({ product_id: row.productId, color: row.color, size: row.size, quantity: row.quantity })),
  })
  if (error) throw error
  const { data, error: readError } = await supabase.from('quote_requests').select(quoteSelect).eq('id', requestId).single()
  if (readError) throw readError
  return mapRequest(data)
}

export async function publishQuoteRequest(request, draft) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const total = draft.items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0) + Number(draft.shippingAmount || 0)
  const { data: quote, error } = await supabase.from('quotes').upsert({
    request_id: request.requestId,
    status: 'published',
    currency: request.currency,
    shipping_amount: draft.shippingAmount || 0,
    lead_time: draft.leadTime,
    valid_until: draft.validUntil || null,
    terms: draft.terms,
    admin_note: draft.adminNote,
    quoted_total: total,
    published_at: new Date().toISOString(),
  }, { onConflict: 'request_id' }).select().single()
  if (error) throw error
  const { error: itemsError } = await supabase.from('quote_items').upsert(draft.items.map((item) => ({
    quote_id: quote.id,
    product_id: item.productId,
    product_code: item.productCode,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: Number(item.unitPrice) * Number(item.quantity),
    color: item.color,
    size: item.size,
    material: item.material,
    thumbnail_url: item.thumbnailUrl,
    moq: item.moq,
  })), { onConflict: 'quote_id,product_id,color,size' })
  if (itemsError) throw itemsError
  const { error: requestError } = await supabase.from('quote_requests').update({ status: 'quoted' }).eq('id', request.requestId)
  if (requestError) throw requestError
  return fetchRequest(request.requestId)
}

export async function markRequestChecking(requestId) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { error } = await supabase.from('quote_requests').update({ status: 'checking' }).eq('id', requestId)
  if (error) throw error
  return fetchRequest(requestId)
}

export async function acceptPublishedQuote(requestId, accepted) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { error } = await supabase.rpc('respond_to_quote', { p_request_id: requestId, p_accepted: accepted })
  if (error) throw error
  return fetchRequest(requestId)
}

async function fetchRequest(requestId) {
  const supabase = await getSupabase()
  const { data, error } = await supabase.from('quote_requests').select(quoteSelect).eq('id', requestId).single()
  if (error) throw error
  return mapRequest(data)
}
