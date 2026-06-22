import { supabase } from './supabase.js'

export async function createRestaurant(name, ownerId){
  const { data: rest, error: e1 } = await supabase.from('restaurants').insert({ name, owner_id: ownerId }).select('id').single()
  if(e1) throw e1
  await supabase.from('user_restaurants').insert({ user_id: ownerId, restaurant_id: rest.id, role: 'owner' })
  return rest
}
export async function getMembership(userId, restaurantId){
  const { data } = await supabase.from('user_restaurants').select('role,restaurants(id,name,brand_color)').eq('user_id',userId).eq('restaurant_id',restaurantId).single()
  return data
}
export async function createInvite(restaurantId, role){
  const { data } = await supabase.from('invitations').insert({ restaurant_id: restaurantId, role }).select('token,role').single()
  return data
}
export async function acceptInvite(token, userId){
  const { data: inv } = await supabase.from('invitations').select('*').eq('token',token).single()
  if(!inv) throw new Error('Инвайт не найден')
  await supabase.from('user_restaurants').insert({ user_id: userId, restaurant_id: inv.restaurant_id, role: inv.role })
  await supabase.from('invitations').delete().eq('id', inv.id)
  return inv.restaurant_id
                                                  }
