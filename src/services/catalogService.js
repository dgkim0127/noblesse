import { mockProductPrices, mockProducts } from '../data/catalog'
import { getSupabase } from '../lib/supabase'

const mapProduct = (product) => ({
  ...product,
  productId: product.product_id ?? product.productId,
  imageSet: product.image_set ?? product.imageSet ?? {},
  nameEn: product.name_en ?? product.nameEn,
  nameKo: product.name_ko ?? product.nameKo,
  nameJa: product.name_ja ?? product.nameJa,
  nameZh: product.name_zh ?? product.nameZh,
  moqDefault: product.moq_default ?? product.moqDefault,
  leadTime: product.lead_time ?? product.leadTime,
  isVisible: product.is_visible ?? product.isVisible,
})

export async function loadCatalog() {
  const supabase = await getSupabase()
  if (!supabase) return mockProducts
  const { data, error } = await supabase.from('products').select('*').eq('is_visible', true).order('sort_order')
  if (error) throw error
  return data.map(mapProduct)
}

export async function loadMarketPrices(market) {
  const supabase = await getSupabase()
  if (!supabase || !market) return mockProductPrices.filter((price) => price.market === market)
  const { data, error } = await supabase.from('product_prices').select('*').eq('market', market).eq('is_active', true)
  if (error) throw error
  return data.map((price) => ({
    productId: price.product_id,
    market: price.market,
    currency: price.currency,
    wholesalePrice: Number(price.wholesale_price),
    retailPrice: Number(price.retail_price ?? 0),
    moq: Number(price.moq),
    minOrderAmount: Number(price.min_order_amount ?? 0),
    visibleTo: price.visible_to,
    isActive: price.is_active,
  }))
}
