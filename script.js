// ===== SUPABASE =====
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let staffList = [];
let currency = '₽';
let currentDate = new Date();
let currentView = 'day';

// ===== ЗАПУСК ПОСЛЕ ЗАГРУЗКИ DOM =====
document.addEventListener('DOMContentLoaded', async () => {
  if(typeof lucide !== 'undefined') lucide.createIcons();
  
  const page = location.pathname.split('/').pop();
  const restId = new URLSearchParams(location.search).get('rest');
  
  // Если нет rest - показываем ошибку
  if(!restId && page !== 'index.html') {
    document.getElementById('mainContent')?.classList.add('hidden');
    document.getElementById('errorBox')?.classList.remove('hidden');
    return;
  }
  
  // Загружаем меню + подставляем UUID
  await loadMenu(restId);
  
  // В зависимости от страницы грузим своё
  if(page === 'chef.html') {
    await initChefPage(restId);
  } else if(page === 'schedule.html') {
    await initSchedulePage(restId);
  } else if(page === 'index.html' || page === '') {
    // главная - ничего
  }
});

// ===== МЕНЮ =====
async function loadMenu(restId) {
  const container = document.getElementById('sidebarContainer');
  if(!container) return;
  
  const html = await fetch('menu.html').then(r=>r.text());
  container.innerHTML = html;
  
  // Подставляем UUID во все ссылки
  if(restId) {
    document.querySelectorAll('[data-rest]').forEach(a => {
      a.href = a.href.replace('?rest=', '?rest=' + restId);
    });
  }
  
  // Подсвечиваем активную страницу
  const page = location.pathname.split('/').pop();
  if(page === 'chef.html') {
    document.querySelector('[data-rest]')?.classList.add('active');
  }
  
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

// ===== СТРАНИЦА CHEF.HTML =====
async function initChefPage(restId) {
  await loadRestaurantName(restId);
  await loadStaffList(restId); // Грузим поваров для модалки
}

// Загрузка названия ресторана на экране шефа
async function loadRestaurantName(restId) {
  const nameEl = document.getElementById('restNameKitchen');
  if(!nameEl) return;
  
  const { data, error } = await _supabase.from('restaurants').select('name').eq('id', restId).single();
  nameEl.textContent = error ? 'Ошибка загрузки' : (data?.name || 'Ресторан');
}

// Загрузка поваров в массив для селекта
async function loadStaffList(restId) {
  const { data } = await _supabase.from('staff')
    .select('*')
    .eq('restaurant_id', restId)
    .order('name');
  staffList = data || [];
}

// ОТКРЫТЬ МОДАЛКУ ЗАДАНИЯ - ГЛОБАЛЬНАЯ ФУНКЦИЯ
window.openTaskModal = function() {
  const modal = document.getElementById('taskModal');
  const select = document.getElementById('taskCook');
  if(!modal || !select) return;
  
  if(staffList.length === 0) {
    select.innerHTML = '<option value="">Сначала добавь поваров в разделе "Повара"</option>';
  } else {
    select.innerHTML = '<option value="">Выбери повара...</option>' +
      staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }
  
  modal.classList.add('show');
}

// ЗАКРЫТЬ МОДАЛКУ
window.closeTaskModal = function() {
  const modal = document.getElementById('taskModal');
  if(!modal) return;
  modal.classList.remove('show');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
}

// СОХРАНИТЬ ЗАДАНИЕ
window.saveTask = async function() {
  const restId = new URLSearchParams(location.search).get('rest');
  const staff_id = document.getElementById('taskCook').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  
  if(!staff_id || !title) {
    alert('Выбери повара и напиши заголовок!');
    return;
  }

  const { error } = await _supabase.from('tasks').insert({
    restaurant_id: restId,
    staff_id: staff_id,
    title: title,
    description: description,
    status: 'new',
    created_at: new Date().toISOString()
  });

  if(error) {
    alert('Ошибка: ' + error.message);
    return;
  }
  
  alert('Задание отправлено повару!');
  closeTaskModal();
}

// ===== СТРАНИЦА SCHEDULE.HTML =====
async function initSchedulePage(restId) {
  await loadCurrency(restId);
  await loadStaffList(restId);
  updateDateTitle();
  setView(localStorage.getItem('hotpit_view') || 'day');
}

async function loadCurrency(restId) {
  const { data } = await _supabase.from('restaurants').select('currency').eq('id', restId).single();
  const map = {'RUB':'₽','USD':'$','EUR':'€','AED':'د.إ','TRY':'₺','KZT':'₸','AZN':'₼'};
  currency = map[(data?.currency || 'RUB').toUpperCase()] || '₽';
}

// Тут дальше твои функции schedule: updateDateTitle, changeDay, loadSchedule и т.д.
// Я их не трогаю чтобы не сломать. Если надо - скину полный schedule.js

// ===== ОБЩИЕ ФУНКЦИИ =====
function toggleSidebar() {
  document.getElementById('sidebarMobile')?.classList.toggle('left-[-280px]');
  document.getElementById('overlay')?.classList.toggle('hidden');
}

function openKitchenPanel() {
  document.getElementById('kitchenPanel').style.right = '0px';
  document.getElementById('kitchenOverlay').style.display = 'block';
}
function closeKitchenPanel() {
  document.getElementById('kitchenPanel').style.right = '-400px';
  document.getElementById('kitchenOverlay').style.display = 'none';
    }
