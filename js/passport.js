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
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button id="createPrepBtn" class="primary" style="flex:1;padding:14px">Создать Prep-лист</button>
        <button id="editTemplatesBtn" style="flex:1;padding:14px;background:#3f3f46;border:1px solid #52525b;border-radius:12px;color:#fff;cursor:pointer">Мои заготовки</button>
      </div>
      <div id="prepList"><p class="sub">Загрузка...</p></div>
    </div>

    <!-- Модал шаблонов -->
    <div id="templatesModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;align-items:center;justify-content:center">
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:20px;width:90%;max-width:600px;max-height:80vh;overflow:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="color:var(--accent);margin:0">Мои заготовки</h3>
          <button id="closeTemplatesBtn" style="background:transparent;border:0;font-size:24px;color:#aaa;cursor:pointer">×</button>
        </div>
        <div id="templatesList" style="margin-bottom:16px"></div>
        <h4 style="margin:16px 0 8px;color:#ddd">Добавить позицию</h4>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px">
          <input id="tplTitle" placeholder="Название" style="padding:10px;border-radius:8px;border:1px solid #333;background:#0f0f0f;color:#fff">
          <input id="tplQty" type="number" step="0.1" placeholder="Кол-во" style="padding:10px;border-radius:8px;border:1px solid #333;background:#0f0f0f;color:#fff">
          <input id="tplUnit" placeholder="кг/л/шт" style="padding:10px;border-radius:8px;border:1px solid #333;background:#0f0f0f;color:#fff">
          <input id="tplDeadline" type="time" style="padding:10px;border-radius:8px;border:1px solid #333;background:#0f0f0f;color:#fff">
        </div>
        <button id="addTemplateBtn" class="primary" style="width:100%;margin-top:8px;padding:12px;border-radius:12px">+ Добавить</button>
      </div>
    </div>
  `
}

export async function initPassportActions(){
  await getContext()
  await loadPrepList()
  
  document.getElementById('createPrepBtn').onclick = createTodayPrep
  document.getElementById('editTemplatesBtn').onclick = openTemplatesModal
  document.getElementById('closeTemplatesBtn').onclick = closeTemplatesModal
  document.getElementById('addTemplateBtn').onclick = addTemplate
}

async function loadPrepList(){
  const today = new Date().toISOString().split('T')[0]
  const {data,error} = await supabase.from('tasks')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('shift_date', today)
    .order('deadline', {ascending:true})

  if(error){
    document.getElementById('prepList').innerHTML = `<p style="color:#fca5a5">Ошибка: ${error.message}</p>`;
    return
  }

  const list = document.getElementById('prepList')
  if(!data || data.length===0){
    list.innerHTML = '<p class="sub">Prep-лист пуст. Нажми "Создать Prep-лист" - добавлю позиции из "Моих заготовок".</p>'
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
      loadPrepList()
    }
  })
}

async function createTodayPrep(){
  const today = new Date().toISOString().split('T')[0]

  // тянем шаблон из БД вместо хардкода
  const {data:templates, error:tplErr} = await supabase
    .from('prep_templates')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', {ascending:true})

  if(tplErr){ alert('Ошибка шаблонов: '+tplErr.message); return }

  if(!templates || templates.length===0){
    alert('Мои заготовки пусты. Сначала добавь позиции через "Мои заготовки"')
    return
  }

  // клонируем шаблон на сегодня
  const tasks = templates.map(t => ({
    restaurant_id,
    title: t.title,
    target_qty: t.target_qty,
    unit: t.unit,
    deadline: t.deadline,
    status: 'todo',
    shift_date: today
  }))

  const {error} = await supabase.from('tasks').insert(tasks)
  if(error){ alert('Ошибка: '+error.message); return }
  loadPrepList()
}

// ===== CRUD для шаблонов =====
async function openTemplatesModal(){
  document.getElementById('templatesModal').style.display = 'flex'
  await loadTemplatesList()
}

function closeTemplatesModal(){
  document.getElementById('templatesModal').style.display = 'none'
}

async function loadTemplatesList(){
  const {data, error} = await supabase
    .from('prep_templates')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', {ascending:true})

  if(error){ alert(error.message); return }

  const list = document.getElementById('templatesList')
  if(!data || data.length===0){
    list.innerHTML = '<p class="sub">Заготовок пока нет. Добавь первую ниже.</p>'
    return
  }

  list.innerHTML = data.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;margin:6px 0;background:#27272a;border-radius:10px">
      <div>
        <b>${t.title}</b> 
        <span class="sub" style="margin-left:8px;color:#aaa">${t.target_qty}${t.unit||''} до ${t.deadline||'--:--'}</span>
      </div>
      <button onclick="deleteTemplate('${t.id}')" style="background:#7f1d1d;border:0;padding:6px 10px;border-radius:6px;color:#fff;cursor:pointer">Удалить</button>
    </div>
  `).join('')
}

// глобальная чтобы onclick работал
window.deleteTemplate = async function(id){
  await supabase.from('prep_templates').delete().eq('id', id)
  loadTemplatesList()
}

async function addTemplate(){
  const title = document.getElementById('tplTitle').value.trim()
  const qty = parseFloat(document.getElementById('tplQty').value)
  const unit = document.getElementById('tplUnit').value.trim()
  const deadline = document.getElementById('tplDeadline').value

  if(!title || !qty){ alert('Заполни название и кол-во'); return }

  const {error} = await supabase.from('prep_templates').insert({
    restaurant_id, title, target_qty: qty, unit, deadline
  })
  if(error){ alert(error.message); return }

  // очистка формы
  document.getElementById('tplTitle').value = ''
  document.getElementById('tplQty').value = ''
  document.getElementById('tplUnit').value = ''
  document.getElementById('tplDeadline').value = ''

  loadTemplatesList()
    }
