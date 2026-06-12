// ====== 1. КОНФИГ + SUPABASE ======
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ======
const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('rest');

let currency = '₽';
let staffList = [];
let html5QrCode;
let selectedPayType = 'hourly';
let currentView = 'day';
let currentDate = new Date();
let pickerDate = new Date();

const currencyMap = {'RUB':'₽','USD':'$','EUR':'€','AED':'د.إ','TRY':'₺','KZT':'₸','AZN':'₼'};
const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const monthsFull = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

// ====== 3. СТАРТ ПРИЛОЖЕНИЯ ======
document.addEventListener('DOMContentLoaded', async function() {
  const mainEl = document.getElementById('mainContent');
  const errorBox = document.getElementById('errorBox');

  if (!restaurantId) {
    mainEl?.classList.add('hidden');
    errorBox?.classList.remove('hidden');
    return;
  }

  mainEl?.classList.remove('hidden');
  errorBox?.classList.add('hidden');

  if (typeof lucide!== 'undefined') lucide.createIcons();

  // название ресторана грузит chef-panels.js
  if (typeof loadRestaurantName === 'function') await loadRestaurantName();

  await initApp();
});

async function initApp() {
  updateDateTitle();
  await loadCurrency(restaurantId);
  await loadStaff();
  setView(localStorage.getItem('hotpit_view') || 'day');
}

// ====== 4. ДАТА/ВРЕМЯ ======
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

// ====== 5. UI: МОДАЛКИ + КАЛЕНДАРЬ ======
function openAddModal() {
  document.getElementById('addModal')?.classList.add('show');
  selectedPayType = 'hourly';
  selectPayType('hourly');
}

function closeAddModal() {
  document.getElementById('addModal')?.classList.remove('show');
  document.getElementById('newStaffName') && (document.getElementById('newStaffName').value = '');
  document.getElementById('newStaffRate') && (document.getElementById('newStaffRate').value = '');
}

function selectPayType(type) {
  selectedPayType = type;
  const btnHourly = document.getElementById('payHourly');
  const btnDaily = document.getElementById('payDaily');
  if(btnHourly) btnHourly.className = type === 'hourly'? 'active' : 'inactive';
  if(btnDaily) btnDaily.className = type === 'daily'? 'active' : 'inactive';
}

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
  document.getElementById('pickerMonthYear') && (document.getElementById('pickerMonthYear').innerText = `${monthsFull[month]} ${year}`);

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

  document.getElementById('calendarDays') && (document.getElementById('calendarDays').innerHTML = html);
  if (typeof lucide!== 'undefined') lucide.createIcons();
}

// ====== 6. ДАННЫЕ: ВАЛЮТА ======
async function loadCurrency(rId) {
  if(!rId) return;
  const { data, error } = await _supabase.from('restaurants').select('currency').eq('id', rId).single();
  if(error) {
    console.warn('Не удалось загрузить валюту:', error.message);
    return;
  }
  const code = (data?.currency || 'RUB').toUpperCase();
  currency = currencyMap[code] || '₽';
}

// ====== 7. ВКЛАДКИ + ВИДЫ ======
async function setTab(tab, e) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  // если кликнули из меню - подсвечиваем, если из кода - ищем по data-tab
  const item = e?.target?.closest('.sidebar-item') || document.querySelector(`[data-tab="${tab}"]`);
  item?.classList.add('active');

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

// ====== 8. ПОВАРА CRUD ======
async function addStaff() {
  const name = document.getElementById('newStaffName')?.value.trim();
  const rate = parseInt(document.getElementById('newStaffRate')?.value) || 300;
  if (!name) return alert('Введи имя повара');

  await _supabase.from('staff').insert({
    restaurant_id: restaurantId,
    name,
    pay_type: selectedPayType,
    hourly_rate: selectedPayType === 'hourly'? rate : null,
    daily_rate: selectedPayType === 'daily'? rate : null
  });
  closeAddModal();
  loadStaff();
}

async function deleteStaff(id, name) {
  if (!confirm(`Удалить ${name}?`)) return;
  // проверяем есть ли смены у повара
  const { data: shifts } = await _supabase.from('staff_schedule').select('id').eq('staff_id', id).limit(1);
  if(shifts?.length) return alert('Сначала удали смены этого повара в графике');
  await _supabase.from('staff').delete().eq('id', id);
  loadStaff();
}

async function updatePayType(staffId, type) {
  const s = staffList.find(x=>x.id===staffId);
  const rate = s?.hourly_rate || s?.daily_rate || 300;
  await _supabase.from('staff').update({
    pay_type: type,
    hourly_rate: type==='hourly'? rate : null,
    daily_rate: type==='daily'? rate : null
  }).eq('id', staffId);
  loadStaff();
}

async function loadStaff() {
  if(!restaurantId) return;
  const { data } = await _supabase.from('staff')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('name');

  staffList = data || [];

  document.getElementById('staffList') && (document.getElementById('staffList').innerHTML = staffList.map(s => {
    const isHourly = s.pay_type === 'hourly';
    const label = isHourly? `${currency}/час` : `${currency}/день`;

    return `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${s.name?.[0] || '?'}</div>
            <div>
              <div class="font-semibold">${s.name}</div>
              <div class="text-xs text-zinc-500">${label}</div>
            </div>
          </div>
          <button onclick="deleteStaff('${s.id}', '${s.name}')" class="btn-danger">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="pay-toggle flex gap-2">
          <button onclick="updatePayType('${s.id}', 'hourly')" class="${isHourly? 'active' : 'inactive'}">Почасовой</button>
          <button onclick="updatePayType('${s.id}', 'daily')" class="${!isHourly? 'active' : 'inactive'}">Фикс за день</button>
        </div>
      </div>
    `;
  }).join(''));

  if (typeof lucide!== 'undefined') lucide.createIcons();
}

// ====== 9. ЭКСПОРТ ДЛЯ HTML ======
window.setTab = setTab;
window.setView = setView;
window.addStaff = addStaff;
window.deleteStaff = deleteStaff;
window.updatePayType = updatePayType;

// ====== 10. ГРАФИК ДЕНЬ/МЕСЯЦ ======
async function loadSchedule() {
  updateDateTitle();
  if (!restaurantId ||!staffList.length) {
    document.getElementById('scheduleContent') && (document.getElementById('scheduleContent').innerHTML = '<div class="text-zinc-500 text-sm">Сначала добавь поваров</div>');
    return;
  }

  if (currentView === 'day') {
    const dateStr = currentDate.toISOString().split('T')[0];
    const { data: shifts, error } = await _supabase.from('work_schedules')
     .select('*, staff(*)')
     .eq('date', dateStr)
     .eq('restaurant_id', restaurantId);

    if(error) console.warn('Ошибка загрузки смен:', error.message);

    let html = staffList.map(st => {
      const shift = shifts?.find(s => s.staff_id === st.id);
      const isActive =!!shift;

      return `
        <div class="card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${st.name?.[0] || '?'}</div>
              <div>
                <div class="font-semibold">${st.name}</div>
                <div class="text-xs text-zinc-500">${dateStr}</div>
              </div>
            </div>
            <button onclick="toggleStaffDay('${st.id}')" class="staff-day-btn ${isActive? 'active' : ''}">
              ${isActive? 'В смене ✓' : 'Не в смене'}
            </button>
          </div>
        </div>
      `;
    }).join('');
    document.getElementById('scheduleContent') && (document.getElementById('scheduleContent').innerHTML = html || '<div class="text-zinc-500 text-sm">Нет поваров</div>');
  }

  if (currentView === 'month') {
    await loadMonthSchedule();
  }
}

async function loadMonthSchedule() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  const { data: shifts, error } = await _supabase.from('work_schedules')
   .select('*')
   .gte('date', startDate)
   .lte('date', endDate)
   .eq('restaurant_id', restaurantId);

  if(error) console.warn('Ошибка загрузки месяца:', error.message);

  let html = `<div class="text-sm text-zinc-500 mb-3">Жми на дату чтобы добавить/убрать смену</div>`;

  staffList.forEach(st => {
    html += `<div class="card mb-3">
      <div class="font-semibold mb-2 flex items-center gap-2">
        <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">${st.name?.[0] || '?'}</div>
        ${st.name}
      </div>
      <div class="grid grid-cols-7 gap-1">`;

    for(let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasShift = shifts?.some(s => s.staff_id === st.id && s.date === dateStr);

      html += `<button
        onclick="toggleShiftMonth('${st.id}', '${dateStr}')"
        class="month-day-btn ${hasShift? 'active' : ''}">
        ${d}
      </button>`;
    }

    html += `</div></div>`;
  });

  document.getElementById('scheduleContent') && (document.getElementById('scheduleContent').innerHTML = html);
}

async function toggleStaffDay(staffId) {
  const dateStr = currentDate.toISOString().split('T')[0];

  const { data: existing } = await _supabase.from('work_schedules')
   .select('*')
   .eq('staff_id', staffId)
   .eq('date', dateStr)
   .maybeSingle(); // single() падал если 0 строк. maybeSingle() - норм

  if (existing) {
    await _supabase.from('work_schedules').delete().eq('id', existing.id);
  } else {
    await _supabase.from('work_schedules').insert({
      restaurant_id: restaurantId,
      staff_id: staffId,
      date: dateStr,
      start_time: '09:00', // поставил адекватное время вместо 00:00-23:59
      end_time: '21:00'
    });
  }
  loadSchedule();
}

async function toggleShiftMonth(staffId, dateStr) {
  const { data: existing } = await _supabase.from('work_schedules')
   .select('*')
   .eq('staff_id', staffId)
   .eq('date', dateStr)
   .maybeSingle();

  if (existing) {
    await _supabase.from('work_schedules').delete().eq('id', existing.id);
  } else {
    await _supabase.from('work_schedules').insert({
      restaurant_id: restaurantId,
      staff_id: staffId,
      date: dateStr,
      start_time: '09:00',
      end_time: '21:00'
    });
  }
  loadSchedule();
}

// ====== 11. ЭКСПОРТ ДЛЯ HTML ======
window.loadSchedule = loadSchedule;
window.toggleStaffDay = toggleStaffDay;
window.toggleShiftMonth = toggleShiftMonth;
