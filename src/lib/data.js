import { supabase } from './supabase'
import { photoToBase64, processPhoto } from './image'
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
  const urls = [garment.photo_url, ...(garment.photos || [])].filter(Boolean)
  const { error } = await supabase.from('garments').delete().eq('id', garment.id)
  if (error) throw error
  // Database state is authoritative. Remove the row first so a failed delete
  // (for example, because a saved outfit still references it) never destroys
  // photos that the catalog still needs.
  await removePhotos(urls).catch((photoError) => {
    console.warn('Garment deleted, but its stored photos could not be removed.', photoError)
  })
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

export async function removePhotos(publicUrls) {
  const paths = publicUrls
    .map((url) => {
      const marker = '/garments/'
      const i = url.lastIndexOf(marker)
      return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length))
    })
    .filter(Boolean)
  if (paths.length) {
    const { error } = await supabase.storage.from('garments').remove(paths)
    if (error) throw error
  }
}

export async function reconcileFailedGarmentSave(garmentId, uploadedUrls) {
  if (!garmentId || uploadedUrls.length === 0) return null

  const { data, error } = await supabase
    .from('garments')
    .select('id, photo_url, photos')
    .eq('id', garmentId)
    .maybeSingle()

  // A failed verification is still ambiguous. Preserve the uploads instead of
  // risking a catalog row that points at deleted objects.
  if (error) return null

  const referenced = new Set([data?.photo_url, ...(data?.photos || [])].filter(Boolean))
  const unreferenced = uploadedUrls.filter((url) => !referenced.has(url))
  if (unreferenced.length) await removePhotos(unreferenced)

  return data && uploadedUrls.every((url) => referenced.has(url)) ? data : null
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
  if (e2) {
    const { data: savedItems, error: verificationError } = await supabase
      .from('outfit_items')
      .select('garment_id, slot, position')
      .eq('outfit_id', outfit.id)

    const insertCommitted = !verificationError && savedItems?.length === rows.length && rows.every(
      (row) => savedItems.some((saved) => (
        saved.garment_id === row.garment_id && saved.slot === row.slot && saved.position === row.position
      )),
    )
    if (insertCommitted) return outfit

    // Only delete the header after a successful read proves that no item rows
    // committed. A failed verification is ambiguous, so preserve recoverable data.
    if (!verificationError && savedItems?.length === 0) {
      const { error: cleanupError } = await supabase.from('outfits').delete().eq('id', outfit.id)
      if (cleanupError) {
        throw new Error(`${e2.message || 'Could not save outfit'}; cleanup also failed: ${cleanupError.message}`)
      }
    }
    throw e2
  }
  return outfit
}

export async function deleteOutfit(id) {
  const { error } = await supabase.from('outfits').delete().eq('id', id)
  if (error) throw error
}

export async function getProfile(userId, { createIfMissing = true } = {}) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (data) return data
  if (!createIfMissing) {
    return { user_id: userId, fit_notes: DEFAULT_FIT_NOTES, sizes: {} }
  }
  // No profile visible — confirm the session is still valid server-side
  // before writing anything; a dead token gets cleared instead.
  const { error: userErr } = await supabase.auth.getUser()
  if (userErr) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    throw new Error('Your sign-in was out of date — please sign in again.')
  }
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

export async function askStylist({ question, wardrobe, outfits, wishlist, weather, profile, history }) {
  const { data, error } = await supabase.functions.invoke('stylist', {
    body: { question, wardrobe, outfits, wishlist, weather, profile, history },
  })
  if (error) throw error
  return data
}

// Accepts one file/blob or an array (e.g. garment shot + label close-up);
// up to three photos of the same garment are sent for one analysis.
export async function analyzePhoto(files) {
  const list = (Array.isArray(files) ? files : [files]).slice(0, 3)
  const images = []
  for (const f of list) images.push(await photoToBase64(f))
  const { data, error } = await supabase.functions.invoke('analyze-garment', {
    body: { images },
  })
  if (error) throw error
  return data
}

// ——— AI key management (stored in the user's private_settings row) ———

export async function aiKeyIsSet(userId) {
  const { data, error } = await supabase
    .from('private_settings')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function saveAiKey(userId, key) {
  const { error } = await supabase
    .from('private_settings')
    .upsert({ user_id: userId, anthropic_api_key: key, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function clearAiKey(userId) {
  const { error } = await supabase.from('private_settings').delete().eq('user_id', userId)
  if (error) throw error
}
