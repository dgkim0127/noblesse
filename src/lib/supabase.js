const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
let clientPromise

export async function getSupabase() {
  if (!isSupabaseConfigured) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => (
      createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
    ))
  }
  return clientPromise
}

export const profileFromRow = (profile) => profile ? ({
  uid: profile.id,
  email: profile.email ?? '',
  companyName: profile.company_name ?? '',
  contactName: profile.contact_name ?? '',
  country: profile.country ?? '',
  preferredLanguage: profile.preferred_language ?? 'en',
  phone: profile.phone ?? '',
  role: profile.role ?? 'buyer',
  status: profile.status ?? 'pending',
  assignedMarket: profile.assigned_market ?? 'GLOBAL',
  currency: profile.currency ?? 'USD',
  discountRate: Number(profile.discount_rate ?? 0),
  minOrderAmount: Number(profile.min_order_amount ?? 0),
}) : null
