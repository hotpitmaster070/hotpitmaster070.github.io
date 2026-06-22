import { supabase } from './supabase.js'

export async function createRestaurant(name, ownerId){
  // 1. Создаём ресторан
  const { data: rest, error: e1 } = await supabase
    .from('restaurants')
    .insert({ name, owner_id: ownerId })
    .select('id')
    .single()
  if(e1) throw e1

  // 2. Сразу записываем тебя как owner. Без этого кухня будет выкидывать
  const { error: e2 } = await supabase
    .from('user_restaurants')
    .insert({ user_id: ownerId, restaurant_id: rest.id, role: 'owner' })
  if(e2) throw e2

  return rest
}

export async function getMembership(userId, restaurantId){
  const { data, error } = await supabase
    .from('user_restaurants')
    .select('role,restaurants(id,name,brand_color)')
    .eq('user_id',userId)
    .eq('restaurant_id',restaurantId)
    .single()
  if(error) return null
  return data
}

export async function createInvite(restaurantId, role){
  const { data, error } = await supabase
    .from('invitations')
    .insert({ restaurant_id: restaurantId, role })
    .select('token,role')
    .single()
  if(error) throw error
  return data
}

export async function acceptInvite(token, userId){
  const { data: inv, error: e1 } = await supabase
    .from('invitations')
    .select('*')
    .eq('token',token)
    .single()
  if(e1 || !inv) throw new Error('Инвайт не найден')

  await supabase.from('user_restaurants').insert({ 
    user_id: userId, 
    restaurant_id: inv.restaurant_id, 
    role: inv.role 
  })
  await supabase.from('invitations').delete().eq('id', inv.id)
  return inv.restaurant_id
    }
