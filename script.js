const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs'
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const restaurantId = new URLSearchParams(location.search).get('rest');
let viewMode = 'day';

document.addEventListener('DOMContentLoaded', () => {
  if(!restaurantId) {
    document.getElementById('app').innerHTML = '<div class="w-full h-screen flex items-center justify-center text-red-400">Открой через ссылку с ?rest=UUID</div>';
    return;
  }
  init();
  lucide.createIcons();
});

async function init() {
  const {data} = await _supabase.from('restaurants').select('name').eq('id',restaurantId).single();
  document.getElementById('restNameHeader').innerText = data?.name || 'Ресторан';
  loadStaff();
}

function setTab(tab, btn) {
  // скрыть все вкладки
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-'+tab).classList.remove('hidden');
  // перекрасить кнопки меню как на скрине
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('bg-orange-500'));
  btn.classList.add('bg-orange-500');
  // заголовок
  document.getElementById('pageTitle').innerText = btn.innerText.trim();
  // закрыть меню на телефоне
  if(window.innerWidth < 768) toggleSidebar();
  
  if(tab==='prod') loadSchedule();
}

async function loadStaff() {
  const {data} = await _supabase.from('staff').select('*').eq('restaurant_id',restaurantId);
  if(!data || data.length===0) {
    document.getElementById('staffList').innerHTML = '<div class="text-zinc-500 text-center py-6">Поваров нет. Жми "+ Добавить"</div>';
    return;
  }
  document.getElementById('staffList').innerHTML = data.map(s => `
    <div class="bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center font-bold text-black">${s.name[0].toUpperCase()}</div>
        <div>
          <div class="font-semibold">${s.name}</div>
          <div class="text-xs text-zinc-500">${s.rate}₽/час</div>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddModal(){ document.getElementById('addModal').classList.remove('hidden'); document.getElementById('addModal').classList.add('flex'); }
function closeAddModal(){ document.getElementById('addModal').classList.add('hidden'); document.getElementById('newStaffName').value=''; document.getElementById('newStaffRate').value=''; }

async function addStaff() {
  const name = document.getElementById('newStaffName').value.trim();
  const rate = parseInt(document.getElementById('newStaffRate').value);
  if(!name || !rate) return alert('Заполни имя и ставку');
  await _supabase.from('staff').insert({restaurant_id:restaurantId,name,rate,pay_type:'hourly'});
  closeAddModal(); loadStaff();
}

function setView(mode){
  viewMode = mode;
  document.getElementById('viewDay').className = mode==='day'? 'bg-orange-500 text-black px-4 py-2 rounded-lg text-sm' : 'bg-zinc-800 px-4 py-2 rounded-lg text-sm';
  document.getElementById('viewMonth').className = mode==='month'? 'bg-orange-500 text-black px-4 py-2 rounded-lg text-sm' : 'bg-zinc-800 px-4 py-2 rounded-lg text-sm';
  loadSchedule();
}

async function loadSchedule() {
  const box = document.getElementById('scheduleContent');
  if(viewMode==='day') {
    const today = new Date().toISOString().slice(0,10);
    const {data} = await _supabase.from('shifts').select('*,staff(name)').eq('restaurant_id',restaurantId).eq('date',today);
    box.innerHTML = data?.length ? data.map(s=>`<div class="bg-zinc-800 p-2 rounded mb-1">${s.staff.name}</div>`).join('') : '<div class="text-zinc-500">Сегодня никто не работает</div>';
  } else {
    box.innerHTML = '<div class="text-zinc-500">Месяц: календарь добавим позже</div>';
  }
}

function toggleSidebar(){ 
  document.getElementById('sidebar').classList.toggle('-translate-x-full'); 
  document.getElementById('overlay').classList.toggle('hidden');
    }
