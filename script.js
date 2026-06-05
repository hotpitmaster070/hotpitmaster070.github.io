fetch('menu.html').then(r=>r.text()).then(html=>{
  document.getElementById('sidebarContainer').innerHTML=html;
  
  // Автоматом подставляем UUID ресторана в меню
  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get('rest');
  if(restId) {
    document.querySelectorAll('[data-rest]').forEach(a => {
      a.href = a.href.replace('?rest=', '?rest=' + restId);
    });
  }
  
  // Подсвечиваем активный пункт меню
  const currentPage = window.location.pathname.split('/').pop();
  if(currentPage === 'chef.html') {
    document.querySelector('[data-rest]')?.classList.add('active');
  }
  
  if(typeof lucide !== 'undefined') lucide.createIcons();
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
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    initApp();
  });
}

async function initApp() {
  updateDateTitle();
  await loadCurrency();
  await loadStaff();
  setView(localStorage.getItem('hotpit_view') || 'day');
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
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
  const { data } = await _supabase.from('staff').select('*').eq('restaurant_id', restaurantId);
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
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadSchedule() {
  updateDateTitle();
  if (currentView === 'day') {
    const dateStr = currentDate.toISOString().split('T')[0];
    const { data: shifts } = await _supabase.from('work_schedules')
.select('*, staff(*)').eq('date', dateStr).eq('restaurant_id', restaurantId);

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
.select('*').gte('date', startDate).lte('date', endDate).eq('restaurant_id', restaurantId);

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
.select('*').eq('staff_id', staffId).eq('date', dateStr).single();

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
.select('*').eq('staff_id', staffId).eq('date', date).single();

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
      const time = now.toTimeString().slice(0,5);
      const date = now.toISOString().split('T')[0];

      const { data: existing } = await _supabase.from('work_schedules')
.select('*').eq('staff_id', staffId).eq('date', date).single();

      if (!existing) {
        await _supabase.from('work_schedules').insert({
          restaurant_id: restaurantId,
          staff_id: staffId,
          date: date,
          start_time: time,
          end_time: null
        });
        document.getElementById('qr-result').innerText = `${staff.name} отметил приход в ${time}`;
      } else if (!existing.end_time) {
        await _supabase.from('work_schedules').update({end_time: time}).eq('id', existing.id);
        document.getElementById('qr-result').innerText = `${staff.name} отметил уход в ${time}`;
      } else {
        document.getElementById('qr-result').innerText = `${staff.name} уже отметил приход и уход сегодня`;
      }
      loadSchedule();
    },
    (error) => {}
  );
}

function openKitchenPanel() {
  document.getElementById('kitchenPanel').style.right = '0px';
  document.getElementById('kitchenOverlay').style.display = 'block';
  loadRestaurantNamePanel();
}
function closeKitchenPanel() {
  document.getElementById('kitchenPanel').style.right = '-400px';
  document.getElementById('kitchenOverlay').style.display = 'none';
}

async function loadRestaurantNamePanel() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('rest');
  if(!restaurantId) {
    document.getElementById('restNamePanel').textContent = 'Ошибка: нет ID ресторана';
    return;
  }
  
  const { data } = await _supabase.from('restaurants').select('name').eq('id', restaurantId).single();
  document.getElementById('restNamePanel').textContent = data?.name || 'Ресторан';
}

// ФУНКЦИИ ДЛЯ ЗАДАНИЙ ШЕФА
function openTaskModal() {
  const select = document.getElementById('taskCook');
  if(!select) return;
  select.innerHTML = '<option value="">Выбери повара...</option>' +
    staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('taskModal').classList.add('show');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('show');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
}

async function saveTask() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('rest');
  const staff_id = document.getElementById('taskCook').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  
  if(!staff_id || !title) {
    alert('Выбери повара и напиши заголовок!');
    return;
  }

  const { error } = await _supabase.from('tasks').insert({
    restaurant_id: restaurantId,
    staff_id: staff_id,
    title: title,
    description: description,
    status: 'new'
  });

  if(error) {
    alert('Ошибка: ' + error.message);
    return;
  }
  alert('Задание отправлено!');
  closeTaskModal();
}
