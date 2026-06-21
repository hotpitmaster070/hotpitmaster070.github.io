import {api, supabase} from './api.js'
import {renderSidebar, initSidebar} from './components/sidebar.js'
import {renderStaffView} from './views/staff.js'
import {renderPassportView, initPassportActions} from './passport.js'

const app = document.getElementById('app')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')

const {data:{user}} = await supabase.auth.getUser()
if(!user){location.href='/index.html'}

document.getElementById('openSidebar').onclick = ()=>{sidebar.classList.add('open');overlay.classList.add('show')}
document.getElementById('closeSidebar').onclick = closeSidebar
overlay.onclick = closeSidebar
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('show')}
document.getElementById('logoutBtn').onclick = async ()=>{await supabase.auth.signOut();location.href='/index.html'}

// рендерим сайдбар 1 раз
sidebar.innerHTML = await renderSidebar()
initSidebar(renderView)

// стартовый экран: шефу KDS, хозяину повара
const {data: rest} = await supabase.from('restaurants').select('owner_id').eq('id', user.user_metadata?.restaurant_id).single()
renderView(rest?.owner_id === user.id ? 'staff' : 'passport')

async function renderView(view){
  if(view==='staff'){
    const staff = await api.getStaff()
    app.innerHTML = renderStaffView(staff)
    initStaffActions()
  } 
  else if(view==='passport'){
    app.innerHTML = renderPassportView()
    initPassportActions()
  } 
  else if(view==='add-chef'){
    const token = await api.createStaffInvite('chef')
    const link = `${location.origin}/join.html?token=${token}`
    app.innerHTML = `
      <div class="card" style="max-width:500px;margin:40px auto;padding:24px">
        <h2 style="color:var(--accent);margin-bottom:12px">Ссылка для шефа</h2>
        <p style="color:#a1a1aa;margin-bottom:16px">Отправь шефу эту ссылку или покажи QR</p>
        <input id="inviteLink" readonly value="${link}" style="width:100%;padding:12px;margin-bottom:12px;background:#262626;border:1px solid #333;border-radius:8px;color:#fff">
        <div style="display:flex;gap:8px;margin-bottom:20px">
          <button id="copyLink" class="primary" style="flex:1;padding:12px">Копировать</button>
          <button onclick="location.reload()" style="padding:12px;background:#3f3f46;border:1px solid #52525b;border-radius:8px;color:#fff">Закрыть</button>
        </div>
        <canvas id="qrCanvas" style="display:block;margin:0 auto"></canvas>
      </div>`
    QRCode.toCanvas(document.getElementById('qrCanvas'), link, {width:220})
    document.getElementById('copyLink').onclick = ()=>navigator.clipboard.writeText(link)
  }
  else if(view==='incoming'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">📦 Приход товара - форма накладной в разработке</div>`
  }
  else if(view==='warehouse'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">🏪 Склад - остатки в разработке</div>`
  }
  else if(view==='writeoff'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">6. [СПИСАНИЕ] - форма списания в разработке</div>`
  }
  else if(view==='inventory'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">9. [ИНВЕНТАРИЗАЦИЯ] - в разработке</div>`
  }
  else if(view==='schedule'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">📅 График - в разработке</div>`
  }
  else if(view==='reports'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">📊 Отчёты - в разработке</div>`
  }
  else if(view==='settings'){
    location.href='/restaurant-setup.html'
  }
  else if(view==='create-task'){
    app.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#71717a">2. [СОЗДАТЬ ЗАДАНИЕ] - форма в разработке</div>`
  }
  else {
    app.innerHTML = `<div style="color:#71717a;text-align:center;padding:60px;">Раздел "${view}" в разработке</div>`
  }
}

function initStaffActions(){
  document.getElementById('addStaffBtn')?.addEventListener('click', async ()=>{
    const token = await api.createStaffInvite('Повар')
    const link = `${location.origin}/staff.html?invite=${token}`
    document.getElementById('inviteLink').value = link
    QRCode.toCanvas(document.getElementById('qrCanvas'), link, {width:220})
    document.getElementById('inviteModal').classList.add('show')
  })
  document.getElementById('closeModal').onclick = ()=>inviteModal.classList.remove('show')
  document.getElementById('copyLink').onclick = ()=>navigator.clipboard.writeText(inviteLink.value)

  app.querySelectorAll('.calendar-btn').forEach(btn=>{
    btn.onclick = (e)=>{
      const card = e.target.closest('.staff-card')
      const cont = card.querySelector('.calendar-container')
      cont.style.display = cont.style.display==='none'? 'block' : 'none'
      if(cont.innerHTML==='') cont.innerHTML = renderCalendar(card.dataset.id)
    }
  })
  app.querySelectorAll('.fire-btn').forEach(btn=>{
    btn.onclick = async (e)=>{const id=e.target.closest('.staff-card').dataset.id;await api.fireStaff(id);renderView('staff')}
  })
  app.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.onclick = async (e)=>{const id=e.target.closest('.staff-card').dataset.id;if(confirm('Удалить?')){await api.deleteStaff(id);renderView('staff')}}
  })
}

function renderCalendar(staffId){
  let html = '<div class="calendar-grid">'
  for(let i=1;i<=30;i++) html += `<button class="day" data-day="${i}">${i}</button>`
  html += `</div><button onclick="manualModal.classList.add('show');manualModal.dataset.staffId='${staffId}'" style="margin-top:8px;color:var(--accent)">+ ручная смена</button>`
  return html
}

document.getElementById('saveManual').onclick = async ()=>{
  const id = manualModal.dataset.staffId
  await api.addManualShift(id,manualDate.value,manualIn.value,manualOut.value)
  manualModal.classList.remove('show')
  renderView('staff')
}
document.getElementById('closeManual').onclick = ()=>manualModal.classList.remove('show')
