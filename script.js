const SUPABASE_URL = 'https://xljogkyropyocvujzbb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dWp6YmIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc1MDQxNzM4NiwiZXhwIjoyMDY1OTkzMzg2fQ.XXXX'
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('rest'); // твой UUID из 2-го скрина

let staffList = [];
let currentPayType = 'hourly';
let currentDate = new Date();
let viewMode = 'day';
window.showMoneyReports = false;
window.lastStats = {};

document.addEventListener('DOMContentLoaded', () => {
  loadSidebar();
  init();
  document.getElementById('dateTitle').innerText = new Date().toLocaleDateString('ru-RU', {day:'numeric', month:'short', weekday:'short'});
});

async function init() {
  // Если нет rest - показываем ошибку, а не чёрный экран
  if(!restaurantId) {
    document.getElementById('app').innerHTML = `
      <div class="w-full h-screen flex items-center justify-center p-4">
        <div class="bg-zinc-800 rounded-xl p-6 max-w-md w-full text-center">
          <h2 class="text-xl font-bold mb-4 text-red-500">Ошибка</h2>
          <p class="text-zinc-400">Открой эту страницу через свою панель HotPit. Ссылка должна содержать ?rest=UUID</p>
        </div>
      </div>
    `;
    return;
  }
  
  await loadRestaurantName();
  await loadStaff();
  setTab('staff');
  lucide.createIcons();
}

function loadSidebar() {
  document.getElementById('sidebarContainer').innerHTML = `
  <div id="sidebar" class="fixed left-0 top-0 h-full w-64 bg-zinc-800 p-4 z-50 transform -translate-x-full md:translate-x-0 transition-transform">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">HotPit</h2>
      <button class="md:hidden" onclick="toggleSidebar()">×</button>
    </div>
    <div class="space-y-2">
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg bg-orange-500" onclick="setTab('staff', event)"><i data-lucide="users" class="w-5 h-5"></i>Повара</div>
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700" onclick="setTab('prod', event)"><i data-lucide="calendar" class="w-5 h-5"></i>График</div>
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700" onclick="setTab('qr', event)"><i data-lucide="qr-code" class="w-5 h-5"></i>QR Сканер</div>
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700" onclick="setTab('reports', event)"><i data-lucide="bar-chart" class="w-5 h-5"></i>Отчёты</div>
    </div>
  </div>`;
}

function setTab(tab, e) {
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-'+tab).classList.remove('hidden');
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('bg-orange-500'));
  if(e) e.currentTarget.classList.add('bg-orange-500');
  if(tab==='prod') loadSchedule();
  if(tab==='reports') loadReports();
  if(tab==='qr') startQrScanner();
}

async function loadRestaurantName() {
  const {data} = await _supabase.from('restaurants').select('name').eq('id',restaurantId).single();
  if(data) document.getElementById('restNameHeader').innerText = data.name || 'Ресторан';
}

async function loadStaff() {
  const {data, error} = await _supabase.from('staff').select('*').eq('restaurant_id',restaurantId);
  if(error) { console.error(error); return; }
  staffList = data || [];
  if(staffList.length===0) {
    document.getElementById('staffList').innerHTML = '<div class="text-zinc-400 text-center py-8">Поваров нет. Жми "+ Добавить"</div>';
    return;
  }
  document.getElementById('staffList').innerHTML = staffList.map(s => `
    <div class="bg-zinc-700 p-3 rounded-lg flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">${s.name[0]}</div>
        <div>
          <div class="font-semibold cursor-pointer" onclick="openStaffModal('${s.id}')">${s.name}</div>
          <div class="text-xs text-zinc-400">${new Date().toISOString().slice(0,10)}</div>
        </div>
      </div>
      <button onclick="toggleShift('${s.id}')" class="bg-green-600 px-4 py-2 rounded-lg text-sm">В смене ✓</button>
    </div>
  `).join('');
}

function openAddModal(){ document.getElementById('addModal').classList.remove('hidden'); document.getElementById('addModal').classList.add('flex'); }
function closeAddModal(){ document.getElementById('addModal').classList.add('hidden'); document.getElementById('newStaffName').value=''; document.getElementById('newStaffRate').value=''; }
function selectPayType(type){
  currentPayType = type;
  document.getElementById('payHourly').className = type==='hourly'? 'flex-1 bg-orange-500 text-black py-2 rounded-lg' : 'flex-1 bg-zinc-700 py-2 rounded-lg';
  document.getElementById('payDaily').className = type==='daily'? 'flex-1 bg-orange-500 text-black py-2 rounded-lg' : 'flex-1 bg-zinc-700 py-2 rounded-lg';
}

async function addStaff() {
  const name = document.getElementById('newStaffName').value.trim();
  const rate = parseInt(document.getElementById('newStaffRate').value);
  if(!name ||!rate) return alert('Заполни имя и ставку');
  await _supabase.from('staff').insert({restaurant_id:restaurantId,name,rate,pay_type:currentPayType});
  closeAddModal(); loadStaff();
}

async function toggleShift(staffId) {
  // заглушка. Потом сделаем реальную отметку смены
  alert('Отметка смены для '+staffId);
}

function openStaffModal(staffId){
  const s = staffList.find(x=>x.id===staffId);
  if(!s) return;
  document.getElementById('modalStaffName').innerText = s.name;
  document.getElementById('modalStaffData').innerHTML = `
    <div class="flex justify-between"><span class="text-zinc-400">Тип оплаты:</span><span>${s.pay_type==='hourly'?'Почасовой':'Фикс за день'}</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Ставка:</span><span>${s.rate}₽</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Смен всего:</span><span>0</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Заработал:</span><span class="text-orange-500">0₽</span></div>
    <div class="text-xs text-zinc-500 mt-3">Нет отметок времени</div>
  `;
  document.getElementById('staffDetailModal').classList.remove('hidden');
  document.getElementById('staffDetailModal').classList.add('flex');
}
function closeStaffModal(){ document.getElementById('staffDetailModal').classList.add('hidden'); }

function setView(mode){
  viewMode = mode;
  document.getElementById('viewDay').className = mode==='day'? 'bg-orange-500 text-black px-4 py-2 rounded-lg' : 'bg-zinc-700 px-4 py-2 rounded-lg';
  document.getElementById('viewMonth').className = mode==='month'? 'bg-orange-500 text-black px-4 py-2 rounded-lg' : 'bg-zinc-700 px-4 py-2 rounded-lg';
  loadSchedule();
}

function loadSchedule(){
  document.getElementById('scheduleContent').innerHTML = '<div class="text-zinc-400">Тут будет календарь смен как на твоих скринах</div>';
}
function loadReports(){
  document.getElementById('reportsContent').innerHTML = '<div class="text-zinc-400">Жми "Показать" для отчёта</div>';
}
function startQrScanner(){ document.getElementById('qr-result').innerText = 'Камера включится'; }
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('-translate-x-full'); }
function toggleMoney(){ window.showMoneyReports = document.getElementById('showMoney').checked; }
