// Вставляем в script.js - ПОД ТВОЙ SCHEDULE.HTML

// ===== SCHEDULE.HTML - ПОВАРА =====
let currentPayType = 'hourly';
let currentDate = new Date();
let currentView = 'day';

async function initStaffPage(restId) {
  await loadStaffList(restId);
  renderStaffList(restId);
}

window.openAddModal = function() {
  document.getElementById('addModal').classList.add('show');
}
window.closeAddModal = function() {
  document.getElementById('addModal').classList.remove('show');
  document.getElementById('newStaffName').value = '';
  document.getElementById('newStaffRate').value = '';
}

window.selectPayType = function(type) {
  currentPayType = type;
  document.getElementById('payHourly').className = type==='hourly' ? 'active' : 'inactive';
  document.getElementById('payDaily').className = type==='daily' ? 'active' : 'inactive';
}

window.addStaff = async function() {
  const restId = new URLSearchParams(location.search).get('rest');
  const name = document.getElementById('newStaffName').value.trim();
  const rate = document.getElementById('newStaffRate').value;
  
  if(!name || !rate) return alert('Заполни имя и ставку!');
  
  await _supabase.from('staff').insert({
    restaurant_id: restId,
    name: name,
    rate: parseInt(rate),
    pay_type: currentPayType
  });
  
  closeAddModal();
  loadStaffList(restId).then(() => renderStaffList(restId));
}

async function loadStaffList(restId) {
  const { data } = await _supabase.from('staff')
   .select('*').eq('restaurant_id', restId).order('name');
  staffList = data || [];
}

function renderStaffList(restId) {
  const list = document.getElementById('staffList');
  if(!staffList.length) {
    list.innerHTML = '<div class="text-zinc-500 text-sm">Поваров нет. Добавь первого</div>';
    return;
  }
  
  list.innerHTML = staffList.map(s => `
    <div class="card flex justify-between items-center">
      <div>
        <h3 class="font-bold">${s.name}</h3>
        <p class="text-xs text-zinc-500">${s.pay_type==='hourly'? s.rate+'₽/час' : s.rate+'₽/день'}</p>
      </div>
      <button onclick="deleteStaff('${s.id}')" class="text-red-500 text-sm">Удалить</button>
    </div>
  `).join('');
  
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

window.deleteStaff = async function(id) {
  if(confirm('Удалить повара?')) {
    await _supabase.from('staff').delete().eq('id', id);
    location.reload();
  }
}

// ===== SCHEDULE.HTML - ГРАФИК =====
async function initSchedulePage(restId) {
  await loadStaffList(restId);
  updateDateTitle();
  await loadSchedule(restId);
}

window.setView = async function(view) {
  currentView = view;
  document.getElementById('viewDay').className = view==='day' ? 'active' : 'inactive';
  document.getElementById('viewMonth').className = view==='month' ? 'active' : 'inactive';
  document.getElementById('dayNav').classList.toggle('hidden', view!=='day');
  document.getElementById('monthNav').classList.toggle('hidden', view!=='month');
  await loadSchedule(restId);
}

window.changeDay = async function(dir) {
  currentDate.setDate(currentDate.getDate() + dir);
  updateDateTitle();
  await loadSchedule(restId);
}

function updateDateTitle() {
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const d = currentDate;
  document.getElementById('currentDayText').textContent = d.getDate() + ' + months[d.getMonth()];
  document.getElementById('currentDateBadge').textContent = d.toISOString().split('T')[0];
  document.getElementById('currentDayWeek').textContent = days[d.getDay()];
}

async function loadSchedule(restId) {
  const content = document.getElementById('scheduleContent');
  if(currentView === 'day') {
    // Тут грузим кто работает в этот день
    const dateStr = currentDate.toISOString().split('T')[0];
    const { data: shifts } = await _supabase.from('shifts')
     .select('*, staff(name)').eq('restaurant_id', restId).eq('shift_date', dateStr);
    
    content.innerHTML = staffList.map(s => {
      const shift = shifts?.find(x => x.staff_id === s.id);
      return `
        <div class="card flex justify-between items-center cursor-pointer" onclick="toggleShift('${s.id}','${dateStr}')">
          <span>${s.name}</span>
          <span class="${shift? 'text-green-400' : 'text-zinc-600'}">${shift? '✓ Смена' : 'Выходной'}</span>
        </div>
      `;
    }).join('');
  } else {
    content.innerHTML = '<div class="text-zinc-500">Вид "Месяц" допишем позже брат</div>';
  }
}

window.toggleShift = async function(staffId, dateStr) {
  const restId = new URLSearchParams(location.search).get('rest');
  const { data } = await _supabase.from('shifts')
   .select('id').eq('staff_id', staffId).eq('shift_date', dateStr).single();
  
  if(data) await _supabase.from('shifts').delete().eq('id', data.id);
  else await _supabase.from('shifts').insert({
    restaurant_id: restId, staff_id: staffId, shift_date: dateStr,
    start_time: '09:00', end_time: '21:00'
  });
  await loadSchedule(restId);
}

// ===== QR СКАНЕР =====
async function initQRPage(restId) {
  const html5QrCode = new Html5Qrcode("qr-reader");
  const resultEl = document.getElementById('qr-result');
  
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (decodedText) => {
      resultEl.innerHTML = `Отсканировано: ${decodedText}`;
      // Тут логика прихода/ухода повара по QR
      await _supabase.from('attendances').insert({
        restaurant_id: restId,
        staff_id: decodedText, // QR должен содержать ID повара
        time_in: new Date().toISOString()
      });
      resultEl.innerHTML += '<br><span class="text-green-400">Отметка сделана!</span>';
    },
    (error) => {}
  ).catch(err => resultEl.innerHTML = 'Камера не запустилась: ' + err);
}

// ===== ОТЧЁТЫ =====
async function initReportsPage(restId) {
  // Тут считаем ФОТ по сменам
  document.getElementById('tab-reports').innerHTML += '<div class="text-sm text-zinc-500 mt-4">Отчёты подключим после теста графика</div>';
}

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', async () => {
  const page = location.pathname.split('/').pop();
  const restId = new URLSearchParams(location.search).get('rest');
  const tab = new URLSearchParams(location.search).get('tab') || 'staff';
  
  if(page === 'schedule.html') {
    await loadMenu(restId);
    if(tab === 'staff') await initStaffPage(restId);
    else if(tab === 'qr') await initQRPage(restId);
    else if(tab === 'reports') await initReportsPage(restId);
    else await initSchedulePage(restId);
  }
});
