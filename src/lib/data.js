import { supabase } from './supabase'
import { processPhoto } from './image'
import { DEFAULT_FIT_NOTES } from './constants'

export async function listGarments() {
  const { data, error } = await supabase
    .from('garments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getGarment(id) {
  const { data, error } = await supabase.from('garments').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function saveGarment(fields, id) {
  const q = id
    ? supabase.from('garments').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
    : supabase.from('garments').insert(fields)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteGarment(garment) {
  if (garment.photo_url) await removePhoto(garment.photo_url)
  const { error } = await supabase.from('garments').delete().eq('id', garment.id)
  if (error) throw error
}

export async function markWorn(garment) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('garments')
    .update({ times_worn: (garment.times_worn || 0) + 1, last_worn: today })
    .eq('id', garment.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadPhoto(userId, file) {
  const blob = await processPhoto(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('garments').upload(path, blob, {
    contentType: 'image/jpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from('garments').getPublicUrl(path)
  return data.publicUrl
}

async function removePhoto(publicUrl) {
  const marker = '/garments/'
  const i = publicUrl.lastIndexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length))
  await supabase.storage.from('garments').remove([path])
}

export async function listOutfits() {
  const { data, error } = await supabase
    .from('outfits')
    .select('*, outfit_items(id, slot, position, garment:garments(*))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveOutfit({ name, occasion, location, notes, items }) {
  const { data: outfit, error } = await supabase
    .from('outfits')
    .insert({ name, occasion, location, notes })
    .select()
    .single()
  if (error) throw error
  const rows = items.map((it, i) => ({
    outfit_id: outfit.id,
    garment_id: it.g.id,
    slot: it.slot,
    position: i,
  }))
  const { error: e2 } = await supabase.from('outfit_items').insert(rows)
  if (e2) throw e2
  return outfit
}

export async function deleteOutfit(id) {
  const { error } = await supabase.from('outfits').delete().eq('id', id)
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (data) return data
  const fresh = { user_id: userId, fit_notes: DEFAULT_FIT_NOTES, sizes: {} }
  const { data: created, error: e2 } = await supabase
    .from('profiles')
    .upsert(fresh, { onConflict: 'user_id' })
    .select()
    .single()
  if (e2) throw e2
  return created
}

export async function saveProfile(userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listWishlist() {
  const { data, error } = await supabase
    .from('wishlist')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addWishlistItem(fields) {
  const { data, error } = await supabase.from('wishlist').insert(fields).select().single()
  if (error) throw error
  return data
}

export async function updateWishlistItem(id, fields) {
  const { data, error } = await supabase.from('wishlist').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteWishlistItem(id) {
  const { error } = await supabase.from('wishlist').delete().eq('id', id)
  if (error) throw error
}

export async function askStylist({ question, wardrobe, weather, profile, history }) {
  const { data, error } = await supabase.functions.invoke('stylist', {
    body: { question, wardrobe, weather, profile, history },
  })
  if (error) throw error
  return data
}
