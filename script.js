// ====== 1. КОНФИГ + SUPABASE ======
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('rest');

if(!restaurantId) {
  document.getElementById('errorBox').classList.remove('hidden');
} else {
  document.getElementById('mainContent').classList.remove('hidden');
  init();
}

async function init() {
  await loadRestaurantName();
  await loadStaff();
  loadSidebar();
  setTab('staff');
  lucide.createIcons();
}

function loadSidebar() {
  const html = `
  <div class="sidebar w-64 p-4 hidden md:block">
    <h2 class="text-xl font-bold mb-6 px-2">HotPit</h2>
    <div class="space-y-2">
      <button onclick="openKitchenPanel()" class="kitchen-btn w-full text-left">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path></svg>
        <div><p>ЭКРАН ШЕФА</p><p class="text-xs text-zinc-400">Панель управления</p></div>
      </button>
      <div class="sidebar-item active" onclick="setTab('staff', event)"><i data-lucide="users" class="w-5 h-5"></i><span>Повара</span></div>
      <div class="sidebar-item" onclick="setTab('prod', event)"><i data-lucide="calendar" class="w-5 h-5"></i><span>График</span></div>
      <div class="sidebar-item" onclick="setTab('qr', event)"><i data-lucide="qr-code" class="w-5 h-5"></i><span>QR Сканер</span></div>
      <div class="sidebar-item" onclick="setTab('reports', event)"><i data-lucide="bar-chart" class="w-5 h-5"></i><span>Отчёты</span></div>
    </div>
  </div>`;
  document.getElementById('sidebarContainer').innerHTML = html;
}

let currentPayType = 'hourly';
function openAddModal(){ document.getElementById('addModal').classList.remove('hidden'); document.getElementById('addModal').classList.add('flex'); }
function closeAddModal(){ document.getElementById('addModal').classList.add('hidden'); document.getElementById('newStaffName').value=''; document.getElementById('newStaffRate').value=''; }
function selectPayType(type){
  currentPayType = type;
  document.getElementById('payHourly').className = type==='hourly'? 'active flex-1 bg-orange-500 text-black py-2 rounded-lg' : 'inactive flex-1 bg-zinc-700 py-2 rounded-lg';
  document.getElementById('payDaily').className = type==='daily'? 'active flex-1 bg-orange-500 text-black py-2 rounded-lg' : 'inactive flex-1 bg-zinc-700 py-2 rounded-lg';
}// ====== 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ======
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

// ====== 12. QR СКАНЕР + РУЧНОЙ ВВОД ======
async function startQrScanner() {
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch(e){}
  }
  html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (decodedText) => {
      const staffId = decodedText;
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) {
        showToast('Повар не найден');
        return;
      }

      const now = new Date();
      const time = now.toTimeString().slice(0,8);
      const date = now.toISOString().split('T')[0];

      const { data: existing } = await _supabase.from('time_logs')
      .select('*')
      .eq('staff_id', staffId)
      .eq('log_date', date)
      .is('time_out', null)
      .maybeSingle(); // single() падал если нет записи

      if (!existing) {
        await _supabase.from('time_logs').insert({
          restaurant_id: restaurantId,
          staff_id: staffId,
          log_date: date,
          time_in: time
        });
        document.getElementById('qr-result') && (document.getElementById('qr-result').innerText = `${staff.name} отметил приход в ${time}`);
        showToast('Приход: ' + staff.name);
      } else {
        await _supabase.from('time_logs').update({time_out: time}).eq('id', existing.id);
        document.getElementById('qr-result') && (document.getElementById('qr-result').innerText = `${staff.name} отметил уход в ${time}`);
        showToast('Уход: ' + staff.name);
      }
      renderManualButtons(); // обновляем кнопки после скана
    },
    (error) => {}
  ).catch(err => {
    console.warn('QR не запустился:', err);
    document.getElementById('qr-result') && (document.getElementById('qr-result').innerText = 'Камера не доступна');
  });

  renderManualButtons();
}

async function renderManualButtons() {
  const today = new Date().toISOString().split('T')[0];
  const listEl = document.getElementById('manualStaffList');
  if(!listEl) return;

  const { data: todayShifts } = await _supabase.from('work_schedules')
  .select('staff_id, staff(name)')
  .eq('date', today)
  .eq('restaurant_id', restaurantId);

  if(!todayShifts || todayShifts.length === 0) {
    listEl.innerHTML = '<div class="col-span-2 text-zinc-500 text-sm text-center py-4">Сегодня по графику никто не стоит</div>';
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

  listEl.innerHTML = html;
  if (typeof lucide!== 'undefined') lucide.createIcons();
}

async function manualCheck(staffId, type) {
  const now = new Date();
  const time = now.toTimeString().slice(0,8);
  const date = now.toISOString().split('T')[0];
  const staff = staffList.find(s => s.id === staffId);

  const { data: existing } = await _supabase.from('time_logs')
  .select('*')
  .eq('staff_id', staffId)
  .eq('log_date', date)
  .maybeSingle();

  if(type === 'in') {
    if(existing?.time_in) return showToast('Приход уже отмечен');
    if(existing) {
      await _supabase.from('time_logs').update({time_in: time}).eq('id', existing.id);
    } else {
      await _supabase.from('time_logs').insert({
        restaurant_id: restaurantId,
        staff_id: staffId,
        log_date: date,
        time_in: time
      });
    }
    showToast(`Приход: ${staff.name}`);
    document.getElementById('qr-result') && (document.getElementById('qr-result').innerText = `${staff.name} отметил приход в ${time}`);
  } else {
    if(!existing?.time_in) return showToast('Сначала отметь приход');
    if(existing.time_out) return showToast('Уход уже отмечен');
    await _supabase.from('time_logs').update({time_out: time}).eq('id', existing.id);
    showToast(`Уход: ${staff.name}`);
    document.getElementById('qr-result') && (document.getElementById('qr-result').innerText = `${staff.name} отметил уход в ${time}`);
  }
  renderManualButtons();
}

function showToast(msg) {
  // простая тост-заглушка, если у тебя нет своей
  const t = document.createElement('div');
  t.textContent = msg;
  t.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg z-50';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2000);
}

// ====== 13. ЭКСПОРТ ДЛЯ HTML ======
window.startQrScanner = startQrScanner;
window.renderManualButtons = renderManualButtons;
window.manualCheck = manualCheck;

// ====== 14. ОТЧЁТЫ + ТАБЛО СПРАВЕДЛИВОСТИ ======
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
        <button onclick="exportExcel()" class="w-full mt-2 bg-zinc-700 text-white font-semibold py-2 rounded-lg">Экспорт Excel</button>
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
    stats[l.staff_id].hours += hours > 0? hours : 0;
  });

  Object.values(stats).forEach(s => {
    s.pay = s.pay_type === 'hourly'? s.hours * s.hour_rate : s.shifts * s.day_rate;
  });

  window.lastStats = stats;

  const sorted = Object.values(stats).sort((a,b) => b.shifts - a.shifts); // сортировка: больше смен сверху

  let html = `<div class="text-sm text-zinc-400 mb-4">Период: ${startDate} → ${endDate}</div>`;

  sorted.forEach(s => {
    if(s.shifts === 0) return;
    let colorClass = s.shifts <= 5? 'border-red-500/50 bg-red-500/10' : s.shifts >= 15? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10';
    let statusText = s.shifts <= 5? '⚠️ Мало смен' : s.shifts >= 15? '🔥 Много' : '✓ Норма';

    html += `
      <div class="card mb-3 border-2 ${colorClass} cursor-pointer hover:border-orange-500/50 transition" onclick="openStaffModal('${s.id}')">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold">${s.name?.[0] || '?'}</div>
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

  document.getElementById('reportsContent') && (document.getElementById('reportsContent').innerHTML = html || '<div class="text-zinc-500 text-center py-8">Нет данных</div>');

  const toggle = document.getElementById('moneyToggle');
  const btn = document.getElementById('moneyToggleBtn');
  if(showMoney) {
    toggle.className = 'w-12 h-6 bg-orange-500 rounded-full relative';
    btn.className = 'w-5 h-5 bg-white rounded-full absolute top-0.5 left-6 transition-all';
  } else {
    toggle.className = 'w-12 h-6 bg-zinc-600 rounded-full relative';
    btn.className = 'w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-all';
  }

  if(typeof lucide!== 'undefined') lucide.createIcons();
}

function toggleMoney() {
  window.showMoneyReports =!window.showMoneyReports;
  loadReports();
}

function openStaffModal(staffId) {
  const s = window.lastStats?.[staffId];
  if(!s) return;
  document.getElementById('modalStaffName').textContent = s.name;
  document.getElementById('modalStaffData').innerHTML = `
    <div class="flex justify-between"><span>Смен по плану:</span><b>${s.shifts}</b></div>
    <div class="flex justify-between"><span>Отработано часов:</span><b>${s.hours.toFixed(1)}ч</b></div>
    <div class="flex justify-between"><span>Тип оплаты:</span><b>${s.pay_type==='hourly'?'Почасовой':'За день'}</b></div>
    <div class="flex justify-between"><span>Ставка:</span><b>${s.pay_type==='hourly'?s.hour_rate+'${currency}/ч':s.day_rate+'${currency}/день'}</b></div>
    <div class="flex justify-between text-orange-500"><span>Итого:</span><b>${s.pay.toFixed(0)}${currency}</b></div>
    <div class="pt-2 border-t border-zinc-700"><span class="text-zinc-400">Даты:</span> ${s.dates.join(', ')}</div>
  `;
  document.getElementById('staffDetailModal').classList.remove('hidden');
  document.getElementById('staffDetailModal').classList.add('flex');
}

function closeStaffModal() {
  document.getElementById('staffDetailModal').classList.add('hidden');
  document.getElementById('staffDetailModal').classList.remove('flex');
}

function exportExcel() {
  const stats = window.lastStats;
  if(!stats) return alert('Сначала нажми "Показать" в отчётах');

  let csv = 'Повар,Смен,Часов,Тип,Ставка,Зарплата\n';
  Object.values(stats).forEach(s => {
    if(s.shifts > 0) {
      const rate = s.pay_type==='hourly'? s.hour_rate+'${currency}/ч' : s.day_rate+'${currency}/день';
      csv += `${s.name},${s.shifts},${s.hours.toFixed(1)},${s.pay_type},${rate},${s.pay.toFixed(0)}${currency}\n`;
    }
  });

  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `otchet_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== 15. ЭКСПОРТ ДЛЯ HTML ======
window.loadReports = loadReports;
window.toggleMoney = toggleMoney;
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;
window.exportExcel = exportExcel;

// ====== 16. КУХОННАЯ ПАНЕЛЬ + ЗАДАЧИ ======
function openKitchenPanel() {
  document.getElementById('kitchenPanel') && (document.getElementById('kitchenPanel').style.right = '0px');
  document.getElementById('kitchenOverlay') && (document.getElementById('kitchenOverlay').style.display = 'block');
  loadRestaurantNamePanel();
}

function closeKitchenPanel() {
  document.getElementById('kitchenPanel') && (document.getElementById('kitchenPanel').style.right = '-400px');
  document.getElementById('kitchenOverlay') && (document.getElementById('kitchenOverlay').style.display = 'none');
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
  document.getElementById('taskModal')?.classList.add('show');
}

function closeTaskModal() {
  document.getElementById('taskModal')?.classList.remove('show');
  document.getElementById('taskTitle') && (document.getElementById('taskTitle').value = '');
  document.getElementById('taskDesc') && (document.getElementById('taskDesc').value = '');
}

async function saveTask() {
  const staff_id = document.getElementById('taskCook')?.value;
  const title = document.getElementById('taskTitle')?.value.trim();
  const description = document.getElementById('taskDesc')?.value.trim();

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
  showToast('Задание отправлено!');
  closeTaskModal();
}

// ====== 17. ФИНАЛЬНЫЙ ЭКСПОРТ ======
window.openKitchenPanel = openKitchenPanel;
window.closeKitchenPanel = closeKitchenPanel;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveTask = saveTask;
