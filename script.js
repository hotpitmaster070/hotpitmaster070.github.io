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
  if(tab === 'reports') loadReports();
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

const { data: existing } = await _supabase
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

      const { data: existing } = await _supabase.from('time_logs')
   .select('*')
   .eq('staff_id', staffId)
   .eq('log_date', date)
   .is('time_out', null)
   .single();

      if (!existing) {
        await _supabase.from('time_logs').insert({
          restaurant_id: restaurantId,
          staff_id: staffId,
          log_date: date,
          time_in: time
        });
        document.getElementById('qr-result').innerText = `${staff.name} отметил приход в ${time}`;
        showToast('Приход: ' + staff.name);
      } else {
        await _supabase.from('time_logs').update({time_out: time}).eq('id', existing.id);
        document.getElementById('qr-result').innerText = `${staff.name} отметил уход в ${time}`;
        showToast('Уход: ' + staff.name);
      }
    },
    (error) => {}
  );

  renderManualButtons();
}

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
      log_date: today,
      time_in: time,
      restaurant_id: restaurantId
    });
    showToast('Приход отмечен: ' + time);
  } else {
    const { data: log } = await _supabase.from('time_logs')
.select('id')
.eq('staff_id', staffId)
.eq('log_date', today)
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

async function loadReports() {
  let content = document.getElementById('tab-reports');
  if(!document.getElementById('reportStart')) {
    content.innerHTML = `
      <h2 class="font-semibold mb-4">Табло справедливости</h2>
      <div class="card mb-4">
        <div class="text-sm text-zinc-400 mb-2">Выбери период</div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><label class="text-xs text-zinc-400">С</label><input type="date" id="reportStart" class="input-field w-full bg-zinc-900 border-zinc-700 rounded-lg p-2 text-white"></div>
          <div><label class="text-xs text-zinc-400">По</label><input type="date" id="reportEnd" class="input-field w-full bg-zinc-900 border-zinc-700 rounded-lg p-2 text-white"></div>
        </div>
        <div class="flex items-center justify-between mb-3 p-3 bg-zinc-800/50 rounded-lg">
          <span class="text-sm">Показать деньги</span>
          <button id="moneyToggle" onclick="toggleMoney()" class="w-12 h-6 bg-zinc-600 rounded-full relative">
            <div id="moneyToggleBtn" class="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-all"></div>
          </button>
        </div>
        <button onclick="loadReports()" class="w-full bg-orange-500 text-black font-semibold py-2 rounded-lg">Показать</button>
      </div>
      <div id="reportsContent"></div>
      <div id="staffDetailModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-zinc-900 rounded-2xl p-6 w-11/12 max-w-md border-zinc-800">
          <div class="flex justify-between items-center mb-4">
            <h3 id="modalStaffName" class="text-xl font-bold"></h3>
            <button onclick="closeStaffModal()" class="text-zinc-400 hover:text-white"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>
          <div id="modalStaffData" class="space-y-3 text-sm"></div>
        </div>
      </div>
    `;
  }

  const startInput = document.getElementById('reportStart');
  const endInput = document.getElementById('reportEnd');
  if(!startInput.value) startInput.value = new Date().toISOString().slice(0,7) + '-01';
  if(!endInput.value) endInput.value = new Date().toISOString().split('T')[0];

  const startDate = startInput.value;
  const endDate = endInput.value;
  const showMoney = window.showMoneyReports || false;

  const { data: plan } = await _supabase.from('work_schedules')
.select('staff_id, date, staff(name, pay_type, hourly_rate, daily_rate)')
.gte('date', startDate).lte('date', endDate).eq('restaurant_id', restaurantId);

  let logs = [];
  if(showMoney) {
    const { data } = await _supabase.from('time_logs')
.select('staff_id, time_in, time_out, log_date')
.gte('log_date', startDate).lte('log_date', endDate).eq('restaurant_id', restaurantId);
    logs = data || [];
  }

  const stats = {};
  staffList.forEach(st => {
    stats[st.id] = {id: st.id, name: st.name, pay_type: st.pay_type, hour_rate: st.hourly_rate||0, day_rate: st.daily_rate||0, shifts: 0, hours: 0, pay: 0, dates: [], logs: []};
  });

  plan?.forEach(p => {
    if(stats[p.staff_id]) {
      stats[p.staff_id].shifts += 1;
      stats[p.staff_id].dates.push(p.date.slice(5));
    }
  });

  logs.forEach(l => {
    if(!stats[l.staff_id]) return;
    stats[l.staff_id].logs.push(l);
    if(!l.time_in ||!l.time_out) return;
    const hours = (new Date(`1970-01-01T${l.time_out}`) - new Date(`1970-01-01T${l.time_in}`)) / 1000 / 60 / 60;
    stats[l.staff_id].hours += hours;
  });

  Object.values(stats).forEach(s => {
    s.pay = s.pay_type === 'hourly'? s.hours * s.hour_rate : s.shifts * s.day_rate;
  });

  window.lastStats = stats;

  const sorted = Object.values(stats).sort((a,b) => a.shifts - b.shifts);

  let html = `<div class="text-sm text-zinc-400 mb-4">Период: ${startDate} → ${endDate}</div>`;

  sorted.forEach(s => {
    if(s.shifts === 0) return;
    let colorClass = s.shifts <= 5? 'border-red-500/50 bg-red-500/10' : s.shifts >= 15? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10';
    let statusText = s.shifts <= 5? '⚠️ Мало смен' : s.shifts >= 15? '🔥 Много' : '✓ Норма';

    html += `
      <div class="card mb-3 border-2 ${colorClass} cursor-pointer hover:border-orange-500/50 transition" onclick="openStaffModal('${s.id}')">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${s.name[0]}</div>
            <div>
              <div class="font-semibold text-lg">${s.name}</div>
              <div class="text-xs ${colorClass.includes('red')? 'text-red-400' : colorClass.includes('yellow')? 'text-yellow-400' : 'text-green-400'}">${statusText}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-4xl font-bold">${s.shifts}</div>
            <div class="text-xs text-zinc-400">смен</div>
          </div>
        </div>
        ${showMoney? `
        <div class="text-sm border-t border-zinc-700 pt-2 flex justify-between">
          <span class="text-zinc-400">Заработал:</span>
          <span class="font-bold text-orange-500">${s.pay.toFixed(0)}${currency}</span>
        </div>` : ''}
        <div class="text-xs text-zinc-500 mt-1">Даты: ${s.dates.join(', ')}</div>
      </div>
    `;
  });

  document.getElementById('reportsContent').innerHTML = html || '<div class="text-zinc-500 text-center py-8">Нет данных</div>';

  const toggle = document.getElementById('moneyToggle');
  const btn = document.getElementById('moneyToggleBtn');
  if(showMoney) {
    toggle.className = 'w-12 h-6 bg-orange-500 rounded-full relative';
    btn.className = 'w-5 h-5 bg-white rounded-full absolute top-0.5 left-6.5 transition-all';
  } else {
    toggle.className = 'w-12 h-6 bg-zinc-600 rounded-full relative';
    btn.className = 'w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-all';
  }

  if(typeof lucide!== 'undefined') lucide.createIcons();
}

function openStaffModal(staffId) {
  const s = window.lastStats[staffId];
  if(!s) return;
  document.getElementById('modalStaffName').innerText = s.name;
  let logsHtml = '';
  if(s.logs.length > 0) {
    logsHtml = '<div class="mt-3"><div class="text-zinc-400 text-xs mb-2">Отметки:</div>';
    s.logs.forEach(l => {
      logsHtml += `<div class="text-xs bg-zinc-800 p-2 rounded mb-1">${l.log_date}: ${l.time_in || '--'} → ${l.time_out || '--'}</div>`;
    });
    logsHtml += '</div>';
  } else {
    logsHtml = '<div class="text-xs text-zinc-500 mt-3">Нет отметок времени</div>';
  }
  document.getElementById('modalStaffData').innerHTML = `
    <div class="flex justify-between"><span class="text-zinc-400">Тип оплаты:</span><span class="font-semibold">${s.pay_type === 'hourly'? 'Почасовой' : 'Фикс за день'}</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Ставка:</span><span class="font-semibold">${s.pay_type === 'hourly'? s.hour_rate : s.day_rate}${currency}</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Смен всего:</span><span class="font-semibold">${s.shifts}</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Часов всего:</span><span class="font-semibold">${s.hours.toFixed(2)} ч</span></div>
    <div class="flex justify-between border-t border-zinc-700 pt-2"><span class="text-zinc-400">Заработал:</span><span class="font-bold text-orange-500">${s.pay.toFixed(0)}${currency}</span></div>
    ${logsHtml}
  `;
  document.getElementById('staffDetailModal').classList.remove('hidden');
  document.getElementById('staffDetailModal').classList.add('flex');
  if(typeof lucide!== 'undefined') lucide.createIcons();
}

function closeStaffModal() {
  document.getElementById('staffDetailModal').classList.add('hidden');
  document.getElementById('staffDetailModal').classList.remove('flex');
}

function toggleMoney() {
  window.showMoneyReports =!window.showMoneyReports;
  loadReports();
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
  toast.innerText = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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

function openTaskModal() {
  const select = document.getElementById('taskCook');
  if(!select) {
    console.error('Не найден select #taskCook');
    return;
  }

  if(staffList.length === 0) {
    select.innerHTML = '<option>Сначала добавь поваров...</option>';
    return;
  }

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

  if(!staff_id ||!title) {
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
