import { getSupabase } from '../lib/supabase'

const imageSlots = ['thumb', 'card', 'detail', 'zoom']

const safeFileName = (name) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')

export async function loadAdminCatalog() {
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.from('products').select('*').order('sort_order').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function uploadProductImages(productId, images) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase must be configured before uploading product images.')

  const uploaded = {}
  for (const slot of imageSlots) {
    const file = images[slot]
    if (!file) continue
    const filePath = `${productId}/${slot}-${Date.now()}-${safeFileName(file.name)}`
    const { error } = await supabase.storage.from('product-images').upload(filePath, file, { cacheControl: '31536000', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
    uploaded[slot] = data.publicUrl
  }
  return uploaded
}

export async function saveCatalogProduct(input) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase must be configured before saving products.')
  const { product, prices } = input
  const { error: productError } = await supabase.from('products').upsert(product, { onConflict: 'product_id' })
  if (productError) throw productError

  const activePrices = prices.filter((price) => price.market && price.currency && Number.isFinite(price.wholesale_price) && price.moq > 0)
  if (!activePrices.length) return
  const { error: priceError } = await supabase.from('product_prices').upsert(activePrices, { onConflict: 'product_id,market' })
  if (priceError) throw priceError
}

export async function loadProductPrices(productId) {
  const supabase = await getSupabase()
  if (!supabase || !productId) return []
  const { data, error } = await supabase.from('product_prices').select('*').eq('product_id', productId).order('market')
  if (error) throw error
  return data ?? []
}
