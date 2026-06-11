// ====== 1. ЗАГРУЗКА МЕНЮ В SIDEBAR ======
fetch('menu.html').then(r=>r.text()).then(html=>{
  const sidebar = document.getElementById('sidebarContainer');
  if(!sidebar) return;
  sidebar.innerHTML=html;

  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('rest');
  if(restId) {
    document.querySelectorAll('[data-rest]').forEach(a => {
      const sep = a.href.includes('?')? '&' : '?';
      a.href = a.href + `${sep}rest=${restId}`;
    });
  }

  const currentPage = window.location.pathname.split('/').pop();
  if(currentPage === 'chef.html') {
    document.querySelector('[data-rest]')?.classList.add('active');
  }

  if(typeof lucide!== 'undefined') lucide.createIcons();
});

// ====== 2. КОНФИГ + SUPABASE + ГЛОБАЛЫ ======
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7gkyrop...';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let restaurantId = null; // глобальный, как ты привык
const currencyMap = {'RUB':'₽','USD':'$','EUR':'€','AED':'د.إ','TRY':'₺','KZT':'₸','AZN':'₼'};
let currency = '₽';
let staffList = [];
let html5QrCode;
let selectedPayType = 'hourly';
let currentView = 'day';
let currentDate = new Date();
let pickerDate = new Date();

const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const monthsFull = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

// ====== 3. СТАРТ ПРИЛОЖЕНИЯ ======
document.addEventListener('DOMContentLoaded', async function() {
  const urlParams = new URLSearchParams(window.location.search);
  restaurantId = urlParams.get('rest');

  const mainEl = document.getElementById('mainContent');
  const errorBox = document.getElementById('errorBox');

  if (!restaurantId) {
    mainEl?.classList.add('hidden');
    errorBox?.classList.remove('hidden');
    console.error('Нет?rest= в URL');
    return;
  }

  mainEl?.classList.remove('hidden');
  errorBox?.classList.add('hidden');

  if (typeof lucide!== 'undefined') lucide.createIcons();
  await loadRestaurantNamePanel();
  await initApp();
});

// ====== 4. ФУНКЦИИ ДАТЫ/НАЗВАНИЙ ======
async function loadRestaurantNamePanel() {
  const { data } = await _supabase.from('restaurants').select('name').eq('id', restaurantId).single();
  const restName = data?.name || 'Ресторан';
  document.getElementById('restNamePanel') && (document.getElementById('restNamePanel').textContent = restName);
  document.getElementById('restNameHeader') && (document.getElementById('restNameHeader').textContent = restName);
  localStorage.setItem('restName', restName);
}

function updateDateTitle() {
  const dateStr = currentDate.toISOString().split('T')[0];
  document.getElementById('dateTitle') && (document.getElementById('dateTitle').innerText = `${currentDate.getDate()} ${months[currentDate.getMonth()]}, ${days[currentDate.getDay()]}`);
  document.getElementById('currentDayText') && (document.getElementById('currentDayText').innerText = `${currentDate.getDate()} ${months[currentDate.getMonth()]}`);
  document.getElementById('currentDayWeek') && (document.getElementById('currentDayWeek').innerText = days[currentDate.getDay()]);
  document.getElementById('currentDateBadge') && (document.getElementById('currentDateBadge').innerText = dateStr);
  document.getElementById('currentMonthText') && (document.getElementById('currentMonthText').innerText = `${monthsFull[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
}

function changeDay(delta) {
  currentDate.setDate(currentDate.getDate() + delta);
  updateDateTitle();
  loadSchedule();
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  updateDateTitle();
  loadSchedule();
}

async function initApp() {
  updateDateTitle();
  await loadCurrency();
  await loadStaff();
  setView(localStorage.getItem('hotpit_view') || 'day');
}

// ====== 5. UI: SIDEBAR + МОДАЛКИ ======
function toggleSidebar() {
  document.getElementById('sidebarMobile')?.classList.toggle('left-[-280px]');
  document.getElementById('overlay')?.classList.toggle('hidden');
}

function openAddModal() {
  document.getElementById('addModal')?.classList.add('show');
  selectedPayType = 'hourly';
  selectPayType('hourly');
}

function closeAddModal() {
  document.getElementById('addModal')?.classList.remove('show');
  const nameInput = document.getElementById('newStaffName');
  const rateInput = document.getElementById('newStaffRate');
  if(nameInput) nameInput.value = '';
  if(rateInput) rateInput.value = '';
}

function selectPayType(type) {
  selectedPayType = type;
  const btnHourly = document.getElementById('payHourly');
  const btnDaily = document.getElementById('payDaily');
  if(btnHourly) btnHourly.className = type === 'hourly'? 'active' : 'inactive';
  if(btnDaily) btnDaily.className = type === 'daily'? 'active' : 'inactive';
}

// ====== 6. UI: КАЛЕНДАРЬ ======
function openDatePicker() {
  pickerDate = new Date(currentDate);
  document.getElementById('datePickerModal')?.classList.add('show');
  renderCalendar();
}

function closeDatePicker() {
  document.getElementById('datePickerModal')?.classList.remove('show');
}

function changePickerMonth(delta) {
  pickerDate.setMonth(pickerDate.getMonth() + delta);
  renderCalendar();
}

function selectToday() {
  currentDate = new Date();
  closeDatePicker();
  updateDateTitle();
  loadSchedule();
}

function selectDate(date) {
  currentDate = new Date(date);
  closeDatePicker();
  updateDateTitle();
  loadSchedule();
}

function renderCalendar() {
  const year = pickerDate.getFullYear();
  const month = pickerDate.getMonth();
  const titleEl = document.getElementById('pickerMonthYear');
  if(titleEl) titleEl.innerText = `${monthsFull[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  let startDay = firstDay.getDay();
  startDay = startDay === 0? 6 : startDay - 1;

  let html = '';
  for(let i = 0; i < startDay; i++) html += '<div></div>';

  for(let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const isSelected = currentDate.getDate() === d && currentDate.getMonth() === month && currentDate.getFullYear() === year;
    html += `<div class="calendar-day ${isToday? 'today' : ''} ${isSelected? 'selected' : ''}" onclick="selectDate('${dateStr}')">${d}</div>`;
  }

  const daysEl = document.getElementById('calendarDays');
  if(daysEl) daysEl.innerHTML = html;
  if (typeof lucide!== 'undefined') lucide.createIcons();
}

// ====== 7. ДАННЫЕ: ВАЛЮТА ======
async function loadCurrency() {
  if(!restaurantId) return;
  const { data, error } = await _supabase.from('restaurants').select('currency').eq('id', restaurantId).single();
  if(error) { console.warn('Не удалось загрузить валюту:', error.message); return; }
  const code = (data?.currency || 'RUB').toUpperCase();
  currency = currencyMap[code] || '₽';
}

// ====== 8. ВКЛАДКИ ======
function setTab(tab, e) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  e?.target?.closest('.sidebar-item')?.classList.add('active');

  ['staff','prod','qr','reports'].forEach(t => {
    document.getElementById('tab-'+t)?.classList.add('hidden');
  });
  document.getElementById('tab-'+tab)?.classList.remove('hidden');

  if(window.innerWidth < 768) toggleSidebar();

  if(tab === 'prod') loadSchedule();
  if(tab === 'qr') startQrScanner();
  if(tab === 'staff') loadStaff();
  if(tab === 'reports') loadReports();
}

function setView(view) {
  currentView = view;
  localStorage.setItem('hotpit_view', view);

  ['day','month'].forEach(v => {
    const btn = document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1));
    if(btn) btn.className = view === v? 'active' : 'inactive';
  });

  document.getElementById('dayNav')?.classList.toggle('hidden', view!== 'day');
  document.getElementById('monthNav')?.classList.toggle('hidden', view!== 'month');

  loadSchedule();
}

// ====== 9. МЕНЮ ШЕФА: CRUD ПОВАРОВ ======
async function addStaff() {
  const nameEl = document.getElementById('newStaffName');
  const rateEl = document.getElementById('newStaffRate');
  const name = nameEl?.value.trim();
  const rate = parseInt(rateEl?.value) || 300;

  if (!name) return alert('Введи имя повара');
  if(!restaurantId) return alert('Нет restaurantId');

  const { error } = await _supabase.from('staff').insert({
    restaurant_id: restaurantId,
    name,
    pay_type: selectedPayType,
    hourly_rate: selectedPayType === 'hourly'? rate : null,
    daily_rate: selectedPayType === 'daily'? rate : null
  });
  if(error) { console.error('Ошибка добавления повара:', error.message); alert('Не удалось добавить повара'); return; }
  closeAddModal();
  loadStaff();
}

async function deleteStaff(id, name) {
  if (!confirm(`Удалить ${name}?`)) return;
  const { error } = await _supabase.from('staff').delete().eq('id', id);
  if(error) { console.error('Ошибка удаления:', error.message); alert('Не удалось удалить'); return; }
  loadStaff();
}

async function updatePayType(staffId, type) {
  const { error } = await _supabase.from('staff').update({pay_type: type}).eq('id', staffId);
  if(error) { console.error('Ошибка смены типа оплаты:', error.message); return; }
  loadStaff();
}

async function loadStaff() {
  if(!restaurantId) return;
  const { data, error } = await _supabase.from('staff').select('*').eq('restaurant_id', restaurantId).order('name');
  if(error) { console.error('Ошибка загрузки staff:', error.message); staffList = []; return; }
  staffList = data || [];

  const staffListEl = document.getElementById('staffList');
  if(!staffListEl) return;

  staffListEl.innerHTML = staffList.map(s => {
    const isHourly = s.pay_type === 'hourly';
    const label = isHourly? `${currency}/час` : `${currency}/день`;
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${s.name[0]}</div>
            <div><div class="font-semibold">${s.name}</div><div class="text-xs text-zinc-500">${label}</div></div>
          </div>
          <button onclick="deleteStaff('${s.id}', '${s.name}')" class="btn-danger"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
        <div class="pay-toggle flex gap-2">
          <button onclick="updatePayType('${s.id}', 'hourly')" class="${isHourly? 'active' : 'inactive'}">Почасовой</button>
          <button onclick="updatePayType('${s.id}', 'daily')" class="${!isHourly? 'active' : 'inactive'}">Фикс за день</button>
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide!== 'undefined') lucide.createIcons();
}

// ====== 10. ГРАФИК: ДЕНЬ ======
async function loadSchedule() {
  updateDateTitle();
  const scheduleEl = document.getElementById('scheduleContent');
  if(!scheduleEl) return;

  if (currentView === 'day') {
    const dateStr = currentDate.toISOString().split('T')[0];
    const { data: shifts, error } = await _supabase.from('work_schedules').select('*, staff(*)').eq('date', dateStr).eq('restaurant_id', restaurantId);
    if(error) { console.error('Ошибка загрузки смен дня:', error.message); scheduleEl.innerHTML = '<div class="text-red-500 text-sm">Ошибка загрузки графика</div>'; return; }
    if(!staffList || staffList.length === 0) { scheduleEl.innerHTML = '<div class="text-zinc-500 text-sm">Нет поваров</div>'; return; }

    let html = staffList.map(st => {
      const shift = shifts?.find(s => s.staff_id === st.id);
      const isActive =!!shift;
      return `
        <div class="card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${st.name[0]}</div>
              <div><div class="font-semibold">${st.name}</div><div class="text-xs text-zinc-500">${dateStr}</div></div>
            </div>
            <button onclick="toggleStaffDay('${st.id}')" class="staff-day-btn ${isActive? 'active' : ''}">${isActive? 'В смене ✓' : 'Не в смене'}</button>
          </div>
        </div>
      `;
    }).join('');
    scheduleEl.innerHTML = html;
  }

  if (currentView === 'month') {
    loadMonthSchedule();
  }
}

// ====== 11. ГРАФИК: МЕСЯЦ ======
async function loadMonthSchedule() {
  const scheduleEl = document.getElementById('scheduleContent');
  if(!scheduleEl ||!staffList) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  const { data: shifts, error } = await _supabase.from('work_schedules').select('*').gte('date', startDate).lte('date', endDate).eq('restaurant_id', restaurantId);
  if(error) { console.error('Ошибка загрузки смен месяца:', error.message); scheduleEl.innerHTML = '<div class="text-red-500 text-sm">Ошибка загрузки месяца</div>'; return; }

  let html = `<div class="text-sm text-zinc-500 mb-3">Жми на дату чтобы добавить/убрать смену</div>`;
  staffList.forEach(st => {
    html += `<div class="card mb-3"><div class="font-semibold mb-2 flex items-center gap-2"><div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">${st.name[0]}</div>${st.name}</div><div class="grid grid-cols-7 gap-1">`;
    for(let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasShift = shifts?.some(s => s.staff_id === st.id && s.date === dateStr);
      html += `<button onclick="toggleShiftMonth('${st.id}', '${dateStr}')" class="month-day-btn ${hasShift? 'active' : ''}">${d}</button>`;
    }
    html += `</div></div>`;
  });
  scheduleEl.innerHTML = html;
}

async function toggleStaffDay(staffId) {
  const dateStr = currentDate.toISOString().split('T')[0];
  const { data: existing, error: findErr } = await _supabase.from('work_schedules').select('*').eq('staff_id', staffId).eq('date', dateStr).single();
  if(findErr && findErr.code!== 'PGRST116') { console.error('Ошибка поиска смены:', findErr.message); return; }

  if (existing) {
    await _supabase.from('work_schedules').delete().eq('id', existing.id);
  } else {
    await _supabase.from('work_schedules').insert({restaurant_id: restaurantId, staff_id: staffId, date: dateStr, start_time: '00:00', end_time: '23:59'});
  }
  loadSchedule();
}

async function toggleShiftMonth(staffId, dateStr) {
  await toggleStaffDay(staffId, dateStr);
}
