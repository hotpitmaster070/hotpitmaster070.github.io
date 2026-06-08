fetch('menu.html').then(r=>r.text()).then(html=>{
  document.getElementById('sidebarContainer').innerHTML=html;

  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('rest');
  if(restId) {
    document.querySelectorAll('[data-rest]').forEach(a => {
      a.href = a.href.replace('?rest=', '?rest=' + restId);
    });
  }

  const currentPage = window.location.pathname.split('/').pop();
  if(currentPage === 'chef.html') {
    document.querySelector('[data-rest]')?.classList.add('active');
  }

  if(typeof lucide!== 'undefined') lucide.createIcons();
});

const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('rest');

if (!restaurantId) {
  document.getElementById('mainContent').classList.add('hidden');
  document.getElementById('errorBox').classList.remove('hidden');
} else {
  document.addEventListener('DOMContentLoaded', async function() {
    if (typeof lucide!== 'undefined') {
      lucide.createIcons();
    }
    await loadRestaurantNamePanel();
    await initApp();
  });
}

async function initApp() {
  updateDateTitle();
  await loadCurrency();
  await loadStaff();
  setView(localStorage.getItem('hotpit_view') || 'day');
}

async function loadRestaurantNamePanel() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('rest');
  if(!restaurantId) return;

  const { data } = await _supabase.from('restaurants').select('name').eq('id', restaurantId).single();
  const restName = data?.name || 'Ресторан';

  const panelName = document.getElementById('restNamePanel');
  if(panelName) panelName.textContent = restName;
  const headerName = document.getElementById('restNameHeader');
  if(headerName) headerName.textContent = restName;
  localStorage.setItem('restName', restName);
}

const currencyMap = {
  'RUB': '₽', 'USD': '$', 'EUR': '€',
  'AED': 'د.إ', 'TRY': '₺', 'KZT': '₸', 'AZN': '₼'
};

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

function updateDateTitle() {
  const dateStr = currentDate.toISOString().split('T')[0];
  document.getElementById('dateTitle').innerText = `${currentDate.getDate()} ${months[currentDate.getMonth()]}, ${days[currentDate.getDay()]}`;
  document.getElementById('currentDayText').innerText = `${currentDate.getDate()} ${months[currentDate.getMonth()]}`;
  document.getElementById('currentDayWeek').innerText = days[currentDate.getDay()];
  document.getElementById('currentDateBadge').innerText = dateStr;
  document.getElementById('currentMonthText').innerText = `${monthsFull[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
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

function toggleSidebar() {
  document.getElementById('sidebarMobile').classList.toggle('left-[-280px]');
  document.getElementById('overlay').classList.toggle('hidden');
}

function openAddModal() {
  document.getElementById('addModal').classList.add('show');
  selectedPayType = 'hourly';
  selectPayType('hourly');
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('show');
  document.getElementById('newStaffName').value = '';
  document.getElementById('newStaffRate').value = '';
}

function selectPayType(type) {
  selectedPayType = type;
  const btnHourly = document.getElementById('payHourly');
  const btnDaily = document.getElementById('payDaily');
  btnHourly.className = type === 'hourly'? 'active' : 'inactive';
  btnDaily.className = type === 'daily'? 'active' : 'inactive';
}

function openDatePicker() {
  pickerDate = new Date(currentDate);
  document.getElementById('datePickerModal').classList.add('show');
  renderCalendar();
}

function closeDatePicker() {
  document.getElementById('datePickerModal').classList.remove('show');
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
  document.getElementById('pickerMonthYear').innerText = `${monthsFull[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  let startDay = firstDay.getDay();
  startDay = startDay === 0? 6 : startDay - 1;

  let html = '';
  for(let i = 0; i < startDay; i++) {
    html += '<div></div>';
  }

  for(let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const isSelected = currentDate.getDate() === d && currentDate.getMonth() === month && currentDate.getFullYear() === year;

    html += `<div
      class="calendar-day ${isToday? 'today' : ''} ${isSelected? 'selected' : ''}"
      onclick="selectDate('${dateStr}')">
      ${d}
    </div>`;
  }

  document.getElementById('calendarDays').innerHTML = html;
  if (typeof lucide!== 'undefined') lucide.createIcons();
}

async function loadCurrency() {
  const { data } = await _supabase.from('restaurants').select('currency').eq('id', restaurantId).single();
  const code = (data?.currency || 'RUB').toUpperCase();
  currency = currencyMap[code] || '₽';
}

async function setTab(tab, e) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  e.target.closest('.sidebar-item').classList.add('active');

  ['staff','prod','qr','reports'].forEach(t => {
    document.getElementById('tab-'+t).classList.add('hidden');
  });
  document.getElementById('tab-'+tab).classList.remove('hidden');

  if(window.innerWidth < 768) toggleSidebar();

  if(tab === 'prod') loadSchedule();
  if(tab === 'qr') startQrScanner();
  if(tab === 'staff') loadStaff();
  if(tab === 'reports') loadReports(); // ВОТ ТУТ ВЫЗЫВАЕМ ОТЧЁТЫ
}

function setView(view) {
  currentView = view;
  localStorage.setItem('hotpit_view', view);

  ['day','month'].forEach(v => {
    const btn = document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1));
    btn.className = view === v? 'active' : 'inactive';
  });

  document.getElementById('dayNav').classList.toggle('hidden', view!== 'day');
  document.getElementById('monthNav').classList.toggle('hidden', view!== 'month');

  loadSchedule();
}

async function addStaff() {
  const name = document.getElementById('newStaffName').value.trim();
  const rate = parseInt(document.getElementById('newStaffRate').value) || 300;
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
  await _supabase.from('staff').delete().eq('id', id);
  loadStaff();
}

async function updatePayType(staffId, type) {
  await _supabase.from('staff').update({pay_type: type}).eq('id', staffId);
  loadStaff();
}

async function loadStaff() {
  const { data } = await _supabase.from('staff')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .order('name');

  staffList = data || [];

  document.getElementById('staffList').innerHTML = staffList.map(s => {
    const isHourly = s.pay_type === 'hourly';
    const label = isHourly? `${currency}/час` : `${currency}/день`;

    return `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${s.name[0]}</div>
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
  }).join('');

  if (typeof lucide!== 'undefined') lucide.createIcons();
}

async function loadSchedule() {
  updateDateTitle();
  if (currentView === 'day') {
    const dateStr = currentDate.toISOString().split('T')[0];
    const { data: shifts } = await _supabase.from('work_schedules')
    .select('*, staff(*)')
    .eq('date', dateStr)
    .eq('restaurant_id', restaurantId);

    let html = staffList.map(st => {
      const shift = shifts?.find(s => s.staff_id === st.id);
      const isActive = shift? true : false;

      return `
        <div class="card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${st.name[0]}</div>
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
    document.getElementById('scheduleContent').innerHTML = html || '<div class="text-zinc-500 text-sm">Нет поваров</div>';
  }

  if (currentView === 'month') {
    loadMonthSchedule();
  }
}

async function loadMonthSchedule() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  const { data: shifts } = await _supabase.from('work_schedules')
  .select('*')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('restaurant_id', restaurantId);

  let html = `<div class="text-sm text-zinc-500 mb-3">Жми на дату чтобы добавить/убрать смену</div>`;

  staffList.forEach(st => {
    html += `<div class="card mb-3">
      <div class="font-semibold mb-2 flex items-center gap-2">
        <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">${st.name[0]}</div>
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

  document.getElementById('scheduleContent').innerHTML = html;
}

async function toggleStaffDay(staffId) {
  const dateStr = currentDate.toISOString().split('T')[0];

  const { data: existing } = await _supabase.from('work_schedules')
  .select('*')
  .eq('staff_id', staffId)
  .eq('date', dateStr)
  .single();

  if (existing) {
    await _supabase.from('work_schedules').delete().eq('id', existing.id);
  } else {
    await _supabase.from('work_schedules').insert({
      restaurant_id: restaurantId,
      staff_id: staffId,
      date: dateStr,
      start_time: '00:00',
      end_time: '23:59'
    });
  }
  loadSchedule();
}

async function toggleShiftMonth(staffId, date) {
  const { data: existing } = await _supabase.from('work_schedules')
  .select('*')
  .eq('staff_id', staffId)
  .eq('date', date)
  .single();

  if (existing) {
    await _supabase.from('work_schedules').delete().eq('id', existing.id);
  } else {
    await _supabase.from('work_schedules').insert({
      restaurant_id: restaurantId,
      staff_id: staffId,
      date: date,
      start_time: '00:00',
      end_time: '23:59'
    });
  }
  loadSchedule();
}

// ИСПРАВЛЕННЫЙ QR - ТЕПЕРЬ ПИШЕТ В TIME_LOGS
async function startQrScanner() {
  if (html5QrCode) html5QrCode.stop();
  html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (decodedText) => {
      const staffId = decodedText;
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) return;

      const now = new Date();
      const time = now.toTimeString().slice(0,8);
      const date = now.toISOString().split('T')[0];

      // Ищем незакрытую смену сегодня
      const { data: existing } = await _supabase.from('time_logs')
      .select('*')
      .eq('staff_id', staffId)
      .eq('date', date)
      .is('time_out', null)
      .single();

      if (!existing) {
        // Приход
        await _supabase.from('time_logs').insert({
          restaurant_id: restaurantId,
          staff_id: staffId,
          date: date,
          time_in: time
        });
        document.getElementById('qr-result').innerText = `${staff.name} отметил приход в ${time}`;
        showToast('Приход: ' + staff.name);
      } else {
        // Уход
        await _supabase.from('time_logs').update({time_out: time}).eq('id', existing.id);
        document.getElementById('qr-result').innerText = `${staff.name} отметил уход в ${time}`;
        showToast('Уход: ' + staff.name);
      }
    },
    (error) => {}
  );

  renderManualButtons();
}

// РУЧНОЙ ВВОД
async function renderManualButtons() {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayShifts } = await _supabase.from('work_schedules')
 .select('staff_id, staff(name)')
 .eq('date', today)
 .eq('restaurant_id', restaurantId);

  if(!todayShifts || todayShifts.length === 0) {
    document.getElementById('manualStaffList').innerHTML =
      '<div class="col-span-2 text-zinc-500 text-sm text-center py-4">Сегодня по графику никто не стоит</div>';
    return;
  }

  const html = todayShifts.map(s => `
    <div class="bg-zinc-800/50 rounded-xl p-4 border-zinc-700">
      <div class="font-semibold mb-3 text-center">${s.staff.name}</div>
      <div class="flex gap-2">
        <button onclick="manualCheck('${s.staff_id}', 'in')"
          class="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 rounded-lg font-semibold">
          <i data-lucide="log-in" class="w-4 h-4 inline mr-1"></i> Пришёл
        </button>
        <button onclick="manualCheck('${s.staff_id}', 'out')"
          class="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3 rounded-lg font-semibold">
          <i data-lucide="log-out" class="w-4 h-4 inline mr-1"></i> Ушёл
        </button>
      </div>
    </div>
  `).join('');

  document.getElementById('manualStaffList').innerHTML = html;
  if (typeof lucide!== 'undefined') lucide.createIcons();
}

async function manualCheck(staffId, type) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0];

  if(type === 'in') {
    await _supabase.from('time_logs').insert({
      staff_id: staffId,
      date: today,
      time_in: time,
      restaurant_id: restaurantId
    });
    showToast('Приход отмечен: ' + time);
  } else {
    const { data: log } = await _supabase.from('time_logs')
   .select('id')
   .eq('staff_id', staffId)
   .eq('date', today)
   .is('time_out', null)
   .single();

    if(log) {
      await _supabase.from('time_logs')
     .update({ time_out: time })
     .eq('id', log.id);
      showToast('Уход отмечен: ' + time);
    } else {
      alert('Нет открытой смены! Сначала нажми "Пришёл"');
      return;
    }
  }

  renderManualButtons();
}

// ОТЧЁТЫ - СЧИТАЕМ ПО TIME_LOGS
async function loadReports() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  const { data: logs } = await _supabase.from('time_logs')
   .select('*, staff(id, name, pay_type, hourly_rate, daily_rate)')
   .gte('date', startDate)
   .lte('date', endDate)
   .eq('restaurant_id', restaurantId);

  const stats = {};
  staffList.forEach(st => {
    stats[st.id] = {
      name: st.name,
      pay_type: st.pay_type,
      hour_rate: st.hourly_rate || 0,
      day_rate: st.daily_rate || 0,
      hours: 0,
      shifts: 0,
      pay: 0
    };
  });

  logs?.forEach(l => {
    if(!l.staff ||!l.time_in ||!l.time_out) return;
    const s = stats[l.staff.id];
    const hours = (new Date(`1970-01-01T${l.time_out}`) - new Date(`1970-01-01T${l.time_in}`)) / 1000 / 60 / 60;

    s.hours += hours;
    s.shifts += 1;
  });

  Object.values(stats).forEach(s => {
    if(s.pay_type === 'hourly') {
      s.pay = s.hours * s.hour_rate;
    } else {
      s.pay = s.shifts * s.day_rate;
    }
  });

  let html = `<div class="text-sm text-zinc-400 mb-4">${monthsFull[month]} ${year}</div>`;

  Object.values(stats).forEach(s => {
    if(s.shifts === 0) return;
    const typeText = s.pay_type === 'hourly'? `${s.hour_rate}${currency}/ч` : `${s.day_rate}${currency}/смена`;

    html += `
      <div class="card mb-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-lg">${s.name}</div>
            <div class="text-xs text-zinc-500 mt-1">${typeText}</div>
            <div class="text-xs text-zinc-400 mt-2">${s.hours.toFixed(1)}ч / ${s.shifts} смен</div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-orange-500">${s.pay.toFixed(0)}${currency}</div>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById('tab-reports').innerHTML = `
    <h2 class="font-semibold mb-4">Отчёты</h2>
    ${html || '<div class="text-zinc-500 text-center py-8">Нет данных за этот месяц</div>'}
  `;
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
  toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openKit
