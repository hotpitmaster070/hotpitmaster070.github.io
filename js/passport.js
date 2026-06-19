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
        <button id="createPrepBtn" class="primary" style="flex:1;padding:14px;border-radius:12px">Создать Prep-лист</button>
        <button id="editTemplatesBtn" style="flex:1;padding:14px;background:#3f3f46;border:1px solid #52525b;border-radius:12px;color:#fff;cursor:pointer">Мои заготовки</button>
      </div>
      <div id="prepList"><p class="sub">Загрузка...</p></div>
    </div>

    <!-- Модал шаблонов -->
    <div id="templatesModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:50;align-items:center;justify-content:center">
      <div style="background:#18181b;border:1px solid #2a2a2a;border-radius:20px;padding:24px;width:95%;max-width:640px;max-height:85vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="color:var(--accent);margin:0;font-size:20px">Мои заготовки</h3>
          <button id="closeTemplatesBtn" style="background:transparent;border:0;font-size:28px;color:#888;cursor:pointer;line-height:1">×</button>
        </div>
        
        <div id="templatesList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px"></div>
        
        <h4 style="margin:0 0 12px;color:#d4d4d8;font-size:15px;font-weight:600">Добавить позицию</h4>
        <!-- Адаптивная форма: на десктопе 4 колонки, на мобиле стопкой -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
          <input id="tplTitle" placeholder="Название заготовки" style="padding:12px;border-radius:10px;border:1px solid #333;background:#0f0f0f;color:#fff;font-size:16px">
          <input id="tplQty" type="number" step="0.1" placeholder="Кол-во" style="padding:12px;border-radius:10px;border:1px solid #333;background:#0f0f0f;color:#fff;font-size:16px">
          <input id="tplUnit" placeholder="кг / л / шт" style="padding:12px;border-radius:10px;border:1px solid #333;background:#0f0f0f;color:#fff;font-size:16px">
          <input id="tplDeadline" type="time" style="padding:12px;border-radius:10px;border:1px solid #333;background:#0f0f0f;color:#fff;font-size:16px">
        </div>
        <button id="addTemplateBtn" class="primary" style="width:100%;margin-top:12px;padding:14px;border-radius:12px;font-weight:600">+ Добавить</button>
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
  
  // закрытие модала по клику на фон
  document.getElementById('templatesModal').onclick = (e)=>{
    if(e.target.id === 'templatesModal') closeTemplatesModal()
  }
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0;padding:16px;background:${t.status==='done'?'#14532d':'#27272a'};border-radius:14px;border:1px solid rgba(255,255,255,0.06);transition:.2s">
      <div>
        <b style="font-size:15px">${t.title}</b>
        ${t.target_qty? `<span class="sub" style="margin-left:8px">${t.target_qty}${t.unit||''}</span>` : ''}
        ${t.deadline? `<span class="sub" style="margin-left:8px">до ${t.deadline.slice(0,5)}</span>` : ''}
      </div>
      ${t.status==='done'
      ? `<span style="color:#86efac;font-weight:600">✓ ${t.actual_qty||0}${t.unit||''}</span>`
        : `<button class="primary weigh-btn" data-id="${t.id}" data-unit="${t.unit||''}" style="padding:8px 14px;border-radius:8px">Взвесить</button>`
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
    list.innerHTML = '<p class="sub" style="text-align:center;padding:20px">Заготовок пока нет. Добавь первую ниже 👇</p>'
    return
  }

  // Карточки вместо строки
  list.innerHTML = data.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#27272a;border-radius:14px;border:1px solid #3f3f46;transition:.15s;cursor:default" 
         onmouseover="this.style.background='#3f3f46'" 
         onmouseout="this.style.background='#27272a'">
      <div style="flex:1">
        <div style="font-weight:600;font-size:15px;margin-bottom:4px">${t.title}</div>
        <div style="font-size:13px;color:#a1a1aa">${t.target_qty}${t.unit||''} • дедлайн ${t.deadline||'--:--'}</div>
      </div>
      <button onclick="deleteTemplate('${t.id}')" 
              title="Удалить"
              style="background:transparent;border:0;padding:8px;border-radius:8px;color:#f87171;cursor:pointer;font-size:18px;transition:.2s"
              onmouseover="this.style.background='#7f1d1d'" 
              onmouseout="this.style.background='transparent'">🗑️</button>
    </div>
  `).join('')
}

window.deleteTemplate = async function(id){
  if(!confirm('Удалить заготовку?')) return
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

  document.getElementById('tplTitle').value = ''
  document.getElementById('tplQty').value = ''
  document.getElementById('tplUnit').value = ''
  document.getElementById('tplDeadline').value = ''

  loadTemplatesList()
                                      }
