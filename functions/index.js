import { randomUUID } from 'node:crypto'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { createClient } from '@supabase/supabase-js'
import {
  amountFromMinor,
  assertArray,
  assertIdentifier,
  assertImagePaths,
  assertString,
  assertWebpBuffer,
  marketCurrencies,
  parseMinorAmount,
} from './lib/validation.js'
import { calculateDiscountedLineMinor, hasApprovedBuyerAccess, hasNoblesseAdminClaim } from './lib/policy.js'

const REGION = 'asia-northeast3'
const supabaseUrl = defineSecret('NOBLESSE_SUPABASE_URL')
const supabaseSecretKey = defineSecret('NOBLESSE_SUPABASE_SECRET_KEY')
const callableOptions = {
  region: REGION,
  // Temporary production fallback: the current Firebase account cannot manage
  // App Check providers. Auth, buyer approval, admin claims, and server-side
  // recalculation remain enforced. Set this back to true after App Check setup.
  enforceAppCheck: false,
  secrets: [supabaseUrl, supabaseSecretKey],
}
const productIdPattern = /^[A-Z0-9][A-Z0-9-]{1,79}$/
const contentIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/
const inquiryStatuses = new Set(['requested', 'checking', 'quoted', 'confirmed', 'cancelled'])

if (!getApps().length) initializeApp()
const firestore = getFirestore()

const getSupabase = () => createClient(supabaseUrl.value(), supabaseSecretKey.value(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in is required.')
  return request.auth.uid
}

const requireAdmin = (request) => {
  const uid = requireAuth(request)
  if (!hasNoblesseAdminClaim(request.auth.token)) {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
  return uid
}

const throwSupabaseError = (error, operation) => {
  logger.error(`Noblesse ${operation} failed`, error)
  throw new HttpsError('internal', 'The service could not complete the request.')
}

const mapBuyer = (buyer) => buyer ? {
  uid: buyer.firebase_uid,
  email: buyer.email,
  companyName: buyer.company_name,
  contactName: buyer.contact_name,
  country: buyer.country,
  preferredLanguage: buyer.preferred_language,
  phone: buyer.phone,
  role: 'buyer',
  status: buyer.status,
  assignedMarket: buyer.assigned_market ?? '',
  currency: buyer.currency ?? '',
  discountRate: buyer.discount_rate,
  minOrderAmount: amountFromMinor(buyer.min_order_amount_minor, buyer.currency ?? 'KRW'),
  minOrderAmountMinor: Number(buyer.min_order_amount_minor),
} : null

const mapProduct = (product) => ({
  productId: product.product_id,
  code: product.code,
  categoryId: product.category_id,
  collectionIds: product.collection_ids ?? [],
  nameKo: product.name_ko,
  nameEn: product.name_en,
  nameJa: product.name_ja,
  nameZh: product.name_zh,
  descriptionKo: product.description_ko,
  descriptionEn: product.description_en,
  descriptionJa: product.description_ja,
  descriptionZh: product.description_zh,
  material: product.material,
  colors: product.colors ?? [],
  sizes: product.sizes ?? [],
  leadTime: product.lead_time,
  origin: product.origin,
  imageSet: product.image_set ?? {},
  imagePaths: product.image_paths ?? {},
  imageAlt: product.image_alt ?? {},
  tone: product.tone,
  badge: product.badge,
  isNew: product.is_new,
  isBest: product.is_best,
  isExportAvailable: product.is_export_available,
  isVisible: product.is_visible,
  sortOrder: product.sort_order,
  createdAt: product.created_at,
  updatedAt: product.updated_at,
})

const mapCategory = (row) => ({
  categoryId: row.category_id,
  nameKo: row.name_ko,
  nameEn: row.name_en,
  nameJa: row.name_ja,
  nameZh: row.name_zh,
  slug: row.category_id,
  coverUrl: row.cover_url,
  isVisible: row.is_visible,
  sortOrder: row.sort_order,
})

const mapCollection = (row) => ({
  collectionId: row.collection_id,
  titleKo: row.title_ko,
  titleEn: row.title_en,
  titleJa: row.title_ja,
  titleZh: row.title_zh,
  slug: row.collection_id,
  coverUrl: row.cover_url,
  isVisible: row.is_visible,
  sortOrder: row.sort_order,
})

const mapPrice = (price, buyer) => {
  const wholesalePriceMinor = Number(price.wholesale_price_minor)
  const approvedPriceMinor = Math.round(wholesalePriceMinor * (100 - Number(buyer.discount_rate || 0)) / 100)
  return {
    productId: price.product_id,
    market: price.market,
    currency: price.currency,
    wholesalePrice: amountFromMinor(wholesalePriceMinor, price.currency),
    wholesalePriceMinor,
    approvedPrice: amountFromMinor(approvedPriceMinor, price.currency),
    approvedPriceMinor,
    retailPrice: price.retail_price_minor === null ? null : amountFromMinor(price.retail_price_minor, price.currency),
    moq: price.moq,
    minOrderAmount: amountFromMinor(price.min_order_amount_minor, price.currency),
    isActive: price.is_active,
    visibleTo: 'approved_only',
  }
}

const mapInquiry = (inquiry, items = []) => ({
  inquiryId: inquiry.inquiry_id,
  buyerId: inquiry.buyer_uid,
  buyerCompanyName: inquiry.buyer_company_name,
  buyerCountry: inquiry.buyer_country,
  buyerLanguage: inquiry.buyer_language,
  currency: inquiry.currency,
  status: inquiry.status,
  estimatedTotal: amountFromMinor(inquiry.estimated_total_minor, inquiry.currency),
  estimatedTotalMinor: Number(inquiry.estimated_total_minor),
  finalTotal: inquiry.final_total_minor === null ? null : amountFromMinor(inquiry.final_total_minor, inquiry.currency),
  finalTotalMinor: inquiry.final_total_minor === null ? null : Number(inquiry.final_total_minor),
  totalItems: inquiry.total_items,
  totalQuantity: inquiry.total_quantity,
  requestMemo: inquiry.request_memo,
  adminMemo: inquiry.admin_memo,
  createdAt: inquiry.created_at,
  updatedAt: inquiry.updated_at,
  items: items.map((item) => ({
    productId: item.product_id,
    productCode: item.product_code,
    productName: item.product_name,
    thumbnailUrl: item.thumbnail_url,
    material: item.material,
    color: item.color,
    size: item.size,
    moq: item.moq,
    quantity: item.quantity,
    priceSnapshot: amountFromMinor(item.unit_price_minor, inquiry.currency),
    priceSnapshotMinor: Number(item.unit_price_minor),
    subtotal: amountFromMinor(item.subtotal_minor, inquiry.currency),
    subtotalMinor: Number(item.subtotal_minor),
  })),
})

const getBuyer = async (supabase, uid) => {
  const { data, error } = await supabase.from('noblesse_buyers').select('*').eq('firebase_uid', uid).maybeSingle()
  if (error) throwSupabaseError(error, 'load buyer')
  return data
}

const getInquiryItems = async (supabase, inquiryIds) => {
  if (!inquiryIds.length) return []
  const { data, error } = await supabase.from('noblesse_inquiry_items').select('*').in('inquiry_id', inquiryIds).order('line_no')
  if (error) throwSupabaseError(error, 'load inquiry items')
  return data
}

const appendAudit = async (supabase, actorUid, action, entityType, entityId, payload = {}) => {
  const { error } = await supabase.from('noblesse_admin_audit_logs').insert({
    actor_uid: actorUid,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  })
  if (error) throwSupabaseError(error, 'write audit log')
}

const syncCatalogProduct = async (product) => {
  const reference = firestore.collection('noblesse_public_products').doc(product.product_id)
  if (!product.is_visible) {
    await reference.delete()
    return
  }
  const publicProduct = mapProduct(product)
  delete publicProduct.imagePaths
  await reference.set(publicProduct)
}

const syncReferenceData = async (supabase) => {
  const [categories, collections, banners] = await Promise.all([
    supabase.from('noblesse_categories').select('*').eq('is_visible', true),
    supabase.from('noblesse_collections').select('*').eq('is_visible', true),
    supabase.from('noblesse_banners').select('*').eq('is_visible', true),
  ])
  for (const response of [categories, collections, banners]) {
    if (response.error) throwSupabaseError(response.error, 'sync reference data')
  }
  const batch = firestore.batch()
  const [existingCategories, existingCollections, existingBanners] = await Promise.all([
    firestore.collection('noblesse_public_categories').get(),
    firestore.collection('noblesse_public_collections').get(),
    firestore.collection('noblesse_public_banners').get(),
  ])
  const syncCollection = (snapshot, rows, collection, idKey, mapper) => {
    const activeIds = new Set(rows.map((row) => row[idKey]))
    snapshot.docs.filter((document) => !activeIds.has(document.id)).forEach((document) => batch.delete(document.ref))
    rows.forEach((row) => batch.set(firestore.collection(collection).doc(row[idKey]), mapper(row)))
  }
  syncCollection(existingCategories, categories.data, 'noblesse_public_categories', 'category_id', mapCategory)
  syncCollection(existingCollections, collections.data, 'noblesse_public_collections', 'collection_id', mapCollection)
  syncCollection(existingBanners, banners.data, 'noblesse_public_banners', 'banner_id', (row) => ({
    bannerId: row.banner_id,
    titleKo: row.title_ko,
    titleEn: row.title_en,
    titleJa: row.title_ja,
    titleZh: row.title_zh,
    imageUrl: row.image_url,
    linkPath: row.link_path,
    sortOrder: row.sort_order,
  }))
  await batch.commit()
}

const getVerifiedApprovedBuyer = async (supabase, request) => {
  const uid = requireAuth(request)
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify the email address before using buyer features.')
  }
  const buyer = await getBuyer(supabase, uid)
  if (!hasApprovedBuyerAccess(request.auth.token, buyer)) {
    throw new HttpsError('permission-denied', 'Approved buyer access is required.')
  }
  return buyer
}

const generateInquiryId = () => {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const suffix = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
  return `INQ-${day}-${suffix}`
}

export const noblesseRegisterBuyer = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request)
  const email = assertString(request.auth.token.email, 'email', { required: true, max: 320 })
  const data = request.data ?? {}
  const supabase = getSupabase()
  const existing = await getBuyer(supabase, uid)
  if (existing) throw new HttpsError('already-exists', 'A buyer request already exists for this account.')

  const agreements = Array.isArray(data.agreements) ? data.agreements : []
  const requiredAgreements = ['terms_of_service', 'buyer_terms', 'privacy_collection_use']
  if (!requiredAgreements.every((key) => agreements.some((item) => item?.key === key && item?.accepted === true && item?.version))) {
    throw new HttpsError('failed-precondition', 'All required agreements must be accepted.')
  }

  const payload = {
    firebase_uid: uid,
    email,
    company_name: assertString(data.companyName, 'companyName', { required: true, max: 160 }),
    contact_name: assertString(data.contactName, 'contactName', { required: true, max: 120 }),
    country: assertString(data.country, 'country', { required: true, max: 80 }),
    preferred_language: assertString(data.preferredLanguage, 'preferredLanguage', { required: true, max: 8 }),
    phone: assertString(data.phone, 'phone', { required: true, max: 80 }),
    messenger_type: assertString(data.messengerType, 'messengerType', { max: 80 }),
    messenger_id: assertString(data.messengerId, 'messengerId', { max: 160 }),
    sales_channel: assertString(data.salesChannel, 'salesChannel', { max: 160 }),
    business_number: assertString(data.businessNumber, 'businessNumber', { max: 120 }),
    request_memo: assertString(data.requestMemo, 'requestMemo', { max: 2000 }),
    agreements,
  }
  const { data: buyer, error } = await supabase.from('noblesse_buyers').insert(payload).select('*').single()
  if (error) throwSupabaseError(error, 'register buyer')
  return { buyer: mapBuyer(buyer), requiresEmailVerification: request.auth.token.email_verified !== true }
})

export const noblesseGetBuyerProfile = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request)
  if (request.auth.token.noblesseAdmin === true) {
    return { buyer: { uid, email: request.auth.token.email ?? '', companyName: 'Noblesse Piercing', contactName: 'Noblesse Admin', country: 'KR', preferredLanguage: 'kr', role: 'admin', status: 'approved', assignedMarket: 'KR', currency: 'KRW', discountRate: 0, minOrderAmount: 0 } }
  }
  const supabase = getSupabase()
  let buyer = await getBuyer(supabase, uid)
  if (buyer?.status === 'email_verification_pending' && request.auth.token.email_verified === true) {
    const { data, error } = await supabase.from('noblesse_buyers').update({ status: 'pending' }).eq('firebase_uid', uid).select('*').single()
    if (error) throwSupabaseError(error, 'promote verified buyer')
    buyer = data
  }
  return { buyer: mapBuyer(buyer) }
})

export const noblesseGetCatalog = onCall(callableOptions, async (request) => {
  const supabase = getSupabase()
  const [productsSnapshot, categoriesSnapshot, collectionsSnapshot, bannersSnapshot] = await Promise.all([
    firestore.collection('noblesse_public_products').get(),
    firestore.collection('noblesse_public_categories').get(),
    firestore.collection('noblesse_public_collections').get(),
    firestore.collection('noblesse_public_banners').get(),
  ])
  const sortByOrder = (left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)

  let productPrices = []
  if (request.auth?.uid && request.auth.token.email_verified === true) {
    const buyer = await getBuyer(supabase, request.auth.uid)
    if (buyer?.status === 'approved' && buyer.assigned_market) {
      const { data, error } = await supabase.from('noblesse_product_prices').select('*').eq('market', buyer.assigned_market).eq('is_active', true)
      if (error) throwSupabaseError(error, 'load approved prices')
      productPrices = data.map((price) => mapPrice(price, buyer))
    }
  }

  return {
    products: productsSnapshot.docs.map((document) => document.data()).sort(sortByOrder),
    categories: categoriesSnapshot.docs.map((document) => document.data()).sort(sortByOrder),
    collections: collectionsSnapshot.docs.map((document) => document.data()).sort(sortByOrder),
    banners: bannersSnapshot.docs.map((document) => document.data()).sort(sortByOrder),
    catalogFiles: [],
    productPrices,
  }
})

export const noblesseGetMyInquiries = onCall(callableOptions, async (request) => {
  const buyer = await getVerifiedApprovedBuyer(getSupabase(), request)
  const supabase = getSupabase()
  const { data: inquiries, error } = await supabase.from('noblesse_inquiries').select('*').eq('buyer_uid', buyer.firebase_uid).order('created_at', { ascending: false })
  if (error) throwSupabaseError(error, 'load buyer inquiries')
  const items = await getInquiryItems(supabase, inquiries.map((inquiry) => inquiry.inquiry_id))
  return { inquiries: inquiries.map((inquiry) => mapInquiry(inquiry, items.filter((item) => item.inquiry_id === inquiry.inquiry_id))) }
})

export const noblesseSubmitInquiry = onCall(callableOptions, async (request) => {
  const supabase = getSupabase()
  const buyer = await getVerifiedApprovedBuyer(supabase, request)
  const rawItems = request.data?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 100) {
    throw new HttpsError('invalid-argument', 'At least one and at most 100 inquiry lines are required.')
  }
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count, error: rateError } = await supabase.from('noblesse_inquiries').select('*', { count: 'exact', head: true }).eq('buyer_uid', buyer.firebase_uid).gte('created_at', since)
  if (rateError) throwSupabaseError(rateError, 'check inquiry rate')
  if ((count ?? 0) >= 5) throw new HttpsError('resource-exhausted', 'Too many quote requests. Please try again later.')

  const itemsByKey = new Map()
  for (const rawItem of rawItems) {
    const productId = assertIdentifier(rawItem?.productId, 'productId', productIdPattern)
    const color = assertString(rawItem?.color, 'color', { required: true, max: 120 })
    const size = assertString(rawItem?.size, 'size', { required: true, max: 120 })
    const quantity = Number(rawItem?.quantity)
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) throw new HttpsError('invalid-argument', 'quantity is invalid.')
    const key = `${productId}:${color}:${size}`
    itemsByKey.set(key, { productId, color, size, quantity: (itemsByKey.get(key)?.quantity ?? 0) + quantity })
  }
  const normalizedItems = [...itemsByKey.values()]
  const productIds = normalizedItems.map((item) => item.productId)
  const [productsResponse, pricesResponse] = await Promise.all([
    supabase.from('noblesse_products').select('*').in('product_id', productIds).eq('is_visible', true),
    supabase.from('noblesse_product_prices').select('*').in('product_id', productIds).eq('market', buyer.assigned_market).eq('is_active', true),
  ])
  if (productsResponse.error) throwSupabaseError(productsResponse.error, 'load requested products')
  if (pricesResponse.error) throwSupabaseError(pricesResponse.error, 'load requested prices')
  if (productsResponse.data.length !== productIds.length || pricesResponse.data.length !== productIds.length) {
    throw new HttpsError('failed-precondition', 'One or more requested products are unavailable.')
  }
  const productById = new Map(productsResponse.data.map((product) => [product.product_id, product]))
  const priceById = new Map(pricesResponse.data.map((price) => [price.product_id, price]))
  const lineItems = normalizedItems.map((item, index) => {
    const product = productById.get(item.productId)
    const price = priceById.get(item.productId)
    if (!product.colors.includes(item.color) || !product.sizes.includes(item.size) || item.quantity % price.moq !== 0 || item.quantity < price.moq) {
      throw new HttpsError('failed-precondition', 'A product option or MOQ is no longer valid.')
    }
    const { unitPriceMinor, subtotalMinor } = calculateDiscountedLineMinor({
      wholesalePriceMinor: price.wholesale_price_minor,
      discountRate: buyer.discount_rate,
      quantity: item.quantity,
    })
    return {
      inquiry_id: '',
      line_no: index + 1,
      product_id: product.product_id,
      product_code: product.code,
      product_name: product.name_en,
      thumbnail_url: product.image_set?.thumb ?? '',
      material: product.material,
      color: item.color,
      size: item.size,
      moq: price.moq,
      quantity: item.quantity,
      unit_price_minor: unitPriceMinor,
      subtotal_minor: subtotalMinor,
    }
  })
  const inquiryId = generateInquiryId()
  const inquiryPayload = {
    inquiry_id: inquiryId,
    buyer_uid: buyer.firebase_uid,
    buyer_company_name: buyer.company_name,
    buyer_country: buyer.country,
    buyer_language: buyer.preferred_language,
    currency: buyer.currency,
    estimated_total_minor: lineItems.reduce((sum, item) => sum + item.subtotal_minor, 0),
    total_items: lineItems.length,
    total_quantity: lineItems.reduce((sum, item) => sum + item.quantity, 0),
    request_memo: assertString(request.data?.requestMemo, 'requestMemo', { max: 2000 }),
  }
  const { data: inquiry, error: inquiryError } = await supabase.from('noblesse_inquiries').insert(inquiryPayload).select('*').single()
  if (inquiryError) throwSupabaseError(inquiryError, 'create inquiry')
  const { error: itemError } = await supabase.from('noblesse_inquiry_items').insert(lineItems.map((item) => ({ ...item, inquiry_id: inquiryId })))
  if (itemError) {
    await supabase.from('noblesse_inquiries').delete().eq('inquiry_id', inquiryId)
    throwSupabaseError(itemError, 'create inquiry items')
  }
  const completeInquiry = mapInquiry(inquiry, lineItems)
  await firestore.collection('noblesse_buyer_views').doc(buyer.firebase_uid).collection('inquiries').doc(inquiryId).set(completeInquiry)
  return { inquiry: completeInquiry }
})

export const noblesseGetCatalogFileLink = onCall(callableOptions, async (request) => {
  const supabase = getSupabase()
  const buyer = await getVerifiedApprovedBuyer(supabase, request)
  const fileId = assertIdentifier(request.data?.fileId, 'fileId', contentIdPattern)
  const { data: file, error } = await supabase.from('noblesse_catalog_files').select('*').eq('file_id', fileId).eq('is_visible', true).maybeSingle()
  if (error) throwSupabaseError(error, 'load catalog file')
  if (!file || !file.allowed_markets.includes(buyer.assigned_market)) throw new HttpsError('permission-denied', 'This catalog is unavailable for the assigned market.')
  const [url] = await getStorage().bucket().file(file.storage_path).getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60 * 1000 })
  return { url, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() }
})

export const noblesseAdminList = onCall(callableOptions, async (request) => {
  requireAdmin(request)
  const supabase = getSupabase()
  const [buyers, inquiries, products, prices, categories, collections, banners, catalogFiles] = await Promise.all([
    supabase.from('noblesse_buyers').select('*').order('created_at', { ascending: false }),
    supabase.from('noblesse_inquiries').select('*').order('created_at', { ascending: false }),
    supabase.from('noblesse_products').select('*').order('sort_order'),
    supabase.from('noblesse_product_prices').select('*').order('product_id'),
    supabase.from('noblesse_categories').select('*').order('sort_order'),
    supabase.from('noblesse_collections').select('*').order('sort_order'),
    supabase.from('noblesse_banners').select('*').order('sort_order'),
    supabase.from('noblesse_catalog_files').select('*').order('created_at', { ascending: false }),
  ])
  for (const response of [buyers, inquiries, products, prices, categories, collections, banners, catalogFiles]) {
    if (response.error) throwSupabaseError(response.error, 'load admin data')
  }
  const items = await getInquiryItems(supabase, inquiries.data.map((inquiry) => inquiry.inquiry_id))
  return {
    buyers: buyers.data.map(mapBuyer),
    inquiries: inquiries.data.map((inquiry) => mapInquiry(inquiry, items.filter((item) => item.inquiry_id === inquiry.inquiry_id))),
    products: products.data.map(mapProduct),
    prices: prices.data.map((price) => ({ productId: price.product_id, market: price.market, currency: price.currency, wholesalePrice: amountFromMinor(price.wholesale_price_minor, price.currency), retailPrice: price.retail_price_minor === null ? '' : amountFromMinor(price.retail_price_minor, price.currency), moq: price.moq, minOrderAmount: amountFromMinor(price.min_order_amount_minor, price.currency), isActive: price.is_active })),
    categories: categories.data.map(mapCategory),
    collections: collections.data.map(mapCollection),
    banners: banners.data,
    catalogFiles: catalogFiles.data,
  }
})

export const noblesseAdminUpdateBuyer = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const supabase = getSupabase()
  const buyerUid = assertString(request.data?.buyerUid, 'buyerUid', { required: true, max: 128 })
  const status = assertString(request.data?.status, 'status', { required: true, max: 32 })
  if (!['pending', 'approved', 'blocked'].includes(status)) throw new HttpsError('invalid-argument', 'status is invalid.')
  const market = status === 'approved' ? assertString(request.data?.assignedMarket, 'assignedMarket', { required: true, max: 10 }) : null
  if (market && !marketCurrencies[market]) throw new HttpsError('invalid-argument', 'assignedMarket is invalid.')
  const currency = market ? marketCurrencies[market] : null
  const discountRate = Number(request.data?.discountRate ?? 0)
  if (!Number.isInteger(discountRate) || discountRate < 0 || discountRate > 100) throw new HttpsError('invalid-argument', 'discountRate is invalid.')
  const minOrderAmountMinor = status === 'approved' ? parseMinorAmount(request.data?.minOrderAmount ?? '0', currency, 'minOrderAmount') : 0
  const update = {
    status,
    assigned_market: market,
    currency,
    discount_rate: discountRate,
    min_order_amount_minor: minOrderAmountMinor,
    approved_by: status === 'approved' ? actorUid : null,
    approved_at: status === 'approved' ? new Date().toISOString() : null,
  }
  const { data: buyer, error } = await supabase.from('noblesse_buyers').update(update).eq('firebase_uid', buyerUid).select('*').single()
  if (error) throwSupabaseError(error, 'update buyer')
  await appendAudit(supabase, actorUid, 'buyer.update', 'buyer', buyerUid, { status, market })
  return { buyer: mapBuyer(buyer) }
})

export const noblesseAdminUpdateInquiry = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const supabase = getSupabase()
  const inquiryId = assertIdentifier(request.data?.inquiryId, 'inquiryId', /^INQ-[0-9]{8}-[A-Z0-9]{6}$/)
  const { data: current, error: lookupError } = await supabase.from('noblesse_inquiries').select('*').eq('inquiry_id', inquiryId).single()
  if (lookupError) throwSupabaseError(lookupError, 'load inquiry')
  const status = assertString(request.data?.status, 'status', { required: true, max: 32 })
  if (!inquiryStatuses.has(status)) throw new HttpsError('invalid-argument', 'status is invalid.')
  const update = {
    status,
    admin_memo: assertString(request.data?.adminMemo, 'adminMemo', { max: 2000 }),
  }
  if (status === 'quoted' || status === 'confirmed') {
    update.final_total_minor = parseMinorAmount(request.data?.finalTotal, current.currency, 'finalTotal')
    update.quoted_at = new Date().toISOString()
  }
  const { data: inquiry, error } = await supabase.from('noblesse_inquiries').update(update).eq('inquiry_id', inquiryId).select('*').single()
  if (error) throwSupabaseError(error, 'update inquiry')
  const items = await getInquiryItems(supabase, [inquiryId])
  await firestore.collection('noblesse_buyer_views').doc(inquiry.buyer_uid).collection('inquiries').doc(inquiryId).set(mapInquiry(inquiry, items))
  await appendAudit(supabase, actorUid, 'inquiry.update', 'inquiry', inquiryId, { status })
  return { inquiry: mapInquiry(inquiry, items) }
})

export const noblesseAdminSaveProduct = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const input = request.data?.product ?? {}
  const productId = assertIdentifier(input.productId, 'productId', productIdPattern)
  const product = {
    product_id: productId,
    code: assertString(input.code, 'code', { required: true, max: 80 }),
    category_id: assertIdentifier(input.categoryId, 'categoryId', contentIdPattern),
    collection_ids: assertArray(input.collectionIds ?? [], 'collectionIds', { max: 30, itemMax: 80 }),
    name_ko: assertString(input.nameKo, 'nameKo', { max: 200 }),
    name_en: assertString(input.nameEn, 'nameEn', { required: true, max: 200 }),
    name_ja: assertString(input.nameJa, 'nameJa', { max: 200 }),
    name_zh: assertString(input.nameZh, 'nameZh', { max: 200 }),
    description_ko: assertString(input.descriptionKo, 'descriptionKo', { max: 8000 }),
    description_en: assertString(input.descriptionEn, 'descriptionEn', { max: 8000 }),
    description_ja: assertString(input.descriptionJa, 'descriptionJa', { max: 8000 }),
    description_zh: assertString(input.descriptionZh, 'descriptionZh', { max: 8000 }),
    material: assertString(input.material, 'material', { max: 160 }),
    lead_time: assertString(input.leadTime, 'leadTime', { max: 160 }),
    origin: assertString(input.origin, 'origin', { max: 8 }),
    tone: assertString(input.tone, 'tone', { max: 80 }),
    badge: assertString(input.badge, 'badge', { max: 80 }),
    colors: assertArray(input.colors ?? [], 'colors', { max: 40 }),
    sizes: assertArray(input.sizes ?? [], 'sizes', { max: 40 }),
    image_set: input.imageSet && typeof input.imageSet === 'object' ? input.imageSet : {},
    image_paths: input.imagePaths && typeof input.imagePaths === 'object' ? input.imagePaths : {},
    image_alt: input.imageAlt && typeof input.imageAlt === 'object' ? input.imageAlt : {},
    is_new: Boolean(input.isNew),
    is_best: Boolean(input.isBest),
    is_export_available: input.isExportAvailable !== false,
    is_visible: false,
    sort_order: Number.isInteger(input.sortOrder) ? input.sortOrder : 0,
  }
  const supabase = getSupabase()
  const { data: saved, error } = await supabase.from('noblesse_products').upsert(product, { onConflict: 'product_id' }).select('*').single()
  if (error) throwSupabaseError(error, 'save product')
  await appendAudit(supabase, actorUid, 'product.save', 'product', productId)
  return { product: mapProduct(saved) }
})

export const noblesseAdminUploadProductImage = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const productId = assertIdentifier(request.data?.productId, 'productId', productIdPattern)
  const variant = assertString(request.data?.variant, 'variant', { required: true, max: 16 })
  if (!['thumb', 'card', 'detail', 'zoom'].includes(variant)) {
    throw new HttpsError('invalid-argument', 'variant is invalid.')
  }
  const fileName = assertString(request.data?.fileName, 'fileName', { required: true, max: 180 })
    .replace(/[^a-zA-Z0-9._-]/g, '-')
  const base64 = assertString(request.data?.base64, 'base64', { required: true, max: 14_000_000 })
  let buffer
  try {
    buffer = Buffer.from(base64, 'base64')
  } catch {
    throw new HttpsError('invalid-argument', 'image data is invalid.')
  }
  assertWebpBuffer(buffer)

  const downloadToken = randomUUID()
  const safeFileName = fileName.toLowerCase().endsWith('.webp') ? fileName : `${fileName}.webp`
  const path = `noblesse/products/${productId}/${variant}/${Date.now()}-${safeFileName}`
  const bucket = getStorage().bucket()
  await bucket.file(path).save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=31536000,immutable',
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`
  const supabase = getSupabase()
  await appendAudit(supabase, actorUid, 'product.image.upload', 'product', productId, { variant, path, size: buffer.length })
  return { path, url }
})

export const noblesseAdminPublishProduct = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const productId = assertIdentifier(request.data?.productId, 'productId', productIdPattern)
  const isVisible = request.data?.isVisible === true
  const supabase = getSupabase()
  const { data: current, error: lookupError } = await supabase.from('noblesse_products').select('*').eq('product_id', productId).single()
  if (lookupError) throwSupabaseError(lookupError, 'load product')
  if (isVisible) {
    assertImagePaths(productId, current.image_paths)
    if (!current.colors.length || !current.sizes.length) throw new HttpsError('failed-precondition', 'At least one color and size are required before publishing.')
    const { count, error: priceError } = await supabase.from('noblesse_product_prices').select('*', { count: 'exact', head: true }).eq('product_id', productId).eq('is_active', true)
    if (priceError) throwSupabaseError(priceError, 'verify product prices')
    if (!count) throw new HttpsError('failed-precondition', 'At least one active market price is required before publishing.')
  }
  const { data: product, error } = await supabase.from('noblesse_products').update({ is_visible: isVisible }).eq('product_id', productId).select('*').single()
  if (error) throwSupabaseError(error, 'publish product')
  if (isVisible) await syncCatalogProduct(product)
  else await firestore.collection('noblesse_public_products').doc(productId).delete()
  await appendAudit(supabase, actorUid, 'product.publish', 'product', productId, { isVisible })
  return { product: mapProduct(product) }
})

export const noblesseAdminSavePrice = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const input = request.data?.price ?? {}
  const productId = assertIdentifier(input.productId, 'productId', productIdPattern)
  const market = assertString(input.market, 'market', { required: true, max: 10 })
  if (!marketCurrencies[market]) throw new HttpsError('invalid-argument', 'market is invalid.')
  const currency = marketCurrencies[market]
  const moq = Number(input.moq)
  if (!Number.isSafeInteger(moq) || moq < 1 || moq > 100000) throw new HttpsError('invalid-argument', 'moq is invalid.')
  const price = {
    product_id: productId,
    market,
    currency,
    wholesale_price_minor: parseMinorAmount(input.wholesalePrice, currency, 'wholesalePrice'),
    retail_price_minor: input.retailPrice === '' || input.retailPrice === null || input.retailPrice === undefined ? null : parseMinorAmount(input.retailPrice, currency, 'retailPrice'),
    moq,
    min_order_amount_minor: parseMinorAmount(input.minOrderAmount ?? '0', currency, 'minOrderAmount'),
    is_active: input.isActive !== false,
  }
  const supabase = getSupabase()
  const { data, error } = await supabase.from('noblesse_product_prices').upsert(price, { onConflict: 'product_id,market' }).select('*').single()
  if (error) throwSupabaseError(error, 'save price')
  await appendAudit(supabase, actorUid, 'price.save', 'product_price', `${productId}:${market}`)
  return { price: { ...data, wholesalePrice: amountFromMinor(data.wholesale_price_minor, currency), retailPrice: data.retail_price_minor === null ? '' : amountFromMinor(data.retail_price_minor, currency), minOrderAmount: amountFromMinor(data.min_order_amount_minor, currency) } }
})

export const noblesseAdminSaveContent = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const kind = assertString(request.data?.kind, 'kind', { required: true, max: 32 })
  const input = request.data?.record ?? {}
  const supabase = getSupabase()
  let table
  let conflict
  let entityId
  let payload
  if (kind === 'category') {
    entityId = assertIdentifier(input.categoryId, 'categoryId', contentIdPattern)
    table = 'noblesse_categories'; conflict = 'category_id'
    payload = { category_id: entityId, name_ko: assertString(input.nameKo, 'nameKo', { max: 100 }), name_en: assertString(input.nameEn, 'nameEn', { required: true, max: 100 }), name_ja: assertString(input.nameJa, 'nameJa', { max: 100 }), name_zh: assertString(input.nameZh, 'nameZh', { max: 100 }), cover_url: assertString(input.coverUrl, 'coverUrl', { max: 2000 }), is_visible: input.isVisible !== false, sort_order: Number.isInteger(input.sortOrder) ? input.sortOrder : 0 }
  } else if (kind === 'collection') {
    entityId = assertIdentifier(input.collectionId, 'collectionId', contentIdPattern)
    table = 'noblesse_collections'; conflict = 'collection_id'
    payload = { collection_id: entityId, title_ko: assertString(input.titleKo, 'titleKo', { max: 160 }), title_en: assertString(input.titleEn, 'titleEn', { required: true, max: 160 }), title_ja: assertString(input.titleJa, 'titleJa', { max: 160 }), title_zh: assertString(input.titleZh, 'titleZh', { max: 160 }), cover_url: assertString(input.coverUrl, 'coverUrl', { max: 2000 }), is_visible: input.isVisible !== false, sort_order: Number.isInteger(input.sortOrder) ? input.sortOrder : 0 }
  } else if (kind === 'banner') {
    entityId = assertIdentifier(input.bannerId, 'bannerId', contentIdPattern)
    table = 'noblesse_banners'; conflict = 'banner_id'
    payload = { banner_id: entityId, title_ko: assertString(input.titleKo, 'titleKo', { max: 160 }), title_en: assertString(input.titleEn, 'titleEn', { max: 160 }), title_ja: assertString(input.titleJa, 'titleJa', { max: 160 }), title_zh: assertString(input.titleZh, 'titleZh', { max: 160 }), image_url: assertString(input.imageUrl, 'imageUrl', { required: true, max: 2000 }), link_path: assertString(input.linkPath, 'linkPath', { required: true, max: 500 }), is_visible: input.isVisible !== false, sort_order: Number.isInteger(input.sortOrder) ? input.sortOrder : 0 }
  } else if (kind === 'catalogFile') {
    entityId = assertIdentifier(input.fileId, 'fileId', contentIdPattern)
    table = 'noblesse_catalog_files'; conflict = 'file_id'
    const allowedMarkets = assertArray(input.allowedMarkets, 'allowedMarkets', { max: 5, itemMax: 10 })
    if (!allowedMarkets.length || allowedMarkets.some((market) => !marketCurrencies[market])) throw new HttpsError('invalid-argument', 'allowedMarkets is invalid.')
    payload = { file_id: entityId, title: assertString(input.title, 'title', { required: true, max: 160 }), storage_path: assertString(input.storagePath, 'storagePath', { required: true, max: 500 }), allowed_markets: allowedMarkets, is_visible: input.isVisible !== false }
    if (!payload.storage_path.startsWith('noblesse/catalogs/')) throw new HttpsError('invalid-argument', 'storagePath is invalid.')
  } else {
    throw new HttpsError('invalid-argument', 'kind is invalid.')
  }
  const { data, error } = await supabase.from(table).upsert(payload, { onConflict: conflict }).select('*').single()
  if (error) throwSupabaseError(error, 'save content')
  await syncReferenceData(supabase)
  await appendAudit(supabase, actorUid, 'content.save', kind, entityId)
  return { record: data }
})

export const noblesseAdminRebuildProjection = onCall(callableOptions, async (request) => {
  const actorUid = requireAdmin(request)
  const supabase = getSupabase()
  const { data: products, error } = await supabase.from('noblesse_products').select('*').eq('is_visible', true)
  if (error) throwSupabaseError(error, 'rebuild catalog projection')
  await Promise.all(products.map(syncCatalogProduct))
  await syncReferenceData(supabase)
  await appendAudit(supabase, actorUid, 'projection.rebuild', 'catalog', 'all', { productCount: products.length })
  return { productCount: products.length }
})
