import { getSupabase, profileFromRow } from '../lib/supabase'

export async function getCurrentBuyer() {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('buyer_profiles').select('*').eq('id', user.id).single()
  if (error) throw error
  return profileFromRow({ ...data, email: user.email })
}

export async function signInBuyer(email, password) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return getCurrentBuyer()
}

export async function signOutBuyer() {
  const supabase = await getSupabase()
  if (supabase) await supabase.auth.signOut()
}

export async function registerBuyer(input) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { email, password, ...profile } = input
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: profile } })
  if (error) throw error
  if (!data.user) return null
  if (!data.session) return profileFromRow({ id: data.user.id, email, ...profile, status: 'pending', role: 'buyer', assigned_market: 'GLOBAL', currency: 'USD' })
  return getCurrentBuyer()
}
