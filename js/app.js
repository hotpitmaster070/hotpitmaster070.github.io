import {api, supabase} from './api.js'
import {renderStaffView} from './views/staff.js'

const app = document.getElementById('app')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')
const pageTitle = document.getElementById('pageTitle')

const {data:{user}} = await supabase.auth.getUser()
if(!user){location.href='/index.html'}

document.getElementById('openSidebar').onclick = ()=>{sidebar.classList.add('open');overlay.classList.add('show')}
document.getElementById('closeSidebar').onclick = closeSidebar
overlay.onclick = closeSidebar
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('show')}

document.querySelectorAll('.menu-item:not(.disabled)').forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'))
    btn.classList.add('active')
    pageTitle.textContent = btn.textContent.replace(/👥|📅|🔲|📊 /,'')
    renderView(btn.dataset.view)
    if(window.innerWidth<900) closeSidebar()
  }
})

document.getElementById('logoutBtn').onclick = async ()=>{await supabase.auth.signOut();location.href='/index.html'}

async function renderView(view){
  if(view==='staff'){
    const staff = await api.getStaff()
    app.innerHTML = renderStaffView(staff)
    initStaffActions()
  } else {
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

renderView('staff')
