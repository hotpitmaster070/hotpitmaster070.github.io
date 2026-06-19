import {supabase} from './api.js'

let restaurantId = null
let userId = null

async function getContext(){
  const {data:{user}} = await supabase.auth.getUser()
  if(!user) throw new Error('Не авторизован')
  restaurantId = user.user_metadata?.restaurant_id
  userId = user.id
  if(!restaurantId) throw new Error('Нет restaurant_id')
}

export function renderPassportView(){
  const today = new Date().toLocaleDateString('ru-RU')
  return `
  <div class="card" style="max-width:900px;margin:20px auto;padding:20px">
    <h2 style="color:var(--accent);margin-bottom:16px">HotPit Prep-лист - ${today}</h2>
    ...
      <div id="passportList"><p class="sub">Загрузка...</p></div>
      <button id="createPassportBtn" class="primary" style="width:100%;margin-top:12px;padding:14px">Создать паспорт на сегодня</button>
    </div>
  `
}

export async function initPassportActions(){
  await getContext()
  await loadPassport()
  document.getElementById('createPassportBtn').onclick = createTodayPassport
}

async function loadPassport(){
  const today = new Date().toISOString().split('T')[0]
  const {data,error} = await supabase.from('tasks')
.select('*')
.eq('restaurant_id', restaurantId)
.eq('shift_date', today)
.order('deadline', {ascending:true})

  if(error){
    document.getElementById('passportList').innerHTML = `<p style="color:#fca5a5">Ошибка: ${error.message}</p>`;
    return
  }

  const list = document.getElementById('passportList')
  if(!data || data.length===0){
    list.innerHTML = '<p class="sub">Паспорт пуст. Нажми "Создать паспорт" - добавлю шаблон заготовок.</p>'
    return
  }

  list.innerHTML = data.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0;padding:14px;background:${t.status==='done'?'#14532d':'#27272a'};border-radius:12px;border:1px solid rgba(255,255,255,0.05)">
      <div>
        <b>${t.title}</b>
        ${t.target_qty? `<span class="sub" style="margin-left:8px">${t.target_qty}${t.unit||''}</span>` : ''}
        ${t.deadline? `<span class="sub" style="margin-left:8px">до ${t.deadline.slice(0,5)}</span>` : ''}
      </div>
      ${t.status==='done'
    ? `<span style="color:#86efac;font-weight:600">✓ ${t.actual_qty||0}${t.unit||''}</span>`
        : `<button class="primary weigh-btn" data-id="${t.id}" data-unit="${t.unit||''}">Взвесить</button>`
      }
    </div>
  `).join('')

  document.querySelectorAll('.weigh-btn').forEach(btn=>{
    btn.onclick = async (e)=>{
      const id = e.target.dataset.id
      const unit = e.target.dataset.unit
      const qty = prompt(`Введи фактический вес в ${unit}:`)
      if(!qty || isNaN(qty)) return
      await supabase.from('tasks').update({
        status: 'done',
        actual_qty: parseFloat(qty),
        staff_id: userId
      }).eq('id', id)
      loadPassport()
    }
  })
}

async function createTodayPassport(){
  const today = new Date().toISOString().split('T')[0]
  const template = [
    {restaurant_id, title: 'Бульон куриный', target_qty: 15, unit: 'л', deadline: '11:00', status: 'todo', shift_date: today},
    {restaurant_id, title: 'Лук репчатый', target_qty: 5, unit: 'кг', deadline: '10:00', status: 'todo', shift_date: today},
    {restaurant_id, title: 'Лук жареный', target_qty: 3, unit: 'кг', deadline: '12:00', status: 'todo', shift_date: today},
  ]
  const {error} = await supabase.from('tasks').insert(template)
  if(error){ alert('Ошибка: '+error.message); return }
  loadPassport()
}
