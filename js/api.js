import { supabase } from './supabase.js'

async function getUser(){
  const { data: { user } = await supabase.auth.getUser()
  if(!user) throw new Error('Нет сессии')
  return user
}

export async function createRestaurant(name){
  const user = await getUser()
  const { data: rest, error: e1 } = await supabase
   .from('restaurants')
   .insert({ name, owner_id: user.id })
   .select('id').single()
  if(e1) throw e1

  const { error: e2 } = await supabase
   .from('user_restaurants')
   .insert({ user_id: user.id, restaurant_id: rest.id, role: 'owner' })
  if(e2) throw e2
  return rest
}

export async function getMyRestaurants(){
  const user = await getUser()
  const { data, error } = await supabase
   .from('user_restaurants')
   .select('role,restaurants(id,name,brand_color)')
   .eq('user_id', user.id)
  if(error) throw error
  return data?.map(r=>({...r.restaurants, role:r.role})) || []
}

export async function createInvite(restaurantId, role){
  await getUser()
  const token = crypto.randomUUID()
  const { data, error } = await supabase
   .from('invitations')
   .insert({ restaurant_id: restaurantId, role, token })
   .select('token,role').single()
  if(error) throw error
  return data
}

export async function acceptInvite(token){
  const user = await getUser()
  const { data: inv, error: e1 } = await supabase
   .from('invitations')
   .select('*').eq('token',token).single()
  if(e1 ||!inv) throw new Error('Инвайт не найден')

  const { error: e2 } = await supabase.from('user_restaurants').insert({
    user_id: user.id,
    restaurant_id: inv.restaurant_id,
    role: inv.role
  })
  if(e2 && e2.code!== '23505') throw e2 // 23505 = уже есть, норм

  await supabase.from('invitations').delete().eq('id', inv.id)
  return inv.restaurant_id
    }
