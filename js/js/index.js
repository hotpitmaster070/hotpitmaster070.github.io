import { supabase } from './supabase.js'

const btn = document.getElementById('startBtn')
const msg = document.getElementById('msg')

btn.onclick = async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  msg.textContent = ''

  if(!email || !password){
    msg.textContent = 'Введи email и пароль'
    return
  }

  btn.disabled = true
  btn.textContent = 'Загрузка...'

  try{
    // 1. Пробуем зарегить. Если юзер уже есть - Supabase вернёт ошибку, тогда делаем signIn
    let { error } = await supabase.auth.signUp({ email, password })
    
    if(error && error.message.includes('already registered')){
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      if(e2) throw e2
    } else if(error){
      throw error
    }

    // 2. Всегда в kitchen. Там kitchen.js сам решит: показать "Назови ресторан" или сразу кабинет
    location.href = '/kitchen.html'
  }catch(err){
    msg.textContent = err.message
    btn.disabled = false
    btn.textContent = 'Начать'
  }
  }
