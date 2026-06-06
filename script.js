// ===== SUPABASE =====
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ГЛОБАЛЬНЫЕ =====
let staffList = [];
let currentPayType = 'hourly';
let currentDate = new Date();
let currentView = 'day';

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

  // СНАЧАЛА ГРУЗИМ МЕНЮ! Чтобы сайдбар появился
  await loadMenu(restId);

  // ПОТОМ грузим страницу
  if(page === 'chef.html') {
    await initChefPage(restId);
  } else if(page === 'schedule.html') {
    const tab = new URLSearchParams(location.search).get('tab') || 'prod';
    if(tab === 'staff') await initStaffPage(restId);
    else if(tab === 'qr') await initQRPage(restId);
    else if(tab === 'reports') await initReportsPage(restId);
    else await initSchedulePage(restId);
  } else if(page === 'cook.html') {
    await initCookPage(restId);
  }
});

// ===== МЕНЮ - ПОД ТВОЙ HTML С sidebar-item =====
async function loadMenu(restId) {
  const container = document.getElementById('sidebarContainer');
  if(!container) return;

  try {
    const html = await fetch('menu.html').then(r=>r.text());
    container.innerHTML = html;

    // 1. Подставляем UUID в ссылку "Экран шефа"
    if(restId) {
      container.querySelectorAll('a[data-rest="true"]').forEach(a => {
        a.href = 'chef.html?rest=' + restId;
      });
    }

    // 2. Подсветка активной вкладки для ТВОЕГО дизайна
    const tab = new URLSearchParams(location.search).get('tab') || 'prod';
    const items = container.querySelectorAll('.sidebar-item');
    items.forEach(item => item.classList.remove('active'));

    if(tab === 'staff') items[0]?.classList.add('active'); // Повара
    if(tab === 'prod' ||!tab) items[1]?.classList.add('active'); // График
    if(tab === 'qr') items[2]?.classList.add('active'); // QR Сканер
    if(tab === 'reports') items[3]?.classList.add('active'); // Отчёты

    if(typeof lucide!== 'undefined') lucide.createIcons();
  } catch(e) {
    console.error('Ошибка загрузки меню:', e);
  }
}

// ===== КЛИКИ ПО МЕНЮ =====
window.setTab = function(tab, event) {
  const restId = new URLSearchParams(location.search).get('rest');
  let url = 'schedule.html?rest=' + restId;
  if(tab!== 'prod') url += '&tab=' + tab;
  location.href = url;
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

// ===== SCHEDULE.HTML - ПОВАРА =====
async function initStaffPage(restId) {
  await loadStaffList(restId);
  renderStaffList(restId);
}

window.openAddModal = function() {
  document.getElementById('addModal').classList.add('show');
}
window.closeAddModal = function() {
  document.getElementById('addModal').classList.remove('show');
  document.getElementById('newStaffName').value = '';
  document.getElementById('newStaffRate').value = '';
}

window.selectPayType = function(type) {
  currentPayType = type;
  document.getElementById('payHourly').className = type==='hourly'? 'active' : 'inactive';
  document.getElementById('payDaily').className = type==='daily'? 'active' : 'inactive';
}

window.addStaff = async function() {
  const restId = new URLSearchParams(location.search).get('rest');
  const name = document.getElementById('newStaffName').value.trim();
  const rate = document.getElementById('newStaffRate').value;

  if(!name ||!rate) return alert('Заполни имя и ставку!');

  await _supabase.from('staff').insert({
    restaurant_id: restId,
    name: name,
    rate: parseInt(rate),
    pay_type: currentPayType
  });

  closeAddModal();
  await loadStaffList(restId);
  renderStaffList(restId);
}

async function loadStaffList(restId) {
  const { data } = await _supabase.from('staff')
  .select('*').eq('restaurant_id', restId).order('name');
  staffList = data || [];
}

function renderStaffList(restId) {
  const list = document.getElementById('staffList');
  if(!staffList.length) {
    list.innerHTML = '<div class="text-zinc-500 text-sm">Поваров нет. Добавь первого</div>';
    return;
  }

  list.innerHTML = staffList.map(s => `
    <div class="card flex justify-between items-center">
      <div>
        <h3 class="font-bold">${s.name}</h3>
        <p class="text-xs text-zinc-500">${s.pay_type==='hourly'? s.rate+'₽/час' : s.rate+'₽/день'}</p>
      </div>
      <button onclick="deleteStaff('${s.id}')" class="text-red-500 text-sm">Удалить</button>
    </div>
  `).join('');

  if(typeof lucide!== 'undefined') lucide.createIcons();
}

window.deleteStaff = async function(id) {
  if(confirm('Удалить повара?')) {
    await _supabase.from('staff').delete().eq('id', id);
    location.reload();
  }
}

// ===== SCHEDULE.HTML - ГРАФИК =====
async function initSchedulePage(restId) {
  await loadStaffList(restId);
  updateDateTitle();
  await loadSchedule(restId);
}

window.setView = async function(view) {
  currentView = view;
  document.getElementById('viewDay').className = view==='day'? 'active' : 'inactive';
  document.getElementById('viewMonth').className = view==='month'? 'active' : 'inactive';
  document.getElementById('dayNav').classList.toggle('hidden', view!=='day');
  document.getElementById('monthNav').classList.toggle('hidden', view!=='month');
  const restId = new URLSearchParams(location.search).get('rest');
  await loadSchedule(restId);
}

window.changeDay = async function(dir) {
  currentDate.setDate(currentDate.getDate() + dir);
  updateDateTitle();
  const restId = new URLSearchParams(location.search).get('rest');
  await loadSchedule(restId);
}

function updateDateTitle() {
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const d = currentDate;
  document.getElementById('currentDayText').textContent = d.getDate() + ' + months[d.getMonth()];
  document.getElementById('currentDateBadge').textContent = d.toISOString().split('T')[0];
  document.getElementById('currentDayWeek').textContent = days[d.getDay()];
}

async function loadSchedule(restId) {
  const content = document.getElementById('scheduleContent');
  if(currentView === 'day') {
    const dateStr = currentDate.toISOString().split('T')[0];
    const { data: shifts } = await _supabase.from('shifts')
    .select('*, staff(name)').eq('restaurant_id', restId).eq('shift_date', dateStr);

    content.innerHTML = staffList.map(s => {
      const shift = shifts?.find(x => x.staff_id === s.id);
      return `
        <div class="card flex justify-between items-center cursor-pointer" onclick="toggleShift('${s.id}','${dateStr}')">
          <span>${s.name}</span>
          <span class="${shift? 'text-green-400' : 'text-zinc-600'}">${shift? '✓ Смена' : 'Выходной'}</span>
        </div>
      `;
    }).join('');
  } else {
    content.innerHTML = '<div class="text-zinc-500">Вид "Месяц" допишем позже брат</div>';
  }
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
  await loadSchedule(restId);
}

// ===== QR СКАНЕР =====
async function initQRPage(restId) {
  const html5QrCode = new Html5Qrcode("qr-reader");
  const resultEl = document.getElementById('qr-result');

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (decodedText) => {
      resultEl.innerHTML = `Отсканировано: ${decodedText}`;
      await _supabase.from('attendances').insert({
        restaurant_id: restId,
        staff_id: decodedText,
        time_in: new Date().toISOString()
      });
      resultEl.innerHTML += '<br><span class="text-green-400">Отметка сделана!</span>';
    },
    (error) => {}
  ).catch(err => resultEl.innerHTML = 'Камера не запустилась: ' + err);
}

// ===== ОТЧЁТЫ =====
async function initReportsPage(restId) {
  document.getElementById('tab-reports').innerHTML += '<div class="text-sm text-zinc-500 mt-4">Отчёты подключим после теста графика</div>';
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
