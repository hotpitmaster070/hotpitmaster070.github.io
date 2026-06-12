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
