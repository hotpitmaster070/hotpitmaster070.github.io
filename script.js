const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam9na3lyb3B5b2N2dXVvZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODA5MjgsImV4cCI6MjA5Mzg1NjkyOH0.e7m1owNpYoqTpnGRKeEiMlTAIp0T0bAe28v6MX-MyVs'
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('rest');

let staffList = [];
let currentPayType = 'hourly';
let currentDate = new Date();
let viewMode = 'day';
let html5QrcodeScanner = null;
window.showMoneyReports = false;
window.lastStats = {};

document.addEventListener('DOMContentLoaded', () => {
  loadSidebar();
  init();
  document.getElementById('dateTitle').innerText = new Date().toLocaleDateString('ru-RU', {day:'numeric', month:'long', weekday:'short'});
});

async function init() {
  if(!restaurantId) {
    document.getElementById('app').innerHTML = '<div class="w-full h-screen flex items-center justify-center p-4"><div class="bg-zinc-800 rounded-xl p-6 text-center"><h2 class="text-xl font-bold mb-4 text-red-500">Ошибка</h2><p class="text-zinc-400">Открой через свою панель HotPit по ссылке с ?rest=UUID</p></div></div>';
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
    <div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold">HotPit</h2><button class="md:hidden text-2xl" onclick="toggleSidebar()">×</button></div>
    <div class="space-y-2">
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg bg-orange-500 cursor-pointer" onclick="setTab('staff', event)"><i data-lucide="users" class="w-5 h-5"></i>Повара</div>
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 cursor-pointer" onclick="setTab('prod', event)"><i data-lucide="calendar" class="w-5 h-5"></i>График</div>
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 cursor-pointer" onclick="setTab('qr', event)"><i data-lucide="qr-code" class="w-5 h-5"></i>QR Сканер</div>
      <div class="sidebar-item flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 cursor-pointer" onclick="setTab('reports', event)"><i data-lucide="bar-chart" class="w-5 h-5"></i>Отчёты</div>
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
  const {data, error} = await _supabase.from('restaurants').select('name').eq('id',restaurantId).single();
  if(error) console.error('loadRestaurantName:', error);
  if(data) document.getElementById('restNameHeader').innerText = data.name || 'Ресторан';
}

async function loadStaff() {
  const {data, error} = await _supabase.from('staff').select('*').eq('restaurant_id',restaurantId);
  if(error) { console.error(error); document.getElementById('staffList').innerHTML='<div class="text-red-400">Ошибка загрузки поваров</div>'; return; }
  staffList = data || [];
  if(staffList.length===0) {
    document.getElementById('staffList').innerHTML = '<div class="text-zinc-400 text-center py-8">Поваров нет. Жми "+ Добавить"</div>';
    return;
  }
  document.getElementById('staffList').innerHTML = staffList.map(s => `
    <div class="bg-zinc-700 p-3 rounded-lg flex justify-between items-center">
      <div class="flex items-center gap-3 cursor-pointer" onclick="openStaffModal('${s.id}')">
        <div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">${s.name[0].toUpperCase()}</div>
        <div><div class="font-semibold">${s.name}</div><div class="text-xs text-zinc-400">${new Date().toISOString().slice(0,10)}</div></div>
      </div>
      <button onclick="toggleShiftToday('${s.id}')" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold">В смене ✓</button>
    </div>
  `).join('');
}

function openAddModal(){ document.getElementById('addModal').classList.remove('hidden'); document.getElementById('addModal').classList.add('flex'); }
function closeAddModal(){ document.getElementById('addModal').classList.add('hidden'); document.getElementById('newStaffName').value=''; document.getElementById('newStaffRate').value=''; }
function selectPayType(type){
  currentPayType = type;
  document.getElementById('payHourly').className = type==='hourly'? 'flex-1 bg-orange-500 text-black py-2 rounded-lg font-semibold' : 'flex-1 bg-zinc-700 py-2 rounded-lg';
  document.getElementById('payDaily').className = type==='daily'? 'flex-1 bg-orange-500 text-black py-2 rounded-lg font-semibold' : 'flex-1 bg-zinc-700 py-2 rounded-lg';
}

async function addStaff() {
  const name = document.getElementById('newStaffName').value.trim();
  const rate = parseInt(document.getElementById('newStaffRate').value);
  if(!name ||!rate) return alert('Заполни имя и ставку');
  const {error} = await _supabase.from('staff').insert({restaurant_id:restaurantId,name,rate,pay_type:currentPayType});
  if(error) return alert('Ошибка: '+error.message);
  closeAddModal(); loadStaff();
}

async function toggleShiftToday(staffId) {
  const today = new Date().toISOString().slice(0,10);
  const {data: existing} = await _supabase.from('shifts').select('id').eq('staff_id',staffId).eq('date',today).single();
  if(existing) {
    await _supabase.from('shifts').delete().eq('id',existing.id);
    alert('Смена закрыта');
  } else {
    await _supabase.from('shifts').insert({staff_id:staffId,restaurant_id:restaurantId,date:today,start_time:new Date().toISOString()});
    alert('Смена открыта');
  }
  loadSchedule();
}

function openStaffModal(staffId){
  const s = staffList.find(x=>x.id===staffId);
  if(!s) return;
  const stats = window.lastStats[staffId] || {shifts:0,pay:0};
  document.getElementById('modalStaffName').innerText = s.name;
  document.getElementById('modalStaffData').innerHTML = `
    <div class="flex justify-between"><span class="text-zinc-400">Тип оплаты:</span><span>${s.pay_type==='hourly'?'Почасовой':'Фикс за день'}</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Ставка:</span><span>${s.rate}₽</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Смен всего:</span><span>${stats.shifts}</span></div>
    <div class="flex justify-between"><span class="text-zinc-400">Заработал:</span><span class="text-orange-500">${stats.pay}₽</span></div>
    <div class="text-xs text-zinc-500 mt-3">Нет отметок времени</div>
  `;
  document.getElementById('staffDetailModal').classList.remove('hidden');
  document.getElementById('staffDetailModal').classList.add('flex');
}
function closeStaffModal(){ document.getElementById('staffDetailModal').classList.add('hidden'); }

function setView(mode){
  viewMode = mode;
  document.getElementById('viewDay').className = mode==='day'? 'bg-orange-500 text-black px-4 py-2 rounded-lg font-semibold' : 'bg-zinc-700 px-4 py-2 rounded-lg';
  document.getElementById('viewMonth').className = mode==='month'? 'bg-orange-500 text-black px-4 py-2 rounded-lg font-semibold' : 'bg-zinc-700 px-4 py-2 rounded-lg';
  loadSchedule();
}

async function loadSchedule() {
  const content = document.getElementById('scheduleContent');
  if(viewMode==='day') {
    const today = new Date().toISOString().slice(0,10);
    const {data: shifts, error} = await _supabase.from('shifts').select('*,staff(name)').eq('restaurant_id',restaurantId).eq('date',today);
    if(error) { content.innerHTML='<div class="text-red-400">Ошибка загрузки смен</div>'; return; }
    if(!shifts || shifts.length===0) {
      content.innerHTML = '<div class="text-zinc-400 text-center py-8">Сегодня никто не работает</div>';
      return;
    }
    content.innerHTML = shifts.map(sh => `
      <div class="bg-zinc-700 p-3 rounded-lg flex justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">${sh.staff.name[0].toUpperCase()}</div>
          <div><div class="font-semibold">${sh.staff.name}</div><div class="text-xs text-zinc-400">С ${new Date(sh.start_time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div></div>
        </div>
      </div>
    `).join('');
  } else {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const {data: shifts} = await _supabase.from('shifts').select('date,staff_id').eq('restaurant_id',restaurantId).gte('date',`${year}-${String(month+1).padStart(2,'0')}-01`).lte('date',`${year}-${String(month+1).padStart(2,'0')}-${daysInMonth}`);
    
    const shiftDays = {};
    (shifts||[]).forEach(s=>{ shiftDays[s.date]=true; });
    
    let html = '<div class="grid grid-cols-7 gap-1 text-xs mb-2">';
    html += ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<div class="text-center text-zinc-500 py-1">${d}</div>`).join('');
    const firstDay = new Date(year,month,1).getDay() || 7;
    const offset = firstDay===7?0:firstDay-1;
    for(let i=0;i<offset;i++) html += '<div></div>';
    for(let d=1;d<=daysInMonth;d++){
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasShift = shiftDays[dateStr];
      html += `<div class="h-10 rounded flex items-center justify-center ${hasShift?'bg-green-600':'bg-zinc-700'}">${d}</div>`;
    }
    html += '</div>';
    content.innerHTML = html;
  }
}

async function loadReports() {
  const from = document.getElementById('reportFrom').value || new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const to = document.getElementById('reportTo').value || new Date().toISOString().slice(0,10);
  document.getElementById('reportFrom').value = from;
  document.getElementById('reportTo').value = to;
  
  const {data: shifts, error} = await _supabase.from('shifts').select('*,staff(*)').eq('restaurant_id',restaurantId).gte('date',from).lte('date',to);
  if(error) { document.getElementById('reportsContent').innerHTML='<div class="text-red-400">Ошибка отчёта</div>'; return; }
  
  const stats = {};
  (shifts||[]).forEach(s=>{
    if(!stats[s.staff_id]) stats[s.staff_id] = {name:s.staff.name,rate:s.staff.rate,pay_type:s.staff.pay_type,shifts:0,pay:0};
    stats[s.staff_id].shifts++;
    if(s.staff.pay_type==='daily') stats[s.staff_id].pay += s.staff.rate;
    else stats[s.staff_id].pay += s.staff.rate * 8;
  });
  window.lastStats = stats;
  
  if(Object.keys(stats).length===0) {
    document.getElementById('reportsContent').innerHTML = '<div class="text-zinc-400">Нет смен за период</div>';
    return;
  }
  
  document.getElementById('reportsContent').innerHTML = Object.entries(stats).map(([id,s])=>`
    <div class="bg-zinc-700 p-3 rounded-lg">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">${s.name[0].toUpperCase()}</div>
          <div><div class="font-semibold">${s.name}</div>${s.shifts<5?'<div class="text-xs text-yellow-500">⚠ Мало смен</div>':''}</div>
        </div>
        <div class="text-2xl font-bold">${s.shifts} смен</div>
      </div>
      ${window.showMoneyReports?`<div class="mt-2 text-sm">Заработал: <span class="text-orange-500">${s.pay}₽</span></div>`:''}
      <div class="text-xs text-zinc-400">Даты: ${from} - ${to}</div>
    </div>
  `).join('');
}

function toggleMoney(){ window.showMoneyReports = document.getElementById('showMoney').checked; loadReports(); }

function startQrScanner(){
  if(html5QrcodeScanner) return;
  html5QrcodeScanner = new Html5Qrcode("qr-reader");
  html5QrcodeScanner.start({facingMode:"environment"},{fps:10,qrbox:250},(decoded)=>{
    document.getElementById('qr-result').innerText = 'Сканирован: '+decoded;
  },()=>{});
}
function stopQrScanner(){ if(html5QrcodeScanner) html5QrcodeScanner.stop(); html5QrcodeScanner=null; }

function toggleSidebar(){ 
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sb.classList.toggle('-translate-x-full'); 
  overlay.classList.toggle('hidden');
     }
