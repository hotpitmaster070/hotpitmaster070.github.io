import { supabase } from './supabase.js'

function assertAuth(){
  const { data: { user } = await supabase.auth.getUser()
  if(!user) throw new Error('Нет сессии')
  return user
}

export async function createRestaurant(name){
  const user = await assertAuth()
  
  // 1. Создаём ресторан. owner_id берём из auth, не из аргумента
  const { data: rest, error: e1 } = await supabase
    .from('restaurants')
    .insert({ name, owner_id: user.id })
    .select('id')
    .single()
  if(e1) throw e1

  // 2. Сразу записываем тебя как owner
  const { error: e2 } = await supabase
    .from('user_restaurants')
    .insert({ user_id: user.id, restaurant_id: rest.id, role: 'owner' })
  if(e2) throw e2

  return rest
}

export async function getMyRestaurants(){
  const user = await assertAuth()
  const { data, error } = await supabase
    .from('user_restaurants')
    .select('role,restaurants(id,name,brand_color)')
    .eq('user_id', user.id)
  if(error) throw error
  return data?.map(r=>r.restaurants) || []
}

export async function createInvite(restaurantId, role){
  await assertAuth()
  const { data, error } = await supabase
    .from('invitations')
    .insert({ restaurant_id: restaurantId, role })
    .select('token,role')
    .single()
  if(error) throw error
  return data
}

export async function acceptInvite(token, userId){
  const user = await assertAuth()
  const { data: inv, error: e1 } = await supabase
    .from('invitations')
    .select('*')
    .eq('token',token)
    .single()
  if(e1 || !inv) throw new Error('Инвайт не найден')

  await supabase.from('user_restaurants').insert({ 
    user_id: user.id, 
    restaurant_id: inv.restaurant_id, 
    role: inv.role 
  })
  await supabase.from('invitations').delete().eq('id', inv.id)
  return inv.restaurant_id
}
