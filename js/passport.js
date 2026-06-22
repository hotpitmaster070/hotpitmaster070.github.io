import {supabase} from './api.js'

let restaurantId = null

// HTML разметка prep-листа
export function renderPassportView(rid){
  restaurantId = rid
  return `
    <div class="card" style="padding:24px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="color:var(--accent);margin:0">0. Prep-лист</h2>
        <div style="display:flex;gap:8px">
          <button id="editTemplatesBtn" style="padding:8px 12px;background:#3f3f46;border:1px solid #52525b;border-radius:8px;color:#fff;font-size:14px">Шаблоны</button>
          <button id="createPrepBtn" class="primary" style="padding:8px 16px">Создать на сегодня</button>
        </div>
      </div>
      <p style="color:#71717a;font-size:14px;margin-bottom:16px">Задания на смену ${new Date().toLocaleDateString('ru-RU')}</p>
      <div id="prepList" style="display:flex;flex-direction:column;gap:8px">
        <div style="color:#71717a;text-align:center;padding:40px">Загрузка...</div>
      </div>
    </div>

    <!-- Модалка шаблонов -->
    <div id="templatesModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;z-index:1000">
      <div class="modal" style="background:#171717;padding:24px;border-radius:16px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto">
        <h3 style="color:#f97316;margin-bottom:16px">Шаблоны prep-заданий</h3>
        <div id="templatesList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px"></div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <input id="newTemplateTitle" placeholder="Название" style="flex:1;padding:12px;background:#262626;border:1px solid #333;border-radius:8px;color:#fff">
          <input id="newTemplateQty" type="number" placeholder="Кол-во" style="width:100px;padding:12px;background:#262626;border:1px solid #333;border-radius:8px;color:#fff">
          <input id="newTemplateUnit" placeholder="кг/шт" style="width:80px;padding:12px;background:#262626;border:1px solid #333;border-radius:8px;color:#fff">
        </div>
        <div style="display:flex;gap:8px">
          <button id="addTemplateBtn" class="primary" style="flex:1;padding:12px">Добавить</button>
          <button id="closeTemplatesBtn" style="padding:12px;background:#3f3f46;border:1px solid #52525b;border-radius:8px;color:#fff">Закрыть</button>
        </div>
      </div>
    </div>
  `
}

// Инициализация действий
export async function initPassportActions(rid){
  restaurantId = rid
  await loadPrepList()

  document.getElementById('createPrepBtn')?.addEventListener('click', createTodayPrep)
  document.getElementById('editTemplatesBtn')?.addEventListener('click', openTemplatesModal)
  document.getElementById('closeTemplatesBtn')?.addEventListener('click', closeTemplatesModal)
  document.getElementById('addTemplateBtn')?.addEventListener('click', addTemplate)
}

// Загрузка заданий на сегодня
async function loadPrepList(){
  const listEl = document.getElementById('prepList')
  if(!restaurantId) return

  const today = new Date().toISOString().split('T')[0]

  const {data:tasks, error} = await supabase
   .from('tasks')
   .select('*')
   .eq('restaurant_id', restaurantId)
   .eq('shift_date', today)
   .order('deadline', {ascending:true})

  if(error){
    listEl.innerHTML = `<div style="color:#fca5a5;text-align:center;padding:20px">Ошибка: ${error.message}</div>`
    return
  }

  if(!tasks || tasks.length===0){
    listEl.innerHTML = `<div style="color:#71717a;text-align:center;padding:40px">Нет заданий на сегодня. Нажми "Создать на сегодня"</div>`
    return
  }

  listEl.innerHTML = tasks.map(t=>`
    <div class="task-item" style="background:#262626;padding:16px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;border:1px solid #333">
      <div>
        <div style="font-weight:600;margin-bottom:4px">${t.title}</div>
        <div style="font-size:14px;color:#a1a1aa">Цель: ${t.target_qty} ${t.unit} ${t.deadline? 'до ' + t.deadline : ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" value="${t.actual_qty || ''}" placeholder="Факт"
          style="width:80px;padding:8px;background:#171717;border:1px solid #333;border-radius:6px;color:#fff;text-align:center"
          onchange="updateActual('${t.id}', this.value)">
        <span style="font-size:12px;color:${t.status==='done'?'#86efac':'#fbbf24'}">${t.status==='done'?'✓':'⏳'}</span>
      </div>
    </div>
  `).join('')
}

// Создать задания из шаблонов
async function createTodayPrep(){
  if(!restaurantId) return alert('Ресторан не определён')

  const btn = document.getElementById('createPrepBtn')
  btn.disabled = true
  btn.textContent = 'Создаю...'

  const {data:templates} = await supabase
   .from('prep_templates')
   .select('*')
   .eq('restaurant_id', restaurantId)

  if(!templates || templates.length===0){
    alert('Сначала добавь шаблоны через "Шаблоны"')
    btn.disabled = false
    btn.textContent = 'Создать на сегодня'
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const tasks = templates.map(t=>({
    restaurant_id: restaurantId,
    title: t.title,
    target_qty: t.target_qty,
    unit: t.unit,
    deadline: t.deadline,
    shift_date: today,
    status: 'todo'
  }))

  const {error} = await supabase.from('tasks').insert(tasks)
  if(error) alert('Ошибка: '+error.message)

  btn.disabled = false
  btn.textContent = 'Создать на сегодня'
  await loadPrepList()
}

// Обновить фактическое количество
window.updateActual = async (id, value)=>{
  await supabase.from('tasks').update({
    actual_qty: value? parseFloat(value) : null,
    status: value && parseFloat(value)>0? 'done' : 'todo'
  }).eq('id', id)
  await loadPrepList()
}

// Модалка шаблонов
async function openTemplatesModal(){
  document.getElementById('templatesModal').style.display = 'flex'
  await loadTemplates()
}

function closeTemplatesModal(){
  document.getElementById('templatesModal').style.display = 'none'
}

async function loadTemplates(){
  if(!restaurantId) return

  const {data:templates} = await supabase
   .from('prep_templates')
   .select('*')
   .eq('restaurant_id', restaurantId)
   .order('created_at', {ascending:true})

  const listEl = document.getElementById('templatesList')
  if(!templates || templates.length===0){
    listEl.innerHTML = `<div style="color:#71717a;text-align:center;padding:20px">Шаблонов нет. Добавь первый ниже</div>`
    return
  }

  listEl.innerHTML = templates.map(t=>`
    <div style="background:#262626;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600">${t.title}</div>
        <div style="font-size:14px;color:#a1a1aa">${t.target_qty} ${t.unit} ${t.deadline? 'до ' + t.deadline : ''}</div>
      </div>
      <button onclick="deleteTemplate('${t.id}')" style="padding:6px 12px;background:#7f1d1d;border:none;border-radius:6px;color:#fca5a5;cursor:pointer">Удалить</button>
    </div>
  `).join('')
}

async function addTemplate(){
  const title = document.getElementById('newTemplateTitle').value.trim()
  const qty = parseFloat(document.getElementById('newTemplateQty').value)
  const unit = document.getElementById('newTemplateUnit').value.trim()

  if(!title ||!qty ||!unit) return alert('Заполни все поля')
  if(!restaurantId) return alert('Ресторан не определён')

  const {error} = await supabase.from('prep_templates').insert({
    restaurant_id: restaurantId,
    title, target_qty: qty, unit
  })

  if(error) return alert('Ошибка: '+error.message)

  document.getElementById('newTemplateTitle').value = ''
  document.getElementById('newTemplateQty').value = ''
  document.getElementById('newTemplateUnit').value = ''
  await loadTemplates()
}

window.deleteTemplate = async (id)=>{
  if(!confirm('Удалить шаблон?')) return
  await supabase.from('prep_templates').delete().eq('id', id)
  await loadTemplates()
}
