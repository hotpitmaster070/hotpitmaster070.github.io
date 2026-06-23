import { supabase } from './supabase.js'

export async function addChef(email,pass,name,restaurantId){
  const {data,error} = await supabase.auth.signUp({
    email,password:pass,
    options:{data:{role:'chef',full_name:name}}
  })
  if(error) return alert(error.message)
  // шеф создаётся без restaurant_id, триггер у нас только для owner
  await supabase.from('profiles').update({restaurant_id:restaurantId}).eq('id',data.user.id)
  alert('Шеф создан')
  location.reload()
}

export async function addCook(name,restaurantId){
  const {error} = await supabase.from('cooks').insert({restaurant_id:restaurantId,full_name:name})
  if(error) return alert(error.message)
  location.reload()
}

export function showCookQR(token,name){
  const url = `${location.origin}/r/${token}`
  qrName.textContent=name; qrLink.textContent=url
  QRCode.toCanvas(qrCanvas,url,{width:240})
  qrModal.style.display='flex'
}

export async function copyCookLink(token){
  await navigator.clipboard.writeText(`${location.origin}/r/${token}`)
  alert('Ссылка скопирована')
}

export async function deleteCook(id){
  if(confirm('Удалить повара?')) await supabase.from('cooks').delete().eq('id',id)
  location.reload()
}
