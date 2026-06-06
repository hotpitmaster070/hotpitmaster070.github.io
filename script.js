// ===== SUPABASE =====
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ГЛОБАЛЬНЫЕ =====
let staffList = [];
let currency = '₽';

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', async () => {
  if(typeof lucide!== 'undefined') lucide.createIcons();

  const page = location.pathname.split('/').pop();
  const restId = new URLSearchParams(location.search).get('rest');

  if(!restId && page!== 'index.html') {
    document.getElementById('mainContent')?.classList.add('hidden');
    document.getElementById('errorBox')?.classList.remove('hidden');
    return;
  }

  await loadMenu(restId);

  if(page === 'chef.html') {
    await initChefPage(restId);
  } else if(page === 'schedule.html') {
    const tab = new URLSearchParams(location.search).get('tab');
    if(tab === 'staff') await initStaffPage(restId);
    else await initSchedulePage(restId);
  } else if(page === 'cook.html') {
    await initCookPage(restId);
  }
});

// ===== МЕНЮ =====
async function loadMenu(restId) {
  const container = document.getElementById('sidebarContainer');
  if(!container) return;

  const html = await fetch('menu.html').then(r=>r.text());
  container.innerHTML = html;

  if(restId) {
    document.querySelectorAll('[data-rest]').forEach(a => {
      let href = a.getAttribute('href');
      if(href.includes('?rest=')) href = href.replace('?rest=', '?rest=' + restId);
      else if(href.includes('.html')) href = href + '?rest=' + restId;
      a.setAttribute('href', href);
    });
  }

  const page = location.pathname.split('/').pop();
  document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
  if(page === 'chef.html') document.querySelector('[href*="chef.html"]')?.classList.add('active');
  if(page === 'schedule.html' && new URLSearchParams(location.search).get('tab')==='staff')
    document.querySelector('[href*="tab=staff"]')?.classList.add('active');

  if(typeof lucide!== 'undefined') lucide.createIcons();
}

// ===== CHEF.HTML =====
async function initChefPage(restId) {
  const nameEl = document.getElementById('restNameKitchen');
  if(nameEl) {
    const { data } = await _supabase.from('restaurants').select('name').eq('id', restId).single();
    nameEl.textContent = data?.name || 'Ресторан';
  }
  await loadStaffList(restId);
}

async function loadStaffList(restId) {
  const { data } = await _supabase.from('staff')
   .select('*').eq('restaurant_id', restId).order('name');
  staffList = data || [];
}

window.openTaskModal = function() {
  const modal = document.getElementById('taskModal');
  const select = document.getElementById('taskCook');
  if(!modal ||!select) return;

  select.innerHTML = staffList.length === 0
   ? '<option value="">Сначала добавь поваров в "Повара"</option>'
    : '<option value="">Выбери повара...</option>' +
      staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  modal.classList.add('show');
}

window.closeTaskModal = function() {
  document.getElementById('taskModal')?.classList.remove('show');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
}

window.saveTask = async function() {
  const restId = new URLSearchParams(location.search).get('rest');
  const staff_id = document.getElementById('taskCook').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();

  if(!staff_id ||!title) return alert('Выбери повара и заголовок!');

  const { error } = await _supabase.from('tasks').insert({
    restaurant_id: restId, staff_id, title, description, status: 'new'
  });

  if(error) return alert('Ошибка: ' + error.message);
  alert('Задание отправлено повару!');
  closeTaskModal();
}

// ===== SCHEDULE.HTML - ПОВАРА =====
async function initStaffPage(restId) {
  const list = document.getElementById('staffList');
  const btn = document.getElementById('addStaffBtn');
  if(!list ||!btn) return;

  btn.onclick = async () => {
    const name = prompt('Имя повара:');
    if(!name) return;
    const role = prompt('Роль: повар/су-шеф/мойщик', 'повар');
    await _supabase.from('staff').insert({restaurant_id: restId, name, role});
    initStaffPage(restId);
  };

  const { data: staff } = await _supabase.from('staff')
  .select('*').eq('restaurant_id', restId).order('name');

  if(!staff || staff.length === 0) {
    list.innerHTML = '<div class="text-center text-zinc-500 mt-10">Поваров нет. Нажми "Добавить"</div>';
    return;
  }

  list.innerHTML = staff.map(s => `
    <div class="card flex justify-between items-center">
      <div>
        <h3 class="font-bold">${s.name}</h3>
        <p class="text-xs text-zinc-500">${s.role || 'повар'}</p>
      </div>
      <button onclick="deleteStaff('${s.id}')" class="text-red-500 text-sm">Удалить</button>
    </div>
  `).join('');
}

window.deleteStaff = async function(id) {
  if(confirm('Удалить повара?')) {
    await _supabase.from('staff').delete().eq('id', id);
    location.reload();
  }
}

// ===== SCHEDULE.HTML - ГРАФИК =====
async function initSchedulePage(restId) {
  const grid = document.getElementById('scheduleGrid');
  if(!grid) return;

  const { data: staff } = await _supabase.from('staff')
  .select('*').eq('restaurant_id', restId).order('name');

  const { data: shifts } = await _supabase.from('shifts')
  .select('*').eq('restaurant_id', restId);

  if(!staff || staff.length === 0) {
    grid.innerHTML = '<div class="text-center text-zinc-500 mt-10">Сначала добавь поваров во вкладке "Повара"</div>';
    return;
  }

  let html = '<div class="overflow-x-auto"><div class="grid grid-cols-8 gap-2 text-xs min-w-[600px]">';
  html += '<div class="font-bold p-2">Повар</div>';
  for(let i=0; i<7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    html += `<div class="font-bold text-center p-2">${d.getDate()}.${d.getMonth()+1}</div>`;
  }

  staff.forEach(s => {
    html += `<div class="font-bold p-2 flex items-center">${s.name}</div>`;
    for(let i=0; i<7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const shift = shifts?.find(x => x.staff_id === s.id && x.shift_date === dateStr);
      html += `<div onclick="toggleShift('${s.id}','${dateStr}')" class="h-10 rounded ${shift? 'bg-orange-500' : 'bg-zinc-800'} cursor-pointer"></div>`;
    }
  });
  html += '</div></div>';
  grid.innerHTML = html;
}

window.toggleShift = async function(staffId, dateStr) {
  const restId = new URLSearchParams(location.search).get('rest');
  const { data } = await _supabase.from('shifts')
  .select('id').eq('staff_id', staffId).eq('shift_date', dateStr).single();

  if(data) await _supabase.from('shifts').delete().eq('id', data.id);
  else await _supabase.from('shifts').insert({
    restaurant_id: restId, staff_id: staffId, shift_date: dateStr,
    start_time: '09:00', end_time: '21:00'
  });
  location.reload();
}

// ===== COOK.HTML =====
async function initCookPage(restId) {
  let staffId = localStorage.getItem('hotpit_staff_id');

  if(!staffId) {
    const name = prompt('Введи своё имя как у шефа:');
    if(name) {
      const { data } = await _supabase.from('staff')
       .select('id').eq('restaurant_id', restId).eq('name', name).single();
      if(data) {
        localStorage.setItem('hotpit_staff_id', data.id);
        location.reload();
      } else alert('Повар не найден. Попроси шефа добавить тебя');
    }
    return;
  }

  const { data: staff } = await _supabase.from('staff').select('name').eq('id', staffId).single();
  document.getElementById('cookName').textContent = staff?.name || 'Повар';
  await loadCookTasks(restId, staffId);
}

async function loadCookTasks(restId, staffId) {
  const list = document.getElementById('tasksList');
  const { data: tasks } = await _supabase.from('tasks')
   .select('*').eq('restaurant_id', restId).eq('staff_id', staffId)
   .in('status', ['new', 'in_progress']).order('created_at', {ascending: false});

  if(!tasks || tasks.length === 0) {
    list.innerHTML = '<div class="text-center text-zinc-500 mt-20">Заданий нет. Отдыхай 😎</div>';
    return;
  }

  list.innerHTML = tasks.map(t => `
    <div class="card ${t.status === 'in_progress'? 'border-orange-500' : ''}">
      <div class="flex justify-between mb-2">
        <h3 class="font-bold">${t.title}</h3>
        <span class="text-xs px-2 py-1 rounded ${t.status === 'new'? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}">
          ${t.status === 'new'? 'Новое' : 'В работе'}
        </span>
      </div>
      <p class="text-sm text-zinc-400 mb-3">${t.description || ''}</p>
      <button onclick="${t.status === 'new'? `startTask('${t.id}')` : `finishTask('${t.id}')`}"
        class="w-full ${t.status === 'new'? 'bg-blue-600' : 'bg-green-600'} py-2 rounded-lg text-sm">
        ${t.status === 'new'? 'Взять в работу' : 'Готово ✅'}
      </button>
    </div>
  `).join('');
}

window.startTask = async function(id) {
  await _supabase.from('tasks').update({status: 'in_progress'}).eq('id', id);
  location.reload();
}
window.finishTask = async function(id) {
  await _supabase.from('tasks').update({status: 'done'}).eq('id', id);
  alert('Красава!'); location.reload();
}

// ===== ОБЩИЕ =====
function toggleSidebar() {
  document.getElementById('sidebarMobile')?.classList.toggle('left-[-280px]');
  document.getElementById('overlay')?.classList.toggle('hidden');
                             }
