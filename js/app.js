import {renderStaffView} from './views/staff.js';
import {api, CURRENT_RESTAURANT_ID} from './api.js';

const app = document.getElementById('app');
const pageTitle = document.getElementById('pageTitle');

async function renderView(view){
  if(view==='staff'){
    app.innerHTML = '<div class="loading">Загрузка...</div>';
    const staff = await api.getStaff();
    app.innerHTML = renderStaffView(staff);
    attachStaffEvents(staff);
    updateAllPays(staff);
  } else {
    app.innerHTML = `<div class="empty">Раздел "${view}" в разработке</div>`;
  }
}

function attachStaffEvents(staffList){
  // QR для нового повара
  document.getElementById('addStaffBtn').onclick = async ()=>{
    const token = await api.createStaffInvite('Повар')
    const link = `${window.location.origin}/staff.html?invite=${token}`
    document.getElementById('inviteLink').value = link
    document.getElementById('qrBox').innerHTML =
      `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(link)}">`
    document.getElementById('inviteModal').classList.add('show')
  }
  document.getElementById('closeModal').onclick = ()=>document.getElementById('inviteModal').classList.remove('show')
  document.getElementById('copyLink').onclick = ()=>navigator.clipboard.writeText(document.getElementById('inviteLink').value)

  // Карточки поваров
  app.querySelectorAll('.staff-card').forEach(card=>{
    const id = card.dataset.id;
    const calendarBtn = card.querySelector('.calendar-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    const fireBtn = card.querySelector('.fire-btn');
    const cont = card.querySelector('.calendar-container');

    calendarBtn.onclick = async ()=>{
      cont.style.display = cont.style.display==='none'? 'block' : 'none';
      if(cont.innerHTML==='') {
        const month = new Date().toISOString().slice(0,7);
        const shifts = await api.getShifts(id, month);
        cont.innerHTML = renderCalendar(id, month, shifts);
        attachCalendarEvents(id, cont, card);
      }
    }

    deleteBtn.onclick = async ()=>{ if(confirm('Удалить навсегда?')){ await api.deleteStaff(id); card.remove(); }}
    fireBtn.onclick = async ()=>{ if(confirm('Уволить?')){ await api.fireStaff(id); card.remove(); }}
  })
}

function renderCalendar(staffId, month, shifts){
  const [y,m] = month.split('-').map(Number);
  const daysInMonth = new Date(y,m,0).getDate();
  const shiftMap = Object.fromEntries(shifts.map(s=>[s.date,s]));

  let html = `<div class="calendar-header">${y}-${m} <button id="addManual-${staffId}">+ ручная смена</button></div><div class="calendar-grid">`;
  for(let d=1;d<=daysInMonth;d++){
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls = shiftMap[dateStr]? 'day worked' : 'day';
    html += `<button class="${cls}" data-date="${dateStr}">${d}</button>`;
  }
  html += '</div>';
  return html;
}

function attachCalendarEvents(staffId, container, card){
  document.getElementById(`addManual-${staffId}`).onclick = ()=>{
    const modal = document.getElementById('manualModal');
    modal.classList.add('show');
    modal.dataset.staffId = staffId;
  }
  document.getElementById('closeManual').onclick = ()=>document.getElementById('manualModal').classList.remove('show')
  document.getElementById('saveManual').onclick = async ()=>{
    const staffId = document.getElementById('manualModal').dataset.staffId;
    const date = document.getElementById('manualDate').value;
    const inT = document.getElementById('manualIn').value;
    const outT = document.getElementById('manualOut').value;
    await api.addManualShift(staffId, date, inT, outT);
    document.getElementById('manualModal').classList.remove('show');
    calendarBtn.click(); calendarBtn.click(); // перезагрузить
  }
}

async function updateAllPays(staffList){
  const month = new Date().toISOString().slice(0,7);
  for(const s of staffList){
    const shifts = await api.getShifts(s.id, month);
    const pay = await api.calcPay(s, shifts);
    const el = document.getElementById(`pay-${s.id}`);
    if(el) el.textContent = `ЗП за ${m} месяц: ${pay.toLocaleString()}₽`;
  }
}

// меню
document.querySelectorAll('.menu-item').forEach(btn=>{
  btn.onclick = async () => {
    document.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    pageTitle.textContent = btn.textContent.replace(/👥|📅|🔲|📊 /,'');
    await renderView(btn.dataset.view);
  }
})

renderView('staff');
